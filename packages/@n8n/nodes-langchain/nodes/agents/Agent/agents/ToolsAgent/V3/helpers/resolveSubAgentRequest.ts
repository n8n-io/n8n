import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import type { RequestResponseMetadata, ToolMetadata } from '@utils/agent-execution';
import type {
	EngineRequest,
	EngineResponse,
	ExecuteNodeResult,
	IDataObject,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
	ITaskData,
} from 'n8n-workflow';
import { NodeOperationError, UserError } from 'n8n-workflow';

import { getTools } from '../../common';

type Action = EngineRequest<RequestResponseMetadata>['actions'][number];
type ConnectedTool = DynamicStructuredTool | Tool;

function isEngineRequest(
	value: EngineRequest<RequestResponseMetadata> | INodeExecutionData[][],
): value is EngineRequest<RequestResponseMetadata> {
	return !Array.isArray(value) && 'actions' in value;
}

export type ResolveSubAgentRequestDeps = {
	/**
	 * Re-enter the sub-agent with the EngineResponse built from the resolved
	 * tool invocations. The sub-agent's `maxIterations` is enforced inside this
	 * callback (via `checkMaxIterations`), so recursion is bounded.
	 */
	runAgentBatch: (
		response: EngineResponse<RequestResponseMetadata>,
	) => Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>>;
};

/**
 * Resolves an `EngineRequest` inline when AgentToolV3 runs as a sub-agent
 * (`ISupplyDataFunctions` context). The parent agent's tool boundary —
 * `makeHandleToolInvocation` in core — cannot fulfil `EngineRequest`s because
 * the workflow engine only schedules nested nodes at the top level. To keep
 * the same observable behaviour the engine would have produced, we:
 *
 *   1. Reject HITL actions upfront (no engine-level suspend/resume here).
 *   2. Invoke the sub-agent's connected LangChain tools in parallel — this
 *      routes execute-only tools through `makeHandleToolInvocation` again
 *      (which preserves canvas observability) and supplyData-resolved tools
 *      through their own `invoke()` paths.
 *   3. Build an `EngineResponse` and re-enter the sub-agent until it produces
 *      plain node output data.
 */
export async function resolveSubAgentRequest(
	ctx: ISupplyDataFunctions,
	request: EngineRequest<RequestResponseMetadata>,
	deps: ResolveSubAgentRequestDeps,
): Promise<INodeExecutionData[][]> {
	let current: EngineRequest<RequestResponseMetadata> | INodeExecutionData[][] = request;

	const node = ctx.getNode();

	while (isEngineRequest(current)) {
		assertNoHitlActions(node, current.actions);

		ctx.getExecutionCancelSignal?.()?.throwIfAborted?.();

		const tools = (await getTools(ctx)) as ConnectedTool[];

		const actionResponses = await Promise.all(
			current.actions.map(async (action) => await invokeToolAction(node, action, tools)),
		);

		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses,
			metadata: current.metadata,
		};

		current = await deps.runAgentBatch(response);
	}

	return current;
}

function assertNoHitlActions(node: INode, actions: Action[]): void {
	for (const action of actions) {
		if (action.metadata?.hitl) {
			throw new UserError(
				`Human-in-the-Loop nodes cannot be used inside a sub-agent. Move "${action.nodeName}" to the top-level workflow.`,
				{
					description:
						'Engine-level approval flows are not available from within a tool callback. Make the human-in-the-loop step part of the top-level Agent instead of a nested AgentToolV3.',
					extra: { node: node.name },
				},
			);
		}
	}
}

function findMatchingTool(action: Action, tools: ConnectedTool[]): ConnectedTool | undefined {
	const toolkitName =
		typeof action.input?.tool === 'string' ? (action.input.tool as string) : undefined;

	if (toolkitName !== undefined) {
		const toolkitMatch = tools.find((t) => {
			const md = t.metadata as ToolMetadata | undefined;
			return md?.sourceNodeName === action.nodeName && t.name === toolkitName;
		});
		if (toolkitMatch) return toolkitMatch;
	}

	return tools.find(
		(t) => (t.metadata as ToolMetadata | undefined)?.sourceNodeName === action.nodeName,
	);
}

function prepareToolInput(action: Action): IDataObject {
	// `tool` is an internal marker createEngineRequests adds for toolkit calls
	// (so the engine knows which toolkit-tool to invoke). The LangChain tool's
	// own Zod schema doesn't include it, so strip it before invoking.
	if (typeof action.input?.tool === 'string') {
		const { tool: _toolName, ...rest } = action.input;
		return rest;
	}
	return action.input;
}

async function invokeToolAction(
	node: INode,
	action: Action,
	tools: ConnectedTool[],
): Promise<ExecuteNodeResult<RequestResponseMetadata>> {
	const tool = findMatchingTool(action, tools);
	if (!tool) {
		return buildErrorResponse(
			node,
			action,
			`Sub-agent could not find a connected tool for node "${action.nodeName}".`,
		);
	}

	try {
		const output = await tool.invoke(prepareToolInput(action));
		return buildSuccessResponse(action, output);
	} catch (error) {
		return buildErrorResponse(node, action, error instanceof Error ? error.message : String(error));
	}
}

function buildTaskDataShell(): Pick<
	ITaskData,
	'executionTime' | 'startTime' | 'executionIndex' | 'source'
> {
	return {
		executionTime: 0,
		startTime: 0,
		executionIndex: 0,
		source: [],
	};
}

function buildSuccessResponse(
	action: Action,
	output: unknown,
): ExecuteNodeResult<RequestResponseMetadata> {
	const data: ITaskData = {
		...buildTaskDataShell(),
		executionStatus: 'success',
		data: {
			ai_tool: [[{ json: { output } as IDataObject }]],
		},
	};
	return { action, data };
}

function buildErrorResponse(
	node: INode,
	action: Action,
	message: string,
): ExecuteNodeResult<RequestResponseMetadata> {
	const data: ITaskData = {
		...buildTaskDataShell(),
		executionStatus: 'error',
		error: new NodeOperationError(node, message),
	};
	return { action, data };
}
