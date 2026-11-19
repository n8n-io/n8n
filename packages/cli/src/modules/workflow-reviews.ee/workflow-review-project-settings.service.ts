import type {
	ProjectWorkflowReviewSettingsResponse,
	UpdateProjectWorkflowReviewSettingsDto,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { ProjectRepository, ProjectWorkflowReviewSettingsRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';

@Service()
export class WorkflowReviewProjectSettingsService {
	constructor(
		private readonly settingsRepository: ProjectWorkflowReviewSettingsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly eventService: EventService,
		private readonly featureGate: WorkflowReviewFeatureGate,
	) {}

	async get(projectId: string): Promise<ProjectWorkflowReviewSettingsResponse> {
		await this.featureGate.assertAvailable();
		const [project] = await this.projectRepository.findTypesByIds([projectId]);
		if (project?.type !== 'team') throw new NotFoundError('Could not find team project');

		return {
			requiredByProject: await this.settingsRepository.isRequiredByProject(projectId, {}),
		};
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

		return { requiredByProject };
	}
}
