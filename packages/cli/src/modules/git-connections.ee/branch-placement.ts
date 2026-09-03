import { UserError } from 'n8n-workflow';
import path from 'node:path';

import type { PackageContents } from '@/modules/n8n-packages/engine/package-contents';
import { ENTITY_FILES } from '@/modules/n8n-packages/spec/constants';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

/**
 * What the branch holds, as read from the directories on disk. It is a
 * manifest without the metadata, which always comes from the staging export,
 * and without the requirements, which are derived from the tree once the push
 * has written it.
 */
export type BranchState = Omit<
	PackageManifest,
	'packageFormatVersion' | 'exportedAt' | 'sourceN8nVersion' | 'sourceId' | 'requirements'
>;

/** Entry kinds whose target is a directory that holds other entries. */
const CONTAINER_KINDS = ['projects', 'folders'] as const;
/** Entry kinds whose target holds only their own files. */
const LEAF_KINDS = ['workflows', 'credentials', 'dataTables', 'variables', 'tags'] as const;
/** Leaf kinds that live on the branch only while a workflow uses them. */
const DEPENDENCY_KINDS = ['credentials', 'dataTables', 'variables', 'tags'] as const;
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

/** The staging entries of one kind, at the branch paths they land on. */
const placed = (staging: PackageManifest, kind: EntryKind, { pins }: Placement): ManifestEntry[] =>
	entriesOf(staging, kind).map((e) => ({ ...e, target: pinPath(e.target, pins) }));

/**
 * Keys under which a staging entry takes over a branch entry. All kinds match
 * by id. Variables also match by name within their directory: `$vars.<name>`
 * resolves by name and the exporter allows one variable per name per
 * directory, so a recreated variable (new id, same name) takes over the old
 * one instead of colliding with it.
 */
function entryKeys(kind: EntryKind, entry: ManifestEntry): string[] {
	if (kind !== 'variables') return [entry.id];
	return [entry.id, `${path.posix.dirname(entry.target)}/${entry.name}`];
}

/**
 * Tells whether the staging export takes a branch entry over. A container
 * never is: the branch keeps the one it holds.
 */
function takeoverTest(staging: PackageManifest, placement: Placement) {
	const keys = new Map(
		LEAF_KINDS.map((kind) => [
			kind as EntryKind,
			new Set(placed(staging, kind, placement).flatMap((e) => entryKeys(kind, e))),
		]),
	);

	return (kind: EntryKind, entry: ManifestEntry): boolean => {
		const taken = keys.get(kind);
		return taken !== undefined && entryKeys(kind, entry).some((key) => taken.has(key));
	};
}

/**
 * Branch directories to remove before the overlay writes the new files: every
 * leaf entry the staging export takes over, and every deleted workflow. A
 * project or folder is never removed, because the branch keeps the ones it
 * holds and an emptied folder still exists on the instance.
 *
 * A leaf the export does not carry stays where it is. Nothing moves it: a
 * container keeps its branch directory, so the path of an unselected workflow
 * cannot shift under it.
 */
export function staleTargets(
	existing: BranchState,
	staging: PackageManifest,
	placement: Placement,
	deletedWorkflowIds: Set<string>,
): string[] {
	const isTakenOver = takeoverTest(staging, placement);
	const stale = new Set<string>();

	for (const kind of LEAF_KINDS) {
		for (const entry of entriesOf(existing, kind)) {
			const isDeleted = kind === 'workflows' && deletedWorkflowIds.has(entry.id);
			if (isDeleted || isTakenOver(kind, entry)) stale.add(entry.target);
		}
	}

	return [...stale];
}

/**
 * Reject a push that would put two entities in one directory, before it writes
 * anything. This happens when a same-named sibling was removed and the
 * exporter's suffixes shifted under an unselected branch workflow.
 *
 * The check cannot wait until the files are on disk: the copy would have
 * overwritten one of the two, and the tree would then look consistent.
 */
export function assertNoCollisions(
	existing: BranchState,
	staging: PackageManifest,
	placement: Placement,
	deletedWorkflowIds: Set<string>,
): void {
	const isTakenOver = takeoverTest(staging, placement);
	const byTarget = new Map<string, ManifestEntry>();

	// What the branch keeps: everything the export neither takes over nor deletes.
	for (const [kind, entry] of allEntries(existing)) {
		const isDeleted = kind === 'workflows' && deletedWorkflowIds.has(entry.id);
		if (!isDeleted && !isTakenOver(kind, entry)) byTarget.set(entry.target, entry);
	}

	for (const kind of ENTRY_KINDS) {
		for (const entry of placed(staging, kind, placement)) {
			const other = byTarget.get(entry.target);
			if (other && other.id !== entry.id) {
				throw new UserError(
					`Selective push would place "${entry.name}" and "${other.name}" in the same directory (${entry.target}). Select both, or push the whole project.`,
				);
			}
			byTarget.set(entry.target, entry);
		}
	}
}

/**
 * Variable ids by the branch directory they land in. A variable file leaves
 * the id out on purpose, so the tree cannot supply it: the export brings the
 * ids of the variables it writes, and the branch manifest the ones already
 * there. This is the last thing a push takes from `manifest.json`.
 */
export function variableIds(
	existing: BranchState,
	staging: PackageManifest,
	placement: Placement,
): Map<string, string> {
	return new Map([
		...entriesOf(existing, 'variables').map((v) => [v.target, v.id] as const),
		// The export wins: a recreated variable keeps its new id.
		...placed(staging, 'variables', placement).map((v) => [v.target, v.id] as const),
	]);
}

const keysOf = <T>(items: T[] | undefined, keyOf: (item: T) => string) =>
	new Set((items ?? []).map(keyOf));

/**
 * Dependencies the branch holds that no workflow on it uses, read from the
 * tree the push has just written. A credential, data table, variable or tag
 * leaves the branch with its last user.
 *
 * Requirements name a variable by name and everything else by id, the same
 * keys the extractors produce from a workflow file.
 */
export function orphanedDependencies({
	requirements,
	...entries
}: PackageContents): ManifestEntry[] {
	const referenced: Record<(typeof DEPENDENCY_KINDS)[number], Set<string>> = {
		credentials: keysOf(requirements?.credentials, (c) => c.id),
		dataTables: keysOf(requirements?.dataTables, (d) => d.id),
		variables: keysOf(requirements?.variables, (v) => v.name),
		tags: keysOf(requirements?.tags, (t) => t.id),
	};

	return DEPENDENCY_KINDS.flatMap((kind) => {
		const keyOf = (entry: ManifestEntry) => (kind === 'variables' ? entry.name : entry.id);
		return entries[kind].filter((entry) => !referenced[kind].has(keyOf(entry)));
	});
}
