import { mock } from 'jest-mock-extended';

import type { Project } from '@/databases/entities/project';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { mockInstance } from '@test/mocking';

import { ProjectService } from '../project.service.ee';
import { RoleService } from '../role.service';

describe('UserService', () => {
	const projectRepository = mockInstance(ProjectRepository);
	const roleService = mockInstance(RoleService);
	const projectService = new ProjectService(
		mock(),
		projectRepository,
		mock(),
		roleService,
		mock(),
		mock(),
		mock(),
	);

	describe('addUsersToProject', () => {
		it('throws if called with a team project', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({ type: 'personal', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);

			// ACT & ASSERT
			await expect(
				projectService.addUsersToProject(projectId, [{ userId: '1234', role: 'project:admin' }]),
			).rejects.toThrowError("Can't add users to personal projects.");
		});

		it('throws if trying to add a personalOwner to a team project', async () => {
			// ARRANGE
			const projectId = '12345';
			projectRepository.findOne.mockResolvedValueOnce(
				mock<Project>({ type: 'team', projectRelations: [] }),
			);
			roleService.isRoleLicensed.mockReturnValueOnce(true);

			// ACT & ASSERT
			await expect(
				projectService.addUsersToProject(projectId, [
					{ userId: '1234', role: 'project:personalOwner' },
				]),
			).rejects.toThrowError("Can't add a personalOwner to a team project.");
		});
	});
});
