import { Service } from '@n8n/di';

import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';

import type { FolderRemovalPlan } from './folder-removal.types';
import type { ImportContext, RemovedFolderSummary } from '../../n8n-packages.types';

interface FolderPlacement {
	id: string;
	name: string;
	parentFolderId: string | null;
}

/**
 * Clears away folders a reconciling import has left behind: ones the package does not define with
 * nothing surviving inside them.
 *
 * Emptiness is the whole safeguard. `FolderService.deleteFolder` archives a folder's contents on the
 * way out, so removing a folder that still holds something would sweep up workflows that
 * reconciliation deliberately retained. A target-only folder survives while it contains one.
 */
@Service()
export class FolderRemover {
	constructor(
		private readonly folderService: FolderService,
		private readonly projectService: ProjectService,
	) {}

	async plan(
		context: ImportContext,
		input: { packageFolderIds: string[]; occupiedFolderIds: string[] },
	): Promise<FolderRemovalPlan> {
		const nothingToRemove = { removals: [], failures: [] };

		const placements = await this.folderService.getFolderPlacementsInProject(context.projectId);
		if (placements.length === 0) return nothingToRemove;

		const packageFolderIds = new Set(input.packageFolderIds);
		const candidates = placements.filter(({ id }) => !packageFolderIds.has(id));
		if (candidates.length === 0) return nothingToRemove;

		const removableIds = resolveRemovable(candidates, placements, new Set(input.occupiedFolderIds));

		const depths = folderDepths(placements);
		const removals = candidates
			.filter(({ id }) => removableIds.has(id))
			.map(({ id, name, parentFolderId }) => ({
				id,
				name,
				parentFolderId,
				depth: depths.get(id) ?? 0,
			}))
			// Deepest first: the parent column cascades, so deleting a parent early would drop its
			// children without the per-folder deletion event.
			.sort((a, b) => b.depth - a.depth);
		if (removals.length === 0) return nothingToRemove;

		// The API-key gate cannot see project roles, so verify the user's own `folder:delete` too —
		// it hangs off the project role, not the folder, so one lookup answers for every removal.
		const project = await this.projectService.getProjectWithScope(context.user, context.projectId, [
			'folder:delete',
		]);
		if (!project) {
			return {
				removals: [],
				failures: removals.map(({ id, name }) => ({
					folderId: id,
					name,
					projectId: context.projectId,
				})),
			};
		}

		return { removals, failures: [] };
	}

	async apply(context: ImportContext, plan: FolderRemovalPlan): Promise<RemovedFolderSummary[]> {
		const summaries: RemovedFolderSummary[] = [];

		for (const folder of plan.removals) {
			await this.folderService.deleteFolder(context.user, folder.id, context.projectId, {});
			summaries.push({
				folderId: folder.id,
				name: folder.name,
				projectId: context.projectId,
				parentFolderId: folder.parentFolderId,
			});
		}

		return summaries;
	}
}

/**
 * Which candidates end up empty, settled by repeated passes: a folder holding nothing but other
 * removable folders is itself removable, so one pass is not enough to reach the whole subtree.
 */
function resolveRemovable(
	candidates: FolderPlacement[],
	placements: FolderPlacement[],
	occupiedFolderIds: Set<string>,
): Set<string> {
	const removable = new Set<string>();

	for (let settled = false; !settled; ) {
		settled = true;
		for (const candidate of candidates) {
			if (removable.has(candidate.id) || occupiedFolderIds.has(candidate.id)) continue;

			const holdsSurvivingFolder = placements.some(
				({ id, parentFolderId }) => parentFolderId === candidate.id && !removable.has(id),
			);
			if (holdsSurvivingFolder) continue;

			removable.add(candidate.id);
			settled = false;
		}
	}

	return removable;
}

function folderDepths(placements: FolderPlacement[]): Map<string, number> {
	const parents = new Map(placements.map(({ id, parentFolderId }) => [id, parentFolderId]));
	const depths = new Map<string, number>();

	const depthOf = (id: string): number => {
		const cached = depths.get(id);
		if (cached !== undefined) return cached;

		// Guard first so a malformed parent cycle cannot recurse forever.
		depths.set(id, 0);
		const parentId = parents.get(id) ?? null;
		const depth = parentId === null ? 0 : depthOf(parentId) + 1;
		depths.set(id, depth);
		return depth;
	};

	for (const { id } of placements) depthOf(id);
	return depths;
}
