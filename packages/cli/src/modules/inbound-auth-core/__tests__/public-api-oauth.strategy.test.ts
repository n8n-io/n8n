import type { Logger } from '@n8n/backend-common';
import { JwtService } from '@n8n/backend-services';
import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import type { AuthenticationPipeline, AuthenticationService } from '@n8n/inbound-auth';
import { getApiKeyScopesForRole, type Scope, type SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { sign } from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { PublicApiOAuthStrategy } from '../public-api-oauth.strategy';
import type { PublicApiProtectedResource } from '../public-api-protected-resource';
import { InboundResourceAdmission } from '../resource-admission';

const RESOURCE_URL = 'https://n8n.test/api/v1';
const CHALLENGE =
	'Bearer resource_metadata="https://n8n.test/.well-known/oauth-protected-resource/api/v1"';

const jwtService = new JwtService(
	mock<InstanceSettings>({ encryptionKey: 'test-key' }),
	mock(),
	mock(),
);
const resource = mock<PublicApiProtectedResource>({ surface: 'public-api' });
const pipeline = mock<AuthenticationPipeline>();
const authenticationService = mock<AuthenticationService>();
const userRepository = mock<UserRepository>();

let strategy: PublicApiOAuthStrategy;

/** Only `iss` matters here: the pipeline, not the strategy, verifies the signature. */
const tokenFrom = (iss: string) => sign({ iss, sub: 'alice' }, 'unverified');

const makeReq = (headers: Record<string, string>) => {
	const res = mock<Response>();
	const req = mock<AuthenticatedRequest>({
		headers: headers as AuthenticatedRequest['headers'],
		method: 'GET',
		originalUrl: '/api/v1/workflows',
		ip: '203.0.113.7',
		res,
	});
	return { req, res };
};

const makeUser = (id: string, scopeSlugs: string[]): User =>
	({
		...mock<User>(),
		id,
		role: {
			...mock<User['role']>(),
			slug: 'global:member',
			scopes: scopeSlugs.map((slug) => ({ ...mock(), slug: slug as Scope })),
		},
	}) as User;

beforeEach(() => {
	vi.clearAllMocks();
	resource.isAvailable.mockResolvedValue(true);
	resource.authorize.mockResolvedValue(true);
	resource.getResourceUrl.mockReturnValue(RESOURCE_URL);
	resource.getAudiences.mockReturnValue([RESOURCE_URL]);
	authenticationService.advertise.mockResolvedValue({
		authorizationServers: ['https://idp.example'],
		challenges: [CHALLENGE],
	});
	strategy = new PublicApiOAuthStrategy(
		resource,
		new InboundResourceAdmission(pipeline, authenticationService, mock<Logger>()),
		jwtService,
		userRepository,
	);
});

describe('PublicApiOAuthStrategy', () => {
	describe('buildTokenGrant', () => {
		it('abstains: the pipeline needs the request, not a bare token', async () => {
			expect(await strategy.buildTokenGrant()).toBeNull();
		});
	});

	describe('authenticate', () => {
		it.each([
			['no Authorization header', {}],
			['a non-bearer Authorization header', { authorization: 'Basic dXNlcjpwYXNz' }],
			['a bearer that is not a JWT', { authorization: 'Bearer not-a-jwt' }],
		])('abstains with %s', async (_name, headers) => {
			const { req } = makeReq(headers);

			expect(await strategy.authenticate(req)).toBeNull();
			expect(pipeline.run).not.toHaveBeenCalled();
		});

		it.each(['n8n', 'n8n-token-exchange', 'urn:example:idp', 'ftp://idp.example', ''])(
			'abstains for issuer %j, which is not an http(s) URL',
			async (iss) => {
				const { req } = makeReq({ authorization: `Bearer ${tokenFrom(iss)}` });

				expect(await strategy.authenticate(req)).toBeNull();
				expect(pipeline.run).not.toHaveBeenCalled();
			},
		);

		it('abstains while the public API is unavailable', async () => {
			resource.isAvailable.mockResolvedValue(false);
			const { req } = makeReq({ authorization: `Bearer ${tokenFrom('https://idp.example')}` });

			expect(await strategy.authenticate(req)).toBeNull();
			expect(pipeline.run).not.toHaveBeenCalled();
		});

		it.each(['https://idp.example', 'http://localhost:5678'])(
			'runs the pipeline for issuer %s on the public-api surface with the resource and the request',
			async (iss) => {
				const token = tokenFrom(iss);
				pipeline.run.mockResolvedValue({ ok: false, reason: 'unknown-issuer' });
				const { req } = makeReq({ authorization: `Bearer ${token}` });

				await strategy.authenticate(req);

				expect(pipeline.run).toHaveBeenCalledTimes(1);
				expect(pipeline.run).toHaveBeenCalledWith(
					expect.objectContaining({
						surface: 'public-api',
						resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
						credential: { kind: 'bearer', token },
						request: expect.objectContaining({
							method: 'GET',
							url: '/api/v1/workflows',
							ip: '203.0.113.7',
						}),
					}),
				);
			},
		);

		describe('on a pipeline reject', () => {
			it('fails fast with the advertised challenge, error=invalid_token and the reason', async () => {
				pipeline.run.mockResolvedValue({
					ok: false,
					reason: 'source-not-accepted',
					detail: 'internal detail',
				});
				const { req, res } = makeReq({
					authorization: `Bearer ${tokenFrom('https://idp.example')}`,
				});

				expect(await strategy.authenticate(req)).toBe(false);

				expect(authenticationService.advertise).toHaveBeenCalledWith(
					expect.objectContaining({
						surface: 'public-api',
						resource: { url: RESOURCE_URL, acceptedAudiences: [RESOURCE_URL] },
					}),
				);
				expect(res.setHeader).toHaveBeenCalledWith(
					'WWW-Authenticate',
					`${CHALLENGE}, error="invalid_token", error_description="source-not-accepted"`,
				);
			});

			it('never puts the reject detail into the response header', async () => {
				pipeline.run.mockResolvedValue({
					ok: false,
					reason: 'source-unusable',
					detail: 'source status is error',
				});
				const { req, res } = makeReq({
					authorization: `Bearer ${tokenFrom('https://idp.example')}`,
				});

				await strategy.authenticate(req);

				expect(JSON.stringify(res.setHeader.mock.calls)).not.toContain('source status is error');
			});

			it('falls back to a bare Bearer challenge when no source is advertised', async () => {
				authenticationService.advertise.mockResolvedValue({
					authorizationServers: [],
					challenges: [],
				});
				pipeline.run.mockResolvedValue({ ok: false, reason: 'unknown-issuer' });
				const { req, res } = makeReq({
					authorization: `Bearer ${tokenFrom('https://idp.example')}`,
				});

				expect(await strategy.authenticate(req)).toBe(false);
				expect(res.setHeader).toHaveBeenCalledWith(
					'WWW-Authenticate',
					'Bearer, error="invalid_token", error_description="unknown-issuer"',
				);
			});
		});

		describe('on success', () => {
			const contextWith = (tokenScopes?: string[]): SecurityContext => ({
				subject: { id: 'user-1', type: 'human', role: mock() },
				authMethod: 'oauth-access-token',
				subjectClaim: { sourceId: 'source-1', issuer: 'https://idp.example', subject: 'alice' },
				...(tokenScopes && { tokenScopes }),
			});

			it('fails fast with error=insufficient_scope when the resource refuses the subject', async () => {
				pipeline.run.mockResolvedValue({ ok: true, value: contextWith() });
				resource.authorize.mockResolvedValue(false);
				const { req, res } = makeReq({
					authorization: `Bearer ${tokenFrom('https://idp.example')}`,
				});

				expect(await strategy.authenticate(req)).toBe(false);

				expect(res.setHeader).toHaveBeenCalledWith(
					'WWW-Authenticate',
					`${CHALLENGE}, error="insufficient_scope", error_description="insufficient_scope"`,
				);
				expect(userRepository.findByIdWithRole).not.toHaveBeenCalled();
			});

			it('sets the reloaded user, a role-derived grant and the security context on the request', async () => {
				const user = makeUser('user-1', ['workflow:list', 'workflow:create']);
				const context = contextWith(['workflow:list']);
				pipeline.run.mockResolvedValue({ ok: true, value: context });
				userRepository.findByIdWithRole.mockResolvedValue(user);
				const { req, res } = makeReq({
					authorization: `Bearer ${tokenFrom('https://idp.example')}`,
				});

				expect(await strategy.authenticate(req)).toBe(true);

				expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
				expect(req.user).toBe(user);
				expect(req.tokenGrant).toEqual({
					scopes: ['workflow:list', 'workflow:create'],
					apiKeyScopes: ['workflow:list'],
					subject: user,
				});
				expect(req.ctx).toEqual({ security: context });
				expect(res.setHeader).not.toHaveBeenCalled();
			});

			// Only API key scopes narrow the grant; an IdP's own scopes are ignored.
			it.each<{ name: string; tokenScopes?: string[]; expected: (role: string[]) => string[] }>([
				{
					name: 'an API key scope',
					tokenScopes: ['workflow:list'],
					expected: () => ['workflow:list'],
				},
				{
					name: 'an API key scope next to IdP scopes',
					tokenScopes: ['workflow:list', 'openid'],
					expected: () => ['workflow:list'],
				},
				{ name: 'only IdP scopes', tokenScopes: ['openid', 'profile'], expected: (role) => role },
				{ name: 'no scopes', tokenScopes: [], expected: (role) => role },
				{ name: 'no scope claim', expected: (role) => role },
				{ name: 'an API key scope the role lacks', tokenScopes: ['user:list'], expected: () => [] },
			])('grants $name as the role allows', async ({ tokenScopes, expected }) => {
				const user = makeUser('user-1', ['workflow:list', 'workflow:create']);
				pipeline.run.mockResolvedValue({ ok: true, value: contextWith(tokenScopes) });
				userRepository.findByIdWithRole.mockResolvedValue(user);
				const { req } = makeReq({ authorization: `Bearer ${tokenFrom('https://idp.example')}` });

				await strategy.authenticate(req);

				expect(req.tokenGrant?.apiKeyScopes).toEqual(expected(getApiKeyScopesForRole(user)));
			});

			it('fails fast when the subject no longer exists', async () => {
				pipeline.run.mockResolvedValue({ ok: true, value: contextWith() });
				userRepository.findByIdWithRole.mockResolvedValue(null);
				const { req } = makeReq({
					authorization: `Bearer ${tokenFrom('https://idp.example')}`,
				});

				expect(await strategy.authenticate(req)).toBe(false);
			});
		});
	});
});
