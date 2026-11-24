import type {
	ListWorkflowReviewInstanceSettingsQueryDto,
	ProjectWorkflowReviewSettingsResponse,
	UpdateProjectWorkflowReviewSettingsDto,
	UpdateWorkflowReviewInstanceSettingsDto,
	WorkflowReviewInstanceSettingsList,
	WorkflowReviewInstanceSettingsResponse,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { ProjectRepository, ProjectWorkflowReviewSettingsRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';

@Service()
export class WorkflowReviewProjectSettingsService {
	constructor(
		private readonly settingsRepository: ProjectWorkflowReviewSettingsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly eventService: EventService,
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
	) {}

	async get(projectId: string): Promise<ProjectWorkflowReviewSettingsResponse> {
		await this.featureGate.assertAvailable();
		const [project] = await this.projectRepository.findTypesByIds([projectId]);
		if (project?.type !== 'team') throw new NotFoundError('Could not find team project');

		return await this.settingsRepository.getRequirements(projectId, {});
	}

	async update(
		user: User,
		projectId: string,
		{ requiredByProject }: UpdateProjectWorkflowReviewSettingsDto,
	): Promise<ProjectWorkflowReviewSettingsResponse> {
		await this.featureGate.assertAvailable();
		const changed = await this.settingsRepository.setRequiredByTeamProject(
			projectId,
			requiredByProject,
			{},
		);
		if (changed === null) throw new NotFoundError('Could not find team project');
		if (changed) {
			this.eventService.emit('project-workflow-review-settings-updated', {
				user,
				projectId,
				requiredByProject,
			});
		}

		return await this.settingsRepository.getRequirements(projectId, {});
	}

	async listInstanceSettings({
		search,
		requiredByInstance,
		skip,
		take,
	}: ListWorkflowReviewInstanceSettingsQueryDto): Promise<WorkflowReviewInstanceSettingsList> {
		await this.featureGate.assertAvailable();
		const [data, count] = await this.settingsRepository.findTeamProjectPage(
			{ search, requiredByInstance, skip, take },
			{},
		);
		return {
			count,
			data,
			managedByEnv: this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv,
		};
	}

	async setRequiredByInstance(
		user: User,
		projectId: string,
		{ requiredByInstance }: UpdateWorkflowReviewInstanceSettingsDto,
	): Promise<WorkflowReviewInstanceSettingsResponse> {
		await this.featureGate.assertAvailable();
		if (this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv) {
			throw new ForbiddenError(
				'Security settings are managed via environment variables and cannot be modified through the API',
			);
		}

		const changed = await this.settingsRepository.setRequiredByInstanceForTeamProject(
			projectId,
			requiredByInstance,
			{},
		);
		if (changed === null) throw new NotFoundError('Could not find team project');
		if (changed) {
			this.eventService.emit('project-workflow-review-required-by-instance-updated', {
				user,
				projectId,
				requiredByInstance,
			});
		}

		return { requiredByInstance };
	}
}
