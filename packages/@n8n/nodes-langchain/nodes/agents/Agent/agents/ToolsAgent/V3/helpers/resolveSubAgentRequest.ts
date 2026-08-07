import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import { executeEngineAction, type RequestResponseMetadata } from '@utils/agent-execution';
import { isEngineRequest } from 'n8n-core';
import type {
	EngineRequest,
	EngineResponse,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { getTools } from '../../common';

type Action = EngineRequest<RequestResponseMetadata>['actions'][number];
type ConnectedTool = DynamicStructuredTool | Tool;

export type ResolveSubAgentRequestDeps = {
	runAgentBatch: (
		response: EngineResponse<RequestResponseMetadata>,
	) => Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>>;
};

/** Resolves an EngineRequest inline when AgentToolV3 runs as a sub-agent (engine can't fulfil requests from a tool callback). */
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
			current.actions.map(async (action) => await executeEngineAction(node, action, tools)),
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
						'Approval flows need the top-level engine; the sub-agent step is aborted (sibling tool calls skipped).',
					extra: { node: node.name },
				},
			);
		}
	}
}
