import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class TunnelOptionRule implements IBreakingChangeInstanceRule {
	id: string = 'tunnel-option-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove n8n --tunnel option',
			description: 'The --tunnel CLI option has been removed and will be ignored',
			category: BreakingChangeCategory.instance,
			severity: 'low',
			documentationUrl: 'https://docs.n8n.io/2-0-breaking-changes/#remove-n8n-tunnel-option',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: '--tunnel option removed',
					description:
						'The --tunnel CLI option is no longer available. If you were using this feature, calls with the --tunnel flag will ignore the flag and not run the tunnel system.',
					level: 'info',
				},
			],
			recommendations: [],
		};

		return result;
	}
}
