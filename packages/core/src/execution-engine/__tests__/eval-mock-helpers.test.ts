import { mock } from 'jest-mock-extended';
import type { IHttpRequestOptions, INode, INodeProperties, IRequestOptions } from 'n8n-workflow';
import { Readable } from 'node:stream';

import {
	buildEvalMockCredentials,
	callEvalMockHandler,
	isSecretCredentialProperty,
	normalizeLegacyRequest,
	serializeMockToHttpResponse,
} from '../eval-mock-helpers';
import type { EvalLlmMockHandler, EvalMockHttpResponse } from '../index';

// ---------------------------------------------------------------------------
// Helper to build a minimal INodeProperties with sensible defaults
// ---------------------------------------------------------------------------
function credProp(overrides: Partial<INodeProperties> & { name: string }): INodeProperties {
	return {
		displayName: overrides.name,
		type: 'string',
		default: '',
		...overrides,
	};
}

describe('eval-mock-helpers', () => {
	// -----------------------------------------------------------------------
	// isSecretCredentialProperty
	// -----------------------------------------------------------------------
	describe('isSecretCredentialProperty', () => {
		it('should classify typeOptions.password as secret', () => {
			expect(
				isSecretCredentialProperty(
					credProp({ name: 'someField', typeOptions: { password: true } }),
				),
			).toBe(true);
		});

		it('should classify secret name patterns as secret', () => {
			const secretNames = [
				'apiKey',
				'secretAccessKey',
				'accessToken',
				'password',
				'credentials',
				'authHeader',
				'connectionString',
			];
			for (const name of secretNames) {
				expect(isSecretCredentialProperty(credProp({ name }))).toBe(true);
			}
		});

		it('should classify boolean, number, and options types as config', () => {
			expect(
				isSecretCredentialProperty(credProp({ name: 'useTls', type: 'boolean', default: false })),
			).toBe(false);
			expect(
				isSecretCredentialProperty(credProp({ name: 'port', type: 'number', default: 5432 })),
			).toBe(false);
			expect(
				isSecretCredentialProperty(
					credProp({
						name: 'region',
						type: 'options',
						default: 'us-east-1',
						options: [{ name: 'US East', value: 'us-east-1' }],
					}),
				),
			).toBe(false);
		});

		it('should classify config name patterns as config', () => {
			const configNames = [
				'baseUrl',
				'hostname',
				'region',
				'endpoint',
				'subdomain',
				'domain',
				'server',
				'namespace',
				'workspace',
				'database',
			];
			for (const name of configNames) {
				expect(isSecretCredentialProperty(credProp({ name }))).toBe(false);
			}
		});

		it('should fall back to secret for ambiguous string properties', () => {
			expect(isSecretCredentialProperty(credProp({ name: 'customField' }))).toBe(true);
		});

		it('should treat secret name patterns as secret even when type is non-string', () => {
			// Secret name patterns take priority over type-based classification
			expect(
				isSecretCredentialProperty(credProp({ name: 'apiKey', type: 'number', default: 0 })),
			).toBe(true);
		});
	});

	// -----------------------------------------------------------------------
	// buildEvalMockCredentials
	// -----------------------------------------------------------------------
	describe('buildEvalMockCredentials', () => {
		it('should mock secret properties with descriptive placeholders', () => {
			const result = buildEvalMockCredentials([
				credProp({ name: 'apiKey', typeOptions: { password: true } }),
				credProp({ name: 'secretAccessKey' }),
			]);

			expect(result.apiKey).toBe('<api-key>');
			expect(result.secretAccessKey).toBe('<secret-access-key>');
		});

		it('should preserve default values for config properties', () => {
			const result = buildEvalMockCredentials([
				credProp({ name: 'baseUrl', default: 'https://api.example.com' }),
				credProp({ name: 'region', type: 'options', default: 'eu-west-1' }),
				credProp({ name: 'port', type: 'number', default: 443 }),
				credProp({ name: 'useTls', type: 'boolean', default: true }),
			]);

			expect(result.baseUrl).toBe('https://api.example.com');
			expect(result.region).toBe('eu-west-1');
			expect(result.port).toBe(443);
			expect(result.useTls).toBe(true);
		});

		it('should fall back to placeholder for config properties with no default', () => {
			const result = buildEvalMockCredentials([
				credProp({ name: 'endpoint', default: undefined as unknown as string }),
			]);

			expect(result.endpoint).toBe('<endpoint>');
		});

		it('should handle a realistic credential with mixed secret and config properties', () => {
			const result = buildEvalMockCredentials([
				credProp({ name: 'accessKeyId' }),
				credProp({
					name: 'secretAccessKey',
					typeOptions: { password: true },
				}),
				credProp({
					name: 'region',
					type: 'options',
					default: 'us-east-1',
					options: [
						{ name: 'US East', value: 'us-east-1' },
						{ name: 'EU West', value: 'eu-west-1' },
					],
				}),
				credProp({ name: 'customEndpoint', default: 'https://s3.amazonaws.com' }),
			]);

			// Secrets
			expect(result.accessKeyId).toBe('<access-key-id>');
			expect(result.secretAccessKey).toBe('<secret-access-key>');
			// Config
			expect(result.region).toBe('us-east-1');
			expect(result.customEndpoint).toBe('https://s3.amazonaws.com');
		});

		it('should always include oauthTokenData with access_token, token_type, and refresh_token', () => {
			const result = buildEvalMockCredentials([
				credProp({ name: 'apiKey', typeOptions: { password: true } }),
			]);

			expect(result.oauthTokenData).toEqual({
				access_token: 'eval-mock-access-token',
				token_type: 'Bearer',
				refresh_token: 'eval-mock-refresh-token',
			});
		});

		it('should always include a privateKey containing an RSA key', () => {
			const result = buildEvalMockCredentials([
				credProp({ name: 'apiKey', typeOptions: { password: true } }),
			]);

			expect(result.privateKey).toEqual(expect.stringContaining('BEGIN RSA PRIVATE KEY'));
			expect(result.privateKey).toEqual(expect.stringContaining('END RSA PRIVATE KEY'));
		});

		it('should return oauthTokenData and privateKey even with empty properties array', () => {
			const result = buildEvalMockCredentials([]);

			expect(Object.keys(result)).toEqual(expect.arrayContaining(['oauthTokenData', 'privateKey']));
			expect(result.oauthTokenData).toBeDefined();
			expect(result.privateKey).toBeDefined();
		});
	});

	// -----------------------------------------------------------------------
	// serializeMockToHttpResponse
	// -----------------------------------------------------------------------
	describe('serializeMockToHttpResponse', () => {
		it('should pass through a JSON body as the parsed object', () => {
			const mockResponse: EvalMockHttpResponse = {
				body: { message: 'hello' },
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse);

			expect(result.body).toEqual({ message: 'hello' });
			expect(Buffer.isBuffer(result.body)).toBe(false);
		});

		it('should mark JSON responses as __bodyResolved', () => {
			// HttpRequestV3's autodetect path only re-decodes body if
			// __bodyResolved is falsy. When we hand over a parsed object we must
			// set this flag so the node skips its Buffer→string→parse pipeline.
			const mockResponse: EvalMockHttpResponse = {
				body: [{ id: 1 }],
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse) as { __bodyResolved?: boolean };

			expect(result.__bodyResolved).toBe(true);
		});

		it('should pass string bodies through as-is with __bodyResolved on the default path', () => {
			// Matches axios default (responseType: 'json') which returns the
			// original string when JSON.parse fails — consumer-ready.
			const mockResponse: EvalMockHttpResponse = {
				body: 'plain text',
				headers: { 'content-type': 'text/plain' },
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse) as {
				body: unknown;
				__bodyResolved?: boolean;
			};

			expect(result.body).toBe('plain text');
			expect(result.__bodyResolved).toBe(true);
		});

		it('should match JSON content types with charset parameters', () => {
			const mockResponse: EvalMockHttpResponse = {
				body: [{ id: 1 }, { id: 2 }],
				headers: { 'content-type': 'application/json; charset=utf-8' },
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse);

			expect(result.body).toEqual([{ id: 1 }, { id: 2 }]);
			expect(Buffer.isBuffer(result.body)).toBe(false);
		});

		it('should accept mixed-case Content-Type headers', () => {
			const mockResponse: EvalMockHttpResponse = {
				body: { ok: true },
				headers: { 'Content-Type': 'application/json' },
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse);

			expect(result.body).toEqual({ ok: true });
			expect(Buffer.isBuffer(result.body)).toBe(false);
		});

		it('should pass object bodies through regardless of content-type on the default path', () => {
			// Content-Type is not the gatekeeper — axios's default responseType
			// ('json') parses any parseable body. The mock respects the
			// producer's chosen body shape and marks it consumer-ready.
			const mockResponse: EvalMockHttpResponse = {
				body: { message: 'hello' },
				headers: { 'content-type': 'text/plain' },
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse) as {
				body: unknown;
				__bodyResolved?: boolean;
			};

			expect(result.body).toEqual({ message: 'hello' });
			expect(result.__bodyResolved).toBe(true);
		});

		it('should pass object bodies through as-is when no content-type is set', () => {
			// Matches axios's default behavior (responseType: 'json') — when no
			// Content-Type is declared, axios tries to JSON.parse the body, so
			// the mock hands over the already-parsed object with __bodyResolved.
			const mockResponse: EvalMockHttpResponse = {
				body: { message: 'hello' },
				headers: {},
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse);

			expect(result.body).toEqual({ message: 'hello' });
			expect((result as { __bodyResolved?: boolean }).__bodyResolved).toBe(true);
		});

		it('should preserve headers and statusCode', () => {
			const mockResponse: EvalMockHttpResponse = {
				body: { ok: true },
				headers: { 'x-custom': 'value' },
				statusCode: 201,
			};

			const result = serializeMockToHttpResponse(mockResponse);

			expect(result.headers).toEqual({ 'x-custom': 'value' });
			expect(result.statusCode).toBe(201);
			expect(result.statusMessage).toBe('OK');
		});

		it('should pass through a Buffer body without double-encoding', () => {
			const originalBuffer = Buffer.from('raw-binary-data');
			const mockResponse: EvalMockHttpResponse = {
				body: originalBuffer,
				headers: {},
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse);

			expect(result.body).toBe(originalBuffer);
			expect((result.body as Buffer).toString()).toBe('raw-binary-data');
		});

		it('should pass a Buffer body through even when Content-Type is JSON', () => {
			// If the mock handler hands us a Buffer explicitly, trust it — don't
			// silently unwrap it to an object just because headers claim JSON.
			const originalBuffer = Buffer.from('{"already":"serialized"}');
			const mockResponse: EvalMockHttpResponse = {
				body: originalBuffer,
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};

			const result = serializeMockToHttpResponse(mockResponse);

			expect(result.body).toBe(originalBuffer);
		});

		// -----------------------------------------------------------------------
		// Request-aware body shaping — matches axios responseType behavior
		// -----------------------------------------------------------------------
		describe('with request options (axios-parity mode)', () => {
			const jsonResponse: EvalMockHttpResponse = {
				body: { data: [1, 2, 3] },
				headers: { 'content-type': 'application/json' },
				statusCode: 200,
			};

			it('should return a Readable stream when requestOptions.encoding is "stream"', async () => {
				const result = serializeMockToHttpResponse(jsonResponse, {
					url: 'https://api.example.com/file',
					encoding: 'stream',
				});

				expect(result.body).toBeInstanceOf(Readable);
				// Consume the stream to verify it holds the serialized body bytes.
				const chunks: Buffer[] = [];
				for await (const chunk of result.body as Readable) {
					chunks.push(chunk as Buffer);
				}
				expect(Buffer.concat(chunks).toString()).toBe(JSON.stringify({ data: [1, 2, 3] }));
			});

			it('should return a Buffer when requestOptions.encoding is "arraybuffer"', () => {
				const result = serializeMockToHttpResponse(jsonResponse, {
					url: 'https://api.example.com/image',
					encoding: 'arraybuffer',
				});

				expect(Buffer.isBuffer(result.body)).toBe(true);
				expect((result.body as Buffer).toString()).toBe(JSON.stringify({ data: [1, 2, 3] }));
				// No __bodyResolved flag on the Buffer path — the node still needs to decode.
				expect((result as { __bodyResolved?: boolean }).__bodyResolved).toBeUndefined();
			});

			it('should return parsed body + __bodyResolved in the default (JSON) path', () => {
				const result = serializeMockToHttpResponse(jsonResponse, {
					url: 'https://api.example.com/posts',
				});

				expect(result.body).toEqual({ data: [1, 2, 3] });
				expect(Buffer.isBuffer(result.body)).toBe(false);
				expect((result as { __bodyResolved?: boolean }).__bodyResolved).toBe(true);
			});

			it('should pass text responses through as strings on the default path', () => {
				// The default path (undefined encoding) matches axios responseType:'json',
				// which keeps unparseable strings as strings — not Buffers.
				const textResponse: EvalMockHttpResponse = {
					body: 'hello world',
					headers: { 'content-type': 'text/plain' },
					statusCode: 200,
				};

				const result = serializeMockToHttpResponse(textResponse, {
					url: 'https://api.example.com/robots.txt',
				});

				expect(result.body).toBe('hello world');
				expect((result as { __bodyResolved?: boolean }).__bodyResolved).toBe(true);
			});

			it('should preserve a Buffer body on the stream path (wrap, not copy)', async () => {
				const bufferResponse: EvalMockHttpResponse = {
					body: Buffer.from('raw bytes'),
					headers: { 'content-type': 'application/octet-stream' },
					statusCode: 200,
				};

				const result = serializeMockToHttpResponse(bufferResponse, {
					url: 'https://api.example.com/file',
					encoding: 'stream',
				});

				expect(result.body).toBeInstanceOf(Readable);
				const chunks: Buffer[] = [];
				for await (const chunk of result.body as Readable) {
					chunks.push(chunk as Buffer);
				}
				expect(Buffer.concat(chunks).toString()).toBe('raw bytes');
			});

			it('should pass Buffer through unchanged on the arraybuffer path', () => {
				const original = Buffer.from('raw bytes');
				const bufferResponse: EvalMockHttpResponse = {
					body: original,
					headers: { 'content-type': 'application/octet-stream' },
					statusCode: 200,
				};

				const result = serializeMockToHttpResponse(bufferResponse, {
					url: 'https://api.example.com/file',
					encoding: 'arraybuffer',
				});

				expect(result.body).toBe(original);
			});

			it('should return a string body + __bodyResolved when encoding is "text"', () => {
				const textResponse: EvalMockHttpResponse = {
					body: 'hello world',
					headers: { 'content-type': 'text/plain' },
					statusCode: 200,
				};

				const result = serializeMockToHttpResponse(textResponse, {
					url: 'https://api.example.com/robots.txt',
					encoding: 'text',
				});

				expect(result.body).toBe('hello world');
				expect((result as { __bodyResolved?: boolean }).__bodyResolved).toBe(true);
			});
		});
	});

	// -----------------------------------------------------------------------
	// normalizeLegacyRequest
	// -----------------------------------------------------------------------
	describe('normalizeLegacyRequest', () => {
		it('should convert string URI + options object into IHttpRequestOptions', () => {
			const options: IRequestOptions = {
				method: 'POST',
				headers: { Authorization: 'Bearer token' },
				body: { key: 'value' },
				qs: { page: '1' },
				uri: 'ignored-when-string-first-arg',
			};

			const result = normalizeLegacyRequest('https://api.example.com/data', options);

			expect(result.url).toBe('https://api.example.com/data');
			expect(result.method).toBe('POST');
			expect(result.headers).toEqual({ Authorization: 'Bearer token' });
			expect(result.body).toEqual({ key: 'value' });
			expect(result.qs).toEqual({ page: '1' });
		});

		it('should use uri field when given an IRequestOptions object with uri', () => {
			const requestObj: IRequestOptions = {
				uri: 'https://api.example.com/from-uri',
				method: 'GET',
			};

			const result = normalizeLegacyRequest(requestObj);

			expect(result.url).toBe('https://api.example.com/from-uri');
			expect(result.method).toBe('GET');
		});

		it('should use url field when given an IRequestOptions object with url', () => {
			const requestObj: IRequestOptions = {
				url: 'https://api.example.com/from-url',
				method: 'DELETE',
			};

			const result = normalizeLegacyRequest(requestObj);

			expect(result.url).toBe('https://api.example.com/from-url');
			expect(result.method).toBe('DELETE');
		});

		it('should fall back to empty string when neither uri nor url is present', () => {
			const requestObj: IRequestOptions = {
				method: 'PATCH',
			};

			const result = normalizeLegacyRequest(requestObj);

			expect(result.url).toBe('');
		});

		it('should preserve method, headers, body, and qs from an IRequestOptions object', () => {
			const requestObj: IRequestOptions = {
				uri: 'https://api.example.com',
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: { update: true },
				qs: { version: '2' },
			};

			const result = normalizeLegacyRequest(requestObj);

			expect(result.method).toBe('PUT');
			expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
			expect(result.body).toEqual({ update: true });
			expect(result.qs).toEqual({ version: '2' });
		});
	});

	// -----------------------------------------------------------------------
	// callEvalMockHandler
	// -----------------------------------------------------------------------
	describe('callEvalMockHandler', () => {
		const node = mock<INode>();
		const requestOptions: IHttpRequestOptions = {
			url: 'https://api.example.com/test',
			method: 'GET',
		};

		const successResponse: EvalMockHttpResponse = {
			body: { data: 'mocked' },
			headers: { 'content-type': 'application/json' },
			statusCode: 200,
		};

		it('should return body when handler responds and returnFullResponse is false', async () => {
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(successResponse);

			const result = await callEvalMockHandler(handler, requestOptions, node);

			expect(result).toEqual({ data: 'mocked' });
		});

		it('should return serialized response when returnFullResponse is true', async () => {
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(successResponse);

			const result = await callEvalMockHandler(handler, requestOptions, node, true);

			expect(result).toHaveProperty('body');
			expect(result).toHaveProperty('headers');
			expect(result).toHaveProperty('statusCode', 200);
			const typedResult = result as ReturnType<typeof serializeMockToHttpResponse>;
			// JSON Content-Type → body passes through parsed so HTTP Request nodes on
			// responseFormat: autodetect see parsed items rather than a raw Buffer.
			expect(typedResult.body).toEqual({ data: 'mocked' });
		});

		it('should return a Buffer body when the mock already handed over one', async () => {
			// If the mock producer decided the body is binary (mock-handler.ts
			// 'binary' type), we respect that and keep it as a Buffer even on
			// the default path — the node's autodetect handles raw bytes fine.
			const bufferResponse: EvalMockHttpResponse = {
				body: Buffer.from('raw bytes'),
				headers: { 'content-type': 'application/octet-stream' },
				statusCode: 200,
			};
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(bufferResponse);

			const result = await callEvalMockHandler(handler, requestOptions, node, true);

			const typedResult = result as ReturnType<typeof serializeMockToHttpResponse>;
			expect(Buffer.isBuffer(typedResult.body)).toBe(true);
			expect((typedResult.body as Buffer).toString()).toBe('raw bytes');
		});

		it('should return undefined when handler returns undefined', async () => {
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(undefined);

			const result = await callEvalMockHandler(handler, requestOptions, node);

			expect(result).toBeUndefined();
		});

		it('should throw axios-shaped error for status >= 400 with httpLibrary=axios', async () => {
			const errorResponse: EvalMockHttpResponse = {
				body: { error: 'Not Found' },
				headers: { 'content-type': 'application/json' },
				statusCode: 404,
			};
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(errorResponse);

			await expect(
				callEvalMockHandler(handler, requestOptions, node, false, 'axios'),
			).rejects.toThrow('Request failed with status code 404');
		});

		it('should throw legacy-shaped error for status >= 400 with httpLibrary=legacy', async () => {
			const errorResponse: EvalMockHttpResponse = {
				body: { error: 'Server Error' },
				headers: {},
				statusCode: 500,
			};
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(errorResponse);

			await expect(
				callEvalMockHandler(handler, requestOptions, node, false, 'legacy'),
			).rejects.toThrow('Request failed with status code 500');
		});

		it('should include isAxiosError=true on axios-shaped errors', async () => {
			const errorResponse: EvalMockHttpResponse = {
				body: { error: 'Bad Request' },
				headers: { 'x-error': 'true' },
				statusCode: 400,
			};
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(errorResponse);

			try {
				await callEvalMockHandler(handler, requestOptions, node, false, 'axios');
				fail('Expected error to be thrown');
			} catch (error: unknown) {
				const err = error as Error & {
					isAxiosError: boolean;
					response: { status: number; data: unknown; headers: Record<string, string> };
				};
				expect(err.isAxiosError).toBe(true);
				expect(err.response.status).toBe(400);
				expect(err.response.data).toEqual({ error: 'Bad Request' });
				expect(err.response.headers).toEqual({ 'x-error': 'true' });
			}
		});

		it('should include statusCode and response.body on legacy-shaped errors', async () => {
			const errorResponse: EvalMockHttpResponse = {
				body: { error: 'Forbidden' },
				headers: { 'x-reason': 'denied' },
				statusCode: 403,
			};
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(errorResponse);

			try {
				await callEvalMockHandler(handler, requestOptions, node, false, 'legacy');
				fail('Expected error to be thrown');
			} catch (error: unknown) {
				const err = error as Error & {
					statusCode: number;
					response: { statusCode: number; body: unknown; headers: Record<string, string> };
				};
				expect(err.statusCode).toBe(403);
				expect(err.response.statusCode).toBe(403);
				expect(err.response.body).toEqual({ error: 'Forbidden' });
				expect(err.response.headers).toEqual({ 'x-reason': 'denied' });
			}
		});

		it('should default to axios httpLibrary when not specified', async () => {
			const errorResponse: EvalMockHttpResponse = {
				body: { error: 'Unauthorized' },
				headers: {},
				statusCode: 401,
			};
			const handler: EvalLlmMockHandler = jest.fn().mockResolvedValue(errorResponse);

			try {
				await callEvalMockHandler(handler, requestOptions, node);
				fail('Expected error to be thrown');
			} catch (error: unknown) {
				const err = error as Error & { isAxiosError: boolean };
				expect(err.isAxiosError).toBe(true);
			}
		});
	});
});
