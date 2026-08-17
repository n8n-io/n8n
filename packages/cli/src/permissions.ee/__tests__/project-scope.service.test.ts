import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRelationRepository, User } from '@n8n/db';

import { RoleService } from '@/services/role.service';

import { ProjectScopeService } from '../project-scope.service';

const makeUser = (globalScopes: string[] = []) =>
	Object.assign(new User(), {
		id: 'user-1',
		role: {
			slug: 'global:member',
			scopes: globalScopes.map((slug) => ({ slug })),
		},
	});

describe('ProjectScopeService', () => {
	const roleService = mockInstance(RoleService);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const service = new ProjectScopeService(roleService, projectRelationRepository);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns no project restriction when the user has the global scope', async () => {
		const result = await service.getProjectIds(makeUser(['agent:update']), ['agent:update']);

		expect(result).toBeNull();
		expect(roleService.rolesWithScope).not.toHaveBeenCalled();
		expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
	});

	it('resolves scoped project access with one project-relation query', async () => {
		roleService.rolesWithScope.mockResolvedValue(['project:admin', 'project:editor']);
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([
			'project-1',
			'project-2',
		]);

		const result = await service.getProjectIds(makeUser(), ['agent:update']);

		expect(roleService.rolesWithScope).toHaveBeenCalledOnce();
		expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['agent:update']);
		expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledOnce();
		expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith('user-1', [
			'project:admin',
			'project:editor',
		]);
		expect(result).toEqual(['project-1', 'project-2']);
	});
});
