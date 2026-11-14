/* eslint-disable @typescript-eslint/no-explicit-any */

import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	INode,
	IHttpRequestOptions,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';

/** Keeps shipped node `request` calls on the legacy request transport. */
export async function proxyRequestToAxios(
	workflow: Workflow | undefined,
	additionalData: IWorkflowExecuteAdditionalData | undefined,
	node: INode | undefined,
	// oxlint-disable-next-line typescript/no-deprecated
	uriOrObject: string | IRequestOptions,
	// oxlint-disable-next-line typescript/no-deprecated
	options?: IRequestOptions,
): Promise<any> {
	// oxlint-disable-next-line typescript/no-deprecated
	const configObject: IRequestOptions =
		typeof uriOrObject === 'string' ? { uri: uriOrObject, ...options } : (uriOrObject ?? {});

	const client = Container.get(OutboundHttp).requests();

	// oxlint-disable-next-line typescript/no-deprecated
	return await client.requestLegacy(configObject, {
		onFetched: async () => {
			await additionalData?.hooks?.runHook('nodeFetchedData', [workflow?.id, node]);
		},
	});
}

/**
 * Map shipped node request options to the current HTTP shape for eval mocks.
 * The legacy body may be in body, formData, or form.
 */
export function normalizeLegacyRequest(
	// oxlint-disable-next-line typescript/no-deprecated
	uriOrObject: string | IRequestOptions,
	// oxlint-disable-next-line typescript/no-deprecated
	options?: IRequestOptions,
): IHttpRequestOptions {
	const request = typeof uriOrObject === 'string' ? options : uriOrObject;
	return {
		url: typeof uriOrObject === 'string' ? uriOrObject : (uriOrObject.url ?? uriOrObject.uri ?? ''),
		method: request?.method,
		headers: request?.headers,
		body: (request?.body ?? request?.formData ?? request?.form) as IHttpRequestOptions['body'],
		qs: request?.qs,
		...(request?.simple === false ? { ignoreHttpStatusErrors: true } : {}),
	};
}
