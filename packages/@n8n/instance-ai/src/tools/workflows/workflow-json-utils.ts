import { findPlaceholderDetails, isPlaceholderString, isRecord } from '@n8n/utils';
import type { IDataObject, WorkflowJSON } from '@n8n/workflow-sdk';
import { randomUUID } from 'node:crypto';

import type { InstanceAiContext } from '../../types';

const KNOWN_MOCKABLE_TRIGGER_TYPES = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
]);

const WEBHOOK_NODE_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
]);

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

/**
 * Ensure webhook nodes have a webhookId so n8n registers clean URL paths.
 * For updates, preserve existing webhookIds by node name so URLs remain stable.
 */
export async function ensureWebhookIds(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<void> {
	const existingWebhookIds = new Map<string, string>();
	if (workflowId) {
		try {
			const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
			for (const node of existing.nodes ?? []) {
				if (node.webhookId && node.name) {
					existingWebhookIds.set(node.name, node.webhookId);
				}
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to load existing workflow ${workflowId} to preserve webhook IDs: ${message}`,
				{ cause: error },
			);
		}
	}

	for (const node of json.nodes ?? []) {
		if (WEBHOOK_NODE_TYPES.has(node.type) && !node.webhookId) {
			node.webhookId = (node.name && existingWebhookIds.get(node.name)) ?? randomUUID();
		}
	}
}

/**
 * For updates, preserve existing node-group IDs by group name. The sandbox SDK
 * build has no view of the saved workflow, so toJSON() mints a fresh deterministic
 * ID for every group — overwriting the stable ID of a group the user created in
 * the editor. Reconciling by name here keeps it stable, mirroring ensureWebhookIds.
 */
export async function preserveExistingNodeGroupIds(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<void> {
	if (!workflowId || !json.nodeGroups?.length) return;

	let existingGroupIdsByName: Map<string, string>;
	try {
		const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
		existingGroupIdsByName = new Map(
			(existing.nodeGroups ?? []).map((group): [string, string] => [group.name, group.id]),
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Failed to load existing workflow ${workflowId} to preserve node-group IDs: ${message}`,
			{ cause: error },
		);
	}

	for (const group of json.nodeGroups) {
		const existingId = existingGroupIdsByName.get(group.name);
		if (existingId) {
			group.id = existingId;
		}
	}
}

type WorkflowParameterValue = IDataObject[string];

function isDataObject(value: WorkflowParameterValue): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isWorkflowParameterArray(
	value: WorkflowParameterValue,
): value is WorkflowParameterValue[] {
	return Array.isArray(value);
}

function cloneWorkflowValue(value: WorkflowParameterValue): WorkflowParameterValue {
	if (isWorkflowParameterArray(value)) return value.map(cloneWorkflowValue);
	if (!isDataObject(value)) return value;

	const cloned: IDataObject = {};
	for (const key of Object.keys(value)) {
		cloned[key] = cloneWorkflowValue(value[key]);
	}
	return cloned;
}

function isResourceLocator(value: WorkflowParameterValue): value is IDataObject {
	return isDataObject(value) && value.__rl === true;
}

function isEmptyResourceLocator(value: WorkflowParameterValue): boolean {
	if (!isResourceLocator(value)) return false;
	const locatorValue = value.value;
	return (
		locatorValue === undefined || (typeof locatorValue === 'string' && locatorValue.trim() === '')
	);
}

function hasUnresolvedSetupValue(value: WorkflowParameterValue): boolean {
	if (findPlaceholderDetails(value).length > 0) return true;
	if (isEmptyResourceLocator(value)) return true;
	if (isWorkflowParameterArray(value)) return value.some(hasUnresolvedSetupValue);
	if (isDataObject(value)) return Object.values(value).some(hasUnresolvedSetupValue);
	return false;
}

function preserveSetupValue(
	nextValue: WorkflowParameterValue,
	existingValue: WorkflowParameterValue,
): WorkflowParameterValue {
	if (!hasUnresolvedSetupValue(nextValue)) return nextValue;
	if (existingValue === undefined || hasUnresolvedSetupValue(existingValue)) return nextValue;

	if (typeof nextValue === 'string') {
		return isPlaceholderString(nextValue) ? cloneWorkflowValue(existingValue) : nextValue;
	}

	if (isResourceLocator(nextValue)) {
		return isResourceLocator(existingValue) ? cloneWorkflowValue(existingValue) : nextValue;
	}

	if (isWorkflowParameterArray(nextValue)) {
		if (!isWorkflowParameterArray(existingValue)) return nextValue;

		return nextValue.map((item, index) => preserveSetupValue(item, existingValue[index]));
	}

	if (isDataObject(nextValue)) {
		if (!isDataObject(existingValue)) return nextValue;

		const preserved: IDataObject = {};
		for (const key of Object.keys(nextValue)) {
			preserved[key] = preserveSetupValue(nextValue[key], existingValue[key]);
		}
		return preserved;
	}

	return nextValue;
}

function preserveParameterValues(
	nextParameters: IDataObject,
	existingParameters: IDataObject,
): IDataObject {
	const preserved: IDataObject = {};
	for (const key of Object.keys(nextParameters)) {
		preserved[key] = preserveSetupValue(nextParameters[key], existingParameters[key]);
	}
	return preserved;
}

/**
 * Preserve user-provided setup values when a source-file rebuild still contains
 * the same placeholder. The source file owns structure; the saved workflow owns
 * runtime setup collected through the setup card.
 */
export async function preserveExistingSetupValues(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<void> {
	if (!workflowId) return;

	let existing: WorkflowJSON;
	try {
		existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(
			`Failed to load existing workflow ${workflowId} to preserve setup values: ${message}`,
			{ cause: error },
		);
	}

	const existingNodesByNameAndType = new Map(
		(existing.nodes ?? [])
			.filter((node) => node.name && node.type)
			.map((node) => [`${node.type}:${node.name}`, node]),
	);

	for (const node of json.nodes ?? []) {
		if (!node.name || !node.type || !node.parameters) continue;

		const existingNode = existingNodesByNameAndType.get(`${node.type}:${node.name}`);
		if (!existingNode?.parameters) continue;

		node.parameters = preserveParameterValues(node.parameters, existingNode.parameters);
	}
}
