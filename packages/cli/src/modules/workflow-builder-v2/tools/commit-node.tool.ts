import { Tool } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import {
	NodeConnectionTypes,
	type IConnections,
	type INode,
	type NodeConnectionType,
} from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import type { RunStateRegistry } from '../session/run-state-registry';
import type {
	ChatMessage,
	CommitResult,
	ConnectionContext,
	InsertionPoint,
	RunState,
	WorkflowJson,
} from '../session/session.types';
import {
	computeMissingFields,
	formatMissingFieldsForChat,
	type MissingFields,
} from '../utils/missing-fields';
import type { LookupNodeDescription } from '../utils/node-filter';
import { summarizeWorkflow } from '../utils/workflow-summary';

const insertionPointSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('fromStart') }),
	z.object({ kind: z.literal('after'), afterNodeId: z.string().min(1) }),
]);

function isNodeParameters(value: unknown): value is INode['parameters'] {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const inputSchema = z.object({
	nodeType: z.string().min(1),
	version: z.number().min(1),
	displayName: z.string().min(1),
	parameters: z.custom<INode['parameters']>(isNodeParameters).optional(),
	position: z.tuple([z.number(), z.number()]).optional(),
	insertionPoint: insertionPointSchema,
});

// Keep in sync with `GHOST_AFTER_OFFSET_X` in
// packages/frontend/editor-ui/src/features/builder-v2/composables/useBuilderV2DocSync.ts —
// when no explicit/picked position is supplied, the BE fallback should match
// the FE ghost placement so committed nodes never jump.
const NODE_SPACING_X = 220;

/** Minimal logger surface the tool uses — `console` satisfies it. */
type ToolLogger = {
	debug: (message: string, meta?: Record<string, unknown>) => void;
	warn: (message: string, meta?: Record<string, unknown>) => void;
};

export type CommitNodeInput = z.infer<typeof inputSchema>;

export type CommitNodeResult =
	| CommitResult
	| {
			error: string;
			reason?: string;
			hint?: string;
			missing?: string[];
			expected?: { nodeType: string; version: number };
	  };

export function createCommitNodeTool(
	registry: RunStateRegistry,
	sessionId: string,
	lookupNodeDescription: LookupNodeDescription,
	logger: ToolLogger = console,
): BuiltTool {
	return new Tool('commit_node')
		.description(
			'Commit a node to the workflow canvas. Call this after the user picks a candidate from `propose_nodes`. ' +
				'The committed parameters should match the parameters shown in the picked `propose_nodes` candidate. ' +
				'The node is appended to the workflow and (when `insertionPoint` is "after") wired from the named source node. ' +
				"After commit, the tool result surfaces which required parameters / credentials still need user input — don't try to refill those, the user will set them via the parameter panel.",
		)
		.input(inputSchema)
		.handler(async (input) => {
			return commitPendingNode({
				registry,
				sessionId,
				lookupNodeDescription,
				logger,
				input,
			});
		})
		.build();
}

export function commitPendingNode({
	registry,
	sessionId,
	lookupNodeDescription,
	logger = console,
	input,
}: {
	registry: RunStateRegistry;
	sessionId: string;
	lookupNodeDescription: LookupNodeDescription;
	logger?: ToolLogger;
	input: CommitNodeInput;
}): CommitNodeResult {
	const state = registry.require(sessionId);

	// 1a: Authorization gate. Only allow commits when a pick is pending,
	// and only for the exact node type/version the user picked.
	const pending = state.pendingCommit;
	if (!pending) {
		logger.debug('[builder-v2] commit_node — no pending pick', {
			sessionId,
			nodeType: input.nodeType,
		});
		return {
			error: 'no-pending-pick',
			reason:
				'`commit_node` can only be called after the user has picked a candidate ' +
				'via `propose_nodes`. Call `propose_nodes` first — even when only one ' +
				'candidate seems viable — and wait for the user to pick before committing.',
		};
	}
	if (pending.nodeType !== input.nodeType || pending.version !== input.version) {
		logger.debug('[builder-v2] commit_node — mismatched node', {
			sessionId,
			expectedType: pending.nodeType,
			expectedVersion: pending.version,
			gotType: input.nodeType,
			gotVersion: input.version,
		});
		return {
			error: 'commit-mismatch',
			reason:
				`You called commit_node with "${input.nodeType}@${input.version}" but the user ` +
				`picked "${pending.nodeType}@${pending.version}". Commit the node the user ` +
				'actually picked. If you want a different node, call `propose_nodes` again.',
			expected: { nodeType: pending.nodeType, version: pending.version },
		};
	}
	const parameters: INode['parameters'] = pending.parameters ?? input.parameters ?? {};

	const description = lookupNodeDescription(pending.nodeType, pending.version);
	if (!description) {
		logger.warn('[builder-v2] commit_node — unknown or invalid node', {
			sessionId,
			nodeType: pending.nodeType,
			version: pending.version,
		});
		return {
			error: 'unknown-or-invalid-node',
			reason:
				`"${pending.nodeType}@${pending.version}" is not installed or not a valid ` +
				'node version in this n8n instance. Call `verify_node`, then propose a valid node.',
		};
	}

	// Guardrail: if we know the schema and there ARE required params but
	// the agent supplied nothing, force it to call `get_node_schema`
	// first. Empty parameters when the node has none required is fine.
	const missingBeforeCommit = computeMissingFields(description, parameters);
	const hasRequiredKnown = missingBeforeCommit.params.length > 0;
	if (hasRequiredKnown && Object.keys(parameters).length === 0) {
		return {
			error: 'missing-required-params',
			missing: missingBeforeCommit.params.map((p) => p.path),
			hint:
				'You committed without supplying parameters but this node has required fields. ' +
				'Call `get_node_schema` first, then `commit_node` again with values inferred from the user prompt (use `null` for values you cannot infer — do not invent placeholders).',
		};
	}

	const insertionPoint = pending.insertionPoint;
	const pickedPosition = pending.position ?? state.pickedPosition;

	const workflow: WorkflowJson = {
		...state.workflow,
		nodes: [...state.workflow.nodes],
		connections: cloneConnections(state.workflow.connections),
	};

	const nodeId = randomUUID();
	const computedPosition = computePosition(
		pickedPosition,
		input.position,
		insertionPoint,
		workflow,
	);
	const node: INode = {
		id: nodeId,
		name: uniqueNodeName(pending.displayName, workflow.nodes),
		type: input.nodeType,
		typeVersion: input.version,
		position: computedPosition,
		parameters,
	};

	workflow.nodes.push(node);
	if (pending.connectionContext) {
		addContextConnection(workflow, node, pending.connectionContext);
	} else if (insertionPoint.kind === 'after') {
		const afterNodeId = insertionPoint.afterNodeId;
		const sourceNode = workflow.nodes.find((n) => n.id === afterNodeId);
		if (sourceNode) {
			addMainConnection(workflow.connections, sourceNode.name, node.name);
		}
	}

	// Compute missing params + credentials AFTER append, narrate, then
	// persist a single registry update so the next tool result sees the
	// fresh narrative line in the workflow summary.
	const missing: MissingFields = computeMissingFields(description, parameters);
	const chatLine = formatMissingFieldsForChat(node.name, missing);
	const newNarrative: ChatMessage[] = chatLine ? [{ role: 'assistant', content: chatLine }] : [];

	registry.update(sessionId, {
		workflow,
		pickedPosition: null,
		pendingCommit: null,
		narrative: [...state.narrative, ...newNarrative],
	});

	logger.debug('[builder-v2] commit_node — committed', {
		sessionId,
		nodeType: input.nodeType,
		nodeId,
		missingParams: missing.params.length,
		missingCredentials: missing.credentials.length,
	});

	const updated = registry.require(sessionId);
	return {
		nodeId,
		name: node.name,
		missing: {
			params: missing.params.map((p) => ({ path: p.path, displayName: p.displayName })),
			credentials: missing.credentials.map((c) => ({
				name: c.name,
				displayName: c.displayName,
			})),
		},
		workflowSummary: summarizeWorkflow(updated.workflow),
	};
}

function cloneConnections(connections: IConnections): IConnections {
	// Shallow clone is fine for POC — we only append.
	const out: IConnections = {};
	for (const [src, byType] of Object.entries(connections)) {
		out[src] = {};
		for (const [type, arr] of Object.entries(byType)) {
			out[src][type] = arr.map((slot) => (slot ? [...slot] : slot));
		}
	}
	return out;
}

function uniqueNodeName(base: string, nodes: INode[]): string {
	const taken = new Set(nodes.map((n) => n.name));
	if (!taken.has(base)) return base;
	let i = 1;
	while (taken.has(`${base} ${i}`)) i++;
	return `${base} ${i}`;
}

function computePosition(
	picked: RunState['pickedPosition'] | undefined,
	explicit: [number, number] | undefined,
	insertionPoint: InsertionPoint,
	workflow: WorkflowJson,
): [number, number] {
	// Precedence: FE-supplied picked position → tool input → spatial fallback.
	if (picked) return picked;
	if (explicit) return explicit;
	if (insertionPoint.kind === 'after') {
		const source = workflow.nodes.find((n) => n.id === insertionPoint.afterNodeId);
		if (source?.position) {
			return [source.position[0] + NODE_SPACING_X, source.position[1]];
		}
	}
	// Default: chain horizontally from origin based on count.
	const x = 250 + workflow.nodes.length * NODE_SPACING_X;
	return [x, 300];
}

function addMainConnection(
	connections: IConnections,
	sourceName: string,
	targetName: string,
): void {
	addConnection(connections, {
		sourceName,
		targetName,
		sourceType: NodeConnectionTypes.Main,
		sourceIndex: 0,
		targetType: NodeConnectionTypes.Main,
		targetIndex: 0,
	});
}

function addContextConnection(
	workflow: WorkflowJson,
	newNode: INode,
	context: ConnectionContext,
): void {
	const anchor = workflow.nodes.find((n) => n.id === context.nodeId);
	if (!anchor) return;

	const target = context.targetNodeId
		? workflow.nodes.find((n) => n.id === context.targetNodeId)
		: undefined;

	if (context.mode === 'outputs') {
		if (target) {
			removeConnection(workflow.connections, {
				sourceName: anchor.name,
				targetName: target.name,
				sourceType: context.type,
				sourceIndex: context.index,
				targetType: context.targetType ?? context.type,
				targetIndex: context.targetIndex ?? 0,
			});
		}

		addConnection(workflow.connections, {
			sourceName: anchor.name,
			targetName: newNode.name,
			sourceType: context.type,
			sourceIndex: context.index,
			targetType: context.type,
			targetIndex: 0,
		});

		if (target) {
			addConnection(workflow.connections, {
				sourceName: newNode.name,
				targetName: target.name,
				sourceType: context.targetType ?? context.type,
				sourceIndex: 0,
				targetType: context.targetType ?? context.type,
				targetIndex: context.targetIndex ?? 0,
			});
		}
		return;
	}

	addConnection(workflow.connections, {
		sourceName: newNode.name,
		targetName: anchor.name,
		sourceType: context.type,
		sourceIndex: 0,
		targetType: context.type,
		targetIndex: context.index,
	});
}

function addConnection(
	connections: IConnections,
	input: {
		sourceName: string;
		targetName: string;
		sourceType: NodeConnectionType;
		sourceIndex: number;
		targetType: NodeConnectionType;
		targetIndex: number;
	},
): void {
	const { sourceName, targetName, sourceType, sourceIndex, targetType, targetIndex } = input;
	connections[sourceName] ??= {};
	connections[sourceName][sourceType] ??= [];
	connections[sourceName][sourceType][sourceIndex] ??= [];
	const slot = connections[sourceName][sourceType][sourceIndex];
	if (slot) slot.push({ node: targetName, type: targetType, index: targetIndex });
}

function removeConnection(
	connections: IConnections,
	input: {
		sourceName: string;
		targetName: string;
		sourceType: NodeConnectionType;
		sourceIndex: number;
		targetType: NodeConnectionType;
		targetIndex: number;
	},
): void {
	const slot = connections[input.sourceName]?.[input.sourceType]?.[input.sourceIndex];
	if (!slot) return;
	connections[input.sourceName][input.sourceType][input.sourceIndex] = slot.filter(
		(connection) =>
			connection.node !== input.targetName ||
			connection.type !== input.targetType ||
			connection.index !== input.targetIndex,
	);
}
