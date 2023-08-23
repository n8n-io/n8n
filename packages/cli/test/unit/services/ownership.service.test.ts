import { OwnershipService } from '@/services/ownership.service';
import { SharedWorkflowRepository } from '@/databases/repositories';
import { mockInstance } from '../../integration/shared/utils';
import { Role } from '@/databases/entities/Role';
import { randomInteger } from '../../integration/shared/random';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { CacheService } from '@/services/cache.service';
import { User } from '@/databases/entities/User';
import { RoleService } from '@/services/role.service';
import { UserService } from '@/services/user.service';

const wfOwnerRole = () =>
	Object.assign(new Role(), {
		scope: 'workflow',
		name: 'owner',
		id: randomInteger(),
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
});
