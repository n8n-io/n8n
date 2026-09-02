import { UserError } from 'n8n-workflow';
import path from 'node:path';

import { ENTITY_FILES } from '@/modules/n8n-packages/spec/constants';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

type Requirements = NonNullable<PackageManifest['requirements']>;
type RequirementItem = { usedByWorkflows: string[] };

/**
 * What the branch holds, as read from the directories on disk by
 * `readPackageEntries`. It is a manifest without the metadata, which always
 * comes from the staging export.
 *
 * `requirements` is the one part no directory carries: only the manifest
 * records which workflows use a dependency. It is passed in until the manifest
 * goes away and a pull derives that from the workflow files.
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
 * Where the staging files land on the branch.
 *
 * A selective push updates the selected workflows and nothing else. A project
 * or folder the branch already holds therefore keeps its directory and its own
 * file, even after a rename on the instance: renaming the directory would move
 * every unselected workflow inside it. Staging paths under such a container
 * are pinned back to the directory the branch uses, so a selected workflow
 * lands next to its unselected siblings. Containers are created, never
 * updated, until a folder change is selectable in its own right.
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
	// A replacement is keyed by its own id, because a recreated variable
	// replaces the branch entry under a new id.
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

/**
 * Merge the branch state with a staging manifest that holds only the selected
 * workflows and what they need. Selected workflows replace their branch entry
 * and deleted ones are removed. Projects and folders are added when the branch
 * lacks them and left alone when it has them, so nothing the user did not
 * select moves. Dependency entries upsert by id and are then pruned to what
 * the merged requirements still reference, so a dependency leaves the branch
 * with its last user.
 *
 * The result describes the tree the push is about to produce. The caller
 * writes it back as `manifest.json`, so that file always restates the
 * directories rather than steering them.
 */
export function mergeManifests(
	existing: BranchState,
	staging: PackageManifest,
	deletedWorkflowIds: Set<string>,
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
		),
		dataTables: pruneEntries(
			mergeEntries('dataTables', existing.dataTables, staging.dataTables, placement),
			byId,
			keysOf(requirements.dataTables, (d) => d.id),
		),
		variables: pruneEntries(
			mergeEntries('variables', existing.variables, staging.variables, placement),
			byName,
			keysOf(requirements.variables, (v) => v.name),
		),
		tags: pruneEntries(
			mergeEntries('tags', existing.tags, staging.tags, placement),
			byId,
			keysOf(requirements.tags, (t) => t.id),
		),
		...(hasRequirements ? { requirements } : {}),
	});

	assertUniqueTargets(merged);
	return merged;
}

/**
 * Branch directories to remove before the overlay writes the new files: every
 * leaf entry that staging replaces, or that `after` drops or moves. Projects
 * and folders are never removed, because the branch keeps the ones it holds
 * and an emptied folder still exists on the instance.
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
