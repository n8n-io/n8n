import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import type { RequestResponseMetadata } from '@utils/agent-execution';
import omit from 'lodash/omit';
import { isEngineRequest } from 'n8n-core';
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

const EMPTY_TASK_DATA_SHELL: Pick<
	ITaskData,
	'executionTime' | 'startTime' | 'executionIndex' | 'source'
> = { executionTime: 0, startTime: 0, executionIndex: 0, source: [] };

export type ResolveSubAgentRequestDeps = {
	runAgentBatch: (
		response: EngineResponse<RequestResponseMetadata>,
	) => Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>>;
};

/**
 * Resolves an `EngineRequest` inline when AgentToolV3 runs as a sub-agent —
 * `makeHandleToolInvocation` in core can't fulfil engine requests from a tool
 * callback. HITL is rejected upfront, other tools are invoked in parallel via
 * `tool.invoke()`, and the loop re-enters until plain node output is produced.
 */
export async function resolveSubAgentRequest(
	ctx: ISupplyDataFunctions,
	request: EngineRequest<RequestResponseMetadata>,
	deps: ResolveSubAgentRequestDeps,
): Promise<INodeExecutionData[][]> {
	let current: INodeExecutionData[][] | EngineRequest<RequestResponseMetadata> = request;
	const node = ctx.getNode();
	// Hoisted: tool list is stable for the lifetime of a sub-agent run.
	const tools = (await getTools(ctx)) as ConnectedTool[];

	while (isEngineRequest(current)) {
		assertNoHitlActions(node, current.actions);
		ctx.getExecutionCancelSignal?.()?.throwIfAborted?.();

		const actionResponses = await Promise.all(
			current.actions.map(async (action) => await invokeToolAction(node, action, tools)),
		);

		current = await deps.runAgentBatch({ actionResponses, metadata: current.metadata });
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
						'Engine-level approval flows are not available from within a tool callback, so the whole sub-agent step is aborted (any sibling tool calls in the same batch are not executed). Make the human-in-the-loop step part of the top-level Agent instead of a nested AgentToolV3.',
					extra: { node: node.name },
				},
			);
		}
	}
}

async function invokeToolAction(
	node: INode,
	action: Action,
	tools: ConnectedTool[],
): Promise<ExecuteNodeResult<RequestResponseMetadata>> {
	const tool = tools.find((t) => t.name === action.metadata?.toolName);
	if (!tool) {
		return makeActionError(
			node,
			action,
			`Sub-agent could not find a connected tool for node "${action.nodeName}".`,
		);
	}

	try {
		// `input.tool` is a toolkit-dispatch marker added by createEngineRequests;
		// it isn't part of the LangChain tool's Zod schema, so strip before invoking.
		const output = await tool.invoke(omit(action.input, 'tool'));
		return {
			action,
			data: {
				...EMPTY_TASK_DATA_SHELL,
				executionStatus: 'success',
				data: { ai_tool: [[{ json: { output } as IDataObject }]] },
			},
		};
	} catch (error) {
		return makeActionError(node, action, error instanceof Error ? error.message : String(error));
	}
}

function makeActionError(
	node: INode,
	action: Action,
	message: string,
): ExecuteNodeResult<RequestResponseMetadata> {
	return {
		action,
		data: {
			...EMPTY_TASK_DATA_SHELL,
			executionStatus: 'error',
			error: new NodeOperationError(node, message),
		},
	};
}
