import type { PromotableResource, PromotableResourceStatus } from '@n8n/api-types';

import type { PackageFileChange } from './diff-package-files';

/**
 * A project or folder whose directory moved.
 * Promoting it moves every file inside that directory, so the change list
 * shows the container above the workflows inside it.
 */
export type ContainerRename = {
	id: string;
	type: 'project' | 'folder';
	name: string;
	status: Extract<PromotableResourceStatus, 'renamed' | 'renamed-and-modified'>;
	baseDir: string;
	desiredDir: string;
};

/** Directory of a workflow file on each side of the diff. Deleted rows only have `base`. */
export type WorkflowPlacement = {
	base: string | null;
	desired: string | null;
};

/**
 * Reads renamed project and folder directories, and where each changed workflow file sits.
 * A content-only edit of `folder.json` is not a directory move.
 */
export function collectStructuralDiff(
	fileChanges: readonly PackageFileChange[],
	containerNames: ReadonlyMap<string, string>,
): {
	containerRenames: ContainerRename[];
	workflowPlacements: Map<string, WorkflowPlacement>;
} {
	const containerRenames: ContainerRename[] = [];
	const workflowPlacements = new Map<string, WorkflowPlacement>();

	for (const fileChange of fileChanges) {
		const file = fileChange.change === 'deleted' ? fileChange.base : fileChange.desired;
		if (file.type === 'workflow') {
			const placement = workflowPlacements.get(file.entityId) ?? { base: null, desired: null };
			if (fileChange.change === 'added') {
				placement.desired = packageDirectory(fileChange.desired.path);
			} else if (fileChange.change === 'deleted') {
				placement.base = packageDirectory(fileChange.base.path);
			} else {
				placement.base = packageDirectory(fileChange.base.path);
				placement.desired = packageDirectory(fileChange.desired.path);
			}
			workflowPlacements.set(file.entityId, placement);
		}
		if (
			(file.type === 'project' || file.type === 'folder') &&
			(fileChange.change === 'renamed' || fileChange.change === 'renamed-and-modified')
		) {
			containerRenames.push({
				id: file.entityId,
				type: file.type,
				name: containerNames.get(file.entityId) ?? file.entityId,
				status: fileChange.change,
				baseDir: packageDirectory(fileChange.base.path),
				desiredDir: packageDirectory(fileChange.desired.path),
			});
		}
	}

	return { containerRenames, workflowPlacements };
}

/** Parent directory of a package file path. Package paths use `/`. */
function packageDirectory(filePath: string): string {
	const slash = filePath.lastIndexOf('/');
	return slash === -1 ? filePath : filePath.slice(0, slash);
}

function isInside(target: string, containerDir: string): boolean {
	return target === containerDir || target.startsWith(`${containerDir}/`);
}

function containerDir(rename: ContainerRename, side: 'base' | 'desired'): string {
	return side === 'base' ? rename.baseDir : rename.desiredDir;
}

function placementSide(
	placement: WorkflowPlacement | undefined,
): { dir: string; side: 'base' | 'desired' } | undefined {
	if (placement?.desired) return { dir: placement.desired, side: 'desired' };
	if (placement?.base) return { dir: placement.base, side: 'base' };
	return undefined;
}

function containersAround(
	renames: readonly ContainerRename[],
	dir: string,
	side: 'base' | 'desired',
): ContainerRename[] {
	return renames.filter((rename) => isInside(dir, containerDir(rename, side)));
}

/** The renamed container with the longest directory, which is the one closest to the row. */
function nearestContainer(
	matches: readonly ContainerRename[],
	side: 'base' | 'desired',
): ContainerRename | undefined {
	let picked: ContainerRename | undefined;
	for (const rename of matches) {
		if (!picked || containerDir(rename, side).length > containerDir(picked, side).length) {
			picked = rename;
		}
	}
	return picked;
}

/**
 * Adds a row for each renamed project or folder that contains a changed workflow.
 * `parentId` is the nearest renamed container. A container with no changed workflow
 * inside has nothing the user can select, so it gets no row.
 */
export function applyStructuralRenames(
	workflows: readonly PromotableResource[],
	renames: readonly ContainerRename[],
	placements: ReadonlyMap<string, WorkflowPlacement>,
): PromotableResource[] {
	const workflowParents = new Map<string, string | null>();
	const relevantIds = new Set<string>();

	for (const workflow of workflows) {
		const placement = placementSide(placements.get(workflow.id));
		if (!placement || renames.length === 0) {
			workflowParents.set(workflow.id, null);
			continue;
		}
		const around = containersAround(renames, placement.dir, placement.side);
		workflowParents.set(workflow.id, nearestContainer(around, placement.side)?.id ?? null);
		for (const rename of around) relevantIds.add(rename.id);
	}

	const included = renames.filter((rename) => relevantIds.has(rename.id));
	const containerRows: PromotableResource[] = included.map((rename) => {
		const others = included.filter((other) => other.id !== rename.id);
		const around = containersAround(others, rename.desiredDir, 'desired');
		return {
			id: rename.id,
			name: rename.name,
			type: rename.type,
			status: rename.status,
			version: null,
			updatedAt: null,
			updatedBy: null,
			dependencyCount: 0,
			changedDependencies: [],
			parentId: nearestContainer(around, 'desired')?.id ?? null,
		};
	});

	return [
		...workflows.map((workflow) => ({
			...workflow,
			parentId: workflowParents.get(workflow.id) ?? null,
		})),
		...containerRows,
	];
}

/**
 * Keeps each search match with the renamed containers above it. A match on a
 * container also keeps everything inside it.
 */
export function retainStructuralMatches(
	changes: readonly PromotableResource[],
	search: string | undefined,
): PromotableResource[] {
	const term = search?.toLowerCase();
	if (!term) return [...changes];

	const byId = new Map(changes.map((change) => [change.id, change]));
	const include = new Set<string>();

	function includeDescendants(rootId: string) {
		for (const change of changes) {
			if (change.parentId !== rootId || include.has(change.id)) continue;
			include.add(change.id);
			includeDescendants(change.id);
		}
	}

	for (const change of changes) {
		if (!change.name.toLowerCase().includes(term)) continue;
		include.add(change.id);
		if (change.type !== 'workflow') includeDescendants(change.id);
		let parentId = change.parentId;
		const seen = new Set<string>();
		while (parentId && !seen.has(parentId)) {
			seen.add(parentId);
			include.add(parentId);
			parentId = byId.get(parentId)?.parentId ?? null;
		}
	}

	return changes.filter((change) => include.has(change.id));
}
