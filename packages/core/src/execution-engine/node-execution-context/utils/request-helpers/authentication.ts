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
	LegacyRequestOptions,
	IWorkflowExecuteAdditionalData,
	WithRequestTarget,
	Workflow,
} from 'n8n-workflow';
import {
	ExecutionBaseError,
	hasPolicyRefusalMarker,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	callEvalMockHandler,
	normalizeLegacyRequest,
	resolveEvalMockRequestUrl,
} from '@/execution-engine/eval-mock-helpers';

import { proxyRequestToAxios } from './legacy-request-adapter';
import {
	hasSingleUseBody,
	isTokenExpiryInFuture,
	isTokenExpiredStatusCode,
	requestOAuth1,
	requestOAuth2,
} from './oauth';
import { toHttpRequestOptions, toLegacyRequestOptions } from './request-target';

/**
 * Whether a failed request earns the generic `preAuthentication` refresh-and-resend. Only the
 * statuses in `preAuthenticationRetryStatusCode` (default 401) do; an explicit list replaces the
 * default. A 401 means the server rejected the token, so it skips the expiry gate. Any other
 * configured status can be ambiguous (a gateway that answers 404 both for an expired token and for
 * a resource that does not exist), so `skipPreAuthenticationRetryWhileTokenIsFresh` lets a caller
 * gate those on the expiry the credential stored in `n8n_expires_at`, instead of paying a token
 * exchange and a credential write per missing resource. An absent or unparsable expiry still
 * retries.
 */
function shouldRetryAfterPreAuthentication(
	status: unknown,
	credentials: ICredentialDataDecryptedObject,
	options?: IAdditionalCredentialOptions,
): boolean {
	if (!isTokenExpiredStatusCode(status, options?.preAuthenticationRetryStatusCode ?? 401)) {
		return false;
	}
	if (status === 401 || options?.skipPreAuthenticationRetryWhileTokenIsFresh !== true) return true;
	return !isTokenExpiryInFuture(credentials.n8n_expires_at);
}

export async function httpRequestWithAuthentication(
	this: IAllExecuteFunctions,
	credentialsType: string,
	requestOptions: IHttpRequestOptions | WithRequestTarget<IHttpRequestOptions>,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
) {
	requestOptions = toHttpRequestOptions(requestOptions);
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
			resolveEvalMockRequestUrl(requestOptions, credentialsType),
			node,
			requestOptions.returnFullResponse,
		);
		if (evalMockResponse !== undefined) return evalMockResponse;
	}

	try {
		const parentTypes = additionalData.credentialsHelper.getParentTypes(credentialsType);

		if (parentTypes.includes('oAuth1Api')) {
			// oxlint-disable-next-line typescript/no-deprecated
			return await requestOAuth1.call(this, credentialsType, requestOptions, true);
		}
		if (parentTypes.includes('oAuth2Api')) {
			// oxlint-disable-next-line typescript/no-deprecated
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
		// Keep the policy reason visible instead of reporting it as a failed API call.
		if (hasPolicyRefusalMarker(error)) throw error;

		// if there is a pre authorization method defined and
		// the method failed due to unauthorized request
		if (
			additionalData.credentialsHelper.preAuthentication !== undefined &&
			// OAuth 401s are already retried inside requestOAuth1/2 and leave
			// credentialsDecrypted unset; with nothing refreshed, resending the same
			// request (possibly with a consumed single-use body) could only fail again
			credentialsDecrypted !== undefined &&
			shouldRetryAfterPreAuthentication(
				error.response?.status,
				credentialsDecrypted,
				additionalCredentialOptions,
			)
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
	requestOptions: LegacyRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	additionalCredentialOptions?: IAdditionalCredentialOptions,
	itemIndex?: number,
) {
	requestOptions = toLegacyRequestOptions(requestOptions);
	removeEmptyBody(requestOptions);

	let credentialsDecrypted: ICredentialDataDecryptedObject | undefined;
	let requestSent = false;
	let unauthorized: { response: { body?: unknown }; credentials: ICredentialDataDecryptedObject };

	// Eval LLM mock: intercept before credential auth and OAuth signing (legacy path)
	if (additionalData.evalLlmMockHandler) {
		const evalMockResponse = await callEvalMockHandler(
			additionalData.evalLlmMockHandler,
			normalizeLegacyRequest(resolveEvalMockRequestUrl(requestOptions, credentialsType)),
			node,
			requestOptions.resolveWithFullResponse,
			'legacy',
		);
		if (evalMockResponse !== undefined) return evalMockResponse;
	}

	try {
		const parentTypes = additionalData.credentialsHelper.getParentTypes(credentialsType);

		if (credentialsType === 'oAuth1Api' || parentTypes.includes('oAuth1Api')) {
			// oxlint-disable-next-line typescript/no-deprecated
			return await requestOAuth1.call(this, credentialsType, requestOptions, false);
		}
		if (credentialsType === 'oAuth2Api' || parentTypes.includes('oAuth2Api')) {
			// oxlint-disable-next-line typescript/no-deprecated
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

		requestOptions = await additionalData.credentialsHelper.authenticate(
			credentialsDecrypted,
			credentialsType,
			requestOptions as IHttpRequestOptions,
			workflow,
			node,
		);
		requestSent = true;
		if (requestOptions.simple !== false) {
			// oxlint-disable-next-line typescript/no-deprecated
			return await proxyRequestToAxios(workflow, additionalData, node, requestOptions);
		}

		// With `simple: false` (the HTTP Request node's "Never Error") a rejected token resolves
		// as a 401 response instead of throwing, so the catch below never refreshes it. Read the
		// status and give a 401 the same refresh-and-resend a thrown 401 gets, after the catch.
		// oxlint-disable-next-line typescript/no-deprecated
		const response = await proxyRequestToAxios(workflow, additionalData, node, {
			...requestOptions,
			resolveWithFullResponse: true,
		});
		if (response?.statusCode !== 401) {
			return requestOptions.resolveWithFullResponse ? response : response?.body;
		}
		unauthorized = { response, credentials: credentialsDecrypted };
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
					requestOptions = await additionalData.credentialsHelper.authenticate(
						credentialsDecrypted,
						credentialsType,
						requestOptions as IHttpRequestOptions,
						workflow,
						node,
					);
					// oxlint-disable-next-line typescript/no-deprecated
					return await proxyRequestToAxios(workflow, additionalData, node, requestOptions);
				}
			}
			throw error;
		} catch (error) {
			if (error instanceof ExecutionBaseError || hasPolicyRefusalMarker(error)) throw error;

			throw new NodeApiError(this.getNode(), error);
		}
	}

	// This runs outside the try above, so a failure here does not start the catch's
	// refresh-and-resend a second time.
	return await refreshAndResendUnauthorized.call(
		this,
		credentialsType,
		unauthorized,
		requestOptions,
		workflow,
		node,
		additionalData,
	);
}

/**
 * Refreshes the credential once after a `simple: false` request resolved with a 401 and resends
 * the request. Returns the 401 response when the credential has nothing to refresh, or when the
 * request body was consumed and cannot be sent again.
 */
async function refreshAndResendUnauthorized(
	this: IAllExecuteFunctions,
	credentialsType: string,
	unauthorized: { response: { body?: unknown }; credentials: ICredentialDataDecryptedObject },
	requestOptions: LegacyRequestOptions,
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
) {
	try {
		const refreshed = await additionalData.credentialsHelper.preAuthentication(
			{ helpers: this.helpers },
			unauthorized.credentials,
			credentialsType,
			node,
			true,
		);
		if (refreshed) {
			Object.assign(unauthorized.credentials, refreshed);
			if (!hasSingleUseBody(requestOptions)) {
				const authenticated = await additionalData.credentialsHelper.authenticate(
					unauthorized.credentials,
					credentialsType,
					requestOptions as IHttpRequestOptions,
					workflow,
					node,
				);
				// oxlint-disable-next-line typescript/no-deprecated
				return await proxyRequestToAxios(workflow, additionalData, node, authenticated);
			}
			this.logger.warn(
				`Request for credential type "${credentialsType}" was not retried after refreshing the credential: its multipart/stream body was consumed by the first attempt and cannot be sent again. Returning the original response instead.`,
			);
		}
	} catch (error) {
		if (error instanceof ExecutionBaseError || hasPolicyRefusalMarker(error)) throw error;

		throw new NodeApiError(this.getNode(), error);
	}
	return requestOptions.resolveWithFullResponse
		? unauthorized.response
		: unauthorized.response.body;
}
