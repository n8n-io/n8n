import { GlobalConfig } from '@n8n/config';
import { BreakingChangeRule } from '@n8n/decorators';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class SsrfDefaultBlockedRangesRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id: string = 'ssrf-default-blocked-ranges-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'SSRF protection blocks more IP ranges by default',
			description:
				'The built-in blocked IP ranges expand to include the shared address space (100.64.0.0/10) and IPv6 transition ranges. Only the default list changes. You can allow the hosts you need, or keep the current list.',
			category: BreakingChangeCategory.environment,
			impact: 'executionsMightFail',
			documentationUrl:
				'https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/security',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detect(): Promise<InstanceDetectionReport> {
		// Instances that enumerate literal ranges do not pick up the expanded built-in list.
		const ranges = process.env.N8N_SSRF_BLOCKED_IP_RANGES;
		const usesDefaultList =
			ranges === undefined ||
			ranges
				.toLowerCase()
				.split(',')
				.some((r) => r.trim() === 'default');

		if (!this.globalConfig.ssrfProtection.enabled || !usesDefaultList) {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'SSRF protection uses the built-in blocked IP ranges',
					description:
						'N8N_SSRF_PROTECTION_ENABLED is true and N8N_SSRF_BLOCKED_IP_RANGES relies on the built-in list, either because it is not set or because it contains the `default` keyword. After the update, that list also covers 100.64.0.0/10 and IPv6 transition ranges. Workflows that call hosts in these ranges fail unless you allow them.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Allow internal hosts in the newly blocked ranges',
					description:
						'If no workflow calls hosts in 100.64.0.0/10 or IPv6 transition ranges, you do not need to do anything. If a workflow does, add those hosts to N8N_SSRF_ALLOWED_IP_RANGES or N8N_SSRF_ALLOWED_HOSTNAMES. To keep the current list exactly, set N8N_SSRF_BLOCKED_IP_RANGES to the literal ranges. The `default` keyword always expands to the built-in list of the running version.',
				},
			],
		};
	}
}
