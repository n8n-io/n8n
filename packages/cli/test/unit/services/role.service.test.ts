import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { RoleNames, RoleScopes } from '@db/entities/Role';
import { Role } from '@db/entities/Role';
import { RoleService } from '@/services/role.service';
import { RoleRepository } from '@db/repositories/role.repository';
import { CacheService } from '@/services/cache/cache.service';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { mockInstance } from '../../shared/mocking';
import { chooseRandomly } from '../../integration/shared/random';
import config from '@/config';

const ROLE_PROPS: Array<{ name: RoleNames; scope: RoleScopes }> = [
	{ name: 'owner', scope: 'global' },
	{ name: 'member', scope: 'global' },
	{ name: 'owner', scope: 'workflow' },
	{ name: 'owner', scope: 'credential' },
	{ name: 'user', scope: 'credential' },
	{ name: 'editor', scope: 'workflow' },
];

export const uppercaseInitial = (str: string) => str[0].toUpperCase() + str.slice(1);

describe('RoleService', () => {
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const roleRepository = mockInstance(RoleRepository);
	const cacheService = mockInstance(CacheService);
	const roleService = new RoleService(roleRepository, sharedWorkflowRepository, cacheService);

	const userId = '1';
	const workflowId = '42';

	const { name, scope } = chooseRandomly(ROLE_PROPS);

	const display = {
		name: uppercaseInitial(name),
		scope: uppercaseInitial(scope),
	};

	beforeEach(() => {
		config.load(config.default);
		jest.clearAllMocks();
	});

	[true, false].forEach((cacheEnabled) => {
		const tag = ['cache', cacheEnabled ? 'enabled' : 'disabled'].join(' ');

		describe(`find${display.scope}${display.name}Role() [${tag}]`, () => {
			test(`should return the ${scope} ${name} role if found`, async () => {
				config.set('cache.enabled', cacheEnabled);

				const role = roleRepository.create({ name, scope });
				roleRepository.findRole.mockResolvedValueOnce(role);
				const returnedRole = await roleRepository.findRole(scope, name);

				expect(returnedRole).toBe(role);
			});
		});

		describe(`findRoleByUserAndWorkflow() [${tag}]`, () => {
			test('should return the role if a shared workflow is found', async () => {
				config.set('cache.enabled', cacheEnabled);

				const sharedWorkflow = Object.assign(new SharedWorkflow(), { role: new Role() });
				sharedWorkflowRepository.findOne.mockResolvedValueOnce(sharedWorkflow);
				const returnedRole = await roleService.findRoleByUserAndWorkflow(userId, workflowId);

				expect(returnedRole).toBe(sharedWorkflow.role);
			});

			test('should return undefined if no shared workflow is found', async () => {
				config.set('cache.enabled', cacheEnabled);

				sharedWorkflowRepository.findOne.mockResolvedValueOnce(null);
				const returnedRole = await roleService.findRoleByUserAndWorkflow(userId, workflowId);

				expect(returnedRole).toBeUndefined();
			});
		});
	});
});
