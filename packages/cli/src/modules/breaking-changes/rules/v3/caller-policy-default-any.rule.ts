import { GlobalConfig } from '@n8n/config';
import { BreakingChangeRule } from '@n8n/decorators';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

export const REMOVED_CALLER_POLICY = 'any';

/**
 * The instance-wide default, which every workflow that stores no caller policy of its own falls
 * back to. Reported once rather than once per workflow, because the whole instance is fixed by
 * changing one environment variable.
 */
@BreakingChangeRule({ version: 'v3' })
export class CallerPolicyDefaultAnyRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id = 'caller-policy-default-any-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Instance default caller policy is the removed "Any workflow"',
			description:
				'N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION is set to "any", which version 3 removes. Every workflow without its own caller policy falls back to it. Set a supported value before upgrading. Workflows that set the policy themselves are listed under workflow issues.',
			category: BreakingChangeCategory.instance,
			severity: 'medium',
			documentationUrl:
				'https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/workflows',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detect(): Promise<InstanceDetectionReport> {
		// Widened to string: v3 drops 'any' from the union, but the variable can still be set to it.
		const defaultPolicy: string = this.globalConfig.workflows.callerPolicyDefaultOption;

		if (defaultPolicy !== REMOVED_CALLER_POLICY) {
			return { isAffected: false, instanceIssues: [], recommendations: [] };
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION is set to "any"',
					description:
						'Version 3 rejects this value and falls back to "workflowsFromSameOwner", so cross-project sub-workflow calls that rely on the default will start failing.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Set a supported default before upgrading',
					description:
						'Change N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION to "workflowsFromSameOwner", "workflowsFromAList" or "none". Doing it before the upgrade means the new default takes effect at a time you choose, rather than during the version bump. Workflows that need to be callable from another project can set "Selected workflows" individually.',
				},
				{
					action: 'Check the workflow issues as well',
					description:
						'Saving a workflow\'s settings writes the instance default into that workflow, so on this instance workflows accumulate a stored "any" over time through ordinary editing. Those are not covered by the variable change and are listed under workflow issues.',
				},
			],
		};
	}
}
