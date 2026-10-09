import type { INodeConnections } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import {
	ERROR_TRIGGER_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	HTTP_REQUEST_TOOL_NODE_TYPE,
} from '@/app/constants';

const ERROR_PRONE_NODE_TYPES = new Set<string>([
	HTTP_REQUEST_NODE_TYPE,
	HTTP_REQUEST_TOOL_NODE_TYPE,
]);

/** Nodes likely to fail at runtime with no retry/error handling configured,
 *  when the workflow also has no error workflow. */
export function findNodesMissingErrorHandling(deps: {
	nodes: INodeUi[];
	errorWorkflow: string | undefined;
	outgoingConnectionsByNodeName: (nodeName: string) => INodeConnections;
	incomingConnectionsByNodeName: (nodeName: string) => INodeConnections;
}): INodeUi[] {
	// 'DEFAULT' is the "No Workflow" sentinel from the settings modal, not a workflow id.
	const hasErrorWorkflow = Boolean(deps.errorWorkflow) && deps.errorWorkflow !== 'DEFAULT';
	// An Error Trigger node makes the workflow its own error handler (even disabled) — mirrors
	// the backend gate in packages/cli/src/execution-lifecycle/execute-error-workflow.ts.
	const hasErrorTrigger = deps.nodes.some((node) => node.type === ERROR_TRIGGER_NODE_TYPE);
	if (hasErrorWorkflow || hasErrorTrigger) return [];

	return deps.nodes.filter((node) => {
		if (!ERROR_PRONE_NODE_TYPES.has(node.type) || node.disabled) return false;

		// Same disabled+connected filter as useWorkflowDocumentNodesIssues.ts
		const isConnected =
			Object.keys(deps.outgoingConnectionsByNodeName(node.name)).length > 0 ||
			Object.keys(deps.incomingConnectionsByNodeName(node.name)).length > 0;
		if (!isConnected) return false;

		const handlesErrors =
			node.retryOnFail === true ||
			node.continueOnFail === true ||
			(node.onError !== undefined && node.onError !== 'stopWorkflow');

		return !handlesErrors;
	});
}
