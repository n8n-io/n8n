import { UserError } from 'n8n-workflow';
import path from 'node:path';

import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

type Requirements = NonNullable<PackageManifest['requirements']>;
type RequirementItem = { usedByWorkflows: string[] };

/** Entry kinds whose target is a directory that holds other entries. */
const CONTAINER_KINDS = ['projects', 'folders'] as const;
/** Entry kinds whose target holds only their own files. */
const LEAF_KINDS = ['workflows', 'credentials', 'dataTables', 'variables', 'tags'] as const;
const ENTRY_KINDS = [...CONTAINER_KINDS, ...LEAF_KINDS];

type EntryKind = (typeof ENTRY_KINDS)[number];

/** A path change of one entry's directory on the branch. */
export interface Relocation {
	from: string;
	to: string;
	kind: 'container' | 'leaf';
}

const entriesOf = (manifest: PackageManifest, kind: EntryKind): ManifestEntry[] =>
	manifest[kind] ?? [];

const allEntries = (manifest: PackageManifest): Array<[EntryKind, ManifestEntry]> =>
	ENTRY_KINDS.flatMap((kind) =>
		entriesOf(manifest, kind).map((e): [EntryKind, ManifestEntry] => [kind, e]),
	);

const isUnder = (target: string, prefix: string) => target.startsWith(`${prefix}/`);

/**
 * Container entries whose directory moved between branch and staging (a
 * renamed project or folder). `from` is in branch coordinates, `to` in staging
 * coordinates, so one longest-prefix rewrite maps any branch path to its new
 * place even when a parent and a child move together.
 */
function containerMoves(existing: PackageManifest, staging: PackageManifest) {
	const moves: Array<{ from: string; to: string }> = [];
	for (const kind of CONTAINER_KINDS) {
		const before = new Map(entriesOf(existing, kind).map((e) => [e.id, e.target]));
		for (const entry of entriesOf(staging, kind)) {
			const from = before.get(entry.id);
			if (from !== undefined && from !== entry.target) moves.push({ from, to: entry.target });
		}
	}
	return moves.sort((a, b) => b.from.length - a.from.length);
}

/** Rewrite `target` through the longest matching container move, if any. */
function relocateTarget(target: string, moves: ReadonlyArray<{ from: string; to: string }>) {
	const move = moves.find((m) => isUnder(target, m.from));
	return move ? `${move.to}${target.slice(move.from.length)}` : target;
}

/**
 * Keys under which a staging entry replaces a branch entry. All kinds match by
 * id. Variables also match by name within their directory: `$vars.<name>`
 * resolves by name and the exporter allows one variable per name per directory,
 * so a recreated variable (new id, same name) replaces the old one.
 */
function entryKeys(kind: EntryKind, entry: ManifestEntry): string[] {
	if (kind !== 'variables') return [entry.id];
	return [entry.id, `${path.posix.dirname(entry.target)}/${entry.name}`];
}

/**
 * Merge entries of one kind; staging wins. Branch entries that survive are
 * moved along with a renamed container so every path stays resolvable on pull.
 */
function mergeEntries(
	kind: EntryKind,
	existingEntries: ManifestEntry[] | undefined,
	stagingEntries: ManifestEntry[] | undefined,
	moves: ReadonlyArray<{ from: string; to: string }>,
): ManifestEntry[] | undefined {
	const staging = stagingEntries ?? [];
	const stagingByKey = new Map(
		staging.flatMap((e) => entryKeys(kind, e).map((key) => [key, e] as const)),
	);
	const replacementFor = (entry: ManifestEntry) =>
		entryKeys(kind, entry)
			.map((key) => stagingByKey.get(key))
			.find((e) => e !== undefined);

	// Map keeps insertion order, so a replaced entry stays at its branch position.
	const merged = new Map<string, ManifestEntry>();
	for (const entry of existingEntries ?? []) {
		const relocated = { ...entry, target: relocateTarget(entry.target, moves) };
		const kept = replacementFor(relocated) ?? relocated;
		merged.set(kept.id, kept);
	}
	for (const entry of staging) merged.set(entry.id, entry);

	return merged.size > 0 ? [...merged.values()] : undefined;
}

/** Keep only entries whose key is still referenced by a requirement. */
function pruneEntries(
	entries: ManifestEntry[] | undefined,
	keyOf: (entry: ManifestEntry) => string,
	referencedKeys: Set<string>,
): ManifestEntry[] | undefined {
	const kept = (entries ?? []).filter((entry) => referencedKeys.has(keyOf(entry)));
	return kept.length > 0 ? kept : undefined;
}

/**
 * Merge one requirement list by key. Refs from replaced or deleted workflows
 * are dropped from the branch items first, so staging is the only source of
 * truth for the workflows it carries. Items with no remaining ref are dropped.
 */
function mergeRequirementsByKey<T extends RequirementItem>(
	existingItems: T[] | undefined,
	stagingItems: T[] | undefined,
	keyOf: (item: T) => string,
	replacedWorkflowIds: Set<string>,
): T[] | undefined {
	const byKey = new Map<string, T>();

	for (const item of existingItems ?? []) {
		const usedByWorkflows = item.usedByWorkflows.filter((id) => !replacedWorkflowIds.has(id));
		if (usedByWorkflows.length > 0) byKey.set(keyOf(item), { ...item, usedByWorkflows });
	}

	for (const item of stagingItems ?? []) {
		const key = keyOf(item);
		const prev = byKey.get(key);
		const usedByWorkflows = prev
			? [...new Set([...prev.usedByWorkflows, ...item.usedByWorkflows])]
			: item.usedByWorkflows;
		byKey.set(key, { ...item, usedByWorkflows });
	}

	return byKey.size > 0 ? [...byKey.values()] : undefined;
}

function mergeRequirements(
	existing: PackageManifest['requirements'],
	staging: PackageManifest['requirements'],
	replacedWorkflowIds: Set<string>,
): Requirements {
	const merge = <T extends RequirementItem>(
		pick: (r: Requirements) => T[] | undefined,
		keyOf: (item: T) => string,
	) =>
		mergeRequirementsByKey(
			existing && pick(existing),
			staging && pick(staging),
			keyOf,
			replacedWorkflowIds,
		);

	return {
		credentials: merge(
			(r) => r.credentials,
			(c) => c.id,
		),
		dataTables: merge(
			(r) => r.dataTables,
			(d) => d.id,
		),
		workflows: merge(
			(r) => r.workflows,
			(w) => w.id,
		),
		variables: merge(
			(r) => r.variables,
			(v) => v.name,
		),
		tags: merge(
			(r) => r.tags,
			(t) => t.id,
		),
		nodeTypes: merge(
			(r) => r.nodeTypes,
			(n) => `${n.type}@${n.typeVersion}`,
		),
	};
}

const keysOf = <T>(items: T[] | undefined, keyOf: (item: T) => string) =>
	new Set((items ?? []).map(keyOf));

/**
 * Two entries on one directory would overwrite each other's files. This
 * happens when a same-named sibling was removed and the exporter's suffixes
 * shifted under an unselected branch workflow.
 */
function assertUniqueTargets(manifest: PackageManifest): void {
	const seen = new Map<string, ManifestEntry>();
	for (const [, entry] of allEntries(manifest)) {
		const other = seen.get(entry.target);
		if (other && other.id !== entry.id) {
			throw new UserError(
				`Selective push would place "${entry.name}" and "${other.name}" in the same directory (${entry.target}). Select both, or push the whole project.`,
			);
		}
		seen.set(entry.target, entry);
	}
}

/**
 * Merge the branch manifest with a staging manifest that holds only the
 * selected workflows and what they need. Selected workflows replace their
 * branch entry, deleted ones are removed, folders and projects upsert by id.
 * Unselected entries under a renamed project or folder move with it.
 * Dependency entries upsert by id and are then pruned to what the merged
 * requirements still reference, so a dependency leaves the manifest with its
 * last user.
 */
export function mergeManifests(
	existing: PackageManifest,
	staging: PackageManifest,
	deletedWorkflowIds: Set<string>,
): PackageManifest {
	const moves = containerMoves(existing, staging);
	const stagingWorkflows = staging.workflows ?? [];
	const replacedWorkflowIds = new Set([
		...stagingWorkflows.map((w) => w.id),
		...deletedWorkflowIds,
	]);
	const workflows = mergeEntries(
		'workflows',
		(existing.workflows ?? []).filter((w) => !replacedWorkflowIds.has(w.id)),
		stagingWorkflows,
		moves,
	);

	const requirements = mergeRequirements(
		existing.requirements,
		staging.requirements,
		replacedWorkflowIds,
	);
	const hasRequirements = Object.values(requirements).some((v) => v !== undefined);

	const byId = (entry: ManifestEntry) => entry.id;
	const byName = (entry: ManifestEntry) => entry.name;

	const merged = packageManifestSchema.parse({
		packageFormatVersion: staging.packageFormatVersion,
		exportedAt: staging.exportedAt,
		sourceN8nVersion: staging.sourceN8nVersion,
		sourceId: staging.sourceId,
		workflows,
		folders: mergeEntries('folders', existing.folders, staging.folders, moves),
		projects: mergeEntries('projects', existing.projects, staging.projects, moves),
		credentials: pruneEntries(
			mergeEntries('credentials', existing.credentials, staging.credentials, moves),
			byId,
			keysOf(requirements.credentials, (c) => c.id),
		),
		dataTables: pruneEntries(
			mergeEntries('dataTables', existing.dataTables, staging.dataTables, moves),
			byId,
			keysOf(requirements.dataTables, (d) => d.id),
		),
		variables: pruneEntries(
			mergeEntries('variables', existing.variables, staging.variables, moves),
			byName,
			keysOf(requirements.variables, (v) => v.name),
		),
		tags: pruneEntries(
			mergeEntries('tags', existing.tags, staging.tags, moves),
			byId,
			keysOf(requirements.tags, (t) => t.id),
		),
		...(hasRequirements ? { requirements } : {}),
	});

	assertUniqueTargets(merged);
	return merged;
}

/**
 * Branch entries that `merged` keeps at a new path and that staging did not
 * write: their files must move on disk. A container relocation covers only
 * the container's own files; the entries beneath it relocate on their own.
 */
export function entryRelocations(
	before: PackageManifest,
	staging: PackageManifest,
	merged: PackageManifest,
): Relocation[] {
	const relocations: Relocation[] = [];
	for (const kind of ENTRY_KINDS) {
		const written = new Set(entriesOf(staging, kind).map((e) => e.id));
		const after = new Map(entriesOf(merged, kind).map((e) => [e.id, e.target]));
		for (const entry of entriesOf(before, kind)) {
			const to = after.get(entry.id);
			if (to === undefined || to === entry.target || written.has(entry.id)) continue;
			relocations.push({
				from: entry.target,
				to,
				kind: CONTAINER_KINDS.some((c) => c === kind) ? 'container' : 'leaf',
			});
		}
	}
	return relocations;
}

/**
 * Branch directories to remove before the overlay writes the new files:
 * every leaf entry that staging replaces or that `after` drops or moves, and
 * every container that `after` no longer lists and that holds no live entry.
 */
export function staleTargets(
	before: PackageManifest,
	after: PackageManifest,
	staging: PackageManifest,
): string[] {
	const live = new Set(allEntries(after).map(([, e]) => e.target));
	const holdsLive = (target: string) => [...live].some((t) => isUnder(t, target));
	const stale = new Set<string>();

	for (const kind of LEAF_KINDS) {
		const written = new Set(entriesOf(staging, kind).map((e) => e.id));
		const after_ = new Map(entriesOf(after, kind).map((e) => [e.id, e.target]));
		for (const entry of entriesOf(before, kind)) {
			if (written.has(entry.id) || after_.get(entry.id) !== entry.target) stale.add(entry.target);
		}
	}
	for (const kind of CONTAINER_KINDS) {
		for (const entry of entriesOf(before, kind)) {
			if (!live.has(entry.target) && !holdsLive(entry.target)) stale.add(entry.target);
		}
	}

	return [...stale];
}
