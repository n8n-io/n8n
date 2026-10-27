import type { BreakingChangeAssistantAction } from '@n8n/api-types';

import type { WorkflowLevelRule } from './types';

/** What n8n Assistant can do with a rule's findings: what the rule declares, or `none`. */
export function assistantActionOf(rule: WorkflowLevelRule): BreakingChangeAssistantAction {
	return rule.getMetadata().assistant ?? 'none';
}
