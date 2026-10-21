import { AuthIdentity, User, type TransactionRunner, type UserRepository } from '@n8n/db';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ScimUserRepository } from '../scim-user.repository';

describe('ScimUserRepository', () => {
	const ctx = {};
	let manager: ReturnType<typeof mock<EntityManager>>;
	let userRepository: ReturnType<typeof mock<UserRepository>>;
	let repository: ScimUserRepository;

	beforeEach(() => {
		manager = mock<EntityManager>();
		userRepository = mock<UserRepository>();
		const transactionRunner = mock<TransactionRunner>();
		// No ambient transaction, so the runner hands back the same context.
		transactionRunner.run.mockImplementation(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
			(async (c: any, fn: any) => await fn(c)) as any,
		);
		repository = new ScimUserRepository(
			mock<DataSource>({ manager }),
			transactionRunner,
			userRepository,
		);
	});

	describe('createProvisioned', () => {
		it('marks the new user as SCIM-managed', async () => {
			const created = mock<User>({ id: 'user-1' });
			userRepository.createUserWithProject.mockResolvedValue({
				user: created,
				project: mock(),
			});

			await expect(
				repository.createProvisioned({ email: 'new@example.com' }, undefined, ctx),
			).resolves.toBe(created);

			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				{ email: 'new@example.com', isScimManaged: true },
				manager,
			);
			expect(manager.save).not.toHaveBeenCalled();
		});

		// Without the identity, the user cannot sign in through the identity provider.
		it('saves the identity of the user with the same manager as the user', async () => {
			const created = mock<User>({ id: 'user-1' });
			userRepository.createUserWithProject.mockResolvedValue({
				user: created,
				project: mock(),
			});
			const identity = mock<AuthIdentity>();
			manager.create.mockReturnValue(identity as never);

			await expect(
				repository.createProvisioned(
					{ email: 'new@example.com' },
					{ providerId: 'okta-1', providerType: 'saml' },
					ctx,
				),
			).resolves.toBe(created);

			expect(userRepository.createUserWithProject).toHaveBeenCalledWith(
				expect.objectContaining({ isScimManaged: true }),
				manager,
			);
			expect(manager.create).toHaveBeenCalledExactlyOnceWith(AuthIdentity, {
				providerId: 'okta-1',
				providerType: 'saml',
				userId: 'user-1',
			});
			expect(manager.save).toHaveBeenCalledExactlyOnceWith(identity);
		});

		it('saves no identity when the user is not created', async () => {
			userRepository.createUserWithProject.mockRejectedValue(new Error('duplicate email'));

			await expect(
				repository.createProvisioned(
					{ email: 'new@example.com' },
					{ providerId: 'okta-1', providerType: 'saml' },
					ctx,
				),
			).rejects.toThrow('duplicate email');

			expect(manager.save).not.toHaveBeenCalled();
		});
	});

	describe('markManaged', () => {
		// One update without a read. The condition leaves a marked user unchanged.
		it('sets the marker with one update only where it is false', async () => {
			await repository.markManaged('user-1', ctx);

			expect(manager.update).toHaveBeenCalledExactlyOnceWith(
				User,
				{ id: 'user-1', isScimManaged: false },
				{ isScimManaged: true },
			);
			expect(manager.findOne).not.toHaveBeenCalled();
			expect(manager.save).not.toHaveBeenCalled();
		});
	});
});
