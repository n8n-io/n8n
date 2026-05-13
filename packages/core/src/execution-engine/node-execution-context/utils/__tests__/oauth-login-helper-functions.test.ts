import { Container } from '@n8n/di';
import { mock, mockDeep } from 'jest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import nock from 'nock';

import { InstanceSettings } from '@/instance-settings';
import {
	FORM_OAUTH_ISSUER,
	signFormOauthJwt,
	verifyFormOauthJwt,
	type FormOauthSessionJwtPayload,
	type FormOauthStateJwtPayload,
} from '@/utils/form-oauth-jwt';

import { getOauthLoginHelperFunctions } from '../oauth-login-helper-functions';

const HMAC_SECRET = 'test-hmac-secret';

const decryptedCredential: ICredentialDataDecryptedObject = {
	clientId: 'client-id-123',
	clientSecret: 'super-secret',
	authUrl: 'https://idp.example.com/authorize',
	accessTokenUrl: 'https://idp.example.com/token',
	scope: 'openid profile email',
};

describe('getOauthLoginHelperFunctions', () => {
	beforeAll(() => {
		Container.set(InstanceSettings, { hmacSignatureSecret: HMAC_SECRET } as InstanceSettings);
	});

	const workflow = mock<Workflow>({ id: 'wf-123' });
	const node = mock<INode>({
		id: 'node-abc',
		name: 'Form Trigger',
		credentials: { oAuth2Api: { id: 'cred-xyz', name: 'My OAuth Creds' } },
	});

	const additionalData = mockDeep<IWorkflowExecuteAdditionalData>({
		restApiUrl: 'http://localhost:5678/rest',
		httpRequest: {
			originalUrl: '/form/my-path',
			protocol: 'http',
			headers: { host: 'localhost:5678' },
			get(name: string) {
				return name.toLowerCase() === 'host' ? 'localhost:5678' : undefined;
			},
		} as never,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		additionalData.credentialsHelper.getDecrypted.mockResolvedValue(decryptedCredential);
	});

	it('returns the IDP authorize URL with the configured client_id, scope, and callback', async () => {
		const helpers = getOauthLoginHelperFunctions(workflow, node, additionalData);
		const url = await helpers.getWebhookOauthRedirectUrl();
		const parsed = new URL(url);

		expect(parsed.origin + parsed.pathname).toBe('https://idp.example.com/authorize');
		expect(parsed.searchParams.get('response_type')).toBe('code');
		expect(parsed.searchParams.get('client_id')).toBe('client-id-123');
		expect(parsed.searchParams.get('redirect_uri')).toBe('http://localhost:5678/form/my-path');
		expect(parsed.searchParams.get('scope')).toBe('openid profile email');
		expect(parsed.searchParams.get('state')).toBeTruthy();
	});

	it('appends prompt=login when reauth is requested', async () => {
		const helpers = getOauthLoginHelperFunctions(workflow, node, additionalData);
		const url = await helpers.getWebhookOauthRedirectUrl({ reauth: true });
		expect(new URL(url).searchParams.get('prompt')).toBe('login');
	});

	it('does not include prompt by default', async () => {
		const helpers = getOauthLoginHelperFunctions(workflow, node, additionalData);
		const url = await helpers.getWebhookOauthRedirectUrl();
		expect(new URL(url).searchParams.get('prompt')).toBeNull();
	});

	it('the state JWT carries wf and node identifiers and verifies against the instance secret', async () => {
		const helpers = getOauthLoginHelperFunctions(workflow, node, additionalData);
		const url = await helpers.getWebhookOauthRedirectUrl();
		const state = new URL(url).searchParams.get('state');

		expect(state).toBeTruthy();
		const verified = verifyFormOauthJwt<FormOauthStateJwtPayload & { iss: string }>(
			state as string,
			HMAC_SECRET,
		);

		expect(verified).not.toBeNull();
		expect(verified?.wf).toBe('wf-123');
		expect(verified?.node).toBe('node-abc');
		expect(verified?.iss).toBe(FORM_OAUTH_ISSUER);
		expect(verified?.nonce).toMatch(/^[0-9a-f]{32}$/);
	});

	it('throws when no oAuth2Api credential is configured on the node', async () => {
		const nodeWithoutCred = mock<INode>({ id: 'node-abc', name: 'Form', credentials: undefined });
		const helpers = getOauthLoginHelperFunctions(workflow, nodeWithoutCred, additionalData);

		await expect(helpers.getWebhookOauthRedirectUrl()).rejects.toThrow(
			/no "oAuth2Api" credential configured/,
		);
	});

	it('throws when the credential is missing clientId or authUrl', async () => {
		additionalData.credentialsHelper.getDecrypted.mockResolvedValueOnce({
			clientSecret: 'secret-only',
		} as ICredentialDataDecryptedObject);

		const helpers = getOauthLoginHelperFunctions(workflow, node, additionalData);
		await expect(helpers.getWebhookOauthRedirectUrl()).rejects.toThrow(/missing required fields/);
	});

	it('preserves existing query params on the authUrl when appending OAuth parameters', async () => {
		additionalData.credentialsHelper.getDecrypted.mockResolvedValueOnce({
			...decryptedCredential,
			authUrl: 'https://idp.example.com/authorize?tenant=acme',
		} as ICredentialDataDecryptedObject);

		const helpers = getOauthLoginHelperFunctions(workflow, node, additionalData);
		const url = await helpers.getWebhookOauthRedirectUrl();
		const parsed = new URL(url);

		expect(parsed.searchParams.get('tenant')).toBe('acme');
		expect(parsed.searchParams.get('client_id')).toBe('client-id-123');
	});

	describe('exchangeWebhookOauthCode', () => {
		const buildValidState = () =>
			signFormOauthJwt<FormOauthStateJwtPayload>(
				{ nonce: 'a'.repeat(32), wf: 'wf-123', node: 'node-abc' },
				HMAC_SECRET,
				60,
			);

		const nodeWithUserinfo = mock<INode>({
			id: 'node-abc',
			name: 'Form Trigger',
			parameters: { userInfoUrl: 'https://idp.example.com/userinfo' },
			credentials: { oAuth2Api: { id: 'cred-xyz', name: 'My OAuth Creds' } },
		});

		afterEach(() => {
			nock.cleanAll();
		});

		it('exchanges the code, fetches userinfo, and returns merged claims + signed session JWT', async () => {
			nock('https://idp.example.com')
				.post('/token')
				.reply(200, {
					access_token: 'at-1',
					id_token:
						'eyJhbGciOiJIUzI1NiJ9.' +
						Buffer.from(JSON.stringify({ sub: 'u-1', name: 'Jane' })).toString('base64url') +
						'.sig',
				});
			nock('https://idp.example.com')
				.get('/userinfo')
				.matchHeader('authorization', 'Bearer at-1')
				.reply(200, { sub: 'u-1', email: 'jane@example.com' });

			const helpers = getOauthLoginHelperFunctions(workflow, nodeWithUserinfo, additionalData);
			const result = await helpers.exchangeWebhookOauthCode({
				code: 'code-1',
				state: buildValidState(),
			});

			expect(result.claims.sub).toBe('u-1');
			expect(result.claims.email).toBe('jane@example.com');
			expect(result.claims.name).toBe('Jane');

			const verified = verifyFormOauthJwt<FormOauthSessionJwtPayload>(
				result.sessionJwt,
				HMAC_SECRET,
			);
			expect(verified?.wf).toBe('wf-123');
			expect(verified?.node).toBe('node-abc');
			expect(verified?.claims).toEqual(result.claims);
		});

		it('throws when state JWT is invalid', async () => {
			const helpers = getOauthLoginHelperFunctions(workflow, nodeWithUserinfo, additionalData);
			await expect(
				helpers.exchangeWebhookOauthCode({ code: 'code-1', state: 'tampered.jwt.value' }),
			).rejects.toThrow(/state is invalid/);
		});

		it('throws when state JWT references a different workflow', async () => {
			const wrongState = signFormOauthJwt<FormOauthStateJwtPayload>(
				{ nonce: 'a'.repeat(32), wf: 'someone-elses-wf', node: 'node-abc' },
				HMAC_SECRET,
				60,
			);
			const helpers = getOauthLoginHelperFunctions(workflow, nodeWithUserinfo, additionalData);
			await expect(
				helpers.exchangeWebhookOauthCode({ code: 'code-1', state: wrongState }),
			).rejects.toThrow(/does not match this form/);
		});

		it('throws when token exchange fails', async () => {
			nock('https://idp.example.com').post('/token').reply(400, { error: 'invalid_grant' });
			const helpers = getOauthLoginHelperFunctions(workflow, nodeWithUserinfo, additionalData);
			await expect(
				helpers.exchangeWebhookOauthCode({ code: 'bad-code', state: buildValidState() }),
			).rejects.toThrow();
		});

		it('still returns claims from id_token when userInfoUrl is not configured', async () => {
			const nodeNoUserinfo = mock<INode>({
				id: 'node-abc',
				name: 'Form Trigger',
				parameters: { userInfoUrl: '' },
				credentials: { oAuth2Api: { id: 'cred-xyz', name: 'My OAuth Creds' } },
			});
			nock('https://idp.example.com')
				.post('/token')
				.reply(200, {
					access_token: 'at-2',
					id_token:
						'eyJhbGciOiJIUzI1NiJ9.' +
						Buffer.from(JSON.stringify({ sub: 'u-2' })).toString('base64url') +
						'.sig',
				});

			const helpers = getOauthLoginHelperFunctions(workflow, nodeNoUserinfo, additionalData);
			const result = await helpers.exchangeWebhookOauthCode({
				code: 'code-x',
				state: buildValidState(),
			});

			expect(result.claims.sub).toBe('u-2');
		});

		it('strips OIDC housekeeping claims (iat, exp, iss, aud, ...) from the merged result', async () => {
			const idTokenPayload = {
				sub: 'u-3',
				iat: 100,
				nbf: 100,
				exp: 9999,
				iss: 'https://idp',
				aud: 'cli',
				at_hash: 'x',
				c_hash: 'y',
				nonce: 'n',
				jti: 'j',
			};
			nock('https://idp.example.com')
				.post('/token')
				.reply(200, {
					access_token: 'at-3',
					id_token:
						'eyJhbGciOiJIUzI1NiJ9.' +
						Buffer.from(JSON.stringify(idTokenPayload)).toString('base64url') +
						'.sig',
				});
			const noUserinfo = mock<INode>({
				id: 'node-abc',
				name: 'Form',
				parameters: { userInfoUrl: '' },
				credentials: { oAuth2Api: { id: 'cred-xyz', name: 'x' } },
			});
			const helpers = getOauthLoginHelperFunctions(workflow, noUserinfo, additionalData);

			const result = await helpers.exchangeWebhookOauthCode({
				code: 'code-h',
				state: buildValidState(),
			});

			expect(result.claims.sub).toBe('u-3');
			for (const k of ['iat', 'nbf', 'exp', 'iss', 'aud', 'at_hash', 'c_hash', 'nonce', 'jti']) {
				expect(result.claims).not.toHaveProperty(k);
			}
		});
	});
});
