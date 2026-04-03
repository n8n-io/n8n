import { testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { ApiKeyRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import { randomString } from 'n8n-workflow';

import { createOwnerWithApiKey } from '@test-integration/db/users';
import { retryUntil } from '@test-integration/retry-until';

import { ApiKeyAuthStrategy } from '../api-key-auth.strategy';
import { JwtService } from '../jwt.service';
import { LastActiveAtService } from '../last-active-at.service';

const mockReqWith = (apiKey: string, path: string, method: string): AuthenticatedRequest =>
	mock<AuthenticatedRequest>({
		path,
		method,
		headers: {
			'x-n8n-api-key': apiKey,
		},
	});

const mockReqWithoutApiKey = (path: string, method: string): AuthenticatedRequest => {
	const req = mock<AuthenticatedRequest>({
		path,
		method,
	});
	// Override the deep-mock proxy so the header lookup returns undefined
	req.headers = { host: 'localhost' } as AuthenticatedRequest['headers'];
	return req;
};

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });

const jwtService = new JwtService(instanceSettings, mock());

let userRepository: UserRepository;
let lastActiveAtService: LastActiveAtService;
let strategy: ApiKeyAuthStrategy;

describe('ApiKeyAuthStrategy', () => {
	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	beforeAll(async () => {
		await testDb.init();
		userRepository = Container.get(UserRepository);
		lastActiveAtService = Container.get(LastActiveAtService);
		strategy = new ApiKeyAuthStrategy(userRepository, jwtService, lastActiveAtService);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('should return null when no x-n8n-api-key header is present', async () => {
		const req = mockReqWithoutApiKey('/test', 'GET');
		expect(await strategy.authenticate(req)).toBeNull();
	});

	it('should return false if api key is invalid', async () => {
		const req = mockReqWith('invalid', '/test', 'GET');
		expect(await strategy.authenticate(req)).toBe(false);
	});

	it('should return false if valid api key is not in database', async () => {
		const apiKey = jwtService.sign({ sub: '123' });
		const req = mockReqWith(apiKey, '/test', 'GET');
		expect(await strategy.authenticate(req)).toBe(false);
	});

	it('should return true and set req.user if valid api key exists in the database', async () => {
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(true);
		expect(req.user).toBeDefined();
		expect(req.user.id).toBe(owner.id);
	});

	it('should return false if expired JWT is used', async () => {
		const dateInThePast = DateTime.now().minus({ days: 1 }).toUnixInteger();
		const owner = await createOwnerWithApiKey({ expiresAt: dateInThePast });
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(false);
	});

	it('should work with non JWT (legacy) api keys', async () => {
		const legacyApiKey = `n8n_api_${randomString(10)}`;
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;

		await Container.get(ApiKeyRepository).update({ apiKey }, { apiKey: legacyApiKey });

		const req = mockReqWith(legacyApiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(true);
		expect(req.user).toBeDefined();
		expect(req.user.id).toBe(owner.id);
	});

	it('should update last active at for the user', async () => {
		const owner = await createOwnerWithApiKey();
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		await strategy.authenticate(req);

		await retryUntil(async () => {
			const userOnDb = await userRepository.findOneByOrFail({ id: owner.id });
			expect(userOnDb.lastActiveAt).toBeDefined();
			expect(DateTime.fromSQL(userOnDb.lastActiveAt!.toString()).toJSDate().getTime()).toEqual(
				DateTime.now().startOf('day').toMillis(),
			);
		});
	});

	it('should return false if user is disabled', async () => {
		const owner = await createOwnerWithApiKey();
		await userRepository.update({ id: owner.id }, { disabled: true });
		const [{ apiKey }] = owner.apiKeys;
		const req = mockReqWith(apiKey, '/test', 'GET');

		expect(await strategy.authenticate(req)).toBe(false);
	});
});
