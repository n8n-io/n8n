import type {
	ProjectWorkflowReviewSettingsResponse,
	UpdateProjectWorkflowReviewSettingsDto,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { ProjectRepository, ProjectWorkflowReviewSettingsRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

@Service()
export class WorkflowReviewProjectSettingsService {
	constructor(
		private readonly settingsRepository: ProjectWorkflowReviewSettingsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly eventService: EventService,
	) {}

	async get(projectId: string): Promise<ProjectWorkflowReviewSettingsResponse> {
		return {
			projectApprovalRequired: await this.settingsRepository.isProjectApprovalRequired(
				projectId,
				{},
			),
		};
	}

	async update(
		user: User,
		projectId: string,
		{ projectApprovalRequired }: UpdateProjectWorkflowReviewSettingsDto,
	): Promise<ProjectWorkflowReviewSettingsResponse> {
		const [project] = await this.projectRepository.findTypesByIds([projectId]);
		if (project?.type !== 'team') {
			throw new NotFoundError('Could not find team project');
		}

		const changed = await this.settingsRepository.setProjectApprovalRequired(
			projectId,
			projectApprovalRequired,
			{},
		);
		if (changed) {
			this.eventService.emit('project-workflow-review-policy-updated', {
				user,
				projectId,
				projectApprovalRequired,
			});
		}

		return { projectApprovalRequired };
	}
}
