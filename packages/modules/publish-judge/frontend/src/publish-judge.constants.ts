import type { Scope } from '@n8n/permissions';

export const PUBLISH_JUDGE_SETTINGS_VIEW = 'publish-judge-settings';

/** Prototype: reuses the node type policy scope until the feature has a scope of its own. */
export const PUBLISH_JUDGE_MANAGE_SCOPE: Scope = 'nodeTypePolicy:manage';

/** The Judge Trigger, and the trigger that judges used before it existed. */
export const JUDGE_TRIGGER_NODE_TYPES = [
	'n8n-nodes-base.judgeTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
];

/** Route name of the Policies settings page of the shell, which links to the judges page. */
export const POLICIES_SETTINGS_VIEW = 'SecuritySettings';
