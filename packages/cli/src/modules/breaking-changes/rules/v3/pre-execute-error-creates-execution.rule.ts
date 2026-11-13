import { ExecutionsConfig } from '@n8n/config';
import { BreakingChangeRule } from '@n8n/decorators';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class PreExecuteErrorCreatesExecutionRule implements IBreakingChangeInstanceRule {
	constructor(private readonly executionsConfig: ExecutionsConfig) {}

	id: string = 'pre-execute-error-creates-execution-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'A throw from workflow.preExecute no longer creates an execution',
			description:
				'The N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION environment variable is removed. A throw from workflow.preExecute never creates an execution record.',
			category: BreakingChangeCategory.instance,
			impact: 'capabilityRemoved',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (!this.executionsConfig.preExecuteErrorCreatesExecution) {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Instance creates a failed execution when workflow.preExecute throws',
					description:
						'This instance sets N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION, so a throw from workflow.preExecute creates a failed execution. After the update, n8n does not create this execution. Alerts and reports that use these failed executions stop. The throw also does not count toward Insights or license usage.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Move alerting into the workflow.preExecute hook',
					description:
						'If an alert or report uses these failed executions, send the alert from your workflow.preExecute external hook before it throws. Otherwise, you do not need to do anything. n8n 3.0 ignores N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION, so you can remove it at any time.',
				},
			],
		};
	}
}
