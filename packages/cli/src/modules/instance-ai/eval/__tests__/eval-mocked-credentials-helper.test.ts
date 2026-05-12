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
