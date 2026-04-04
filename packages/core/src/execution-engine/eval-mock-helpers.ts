/**
 * Eval mock helpers — support code for LLM-based HTTP mocking during evaluation.
 *
 * Used by the credential bypass (node-execution-context.ts), HTTP interception
 * (request-helper-functions.ts), and workflow validation bypass (workflow-execute.ts).
 * All eval-specific logic in packages/core is either in this file or in the
 * type definitions in index.ts (module augmentation).
 */

import type { IHttpRequestOptions, INode, IRequestOptions } from 'n8n-workflow';

import type { EvalLlmMockHandler, EvalMockHttpResponse } from './index';

// ---------------------------------------------------------------------------
// Mock credentials
// ---------------------------------------------------------------------------

// NOT A SECRET — throwaway RSA key used only in eval mode to satisfy OAuth
// signing requirements so HTTP requests reach the interception layer. This key
// has no access to any real service. It never leaves the process. The mock
// credential system needs a structurally valid key for jwt.sign() to succeed;
// without it, OAuth nodes crash before the HTTP interceptor can capture the request.
// Generated once offline via: openssl genrsa 2048
// prettier-ignore
const EVAL_MOCK_RSA_KEY =
	'-----BEGIN RSA PRIVATE KEY-----\n' +
	'MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWep4PAtGoRBh2hHiwxBgNlHOVMSMk7\n' +
	'R1ueXBOwqmLMSsGCnl1kV2QLFG6mnMBOxJBbXGLuzJsFMDPCnZGfnJBfcCnxGYCE\n' +
	'c0bO3GN/S4Lk1eTarfEDQC/k0GFyyGPMQ5rnmZxSOqX1MtVCoB5FEGnLJEMqNFDt\n' +
	'tJmYMmzxR9Lgd7bVMOYG8xDT/PYWw28GdgNZhAIPqFVHqMjUFWC76Q8rA6OF4OU0\n' +
	'S0IAejdh3LGAzMIjCMfmSBn+VaRzcBVoKBpZgN0a1YjqFCr8LpqpMIxLfm+7SIdB\n' +
	'Z6YWxEeOwKoiMIB9drmHO2lNzSTmblOKMPmqJwIDAQABAoIBAC5RgZ+hBx7xHNaM\n' +
	'pPgwGMnCd3KE2M8RMBx1bfOUEODjQx7E3fOtqqa4HNqVGz9HBfVzL4JBpYCknI1X\n' +
	'p9Dxd6hf0Ht5BPMWxPBqKGhqCSxIxwvGLShDANGKbjilSTkmhGBDrGj3U0DRXKxmU\n' +
	'i6jDP0VJwy9ZmkBqxJvYEhW0m+fQd0JJKQ5HRk2RNXoP+GBmZsBeIs4uAt14i6n4\n' +
	'kfYCR9CMSBC6DlNWxqGSAWzPrKAMPMiL5GJWGhy+A4DEXPewYQ6LpbD4xXEJN2v7\n' +
	'Tae0YYjM/B7oy3JV5UsMaQKBgQDjYKMcn8io6Ei7RDYH8sMpKLejIEjE7ksMvYCk\n' +
	'1RGx/w0Q3n5FVjMP3oG3UcUx9EB7GD8NMo74J/lEJ2UsBnIP3ggOb3AE+pWHNE0K\n' +
	'-----END RSA PRIVATE KEY-----';

/**
 * Build mock credentials for eval mode from the credential type's property definitions.
 * Includes auth-related fields (OAuth tokens, RSA keys) that nodes need beyond
 * the UI properties — nodes pick what they need and ignore the rest.
 */
export function buildEvalMockCredentials(
	properties: Array<{ name: string }>,
): Record<string, unknown> {
	const mockCredentials: Record<string, unknown> = {};
	for (const prop of properties) {
		mockCredentials[prop.name] = 'eval-mock-value';
	}
	mockCredentials.oauthTokenData = {
		access_token: 'eval-mock-access-token',
		token_type: 'Bearer',
		refresh_token: 'eval-mock-refresh-token',
	};
	mockCredentials.privateKey = EVAL_MOCK_RSA_KEY;
	return mockCredentials;
}

// ---------------------------------------------------------------------------
// HTTP response helpers
// ---------------------------------------------------------------------------

/**
 * Convert an EvalMockHttpResponse into the full-response shape that callers expect
 * when `returnFullResponse` / `resolveWithFullResponse` is true.
 * Body is serialized to a Buffer so downstream processing (binary detection,
 * encoding detection, stream handling) works exactly as with a real HTTP response.
 */
export function serializeMockToHttpResponse(mock: EvalMockHttpResponse) {
	const body =
		mock.body instanceof Buffer
			? mock.body
			: Buffer.from(typeof mock.body === 'string' ? mock.body : JSON.stringify(mock.body));
	return { body, headers: mock.headers, statusCode: mock.statusCode, statusMessage: 'OK' };
}

/** Normalize legacy IRequestOptions or (uri, options) args into IHttpRequestOptions for the eval mock handler. */
export function normalizeLegacyRequest(
	uriOrObject: string | IRequestOptions,
	options?: IRequestOptions,
): IHttpRequestOptions {
	if (typeof uriOrObject === 'string') {
		return {
			url: uriOrObject,
			method: options?.method,
			headers: options?.headers,
			body: options?.body as IHttpRequestOptions['body'],
			qs: options?.qs,
		};
	}
	return {
		url: uriOrObject.uri ?? uriOrObject.url ?? '',
		method: uriOrObject.method,
		headers: uriOrObject.headers,
		body: uriOrObject.body as IHttpRequestOptions['body'],
		qs: uriOrObject.qs,
	};
}

/**
 * Call the eval mock handler and format its response for the calling helper.
 * When `returnFullResponse` is true, serializes to `{ body: Buffer, headers, statusCode }`
 * matching the shape that nodes expect from real HTTP responses.
 * For error responses (status >= 400), throws an error matching the HTTP library's
 * error shape so nodes handle it identically to real HTTP failures.
 * Returns `undefined` if the handler did not produce a response.
 */
export async function callEvalMockHandler(
	handler: EvalLlmMockHandler,
	requestOptions: IHttpRequestOptions,
	node: INode,
	returnFullResponse?: boolean,
	httpLibrary: 'axios' | 'legacy' = 'axios',
): Promise<unknown> {
	const response = await handler(requestOptions, node);
	if (!response) return undefined;

	if (response.statusCode >= 400) {
		throwHttpError(response, httpLibrary);
	}

	return returnFullResponse ? serializeMockToHttpResponse(response) : response.body;
}

/**
 * Throw an error matching what the real HTTP library would throw,
 * so node error handling (retries, continueOnFail, NodeApiError) works identically.
 */
function throwHttpError(response: EvalMockHttpResponse, library: 'axios' | 'legacy'): never {
	const message = `Request failed with status code ${response.statusCode}`;

	if (library === 'axios') {
		// Match AxiosError shape: error.response.{status, data, headers}, error.isAxiosError
		throw Object.assign(new Error(message), {
			isAxiosError: true,
			response: {
				status: response.statusCode,
				statusText: message,
				data: response.body,
				headers: response.headers,
			},
		});
	}

	// Match legacy request-promise error shape: error.statusCode, error.response.body
	throw Object.assign(new Error(message), {
		statusCode: response.statusCode,
		response: {
			statusCode: response.statusCode,
			body: response.body,
			headers: response.headers,
		},
	});
}
