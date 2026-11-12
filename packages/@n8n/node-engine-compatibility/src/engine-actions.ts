/**
 * Maps the v1 sub-node protocol (`EngineRequest` / `EngineResponse`) to engine
 * actions and back (ADR-20261109-steps-declare-actions-that-the-engine-runs-as-steps).
 * Knows no AI library: it copies what the node wrote without reading it.
 */

import type {
	ActionContinuation,
	ActionDeclaration,
	ActionOutcome,
	ActionsDeclaration,
	JsonValue,
	WorkflowGraph,
} from '@n8n/engine';
import type {
	EngineRequest,
	EngineResponse,
	INodeExecutionData,
	ITaskData,
	NodeConnectionType,
} from 'n8n-workflow';
import { isNodeConnectionType, NodeConnectionTypes, WorkflowOperationError } from 'n8n-workflow';

import { UnknownActionTargetError } from './errors';
import { isJsonObject, isRecord } from './guards';
import { fromStepInputs } from './io';

/** What the shim stores in the opaque metadata of an action, to rebuild the v1 action. */
interface V1ActionMetadata {
	/** The v1 connection type of the action, for example `ai_tool`. */
	type: NodeConnectionType;
	/** The node's own action metadata, JSON round-tripped. */
	actionMetadata: JsonValue;
}

type V1Action = EngineRequest['actions'][number];
type V1ActionResponse = EngineResponse['actionResponses'][number];

export function isEngineRequest(value: unknown): value is EngineRequest {
	return isRecord(value) && Array.isArray(value.actions);
}

/**
 * The engine stores payloads and actions as JSON. A node can put class
 * instances into its metadata, for example LangChain messages. They arrive
 * in their `toJSON` form in the next round.
 */
function toJsonValue(value: unknown): JsonValue {
	if (value === undefined) return null;
	// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify -- deepCopy keeps `undefined` and does not recurse into `toJSON` results
	const json: JsonValue = JSON.parse(JSON.stringify(value));
	return json;
}

function itemIndexOf(action: V1Action): number {
	const { metadata } = action;
	if (isRecord(metadata) && typeof metadata.itemIndex === 'number') return metadata.itemIndex;
	return 0;
}

export function toActionsDeclaration(
	request: EngineRequest,
	graph: WorkflowGraph,
): ActionsDeclaration {
	const nodeIdsByName = new Map(graph.nodes.map((node) => [node.name, node.id]));

	const actions = request.actions.map((action): ActionDeclaration => {
		const targetNodeId = nodeIdsByName.get(action.nodeName);
		if (targetNodeId === undefined) throw new UnknownActionTargetError(action.nodeName);

		const metadata: V1ActionMetadata = {
			type: action.type,
			actionMetadata: toJsonValue(action.metadata),
		};
		return {
			targetNodeId,
			callId: action.id,
			itemIndex: itemIndexOf(action),
			arguments: toJsonValue(action.input),
			metadata: toJsonValue(metadata),
		};
	});

	// SPIKE: an EngineRequest without actions reaches the engine as is, and the
	// engine fails the step. Agent V3 sends one when the LLM calls a tool name
	// that no tool has. v1 runs the node again in that case.
	return { actions, payload: toJsonValue(request.metadata) };
}

function decodeMetadata(metadata: JsonValue): V1ActionMetadata {
	if (isRecord(metadata) && isNodeConnectionType(metadata.type)) {
		return { type: metadata.type, actionMetadata: metadata.actionMetadata ?? null };
	}
	return { type: NodeConnectionTypes.AiTool, actionMetadata: null };
}

/**
 * The run data of one action, as v1 records it for a tool node: the output
 * under the connection type of the action. A failed action carries its error
 * as an item, as v1 does for a tool that fails (D7).
 */
function toTaskData(type: NodeConnectionType, outcome: ActionOutcome): ITaskData {
	const base = { startTime: 0, executionTime: 0, executionIndex: 0, source: [] };

	if (outcome.status === 'completed') {
		return {
			...base,
			executionStatus: 'success',
			data: { [type]: fromStepInputs(outcome.outputs) },
		};
	}

	const errorItems: INodeExecutionData[][] = [[{ json: { error: outcome.error.message } }]];
	// SPIKE: the error class of the spawned step is lost. Agent V3 reads only the message.
	return {
		...base,
		executionStatus: 'error',
		data: { [type]: errorItems },
		error: new WorkflowOperationError(outcome.error.message),
	};
}

/**
 * The `EngineResponse` that v1 hands a node when it runs again after its
 * actions: the payload of the last round, and the results of the last round's
 * actions in declared order. Earlier rounds are left out, as in v1. The node
 * carries what it needs from them in its payload.
 */
export function toEngineResponse(
	continuation: ActionContinuation,
	graph: WorkflowGraph,
): EngineResponse {
	const lastRound = continuation.rounds.at(-1);
	if (!lastRound) return { actionResponses: [], metadata: {} };

	const namesById = new Map(graph.nodes.map((node) => [node.id, node.name]));

	return {
		metadata: lastRound.payload,
		actionResponses: lastRound.actions.map((action) => {
			const { type, actionMetadata } = decodeMetadata(action.metadata);
			const v1Action: V1ActionResponse['action'] = {
				actionType: 'ExecutionNodeAction',
				nodeName: namesById.get(action.targetNodeId) ?? action.targetNodeId,
				input: isJsonObject(action.arguments) ? action.arguments : {},
				type,
				id: action.callId,
				metadata: actionMetadata,
			};
			return { action: v1Action, data: toTaskData(type, action.outcome) };
		}),
	};
}
