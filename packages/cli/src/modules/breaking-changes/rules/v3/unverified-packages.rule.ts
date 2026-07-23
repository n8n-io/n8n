import { BreakingChangeRule } from '@n8n/decorators';

import { CommunityPackagesConfig } from '../../../community-packages/community-packages.config';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class UnverifiedPackagesRule implements IBreakingChangeInstanceRule {
	constructor(private readonly communityPackagesConfig: CommunityPackagesConfig) {}

	id: string = 'unverified-packages-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Unverified community packages are disabled by default',
			description:
				'The default of N8N_UNVERIFIED_PACKAGES_ENABLED changes to false. Installed community packages that are not verified by n8n will stop loading unless the variable is explicitly set to true.',
			category: BreakingChangeCategory.environment,
			severity: 'medium',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const isAffected =
			this.communityPackagesConfig.enabled &&
			process.env.N8N_UNVERIFIED_PACKAGES_ENABLED === undefined;

		if (!isAffected) return { isAffected: false, instanceIssues: [], recommendations: [] };

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Instance relies on the current default for unverified packages',
					description:
						'N8N_UNVERIFIED_PACKAGES_ENABLED is not set, so this instance currently allows unverified community packages. After the update, workflows using nodes from unverified packages will fail to load them.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Set N8N_UNVERIFIED_PACKAGES_ENABLED explicitly',
					description:
						'Review your installed community packages. If any are unverified and you want to keep using them, set N8N_UNVERIFIED_PACKAGES_ENABLED=true before updating.',
				},
			],
		};
	}
}
