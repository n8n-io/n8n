import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings, Cipher } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { SYSTEM_RESOLVER_ID, SYSTEM_RESOLVER_NAME, SYSTEM_RESOLVER_TYPE } from '../../constants';
import type { DynamicCredentialResolver } from '../../database/entities/credential-resolver';
import type { DynamicCredentialResolverRepository } from '../../database/repositories/credential-resolver.repository';
import { N8nResolverSeeder } from '../n8n-resolver-seeder.service';

describe('N8nResolverSeeder', () => {
	const repository = mock<DynamicCredentialResolverRepository>();
	const cipher = mock<Cipher>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const buildSeeder = (isLeader: boolean) =>
		new N8nResolverSeeder(repository, cipher, mock<InstanceSettings>({ isLeader }), logger);

	beforeEach(() => {
		jest.clearAllMocks();
		cipher.encryptV2.mockResolvedValue('encrypted-empty-config');
		repository.create.mockImplementation(
			(input: Partial<DynamicCredentialResolver>) => input as DynamicCredentialResolver,
		);
		repository.save.mockImplementation(async (entity) => entity as DynamicCredentialResolver);
	});

	describe('on the leader main', () => {
		it('creates the system resolver with the well-known id when missing', async () => {
			repository.findOneBy.mockResolvedValue(null);

			const result = await buildSeeder(true).seed();

			expect(repository.findOneBy).toHaveBeenCalledWith({ id: SYSTEM_RESOLVER_ID });
			expect(cipher.encryptV2).toHaveBeenCalledWith({});
			expect(repository.create).toHaveBeenCalledWith({
				id: SYSTEM_RESOLVER_ID,
				name: SYSTEM_RESOLVER_NAME,
				type: SYSTEM_RESOLVER_TYPE,
				config: 'encrypted-empty-config',
			});
			expect(repository.save).toHaveBeenCalledTimes(1);
			expect(result).toMatchObject({
				id: SYSTEM_RESOLVER_ID,
				name: SYSTEM_RESOLVER_NAME,
				type: SYSTEM_RESOLVER_TYPE,
				config: 'encrypted-empty-config',
			});
		});

		it('is idempotent — returns the existing row without re-inserting', async () => {
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

			expect(cipher.encryptV2).not.toHaveBeenCalled();
			expect(repository.create).not.toHaveBeenCalled();
			expect(repository.save).not.toHaveBeenCalled();
			expect(first).toBe(preExisting);
			expect(second).toBe(preExisting);
		});
	});

	describe('on a follower main', () => {
		it('returns undefined and does not touch the repository or cipher', async () => {
			const result = await buildSeeder(false).seed();

			expect(repository.findOneBy).not.toHaveBeenCalled();
			expect(cipher.encryptV2).not.toHaveBeenCalled();
			expect(repository.create).not.toHaveBeenCalled();
			expect(repository.save).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('does not touch the repository even when the row is missing', async () => {
			repository.findOneBy.mockResolvedValue(null);

			const result = await buildSeeder(false).seed();

			expect(repository.findOneBy).not.toHaveBeenCalled();
			expect(repository.save).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
	});
});
