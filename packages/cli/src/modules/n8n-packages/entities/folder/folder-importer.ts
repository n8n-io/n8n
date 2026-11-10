import { folderNameSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { Telemetry } from '@/telemetry';
import { PROJECT_ROOT } from 'n8n-workflow';
import { UserError } from '@n8n/errors';

import { FolderService } from '@/services/folder.service';

import { decideMatchedFolder } from './folder-conflict-policy';
import type {
	FolderImportContext,
	FolderImportPlan,
	FolderPlanItem,
	PreparedFolder,
} from './folder-import.types';
import { LayoutConflictPolicy } from '../../n8n-packages.types';
import type { FolderConflict, ImportedFolderSummary } from '../../n8n-packages.types';

interface ExistingFolder {
	resourceType: 'workflow' | 'agent';
	projectId: string;
	parentFolderId: string | null;
	name: string;
}

@Service()
export class FolderImporter {
	constructor(
		private readonly folderService: FolderService,
		private readonly telemetry: Telemetry,
	) {}

	async plan(context: FolderImportContext, folders: PreparedFolder[]): Promise<FolderImportPlan> {
		const ordered = orderParentsFirst(folders);
		const existing = await this.findExisting(ordered.map(({ sourceFolderId }) => sourceFolderId));

		const items: FolderPlanItem[] = [];
		const conflicts: FolderConflict[] = [];

		for (const folder of ordered) {
			const parsedName = folderNameSchema.safeParse(folder.name);

			if (!parsedName.success) {
				throw new UserError('Package folder name is invalid');
			}

			folder.name = parsedName.data;

			const targetParentFolderId =
				folder.parentFolderId === null
					? folder.resourceType === 'agent'
						? null
						: (context.folderId ?? null)
					: folder.parentFolderId;

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

			if (match.resourceType !== (folder.resourceType ?? 'workflow')) {
				throw new UserError('Cannot change the resource type of an existing folder');
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

			const followsPackage = context.layoutConflictPolicy === LayoutConflictPolicy.FollowPackage;
			const moved = match.parentFolderId !== targetParentFolderId;
			if (moved && !followsPackage) {
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

			// Under `follow-package` a folder takes the parent and name of the package.
			const renamed = followsPackage && match.name !== folder.name;
			if (moved || renamed) {
				items.push({
					action: 'update',
					sourceFolderId: folder.sourceFolderId,
					name: folder.name,
					targetParentFolderId,
					...(moved ? { moved: true as const } : {}),
					...(renamed ? { renamed: true as const } : {}),
				});
				continue;
			}

			// `merge`: reuse the existing folder untouched; its children merge in via id reuse.
			items.push({
				action: 'skip',
				sourceFolderId: folder.sourceFolderId,
				name: folder.name,
				targetParentFolderId: match.parentFolderId,
				existingName: match.name,
			});
		}

		const byId = new Map(ordered.map((folder) => [folder.sourceFolderId, folder]));

		for (const item of items) {
			item.resourceType = byId.get(item.sourceFolderId)?.resourceType ?? 'workflow';
			const parent = item.targetParentFolderId ? byId.get(item.targetParentFolderId) : undefined;

			if (parent && (parent.resourceType ?? 'workflow') !== item.resourceType) {
				throw new UserError('Parent and child folders must use the same resource type');
			}

			if (item.targetParentFolderId && !parent) {
				await this.folderService.validateDestination(
					item.targetParentFolderId,
					context.projectId,
					item.resourceType,
				);
			}
		}

		return { items, conflicts };
	}

	/**
	 * Creates the new folders, so the workflow writes can put workflows in them. Changes to existing
	 * folders wait for {@link applyUpdates}, so a failed workflow write leaves them as they were.
	 */
	async apply(context: FolderImportContext, plan: FolderImportPlan): Promise<void> {
		for (const item of plan.items) {
			if (item.action !== 'create') continue;
			await this.folderService.createFolder(
				{
					name: item.name,
					parentFolderId: item.targetParentFolderId ?? undefined,
					resourceType: item.resourceType,
				},
				context.projectId,
				item.sourceFolderId,
			);
			this.track(context, item, 'created');
		}
	}

	/** Parents first, as planned, so a folder never moves under one of its own descendants. */
	async applyUpdates(context: FolderImportContext, plan: FolderImportPlan): Promise<void> {
		for (const item of plan.items) {
			if (item.action !== 'update') continue;
			await this.folderService.updateFolder(item.sourceFolderId, context.projectId, {
				...(item.renamed ? { name: item.name } : {}),
				...(item.moved ? { parentFolderId: item.targetParentFolderId ?? PROJECT_ROOT } : {}),
			});
			this.track(context, item, item.moved ? 'moved' : 'updated');
		}
	}

	private track(
		context: FolderImportContext,
		item: FolderPlanItem,
		action: 'created' | 'moved' | 'updated',
	): void {
		this.telemetry.track(TELEMETRY_EVENT.PLATFORM.RESOURCE_FOLDER_CHANGED, {
			user_id: context.user.id,
			project_id: context.projectId,
			resource_type: item.resourceType ?? 'workflow',
			action,
			source: 'package',
			folder_id: item.sourceFolderId,
			target_folder_id: item.targetParentFolderId,
			folder_count: 1,
		});
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
					resourceType: folder.resourceType ?? 'workflow',
				},
			]),
		);
	}
}

const SUMMARY_STATUS = {
	create: 'created',
	skip: 'skipped',
	update: 'updated',
} as const satisfies Record<FolderPlanItem['action'], ImportedFolderSummary['status']>;

/** The outcome of every planned folder, once {@link FolderImporter.apply} and the updates ran. */
export function toFolderSummaries(plan: FolderImportPlan): ImportedFolderSummary[] {
	return plan.items.map(
		({ action, sourceFolderId, name, targetParentFolderId, moved, renamed }) => ({
			sourceFolderId,
			localId: sourceFolderId,
			name,
			parentFolderId: targetParentFolderId,
			status: SUMMARY_STATUS[action],
			...(moved ? { moved } : {}),
			...(renamed ? { renamed } : {}),
		}),
	);
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
