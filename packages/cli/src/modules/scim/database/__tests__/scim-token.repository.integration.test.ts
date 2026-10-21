import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createHash, randomUUID } from 'crypto';

import { ScimTokenConflictError } from '../../scim.errors';
import {
	SCIM_TOKEN_SETTINGS_KEY,
	ScimTokenRepository,
	type NewScimToken,
	type StoredScimToken,
} from '../scim-token.repository';

const ctx = {};

const hashOf = (name: string) => createHash('sha256').update(name).digest('hex');

const creatorId = randomUUID();

const newToken = (name: string): NewScimToken => ({
	tokenHash: hashOf(name),
	tokenHint: name.slice(-4),
	createdById: creatorId,
	createdAt: new Date('2026-10-23T10:00:00.000Z'),
});

/** A new token as the repository reads it back, before its first use. */
const stored = (name: string): StoredScimToken => ({ ...newToken(name), lastUsedAt: null });

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
		await expect(repository.findTokenState(ctx)).resolves.toEqual({
			current: null,
			previousTokenHashes: [],
		});
	});

	it('stores the first token in a settings row that does not load on startup', async () => {
		await repository.replace(null, newToken('first'), ctx);

		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(stored('first'));
		expect(await readRow()).toMatchObject({ loadOnStartup: false });
	});

	it('replaces the token that the caller read', async () => {
		await repository.replace(null, newToken('first'), ctx);

		await repository.replace(newToken('first').tokenHash, newToken('second'), ctx);

		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(stored('second'));
	});

	it.each([
		['the caller read no token', null],
		['the caller read another token', newToken('other').tokenHash],
	])('rejects a replace when %s and keeps the stored token', async (_, expected) => {
		await repository.replace(null, newToken('first'), ctx);

		await expect(repository.replace(expected, newToken('second'), ctx)).rejects.toThrow(
			ScimTokenConflictError,
		);
		await expect(repository.findTokenState(ctx)).resolves.toEqual({
			current: stored('first'),
			previousTokenHashes: [],
		});
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

			const winner = results[0].status === 'fulfilled' ? stored('a') : stored('b');
			await expect(repository.findInstanceToken(ctx)).resolves.toEqual(winner);
		});
	});

	it('removes the token on revoke and accepts a new first token', async () => {
		await repository.replace(null, newToken('first'), ctx);

		await repository.revokeInstanceToken(ctx);

		await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();
		await repository.replace(null, newToken('second'), ctx);
		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(stored('second'));
	});

	it('does nothing on revoke when the instance has no token', async () => {
		await repository.revokeInstanceToken(ctx);

		await expect(repository.findTokenState(ctx)).resolves.toEqual({
			current: null,
			previousTokenHashes: [],
		});
	});

	it.each([
		['text that is not JSON', 'not json'],
		['JSON in another shape', JSON.stringify({ current: { tokenHash: 'not-a-hash' } })],
		[
			'a creator ID that is not a UUID',
			JSON.stringify({ current: { ...newToken('first'), createdById: 'user-1' } }),
		],
	])('reads a row with %s as no token and replaces it', async (_, value) => {
		await settings().insert({ key: SCIM_TOKEN_SETTINGS_KEY, value, loadOnStartup: false });

		await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();
		await expect(repository.findInstanceTokenWithCreator(ctx)).resolves.toBeNull();

		await repository.replace(null, newToken('first'), ctx);
		await expect(repository.findInstanceToken(ctx)).resolves.toEqual(stored('first'));
	});

	it('keeps the current token when the list of replaced tokens does not parse', async () => {
		const value = JSON.stringify({
			current: newToken('first'),
			previousTokenHashes: ['not-a-hash'],
		});
		await settings().insert({ key: SCIM_TOKEN_SETTINGS_KEY, value, loadOnStartup: false });

		await expect(repository.findTokenState(ctx)).resolves.toEqual({
			current: stored('first'),
			previousTokenHashes: [],
		});
	});

	it('reads a token row without a last use or replaced tokens', async () => {
		const value = JSON.stringify({ current: newToken('first') });
		await settings().insert({ key: SCIM_TOKEN_SETTINGS_KEY, value, loadOnStartup: false });

		await expect(repository.findTokenState(ctx)).resolves.toEqual({
			current: stored('first'),
			previousTokenHashes: [],
		});
	});

	describe('replaced tokens', () => {
		const previousTokenHashes = async () =>
			(await repository.findTokenState(ctx)).previousTokenHashes;

		it('keeps the hashes of a rotated and of a revoked token, the newest first', async () => {
			await repository.replace(null, newToken('first'), ctx);
			await repository.replace(newToken('first').tokenHash, newToken('second'), ctx);

			await repository.revokeInstanceToken(ctx);

			expect(await previousTokenHashes()).toEqual([hashOf('second'), hashOf('first')]);
		});

		it('keeps only the last 10 hashes', async () => {
			let expected: string | null = null;
			for (let i = 0; i <= 11; i++) {
				await repository.replace(expected, newToken(`token-${i}`), ctx);
				expected = newToken(`token-${i}`).tokenHash;
			}

			const hashes = await previousTokenHashes();

			expect(hashes).toHaveLength(10);
			expect(hashes[0]).toBe(hashOf('token-10'));
			expect(hashes[9]).toBe(hashOf('token-1'));
		});
	});

	describe('markUsed', () => {
		const at = (second: number) => new Date(Date.UTC(2026, 9, 23, 12, 0, second));
		const lastUsedAt = async () => (await repository.findInstanceToken(ctx))?.lastUsedAt;

		beforeEach(async () => {
			await repository.replace(null, newToken('first'), ctx);
		});

		it('sets the first use', async () => {
			await repository.markUsed(hashOf('first'), at(1), ctx);

			expect(await lastUsedAt()).toEqual(at(1));
		});

		it('sets a later use', async () => {
			await repository.markUsed(hashOf('first'), at(1), ctx);

			await repository.markUsed(hashOf('first'), at(2), ctx);

			expect(await lastUsedAt()).toEqual(at(2));
		});

		// Another main, or a slow commit, can write an older time last.
		it('keeps the later use when an older write comes last', async () => {
			await repository.markUsed(hashOf('first'), at(2), ctx);

			await repository.markUsed(hashOf('first'), at(1), ctx);

			expect(await lastUsedAt()).toEqual(at(2));
		});

		it('does not mark a token with another hash', async () => {
			await repository.markUsed(hashOf('other'), at(1), ctx);

			expect(await lastUsedAt()).toBeNull();
		});

		// A request can check the old token before a rotation and write after it.
		it('does not mark the new token for a write of the old token after a rotation', async () => {
			await repository.replace(hashOf('first'), newToken('second'), ctx);

			await repository.markUsed(hashOf('first'), at(1), ctx);

			await expect(repository.findInstanceToken(ctx)).resolves.toEqual(stored('second'));
		});

		it('does not bring back a revoked token', async () => {
			await repository.revokeInstanceToken(ctx);

			await repository.markUsed(hashOf('first'), at(1), ctx);

			await expect(repository.findInstanceToken(ctx)).resolves.toBeNull();
		});

		it('starts a new token without a last use', async () => {
			await repository.markUsed(hashOf('first'), at(1), ctx);

			await repository.replace(hashOf('first'), newToken('second'), ctx);

			expect(await lastUsedAt()).toBeNull();
		});
	});
});
