import { BreakingChangeRule } from '@n8n/decorators';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class TaskRunnerInternalModeRule implements IBreakingChangeInstanceRule {
	id: string = 'task-runner-internal-mode-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Internal task runner mode is removed',
			description:
				'Task runners can no longer run as a child process of n8n. The new version only supports N8N_RUNNERS_MODE=external and fails to start Code node executions when no external task runner connects.',
			category: BreakingChangeCategory.infrastructure,
			severity: 'medium',
			documentationUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-task-runners',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detect(): Promise<InstanceDetectionReport> {
		if (process.env.N8N_RUNNERS_MODE !== 'internal') {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'N8N_RUNNERS_MODE is set to "internal"',
					description:
						'This instance runs task runners inside the n8n process. The new version rejects this mode, so Code nodes stop executing until an external task runner is connected.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Switch to external task runners before upgrading',
					description:
						'Run the task runner launcher as a separate process or container, set N8N_RUNNERS_MODE=external and share N8N_RUNNERS_AUTH_TOKEN between n8n and the launcher.',
				},
			],
		};
	}
}
