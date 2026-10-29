import { Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { TransactionRunner } from '@n8n/db';
import { Cipher } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { SYSTEM_TRUSTED_SOURCE_CONFIG, SYSTEM_TRUSTED_SOURCE_ID } from '../constants';
import type { TrustedSourceEntity } from '../database/entities/trusted-source.entity';
import { TrustedSourceIdentityRepository } from '../database/repositories/trusted-source-identity.repository';
import { TrustedSourceRepository } from '../database/repositories/trusted-source.repository';
import { TrustedSourceDbStore } from '../trusted-source.store';

describe('System trusted source configuration', () => {
	it('adds app support to an existing system source and preserves its settings', async () => {
		const repository = mock<TrustedSourceRepository>();
		const cipher = mock<Cipher>();
		const cache = mock<CacheService>();
		repository.findById.mockResolvedValue(
			mock<TrustedSourceEntity>({
				id: SYSTEM_TRUSTED_SOURCE_ID,
				managedBy: 'system',
				issuer: 'https://n8n.example.com',
				config: 'stored-config',
			}),
		);
		cipher.decryptV2.mockResolvedValue(
			JSON.stringify({
				...SYSTEM_TRUSTED_SOURCE_CONFIG,
				surfaces: { trigger: { audiences: ['custom-audience'] } },
			}),
		);
		cipher.encryptV2.mockResolvedValue('updated-config');
		const store = new TrustedSourceDbStore(
			mock<Logger>(),
			repository,
			cipher,
			cache,
			mock<TrustedSourceIdentityRepository>(),
			mock<TransactionRunner>(),
		);

		await expect(
			store.seedSystemSource({
				id: SYSTEM_TRUSTED_SOURCE_ID,
				name: 'n8n',
				issuer: 'https://n8n.example.com',
				config: SYSTEM_TRUSTED_SOURCE_CONFIG,
			}),
		).resolves.toBe('unchanged');
		expect(cipher.encryptV2).toHaveBeenCalledWith(
			expect.objectContaining({
				surfaces: { trigger: { audiences: ['custom-audience'] }, apps: {} },
			}),
		);
		expect(repository.updateById).toHaveBeenCalledWith(
			SYSTEM_TRUSTED_SOURCE_ID,
			{ config: 'updated-config' },
			{},
		);
		expect(cache.deleteMany).toHaveBeenCalled();
	});

	it('does not rewrite an existing system source with app support', async () => {
		const repository = mock<TrustedSourceRepository>();
		const cipher = mock<Cipher>();
		const cache = mock<CacheService>();
		repository.findById.mockResolvedValue(
			mock<TrustedSourceEntity>({
				id: SYSTEM_TRUSTED_SOURCE_ID,
				managedBy: 'system',
				issuer: 'https://n8n.example.com',
				config: 'stored-config',
			}),
		);
		cipher.decryptV2.mockResolvedValue(JSON.stringify(SYSTEM_TRUSTED_SOURCE_CONFIG));
		const store = new TrustedSourceDbStore(
			mock<Logger>(),
			repository,
			cipher,
			cache,
			mock<TrustedSourceIdentityRepository>(),
			mock<TransactionRunner>(),
		);

		await expect(
			store.seedSystemSource({
				id: SYSTEM_TRUSTED_SOURCE_ID,
				name: 'n8n',
				issuer: 'https://n8n.example.com',
				config: SYSTEM_TRUSTED_SOURCE_CONFIG,
			}),
		).resolves.toBe('unchanged');
		expect(repository.updateById).not.toHaveBeenCalled();
		expect(cache.deleteMany).not.toHaveBeenCalled();
		expect(cipher.encryptV2).not.toHaveBeenCalled();
	});
});
