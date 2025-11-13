import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class CliActivateAllWorkflowsRule implements IBreakingChangeInstanceRule {
	id: string = 'cli-activate-all-workflows-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove CLI command operation to activate all workflows',
			description: 'The CLI command to activate all workflows has been removed for simplification',
			category: BreakingChangeCategory.instance,
			severity: 'low',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#remove-cli-command-operation-to-activate-all-workflows',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'CLI command to activate all workflows removed',
					description:
						'The CLI command to activate all workflows in bulk has been removed. If you were using this command in scripts or automation, you will need to update your approach.',
					level: 'info',
				},
			],
			recommendations: [
				{
					action: 'Use the API to activate workflows',
					description:
						'Update automation scripts to use the public API to activate workflows individually instead of the CLI command',
				},
				{
					action: 'Review deployment scripts',
					description:
						'Check any deployment or automation scripts that may have used the CLI command to activate all workflows and update them accordingly',
				},
			],
		};

		return result;
	}
}
