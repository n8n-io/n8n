import type { ProjectRelationRepository, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowReviewAdminService } from '../workflow-review-admin.service';

const projectId = 'proj-1';
const memberUser = (id = 'user-1') => mock<User>({ id, role: { slug: 'global:member' } });

describe('WorkflowReviewAdminService', () => {
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const service = new WorkflowReviewAdminService(projectRelationRepository);

	beforeEach(() => {
		vi.resetAllMocks();
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([]);
	});

	it.each([['global:admin'], ['global:owner']])(
		'treats a %s as admin of every project',
		async (slug) => {
			const user = mock<User>({ id: 'user-1', role: { slug } });

			expect(service.isGlobalAdmin(user)).toBe(true);
			await expect(service.isAdminForProject(user, projectId)).resolves.toBe(true);
			expect(projectRelationRepository.getAccessibleProjectsByRoles).not.toHaveBeenCalled();
		},
	);

	it('treats a project admin as admin of that project only', async () => {
		projectRelationRepository.getAccessibleProjectsByRoles.mockResolvedValue([projectId]);

		expect(service.isGlobalAdmin(memberUser())).toBe(false);
		await expect(service.isAdminForProject(memberUser(), projectId)).resolves.toBe(true);
		await expect(service.isAdminForProject(memberUser(), 'other-proj')).resolves.toBe(false);
		expect(projectRelationRepository.getAccessibleProjectsByRoles).toHaveBeenCalledWith('user-1', [
			'project:admin',
		]);
	});

	it('denies a plain member without project-admin membership', async () => {
		await expect(service.isAdminForProject(memberUser(), projectId)).resolves.toBe(false);
	});
});
