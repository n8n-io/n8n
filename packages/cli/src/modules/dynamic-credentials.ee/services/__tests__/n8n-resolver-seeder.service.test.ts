import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings, Cipher } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { SYSTEM_RESOLVER_ID, SYSTEM_RESOLVER_NAME, SYSTEM_RESOLVER_TYPE } from '../../constants';
import { DynamicCredentialResolver } from '../../database/entities/credential-resolver';
import type { DynamicCredentialResolverRepository } from '../../database/repositories/credential-resolver.repository';
import { N8nResolverSeeder } from '../n8n-resolver-seeder.service';

describe('N8nResolverSeeder', () => {
	const repository = mock<DynamicCredentialResolverRepository>();
	const cipher = mock<Cipher>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const insertBuilder = {
		insert: jest.fn().mockReturnThis(),
		into: jest.fn().mockReturnThis(),
		values: jest.fn().mockReturnThis(),
		orIgnore: jest.fn().mockReturnThis(),
		execute: jest.fn(),
	};

	const buildSeeder = (isLeader: boolean) =>
		new N8nResolverSeeder(repository, cipher, mock<InstanceSettings>({ isLeader }), logger);

	beforeEach(() => {
		jest.clearAllMocks();
		cipher.encryptV2.mockResolvedValue('encrypted-empty-config');
		// `createQueryBuilder` returns a chainable insert builder whose execute() result
		// is set per-test to simulate either a real insert or a no-op-on-conflict.
		(repository.createQueryBuilder as unknown as jest.Mock).mockReturnValue(insertBuilder);
	});

	describe('on the leader main', () => {
		it('inserts the system resolver with the well-known id when missing', async () => {
			insertBuilder.execute.mockResolvedValue({
				identifiers: [{ id: SYSTEM_RESOLVER_ID }],
				generatedMaps: [],
				raw: [],
			});
			const inserted = {
				id: SYSTEM_RESOLVER_ID,
				name: SYSTEM_RESOLVER_NAME,
				type: SYSTEM_RESOLVER_TYPE,
				config: 'encrypted-empty-config',
			} as DynamicCredentialResolver;
			repository.findOneBy.mockResolvedValue(inserted);

			const result = await buildSeeder(true).seed();

			expect(cipher.encryptV2).toHaveBeenCalledWith({});
			expect(insertBuilder.into).toHaveBeenCalledWith(DynamicCredentialResolver);
			expect(insertBuilder.values).toHaveBeenCalledWith({
				id: SYSTEM_RESOLVER_ID,
				name: SYSTEM_RESOLVER_NAME,
				type: SYSTEM_RESOLVER_TYPE,
				config: 'encrypted-empty-config',
			});
			expect(insertBuilder.orIgnore).toHaveBeenCalled();
			expect(repository.findOneBy).toHaveBeenCalledWith({ id: SYSTEM_RESOLVER_ID });
			expect(result).toBe(inserted);
		});

		it('is idempotent under concurrency — orIgnore swallows the conflict and returns the existing row', async () => {
			// Second seed() call: row already exists, orIgnore returns no identifiers.
			insertBuilder.execute.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});
			const preExisting = {
				id: SYSTEM_RESOLVER_ID,
				name: SYSTEM_RESOLVER_NAME,
				type: SYSTEM_RESOLVER_TYPE,
				config: 'pre-existing',
			} as DynamicCredentialResolver;
			repository.findOneBy.mockResolvedValue(preExisting);

			const seeder = buildSeeder(true);
			const first = await seeder.seed();
			const second = await seeder.seed();

			// Both calls run the insert query — no read-before-write check that could race.
			expect(insertBuilder.execute).toHaveBeenCalledTimes(2);
			expect(first).toBe(preExisting);
			expect(second).toBe(preExisting);
		});
	});

	describe('on a follower main', () => {
		it('returns undefined and does not touch the repository or cipher', async () => {
			const result = await buildSeeder(false).seed();

			expect(repository.createQueryBuilder).not.toHaveBeenCalled();
			expect(repository.findOneBy).not.toHaveBeenCalled();
			expect(cipher.encryptV2).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
	});
});
