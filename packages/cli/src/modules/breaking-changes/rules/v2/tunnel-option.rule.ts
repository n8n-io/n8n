import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class TunnelOptionRule implements IBreakingChangeInstanceRule {
	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'tunnel-option-v2',
			version: 'v2',
			title: 'Remove n8n --tunnel option',
			description: 'The --tunnel CLI option has been removed and will be ignored',
			category: BreakingChangeCategory.instance,
			severity: BreakingChangeSeverity.low,
		};
	}

	async detect(): Promise<InstanceDetectionResult> {
		const result: InstanceDetectionResult = {
			isAffected: true,
			instanceIssues: [
				{
					title: '--tunnel option removed',
					description:
						'The --tunnel CLI option is no longer available. If you were using this feature, calls with the --tunnel flag will ignore the flag and not run the tunnel system.',
					level: IssueLevel.info,
				},
			],
			recommendations: [],
		};

		return result;
	}
}
