import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

/**
 * Where each project, folder and workflow lives on the branch, read from the
 * entity files on disk (not manifest.json).
 * Credentials and variables are excluded: they are derived from workflow files on import.
 */
export type BranchLayout = Pick<PackageManifest, 'projects' | 'folders' | 'workflows'>;

/** Entry kinds whose target is a directory that holds other entries. */
const CONTAINER_KINDS = ['projects', 'folders'] as const;

export type ContainerKind = (typeof CONTAINER_KINDS)[number];

/** A renamed branch container directory and the path its rename moves it to. */
export interface ContainerMove {
	kind: ContainerKind;
	from: string;
	to: string;
}

export const isUnder = (target: string, prefix: string) => target.startsWith(`${prefix}/`);

/**
 * Containers whose branch path differs from the export path, deepest `from`
 * first. The exporter only writes ancestors of selected workflows, so no
 * unrelated container moves.
 */
export function containerMoves(existing: BranchLayout, staging: PackageManifest): ContainerMove[] {
	const moves: ContainerMove[] = [];

	for (const kind of CONTAINER_KINDS) {
		const onBranch = new Map((existing[kind] ?? []).map((e) => [e.id, e.target]));
		for (const entry of staging[kind] ?? []) {
			const from = onBranch.get(entry.id);
			if (from === undefined || from === entry.target) continue;
			moves.push({ kind, from, to: entry.target });
		}
	}

	return moves.sort((a, b) => b.from.length - a.from.length);
}

/** Rewrite a branch path through the deepest move that covers it. */
export function remapPath(target: string, moves: readonly ContainerMove[]): string {
	const move = moves.find((m) => target === m.from || isUnder(target, m.from));
	return move ? `${move.to}${target.slice(move.from.length)}` : target;
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
