import type { DocPageKind, DocPageSummary } from '@n8n/api-types';

const API_TRIGGERS = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.formTrigger']);
const AGENT_TRIGGERS = new Set(['@n8n/n8n-nodes-langchain.chatTrigger']);
const SCHEDULE_TRIGGERS = new Set(['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.cron']);
const IGNORED_TRIGGERS = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
]);

/**
 * Same rules as the backend `detectKind`, in priority order.
 * `isTrigger` tells if a node type is a trigger. It is only used for the `event` kind.
 */
export function detectDocPageKind(
	nodeTypes: string[],
	isTrigger: (nodeType: string) => boolean,
): DocPageKind | null {
	if (nodeTypes.some((t) => API_TRIGGERS.has(t))) return 'api';
	if (nodeTypes.some((t) => AGENT_TRIGGERS.has(t))) return 'agent';
	if (nodeTypes.some((t) => SCHEDULE_TRIGGERS.has(t))) return 'schedule';
	if (nodeTypes.some((t) => !IGNORED_TRIGGERS.has(t) && isTrigger(t))) return 'event';
	return null;
}

/** The order of the groups in the project Docs tab. */
export const DOC_KIND_ORDER: DocPageKind[] = ['api', 'schedule', 'event', 'agent'];

export function groupByKind(items: DocPageSummary[]) {
	return DOC_KIND_ORDER.map((kind) => ({
		kind,
		items: items.filter((item) => item.kind === kind).sort((a, b) => a.name.localeCompare(b.name)),
	})).filter((group) => group.items.length > 0);
}
