import type {
	IHttpRequestOptions,
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { callEvalMockHandler, normalizeLegacyRequest } from '@/execution-engine/eval-mock-helpers';

/**
 * Asks the guard of this execution to answer a request that is about to be sent.
 * Returns `undefined` when there is no guard, or when the guard leaves the request to the network.
 */
export async function answerWithRequestGuard(
	additionalData: IWorkflowExecuteAdditionalData | undefined,
	node: INode | undefined,
	request:
		| { library: 'axios'; options: IHttpRequestOptions }
		// oxlint-disable-next-line typescript/no-deprecated
		| { library: 'legacy'; options: IRequestOptions },
): Promise<unknown> {
	const guard = additionalData?.nodeRequestGuard;
	if (!guard || !node) return undefined;
	if (request.library === 'axios') {
		return await callEvalMockHandler(
			guard,
			request.options,
			node,
			request.options.returnFullResponse,
		);
	}
	return await callEvalMockHandler(
		guard,
		withLegacyFields(normalizeLegacyRequest(request.options), request.options),
		node,
		request.options.resolveWithFullResponse,
		'legacy',
	);
}

// `normalizeLegacyRequest` leaves out two fields that the guard needs:
// `auth`, to replay a read with the same credential, and the binary answer (`encoding: null`).
function withLegacyFields(
	normalized: IHttpRequestOptions,
	// oxlint-disable-next-line typescript/no-deprecated
	legacy: IRequestOptions,
): IHttpRequestOptions {
	const withEncoding: IHttpRequestOptions =
		legacy.encoding === null ? { ...normalized, encoding: 'arraybuffer' } : normalized;
	const auth = legacy.auth;
	if (!auth) return withEncoding;
	const username = auth.user ?? auth.username;
	const password = auth.pass ?? auth.password;
	return typeof username === 'string' && typeof password === 'string'
		? { ...withEncoding, auth: { username, password } }
		: withEncoding;
}
