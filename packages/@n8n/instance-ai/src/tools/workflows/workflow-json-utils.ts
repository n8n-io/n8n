import { isRecord } from '@n8n/utils/is-record';
import { findPlaceholderDetails, isPlaceholderString } from '@n8n/utils/placeholder';
import type { IDataObject, WorkflowJSON } from '@n8n/workflow-sdk';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	isTriggerNodeType as isCanonicalTriggerNodeType,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { InstanceAiContext } from '../../types';

/**
 * Trigger types whose verification input is shaped deterministically by the
 * CLI adapter's `getPinDataForTrigger` switch instead of a generated fixture.
 * Must stay in lockstep with that switch (instance-ai-run-pin-data.ts).
 */
const KNOWN_MOCKABLE_TRIGGER_TYPES = new Set([
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
]);

const WEBHOOK_NODE_TYPES = new Set([
	WEBHOOK_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
]);

export function isMockableTriggerNodeType(nodeType: string | undefined): boolean {
	return nodeType !== undefined && KNOWN_MOCKABLE_TRIGGER_TYPES.has(nodeType);
}

/**
 * Delegates to n8n-workflow's canonical trigger detection, which covers types
 * without a "trigger" suffix (webhook, cron, emailReadImap, start, …) that a
 * local suffix heuristic would miss.
 */
export function isTriggerNodeType(nodeType: string | undefined): boolean {
	if (!nodeType) return false;
	return isCanonicalTriggerNodeType(nodeType);
}

/** Mid-flow node types that park the execution until an external resume. */
const WAIT_GATE_NODE_TYPES = new Set(['n8n-nodes-base.wait', 'n8n-nodes-base.form']);

/** Shared operation name of the send-and-wait resource operations (Gmail, Slack, …). */
const SEND_AND_WAIT_OPERATION = 'sendAndWait';

/** True for nodes that pause a live execution until a human responds. */
export function isWaitGateNode(node: WorkflowJSON['nodes'][number]): boolean {
	if (WAIT_GATE_NODE_TYPES.has(node.type)) return true;
	const parameters = isRecord(node.parameters) ? node.parameters : {};
	return parameters.operation === SEND_AND_WAIT_OPERATION;
}

/**
 * True when `nodeName` can reach itself by following outgoing connections of
 * any type. Disabled nodes still forward data, so they stay in the walk.
 */
export function nodeCanReachItself(json: WorkflowJSON, nodeName: string): boolean {
	const adjacency = new Map<string, string[]>();
	for (const [sourceName, connectionsByType] of Object.entries(json.connections ?? {})) {
		if (!isRecord(connectionsByType)) continue;
		const targets: string[] = [];
		for (const groups of Object.values(connectionsByType)) {
			if (!Array.isArray(groups)) continue;
			for (const group of groups) {
				if (!Array.isArray(group)) continue;
				for (const connection of group) {
					if (isRecord(connection) && typeof connection.node === 'string') {
						targets.push(connection.node);
					}
				}
			}
		}
		adjacency.set(sourceName, targets);
	}

	const queue = [...(adjacency.get(nodeName) ?? [])];
	const visited = new Set<string>();
	while (queue.length > 0) {
		const current = queue.pop();
		if (current === undefined) break;
		if (current === nodeName) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		queue.push(...(adjacency.get(current) ?? []));
	}
	return false;
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
 * Guarantee every node carries a distinct ID before the workflow is saved.
 *
 * `(workflowId, nodeId)` is the primary key behind poll cursors, dedupe records and
 * publication status, so two nodes sharing an ID contend over the same durable state.
 * The SDK build rejects declared duplicates up front, but a WorkflowJSON source file
 * skips SDK validation entirely — this is the backstop for that path.
 *
 * The first node to claim an ID keeps it; a node with a duplicate, blank or missing ID gets a
 * fresh one. Group membership is then remapped by occurrence, so nodes that arrived sharing an
 * ID do not collapse onto one replacement, and a blank ID — which no node retains — is rewritten
 * rather than left dangling in the group.
 */
export function ensureUniqueNodeIds(json: WorkflowJSON): void {
	if (!json.nodes?.length) return;

	const claimedIds = new Set<string>();
	// Final ID of every node that started with one, in node order, keyed by that starting ID.
	// A duplicated ID yields [kept, replacement, …]; a blank ID yields [replacement, …] because
	// no node retains it. Recording the outcome for every node — rather than only the
	// reassigned ones — means group membership is remapped by position with no special case
	// for whether the original survived.
	const finalIdsByOriginalId = new Map<string, string[]>();
	let reassignedAny = false;

	const recordOutcome = (originalId: string, finalId: string) => {
		const outcomes = finalIdsByOriginalId.get(originalId);
		if (outcomes) outcomes.push(finalId);
		else finalIdsByOriginalId.set(originalId, [finalId]);
	};

	for (const node of json.nodes) {
		// `undefined` cannot appear in a group's membership; a blank string can.
		const originalId = typeof node.id === 'string' ? node.id : undefined;

		if (node.id && !claimedIds.has(node.id)) {
			claimedIds.add(node.id);
			if (originalId !== undefined) recordOutcome(originalId, node.id);
			continue;
		}

		let nextId = randomUUID();
		while (claimedIds.has(nextId)) nextId = randomUUID();

		claimedIds.add(nextId);
		node.id = nextId;
		reassignedAny = true;
		if (originalId !== undefined) recordOutcome(originalId, nextId);
	}

	if (!reassignedAny) return;

	for (const group of json.nodeGroups ?? []) {
		const seenCounts = new Map<string, number>();
		group.nodeIds = group.nodeIds.map((nodeId) => {
			const outcomes = finalIdsByOriginalId.get(nodeId);
			if (!outcomes) return nodeId;

			const occurrence = seenCounts.get(nodeId) ?? 0;
			seenCounts.set(nodeId, occurrence + 1);
			return outcomes[occurrence] ?? nodeId;
		});
	}
}

/**
 * True when an update kept none of the saved workflow's node IDs.
 *
 * Node identity is carried through the `id` values in the generated source, so a rewrite
 * that drops them re-identifies the whole graph: execution-log pairing, poll cursors and
 * dedupe state reset, and the version diff shows every node as deleted and re-added. That
 * is worth reporting, but it is also legitimate when a workflow really was replaced
 * wholesale — hence informational only, never a blocked save.
 *
 * Never throws: a signal must not be able to fail a build.
 */
export async function hasLostAllSavedNodeIds(
	json: WorkflowJSON,
	workflowId: string | undefined,
	ctx: InstanceAiContext,
): Promise<boolean> {
	if (!workflowId || !json.nodes?.length) return false;

	let savedIds: Set<string>;
	try {
		const existing = await ctx.workflowService.getAsWorkflowJSON(workflowId);
		savedIds = new Set((existing.nodes ?? []).map((node) => node.id).filter(Boolean));
	} catch {
		return false;
	}

	if (savedIds.size === 0) return false;

	return json.nodes.every((node) => !node.id || !savedIds.has(node.id));
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
