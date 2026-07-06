import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { FolderService } from '@/services/folder.service';

import { decideMatchedFolderAction } from './folder-conflict-policy';
import type {
	FolderImportContext,
	FolderImportPlan,
	FolderPlanItem,
	PreparedFolder,
} from './folder-import.types';
import type { FolderConflict, ImportedFolderSummary } from '../../n8n-packages.types';

/** Target-state of a package folder id that already exists somewhere on the instance. */
interface ExistingFolder {
	projectId: string;
	parentFolderId: string | null;
	name: string;
}

/**
 * Imports the package's folder shells into the target project in two phases:
 * {@link plan} orders them parent-before-child, matches each against the target and decides
 * create/update/skip (or records a blocking conflict); {@link apply} writes the plan.
 *
 * Folder ids are reused verbatim (no id policy), so a package folder's id is both its
 * source id and its target id, and a nested folder's `parentFolderId` already names its
 * in-package parent. Persistence goes through {@link FolderService}, never the repository.
 */
@Service()
export class FolderImporter {
	constructor(private readonly folderService: FolderService) {}

	async plan(context: FolderImportContext, folders: PreparedFolder[]): Promise<FolderImportPlan> {
		const ordered = orderParentsFirst(folders);
		const existing = await this.findExisting(ordered.map(({ sourceFolderId }) => sourceFolderId));

		const items: FolderPlanItem[] = [];
		const conflicts: FolderConflict[] = [];

		for (const folder of ordered) {
			// Root-of-forest folders anchor under the request folder (or project root); nested
			// folders reuse their in-package parent id, which is the same id in the target.
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

			//	If this is different then it's essentially a folder "move" which we don't want.
			if (match.parentFolderId !== targetParentFolderId) {
				conflicts.push({
					kind: 'parent-mismatch',
					sourceFolderId: folder.sourceFolderId,
					name: folder.name,
					existingParentFolderId: match.parentFolderId,
					expectedParentFolderId: targetParentFolderId,
				});
				continue;
			}

			const decision = decideMatchedFolderAction(context.folderConflictPolicy);
			if (decision.blocked) {
				conflicts.push({
					kind: 'fail-policy',
					sourceFolderId: folder.sourceFolderId,
					name: folder.name,
				});
				continue;
			}

			items.push({
				action: decision.action,
				sourceFolderId: folder.sourceFolderId,
				name: folder.name,
			});
		}

		return { items, conflicts };
	}

	/**
	 * Writes the plan folder-by-folder through {@link FolderService}. Ordering is parent-first
	 * (from {@link plan}), so a nested folder's parent already exists when it is created. Conflicts
	 * are gated in {@link plan}, so nothing is written when the import is blocked.
	 */
	async apply(
		context: FolderImportContext,
		plan: FolderImportPlan,
	): Promise<ImportedFolderSummary[]> {
		const summaries: ImportedFolderSummary[] = [];

		for (const item of plan.items) {
			if (item.action === 'skip') {
				summaries.push(toSummary(item, null, 'skipped'));
				continue;
			}

			if (item.action === 'update') {
				await this.folderService.updateFolder(item.sourceFolderId, context.projectId, {
					name: item.name,
				});
				summaries.push(toSummary(item, null, 'updated'));
				continue;
			}

			await this.folderService.createFolder(
				{ name: item.name, parentFolderId: item.targetParentFolderId ?? undefined },
				context.projectId,
				item.sourceFolderId,
			);
			summaries.push(toSummary(item, item.targetParentFolderId, 'created'));
		}

		return summaries;
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

function toSummary(
	item: FolderPlanItem,
	parentFolderId: string | null,
	status: ImportedFolderSummary['status'],
): ImportedFolderSummary {
	return {
		sourceFolderId: item.sourceFolderId,
		localId: item.sourceFolderId,
		name: item.name,
		parentFolderId,
		status,
	};
}

/**
 * Orders folders so every parent precedes its children (the parent must exist before a child
 * references it). A `parentFolderId` that names no in-package folder, or a cycle, is a malformed package.
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
