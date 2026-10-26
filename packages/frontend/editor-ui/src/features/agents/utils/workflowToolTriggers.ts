import type { SUPPORTED_WORKFLOW_TOOL_TRIGGERS } from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

/** Locale key of each supported trigger's display name, keyed by node type so a rename is a one-key change. */
const TRIGGER_LABEL_KEYS: Record<(typeof SUPPORTED_WORKFLOW_TOOL_TRIGGERS)[number], BaseTextKey> = {
	[EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE]: 'nodeCreator.aiPanel.workflowTriggerDisplayName',
};

/** Display name of the trigger a workflow tool has to start with, for the `{trigger}` placeholder. */
export function workflowToolTriggerLabel(): string {
	return useI18n().baseText(TRIGGER_LABEL_KEYS[EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE]);
}
