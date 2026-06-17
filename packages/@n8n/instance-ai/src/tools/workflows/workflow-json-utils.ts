import type { WorkflowJSON } from '@n8n/workflow-sdk';

const KNOWN_MOCKABLE_TRIGGER_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isMockableTriggerNodeType(nodeType: string | undefined): boolean {
	return nodeType !== undefined && KNOWN_MOCKABLE_TRIGGER_TYPES.has(nodeType);
}

export function isTriggerNodeType(nodeType: string | undefined): boolean {
	if (!nodeType) return false;
	if (isMockableTriggerNodeType(nodeType)) return true;
	return nodeType.endsWith('Trigger') || nodeType.endsWith('trigger');
}

function extractWorkflowIdParameter(value: unknown): string | undefined {
	const rawValue = isRecord(value) ? value.value : value;
	if (typeof rawValue !== 'string') return undefined;

	const workflowId = rawValue.trim();
	if (workflowId === '' || workflowId.startsWith('=')) return undefined;

	return workflowId;
}

function shouldSkipReferencedWorkflow(source: unknown): boolean {
	return typeof source === 'string' && source !== 'database';
}

export function getReferencedWorkflowIds(json: WorkflowJSON): string[] {
	const referencedWorkflowIds: string[] = [];
	const seen = new Set<string>();

	for (const node of json.nodes ?? []) {
		if (node.disabled || node.type !== 'n8n-nodes-base.executeWorkflow') continue;
		const parameters = isRecord(node.parameters) ? node.parameters : {};
		if (shouldSkipReferencedWorkflow(parameters.source)) continue;

		const workflowId = extractWorkflowIdParameter(parameters.workflowId);
		if (!workflowId || seen.has(workflowId)) continue;

		seen.add(workflowId);
		referencedWorkflowIds.push(workflowId);
	}

	return referencedWorkflowIds;
}
