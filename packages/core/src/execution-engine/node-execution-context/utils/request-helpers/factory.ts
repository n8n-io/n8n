import { httpRequest } from '@n8n/backend-network';
import type {
	IAllExecuteFunctions,
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
			if (additionalData.otel?.injectTraceHeaders) {
				requestOptions.headers ??= {};
				additionalData.otel.injectTraceHeaders(
					additionalData.executionId!,
					node.name,
					requestOptions.headers as Record<string, string>,
				);
			}
			return await httpRequest(requestOptions, additionalData.ssrfBridge);
		},
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
				requestOptions,
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
			if (additionalData.otel?.injectTraceHeaders) {
				const target = typeof uriOrObject === 'string' ? (options ??= {}) : uriOrObject;
				target.headers ??= {};
				additionalData.otel.injectTraceHeaders(
					additionalData.executionId!,
					node.name,
					target.headers as Record<string, string>,
				);
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return await proxyRequestToAxios(workflow, additionalData, node, uriOrObject, options);
		},

		async requestWithAuthentication(
			this,
			credentialsType,
			requestOptions,
			additionalCredentialOptions,
			itemIndex,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any> {
			return await requestWithAuthentication.call(
				this,
				credentialsType,
				requestOptions,
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
			return await requestOAuth1.call(this, credentialsType, requestOptions);
		},

		async requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
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
