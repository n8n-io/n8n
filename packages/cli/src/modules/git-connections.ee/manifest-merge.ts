import { UserError } from 'n8n-workflow';
import path from 'node:path';

import { ENTITY_FILES } from '@/modules/n8n-packages/spec/constants';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

type Requirements = NonNullable<PackageManifest['requirements']>;
type RequirementItem = { usedByWorkflows: string[] };

/**
 * What the branch holds, read from the `manifest.json` it carries: a manifest
 * without the metadata, which always comes from the staging export.
 */
export type BranchState = Omit<
	PackageManifest,
	'packageFormatVersion' | 'exportedAt' | 'sourceN8nVersion' | 'sourceId'
>;

/** Entry kinds whose target is a directory that holds other entries. */
const CONTAINER_KINDS = ['projects', 'folders'] as const;
/** Entry kinds whose target holds only their own files. */
const LEAF_KINDS = ['workflows', 'credentials', 'dataTables', 'variables', 'tags'] as const;
const ENTRY_KINDS = [...CONTAINER_KINDS, ...LEAF_KINDS];

type EntryKind = (typeof ENTRY_KINDS)[number];

/** A staging directory and the branch directory it lands in. */
interface Pin {
	from: string;
	to: string;
}

/** Where the staging files land on the branch. */
export interface Placement {
	/** Staging paths that land elsewhere, longest first. */
	pins: Pin[];
	/** Staging files the branch already holds and keeps unchanged. */
	keptFiles: Set<string>;
}

const entriesOf = (state: BranchState, kind: EntryKind): ManifestEntry[] => state[kind] ?? [];

const allEntries = (state: BranchState): Array<[EntryKind, ManifestEntry]> =>
	ENTRY_KINDS.flatMap((kind) =>
		entriesOf(state, kind).map((e): [EntryKind, ManifestEntry] => [kind, e]),
	);

const isUnder = (target: string, prefix: string) => target.startsWith(`${prefix}/`);

/**
 * Where the staging files land. A project or folder the branch holds keeps its
 * directory, because renaming it would move every unselected workflow inside.
 * Paths under it are pinned back, so a selection lands next to its siblings.
 */
export function containerPlacement(existing: BranchState, staging: PackageManifest): Placement {
	const pins: Pin[] = [];
	const keptFiles = new Set<string>();

	for (const kind of CONTAINER_KINDS) {
		const onBranch = new Map(entriesOf(existing, kind).map((e) => [e.id, e.target]));
		for (const entry of entriesOf(staging, kind)) {
			const to = onBranch.get(entry.id);
			if (to === undefined) continue;
			keptFiles.add(`${entry.target}/${ENTITY_FILES[kind]}`);
			if (to !== entry.target) pins.push({ from: entry.target, to });
		}
	}

	// Longest first, so a pinned folder wins over its pinned project.
	return { pins: pins.sort((a, b) => b.from.length - a.from.length), keptFiles };
}

/** Rewrite a staging path through the longest pin that covers it. */
export function pinPath(target: string, pins: readonly Pin[]): string {
	const pin = pins.find((p) => target === p.from || isUnder(target, p.from));
	return pin ? `${pin.to}${target.slice(pin.from.length)}` : target;
}

/**
 * Keys under which a staging entry replaces a branch entry. Variables also
 * match by name in their directory, because `$vars.<name>` resolves by name:
 * a recreated variable (new id, same name) replaces the old one.
 */
function entryKeys(kind: EntryKind, entry: ManifestEntry): string[] {
	if (kind !== 'variables') return [entry.id];
	return [entry.id, `${path.posix.dirname(entry.target)}/${entry.name}`];
}

/**
 * Merge entries of one kind. Staging wins for a leaf, the branch wins for a
 * container it already holds: that container keeps its name and its directory.
 */
function mergeEntries(
	kind: EntryKind,
	existingEntries: ManifestEntry[] | undefined,
	stagingEntries: ManifestEntry[] | undefined,
	{ pins }: Placement,
): ManifestEntry[] | undefined {
	const isContainer = CONTAINER_KINDS.some((c) => c === kind);
	const staging = (stagingEntries ?? []).map((e) => ({ ...e, target: pinPath(e.target, pins) }));
	const stagingByKey = new Map(
		staging.flatMap((e) => entryKeys(kind, e).map((key) => [key, e] as const)),
	);
	const replacementFor = (entry: ManifestEntry) =>
		entryKeys(kind, entry)
			.map((key) => stagingByKey.get(key))
			.find((e) => e !== undefined);

	// Map keeps insertion order, so a replaced entry stays at its branch position.
	// It is keyed by the replacement's id, which a recreated variable changes.
	const merged = new Map<string, ManifestEntry>();
	for (const entry of existingEntries ?? []) {
		const kept = isContainer ? entry : (replacementFor(entry) ?? entry);
		merged.set(kept.id, kept);
	}
	for (const entry of staging) {
		if (!isContainer || !merged.has(entry.id)) merged.set(entry.id, entry);
	}

	return merged.size > 0 ? [...merged.values()] : undefined;
}

/**
 * Drop dependency entries no requirement references any more, so a dependency
 * leaves the branch with its last user. Only `scope` is pruned: a push knows
 * nothing fresh about a project it did not export.
 */
function pruneEntries(
	entries: ManifestEntry[] | undefined,
	keyOf: (entry: ManifestEntry) => string,
	referencedKeys: Set<string>,
	scope: string | undefined,
): ManifestEntry[] | undefined {
	const kept = (entries ?? []).filter(
		(entry) =>
			referencedKeys.has(keyOf(entry)) || scope === undefined || !isUnder(entry.target, scope),
	);
	return kept.length > 0 ? kept : undefined;
}

/**
 * Merge one requirement list by key. Refs from replaced or deleted workflows go
 * first, so staging is the only source of truth for the workflows it carries.
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
 * Two entries on one directory would overwrite each other's files, which
 * happens when a removed sibling shifts the exporter's `-2` suffixes. Checked
 * before the first write, because afterwards only the winner is on disk.
 */
function assertUniqueTargets(state: BranchState): void {
	const seen = new Map<string, ManifestEntry>();
	for (const [, entry] of allEntries(state)) {
		const other = seen.get(entry.target);
		if (other && other.id !== entry.id) {
			throw new UserError(
				`Selective push would place "${entry.name}" and "${other.name}" in the same directory (${entry.target}). Select both, or push the whole project.`,
			);
		}
		seen.set(entry.target, entry);
	}
}

/** Where the selected project lives on the branch, the only subtree a push prunes. */
function projectScope(
	existing: BranchState,
	staging: PackageManifest,
	projectId: string,
): string | undefined {
	return (
		entriesOf(existing, 'projects').find((p) => p.id === projectId)?.target ??
		entriesOf(staging, 'projects').find((p) => p.id === projectId)?.target
	);
}

/**
 * Merge the branch with a staging manifest holding only the selected workflows
 * and what they need. Selected entries replace, deleted ones go, containers are
 * added but never moved, and dependencies are pruned inside the project.
 */
export function mergeManifests(
	existing: BranchState,
	staging: PackageManifest,
	deletedWorkflowIds: Set<string>,
	projectId: string,
): PackageManifest {
	const placement = containerPlacement(existing, staging);
	const stagingWorkflows = staging.workflows ?? [];
	const replacedWorkflowIds = new Set([
		...stagingWorkflows.map((w) => w.id),
		...deletedWorkflowIds,
	]);
	const workflows = mergeEntries(
		'workflows',
		(existing.workflows ?? []).filter((w) => !replacedWorkflowIds.has(w.id)),
		stagingWorkflows,
		placement,
	);

	const requirements = mergeRequirements(
		existing.requirements,
		staging.requirements,
		replacedWorkflowIds,
	);
	const hasRequirements = Object.values(requirements).some((v) => v !== undefined);

	const scope = projectScope(existing, staging, projectId);
	const byId = (entry: ManifestEntry) => entry.id;
	const byName = (entry: ManifestEntry) => entry.name;

	const merged = packageManifestSchema.parse({
		packageFormatVersion: staging.packageFormatVersion,
		exportedAt: staging.exportedAt,
		sourceN8nVersion: staging.sourceN8nVersion,
		sourceId: staging.sourceId,
		workflows,
		folders: mergeEntries('folders', existing.folders, staging.folders, placement),
		projects: mergeEntries('projects', existing.projects, staging.projects, placement),
		credentials: pruneEntries(
			mergeEntries('credentials', existing.credentials, staging.credentials, placement),
			byId,
			keysOf(requirements.credentials, (c) => c.id),
			scope,
		),
		dataTables: pruneEntries(
			mergeEntries('dataTables', existing.dataTables, staging.dataTables, placement),
			byId,
			keysOf(requirements.dataTables, (d) => d.id),
			scope,
		),
		variables: pruneEntries(
			mergeEntries('variables', existing.variables, staging.variables, placement),
			byName,
			keysOf(requirements.variables, (v) => v.name),
			scope,
		),
		tags: pruneEntries(
			mergeEntries('tags', existing.tags, staging.tags, placement),
			byId,
			keysOf(requirements.tags, (t) => t.id),
			scope,
		),
		...(hasRequirements ? { requirements } : {}),
	});

	assertUniqueTargets(merged);
	return merged;
}

/**
 * Branch directories to remove before the overlay writes: every leaf entry
 * staging replaces, or that `after` drops or moves. Containers are never
 * removed, because an emptied folder still exists on the instance.
 */
export function staleTargets(
	before: BranchState,
	after: PackageManifest,
	staging: PackageManifest,
): string[] {
	const stale = new Set<string>();

	for (const kind of LEAF_KINDS) {
		const written = new Set(entriesOf(staging, kind).map((e) => e.id));
		const afterTargets = new Map(entriesOf(after, kind).map((e) => [e.id, e.target]));
		for (const entry of entriesOf(before, kind)) {
			if (written.has(entry.id) || afterTargets.get(entry.id) !== entry.target) {
				stale.add(entry.target);
			}
		}
	}

	return [...stale];
}
