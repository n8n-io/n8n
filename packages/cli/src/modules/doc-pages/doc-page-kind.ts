import type { DocPageKind } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

const API_TYPES = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.formTrigger']);
const AGENT_TYPES = new Set(['@n8n/n8n-nodes-langchain.chatTrigger']);
const SCHEDULE_TYPES = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.cron']);
const NOT_ENTRY_POINTS = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
]);
// Trigger nodes whose type name does not end in "Trigger".
const OTHER_TRIGGER_TYPES = new Set([
	...API_TYPES,
	'n8n-nodes-base.cron',
	'n8n-nodes-base.interval',
	'n8n-nodes-base.emailReadImap',
]);

// ponytail: name-based trigger check, so it works without loaded node types.
// Switch to `NodeTypes` and `description.group` if a trigger is missed.
function isTrigger(type: string) {
	return /trigger$/i.test(type) || OTHER_TRIGGER_TYPES.has(type);
}

/** The page template for a workflow, from its enabled trigger nodes. `null` means no page. */
export function detectKind(nodes: Array<Pick<INode, 'type' | 'disabled'>>): DocPageKind | null {
	const types = nodes
		.filter((node) => !node.disabled && isTrigger(node.type) && !NOT_ENTRY_POINTS.has(node.type))
		.map((node) => node.type);

	if (types.some((type) => API_TYPES.has(type))) return 'api';
	if (types.some((type) => AGENT_TYPES.has(type))) return 'agent';
	if (types.some((type) => SCHEDULE_TYPES.has(type))) return 'schedule';
	if (types.length > 0) return 'event';
	return null;
}
