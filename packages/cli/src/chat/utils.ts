import type { IExecutionResponse } from '@n8n/db';
import type { IExecuteData, INode, Workflow } from 'n8n-workflow';
import { CHAT_WAIT_USER_REPLY, RESPOND_TO_WEBHOOK_NODE_TYPE } from 'n8n-workflow';

const AI_TOOL = 'ai_tool';

/**
 * Resolves the node a chat message would resume. Pure: does not mutate the
 * execution. Returns null when the parked node is not in the workflow.
 *
 * Resolves from `executionData.node`, the top of `nodeExecutionStack`, which is
 * the node the engine actually resumes. It does not use
 * `resultData.lastNodeExecuted`, so the resume decision can never authorize a
 * different node than the one that runs.
 */
export function findResumeNode(executionData: IExecuteData, workflow: Workflow): INode | null {
	return workflow.getNode(executionData.node.name);
}

/**
 * Returns the message to be sent of the last executed node
 */
export function getMessage(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;

	const runIndex = execution.data.resultData.runData[lastNodeExecuted].length - 1;
	const data = execution.data.resultData.runData[lastNodeExecuted][runIndex]?.data;
	const outputs = data?.main ?? data?.[AI_TOOL];

	// Check all main output branches for a message
	if (outputs && Array.isArray(outputs)) {
		for (const branch of outputs) {
			if (branch && Array.isArray(branch) && branch.length > 0 && branch[0].sendMessage) {
				return branch[0].sendMessage;
			}
		}
	}

	return undefined;
}

/**
 * Returns the last node executed
 */
export function getLastNodeExecuted(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;
	return execution.workflowData?.nodes?.find((node) => node.name === lastNodeExecuted);
}

/**
 * Check if execution should be resumed immediately after receivng a message
 */
export function shouldResumeImmediately(lastNode: INode) {
	if (lastNode?.type === RESPOND_TO_WEBHOOK_NODE_TYPE) {
		return true;
	}

	if (lastNode?.parameters?.[CHAT_WAIT_USER_REPLY] === false) {
		return true;
	}

	const options = lastNode?.parameters?.options as {
		[CHAT_WAIT_USER_REPLY]?: boolean;
	};

	if (options && options[CHAT_WAIT_USER_REPLY] === false) {
		return true;
	}

	return false;
}
