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

import { CredentialNotFoundError } from '@/errors/credential-not-found.error';

import { EvalMockedCredentialsHelper } from '../eval-mocked-credentials-helper';

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
			const helper = new EvalMockedCredentialsHelper(inner);

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
			const helper = new EvalMockedCredentialsHelper(inner);

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
			const helper = new EvalMockedCredentialsHelper(inner);

			await expect(
				helper.getDecrypted(fakeAdditionalData, fakeNodeCreds, 'telegramApi', 'manual'),
			).rejects.toThrow('database is down');
			expect(helper.mockedCredentials).toEqual([]);
		});

		it('records "unknown" nodeName when executeData is missing', async () => {
			const inner = makeInner({
				getDecrypted: jest.fn().mockRejectedValue(new CredentialNotFoundError('id', 'telegramApi')),
			});
			const helper = new EvalMockedCredentialsHelper(inner);

			await helper.getDecrypted(fakeAdditionalData, fakeNodeCreds, 'telegramApi', 'manual');

			expect(helper.mockedCredentials[0].nodeName).toBe('unknown');
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
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl);

				const result = await helper.getDecrypted(
					fakeAdditionalData,
					openAiCreds,
					'openAiApi',
					'manual',
					{ node: openAiNode } as IExecuteData,
				);

				expect(result).toEqual({ apiKey: 'sk-real', url: serverUrl });
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
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl);

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
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl);

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

			it('is silent on unmapped types when no logger was passed', async () => {
				const inner = makeInner({
					getDecrypted: jest.fn().mockResolvedValue({ accessToken: 'real-token' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl);

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
				const helper = new EvalMockedCredentialsHelper(inner);

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
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl);

				const result = await helper.getDecrypted(
					fakeAdditionalData,
					openAiCreds,
					'openAiApi',
					'manual',
					{ node: openAiNode } as IExecuteData,
				);

				expect(result).toEqual({ __evalMockedCredential: true, url: serverUrl });
				expect(helper.mockedCredentials).toHaveLength(1);
				expect(helper.rewrittenCredentials).toHaveLength(1);
			});

			it('records each rewrite in order across multiple calls', async () => {
				const inner = makeInner({
					getDecrypted: jest.fn().mockResolvedValue({ apiKey: 'sk-real', url: 'real' }),
				});
				const helper = new EvalMockedCredentialsHelper(inner, serverUrl);

				await helper.getDecrypted(fakeAdditionalData, openAiCreds, 'openAiApi', 'manual', {
					node: { name: 'A', id: 'a' } as INode,
				} as IExecuteData);
				await helper.getDecrypted(fakeAdditionalData, openAiCreds, 'openAiApi', 'manual', {
					node: { name: 'B', id: 'b' } as INode,
				} as IExecuteData);

				expect(helper.rewrittenCredentials.map((r) => r.nodeName)).toEqual(['A', 'B']);
			});
		});
	});

	describe('authenticate', () => {
		it('passes the request through unchanged for marker payloads', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner);
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
			const helper = new EvalMockedCredentialsHelper(inner);
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
			const helper = new EvalMockedCredentialsHelper(inner);
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
			const helper = new EvalMockedCredentialsHelper(inner);
			const stub: ICredentialDataDecryptedObject = { __evalMockedCredential: true };

			const result = await helper.runPreAuthentication(fakeHttpHelper, stub, 'telegramApi');

			expect(result).toBe(stub);
			expect(inner.runPreAuthentication).not.toHaveBeenCalled();
		});

		it('delegates preAuthentication for real credentials', async () => {
			const inner = makeInner();
			const helper = new EvalMockedCredentialsHelper(inner);
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
			const helper = new EvalMockedCredentialsHelper(inner);

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
