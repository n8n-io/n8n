import type { GlobalConfig } from '@n8n/config';
import jwt from 'jsonwebtoken';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { JwtService } from '@/services/jwt.service';

const getJwtSecret = (svc: JwtService) => (svc as unknown as { jwtSecret: string }).jwtSecret;

describe('JwtService', () => {
	const iat = 1699984313;
	const jwtSecret = 'random-string';
	const payload = { sub: 1 };
	const signedToken =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTY5OTk4NDMxM30.xNZOAmcidW5ovEF_mwIOzCWkJ70FEO6MFNLK2QRDOeQ';

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
			const jwtService = new JwtService(instanceSettings, globalConfig);
			expect(getJwtSecret(jwtService)).toEqual(jwtSecret);
		});

		it('should derive the secret from encryption key when not set in config', () => {
			globalConfig.userManagement.jwtSecret = '';
			const jwtService = new JwtService(instanceSettings, globalConfig);
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
			jwtService = new JwtService(instanceSettings, globalConfig);
		});

		it('should sign', () => {
			const token = jwtService.sign(payload);
			expect(token).toEqual(signedToken);
		});

		it('should decode and verify payload', () => {
			const decodedToken = jwtService.verify(signedToken);
			expect(decodedToken.sub).toEqual(1);
			expect(decodedToken.iat).toEqual(iat);
		});

		it('should throw an error on verify if the token is expired', () => {
			const expiredToken = jwt.sign(payload, jwtSecret, { expiresIn: -10 });
			expect(() => jwtService.verify(expiredToken)).toThrow(jwt.TokenExpiredError);
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
			const jwtService = new JwtService(instanceSettings, globalConfig);

			await jwtService.initialize(repo);

			expect(getJwtSecret(jwtService)).toEqual('env-pinned-secret');
			expect(repo.findActiveSigningSecret).not.toHaveBeenCalled();
			expect(repo.seedSigningSecret).not.toHaveBeenCalled();
		});

		it('should use the value from the active DB row when one exists', async () => {
			const repo = makeRepo();
			repo.findActiveSigningSecret.mockResolvedValue('db-stored-secret');
			const jwtService = new JwtService(instanceSettings, globalConfig);

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
			const jwtService = new JwtService(instanceSettings, globalConfig);
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
			const jwtService = new JwtService(instanceSettings, globalConfig);

			await jwtService.initialize(repo);

			expect(getJwtSecret(jwtService)).toEqual('winner-secret');
		});
	});
});
