/* eslint-disable @typescript-eslint/no-explicit-any */

import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

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

	// The legacy path only enforces SSRF when the execution provides a bridge;
	// otherwise it connects directly (no protection), so default to `'disabled'`.
	const client = Container.get(OutboundHttp).requests({
		ssrf: additionalData?.ssrfBridge ?? 'disabled',
	});

	return await client.requestLegacy(configObject, {
		onFetched: async () => {
			await additionalData?.hooks?.runHook('nodeFetchedData', [workflow?.id, node]);
		},
	});
}
