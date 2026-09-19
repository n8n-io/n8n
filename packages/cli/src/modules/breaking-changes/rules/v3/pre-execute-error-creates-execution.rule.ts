import { readEnvValue } from '@n8n/config';
import { BreakingChangeRule } from '@n8n/decorators';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

const LEGACY_ENV_VAR = 'N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION';

/** The config option is removed, so the opt-in is only readable from the raw env value. */
function isLegacyPathEnabled(): boolean {
	const value = readEnvValue(LEGACY_ENV_VAR)?.toLowerCase();
	return value === 'true' || value === '1';
}

@BreakingChangeRule({ version: 'v3' })
export class PreExecuteErrorCreatesExecutionRule implements IBreakingChangeInstanceRule {
	id: string = 'pre-execute-error-creates-execution-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'A throw from workflow.preExecute no longer creates an execution',
			description:
				'The N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION environment variable is removed. A throw from workflow.preExecute never creates an execution record.',
			category: BreakingChangeCategory.instance,
			severity: 'medium',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (!isLegacyPathEnabled()) {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Instance uses the legacy persist-then-fail path',
					description:
						'This instance sets N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION so a throw from workflow.preExecute still creates a failed execution. After the update, that throw never creates a row and does not count toward Insights or license usage.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Remove N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION',
					description:
						'Remove the variable before you update. A throw from workflow.preExecute will no longer create an execution.',
				},
			],
		};
	}
}
