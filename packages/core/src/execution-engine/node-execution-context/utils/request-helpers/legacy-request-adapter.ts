// oxlint-disable typescript/no-deprecated
/* eslint-disable @typescript-eslint/no-explicit-any */

import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

import { getEvalEgressProxy } from '@/execution-engine/eval-mock-helpers';

/**
 * @deprecated This is only used by legacy request helpers, that are also deprecated
 */
export async function proxyRequestToAxios(
	workflow: Workflow | undefined,
	additionalData: IWorkflowExecuteAdditionalData | undefined,
	node: INode | undefined,
	uriOrObject: string | IRequestOptions,
	options?: IRequestOptions,
): Promise<any> {
	const configObject: IRequestOptions =
		typeof uriOrObject === 'string' ? { uri: uriOrObject, ...options } : (uriOrObject ?? {});
	// Eval simulated-services runs: every request of the run reaches the sim server.
	const evalEgressProxy = getEvalEgressProxy(additionalData);
	if (evalEgressProxy) configObject.proxy = evalEgressProxy;

	const client = Container.get(OutboundHttp).requests();

	return await client.requestLegacy(configObject, {
		onFetched: async () => {
			await additionalData?.hooks?.runHook('nodeFetchedData', [workflow?.id, node]);
		},
	});
}
