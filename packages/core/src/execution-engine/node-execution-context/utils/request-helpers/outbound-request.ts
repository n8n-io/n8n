import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { IHttpRequestOptions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { addTraceHeaders } from './trace-headers';

/** Sends a request of a node through `OutboundHttp`, with the trace headers of the node. */
export async function sendHttpRequest(
	requestOptions: IHttpRequestOptions,
	additionalData: IWorkflowExecuteAdditionalData,
	node: INode,
) {
	addTraceHeaders(requestOptions, additionalData, node);
	return await Container.get(OutboundHttp).requests().request(requestOptions);
}
