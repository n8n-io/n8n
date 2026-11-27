import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { IHttpRequestOptions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { withEvalEgressProxy } from '@/execution-engine/eval-mock-helpers';

import { answerWithRequestGuard } from './request-guard';
import { addTraceHeaders } from './trace-headers';

/** Sends a request of a node through `OutboundHttp`, with the trace headers of the node.
 *  An eval simulated-services run routes it through the run's egress proxy. */
export async function sendHttpRequest(
	requestOptions: IHttpRequestOptions,
	additionalData: IWorkflowExecuteAdditionalData,
	node: INode,
) {
	addTraceHeaders(requestOptions, additionalData, node);
	// The guard of an agent test chat answers the request, or leaves it to the network.
	const guarded = await answerWithRequestGuard(additionalData, node, {
		library: 'axios',
		options: requestOptions,
	});
	if (guarded !== undefined) return guarded;
	return await Container.get(OutboundHttp)
		.requests()
		.request(withEvalEgressProxy(requestOptions, additionalData));
}
