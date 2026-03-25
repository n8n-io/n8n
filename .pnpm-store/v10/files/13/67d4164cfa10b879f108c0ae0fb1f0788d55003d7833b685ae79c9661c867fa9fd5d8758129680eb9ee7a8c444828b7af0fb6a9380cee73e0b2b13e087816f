import packageJson from '../package.json';
import { APIResponseError, AuthError } from './error';

// same as n8n
type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';
interface User {
	id: string;
}

export type SchemaType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'bigint'
	| 'symbol'
	| 'array'
	| 'object'
	| 'function'
	| 'null'
	| 'undefined';

type Schema = { type: SchemaType; key?: string; value: string | Schema[]; path: string };

export namespace AiAssistantSDK {
	export interface ApplySuggestionResponse {
		sessionId: string;
		parameters: object;
	}

	export interface ChatRequestPayload {
		payload: object;
		sessionId?: string;
	}

	export interface ChatResponsePayload {
		sessionId?: string;
		messages: object[];
	}

	export interface AskAiRequestPayload {
		question: string;
		context: {
			schema: Array<{ nodeName: string; schema: Schema }>;
			inputSchema: { nodeName: string; schema: Schema };
			pushRef: string;
			ndvPushRef: string;
		};
		forNode: string;
	}

	export interface AskAiResponsePayload {
		code: string;
	}

	export interface AiCreditResponsePayload {
		apiKey: string;
		url: string;
	}

	export interface BuilderApiProxyTokenResponse {
		accessToken: string;
		tokenType: string;
	}
	export interface BuilderInstanceCreditsRequest {
		licenseCert: string;
	}

	export interface BuilderInstanceCreditsResponse {
		creditsQuota: number;
		creditsClaimed: number;
	}
}

export { APIResponseError, AuthError } from './error';

const isObjectWithErrorMessage = (data: unknown): data is { message: string } => {
	return (
		typeof data === 'object' &&
		data !== null &&
		'message' in data &&
		typeof data?.message === 'string'
	);
};

const DEFAULT_SERVICE_BASE_URL = 'https://ai-assistant.n8n.io';

export class AiAssistantClient {
	private licenseCert: string;
	private consumerId: string;
	private n8nVersion: string;
	private instanceId: string;
	private baseUrl = DEFAULT_SERVICE_BASE_URL;
	private logLevel = 'info';
	private activeToken: string | undefined;

	/**
	 * Create a client for the AI service.
	 * @param licenseCert - The license certificate. You can get it from the n8n.
	 * @param consumerId - The consumer ID.
	 * @param n8nVersion - The n8n version.
	 * @param instanceId - The n8n instance ID.
	 * @param baseUrl - The base URL of the AI service API.
	 * @returns {RequestHandler}
	 */
	constructor({
		licenseCert,
		consumerId,
		n8nVersion,
		instanceId,
		baseUrl,
		logLevel,
	}: {
		licenseCert: string;
		consumerId: string;
		n8nVersion: string;
		instanceId: string;
		baseUrl?: string;
		logLevel?: LogLevel;
	}) {
		this.licenseCert = licenseCert;
		this.consumerId = consumerId;
		this.n8nVersion = n8nVersion;
		this.instanceId = instanceId;
		this.baseUrl = baseUrl ?? this.baseUrl;
		this.logLevel = logLevel ?? this.logLevel;

		this.debug('Initializing AI Assistant Service Client', {
			baseUrl: this.baseUrl,
			consumerId: this.consumerId,
			n8nVersion: this.n8nVersion,
			licenseCert: this.licenseCert.substring(0, 5),
		});
	}

	async chat(payload: AiAssistantSDK.ChatRequestPayload, user: User): Promise<Response> {
		return await this.postRequest('/v1/chat', payload, user);
	}

	async applySuggestion(
		payload: {
			sessionId: string;
			suggestionId: string;
		},
		user: User,
	): Promise<AiAssistantSDK.ApplySuggestionResponse> {
		const response = await this.postRequest('/v1/chat/apply-suggestion', payload, user);

		const data = await response.json();
		if (isValidApplySuggestionResponse(data)) {
			return data;
		}

		throw new APIResponseError('Invalid response from assistant service');
	}

	async askAi(
		payload: AiAssistantSDK.AskAiRequestPayload,
		user: User,
	): Promise<AiAssistantSDK.AskAiResponsePayload> {
		{
			const response = await this.postRequest('/v1/ask-ai', payload, user);

			const data = await response.json();

			if (isValidAskAiResponse(data)) {
				return data;
			}

			throw new APIResponseError('Invalid response from assistant service');
		}
	}

	async generateAiCreditsCredentials(user: User): Promise<AiAssistantSDK.AiCreditResponsePayload> {
		{
			const url = `${this.baseUrl}/v1/ai-credits/credentials`;

			try {
				const response = await fetch(url, {
					headers: this.getHeaders(user),
					method: 'POST',
					body: JSON.stringify({
						licenseCert: this.licenseCert,
					}),
				});

				const data = await response.json();

				if (isValidAiCreditsResponse(data)) {
					return data;
				}

				throw new APIResponseError('Invalid response from assistant service');
			} catch (error) {
				if (isObjectWithErrorMessage(error)) {
					throw new APIResponseError(error.message);
				} else {
					throw new APIResponseError('unknown error');
				}
			}
		}
	}

	getApiProxyBaseUrl(): string {
		return this.baseUrl + '/v1/api-proxy';
	}

	/**
	 * Update the license certificate and clear the active token.
	 * This should be called when the license is renewed or changed.
	 * @param licenseCert - The new license certificate.
	 */
	updateLicenseCert(licenseCert: string): void {
		this.licenseCert = licenseCert;
		this.activeToken = undefined;
	}

	async getBuilderApiProxyToken(
		user: User,
		options?: { userMessageId?: string },
	): Promise<AiAssistantSDK.BuilderApiProxyTokenResponse> {
		const url = `${this.baseUrl}/v1/builder/api-proxy-token`;

		try {
			const response = await fetch(url, {
				headers: this.getHeaders(user),
				method: 'POST',
				body: JSON.stringify({
					licenseCert: this.licenseCert,
					userMessageId: options?.userMessageId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = isObjectWithErrorMessage(errorData)
					? errorData.message
					: `Failed to get builder API proxy token: ${response.statusText}`;
				throw new APIResponseError(errorMessage);
			}

			const data = await response.json();

			if (isValidBuilderApiProxyTokenResponse(data)) {
				return data;
			}

			throw new APIResponseError('Invalid response from assistant service');
		} catch (error) {
			if (isObjectWithErrorMessage(error)) {
				throw new APIResponseError(error.message);
			} else {
				throw new APIResponseError('unknown error');
			}
		}
	}

	async markBuilderSuccess(
		user: User,
		headers: { Authorization: string },
	): Promise<{ creditsQuota: number; creditsClaimed: number }> {
		const url = `${this.baseUrl}/v1/builder/success`;

		try {
			const response = await fetch(url, {
				headers: {
					...this.getHeaders(user),
					'x-authorization': headers.Authorization,
				},
				body: JSON.stringify({
					licenseCert: this.licenseCert,
				}),
				method: 'POST',
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = isObjectWithErrorMessage(errorData)
					? errorData.message
					: `Failed to mark builder success: ${response.statusText}`;
				throw new APIResponseError(errorMessage);
			}

			const data = await response.json();
			if (!isValidBuilderInstanceCreditsResponse(data)) {
				throw new APIResponseError('Invalid response from assistant service');
			}
			return data;
		} catch (error) {
			if (isObjectWithErrorMessage(error)) {
				throw new APIResponseError(error.message);
			} else {
				throw new APIResponseError('unknown error');
			}
		}
	}

	async getBuilderInstanceCredits(
		user: User,
	): Promise<AiAssistantSDK.BuilderInstanceCreditsResponse> {
		const url = `${this.baseUrl}/v1/builder/usage`;

		try {
			const response = await fetch(url, {
				headers: this.getHeaders(user),
				method: 'POST',
				body: JSON.stringify({
					licenseCert: this.licenseCert,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = isObjectWithErrorMessage(errorData)
					? errorData.message
					: `Failed to get builder usage: ${response.statusText}`;
				throw new APIResponseError(errorMessage);
			}

			const data = await response.json();

			if (isValidBuilderInstanceCreditsResponse(data)) {
				return data;
			}

			throw new APIResponseError('Invalid response from assistant service');
		} catch (error) {
			if (isObjectWithErrorMessage(error)) {
				throw new APIResponseError(error.message);
			} else {
				throw new APIResponseError('unknown error');
			}
		}
	}

	private getHeadersWithAuthToken(user: User) {
		return {
			authorization: `Bearer ${this.activeToken}`,
			...this.getHeaders(user),
		};
	}

	private getHeaders(user: User) {
		return {
			'Content-Type': 'application/json',
			'x-consumer-id': this.consumerId,
			'x-user-id': user.id,
			'x-sdk-version': packageJson.version,
			'x-n8n-version': this.n8nVersion,
			'x-instance-id': this.instanceId,
		};
	}

	private async refreshAuthToken(): Promise<void> {
		const response = await fetch(`${this.baseUrl}/auth/token`, {
			method: 'POST',
			body: JSON.stringify({ licenseCert: this.licenseCert }),
			headers: { 'Content-Type': 'application/json' },
		});

		const data = await response.json();
		if (
			typeof data === 'object' &&
			data &&
			'accessToken' in data &&
			data.accessToken &&
			typeof data.accessToken === 'string'
		) {
			this.activeToken = data.accessToken;
			return;
		}

		const errorMessage = isObjectWithErrorMessage(data) ? data.message : 'Unknown error';

		throw new AuthError(`Could not retrieve access token: ${errorMessage}`);
	}

	private async postRequest(endpoint: string, payload: object, user: User): Promise<Response> {
		if (!this.activeToken) {
			await this.refreshAuthToken();
		}

		if (!this.activeToken) {
			throw new AuthError('No token to call assistant service');
		}

		const url = `${this.baseUrl}${endpoint}`;
		let response = await fetch(url, {
			headers: this.getHeadersWithAuthToken(user),
			method: 'POST',
			body: JSON.stringify(payload),
		});

		// retry if unauthorized (token is expired)
		if (!response.ok && response.status === 401) {
			await this.refreshAuthToken();

			response = await fetch(url, {
				headers: this.getHeadersWithAuthToken(user),
				method: 'POST',
				body: JSON.stringify(payload),
			});
		} else if (!response.ok) {
			const error = await response.json();
			this.debug(`API Error ${JSON.stringify(error)}`);
			const message =
				typeof error === 'object' &&
				error &&
				'message' in error &&
				typeof error.message === 'string'
					? error.message
					: response.statusText;
			throw new APIResponseError(message, response.status);
		}

		return response;
	}

	private debug(message: string, debugInfo?: Record<string, string | number>) {
		if (this.logLevel === 'debug') {
			console.debug(formatLog(message), formatLog(JSON.stringify(debugInfo)));
		}
	}
}

function formatLog(message: string) {
	return `[ai-assistant-sdk] ${message}`;
}

function isValidApplySuggestionResponse(
	response: unknown,
): response is AiAssistantSDK.ApplySuggestionResponse {
	return (
		typeof response === 'object' &&
		!!response &&
		'parameters' in response &&
		'sessionId' in response
	);
}

function isValidAskAiResponse(response: unknown): response is AiAssistantSDK.AskAiResponsePayload {
	return typeof response === 'object' && !!response && 'code' in response;
}

function isValidAiCreditsResponse(
	response: unknown,
): response is AiAssistantSDK.AiCreditResponsePayload {
	return typeof response === 'object' && !!response && 'apiKey' in response && 'url' in response;
}

function isValidBuilderApiProxyTokenResponse(
	response: unknown,
): response is AiAssistantSDK.BuilderApiProxyTokenResponse {
	return (
		typeof response === 'object' &&
		!!response &&
		'accessToken' in response &&
		'tokenType' in response &&
		typeof response.accessToken === 'string' &&
		typeof response.tokenType === 'string'
	);
}

function isValidBuilderInstanceCreditsResponse(
	response: unknown,
): response is AiAssistantSDK.BuilderInstanceCreditsResponse {
	return (
		typeof response === 'object' &&
		!!response &&
		'creditsQuota' in response &&
		'creditsClaimed' in response &&
		typeof response.creditsQuota === 'number' &&
		typeof response.creditsClaimed === 'number'
	);
}
