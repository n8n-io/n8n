import type { TransactionRunner, User, UserRepository } from '@n8n/db';
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
		});
	});
});
