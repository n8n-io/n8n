import type { INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

/** Returns the W3C trace headers of the running node, or an empty object without a trace. */
export function getTraceHeaders(
	additionalData: IWorkflowExecuteAdditionalData,
	node: INode,
): Record<string, string> {
	const { otel, executionId } = additionalData;
	if (!otel?.injectTraceHeaders || !executionId) return {};

	const headers: Record<string, string> = {};
	otel.injectTraceHeaders(executionId, node.name, headers);
	return headers;
}

/** Adds the trace headers to `target.headers`. They replace headers with the same name. */
export function addTraceHeaders(
	target: { headers?: object },
	additionalData: IWorkflowExecuteAdditionalData,
	node: INode,
): void {
	const traceHeaders = getTraceHeaders(additionalData, node);
	if (Object.keys(traceHeaders).length) {
		Object.assign((target.headers ??= {}), traceHeaders);
	}
}
