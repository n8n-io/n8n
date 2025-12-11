import { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class TaskRunnersRule implements IBreakingChangeInstanceRule {
	constructor(
		private readonly taskRunnersConfig: TaskRunnersConfig,
		private readonly globalConfig: GlobalConfig,
	) {}

	id: string = 'task-runners-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Enable Task Runners by default',
			description:
				'Task Runners are now enabled by default, changing execution model and resource usage',
			category: BreakingChangeCategory.infrastructure,
			severity: 'medium',
			documentationUrl: 'https://docs.n8n.io/2-0-breaking-changes/#enable-task-runners-by-default',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		// Not relevant for cloud deployments - cloud manages task runner infrastructure
		if (this.globalConfig.deployment.type === 'cloud') {
			return {
				isAffected: false,
				instanceIssues: [],
				recommendations: [],
			};
		}

		const result: InstanceDetectionReport = {
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
				level: 'warning',
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
			});
		}

		return result;
	}
}
