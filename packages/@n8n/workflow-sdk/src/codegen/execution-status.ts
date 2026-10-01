import type { IRunExecutionData } from 'n8n-workflow';

type ExecutionResultData = IRunExecutionData['resultData'];

/**
 * Execution status for a node: success, error with message, or not executed
 */
export interface NodeExecutionStatus {
	status: 'success' | 'error' | 'not_executed';
	errorMessage?: string;
}

/**
 * Build map of node names to their execution status.
 * Used by code generator to add @workflowExecutionStatus annotations in JSDoc.
 */
export function buildNodeExecutionStatus(
	data?: ExecutionResultData,
): Map<string, NodeExecutionStatus> {
	const statuses = new Map<string, NodeExecutionStatus>();

	if (!data?.runData) return statuses;

	for (const [nodeName, taskDataArray] of Object.entries(data.runData)) {
		for (const taskData of taskDataArray) {
			if (taskData.error) {
				const msg = taskData.error.message ?? 'Unknown error';
				const desc = (taskData.error as { description?: string }).description;
				const fullMsg = desc ? `${msg}: ${desc}` : msg;
				const truncated = fullMsg.length > 150 ? fullMsg.slice(0, 150) + '...' : fullMsg;
				statuses.set(nodeName, { status: 'error', errorMessage: truncated });
			} else {
				statuses.set(nodeName, { status: 'success' });
			}
			break; // Only first execution per node
		}
	}

	return statuses;
}

/**
 * Format workflow-level execution status as JSDoc content.
 * Returns content for JSDoc above export default workflow() statement.
 */
export function formatExecutionStatusJSDoc(data?: ExecutionResultData): string {
	if (!data) return '';

	const lines: string[] = [];

	if (data.lastNodeExecuted) {
		lines.push(`@lastExecuted "${data.lastNodeExecuted}"`);
	}

	const hasError = !!data.error || hasNodeErrors(data);
	lines.push(`@workflowExecutionStatus ${hasError ? 'error' : 'success'}`);

	return lines.join('\n');
}

function hasNodeErrors(data: ExecutionResultData): boolean {
	if (!data.runData) return false;
	return Object.values(data.runData).some((taskDataArray) => taskDataArray.some((td) => td.error));
}
