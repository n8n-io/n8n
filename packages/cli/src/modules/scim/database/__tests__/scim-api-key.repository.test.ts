import { ApiKey, type TransactionRunner } from '@n8n/db';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ScimApiKeyRepository } from '../scim-api-key.repository';

/**
 * The audience is what scopes this repository to SCIM. These assert that every
 * query carries it, so no caller can reach or destroy another kind of API key
 * through a repository named for SCIM.
 */
describe('ScimApiKeyRepository', () => {
	const SCIM = 'scim-api';
	const ctx = {};
	let manager: ReturnType<typeof mock<EntityManager>>;
	let transactionRunner: ReturnType<typeof mock<TransactionRunner>>;
	let repository: ScimApiKeyRepository;

	beforeEach(() => {
		manager = mock<EntityManager>();
		transactionRunner = mock<TransactionRunner>();
		// No ambient transaction, so the runner hands back the same context.
		transactionRunner.run.mockImplementation(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
			(async (c: any, fn: any) => await fn(c)) as any,
		);
		repository = new ScimApiKeyRepository(mock<DataSource>({ manager }), transactionRunner);
	});

	it('scopes a lookup by user to the SCIM audience', async () => {
		await repository.findByUserId('user-1', ctx);

		expect(manager.findOne).toHaveBeenCalledWith(ApiKey, {
			where: { userId: 'user-1', audience: SCIM },
		});
	});

	it('scopes a lookup by key to the SCIM audience', async () => {
		await repository.findByKey('a-token', ctx);

		expect(manager.findOne).toHaveBeenCalledWith(ApiKey, {
			where: { apiKey: 'a-token', audience: SCIM },
			relations: ['user'],
		});
	});

	it('only ever deletes the user SCIM key, never their other API keys', async () => {
		await repository.deleteAllForUser('user-1', ctx);

		expect(manager.delete).toHaveBeenCalledWith(ApiKey, { userId: 'user-1', audience: SCIM });
	});

	describe('replaceForUser', () => {
		beforeEach(() => {
			manager.findOneByOrFail.mockResolvedValue(mock<ApiKey>());
			vi.spyOn(repository, 'create').mockImplementation((data) => data as ApiKey);
		});

		it('replaces within the SCIM audience only, in one transaction', async () => {
			await repository.replaceForUser('user-1', 'new-token', ctx);

			expect(transactionRunner.run).toHaveBeenCalled();
			expect(manager.delete).toHaveBeenCalledWith(ApiKey, { userId: 'user-1', audience: SCIM });
			expect(manager.insert).toHaveBeenCalledWith(
				ApiKey,
				expect.objectContaining({ userId: 'user-1', apiKey: 'new-token', audience: SCIM }),
			);
		});

		// `api_key` is unique on (userId, label), so the constant label is what
		// stops a racing rotation inserting a second live token. Give each key
		// its own label and that protection is gone.
		it('labels every SCIM key identically, which is what keeps it to one per user', async () => {
			await repository.replaceForUser('user-1', 'token-a', ctx);
			await repository.replaceForUser('user-1', 'token-b', ctx);

			const labels = manager.insert.mock.calls.map(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
				([, row]: any) => row.label as string,
			);
			expect(labels).toEqual(['SCIM Provisioning API Key', 'SCIM Provisioning API Key']);
		});
	});
});
