import { TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class TaskRunnersRule implements IBreakingChangeInstanceRule {
	constructor(private readonly taskRunnersConfig: TaskRunnersConfig) {}

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'task-runners-v2',
			version: 'v2',
			title: 'Enable Task Runners by default',
			description:
				'Task Runners are now enabled by default, changing execution model and resource usage',
			category: BreakingChangeCategory.infrastructure,
			severity: BreakingChangeSeverity.medium,
		};
	}

	async detect(): Promise<InstanceDetectionResult> {
		const result: InstanceDetectionResult = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		// Check if runners are already enabled or explicitly disabled

		if (!this.taskRunnersConfig.enabled) {
			result.isAffected = true;
			result.instanceIssues.push({
				title: 'Task Runners will be enabled by default',
				description:
					'Task Runners change the execution model to use separate processes for workflow execution. This may affect memory footprint and execution latency. N8N_RUNNERS_MAX_CONCURRENCY will default to 5 (previously 10).',
				level: IssueLevel.warning,
			});

			result.recommendations.push({
				action: 'Review concurrency settings',
				description:
					'Keep concurrency at 5 or raise back to 10 with N8N_RUNNERS_MAX_CONCURRENCY if your environment permits',
			});

			result.recommendations.push({
				action: 'Configure runner memory limits',
				description:
					'Set N8N_RUNNERS_MAX_OLD_SPACE_SIZE to limit runner memory usage as needed for your infrastructure',
			});

			result.recommendations.push({
				action: 'Consider external task runners',
				description: 'For better scalability, consider migrating to external task runner mode',
				documentationUrl: 'https://docs.n8n.io/hosting/configuration/task-runners/',
			});
		}

		return result;
	}
}
