import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class TaskRunnerDockerImageRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id: string = 'task-runner-docker-image-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove task runner from n8nio/n8n docker image',
			description:
				'Task runners are no longer included in the n8nio/n8n docker image and must use the separate n8nio/runners image',
			category: BreakingChangeCategory.infrastructure,
			severity: 'medium',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#remove-task-runner-from-n8nion8n-docker-image',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		// Not relevant for cloud deployments - cloud manages Docker images
		if (this.globalConfig.deployment.type === 'cloud') {
			return {
				isAffected: false,
				instanceIssues: [],
				recommendations: [],
			};
		}

		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Task runner removed from main Docker image',
					description:
						'The task runner is no longer bundled with the n8nio/n8n Docker image. If you are using task runners in Docker, you must use the separate n8nio/runners image.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Update Docker configuration',
					description:
						'Change the task runner Docker image from n8nio/n8n to n8nio/runners in your docker-compose.yml or Kubernetes configuration',
				},
				{
					action: 'Configure external task runners',
					description:
						'Set up external task runners using the n8nio/runners image and configure n8n to connect to them using N8N_RUNNERS_MODE=external',
				},
				{
					action: 'Review task runner documentation',
					description:
						'Consult the updated task runner documentation for migration steps and configuration examples',
				},
			],
		};

		return result;
	}
}
