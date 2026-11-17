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
import { loadWorkflowLang } from '../workflow-lang';
import {
	CompiledEngineCredentials,
	earliestMintExpiry,
	mintExpiries,
} from '../compiled-engine-credentials';

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

	// The first use of the workflow language loads the TypeScript compiler. It is loaded here,
	// with its own time limit, so the first test that builds a document does not pay for it.
	beforeAll(async () => {
		await loadWorkflowLang();
	}, 120_000);

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

	it('refuses the renewal with the text of the v1 engine when there is no refresh token', async () => {
		helper.getDecrypted.mockResolvedValue({
			grantType: 'authorizationCode',
			accessTokenUrl: tokenUrl,
			clientId: 'c',
			clientSecret: 's',
			authentication: 'body',
			oauthTokenData: { access_token: 'old' },
		});
		// `ClientOAuth2Token.refresh` of @n8n/client-oauth2: the step of the runtime fails with it.
		await expect(credentials().refreshOAuth2(binding, 'wf1')).rejects.toThrow(
			'OAuth access token expired and no refresh token is available. Please reconnect the credentials.',
		);
		expect(helper.updateCredentialsOauthTokenData).not.toHaveBeenCalled();
	});

	describe('allowed domains', () => {
		const plain = { ...binding, slot: 'plain', type: 'httpHeaderAuth' };

		it('gives wfrt the list of a credential with specific domains', async () => {
			helper.getDecrypted.mockResolvedValue({
				name: 'X-Key',
				value: 'k',
				allowedHttpRequestDomains: 'domains',
				allowedDomains: ' api.example.com, *.example.org ',
			});
			const document = await credentials().buildDocument('wf1', [plain]);
			expect(document.plain).toMatchObject({
				allowedDomains: { mode: 'domains', domains: 'api.example.com, *.example.org' },
			});
		});

		it('gives wfrt the mode of a credential that allows no domain', async () => {
			helper.getDecrypted.mockResolvedValue({
				name: 'X-Key',
				value: 'k',
				allowedHttpRequestDomains: 'none',
			});
			const document = await credentials().buildDocument('wf1', [plain]);
			expect(document.plain).toMatchObject({ allowedDomains: { mode: 'none' } });
		});

		it('adds nothing for a credential that allows all domains', async () => {
			helper.getDecrypted.mockResolvedValue({
				name: 'X-Key',
				value: 'k',
				allowedHttpRequestDomains: 'all',
			});
			const document = await credentials().buildDocument('wf1', [plain]);
			expect(document.plain).toBeDefined();
			expect(document.plain).not.toHaveProperty('allowedDomains');
		});
	});

	describe('a Postgres credential', () => {
		const database = { ...binding, slot: 'db', type: 'postgres' };
		const values = {
			host: 'db.example.com',
			port: 5432,
			database: 'shop',
			user: 'app',
			password: 'pg-secret',
			ssl: 'require',
			allowUnauthorizedCerts: false,
			sshTunnel: false,
			maxConnections: 100,
		};

		it('gives wfrt the connection values under the names that its sql client reads', async () => {
			helper.getDecrypted.mockResolvedValue({ ...values });
			const document = await credentials().buildDocument('wf1', [database]);
			expect(document.db).toMatchObject({ type: 'postgres', data: values });
			// The values are not for a request: the slot has no injection and no renewal.
			expect(document.db).not.toHaveProperty('inject');
			expect(document.db).not.toHaveProperty('renewal');
		});

		it('keeps the tunnel and certificate values, so wfrt gives the node to the fallback host', async () => {
			const tunnel = { ...values, sshTunnel: true, caCertificate: 'ca', clientCertificate: 'c' };
			helper.getDecrypted.mockResolvedValue({ ...tunnel });
			const document = await credentials().buildDocument('wf1', [database]);
			expect(document.db).toMatchObject({ data: tunnel });
		});

		it('writes no value of the credential to the log', async () => {
			helper.getDecrypted.mockResolvedValue({ ...values });
			await credentials().buildDocument('wf1', [database]);
			const logged = JSON.stringify([
				logger.debug.mock.calls,
				logger.info.mock.calls,
				logger.warn.mock.calls,
				logger.error.mock.calls,
			]);
			expect(logged).not.toContain('pg-secret');
			expect(logged).not.toContain('db.example.com');
		});
	});

	describe('a MySQL credential', () => {
		const database = { ...binding, slot: 'db', type: 'mySql' };
		// The fields of the n8n credential type `mySql`.
		const values = {
			host: 'db.example.com',
			database: 'shop',
			user: 'app',
			password: 'my-secret',
			port: 3306,
			connectTimeout: 10000,
			ssl: false,
			sshTunnel: false,
		};

		it('gives wfrt the connection values under the names that its sql client reads', async () => {
			helper.getDecrypted.mockResolvedValue({ ...values });
			const document = await credentials().buildDocument('wf1', [database]);
			expect(document.db).toMatchObject({ type: 'mySql', data: values });
			// The names that `loadCredential` of the MySQL client of `wfrt` reads.
			for (const name of ['host', 'port', 'user', 'password', 'database', 'ssl', 'sshTunnel']) {
				expect(document.db).toHaveProperty(['data', name]);
			}
			// The values are not for a request: the slot has no injection and no renewal.
			expect(document.db).not.toHaveProperty('inject');
			expect(document.db).not.toHaveProperty('renewal');
		});

		it('keeps the tunnel and certificate values, so wfrt gives the node to the fallback host', async () => {
			const tunnel = {
				...values,
				ssl: true,
				sshTunnel: true,
				caCertificate: 'ca',
				clientCertificate: 'c',
				clientPrivateKey: 'k',
			};
			helper.getDecrypted.mockResolvedValue({ ...tunnel });
			const document = await credentials().buildDocument('wf1', [database]);
			expect(document.db).toMatchObject({ data: tunnel });
		});

		it('writes no value of the credential to the log', async () => {
			helper.getDecrypted.mockResolvedValue({ ...values });
			await credentials().buildDocument('wf1', [database]);
			const logged = JSON.stringify([
				logger.debug.mock.calls,
				logger.info.mock.calls,
				logger.warn.mock.calls,
				logger.error.mock.calls,
			]);
			expect(logged).not.toContain('my-secret');
			expect(logged).not.toContain('db.example.com');
		});
	});

	describe('renewal', () => {
		it('tells wfrt that an OAuth2 slot is renewed on 401', async () => {
			const document = await credentials().buildDocument('wf1', [binding]);
			// Without statuses of its own, a request can give those of its node (`statusDefault`).
			expect(document.oauth).toMatchObject({
				renewal: { status: [401], oauth2: true, statusDefault: true },
			});
		});

		it('uses the expiry statuses of the credential, as n8n-core does', async () => {
			helper.getDecrypted.mockResolvedValue({
				grantType: 'clientCredentials',
				accessTokenUrl: tokenUrl,
				// A stored credential can have numbers and texts in one list. The type has no such list.
				tokenExpiredStatusCode: [403, '419'] as unknown as string[],
				oauthTokenData: { access_token: 'old' },
			});
			const document = await credentials().buildDocument('wf1', [binding]);
			expect(document.oauth).toMatchObject({ renewal: { status: [403, 419], oauth2: true } });
			expect(Reflect.get(Object(document.oauth), 'renewal')).not.toHaveProperty('statusDefault');
		});

		it('gets the first token of a client-credentials credential when it builds the document', async () => {
			const stored = {
				grantType: 'clientCredentials',
				accessTokenUrl: tokenUrl,
				clientId: 'c',
				clientSecret: 's',
				authentication: 'body',
			};
			helper.getDecrypted.mockImplementation(async () => {
				const saved = helper.updateCredentialsOauthTokenData.mock.calls[0]?.[2].oauthTokenData;
				return saved === undefined ? { ...stored } : { ...stored, oauthTokenData: saved };
			});
			const document = await credentials().buildDocument('wf1', [binding]);
			expect(helper.updateCredentialsOauthTokenData).toHaveBeenCalledTimes(1);
			expect(JSON.stringify(document.oauth)).toContain('"access_token":"new"');
		});

		it('does not get a token for a client-credentials credential that has one', async () => {
			helper.getDecrypted.mockResolvedValue({
				grantType: 'clientCredentials',
				accessTokenUrl: tokenUrl,
				oauthTokenData: { access_token: 'old' },
			});
			await credentials().buildDocument('wf1', [binding]);
			expect(helper.updateCredentialsOauthTokenData).not.toHaveBeenCalled();
		});

		it('gives no renewal to a credential whose values do not expire', async () => {
			helper.getDecrypted.mockResolvedValue({ apiKey: 'k' });
			const plain = { ...binding, slot: 'plain', type: 'httpHeaderAuth' };
			const document = await credentials().buildDocument('wf1', [plain]);
			expect(document.plain).toBeDefined();
			expect(document.plain).not.toHaveProperty('renewal');
			await expect(credentials().renew(plain, 'wf1', false)).rejects.toThrow(
				'n8n cannot renew a credential of type "httpHeaderAuth"',
			);
		});

		it('refreshes an OAuth2 credential when wfrt asks for a renewal', async () => {
			await credentials().renew(binding, 'wf1', false);
			expect(helper.updateCredentialsOauthTokenData).toHaveBeenCalledTimes(1);
			expect(helper.updateCredentialsOauthTokenData.mock.calls[0][2].oauthTokenData).toMatchObject({
				access_token: 'new',
			});
		});

		describe('a credential with preAuthentication', () => {
			const session: CredentialSlotBinding = {
				slot: 'session',
				type: 'sessionApi',
				credentialId: 'cred3',
				credentialName: 'Session',
			};

			beforeEach(() => {
				credentialTypes.recognizes.mockReturnValue(true);
				credentialTypes.getParentTypes.mockReturnValue([]);
				credentialTypes.getByName.mockReturnValue({
					name: 'sessionApi',
					displayName: 'Session',
					properties: [
						{
							displayName: 'Session token',
							name: 'sessionToken',
							type: 'hidden',
							typeOptions: { expirable: true },
							default: '',
						},
					],
					preAuthentication: async () => ({ sessionToken: 'unused' }),
				});
				helper.getDecrypted.mockResolvedValue({ user: 'u', sessionToken: '' });
				helper.preAuthentication.mockResolvedValue({ sessionToken: 's2' });
			});

			it('gets a new session token as v1 does after a 401, with the helper that saves it', async () => {
				await credentials().renew(session, 'wf1', false);
				expect(helper.preAuthentication).toHaveBeenCalledTimes(1);
				const [, data, type, node, expired] = helper.preAuthentication.mock.calls[0];
				expect(data).toEqual({ user: 'u', sessionToken: '' });
				expect(type).toBe('sessionApi');
				expect(node.credentials).toEqual({ sessionApi: { id: 'cred3', name: 'Session' } });
				expect(expired).toBe(true);
			});

			it('fills an empty session token when it builds the document, and marks the slot', async () => {
				const document = await credentials().buildDocument('wf1', [session]);
				expect(helper.preAuthentication.mock.calls[0][4]).toBe(false);
				expect(document.session).toMatchObject({
					data: { sessionToken: 's2' },
					renewal: { status: [401] },
				});
			});
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

		it('names the nodes that must run in the fallback host, and nothing of the credential', async () => {
			const checked = { ...guard(['@flags=f00000001:1']), name: 'g1', node: 'Checked' };
			const unchecked = { ...guard(['@flags=f00000001:0']), name: 'g2', node: 'Unchecked' };
			const derivations = { acme: [short, checked, unchecked] };

			expect(await credentials().unprovenFlagNodes('wf1', [acme], derivations)).toEqual([
				'Unchecked',
			]);

			// The credential changes: the other node has values that were not checked.
			helper.getDecrypted.mockResolvedValue({ apiKey: 'k'.repeat(64), account: 'jo' });
			expect(await credentials().unprovenFlagNodes('wf1', [acme], derivations)).toEqual([
				'Checked',
			]);

			// A credential that n8n cannot read: no node is checked.
			helper.getDecrypted.mockRejectedValue(new Error('sk-live-1 is not readable'));
			expect(await credentials().unprovenFlagNodes('wf1', [acme], derivations)).toEqual([
				'Checked',
				'Unchecked',
			]);
			expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('f00000001');

			// A slot without a guard needs no credential data.
			helper.getDecrypted.mockClear();
			expect(await credentials().unprovenFlagNodes('wf1', [acme], { acme: [text] })).toEqual([]);
			expect(helper.getDecrypted).not.toHaveBeenCalled();
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
			expect(mintExpiries(document).get('sa')).toBe(minted.m1.expires_at);
			// `wfrt` renews before this time, and after a 401.
			expect(document.sa).toMatchObject({
				renewal: { status: [401], expiresAt: minted.m1.expires_at },
			});
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

		it('makes one token for the workflows of a renewal, and fails the renewal on an error', async () => {
			nock('https://oauth2.googleapis.com')
				.post('/token')
				.once()
				.reply(200, { access_token: 'shared', expires_in: 3599, token_type: 'Bearer' });
			const minted = new Map();
			const options = { strict: true, minted };

			const first = await credentials().buildDocument('wf1', [serviceAccount], {}, mints, options);
			const second = await credentials().buildDocument('wf2', [serviceAccount], {}, mints, options);

			expect(first.sa).toMatchObject({ data: { n8nMinted: { m1: { access_token: 'shared' } } } });
			expect(second.sa).toEqual(first.sa);
			expect(minted.size).toBe(1);

			nock('https://oauth2.googleapis.com').post('/token').reply(400, { error: 'invalid_grant' });
			await expect(
				credentials().buildDocument('wf1', [serviceAccount], {}, mints, { strict: true }),
			).rejects.toThrow();
		});

		describe('for the HTTP Request node', () => {
			const httpMints = {
				sa: [
					{
						name: 'mgooglehttp',
						kind: 'google-service-account-http' as const,
						service: 'httpRequest',
						scopes: [],
					},
				],
			};

			beforeEach(async () => {
				const { GoogleApi } = await import(
					'n8n-nodes-base/dist/credentials/GoogleApi.credentials.js'
				);
				credentialTypes.getByName.mockReturnValue(new GoogleApi());
			});

			it('makes the token with the authenticate of the credential type and the scopes of the data', async () => {
				helper.getDecrypted.mockResolvedValue({
					email: 'robot@project.test',
					privateKey,
					httpNode: true,
					scopes: 'https://scopes.test/a, https://scopes.test/b',
				});
				let form = '';
				nock('https://oauth2.googleapis.com')
					.post('/token', (body: unknown) => {
						form = typeof body === 'string' ? body : new URLSearchParams(body as never).toString();
						return true;
					})
					.reply(200, { access_token: 'http-token', expires_in: 3599, token_type: 'Bearer' });

				const document = await credentials().buildDocument('wf1', [serviceAccount], {}, httpMints);

				expect(document.sa).toMatchObject({
					data: { n8nMinted: { mgooglehttp: { access_token: 'http-token' } } },
				});
				const assertion = new URLSearchParams(form).get('assertion') ?? '';
				const claims = JSON.parse(
					Buffer.from(assertion.split('.')[1], 'base64url').toString('utf8'),
				) as Record<string, unknown>;
				expect(claims).toMatchObject({
					iss: 'robot@project.test',
					scope: 'https://scopes.test/a https://scopes.test/b',
				});
			});

			it('makes no token for a credential that is not set up for the HTTP Request node', async () => {
				const document = await credentials().buildDocument('wf1', [serviceAccount], {}, httpMints);

				expect(document).toEqual({});
				expect(logger.warn).toHaveBeenCalledTimes(1);
			});
		});

		it('does not make a token when the scopes are not the scopes of n8n', async () => {
			const other = { sa: [{ ...mints.sa[0], scopes: ['https://scopes.test/other'] }] };

			const document = await credentials().buildDocument('wf1', [serviceAccount], {}, other);

			expect(document).toEqual({});
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});
	});
});
