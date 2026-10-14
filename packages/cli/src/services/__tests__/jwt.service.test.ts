import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import jwt from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';
import { generateKeyPairSync } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { JwtService } from '@/services/jwt.service';

const getJwtSecret = (svc: JwtService) => (svc as unknown as { jwtSecret: string }).jwtSecret;

describe('JwtService', () => {
	const iat = 1699984313;
	const jwtSecret = 'random-string';
	const payload = { sub: 1 };

	const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
	let globalConfig: GlobalConfig;

	beforeEach(() => {
		vi.clearAllMocks();
		globalConfig = mock<GlobalConfig>({
			userManagement: {
				jwtSecret: '',
				jwtSessionDurationHours: 168,
				jwtRefreshTimeoutHours: 0,
			},
		});
	});

	describe('secret initialization', () => {
		it('should read the secret from config, when set', () => {
			globalConfig.userManagement.jwtSecret = jwtSecret;
			const jwtService = new JwtService(instanceSettings, globalConfig, mock());
			expect(getJwtSecret(jwtService)).toEqual(jwtSecret);
		});

		it('should derive the secret from encryption key when not set in config', () => {
			globalConfig.userManagement.jwtSecret = '';
			const jwtService = new JwtService(instanceSettings, globalConfig, mock());
			expect(getJwtSecret(jwtService)).toEqual(
				'e9e2975005eddefbd31b2c04a0b0f2d9c37d9d718cf3676cddf76d65dec555cb',
			);
		});
	});

	describe('with a secret set', () => {
		let jwtService: JwtService;

		beforeAll(() => {
			vi.useFakeTimers().setSystemTime(new Date(iat * 1000));
		});

		afterAll(() => vi.useRealTimers());

		beforeEach(() => {
			globalConfig.userManagement.jwtSecret = jwtSecret;
			jwtService = new JwtService(instanceSettings, globalConfig, mock());
		});

		it('should bind a signed token to the audience of its purpose', () => {
			const token = jwtService.sign('session', payload);

			expect(jwt.decode(token)).toMatchObject({ sub: 1, iat, aud: 'n8n:session' });
		});

		it('should decode and verify payload', () => {
			const token = jwtService.sign('session', payload);

			const decodedToken = jwtService.verify('session', token);

			expect(decodedToken.sub).toEqual(1);
			expect(decodedToken.iat).toEqual(iat);
		});

		it('should throw an error on verify if the token is expired', () => {
			const expiredToken = jwtService.sign('session', payload, { expiresIn: -10 });

			expect(() => jwtService.verify('session', expiredToken)).toThrow(jwt.TokenExpiredError);
		});

		it('should reject a token signed for a different purpose', () => {
			const token = jwtService.sign('passwordReset', payload);

			expect(() => jwtService.verify('emailChange', token)).toThrow(jwt.JsonWebTokenError);
		});

		it('should bind a resource token to the audience it is given', () => {
			const resource = 'https://n8n.example.com/mcp-server/http';
			const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
			const token = jwtService.signForResource(payload, resource, privateKey, {
				algorithm: 'ES256',
			});

			expect(jwtService.verifyForResource(token, resource, publicKey).payload).toMatchObject({
				sub: 1,
			});
			expect(() =>
				jwtService.verifyForResource(token, 'https://other.example.com', publicKey),
			).toThrow(jwt.JsonWebTokenError);
		});

		describe('tokens minted before audience binding', () => {
			const invitePayload = { inviterId: 'inviter-id', inviteeId: 'invitee-id' };

			it('should accept an invite that carries the invite claims, and report it', () => {
				const logger = mock<Logger>();
				const service = new JwtService(instanceSettings, globalConfig, logger);
				const unbound = jwt.sign(invitePayload, jwtSecret);

				expect(service.verify('invite', unbound)).toMatchObject(invitePayload);
				expect(logger.warn).toHaveBeenCalledWith(
					'Accepted a token minted before its purpose carried an audience',
					{ purpose: 'invite' },
				);
			});

			it.each([
				['no invite claims', payload],
				['only an inviter', { inviterId: 'inviter-id' }],
				['an empty invitee', { inviterId: 'inviter-id', inviteeId: '' }],
				['non-string ids', { inviterId: 1, inviteeId: 2 }],
			])('should reject an invite with %s', (_, claims) => {
				const unbound = jwt.sign(claims, jwtSecret);

				expect(() => jwtService.verify('invite', unbound)).toThrow(jwt.JsonWebTokenError);
			});

			it.each([
				'session',
				'tokenExchange',
				'publicApiKey',
				'oidcState',
				'oidcNonce',
				'oauthSession',
			] as const)('should reject one for %s', (purpose) => {
				const unbound = jwt.sign(invitePayload, jwtSecret);

				expect(() => jwtService.verify(purpose, unbound)).toThrow(jwt.JsonWebTokenError);
			});

			it('should not let a bound token stand in for an invite', () => {
				const boundElsewhere = jwtService.sign('session', invitePayload);

				expect(() => jwtService.verify('invite', boundElsewhere)).toThrow(jwt.JsonWebTokenError);
			});

			it('should still reject an unbound invite with a bad signature', () => {
				const unbound = jwt.sign(invitePayload, 'a-different-secret');

				expect(() => jwtService.verify('invite', unbound)).toThrow(jwt.JsonWebTokenError);
			});
		});
	});

	describe('initialize()', () => {
		const makeRepo = () =>
			mock<{
				findActiveSigningSecret(
					type: string,
					opts?: { rewrapLegacy?: boolean },
				): Promise<string | null>;
				seedSigningSecret(type: string, secret: string): Promise<void>;
			}>();

		it('should use jwtSecret from config and skip DB entirely when set', async () => {
			globalConfig.userManagement.jwtSecret = 'env-pinned-secret';
			const repo = makeRepo();
			const jwtService = new JwtService(instanceSettings, globalConfig, mock());

			await jwtService.initialize(repo);

			expect(getJwtSecret(jwtService)).toEqual('env-pinned-secret');
			expect(repo.findActiveSigningSecret).not.toHaveBeenCalled();
			expect(repo.seedSigningSecret).not.toHaveBeenCalled();
		});

		it('should use the value from the active DB row when one exists', async () => {
			const repo = makeRepo();
			repo.findActiveSigningSecret.mockResolvedValue('db-stored-secret');
			const jwtService = new JwtService(instanceSettings, globalConfig, mock());

			await jwtService.initialize(repo);

			expect(getJwtSecret(jwtService)).toEqual('db-stored-secret');
			// Server processes may upgrade a row still in the pre-wrap form.
			expect(repo.findActiveSigningSecret).toHaveBeenCalledWith('signing.jwt', {
				rewrapLegacy: true,
			});
			expect(repo.seedSigningSecret).not.toHaveBeenCalled();
		});

		it('should persist the derived jwtSecret when no active DB row exists', async () => {
			const repo = makeRepo();
			repo.findActiveSigningSecret.mockResolvedValue(null);
			const jwtService = new JwtService(instanceSettings, globalConfig, mock());
			const derivedSecret = getJwtSecret(jwtService);

			await jwtService.initialize(repo);

			expect(repo.seedSigningSecret).toHaveBeenCalledWith('signing.jwt', derivedSecret);
			expect(getJwtSecret(jwtService)).toEqual(derivedSecret);
		});

		it('should use the winner row when a concurrent insert is ignored', async () => {
			const repo = makeRepo();
			repo.findActiveSigningSecret
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce('winner-secret');
			repo.seedSigningSecret.mockResolvedValue(undefined);
			const jwtService = new JwtService(instanceSettings, globalConfig, mock());

			await jwtService.initialize(repo);

			expect(getJwtSecret(jwtService)).toEqual('winner-secret');
		});
	});
});
