import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { DATA_TABLE_NODE_TYPES, SEND_AND_WAIT_OPERATION, WAIT_NODE_TYPE } from 'n8n-workflow';

import { WorkflowTestError, type WorkflowTestErrorCode } from '../errors';
import { failExecution, type ExecutionSetup } from '../execution-context';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

interface Refusal {
	code: WorkflowTestErrorCode;
	reason: string;
}

export function refuseUnmockedNode(context: ExecutionSetup, functions: IExecuteFunctions) {
	const node = functions.getNode();
	const refusal = findRefusal(node, functions);
	if (!refusal) return;
	failExecution(
		context,
		new WorkflowTestError(
			refusal.code,
			`Node "${node.name}" ${refusal.reason}. Mock the node with mockNode().`,
			{ workflow: context.handle.name, node: node.name },
		),
	);
}

export function refuseSubWorkflow(context: ExecutionSetup, node: INode | undefined): never {
	return failExecution(
		context,
		new WorkflowTestError(
			'SUB_WORKFLOW_SOURCE_NOT_SUPPORTED',
			`Node "${node?.name}" calls a sub-workflow, which a test cannot run. Mock the node with mockNode().`,
			{ workflow: context.handle.name, node: node?.name },
		),
	);
}

function findRefusal(node: INode, functions: IExecuteFunctions): Refusal | undefined {
	if (isPythonCode(node, functions)) {
		return { code: 'CODE_NODE_NOT_MOCKED', reason: 'runs Python code, which a test cannot run' };
	}
	if (DATA_TABLE_NODE_TYPES.includes(node.type)) {
		return {
			code: 'DATA_TABLE_NOT_MOCKED',
			reason: 'uses a data table, which a test does not have',
		};
	}
	const wait = waitReason(node, functions);
	if (wait) return { code: 'WAIT_NOT_MOCKED', reason: wait };
	return undefined;
}

function isPythonCode(node: INode, functions: IExecuteFunctions) {
	if (node.type !== CODE_NODE_TYPE || node.typeVersion < 2) return false;
	const language = functions.getNodeParameter('language', 0);
	return language === 'python' || language === 'pythonNative';
}

function waitReason(node: INode, functions: IExecuteFunctions) {
	if (functions.getNodeParameter('operation', 0, '') === SEND_AND_WAIT_OPERATION) {
		return 'sends a message and waits for a reply';
	}
	if (node.type !== WAIT_NODE_TYPE) return undefined;
	const resume = functions.getNodeParameter('resume', 0);
	if (resume === 'webhook') return 'waits for a webhook call';
	if (resume === 'form') return 'waits for a form submission';
	return undefined;
}
