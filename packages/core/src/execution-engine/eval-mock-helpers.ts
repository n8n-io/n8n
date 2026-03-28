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

// Throwaway RSA key for eval mode — allows jwt.sign() to succeed so requests
// reach the intercepted HTTP helpers. Not a secret, never leaves the process.
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
	const body = mock.body instanceof Buffer ? mock.body : Buffer.from(JSON.stringify(mock.body));
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
			headers: options?.headers as IHttpRequestOptions['headers'],
			body: options?.body,
			qs: options?.qs,
		};
	}
	return {
		url: uriOrObject.uri ?? uriOrObject.url ?? '',
		method: uriOrObject.method,
		headers: uriOrObject.headers as IHttpRequestOptions['headers'],
		body: uriOrObject.body,
		qs: uriOrObject.qs,
	};
}

/**
 * Call the eval mock handler and format its response for the calling helper.
 * When `returnFullResponse` is true, serializes to `{ body: Buffer, headers, statusCode }`
 * matching the shape that nodes expect from real HTTP responses.
 * Returns `undefined` if the handler did not produce a response.
 */
export async function callEvalMockHandler(
	handler: EvalLlmMockHandler,
	requestOptions: IHttpRequestOptions,
	node: INode,
	returnFullResponse?: boolean,
): Promise<unknown> {
	const response = await handler(requestOptions, node);
	if (!response) return undefined;
	return returnFullResponse ? serializeMockToHttpResponse(response) : response.body;
}
