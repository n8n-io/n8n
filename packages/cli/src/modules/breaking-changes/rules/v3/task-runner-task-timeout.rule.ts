import { BreakingChangeRule } from '@n8n/decorators';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
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
				'The default of N8N_RUNNERS_TASK_TIMEOUT goes down from 300 seconds (5 minutes) to 60 seconds (1 minute). Only the default changes. You can set the variable to keep the current timeout.',
			category: BreakingChangeCategory.environment,
			impact: 'executionsMightFail',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (process.env.N8N_RUNNERS_TASK_TIMEOUT !== undefined) {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Instance relies on the current default task timeout',
					description:
						'N8N_RUNNERS_TASK_TIMEOUT is not set, so this instance uses the default of 300 seconds. After the update, the default is 60 seconds. If you do not set the variable, the task runner stops Code node tasks that run longer.',
					level: 'info',
				},
			],
			recommendations: [
				{
					action: 'Set N8N_RUNNERS_TASK_TIMEOUT if your Code nodes do heavy work',
					description:
						'The new default applies only when the variable is not set. If you have compute-intensive Code nodes that can run for more than 1 minute, set N8N_RUNNERS_TASK_TIMEOUT=300 to keep the current timeout. Otherwise, you do not need to do anything.',
				},
			],
		};
	}
}
