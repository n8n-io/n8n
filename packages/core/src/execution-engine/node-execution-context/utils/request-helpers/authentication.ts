/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { OutboundHttp, removeEmptyBody } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	IAdditionalCredentialOptions,
	IAllExecuteFunctions,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { ExecutionBaseError, NodeApiError, NodeOperationError } from 'n8n-workflow';

import { callEvalMockHandler, normalizeLegacyRequest } from '@/execution-engine/eval-mock-helpers';

import { proxyRequestToAxios } from './legacy-request-adapter';
import { hasSingleUseBody, requestOAuth1, requestOAuth2 } from './oauth';

export async function httpRequestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
) {
	removeEmptyBody(requestOptions);

	// Cancel this request on execution cancellation
	if ('getExecutionCancelSignal' in this) {
		requestOptions.abortSignal = this.getExecutionCancelSignal();
	}

	let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;
	let requestSent = false;

	// Eval LLM mock: intercept before credential auth and OAuth signing
	if (additionalData.evalLlmMockHandler) {
		const evalMockResponse = await callEvalMockHandler(
			additionalData.evalLlmMockHandler,
			requestOptions,
			node,
			requestOptions.returnFullResponse,
		);
		if (evalMockResponse !== undefined) return evalMockResponse;
	}

	try {
		const parentTypes = additionalData.credentialsHelper.getParentTypes(credentialsType);

		if (parentTypes.includes('oAuth1Api')) {
			return await requestOAuth1.call(this, credentialsType, requestOptions, true);
		}
		if (parentTypes.includes('oAuth2Api')) {
			return await requestOAuth2.call(
				this,
				credentialsType,
				requestOptions,
				node,
				additionalData,
				additionalCredentialOptions?.oauth2,
				true,
			);
		}

		if (additionalCredentialOptions?.credentialsDecrypted) {
			credentialsDecrypted = additionalCredentialOptions.credentialsDecrypted.data;
		} else {
			credentialsDecrypted =
				await this.getCredentials<ICredentialDataDecryptedObject>(credentialsType);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set`,
				{ level: 'warning' },
			);
		}

		const data = await additionalData.credentialsHelper.preAuthentication(
			{ helpers: this.helpers },
			credentialsDecrypted,
			credentialsType,
			node,
			false,
		);

		if (data) {
			// make the updated property in the credentials
			// available to the authenticate method
			Object.assign(credentialsDecrypted, data);
		}

		requestOptions = await additionalData.credentialsHelper.authenticate(
			credentialsDecrypted,
			credentialsType,
			requestOptions,
			workflow,
			node,
		);
		requestSent = true;
		return await Container.get(OutboundHttp).requests().request(requestOptions);
	} catch (error) {
		// if there is a pre authorization method defined and
		// the method failed due to unauthorized request
		if (
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			error.response?.status === 401 &&
			additionalData.credentialsHelper.preAuthentication !== undefined &&
			// OAuth 401s are already retried inside requestOAuth1/2 and leave
			// credentialsDecrypted unset; with nothing refreshed, resending the same
			// request (possibly with a consumed single-use body) could only fail again
			credentialsDecrypted !== undefined
		) {
			try {
				// try to refresh the credentials
				const data = await additionalData.credentialsHelper.preAuthentication(
					{ helpers: this.helpers },
					credentialsDecrypted,
					credentialsType,
					node,
					true,
				);

				if (data) {
					// make the updated property in the credentials
					// available to the authenticate method
					Object.assign(credentialsDecrypted, data);
				}

				if (requestSent && hasSingleUseBody(requestOptions)) {
					this.logger.warn(
						`Request for credential type "${credentialsType}" was not retried after refreshing the credential: its multipart/stream body was consumed by the first attempt and cannot be sent again. Surfacing the original error instead.`,
					);
					throw new NodeApiError(this.getNode(), error);
				}

				requestOptions = await additionalData.credentialsHelper.authenticate(
					credentialsDecrypted,
					credentialsType,
					requestOptions,
					workflow,
					node,
				);
				return await Container.get(OutboundHttp).requests().request(requestOptions);
			} catch (error) {
				throw new NodeApiError(this.getNode(), error);
			}
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

/** @deprecated use httpRequestWithAuthentication */
export async function requestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
	itemIndex?: number,
) {
	removeEmptyBody(requestOptions);

	let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;
	let requestSent = false;

	// Eval LLM mock: intercept before credential auth and OAuth signing (legacy path)
	if (additionalData.evalLlmMockHandler) {
		const evalMockResponse = await callEvalMockHandler(
			additionalData.evalLlmMockHandler,
			normalizeLegacyRequest(requestOptions),
			node,
			requestOptions.resolveWithFullResponse,
			'legacy',
		);
		if (evalMockResponse !== undefined) return evalMockResponse;
	}

	try {
		const parentTypes = additionalData.credentialsHelper.getParentTypes(credentialsType);

		if (credentialsType === 'oAuth1Api' || parentTypes.includes('oAuth1Api')) {
			return await requestOAuth1.call(this, credentialsType, requestOptions, false);
		}
		if (credentialsType === 'oAuth2Api' || parentTypes.includes('oAuth2Api')) {
			return await requestOAuth2.call(
				this,
				credentialsType,
				requestOptions,
				node,
				additionalData,
				additionalCredentialOptions?.oauth2,
				false,
			);
		}

		if (additionalCredentialOptions?.credentialsDecrypted) {
			credentialsDecrypted = additionalCredentialOptions.credentialsDecrypted.data;
		} else {
			credentialsDecrypted = await this.getCredentials<ICredentialDataDecryptedObject>(
				credentialsType,
				itemIndex,
			);
		}

		if (credentialsDecrypted === undefined) {
			throw new NodeOperationError(
				node,
				`Node "${node.name}" does not have any credentials of type "${credentialsType}" set`,
				{ level: 'warning' },
			);
		}

		const data = await additionalData.credentialsHelper.preAuthentication(
			{ helpers: this.helpers },
			credentialsDecrypted,
			credentialsType,
			node,
			false,
		);

		if (data) {
			// make the updated property in the credentials
			// available to the authenticate method
			Object.assign(credentialsDecrypted, data);
		}

		requestOptions = (await additionalData.credentialsHelper.authenticate(
			credentialsDecrypted,
			credentialsType,
			requestOptions as IHttpRequestOptions,
			workflow,
			node,
		)) as IRequestOptions;
		requestSent = true;
		return await proxyRequestToAxios(workflow, additionalData, node, requestOptions);
	} catch (error) {
		try {
			if (credentialsDecrypted !== undefined) {
				// try to refresh the credentials
				const data = await additionalData.credentialsHelper.preAuthentication(
					{ helpers: this.helpers },
					credentialsDecrypted,
					credentialsType,
					node,
					true,
				);

				if (data) {
					// make the updated property in the credentials
					// available to the authenticate method
					Object.assign(credentialsDecrypted, data);
					if (requestSent && hasSingleUseBody(requestOptions)) {
						this.logger.warn(
							`Request for credential type "${credentialsType}" was not retried after refreshing the credential: its multipart/stream body was consumed by the first attempt and cannot be sent again. Surfacing the original error instead.`,
						);
						throw error;
					}
					requestOptions = (await additionalData.credentialsHelper.authenticate(
						credentialsDecrypted,
						credentialsType,
						requestOptions as IHttpRequestOptions,
						workflow,
						node,
					)) as IRequestOptions;
					return await proxyRequestToAxios(workflow, additionalData, node, requestOptions);
				}
			}
			throw error;
		} catch (error) {
			if (error instanceof ExecutionBaseError) throw error;

			throw new NodeApiError(this.getNode(), error);
		}
	}
}
