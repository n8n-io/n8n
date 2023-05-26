import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { Role } from '@db/entities/Role';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { RoleService } from '@/role/role.service';
import { mockInstance } from '../../integration/shared/utils';

describe('RoleService', () => {
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const roleService = new RoleService(sharedWorkflowRepository);

	const userId = '1';
	const workflowId = '42';

	describe('getUserRoleForWorkflow', () => {
		test('should return the role if a shared workflow is found', async () => {
			const sharedWorkflow = Object.assign(new SharedWorkflow(), { role: new Role() });
			sharedWorkflowRepository.findOne.mockResolvedValueOnce(sharedWorkflow);
			const role = await roleService.getUserRoleForWorkflow(userId, workflowId);
			expect(role).toBe(sharedWorkflow.role);
		});

		test('should return undefined if no shared workflow is found', async () => {
			sharedWorkflowRepository.findOne.mockResolvedValueOnce(null);
			const role = await roleService.getUserRoleForWorkflow(userId, workflowId);
			expect(role).toBeUndefined();
		});
	});
});
