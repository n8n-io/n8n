import type { NodeGroupRuleOptions } from 'n8n-workflow';

/** The group rules a user outside both rollouts gets. */
export const NO_RULES_RELAXED: Required<NodeGroupRuleOptions> = {
	allowTriggerInGroup: false,
	allowMultipleBoundaryNodes: false,
};

/** The group rules a user inside both rollouts gets. */
export const ALL_RULES_RELAXED: Required<NodeGroupRuleOptions> = {
	allowTriggerInGroup: true,
	allowMultipleBoundaryNodes: true,
};
