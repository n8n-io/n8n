import { Service } from '@n8n/di';
import { PROJECT_ROOT, UserError } from 'n8n-workflow';

import { FolderService } from '@/services/folder.service';

import { decideMatchedFolder } from './folder-conflict-policy';
import type {
	FolderImportContext,
	FolderImportPlan,
	FolderPlanItem,
	PreparedFolder,
} from './folder-import.types';
import { PlacementPolicy } from '../../n8n-packages.types';
import type { FolderConflict, ImportedFolderSummary } from '../../n8n-packages.types';

interface ExistingFolder {
	projectId: string;
	parentFolderId: string | null;
	name: string;
}

@Service()
export class FolderImporter {
	constructor(private readonly folderService: FolderService) {}

	async plan(context: FolderImportContext, folders: PreparedFolder[]): Promise<FolderImportPlan> {
		const ordered = orderParentsFirst(folders);
		const existing = await this.findExisting(ordered.map(({ sourceFolderId }) => sourceFolderId));

		const items: FolderPlanItem[] = [];
		const conflicts: FolderConflict[] = [];

		for (const folder of ordered) {
			const targetParentFolderId =
				folder.parentFolderId === null ? (context.folderId ?? null) : folder.parentFolderId;

			const match = existing.get(folder.sourceFolderId);

			if (!match) {
				items.push({
					action: 'create',
					sourceFolderId: folder.sourceFolderId,
					name: folder.name,
					targetParentFolderId,
				});
				continue;
			}

			if (match.projectId !== context.projectId) {
				conflicts.push({
					kind: 'id-in-other-project',
					sourceFolderId: folder.sourceFolderId,
					name: folder.name,
					existingProjectId: match.projectId,
				});
				continue;
			}

			if (match.parentFolderId !== targetParentFolderId) {
				if (context.placementPolicy === PlacementPolicy.FollowPackage) {
					if (decideMatchedFolder(context.folderConflictPolicy).blocked) {
						conflicts.push({
							kind: 'fail-policy',
							sourceFolderId: folder.sourceFolderId,
							name: folder.name,
						});
						continue;
					}
					// A folder outside the selection stays where it is, with everything inside it.
					const movable = context.movableFolderIds?.has(folder.sourceFolderId) ?? true;
					items.push({
						action: movable ? 'move' : 'skip',
						sourceFolderId: folder.sourceFolderId,
						name: folder.name,
						targetParentFolderId: movable ? targetParentFolderId : match.parentFolderId,
					});
					continue;
				}
				conflicts.push({
					kind: 'parent-mismatch',
					sourceFolderId: folder.sourceFolderId,
					name: folder.name,
					existingParentFolderId: match.parentFolderId,
					expectedParentFolderId: targetParentFolderId,
				});
				continue;
			}

			if (decideMatchedFolder(context.folderConflictPolicy).blocked) {
				conflicts.push({
					kind: 'fail-policy',
					sourceFolderId: folder.sourceFolderId,
					name: folder.name,
				});
				continue;
			}

			// `merge`: reuse the existing folder untouched; its children merge in via id reuse.
			items.push({
				action: 'skip',
				sourceFolderId: folder.sourceFolderId,
				name: folder.name,
				targetParentFolderId,
			});
		}

		return { items, conflicts };
	}

	/**
	 * Creates the new folders, so the workflow writes can put workflows in them. Moves wait for
	 * {@link applyMoves}, so a failed workflow write leaves the existing folders where they were.
	 */
	async apply(context: FolderImportContext, plan: FolderImportPlan): Promise<void> {
		for (const item of plan.items) {
			if (item.action !== 'create') continue;
			await this.folderService.createFolder(
				{ name: item.name, parentFolderId: item.targetParentFolderId ?? undefined },
				context.projectId,
				item.sourceFolderId,
			);
		}
	}

	/** Parents first, as planned, so a folder never moves under one of its own descendants. */
	async applyMoves(context: FolderImportContext, plan: FolderImportPlan): Promise<void> {
		for (const item of plan.items) {
			if (item.action !== 'move') continue;
			await this.folderService.updateFolder(item.sourceFolderId, context.projectId, {
				parentFolderId: item.targetParentFolderId ?? PROJECT_ROOT,
			});
		}
	}

	private async findExisting(folderIds: string[]): Promise<Map<string, ExistingFolder>> {
		const folders = await this.folderService.getFoldersByIds(folderIds);
		return new Map(
			folders.map((folder) => [
				folder.id,
				{
					projectId: folder.homeProject.id,
					parentFolderId: folder.parentFolderId,
					name: folder.name,
				},
			]),
		);
	}
}

const SUMMARY_STATUS = {
	create: 'created',
	skip: 'skipped',
	move: 'moved',
} as const satisfies Record<FolderPlanItem['action'], ImportedFolderSummary['status']>;

/** The outcome of every planned folder, once {@link FolderImporter.apply} and the moves ran. */
export function toFolderSummaries(plan: FolderImportPlan): ImportedFolderSummary[] {
	return plan.items.map((item) => ({
		sourceFolderId: item.sourceFolderId,
		localId: item.sourceFolderId,
		name: item.name,
		parentFolderId: item.targetParentFolderId,
		status: SUMMARY_STATUS[item.action],
	}));
}

/**
 * Orders folders from parents -> children
 * @param folders
 */
function orderParentsFirst(folders: PreparedFolder[]): PreparedFolder[] {
	const byId = new Map(folders.map((folder) => [folder.sourceFolderId, folder]));
	const ordered: PreparedFolder[] = [];
	const visited = new Set<string>();
	const onStack = new Set<string>();

	const visit = (folder: PreparedFolder): void => {
		if (visited.has(folder.sourceFolderId)) return;
		if (onStack.has(folder.sourceFolderId)) {
			throw new UserError('Package folder hierarchy contains a cycle.');
		}
		onStack.add(folder.sourceFolderId);

		const parentId = folder.parentFolderId;
		if (parentId !== null) {
			const parent = byId.get(parentId);
			if (!parent) {
				throw new UserError(
					`Package folder "${folder.name}" references a parent folder that is not in the package.`,
				);
			}
			visit(parent);
		}

		onStack.delete(folder.sourceFolderId);
		visited.add(folder.sourceFolderId);
		ordered.push(folder);
	};

	for (const folder of folders) visit(folder);
	return ordered;
}
