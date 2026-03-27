import { LicenseState, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User, Project } from '@n8n/db';
import {
	WorkflowEntity,
	SharedWorkflow,
	SharedWorkflowRepository,
	ProjectRepository,
	TagRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowHistoryService } from './workflow-history/workflow-history.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { ProjectService } from '@/services/project.service.ee';
import { TagService } from '@/services/tag.service';
import { FolderService } from '@/services/folder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseWorkflowService } from './workflow.service.ee';
import * as WorkflowHelpers from '@/workflow-helpers';

@Service()
export class WorkflowCreationService {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly tagService: TagService,
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly externalHooks: ExternalHooks,
		private readonly projectService: ProjectService,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly licenseState: LicenseState,
		private readonly projectRepository: ProjectRepository,
		private readonly tagRepository: TagRepository,
		private readonly credentialsService: CredentialsService,
		private readonly folderService: FolderService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
	) {}

	async createWorkflow(
		user: User,
		newWorkflow: WorkflowEntity,
		options: {
			tagIds?: string[];
			parentFolderId?: string;
			projectId?: string;
			autosaved?: boolean;
			uiContext?: string;
		} = {},
	): Promise<WorkflowEntity> {
		const { tagIds, parentFolderId, projectId, autosaved = false, uiContext } = options;

		// Ensure workflow is created as inactive
		newWorkflow.active = false;
		newWorkflow.versionId = uuid();

		await validateEntity(newWorkflow);

		await this.externalHooks.run('workflow.create', [newWorkflow]);

		if (tagIds?.length && !this.globalConfig.tags.disabled) {
			newWorkflow.tags = await this.tagRepository.findMany(tagIds);
		}

		// Resolve the effective project before credential replacement to scope lookups
		let effectiveProjectId = projectId;
		if (effectiveProjectId === undefined) {
			const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
			effectiveProjectId = personalProject.id;
		}

		await WorkflowHelpers.replaceInvalidCredentials(newWorkflow, effectiveProjectId);

		WorkflowHelpers.addNodeIds(newWorkflow);

		if (this.licenseState.isSharingLicensed()) {
			// This is a new workflow, so we simply check if the user has access to
			// all used credentials

			const allCredentials = await this.credentialsService.getMany(user, {
				includeGlobal: true,
			});

			try {
				this.enterpriseWorkflowService.validateCredentialPermissionsToUser(
					newWorkflow,
					allCredentials,
				);
			} catch (error) {
				throw new BadRequestError(
					'The workflow you are trying to save contains credentials that are not shared with you',
				);
			}
		}

		const { manager: dbManager } = this.projectRepository;

		let project: Project | null = null;
		const savedWorkflow = await dbManager.transaction(async (transactionManager) => {
			project = await this.projectService.getProjectWithScope(
				user,
				effectiveProjectId,
				['workflow:create'],
				transactionManager,
			);

			if (project === null) {
				throw new BadRequestError(
					"You don't have the permissions to save the workflow in this project.",
				);
			}

			// Strip redactionPolicy if user lacks scope (projectId is already resolved here)
			if (newWorkflow.settings?.redactionPolicy !== undefined) {
				const canUpdateRedaction = await userHasScopes(
					user,
					['workflow:updateRedactionSetting'],
					false,
					{ projectId: effectiveProjectId },
				);
				if (!canUpdateRedaction) {
					delete newWorkflow.settings.redactionPolicy;
				}
			}

			const workflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			if (parentFolderId) {
				try {
					const parentFolder = await this.folderService.findFolderInProjectOrFail(
						parentFolderId,
						project.id,
						transactionManager,
					);
					await transactionManager.update(WorkflowEntity, { id: workflow.id }, { parentFolder });
				} catch {}
			}

			const newSharedWorkflow = this.sharedWorkflowRepository.create({
				role: 'workflow:owner',
				projectId: project.id,
				workflow,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

			await this.workflowHistoryService.saveVersion(
				user,
				workflow,
				workflow.id,
				autosaved,
				transactionManager,
			);

			return await this.workflowFinderService.findWorkflowForUser(
				workflow.id,
				user,
				['workflow:read'],
				{
					em: transactionManager,
					includeTags: true,
					includeParentFolder: true,
					includeActiveVersion: true,
				},
			);
		});

		if (!savedWorkflow) {
			this.logger.error('Failed to create workflow', { userId: user.id });
			throw new InternalServerError('Failed to save workflow');
		}

		if (tagIds && !this.globalConfig.tags.disabled && savedWorkflow.tags) {
			savedWorkflow.tags = this.tagService.sortByRequestOrder(savedWorkflow.tags, {
				requestOrder: tagIds,
			});
		}

		await this.externalHooks.run('workflow.afterCreate', [savedWorkflow]);
		this.eventService.emit('workflow-created', {
			user,
			workflow: newWorkflow,
			publicApi: false,
			projectId: project!.id,
			projectType: project!.type,
			uiContext,
		});

		return savedWorkflow;
	}
}
