/**
 * The OAuth2 calls of the compiled engine: n8n saves a token that a
 * fallback-host node refreshed, and refreshes a token for a native request
 * with n8n-core's OAuth2 code.
 */
import { LockService, type Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INodeType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { CredentialTypes } from '@/credential-types';
import type { CredentialsHelper } from '@/credentials-helper';
import type { NodeTypes } from '@/node-types';

import type { CredentialSlotBinding } from '../compiled-engine.types';
import { CompiledEngineCredentials } from '../compiled-engine-credentials';

vi.mock('@/workflow-execute-additional-data', () => ({ getBase: vi.fn() }));

const binding: CredentialSlotBinding = {
	slot: 'oauth',
	type: 'oAuth2Api',
	credentialId: 'cred1',
	credentialName: 'OAuth',
};

describe('CompiledEngineCredentials', () => {
	const helper = mock<CredentialsHelper>();
	const credentialTypes = mock<CredentialTypes>();
	const nodeTypes = mock<NodeTypes>();
	const logger = mock<Logger>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	let api: Server;
	let tokenUrl = '';

	beforeAll(async () => {
		api = createServer((request, response) => {
			response.setHeader('content-type', 'application/json');
			if (request.url === '/token') {
				request.resume();
				request.on('end', () => {
					response.end(
						JSON.stringify({
							access_token: 'new',
							refresh_token: 'r2',
							token_type: 'Bearer',
							expires_in: 3600,
						}),
					);
				});
				return;
			}
			response.statusCode = 404;
			response.end('{}');
		});
		await new Promise<void>((resolve) => api.listen(0, '127.0.0.1', resolve));
		tokenUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}/token`;
	});

	afterAll(async () => {
		await new Promise((resolve) => api.close(resolve));
	});

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		helper.isCredentialUsableByNode.mockReturnValue(true);
		helper.runPreAuthentication.mockResolvedValue(undefined);
		helper.updateCredentialsOauthTokenData.mockResolvedValue(undefined);
		helper.getDecrypted.mockResolvedValue({
			grantType: 'authorizationCode',
			accessTokenUrl: tokenUrl,
			clientId: 'c',
			clientSecret: 's',
			authentication: 'body',
			oauthTokenData: { access_token: 'old', refresh_token: 'r' },
		});
		additionalData.credentialsHelper = helper;
		additionalData.ssrfBridge = undefined;
		vi.mocked(WorkflowExecuteAdditionalData.getBase).mockResolvedValue(additionalData);
		const nodeType = mock<INodeType>();
		nodeType.description = mock<INodeType['description']>();
		nodeType.description.properties = [];
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		const lock = mock<LockService>();
		lock.withLease.mockImplementation(
			async (_namespace, _key, fn: (signal: AbortSignal) => Promise<unknown>) =>
				await fn(new AbortController().signal),
		);
		Container.set(LockService, lock);
	});

	const credentials = () =>
		new CompiledEngineCredentials(helper, credentialTypes, nodeTypes, logger);

	it('saves refreshed token data through the credentials helper', async () => {
		await credentials().updateOAuthTokenData(
			binding,
			{ access_token: 'new', refresh_token: 'r2' },
			'wf1',
		);
		expect(WorkflowExecuteAdditionalData.getBase).toHaveBeenCalledWith({ workflowId: 'wf1' });
		expect(helper.updateCredentialsOauthTokenData).toHaveBeenCalledWith(
			{ id: 'cred1', name: 'OAuth' },
			'oAuth2Api',
			{ oauthTokenData: { access_token: 'new', refresh_token: 'r2' } },
			additionalData,
		);
	});

	it('refreshes the token with the token endpoint and saves it', async () => {
		await credentials().refreshOAuth2(binding, 'wf1');
		expect(helper.updateCredentialsOauthTokenData).toHaveBeenCalledTimes(1);
		const [, type, data] = helper.updateCredentialsOauthTokenData.mock.calls[0];
		expect(type).toBe('oAuth2Api');
		expect(data.oauthTokenData).toMatchObject({
			access_token: 'new',
			refresh_token: 'r2',
		});
	});
});
