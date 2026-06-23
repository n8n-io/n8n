import type { Logger } from '@n8n/backend-common';
import type {
	ICredentialDataDecryptedObject,
	ICredentials,
	ICredentialsHelper,
	IExecuteData,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { CredentialMissingIdError } from '@/errors/credential-missing-id.error';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';

import { EvalMockedCredentialsHelper } from '../eval-mocked-credentials-helper';

const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
} as unknown as Logger;

const fakeAdditionalData = {} as IWorkflowExecuteAdditionalData;
const fakeWorkflow = {} as Workflow;
const fakeHttpHelper = {} as IHttpRequestHelper;
const fakeNode = { name: 'Telegram', id: 'node-1' } as INode;
const fakeNodeCreds: INodeCredentialsDetails = { id: 'missing-id', name: 'Telegram cred' };

function makeInner(overrides: Partial<ICredentialsHelper> = {}): ICredentialsHelper {
	return {
		getParentTypes: jest.fn().mockReturnValue([]),
		authenticate: jest.fn().mockResolvedValue({ url: 'http://signed' }),
		preAuthentication: jest.fn().mockResolvedValue({ token: 'real' }),
		runPreAuthentication: jest.fn().mockResolvedValue({ token: 'real' }),
		getCredentials: jest.fn().mockResolvedValue({} as ICredentials),
		getDecrypted: jest.fn().mockResolvedValue({ accessToken: 'real-token' }),
		updateCredentials: jest.fn().mockResolvedValue(undefined),
		updateCredentialsOauthTokenData: jest.fn().mockResolvedValue(undefined),
		getCredentialsProperties: jest.fn().mockReturnValue([]),
		...overrides,
	} as ICredentialsHelper;
}

describe('EvalMockedCredentialsHelper', () => {
	describe('getDecrypted', () => {
		it('delegates to inner when credential resolves', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				fakeNodeCreds,
				'telegramApi',
				'manual',
			);

			expect(result).toEqual({ accessToken: 'real-token' });
			expect(helper.mockedCredentials).toEqual([]);
		});

		it('returns marker stub on CredentialNotFoundError and tracks the entry', async () => {
			const inner = makeInner({
				getDecrypted: jest
					.fn()
					.mockRejectedValue(new CredentialNotFoundError('missing-id', 'telegramApi')),
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				fakeNodeCreds,
				'telegramApi',
				'manual',
				{ node: fakeNode } as IExecuteData,
			);

			expect(result).toEqual({ __evalMockedCredential: true });
			expect(helper.mockedCredentials).toEqual([
				{ nodeName: 'Telegram', credentialType: 'telegramApi', credentialId: 'missing-id' },
			]);
		});

		it('rethrows non-CredentialNotFoundError errors', async () => {
			const inner = makeInner({
				getDecrypted: jest.fn().mockRejectedValue(new Error('database is down')),
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			await expect(
				helper.getDecrypted(fakeAdditionalData, fakeNodeCreds, 'telegramApi', 'manual'),
			).rejects.toThrow('database is down');
			expect(helper.mockedCredentials).toEqual([]);
		});

		it('rethrows generic no-id UnexpectedError errors', async () => {
			const inner = makeInner({
				getDecrypted: jest
					.fn()
					.mockRejectedValue(new UnexpectedError('Found credential with no ID.')),
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			await expect(
				helper.getDecrypted(fakeAdditionalData, fakeNodeCreds, 'telegramApi', 'manual'),
			).rejects.toThrow('Found credential with no ID.');
			expect(helper.mockedCredentials).toEqual([]);
		});

		it('records "unknown" nodeName when executeData is missing', async () => {
			const inner = makeInner({
				getDecrypted: jest.fn().mockRejectedValue(new CredentialNotFoundError('id', 'telegramApi')),
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			await helper.getDecrypted(fakeAdditionalData, fakeNodeCreds, 'telegramApi', 'manual');

			expect(helper.mockedCredentials[0].nodeName).toBe('unknown');
		});

		it('tolerates an undefined credential id without ever touching the inner helper', async () => {
			// Falsy ids must be mocked before the inner helper can throw.
			const innerGetDecrypted = jest.fn();
			const inner = makeInner({
				getCredentialsProperties: jest.fn().mockReturnValue([
					{
						name: 'apiKey',
						displayName: 'API Key',
						type: 'string' as const,
						default: '',
					},
				]),
				getDecrypted: innerGetDecrypted,
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);
			const undefinedIdCreds: INodeCredentialsDetails = {
				id: undefined as unknown as string,
				name: 'OpenWeatherMap API',
			};

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				undefinedIdCreds,
				'openWeatherMapApi',
				'manual',
				{ node: { name: 'Get London Weather' } as INode } as IExecuteData,
			);

			expect(result.__evalMockedCredential).toBe(true);
			expect(innerGetDecrypted).not.toHaveBeenCalled();
			expect(helper.mockedCredentials).toEqual([
				{
					nodeName: 'Get London Weather',
					credentialType: 'openWeatherMapApi',
					credentialId: undefined,
				},
			]);
		});

		describe('server URL rewrite', () => {
			const serverUrl = 'http://127.0.0.1:55555';
			const openAiCreds: INodeCredentialsDetails = { id: 'cred-1', name: 'OpenAI cred' };
			const openAiNode = { name: 'OpenAI Chat Model', id: 'node-9' } as INode;

			it('rewrites the URL field on openAiApi credentials when serverUrl is set', async () => {
				const inner = makeInner({
					getDecrypted: jest
						.fn()
						.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl, mockLogger);

				const result = await helper.getDecrypted(
					fakeAdditionalData,
					openAiCreds,
					'openAiApi',
					'manual',
					{ node: openAiNode } as IExecuteData,
				);

				// /v1 must stay on the rewritten URL — the LangChain OpenAI node
				// uses this verbatim as the SDK's `baseURL`, and the SDK appends
				// `/chat/completions`. A bare server URL would miss the wire-server
				// route. See LmChatOpenAi.node.ts:765.
				expect(result).toEqual({ apiKey: 'sk-real', url: `${serverUrl}/v1` });
				expect(helper.rewrittenCredentials).toEqual([
					{
						nodeName: 'OpenAI Chat Model',
						credentialType: 'openAiApi',
						credentialId: 'cred-1',
						field: 'url',
					},
				]);
			});

			it('does not mutate the credential returned by the inner helper', async () => {
				const original = { apiKey: 'sk-real', url: 'https://api.openai.com/v1' };
				const inner = makeInner({ getDecrypted: jest.fn().mockResolvedValue(original) });
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl, mockLogger);

				const result = await helper.getDecrypted(
					fakeAdditionalData,
					openAiCreds,
					'openAiApi',
					'manual',
				);

				expect(original).toEqual({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' });
				expect(result).not.toBe(original);
			});

			it('does not rewrite credentials of an unmapped type', async () => {
				const inner = makeInner({
					getDecrypted: jest.fn().mockResolvedValue({ accessToken: 'real-token' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl, mockLogger);

				const result = await helper.getDecrypted(
					fakeAdditionalData,
					fakeNodeCreds,
					'telegramApi',
					'manual',
				);

				expect(result).toEqual({ accessToken: 'real-token' });
				expect(helper.rewrittenCredentials).toEqual([]);
			});

			it('logs a warning via the injected logger when the credential type is unmapped', async () => {
				const warn = jest.fn();
				const inner = makeInner({
					getDecrypted: jest.fn().mockResolvedValue({ accessToken: 'real-token' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl, {
					warn,
				} as unknown as Logger);

				await helper.getDecrypted(fakeAdditionalData, fakeNodeCreds, 'claudeApi', 'manual', {
					node: { name: 'Anthropic Chat Model', id: 'a' } as INode,
				} as IExecuteData);

				expect(warn).toHaveBeenCalledTimes(1);
				expect(warn.mock.calls[0][0]).toContain('claudeApi');
				expect(warn.mock.calls[0][0]).toContain('Anthropic Chat Model');
			});

			it('returns the inner credential unchanged on unmapped types', async () => {
				const inner = makeInner({
					getDecrypted: jest.fn().mockResolvedValue({ accessToken: 'real-token' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl, mockLogger);

				await expect(
					helper.getDecrypted(fakeAdditionalData, fakeNodeCreds, 'claudeApi', 'manual'),
				).resolves.toEqual({ accessToken: 'real-token' });
			});

			it('is a no-op when serverUrl is undefined (today’s default path)', async () => {
				const inner = makeInner({
					getDecrypted: jest
						.fn()
						.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

				const result = await helper.getDecrypted(
					fakeAdditionalData,
					openAiCreds,
					'openAiApi',
					'manual',
				);

				expect(result).toEqual({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' });
				expect(helper.rewrittenCredentials).toEqual([]);
			});

			it('rewrites the URL on the marker stub when the credential is missing', async () => {
				const inner = makeInner({
					getDecrypted: jest
						.fn()
						.mockRejectedValue(new CredentialNotFoundError('cred-1', 'openAiApi')),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl, mockLogger);

				const result = await helper.getDecrypted(
					fakeAdditionalData,
					openAiCreds,
					'openAiApi',
					'manual',
					{ node: openAiNode } as IExecuteData,
				);

				expect(result).toEqual({ __evalMockedCredential: true, url: `${serverUrl}/v1` });
				expect(helper.mockedCredentials).toHaveLength(1);
				expect(helper.rewrittenCredentials).toHaveLength(1);
			});

			it('records each rewrite in order across multiple calls', async () => {
				const inner = makeInner({
					getDecrypted: jest.fn().mockResolvedValue({ apiKey: 'sk-real', url: 'real' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl, mockLogger);

				await helper.getDecrypted(fakeAdditionalData, openAiCreds, 'openAiApi', 'manual', {
					node: { name: 'A', id: 'a' } as INode,
				} as IExecuteData);
				await helper.getDecrypted(fakeAdditionalData, openAiCreds, 'openAiApi', 'manual', {
					node: { name: 'B', id: 'b' } as INode,
				} as IExecuteData);

				expect(helper.rewrittenCredentials.map((r) => r.nodeName)).toEqual(['A', 'B']);
			});

			describe('root token embedding', () => {
				it('embeds the resolved root in the rewritten URL path', async () => {
					const inner = makeInner({
						getDecrypted: jest
							.fn()
							.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
					});
					const subNodeToRoot = new Map([['OpenAI Chat Model', 'My Agent']]);
					const helper = new EvalMockedCredentialsHelper(
						inner,
						serverUrl,
						mockLogger,
						subNodeToRoot,
					);

					const result = await helper.getDecrypted(
						fakeAdditionalData,
						openAiCreds,
						'openAiApi',
						'manual',
						{ node: openAiNode } as IExecuteData,
					);

					expect(result.url).toBe(`${serverUrl}/eval/My%20Agent/v1`);
				});

				it('URL-encodes special characters in the root name', async () => {
					const inner = makeInner({
						getDecrypted: jest
							.fn()
							.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
					});
					const subNodeToRoot = new Map([['OpenAI Chat Model', 'Agent / spike test (v2)']]);
					const helper = new EvalMockedCredentialsHelper(
						inner,
						serverUrl,
						mockLogger,
						subNodeToRoot,
					);

					const result = await helper.getDecrypted(
						fakeAdditionalData,
						openAiCreds,
						'openAiApi',
						'manual',
						{ node: openAiNode } as IExecuteData,
					);

					expect(result.url).toBe(
						`${serverUrl}/eval/${encodeURIComponent('Agent / spike test (v2)')}/v1`,
					);
				});

				it('falls back to bare /v1 when the sub-node has no routing entry', async () => {
					const inner = makeInner({
						getDecrypted: jest
							.fn()
							.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
					});
					const subNodeToRoot = new Map([['Some Other Sub-Node', 'Some Agent']]);
					const helper = new EvalMockedCredentialsHelper(
						inner,
						serverUrl,
						mockLogger,
						subNodeToRoot,
					);

					const result = await helper.getDecrypted(
						fakeAdditionalData,
						openAiCreds,
						'openAiApi',
						'manual',
						{ node: openAiNode } as IExecuteData,
					);

					// Sub-node "OpenAI Chat Model" isn't in the map — fall back to bare /v1.
					// The wire server's unrouted-prefix handler will surface this.
					expect(result.url).toBe(`${serverUrl}/v1`);
				});

				it('warns when a routing map is supplied but the sub-node is missing from it', async () => {
					const warn = jest.fn();
					const inner = makeInner({
						getDecrypted: jest
							.fn()
							.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
					});
					const subNodeToRoot = new Map([['Some Other Sub-Node', 'Some Agent']]);
					const helper = new EvalMockedCredentialsHelper(
						inner,
						serverUrl,
						{ warn } as unknown as Logger,
						subNodeToRoot,
					);

					await helper.getDecrypted(fakeAdditionalData, openAiCreds, 'openAiApi', 'manual', {
						node: openAiNode,
					} as IExecuteData);

					expect(warn).toHaveBeenCalledTimes(1);
					expect(warn.mock.calls[0][0]).toContain('OpenAI Chat Model');
					expect(warn.mock.calls[0][0]).toContain('buildVendorLlmRouting');
				});

				it('does NOT warn when no routing map is supplied (legacy single-root fallback path)', async () => {
					const warn = jest.fn();
					const inner = makeInner({
						getDecrypted: jest
							.fn()
							.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
					});
					const helper = new EvalMockedCredentialsHelper(inner, serverUrl, {
						warn,
					} as unknown as Logger);

					await helper.getDecrypted(fakeAdditionalData, openAiCreds, 'openAiApi', 'manual', {
						node: openAiNode,
					} as IExecuteData);

					expect(warn).not.toHaveBeenCalled();
				});

				it('routes to the right root when multiple sub-nodes feed different roots', async () => {
					const inner = makeInner({
						getDecrypted: jest
							.fn()
							.mockResolvedValue({ apiKey: 'sk-real', url: 'https://api.openai.com/v1' }),
					});
					const subNodeToRoot = new Map([
						['OpenAI A', 'Agent A'],
						['OpenAI B', 'Agent B'],
					]);
					const helper = new EvalMockedCredentialsHelper(
						inner,
						serverUrl,
						mockLogger,
						subNodeToRoot,
					);

					const resA = await helper.getDecrypted(
						fakeAdditionalData,
						openAiCreds,
						'openAiApi',
						'manual',
						{ node: { name: 'OpenAI A', id: 'a' } as INode } as IExecuteData,
					);
					const resB = await helper.getDecrypted(
						fakeAdditionalData,
						openAiCreds,
						'openAiApi',
						'manual',
						{ node: { name: 'OpenAI B', id: 'b' } as INode } as IExecuteData,
					);

					expect(resA.url).toBe(`${serverUrl}/eval/Agent%20A/v1`);
					expect(resB.url).toBe(`${serverUrl}/eval/Agent%20B/v1`);
				});
			});
		});
	});

	describe('getDecrypted — schema synthesis when id is falsy', () => {
		// Falsy credential ids short-circuit to schema synthesis without delegating to the inner helper.
		const propsSchema = [
			{
				name: 'apiKey',
				displayName: 'API Key',
				type: 'string' as const,
				default: '',
				typeOptions: { password: true },
			},
			{
				name: 'url',
				displayName: 'Base URL',
				type: 'string' as const,
				default: 'https://api.openai.com/v1',
			},
		];

		const nullNodeCreds: INodeCredentialsDetails = { id: null, name: 'openAiApi' };
		const emptyIdNodeCreds: INodeCredentialsDetails = { id: '', name: 'openAiApi' };
		const noIdNodeCreds = { name: 'openAiApi' } as unknown as INodeCredentialsDetails;

		function makeSynthesizingInner(): ICredentialsHelper {
			return makeInner({
				getCredentialsProperties: jest.fn().mockReturnValue(propsSchema),
				// Not reached for a null id (short-circuits first); left rejecting so a regression fails loudly.
				getDecrypted: jest.fn().mockRejectedValue(new CredentialNotFoundError('null', 'openAiApi')),
			});
		}

		function makeNoIdInner(): ICredentialsHelper {
			return makeInner({
				getCredentialsProperties: jest.fn().mockReturnValue(propsSchema),
				getDecrypted: jest
					.fn()
					.mockRejectedValue(new CredentialMissingIdError('openAiApi', 'openAiApi')),
			});
		}

		it('synthesizes a credential from the schema and applies the URL rewrite', async () => {
			const subNodeToRoot = new Map<string, string>([['OpenAI', 'Agent']]);
			const helper = new EvalMockedCredentialsHelper(
				makeSynthesizingInner(),
				'http://127.0.0.1:54321',
				mockLogger,
				subNodeToRoot,
			);

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				nullNodeCreds,
				'openAiApi',
				'manual',
				{ node: { name: 'OpenAI' } as INode } as IExecuteData,
			);

			// Schema default for `url` is rewritten to the wire-server path.
			expect(result.url).toBe('http://127.0.0.1:54321/eval/Agent/v1');
			// Secret field (apiKey) is filled by `buildEvalMockCredentials` —
			// the placeholder doesn't matter, only that it's not undefined.
			expect(typeof result.apiKey).toBe('string');
		});

		it('records the synthesized credential on `mockedCredentials`', async () => {
			const helper = new EvalMockedCredentialsHelper(
				makeSynthesizingInner(),
				'http://127.0.0.1:1',
				mockLogger,
			);

			await helper.getDecrypted(fakeAdditionalData, nullNodeCreds, 'openAiApi', 'manual', {
				node: { name: 'OpenAI GPT-4' } as INode,
			} as IExecuteData);

			expect(helper.mockedCredentials).toEqual([
				{
					nodeName: 'OpenAI GPT-4',
					credentialType: 'openAiApi',
					credentialId: undefined,
				},
			]);
		});

		it('records the rewrite on `rewrittenCredentials`', async () => {
			const subNodeToRoot = new Map<string, string>([['OpenAI', 'Agent']]);
			const helper = new EvalMockedCredentialsHelper(
				makeSynthesizingInner(),
				'http://127.0.0.1:1',
				mockLogger,
				subNodeToRoot,
			);

			await helper.getDecrypted(fakeAdditionalData, nullNodeCreds, 'openAiApi', 'manual', {
				node: { name: 'OpenAI' } as INode,
			} as IExecuteData);

			expect(helper.rewrittenCredentials).toEqual([
				{
					nodeName: 'OpenAI',
					credentialType: 'openAiApi',
					credentialId: undefined,
					field: 'url',
				},
			]);
		});

		it('brands the synthetic credential with __evalMockedCredential so authenticate short-circuits', async () => {
			// Regression: without the marker, `authenticate` / `preAuthentication`
			// / `runPreAuthentication` would delegate the synthetic credential
			// through the inner helper's real-auth flow (OAuth refresh, PreSend
			// hooks). Those flows would either crash on placeholder values or
			// leak real-auth side effects from a fake credential.
			const inner = makeInner({
				getCredentialsProperties: jest.fn().mockReturnValue(propsSchema),
				getDecrypted: jest.fn().mockRejectedValue(new CredentialNotFoundError('null', 'openAiApi')),
				authenticate: jest.fn().mockResolvedValue({ url: 'http://should-not-be-called' }),
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			const synthetic = await helper.getDecrypted(
				fakeAdditionalData,
				nullNodeCreds,
				'openAiApi',
				'manual',
				{ node: { name: 'OpenAI' } as INode } as IExecuteData,
			);

			expect(synthetic.__evalMockedCredential).toBe(true);

			// Round-trip through `authenticate` confirms the marker actually
			// short-circuits — the inner helper must not be invoked.
			const requestOptions: IHttpRequestOptions = { url: 'http://example.com' };
			const result = await helper.authenticate(
				synthetic,
				'openAiApi',
				requestOptions,
				fakeWorkflow,
				fakeNode,
			);
			expect(result).toBe(requestOptions);
			expect(inner.authenticate).not.toHaveBeenCalled();
		});

		it('still returns the synthetic credential when no serverUrl is configured', async () => {
			// The helper may be used in eval mode without the wire server
			// (e.g. HTTP-helper-only workflows). Without `serverUrl` we just
			// pass the synthetic through — matches the pre-hook behaviour.
			const helper = new EvalMockedCredentialsHelper(
				makeSynthesizingInner(),
				undefined,
				mockLogger,
			);

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				nullNodeCreds,
				'openAiApi',
				'manual',
				{ node: { name: 'OpenAI' } as INode } as IExecuteData,
			);

			expect(result.url).toBe('https://api.openai.com/v1');
			expect(helper.rewrittenCredentials).toEqual([]);
		});

		it('synthesizes a credential when the inner helper reports a missing id', async () => {
			const helper = new EvalMockedCredentialsHelper(makeNoIdInner(), undefined, mockLogger);

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				noIdNodeCreds,
				'openAiApi',
				'manual',
				{ node: { name: 'OpenAI' } as INode } as IExecuteData,
			);

			expect(result.__evalMockedCredential).toBe(true);
			expect(typeof result.apiKey).toBe('string');
			expect(result.url).toBe('https://api.openai.com/v1');
			expect(helper.mockedCredentials).toEqual([
				{
					nodeName: 'OpenAI',
					credentialType: 'openAiApi',
					credentialId: undefined,
				},
			]);
		});

		it('synthesizes a credential when the credential id is empty', async () => {
			const helper = new EvalMockedCredentialsHelper(makeNoIdInner(), undefined, mockLogger);

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				emptyIdNodeCreds,
				'openAiApi',
				'manual',
				{ node: { name: 'OpenAI' } as INode } as IExecuteData,
			);

			expect(result.__evalMockedCredential).toBe(true);
			expect(typeof result.apiKey).toBe('string');
			expect(result.url).toBe('https://api.openai.com/v1');
			expect(helper.mockedCredentials).toEqual([
				{
					nodeName: 'OpenAI',
					credentialType: 'openAiApi',
					credentialId: undefined,
				},
			]);
		});
	});

	describe('no-id credential references — regression for "Found credential with no ID."', () => {
		// Id-less refs (builder "set up later" placeholders, core's `{ id: null }`) make the real
		// inner throw UnexpectedError, not CredentialNotFoundError — so the helper must synthesize, not delegate.
		const propsSchema = [
			{
				name: 'apiKey',
				displayName: 'API Key',
				type: 'string' as const,
				default: '',
				typeOptions: { password: true },
			},
		];

		it.each([
			['null id (fully-unconfigured bypass)', { id: null, name: 'telegramApi' }],
			['empty-string id (placeholder)', { id: '', name: 'Telegram cred' }],
			['missing id (placeholder)', { name: 'Telegram cred' }],
		])('synthesizes without delegating to inner — %s', async (_label, creds) => {
			const inner = makeInner({
				getCredentialsProperties: jest.fn().mockReturnValue(propsSchema),
				// Stands in for core's UnexpectedError on a falsy id — fails loudly if the short-circuit regresses.
				getDecrypted: jest.fn().mockRejectedValue(new Error('Found credential with no ID.')),
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			const result = await helper.getDecrypted(
				fakeAdditionalData,
				creds as INodeCredentialsDetails,
				'telegramApi',
				'manual',
				{ node: fakeNode } as IExecuteData,
			);

			expect(result.__evalMockedCredential).toBe(true);
			expect(inner.getDecrypted).not.toHaveBeenCalled();
			expect(helper.mockedCredentials).toEqual([
				{ nodeName: 'Telegram', credentialType: 'telegramApi', credentialId: undefined },
			]);
		});

		it('still delegates (and surfaces the throw) when an id IS present', async () => {
			// A present id whose lookup fails with a non-CredentialNotFoundError must still propagate.
			const inner = makeInner({
				getDecrypted: jest.fn().mockRejectedValue(new Error('database is down')),
			});
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			await expect(
				helper.getDecrypted(
					fakeAdditionalData,
					{ id: 'real-id', name: 'Telegram cred' },
					'telegramApi',
					'manual',
				),
			).rejects.toThrow('database is down');
			expect(inner.getDecrypted).toHaveBeenCalled();
		});
	});

	describe('authenticate', () => {
		it('passes the request through unchanged for marker payloads', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);
			const requestOptions: IHttpRequestOptions = { url: 'http://example.com' };

			const result = await helper.authenticate(
				{ __evalMockedCredential: true },
				'telegramApi',
				requestOptions,
				fakeWorkflow,
				fakeNode,
			);

			expect(result).toBe(requestOptions);
			expect(inner.authenticate).not.toHaveBeenCalled();
		});

		it('delegates to inner for real credentials', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);
			const requestOptions: IHttpRequestOptions = { url: 'http://example.com' };

			const result = await helper.authenticate(
				{ accessToken: 'real-token' },
				'telegramApi',
				requestOptions,
				fakeWorkflow,
				fakeNode,
			);

			expect(result).toEqual({ url: 'http://signed' });
			expect(inner.authenticate).toHaveBeenCalledWith(
				{ accessToken: 'real-token' },
				'telegramApi',
				requestOptions,
				fakeWorkflow,
				fakeNode,
			);
		});
	});

	describe('preAuthentication / runPreAuthentication', () => {
		it('returns marker payload unchanged from preAuthentication', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);
			const stub: ICredentialDataDecryptedObject = { __evalMockedCredential: true };

			const result = await helper.preAuthentication(
				fakeHttpHelper,
				stub,
				'telegramApi',
				fakeNode,
				false,
			);

			expect(result).toBe(stub);
			expect(inner.preAuthentication).not.toHaveBeenCalled();
		});

		it('returns marker payload unchanged from runPreAuthentication', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);
			const stub: ICredentialDataDecryptedObject = { __evalMockedCredential: true };

			const result = await helper.runPreAuthentication(fakeHttpHelper, stub, 'telegramApi');

			expect(result).toBe(stub);
			expect(inner.runPreAuthentication).not.toHaveBeenCalled();
		});

		it('delegates preAuthentication for real credentials', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);
			const real: ICredentialDataDecryptedObject = { accessToken: 'real-token' };

			await helper.preAuthentication(fakeHttpHelper, real, 'telegramApi', fakeNode, false);

			expect(inner.preAuthentication).toHaveBeenCalledWith(
				fakeHttpHelper,
				real,
				'telegramApi',
				fakeNode,
				false,
			);
		});
	});

	describe('passthrough methods', () => {
		it('delegates passthrough methods to inner', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner, undefined, mockLogger);

			helper.getParentTypes('telegramApi');
			helper.getCredentialsProperties('telegramApi');
			await helper.getCredentials(fakeNodeCreds, 'telegramApi');
			await helper.updateCredentials(fakeNodeCreds, 'telegramApi', { x: 1 });
			await helper.updateCredentialsOauthTokenData(
				fakeNodeCreds,
				'telegramApi',
				{ x: 1 },
				fakeAdditionalData,
			);

			expect(inner.getParentTypes).toHaveBeenCalledWith('telegramApi');
			expect(inner.getCredentialsProperties).toHaveBeenCalledWith('telegramApi');
			expect(inner.getCredentials).toHaveBeenCalledWith(fakeNodeCreds, 'telegramApi');
			expect(inner.updateCredentials).toHaveBeenCalledWith(fakeNodeCreds, 'telegramApi', { x: 1 });
			expect(inner.updateCredentialsOauthTokenData).toHaveBeenCalledWith(
				fakeNodeCreds,
				'telegramApi',
				{ x: 1 },
				fakeAdditionalData,
			);
		});
	});
});
