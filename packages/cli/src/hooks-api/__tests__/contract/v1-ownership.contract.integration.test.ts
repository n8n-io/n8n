/**
 * Contract tests for `OwnershipApiV1`.
 *
 * These tests pin the behaviour that extensions rely on, as they see it: through
 * `register()` and the plain V1 objects, against a real database. If a test
 * fails after a change in n8n, fix the adapter, not the expectation. A changed
 * expectation is a breaking change and needs a new contract version.
 */
import { testDb } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { HooksApiErrorV1, HooksApiV1, OwnerSetupInputV1 } from '@n8n/hooks-api';

import { ExternalHooks } from '@/external-hooks';
import { HooksApiService } from '@/hooks-api/hooks-api.service';
import { PasswordUtility } from '@/services/password.utility';
import { createUserShell } from '@test-integration/db/users';

let api: HooksApiV1;

const owner: OwnerSetupInputV1 = {
	email: 'Owner@Example.com',
	firstName: 'Jane',
	lastName: 'Doe',
	password: 'Password123',
};

beforeAll(async () => {
	await testDb.init();

	Container.get(ExternalHooks).registerFunctions.push(async (hooksApi) => {
		if (!hooksApi.v1) throw new Error('V1 is not offered');
		api = hooksApi.v1;
	});
	await Container.get(HooksApiService).register();
});

beforeEach(async () => {
	await testDb.truncate(['User']);
	await createUserShell(GLOBAL_OWNER_ROLE);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('OwnershipApiV1 contract', () => {
	it('reports version 1', () => {
		expect(api.version).toBe(1);
		expect(api.ownership.version).toBe(1);
	});

	describe('getOwner()', () => {
		it('returns null before the owner is set up', async () => {
			await expect(api.ownership.getOwner()).resolves.toBeNull();
		});

		it('returns the owner after setup', async () => {
			const created = await api.ownership.setupOwner(owner);

			await expect(api.ownership.getOwner()).resolves.toEqual(created);
		});
	});

	describe('setupOwner()', () => {
		it('returns exactly the UserV1 fields', async () => {
			const created = await api.ownership.setupOwner(owner);

			expect(Object.keys(created).sort()).toEqual(['email', 'firstName', 'id', 'lastName']);
			expect(created).toEqual({
				id: expect.any(String),
				email: 'owner@example.com',
				firstName: 'Jane',
				lastName: 'Doe',
			});
		});

		it('stores a password that the owner can log in with', async () => {
			const created = await api.ownership.setupOwner(owner);

			const stored = await Container.get(UserRepository).findOneByOrFail({ id: created.id });
			expect(stored.password).not.toBe(owner.password);
			await expect(
				Container.get(PasswordUtility).compare(owner.password, stored.password),
			).resolves.toBe(true);
		});

		it('rejects with code "owner_already_set_up" if an owner exists', async () => {
			const created = await api.ownership.setupOwner(owner);

			const error: HooksApiErrorV1 = await api.ownership
				.setupOwner({ ...owner, email: 'other@example.com' })
				.then(
					() => {
						throw new Error('Expected setupOwner() to reject');
					},
					(e: HooksApiErrorV1) => e,
				);

			expect(error.code).toBe('owner_already_set_up');
			await expect(api.ownership.getOwner()).resolves.toEqual(created);
		});

		it('replaces the details of the existing owner with overwriteExisting', async () => {
			const created = await api.ownership.setupOwner(owner);

			const replaced = await api.ownership.setupOwner(
				{ ...owner, email: 'new@example.com', firstName: 'Janet' },
				{ overwriteExisting: true },
			);

			expect(replaced).toEqual({ ...created, email: 'new@example.com', firstName: 'Janet' });
			await expect(api.ownership.getOwner()).resolves.toEqual(replaced);
		});
	});
});
