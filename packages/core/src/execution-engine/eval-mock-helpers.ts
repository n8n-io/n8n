/**
 * Eval mock helpers — support code for LLM-based HTTP mocking during evaluation.
 *
 * Used by the credential bypass (node-execution-context.ts), HTTP interception
 * (request-helper-functions.ts), and workflow validation bypass (workflow-execute.ts).
 * All eval-specific logic in packages/core is either in this file or in the
 * type definitions in index.ts (module augmentation).
 */

import type { IHttpRequestOptions, INode, INodeProperties, IRequestOptions } from 'n8n-workflow';
import { Readable } from 'node:stream';

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

// Name patterns that indicate a property holds a secret value (case-insensitive).
const SECRET_NAME_PATTERNS =
	/key|secret|token|password|credential|auth|connectionString|apiToken|accessCode/i;

// Name patterns that indicate a property holds configuration (case-insensitive).
const CONFIG_NAME_PATTERNS =
	/url|host|region|endpoint|domain|subdomain|port|base|zone|server|namespace|org|project|team|site|instance|tenant|account(?!.*key)|workspace|bucket|database|schema|cluster|version/i;

/**
 * Determine whether a credential property is a secret that must be masked,
 * or a config value whose default should be preserved for the LLM mock layer.
 *
 * Classification order:
 * 1. `typeOptions.password` — explicit secret marker by credential authors
 * 2. Secret name patterns — catches unmarked keys/tokens/passwords
 * 3. Non-string types (boolean, number, options) — always config
 * 4. Config name patterns — URLs, regions, hosts, etc.
 * 5. Fallback — treat as secret (safe default: never leak to LLM)
 */
export function isSecretCredentialProperty(prop: INodeProperties): boolean {
	if (prop.typeOptions?.password === true) return true;
	if (SECRET_NAME_PATTERNS.test(prop.name)) return true;

	if (prop.type === 'boolean' || prop.type === 'number' || prop.type === 'options') return false;
	if (CONFIG_NAME_PATTERNS.test(prop.name)) return false;

	return true;
}

/** Format a property name into a descriptive placeholder, e.g. `secretAccessKey` → `<secret-access-key>`. */
function toPlaceholder(name: string): string {
	const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
	return `<${kebab}>`;
}

/**
 * Build mock credentials for eval mode from the credential type's property definitions.
 *
 * Secret properties (API keys, passwords, tokens) are replaced with a
 * descriptive placeholder like `<api-key>` so identifying credentials never
 * reach the LLM, while the placeholder makes it obvious the value was mocked.
 * Config properties (URLs, regions, hosts) keep their schema default values
 * so the LLM mock handler sees realistic request URLs and can generate
 * accurate responses.
 *
 * Also includes auth-related fields (OAuth tokens, RSA keys) that nodes need
 * beyond the UI properties — nodes pick what they need and ignore the rest.
 */
export function buildEvalMockCredentials(properties: INodeProperties[]): Record<string, unknown> {
	const mockCredentials: Record<string, unknown> = {};
	for (const prop of properties) {
		if (prop.type === 'json') {
			// Nodes `jsonParse` these before the request — must be valid JSON.
			mockCredentials[prop.name] =
				typeof prop.default === 'string' && prop.default.trim() ? prop.default : '{}';
		} else if (isSecretCredentialProperty(prop)) {
			mockCredentials[prop.name] = toPlaceholder(prop.name);
		} else {
			mockCredentials[prop.name] = prop.default ?? toPlaceholder(prop.name);
		}
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
 * Shape a mock response to match what axios's `result.data` would be for the
 * same request. Node code reads body based on the request's `encoding` field,
 * which maps 1:1 onto axios `responseType`.
 *
 * `__bodyResolved` tells HttpRequestV3 the body is already consumer-ready so
 * it skips its Buffer→string→JSON.parse pipeline (which would crash on a
 * plain object with "stream.on is not a function").
 */
export function serializeMockToHttpResponse(
	mock: EvalMockHttpResponse,
	requestOptions?: IHttpRequestOptions,
) {
	const common = {
		headers: mock.headers,
		statusCode: mock.statusCode,
		statusMessage: 'OK',
	};

	const bytes = () =>
		mock.body instanceof Buffer
			? mock.body
			: Buffer.from(typeof mock.body === 'string' ? mock.body : JSON.stringify(mock.body ?? ''));

	switch (requestOptions?.encoding) {
		case 'stream':
			return { ...common, body: Readable.from(bytes()) };
		case 'arraybuffer':
		case 'blob':
			return { ...common, body: bytes() };
		case 'text':
			return {
				...common,
				body:
					mock.body instanceof Buffer
						? mock.body.toString()
						: typeof mock.body === 'string'
							? mock.body
							: JSON.stringify(mock.body ?? ''),
				__bodyResolved: true,
			};
	}

	// Default path (encoding is 'json' or undefined) — axios would return
	// parsed data. If the mock already produced a parsed object, hand it
	// through. If it handed us raw bytes, return them and let the node decode.
	if (mock.body instanceof Buffer) {
		return { ...common, body: mock.body };
	}
	return { ...common, body: mock.body, __bodyResolved: true };
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

	return returnFullResponse ? serializeMockToHttpResponse(response, requestOptions) : response.body;
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
