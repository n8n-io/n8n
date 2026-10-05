import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	IAllExecuteFunctions,
	IDataObject,
	IExecuteData,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	IOAuth2Options,
	IRequestOptions,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	RequestHelperFunctions,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { callEvalMockHandler, normalizeLegacyRequest } from '@/execution-engine/eval-mock-helpers';

import { httpRequestWithAuthentication, requestWithAuthentication } from './authentication';
import { proxyRequestToAxios } from './legacy-request-adapter';
import { refreshOAuth2Token, requestOAuth1, requestOAuth2 } from './oauth';
import { requestWithAuthenticationPaginated } from './pagination';

/**
 * The options with the W3C trace headers of the active span. The options stay the same when no
 * trace is active or when the node set its own `traceparent`.
 * Without node contracts, the headers go into the caller's options.
 */
function withTraceHeaders<T extends { headers?: IDataObject }>(
	options: T,
	{ otel, executionId }: IWorkflowExecuteAdditionalData,
	node: INode,
): T {
	if (otel?.injectTraceHeaders && !otel.nodeContractsEnabled) {
		options.headers ??= {};
		const injected: Record<string, string> = {};
		otel.injectTraceHeaders(executionId!, node.name, injected);
		Object.assign(options.headers, injected);
		return options;
	}
	const { headers = {} } = options;
	if (
		!otel?.injectTraceHeaders ||
		executionId === undefined ||
		Object.keys(headers).some((name) => name.toLowerCase() === 'traceparent')
	) {
		return options;
	}
	const traceHeaders: Record<string, string> = {};
	otel.injectTraceHeaders(executionId, node.name, traceHeaders);
	return Object.keys(traceHeaders).length === 0
		? options
		: { ...options, headers: { ...headers, ...traceHeaders } };
}

export const getRequestHelperFunctions = (
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	runExecutionData: IRunExecutionData | null = null,
	connectionInputData: INodeExecutionData[] = [],
): RequestHelperFunctions => {
	const getResolvedValue = (
		parameterValue: NodeParameterValueType,
		itemIndex: number,
		runIndex: number,
		executeData: IExecuteData,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValueType => {
		const mode: WorkflowExecuteMode = 'internal';

		if (
			typeof parameterValue === 'object' ||
			(typeof parameterValue === 'string' && parameterValue.charAt(0) === '=')
		) {
			return workflow.expression.getParameterValue(
				parameterValue,
				runExecutionData,
				runIndex,
				itemIndex,
				node.name,
				connectionInputData,
				mode,
				additionalKeys ?? {},
				executeData,
				returnObjectAsString,
			);
		}

		return parameterValue;
	};

	// Eval LLM mock handler: extract once for use in direct helpers below
	const evalLlmMock = additionalData.evalLlmMockHandler;

	return {
		httpRequest: async (requestOptions: IHttpRequestOptions) => {
			if (evalLlmMock) {
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					requestOptions,
					node,
					requestOptions.returnFullResponse,
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			return await Container.get(OutboundHttp)
				.requests()
				.request(withTraceHeaders(requestOptions, additionalData, node));
		},
		getSecureEgressFilter: (useDefaultSsrfPolicy) =>
			Container.get(OutboundHttp).egressFilter(useDefaultSsrfPolicy),
		async requestWithAuthenticationPaginated(
			this: IExecuteFunctions,
			requestOptions,
			itemIndex,
			paginationOptions,
			credentialsType,
			additionalCredentialOptions,
			sanitizedRequest,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any[]> {
			return await requestWithAuthenticationPaginated.call(
				this,
				requestOptions,
				itemIndex,
				paginationOptions,
				getResolvedValue,
				node,
				credentialsType,
				additionalCredentialOptions,
				sanitizedRequest,
			);
		},
		async httpRequestWithAuthentication(
			this,
			credentialsType,
			requestOptions,
			additionalCredentialOptions,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any> {
			return await httpRequestWithAuthentication.call(
				this,
				credentialsType,
				additionalData.otel?.nodeContractsEnabled
					? withTraceHeaders(requestOptions, additionalData, node)
					: requestOptions,
				workflow,
				node,
				additionalData,
				additionalCredentialOptions,
			);
		},
		async refreshOAuth2Token(
			this: IAllExecuteFunctions,
			credentialsType: string,
			oAuth2Options?: IOAuth2Options,
		) {
			return await refreshOAuth2Token.call(
				this,
				credentialsType,
				node,
				additionalData,
				oAuth2Options,
			);
		},

		request: async (uriOrObject, options) => {
			if (evalLlmMock) {
				const wantsFull = typeof uriOrObject !== 'string' && uriOrObject.resolveWithFullResponse;
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					normalizeLegacyRequest(uriOrObject, options),
					node,
					wantsFull,
					'legacy',
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			const traced =
				typeof uriOrObject === 'string'
					? { uri: uriOrObject, options: withTraceHeaders(options ?? {}, additionalData, node) }
					: { uri: withTraceHeaders(uriOrObject, additionalData, node), options };
			// oxlint-disable-next-line typescript/no-deprecated
			return await proxyRequestToAxios(workflow, additionalData, node, traced.uri, traced.options);
		},

		async requestWithAuthentication(
			this,
			credentialsType,
			requestOptions,
			additionalCredentialOptions,
			itemIndex,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any> {
			// oxlint-disable-next-line typescript/no-deprecated
			return await requestWithAuthentication.call(
				this,
				credentialsType,
				additionalData.otel?.nodeContractsEnabled
					? withTraceHeaders(requestOptions, additionalData, node)
					: requestOptions,
				workflow,
				node,
				additionalData,
				additionalCredentialOptions,
				itemIndex,
			);
		},

		async requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			// oxlint-disable-next-line typescript/no-deprecated
			requestOptions: IRequestOptions,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any> {
			if (evalLlmMock) {
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					normalizeLegacyRequest(requestOptions),
					node,
					requestOptions.resolveWithFullResponse,
					'legacy',
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			// oxlint-disable-next-line typescript/no-deprecated
			return await requestOAuth1.call(this, credentialsType, requestOptions);
		},

		async requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			// oxlint-disable-next-line typescript/no-deprecated
			requestOptions: IRequestOptions,
			oAuth2Options?: IOAuth2Options,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any> {
			if (evalLlmMock) {
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					normalizeLegacyRequest(requestOptions),
					node,
					requestOptions.resolveWithFullResponse,
					'legacy',
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			// oxlint-disable-next-line typescript/no-deprecated
			return await requestOAuth2.call(
				this,
				credentialsType,
				requestOptions,
				node,
				additionalData,
				oAuth2Options,
			);
		},
	};
};
