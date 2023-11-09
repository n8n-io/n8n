import { OwnershipService } from '@/services/ownership.service';
import { SharedWorkflowRepository } from '@/databases/repositories';
import { mockInstance } from '../../integration/shared/utils';
import { Role } from '@/databases/entities/Role';
import {
	randomCredentialPayload,
	randomEmail,
	randomInteger,
	randomName,
} from '../../integration/shared/random';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { CacheService } from '@/services/cache.service';
import { User } from '@/databases/entities/User';
import { RoleService } from '@/services/role.service';
import { UserService } from '@/services/user.service';
import { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import type { SharedCredentials } from '@/databases/entities/SharedCredentials';

const wfOwnerRole = () =>
	Object.assign(new Role(), {
		scope: 'workflow',
		name: 'owner',
		id: randomInteger(),
	});

const mockCredRole = (name: 'owner' | 'editor'): Role =>
	Object.assign(new Role(), {
		scope: 'credentials',
		name,
		id: randomInteger(),
	});

const mockCredential = (): CredentialsEntity =>
	Object.assign(new CredentialsEntity(), randomCredentialPayload());

const mockUser = (): User =>
	Object.assign(new User(), {
		id: randomInteger(),
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	});

describe('OwnershipService', () => {
	const cacheService = mockInstance(CacheService);
	const roleService = mockInstance(RoleService);
	const userService = mockInstance(UserService);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);

	const ownershipService = new OwnershipService(
		cacheService,
		userService,
		roleService,
		sharedWorkflowRepository,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkflowOwner()', () => {
		test('should retrieve a workflow owner', async () => {
			roleService.findWorkflowOwnerRole.mockResolvedValueOnce(wfOwnerRole());

			const mockOwner = new User();
			const mockNonOwner = new User();

			const sharedWorkflow = Object.assign(new SharedWorkflow(), {
				role: new Role(),
				user: mockOwner,
			});

			sharedWorkflowRepository.findOneOrFail.mockResolvedValueOnce(sharedWorkflow);

			const returnedOwner = await ownershipService.getWorkflowOwnerCached('some-workflow-id');

			expect(returnedOwner).toBe(mockOwner);
			expect(returnedOwner).not.toBe(mockNonOwner);
		});

		test('should throw if no workflow owner role found', async () => {
			roleService.findWorkflowOwnerRole.mockRejectedValueOnce(new Error());

			await expect(ownershipService.getWorkflowOwnerCached('some-workflow-id')).rejects.toThrow();
		});

		test('should throw if no workflow owner found', async () => {
			roleService.findWorkflowOwnerRole.mockResolvedValueOnce(wfOwnerRole());

			sharedWorkflowRepository.findOneOrFail.mockRejectedValue(new Error());

			await expect(ownershipService.getWorkflowOwnerCached('some-workflow-id')).rejects.toThrow();
		});
	});

	describe('addOwnedByAndSharedWith()', () => {
		test('should add ownedBy and sharedWith to credential', async () => {
			const owner = mockUser();
			const editor = mockUser();

			const credential = mockCredential();

			credential.shared = [
				{ role: mockCredRole('owner'), user: owner },
				{ role: mockCredRole('editor'), user: editor },
			] as SharedCredentials[];

			const { ownedBy, sharedWith } = ownershipService.addOwnedByAndSharedWith(credential);

			expect(ownedBy).toStrictEqual({
				id: owner.id,
				email: owner.email,
				firstName: owner.firstName,
				lastName: owner.lastName,
			});

			expect(sharedWith).toStrictEqual([
				{
					id: editor.id,
					email: editor.email,
					firstName: editor.firstName,
					lastName: editor.lastName,
				},
			]);
		});

		test('should produce an empty sharedWith if no sharee', async () => {
			const owner = mockUser();

			const credential = mockCredential();

			credential.shared = [{ role: mockCredRole('owner'), user: owner }] as SharedCredentials[];

			const { ownedBy, sharedWith } = ownershipService.addOwnedByAndSharedWith(credential);

			expect(ownedBy).toStrictEqual({
				id: owner.id,
				email: owner.email,
				firstName: owner.firstName,
				lastName: owner.lastName,
			});

			expect(sharedWith).toHaveLength(0);
		});
	});
});
