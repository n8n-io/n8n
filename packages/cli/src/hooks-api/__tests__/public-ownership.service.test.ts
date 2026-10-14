import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '@/services/ownership.service';

import { PublicOwnershipService } from '../v1/public-ownership.service';

describe('PublicOwnershipService', () => {
	const ownershipService = mock<OwnershipService>();
	const service = new PublicOwnershipService(ownershipService);

	const owner = mock<User>({
		id: 'user-1',
		email: 'owner@example.com',
		firstName: 'Jane',
		lastName: 'Doe',
		password: 'hashed',
	});

	beforeEach(() => vi.resetAllMocks());

	it('should return only the V1 user fields', async () => {
		ownershipService.hasInstanceOwner.mockResolvedValue(true);
		ownershipService.getInstanceOwner.mockResolvedValue(owner);

		await expect(service.getOwner()).resolves.toEqual({
			id: 'user-1',
			email: 'owner@example.com',
			firstName: 'Jane',
			lastName: 'Doe',
		});
	});

	it('should return null if the owner is not set up', async () => {
		ownershipService.hasInstanceOwner.mockResolvedValue(false);

		await expect(service.getOwner()).resolves.toBeNull();
		expect(ownershipService.getInstanceOwner).not.toHaveBeenCalled();
	});

	it('should not overwrite an existing owner by default', async () => {
		ownershipService.setupOwner.mockResolvedValue(owner);
		const input = {
			email: 'owner@example.com',
			firstName: 'Jane',
			lastName: 'Doe',
			password: 'Password123',
		};

		await service.setupOwner(input);

		expect(ownershipService.setupOwner).toHaveBeenCalledWith(input, { overwriteExisting: false });
	});
});
