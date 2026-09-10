import { entityFilePath } from '@/modules/n8n-packages/io/manifest-entry';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

/**
 * Where each project, folder and workflow lives on the branch, read from the
 * entity files on disk (not manifest.json).
 * Credentials and variables are excluded: they are derived from workflow files on import.
 */
export type BranchLayout = Pick<PackageManifest, 'projects' | 'folders' | 'workflows'>;

/** Entry kinds whose target is a directory that holds other entries. */
const CONTAINER_KINDS = ['projects', 'folders'] as const;

type ContainerKind = (typeof CONTAINER_KINDS)[number];

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

const entriesOf = (
	state: Partial<Pick<PackageManifest, ContainerKind | 'workflows'>>,
	kind: ContainerKind | 'workflows',
): ManifestEntry[] => state[kind] ?? [];

export const isUnder = (target: string, prefix: string) => target.startsWith(`${prefix}/`);

/**
 * Where the staging files land. A project or folder the branch holds keeps its
 * directory, because renaming it would move every unselected workflow inside.
 * Paths under it are pinned back, so a selection lands next to its siblings.
 */
export function containerPlacement(existing: BranchLayout, staging: PackageManifest): Placement {
	const pins: Pin[] = [];
	const keptFiles = new Set<string>();

	for (const kind of CONTAINER_KINDS) {
		const onBranch = new Map(entriesOf(existing, kind).map((e) => [e.id, e.target]));
		for (const entry of entriesOf(staging, kind)) {
			const to = onBranch.get(entry.id);
			if (to === undefined) continue;
			keptFiles.add(entityFilePath(kind, entry.target));
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
 * Workflow directories to remove before the overlay writes: deleted workflows,
 * and selected workflows the branch already holds (so a rename drops the old
 * path, and an in-place replace starts from an empty directory).
 *
 * Credential and variable stubs the selection no longer uses stay. A full push
 * removes them. Selective cleanup is deferred.
 */
export function staleWorkflowTargets(
	existing: BranchLayout,
	staging: PackageManifest,
	deletedWorkflowIds: Set<string>,
): string[] {
	const stale = new Set<string>();
	const selected = new Set((staging.workflows ?? []).map((workflow) => workflow.id));

	for (const workflow of existing.workflows ?? []) {
		if (deletedWorkflowIds.has(workflow.id) || selected.has(workflow.id)) {
			stale.add(workflow.target);
		}
	}

	return [...stale];
}
