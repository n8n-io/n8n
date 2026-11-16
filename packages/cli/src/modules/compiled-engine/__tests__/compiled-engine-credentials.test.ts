/**
 * The OAuth2 calls of the compiled engine: n8n saves a token that a
 * fallback-host node refreshed, and refreshes a token for a native request
 * with n8n-core's OAuth2 code.
 */
import { LockService, type Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import nock from 'nock';
import { generateKeyPairSync } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INodeType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { CredentialTypes } from '@/credential-types';
import type { CredentialsHelper } from '@/credentials-helper';
import type { NodeTypes } from '@/node-types';

import type { CredentialSlotBinding } from '../compiled-engine.types';
import { CompiledEngineCredentials, earliestMintExpiry } from '../compiled-engine-credentials';

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

	describe('credential flags', () => {
		const acme: CredentialSlotBinding = {
			slot: 'acme',
			type: 'acmeApi',
			credentialId: 'cred3',
			credentialName: 'Acme',
		};
		const short = {
			name: 'f00000001',
			code: '(c) => (c.apiKey.length < 64)',
			kind: 'flag' as const,
		};
		const text = { name: 'd00000001', code: '(c) => (c.account + "!")' };
		const guard = (allowed: string[]) => ({
			name: 'g1',
			code: '',
			kind: 'guard' as const,
			flags: [short.name],
			allowed,
		});
		const derivedOf = (document: Record<string, unknown>) =>
			(document.acme as { data: Record<string, unknown> }).data.n8nDerived;

		beforeEach(() => {
			helper.getDecrypted.mockResolvedValue({ apiKey: 'sk-live-1', account: 'jo' });
		});

		it('puts the outcome of a checked condition into the document as a boolean', async () => {
			const derivations = { acme: [text, short, guard(['@flags=f00000001:1'])] };

			const document = await credentials().buildDocument('wf1', [acme], derivations);

			expect(derivedOf(document)).toEqual({ d00000001: 'jo!', f00000001: true });
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('withholds a flag whose value was not checked, and logs no name and no value', async () => {
			const derivations = { acme: [short, guard(['@flags=f00000001:0'])] };

			const document = await credentials().buildDocument('wf1', [acme], derivations);

			expect(derivedOf(document)).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			const logged = JSON.stringify(logger.warn.mock.calls);
			expect(logged).not.toContain('f00000001');
			expect(logged).not.toContain('sk-live-1');
		});

		it('does not write text under the name of a flag', async () => {
			const derivations = { acme: [{ name: 'f00000002', code: '(c) => c.apiKey' }] };

			const document = await credentials().buildDocument('wf1', [acme], derivations);

			expect(derivedOf(document)).toBeUndefined();
			expect(JSON.stringify(document)).not.toContain('f00000002');
		});
	});

	describe('minted tokens', () => {
		const serviceAccount: CredentialSlotBinding = {
			slot: 'sa',
			type: 'googleApi',
			credentialId: 'cred2',
			credentialName: 'Service account',
		};
		const docsScopes = [
			'https://www.googleapis.com/auth/documents',
			'https://www.googleapis.com/auth/drive',
			'https://www.googleapis.com/auth/drive.file',
		];
		const mints = {
			sa: [
				{
					name: 'm1',
					kind: 'google-service-account' as const,
					service: 'docs',
					scopes: docsScopes,
				},
			],
		};
		const { privateKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			publicKeyEncoding: { type: 'spki', format: 'pem' },
		});

		beforeEach(() => {
			helper.getDecrypted.mockResolvedValue({
				email: 'robot@project.test',
				privateKey,
				inpersonate: false,
				delegatedEmail: '',
			});
			additionalData.hooks = undefined;
		});

		afterEach(() => {
			nock.cleanAll();
		});

		it('signs and exchanges the token in n8n, and records when it expires', async () => {
			let form = '';
			nock('https://oauth2.googleapis.com')
				.post('/token', (body: unknown) => {
					form = typeof body === 'string' ? body : new URLSearchParams(body as never).toString();
					return true;
				})
				.reply(200, { access_token: 'minted', expires_in: 3599, token_type: 'Bearer' });
			const before = Date.now();

			const document = await credentials().buildDocument('wf1', [serviceAccount], {}, mints);

			const entry = document.sa as { data: Record<string, unknown> };
			const minted = entry.data.n8nMinted as Record<
				string,
				{ access_token: string; expires_at: number }
			>;
			expect(minted.m1.access_token).toBe('minted');
			expect(minted.m1.expires_at).toBeGreaterThanOrEqual(before + 3599_000);
			expect(earliestMintExpiry(document)).toBe(minted.m1.expires_at);
			const assertion = new URLSearchParams(form).get('assertion') ?? '';
			const claims = JSON.parse(
				Buffer.from(assertion.split('.')[1], 'base64url').toString('utf8'),
			) as Record<string, unknown>;
			expect(claims).toMatchObject({ iss: 'robot@project.test', scope: docsScopes.join(' ') });
		});

		it('leaves the slot out when the exchange fails, and keeps the key out of the log', async () => {
			nock('https://oauth2.googleapis.com').post('/token').reply(400, { error: 'invalid_grant' });

			const document = await credentials().buildDocument('wf1', [serviceAccount], {}, mints);

			expect(document).toEqual({});
			expect(earliestMintExpiry(document)).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(JSON.stringify(logger.warn.mock.calls)).toContain('invalid_grant');
			expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('PRIVATE KEY');
		});

		it('does not make a token when the scopes are not the scopes of n8n', async () => {
			const other = { sa: [{ ...mints.sa[0], scopes: ['https://scopes.test/other'] }] };

			const document = await credentials().buildDocument('wf1', [serviceAccount], {}, other);

			expect(document).toEqual({});
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});
	});
});
