import { NodeApiError, NodeError, WorkflowActivationError } from 'n8n-workflow';

export function getErrorNodeId(error: unknown): string | undefined {
	if (error instanceof NodeError) return error.node.id;
	if (error instanceof WorkflowActivationError) return error.node?.id;
	return undefined;
}

export function getErrorDescription(error: unknown): string | undefined {
	if (error instanceof NodeApiError) return error.description ?? undefined;
	return undefined;
}
