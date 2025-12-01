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
			title: 'CLI command update:workflow replaced',
			description:
				'The CLI command update:workflow has been replaced with publish:workflow and unpublish:workflow for better clarity.',
			category: BreakingChangeCategory.instance,
			severity: 'low',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#replace-cli-command-updateworkflow',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'CLI command update:workflow replaced',
					description:
						'The CLI command update:workflow has been replaced with publish:workflow and unpublish:workflow. If you were using this command in scripts or automation, you will need to update your approach.',
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
