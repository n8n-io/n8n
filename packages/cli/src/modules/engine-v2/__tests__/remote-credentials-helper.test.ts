import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import type {
	ICredentialsHelper,
	ICredentialType,
	ICredentialTypes,
	IExecuteData,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INode,
	INodeCredentialsDetails,
	INodeProperties,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineCredentialsClient } from '../engine-credentials-client';
import { RemoteCredentialsHelper } from '../remote-credentials-helper';

const context: AdditionalDataContext = {
	executionId: 'exec-1',
	workflowId: 'wf-1',
	mode: 'manual',
	userId: 'user-1',
	projectId: 'project-1',
};

const nodeCredentials: INodeCredentialsDetails = { id: 'cred-1', name: 'Acme API' };
const type = 'httpHeaderAuth';
const decrypted = { name: 'X-Api-Key', value: 'secret' };

const httpRequestNode = mock<INode>({ type: 'n8n-nodes-base.httpRequest' });
const chatModelNode = mock<INode>({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' });
const executeData: IExecuteData = { node: httpRequestNode, data: {}, source: null };
const additionalData = mock<IWorkflowExecuteAdditionalData>();

const credentialTypeWith = (properties: Array<Partial<INodeProperties>>) =>
	({ properties }) as unknown as ICredentialType;

describe('RemoteCredentialsHelper', () => {
	let client: EngineCredentialsClient;
	let delegate: ICredentialsHelper;
	let credentialTypes: ICredentialTypes;
	let signal: AbortSignal;
	let helper: RemoteCredentialsHelper;

	beforeEach(() => {
		client = mock<EngineCredentialsClient>();
		delegate = mock<ICredentialsHelper>();
		credentialTypes = mock<ICredentialTypes>();
		signal = new AbortController().signal;
		helper = new RemoteCredentialsHelper(client, delegate, credentialTypes, context, signal);

		vi.mocked(client.resolve).mockResolvedValue(decrypted);
	});

	describe('getDecrypted', () => {
		it('asks the control plane for the credential of this execution and returns its data', async () => {
			const result = await helper.getDecrypted(
				additionalData,
				nodeCredentials,
				type,
				'manual',
				executeData,
			);

			expect(result).toBe(decrypted);
			expect(client.resolve).toHaveBeenCalledExactlyOnceWith(
				{
					credential: { id: 'cred-1', name: 'Acme API', type },
					execution: { executionId: 'exec-1', workflowId: 'wf-1', mode: 'manual' },
					context: { userId: 'user-1', projectId: 'project-1' },
					consumer: { nodeType: 'n8n-nodes-base.httpRequest' },
				},
				expect.anything(),
			);
		});

		it('names the node from expressionResolveValues over the one from executeData', async () => {
			await helper.getDecrypted(
				additionalData,
				nodeCredentials,
				type,
				'manual',
				executeData,
				false,
				{
					node: chatModelNode,
					workflow: mock<Workflow>(),
					runIndex: 0,
					itemIndex: 0,
					connectionInputData: [],
					runExecutionData: null,
				},
			);

			expect(client.resolve).toHaveBeenCalledWith(
				expect.objectContaining({
					consumer: { nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
				}),
				expect.anything(),
			);
		});

		it('passes the signal of the execution to the client', async () => {
			await helper.getDecrypted(additionalData, nodeCredentials, type, 'manual', executeData);

			expect(client.resolve).toHaveBeenCalledWith(expect.anything(), signal);
		});

		it('throws for a Gateway credits credential without calling the control plane', async () => {
			await expect(
				helper.getDecrypted(
					additionalData,
					{ ...nodeCredentials, __aiGatewayManaged: true },
					type,
					'manual',
					executeData,
				),
			).rejects.toThrow(UnexpectedError);

			expect(client.resolve).not.toHaveBeenCalled();
		});

		it('throws for a credential with no id without calling the control plane', async () => {
			await expect(
				helper.getDecrypted(
					additionalData,
					{ id: null, name: 'Acme API' },
					type,
					'manual',
					executeData,
				),
			).rejects.toThrow(UnexpectedError);

			expect(client.resolve).not.toHaveBeenCalled();
		});

		it('throws when no node asks for the credential', async () => {
			await expect(
				helper.getDecrypted(additionalData, nodeCredentials, type, 'manual'),
			).rejects.toThrow(UnexpectedError);

			expect(client.resolve).not.toHaveBeenCalled();
		});

		it('reports the unsupported OAuth token refresh for a raw read with no node', async () => {
			// This is how the OAuth2 token refresh in core re-reads the stored token.
			await expect(
				helper.getDecrypted(additionalData, nodeCredentials, type, 'manual', undefined, true),
			).rejects.toThrow('Engine 2.0 does not support OAuth token refresh yet');

			expect(client.resolve).not.toHaveBeenCalled();
		});
	});

	describe('preAuthentication', () => {
		const helpers = mock<IHttpRequestHelper>();
		const credentials = { accessToken: 'token' };

		it('throws for a credential type with an expirable hidden property', async () => {
			vi.mocked(credentialTypes.getByName).mockReturnValue(
				credentialTypeWith([{ type: 'hidden', typeOptions: { expirable: true } }]),
			);

			await expect(
				helper.preAuthentication(helpers, credentials, type, httpRequestNode, false),
			).rejects.toThrow(UnexpectedError);

			expect(delegate.preAuthentication).not.toHaveBeenCalled();
		});

		it('delegates for a credential type without an expirable property', async () => {
			vi.mocked(credentialTypes.getByName).mockReturnValue(
				credentialTypeWith([{ type: 'hidden' }, { type: 'string' }]),
			);
			vi.mocked(delegate.preAuthentication).mockResolvedValue(credentials);

			const result = await helper.preAuthentication(
				helpers,
				credentials,
				type,
				httpRequestNode,
				true,
			);

			expect(result).toBe(credentials);
			expect(delegate.preAuthentication).toHaveBeenCalledExactlyOnceWith(
				helpers,
				credentials,
				type,
				httpRequestNode,
				true,
			);
		});
	});

	describe('credential store writes and reads', () => {
		it('updateCredentialsOauthTokenData throws', async () => {
			await expect(
				helper.updateCredentialsOauthTokenData(nodeCredentials, type, decrypted, additionalData),
			).rejects.toThrow(UnexpectedError);
		});

		it('getCredentials throws', async () => {
			await expect(helper.getCredentials(nodeCredentials, type)).rejects.toThrow(UnexpectedError);
		});

		it('updateCredentials throws', async () => {
			await expect(helper.updateCredentials(nodeCredentials, type, decrypted)).rejects.toThrow(
				UnexpectedError,
			);
		});
	});

	describe('delegated methods', () => {
		it('authenticate forwards to the delegate', async () => {
			const requestOptions = mock<IHttpRequestOptions>();
			const authenticated = mock<IHttpRequestOptions>();
			const workflow = mock<Workflow>();
			vi.mocked(delegate.authenticate).mockResolvedValue(authenticated);

			const result = await helper.authenticate(
				decrypted,
				type,
				requestOptions,
				workflow,
				httpRequestNode,
			);

			expect(result).toBe(authenticated);
			expect(delegate.authenticate).toHaveBeenCalledExactlyOnceWith(
				decrypted,
				type,
				requestOptions,
				workflow,
				httpRequestNode,
			);
		});

		it('runPreAuthentication forwards to the delegate', async () => {
			const helpers = mock<IHttpRequestHelper>();
			const output = { accessToken: 'token' };
			vi.mocked(delegate.runPreAuthentication).mockResolvedValue(output);

			const result = await helper.runPreAuthentication(helpers, decrypted, type);

			expect(result).toBe(output);
			expect(delegate.runPreAuthentication).toHaveBeenCalledExactlyOnceWith(
				helpers,
				decrypted,
				type,
			);
		});

		it('getParentTypes forwards to the delegate', () => {
			vi.mocked(delegate.getParentTypes).mockReturnValue(['oAuth2Api']);

			expect(helper.getParentTypes(type)).toEqual(['oAuth2Api']);
			expect(delegate.getParentTypes).toHaveBeenCalledExactlyOnceWith(type);
		});

		it('isCredentialUsableByNode forwards to the delegate', () => {
			vi.mocked(delegate.isCredentialUsableByNode).mockReturnValue(false);

			expect(helper.isCredentialUsableByNode(type, 'n8n-nodes-base.httpRequest')).toBe(false);
			expect(delegate.isCredentialUsableByNode).toHaveBeenCalledExactlyOnceWith(
				type,
				'n8n-nodes-base.httpRequest',
			);
		});

		it('getCredentialsProperties forwards to the delegate', () => {
			const properties = [mock<INodeProperties>()];
			vi.mocked(delegate.getCredentialsProperties).mockReturnValue(properties);

			expect(helper.getCredentialsProperties(type)).toBe(properties);
			expect(delegate.getCredentialsProperties).toHaveBeenCalledExactlyOnceWith(type);
		});
	});
});
