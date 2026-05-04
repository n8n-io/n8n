// ---------------------------------------------------------------------------
// Normalize a captured WorkflowJSON (from instance-ai) into the SimpleWorkflow
// shape that ai-workflow-builder.ee's pairwise judges expect.
//
// The pairwise panel serializes the workflow to JSON text and feeds it to
// LLM judges, so formatting parity is load-bearing: any extra field — ids,
// timestamps, version metadata — can shift scores. This normalizer drops
// everything outside `{ name, nodes, connections }` and enforces key order.
//
// NOTE on types: WorkflowJSON from `@n8n/workflow-sdk` and SimpleWorkflow
// from `n8n-workflow` are structurally identical JSON but nominally
// distinct. We go through JSON.parse(JSON.stringify(...)) to strip the
// source nominal type and re-interpret the plain object as SimpleWorkflow.
// ---------------------------------------------------------------------------

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { deepCopy } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../../ai-workflow-builder.ee/evaluations/evaluators/pairwise';

type NodeRaw = WorkflowJSON['nodes'][number];

interface NormalizedNode {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
	parameters: Record<string, unknown>;
	credentials?: Record<string, { id?: string; name: string }>;
	webhookId?: string;
	disabled?: boolean;
	notes?: string;
	notesInFlow?: boolean;
	executeOnce?: boolean;
	retryOnFail?: boolean;
	alwaysOutputData?: boolean;
	onError?: string;
}

interface NormalizedShape {
	name: string;
	nodes: NormalizedNode[];
	connections: Record<string, unknown>;
}

export function normalizeWorkflow(raw: WorkflowJSON): SimpleWorkflow {
	const shape: NormalizedShape = {
		name: raw.name,
		nodes: raw.nodes.map(normalizeNode),
		connections: { ...raw.connections },
	};

	// JSON round-trip strips the nominal type from `@n8n/workflow-sdk`
	// so the plain object can be treated as `SimpleWorkflow` from
	// `n8n-workflow`. Runtime shape is identical.
	const plain: unknown = deepCopy(shape);
	return plain as SimpleWorkflow;
}

function normalizeNode(node: NodeRaw): NormalizedNode {
	const base: NormalizedNode = {
		id: node.id,
		name: node.name ?? node.id,
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position,
		parameters: toPlainObject(node.parameters),
	};

	if (node.credentials !== undefined) base.credentials = { ...node.credentials };
	if (node.webhookId !== undefined) base.webhookId = node.webhookId;
	if (node.disabled !== undefined) base.disabled = node.disabled;
	if (node.notes !== undefined) base.notes = node.notes;
	if (node.notesInFlow !== undefined) base.notesInFlow = node.notesInFlow;
	if (node.executeOnce !== undefined) base.executeOnce = node.executeOnce;
	if (node.retryOnFail !== undefined) base.retryOnFail = node.retryOnFail;
	if (node.alwaysOutputData !== undefined) base.alwaysOutputData = node.alwaysOutputData;
	if (node.onError !== undefined) base.onError = node.onError;

	return base;
}

function toPlainObject(value: unknown): Record<string, unknown> {
	if (!isPlainObject(value)) return {};
	return { ...value };
}

/**
 * Deterministic JSON serialization for byte-identical comparison across
 * builders. Sorts object keys recursively; arrays stay in their natural
 * order (workflow node order is semantic).
 */
export function serializeNormalizedWorkflow(workflow: SimpleWorkflow): string {
	return JSON.stringify(workflow, sortedReplacer, 2);
}

function sortedReplacer(_key: string, value: unknown): unknown {
	if (isPlainObject(value)) {
		const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
		return Object.fromEntries(entries);
	}
	return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
