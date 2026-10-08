import type { AutomationTriggerKind } from '@n8n/api-types';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CRON_NODE_TYPE,
	ERROR_TRIGGER_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	isTriggerNodeType,
	MANUAL_TRIGGER_NODE_TYPES,
	MCP_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

/** The fields of a workflow node that the classification reads. */
export type AutomationNode = { name: string; type: string; disabled?: boolean };

export type AutomationTrigger = {
	kind: AutomationTriggerKind;
	/** The node that starts the workflow. Absent when the workflow has no trigger. */
	node?: { name: string; type: string };
	/** False when only a person can start the workflow, so turning it on does nothing. */
	canActivate: boolean;
};

// n8n-workflow does not export these legacy node types.
const LEGACY_INTERVAL_NODE_TYPE = 'n8n-nodes-base.interval';
const LEGACY_START_NODE_TYPE = 'n8n-nodes-base.start';

const KIND_BY_NODE_TYPE: ReadonlyMap<string, AutomationTriggerKind> = new Map([
	[SCHEDULE_TRIGGER_NODE_TYPE, 'schedule'],
	[CRON_NODE_TYPE, 'schedule'],
	[LEGACY_INTERVAL_NODE_TYPE, 'schedule'],
	[WEBHOOK_NODE_TYPE, 'webhook'],
	[MCP_TRIGGER_NODE_TYPE, 'webhook'],
	[FORM_TRIGGER_NODE_TYPE, 'form'],
	[CHAT_TRIGGER_NODE_TYPE, 'chat'],
	[LEGACY_START_NODE_TYPE, 'manual'],
	...MANUAL_TRIGGER_NODE_TYPES.map((type): [string, AutomationTriggerKind] => [type, 'manual']),
]);

/**
 * These triggers run only when n8n calls the workflow (from another workflow, after an error or
 * for an evaluation). Activation does not count them, so they cannot start an automation.
 */
const CALLED_BY_N8N_NODE_TYPES: ReadonlySet<string> = new Set([
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	ERROR_TRIGGER_NODE_TYPE,
	EVALUATION_TRIGGER_NODE_TYPE,
]);

/** The trigger kind of a node type, or undefined for a node that cannot start an automation. */
export function triggerKindOf(nodeType: string): AutomationTriggerKind | undefined {
	const known = KIND_BY_NODE_TYPE.get(nodeType);
	if (known !== undefined) return known;
	if (CALLED_BY_N8N_NODE_TYPES.has(nodeType) || !isTriggerNodeType(nodeType)) return undefined;
	// App triggers follow the "<app>Trigger" naming rule. Older polling nodes do not.
	return nodeType.endsWith('Trigger') ? 'app-event' : 'other';
}

/** True for a node type that starts the workflow on its own when the workflow is active. */
export function canStartAutomation(nodeType: string): boolean {
	const kind = triggerKindOf(nodeType);
	return kind !== undefined && kind !== 'manual';
}

/**
 * Finds what starts the workflow. The first enabled trigger that is not manual wins, because it
 * is the one that runs the automation. Disabled nodes cannot start a run, so they do not count.
 */
export function classifyAutomationTrigger(nodes: readonly AutomationNode[]): AutomationTrigger {
	let manual: AutomationNode | undefined;
	for (const node of nodes) {
		if (node.disabled === true) continue;
		const kind = triggerKindOf(node.type);
		if (kind === undefined) continue;
		if (kind !== 'manual') {
			return { kind, node: { name: node.name, type: node.type }, canActivate: true };
		}
		manual ??= node;
	}
	if (!manual) return { kind: 'manual', canActivate: false };
	return { kind: 'manual', node: { name: manual.name, type: manual.type }, canActivate: false };
}
