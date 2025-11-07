import type { User } from '@n8n/db';
import { WorkflowEntity, WorkflowRepository, FolderRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager, FindOptionsWhere } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';

import { RoleService } from '@/services/role.service';

@Service()
export class WorkflowFinderService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly folderRepository: FolderRepository,
		private readonly roleService: RoleService,
	) {}

	async findWorkflowForUser(
		workflowId: string,
		user: User,
		scopes: Scope[],
		options: {
			includeTags?: boolean;
			includeParentFolder?: boolean;
			em?: EntityManager;
		} = {},
	) {
		const em = options.em ?? this.workflowRepository.manager;

		let where: FindOptionsWhere<WorkflowEntity> = { id: workflowId };

		// Build relations array based on options
		const relations: string[] = ['project'];
		if (options.includeTags) {
			relations.push('tags');
		}
		if (options.includeParentFolder) {
			relations.push('parentFolder');
		}

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);

			where = {
				id: workflowId,
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};

			// Need to include projectRelations to check permissions
			relations.push('project.projectRelations');
		}

		const workflow = await em.findOne(WorkflowEntity, {
			where,
			relations,
		});

		return workflow;
	}

	async findAllWorkflowsForUser(
		user: User,
		scopes: Scope[],
		folderId?: string,
		projectId?: string,
	) {
		let where: FindOptionsWhere<WorkflowEntity> = {};

		if (folderId) {
			const subFolderIds = await this.folderRepository.getAllFolderIdsInHierarchy(
				folderId,
				projectId,
			);

			where = {
				...where,
				parentFolder: {
					id: In([folderId, ...subFolderIds]),
				},
			};
		}

		if (projectId) {
			where = {
				...where,
				projectId,
			};
		}

		if (!hasGlobalScope(user, scopes, { mode: 'allOf' })) {
			const projectRoles = await this.roleService.rolesWithScope('project', scopes);

			where = {
				...where,
				project: {
					...(projectId && { id: projectId }),
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const workflows = await this.workflowRepository.find({
			where,
			relations: ['project', 'project.projectRelations', 'project.projectRelations.user'],
		});

		return workflows;
	}
}
