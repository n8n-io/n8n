import { OwnershipService } from '@/services/ownership.service';
import { RoleRepository, SharedWorkflowRepository, UserRepository } from '@/databases/repositories';
import { mockInstance } from '../../integration/shared/utils';
import { Role } from '@/databases/entities/Role';
import { randomInteger } from '../../integration/shared/random';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { CacheService } from '@/services/cache.service';
import { User } from '@/databases/entities/User';

const wfOwnerRole = () =>
	Object.assign(new Role(), {
		scope: 'workflow',
		name: 'owner',
		id: randomInteger(),
	});

describe('OwnershipService', () => {
	const cacheService = mockInstance(CacheService);
	const roleRepository = mockInstance(RoleRepository);
	const userRepository = mockInstance(UserRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);

	const ownershipService = new OwnershipService(
		cacheService,
		userRepository,
		roleRepository,
		sharedWorkflowRepository,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getWorkflowOwner()', () => {
		test('should retrieve a workflow owner', async () => {
			roleRepository.findWorkflowOwnerRole.mockResolvedValueOnce(wfOwnerRole());

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
			roleRepository.findWorkflowOwnerRole.mockRejectedValueOnce(new Error());

			await expect(ownershipService.getWorkflowOwnerCached('some-workflow-id')).rejects.toThrow();
		});

		test('should throw if no workflow owner found', async () => {
			roleRepository.findWorkflowOwnerRole.mockResolvedValueOnce(wfOwnerRole());

			sharedWorkflowRepository.findOneOrFail.mockRejectedValue(new Error());

			await expect(ownershipService.getWorkflowOwnerCached('some-workflow-id')).rejects.toThrow();
		});
	});
});
