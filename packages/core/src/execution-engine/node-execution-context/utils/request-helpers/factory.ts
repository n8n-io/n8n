import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	IAllExecuteFunctions,
	IExecuteData,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	IOAuth2Options,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	LegacyRequestOptions,
	NodeParameterValueType,
	RequestHelperFunctions,
	WithRequestTarget,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { callEvalMockHandler, normalizeLegacyRequest } from '@/execution-engine/eval-mock-helpers';

import { getNonWorkflowAdditionalKeys } from '../get-additional-keys';
import {
	getManagedCredentialType,
	getValidManagedData,
	resolveManagedCredentialType,
} from '../managed-credential';
import { httpRequestWithAuthentication, requestWithAuthentication } from './authentication';
import { proxyRequestToAxios } from './legacy-request-adapter';
import { refreshOAuth2Token, requestOAuth1, requestOAuth2 } from './oauth';
import { sendHttpRequest } from './outbound-request';
import { requestWithAuthenticationPaginated } from './pagination';
import { toHttpRequestOptions, toLegacyRequestOptions } from './request-target';
import { getTraceHeaders } from './trace-headers';

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
				{ ...getNonWorkflowAdditionalKeys(additionalData), ...additionalKeys },
				executeData,
				returnObjectAsString,
			);
		}

		return parameterValue;
	};

	// SPIKE (API-663): requests a node sends without an auth helper (its own auth header) still get
	// the managed type's `authenticate`, so the platform's data reaches every request.
	const withManagedAuthentication = async <T extends object | undefined>(
		options: T,
	): Promise<T> => {
		const managedType = getManagedCredentialType();
		// Nodes without a credential (RSS Read, for example) send their requests unchanged.
		if (!managedType || !node.credentials?.[managedType]) return options;
		const data = getValidManagedData(
			node,
			managedType,
			additionalData.credentialsHelper.getCredentialsProperties(managedType),
		);
		return (await additionalData.credentialsHelper.authenticate(
			data,
			managedType,
			(options ?? {}) as IHttpRequestOptions,
			workflow,
			node,
		)) as T;
	};

	// Eval LLM mock handler: extract once for use in direct helpers below
	const evalLlmMock = additionalData.evalLlmMockHandler;

	return {
		getTraceHeaders: () => getTraceHeaders(additionalData, node),
		httpRequest: async (
			requestOptionsWithTarget: IHttpRequestOptions | WithRequestTarget<IHttpRequestOptions>,
		) => {
			const requestOptions = toHttpRequestOptions(requestOptionsWithTarget);
			if (evalLlmMock) {
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					requestOptions,
					node,
					requestOptions.returnFullResponse,
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			return await sendHttpRequest(
				await withManagedAuthentication(requestOptions),
				additionalData,
				node,
			);
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
				toLegacyRequestOptions(requestOptions),
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
				resolveManagedCredentialType(node, credentialsType),
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

		// oxlint-disable-next-line typescript/no-deprecated -- Keep this helper for existing node implementations.
		request: async (uriOrObjectWithTarget, optionsWithTarget) => {
			const rawUriOrObject =
				typeof uriOrObjectWithTarget === 'string'
					? uriOrObjectWithTarget
					: toLegacyRequestOptions(uriOrObjectWithTarget);
			const rawOptions = optionsWithTarget && toLegacyRequestOptions(optionsWithTarget);
			if (evalLlmMock) {
				const wantsFull =
					typeof rawUriOrObject !== 'string' && rawUriOrObject.resolveWithFullResponse;
				const evalMockResponse = await callEvalMockHandler(
					evalLlmMock,
					normalizeLegacyRequest(rawUriOrObject, rawOptions),
					node,
					wantsFull,
					'legacy',
				);
				if (evalMockResponse !== undefined) return evalMockResponse;
			}
			const uriOrObject =
				typeof rawUriOrObject === 'string'
					? rawUriOrObject
					: await withManagedAuthentication(rawUriOrObject);
			const options =
				typeof rawUriOrObject === 'string'
					? await withManagedAuthentication(rawOptions)
					: rawOptions;
			// oxlint-disable-next-line typescript/no-deprecated
			return await proxyRequestToAxios(workflow, additionalData, node, uriOrObject, options);
		},

		// oxlint-disable-next-line typescript/no-deprecated -- Keep this helper for existing node implementations.
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
				resolveManagedCredentialType(node, credentialsType),
				requestOptions,
				workflow,
				node,
				additionalData,
				additionalCredentialOptions,
				itemIndex,
			);
		},

		// oxlint-disable-next-line typescript/no-deprecated -- Keep this helper for existing node implementations.
		async requestOAuth1(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptionsWithTarget: LegacyRequestOptions,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any> {
			const requestOptions = toLegacyRequestOptions(requestOptionsWithTarget);
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
			const resolvedOAuth1Type = resolveManagedCredentialType(node, credentialsType);
			if (resolvedOAuth1Type !== credentialsType) {
				// oxlint-disable-next-line typescript/no-deprecated
				return await requestWithAuthentication.call(
					this,
					resolvedOAuth1Type,
					requestOptions,
					workflow,
					node,
					additionalData,
				);
			}
			// oxlint-disable-next-line typescript/no-deprecated
			return await requestOAuth1.call(this, credentialsType, requestOptions);
		},

		// oxlint-disable-next-line typescript/no-deprecated -- Keep this helper for existing node implementations.
		async requestOAuth2(
			this: IAllExecuteFunctions,
			credentialsType: string,
			requestOptionsWithTarget: LegacyRequestOptions,
			oAuth2Options?: IOAuth2Options,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		): Promise<any> {
			const requestOptions = toLegacyRequestOptions(requestOptionsWithTarget);
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
			const resolvedOAuth2Type = resolveManagedCredentialType(node, credentialsType);
			if (resolvedOAuth2Type !== credentialsType) {
				// oxlint-disable-next-line typescript/no-deprecated
				return await requestWithAuthentication.call(
					this,
					resolvedOAuth2Type,
					requestOptions,
					workflow,
					node,
					additionalData,
				);
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
