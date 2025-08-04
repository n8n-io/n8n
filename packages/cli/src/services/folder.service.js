'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.FolderService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const folder_not_found_error_1 = require('@/errors/folder-not-found.error');
const workflow_service_1 = require('@/workflows/workflow.service');
let FolderService = class FolderService {
	constructor(folderRepository, folderTagMappingRepository, workflowRepository, workflowService) {
		this.folderRepository = folderRepository;
		this.folderTagMappingRepository = folderTagMappingRepository;
		this.workflowRepository = workflowRepository;
		this.workflowService = workflowService;
	}
	async createFolder({ parentFolderId, name }, projectId) {
		let parentFolder = null;
		if (parentFolderId) {
			parentFolder = await this.findFolderInProjectOrFail(parentFolderId, projectId);
		}
		const folderEntity = this.folderRepository.create({
			name,
			homeProject: { id: projectId },
			parentFolder,
		});
		const { homeProject, ...folder } = await this.folderRepository.save(folderEntity);
		return folder;
	}
	async updateFolder(folderId, projectId, { name, tagIds, parentFolderId }) {
		await this.findFolderInProjectOrFail(folderId, projectId);
		if (name) {
			await this.folderRepository.update({ id: folderId }, { name });
		}
		if (tagIds) {
			await this.folderTagMappingRepository.overwriteTags(folderId, tagIds);
		}
		if (parentFolderId) {
			if (folderId === parentFolderId) {
				throw new n8n_workflow_1.UserError('Cannot set a folder as its own parent');
			}
			if (parentFolderId !== n8n_workflow_1.PROJECT_ROOT) {
				await this.findFolderInProjectOrFail(parentFolderId, projectId);
				const parentFolderPath = await this.getFolderTree(parentFolderId, projectId);
				if (this.isDescendant(folderId, parentFolderPath)) {
					throw new n8n_workflow_1.UserError(
						"Cannot set a folder's parent to a folder that is a descendant of the current folder",
					);
				}
			}
			await this.folderRepository.update(
				{ id: folderId },
				{
					parentFolder:
						parentFolderId !== n8n_workflow_1.PROJECT_ROOT ? { id: parentFolderId } : null,
				},
			);
		}
	}
	async findFolderInProjectOrFail(folderId, projectId, em) {
		try {
			return await this.folderRepository.findOneOrFailFolderInProject(folderId, projectId, em);
		} catch {
			throw new folder_not_found_error_1.FolderNotFoundError(folderId);
		}
	}
	async getFolderTree(folderId, projectId) {
		await this.findFolderInProjectOrFail(folderId, projectId);
		const escapedParentFolderId = this.folderRepository
			.createQueryBuilder()
			.escape('parentFolderId');
		const baseQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.addSelect('folder.parentFolderId', 'parentFolderId')
			.where('folder.id = :folderId', { folderId });
		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.addSelect('f.parentFolderId', 'parentFolderId')
			.innerJoin('folder_path', 'fp', `f.id = fp.${escapedParentFolderId}`);
		const mainQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'folder_id')
			.addSelect('folder.name', 'folder_name')
			.addSelect('folder.parentFolderId', 'folder_parent_folder_id')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.where((qb) => {
				const subQuery = qb.subQuery().select('fp.id').from('folder_path', 'fp').getQuery();
				return `folder.id IN ${subQuery}`;
			})
			.setParameters({
				folderId,
			});
		const result = await mainQuery.getRawMany();
		return this.transformFolderPathToTree(result);
	}
	async flattenAndArchive(user, folderId, projectId) {
		const workflowIds = await this.workflowRepository.getAllWorkflowIdsInHierarchy(
			folderId,
			projectId,
		);
		for (const workflowId of workflowIds) {
			await this.workflowService.archive(user, workflowId, true);
		}
		await this.workflowRepository.moveToFolder(workflowIds, n8n_workflow_1.PROJECT_ROOT);
	}
	async deleteFolder(user, folderId, projectId, { transferToFolderId }) {
		await this.findFolderInProjectOrFail(folderId, projectId);
		if (!transferToFolderId) {
			await this.flattenAndArchive(user, folderId, projectId);
			await this.folderRepository.delete({ id: folderId });
			return;
		}
		if (folderId === transferToFolderId) {
			throw new n8n_workflow_1.UserError(
				'Cannot transfer folder contents to the folder being deleted',
			);
		}
		if (transferToFolderId !== n8n_workflow_1.PROJECT_ROOT) {
			await this.findFolderInProjectOrFail(transferToFolderId, projectId);
		}
		return await this.folderRepository.manager.transaction(async (tx) => {
			await this.folderRepository.moveAllToFolder(folderId, transferToFolderId, tx);
			await this.workflowRepository.moveAllToFolder(folderId, transferToFolderId, tx);
			await tx.delete(db_1.Folder, { id: folderId });
			return;
		});
	}
	async transferAllFoldersToProject(fromProjectId, toProjectId, tx) {
		return await this.folderRepository.transferAllFoldersToProject(fromProjectId, toProjectId, tx);
	}
	transformFolderPathToTree(flatPath) {
		if (!flatPath || flatPath.length === 0) {
			return [];
		}
		const folderMap = new Map();
		flatPath.forEach((folder) => {
			folderMap.set(folder.folder_id, {
				id: folder.folder_id,
				name: folder.folder_name,
				children: [],
			});
		});
		let rootNode = null;
		flatPath.forEach((folder) => {
			const currentNode = folderMap.get(folder.folder_id);
			if (folder.folder_parent_folder_id && folderMap.has(folder.folder_parent_folder_id)) {
				const parentNode = folderMap.get(folder.folder_parent_folder_id);
				parentNode.children = [currentNode];
			} else {
				rootNode = currentNode;
			}
		});
		return rootNode ? [rootNode] : [];
	}
	isDescendant(folderId, tree) {
		return tree.some((node) => {
			if (node.id === folderId) {
				return true;
			}
			return this.isDescendant(folderId, node.children);
		});
	}
	async getFolderAndWorkflowCount(folderId, projectId) {
		await this.findFolderInProjectOrFail(folderId, projectId);
		const baseQuery = this.folderRepository
			.createQueryBuilder('folder')
			.select('folder.id', 'id')
			.where('folder.id = :folderId', { folderId });
		const recursiveQuery = this.folderRepository
			.createQueryBuilder('f')
			.select('f.id', 'id')
			.innerJoin('folder_path', 'fp', 'f.parentFolderId = fp.id');
		const subFolderCountQuery = this.folderRepository
			.createQueryBuilder('folder')
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.select('COUNT(DISTINCT folder.id) - 1', 'count')
			.where((qb) => {
				const subQuery = qb.subQuery().select('fp.id').from('folder_path', 'fp').getQuery();
				return `folder.id IN ${subQuery}`;
			})
			.setParameters({
				folderId,
			});
		const workflowCountQuery = this.workflowRepository
			.createQueryBuilder('workflow')
			.select('COUNT(workflow.id)', 'count')
			.where('workflow.isArchived = :isArchived', { isArchived: false })
			.andWhere((qb) => {
				const folderQuery = qb.subQuery().from('folder_path', 'fp').select('fp.id').getQuery();
				return `workflow.parentFolderId IN ${folderQuery}`;
			})
			.addCommonTableExpression(
				`${baseQuery.getQuery()} UNION ALL ${recursiveQuery.getQuery()}`,
				'folder_path',
				{ recursive: true },
			)
			.setParameters({
				folderId,
			});
		const [subFolderResult, workflowResult] = await Promise.all([
			subFolderCountQuery.getRawOne(),
			workflowCountQuery.getRawOne(),
		]);
		return {
			totalSubFolders: parseInt(subFolderResult?.count ?? '0', 10),
			totalWorkflows: parseInt(workflowResult?.count ?? '0', 10),
		};
	}
	async getManyAndCount(projectId, options) {
		options.filter = { ...options.filter, projectId, isArchived: false };
		let [folders, count] = await this.folderRepository.getManyAndCount(options);
		if (options.select?.path) {
			folders = await this.enrichFoldersWithPaths(folders);
		}
		return [folders, count];
	}
	async enrichFoldersWithPaths(folders) {
		const folderIds = folders.map((folder) => folder.id);
		const folderPaths = await this.folderRepository.getFolderPathsToRoot(folderIds);
		return folders.map((folder) => ({
			...folder,
			path: folderPaths.get(folder.id),
		}));
	}
};
exports.FolderService = FolderService;
exports.FolderService = FolderService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			db_1.FolderRepository,
			db_1.FolderTagMappingRepository,
			db_1.WorkflowRepository,
			workflow_service_1.WorkflowService,
		]),
	],
	FolderService,
);
//# sourceMappingURL=folder.service.js.map
