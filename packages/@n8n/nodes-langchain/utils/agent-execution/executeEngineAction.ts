import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import omit from 'lodash/omit';
import type { EngineRequest, ExecuteNodeResult, IDataObject, INode, ITaskData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { RequestResponseMetadata } from './types';

type ConnectedTool = DynamicStructuredTool | Tool;
type Action = EngineRequest<RequestResponseMetadata>['actions'][number];

const EMPTY_TASK_DATA_SHELL: Pick<
	ITaskData,
	'executionTime' | 'startTime' | 'executionIndex' | 'source'
> = { executionTime: 0, startTime: 0, executionIndex: 0, source: [] };

/** Inverse of createEngineRequests: invokes a tool for one action, returns the ActionResponse the agent loop expects. */
export async function executeEngineAction(
	node: INode,
	action: Action,
	tools: ConnectedTool[],
): Promise<ExecuteNodeResult<RequestResponseMetadata>> {
	const tool = tools.find((t) => t.name === action.metadata?.toolName);
	if (!tool) {
		return errorResult(
			node,
			action,
			`Sub-agent could not find a connected tool for node "${action.nodeName}".`,
		);
	}

	try {
		// `input.tool` is a toolkit-dispatch marker added by createEngineRequests; strip before invoking.
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
		return errorResult(node, action, error instanceof Error ? error.message : String(error));
	}
}

function errorResult(
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
