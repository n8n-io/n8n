import { BreakingChangeRule } from '@n8n/decorators';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class TaskRunnerTaskTimeoutRule implements IBreakingChangeInstanceRule {
	id: string = 'task-runner-task-timeout-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Task runner timeout default is reduced to 1 minute',
			description:
				'The default of N8N_RUNNERS_TASK_TIMEOUT is reduced from 300 seconds (5 minutes) to 60 seconds (1 minute). Code node tasks running longer than the new default will be aborted.',
			category: BreakingChangeCategory.environment,
			severity: 'low',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (process.env.N8N_RUNNERS_TASK_TIMEOUT !== undefined) {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Instance relies on the current default task timeout',
					description:
						'N8N_RUNNERS_TASK_TIMEOUT is not set, so this instance uses the default of 300 seconds. After the update, tasks running longer than 60 seconds will be aborted.',
					level: 'info',
				},
			],
			recommendations: [
				{
					action: 'Set N8N_RUNNERS_TASK_TIMEOUT explicitly',
					description:
						'If you have Code nodes that run longer than 1 minute, set N8N_RUNNERS_TASK_TIMEOUT=300 to keep the current timeout.',
				},
			],
		};
	}
}
