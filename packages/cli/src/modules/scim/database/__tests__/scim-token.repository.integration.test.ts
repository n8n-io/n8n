import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createHash } from 'crypto';

import { ScimTokenConflictError } from '../../scim.errors';
import {
	SCIM_TOKEN_SETTINGS_KEY,
	ScimTokenRepository,
	type NewScimToken,
} from '../scim-token.repository';

const ctx = {};

const newToken = (name: string): NewScimToken => ({
	tokenHash: createHash('sha256').update(name).digest('hex'),
	tokenHint: name.slice(-4),
	createdById: 'user-1',
	createdAt: new Date('2026-10-23T10:00:00.000Z'),
});

describe('ScimTokenRepository', () => {
	let repository: ScimTokenRepository;
	const settings = () => Container.get(SettingsRepository);
	const readRow = async () => await settings().findByKey(SCIM_TOKEN_SETTINGS_KEY);

	beforeAll(async () => {
		// The race tests need real parallel transactions on Postgres.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testDb.init();
		repository = Container.get(ScimTokenRepository);
	});

	beforeEach(async () => {
		await settings().delete({ key: SCIM_TOKEN_SETTINGS_KEY });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('reads no token on an instance that never had one', async () => {
		await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();
	});

	it('stores the first token in a settings row that does not load on startup', async () => {
		const token = newToken('first');

		await repository.replace(null, token, ctx);

		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(token);
		expect(await readRow()).toMatchObject({ loadOnStartup: false });
	});

	it('replaces the token that the caller read', async () => {
		await repository.replace(null, newToken('first'), ctx);

		await repository.replace(newToken('first').tokenHash, newToken('second'), ctx);

		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(newToken('second'));
	});

	it.each([
		['the caller read no token', null],
		['the caller read another token', newToken('other').tokenHash],
	])('rejects a replace when %s and keeps the stored token', async (_, expected) => {
		await repository.replace(null, newToken('first'), ctx);

		await expect(repository.replace(expected, newToken('second'), ctx)).rejects.toThrow(
			ScimTokenConflictError,
		);
		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(newToken('first'));
	});

	it('rejects a replace of a token when the instance has none', async () => {
		await expect(
			repository.replace(newToken('first').tokenHash, newToken('second'), ctx),
		).rejects.toThrow(ScimTokenConflictError);
		await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();
	});

	describe.each([
		['on an instance that never had a token', async () => {}],
		['after a revoke', async () => await repository.revokeInstanceToken(ctx)],
		['from the same token', async () => await repository.replace(null, newToken('start'), ctx)],
	])('two concurrent writes %s', (_, setUp) => {
		it('accept one write and reject the other', async () => {
			await setUp();
			const expected = (await repository.findInstanceToken(ctx))?.tokenHash ?? null;

			const results = await Promise.allSettled([
				repository.replace(expected, newToken('a'), ctx),
				repository.replace(expected, newToken('b'), ctx),
			]);

			const fulfilled = results.filter(({ status }) => status === 'fulfilled');
			const rejected = results.flatMap((result) =>
				result.status === 'rejected' ? [result.reason] : [],
			);
			expect(fulfilled).toHaveLength(1);
			expect(rejected).toHaveLength(1);
			expect(rejected[0]).toBeInstanceOf(ScimTokenConflictError);

			const winner = results[0].status === 'fulfilled' ? newToken('a') : newToken('b');
			await expect(repository.findInstanceToken(ctx)).resolves.toEqual(winner);
		});
	});

	it('removes the token on revoke and accepts a new first token', async () => {
		await repository.replace(null, newToken('first'), ctx);

		await repository.revokeInstanceToken(ctx);

		await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();
		await repository.replace(null, newToken('second'), ctx);
		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(newToken('second'));
	});

	it('does nothing on revoke when the instance has no token', async () => {
		await repository.revokeInstanceToken(ctx);

		await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();
	});

	it.each([
		['text that is not JSON', 'not json'],
		['JSON in another shape', JSON.stringify({ current: { tokenHash: 'not-a-hash' } })],
	])('reads a row with %s as no token and replaces it', async (_, value) => {
		await settings().insert({ key: SCIM_TOKEN_SETTINGS_KEY, value, loadOnStartup: false });

		await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();

		await repository.replace(null, newToken('first'), ctx);
		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(newToken('first'));
	});
});
