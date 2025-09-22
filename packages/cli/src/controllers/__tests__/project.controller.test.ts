import type { AuthenticatedRequest, ProjectRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import { ProjectController } from '@/controllers/project.controller';
import type { ProjectService } from '@/services/project.service.ee';
import type { UserManagementMailer } from '@/user-management/email';

describe('ProjectController (members endpoints)', () => {
	const eventService = mock<EventService>();
	const projectsService = mock<ProjectService>();
	const projectRepository = mock<ProjectRepository>();
	const userManagementMailer = mock<UserManagementMailer>();

	const controller = new ProjectController(
		projectsService as unknown as ProjectService,
		projectRepository as unknown as ProjectRepository,
		eventService as unknown as EventService,
		userManagementMailer as unknown as UserManagementMailer,
	);

	const makeRes = () => {
		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		} as unknown as import('express').Response;
		return res;
	};

	const req: AuthenticatedRequest = {
		user: { id: 'actor-user', role: { slug: 'global:owner' } } as any,
	} as AuthenticatedRequest;

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('emits team-project-updated with full members list on addProjectUsers', async () => {
		// Arrange
		const projectId = 'p1';
		const payload = { relations: [{ userId: 'u2', role: 'project:viewer' as const }] };

		(projectsService.addUsersWithConflictSemantics as jest.Mock).mockResolvedValue({
			project: { id: projectId, name: 'Project' },
			added: payload.relations,
			conflicts: [],
		});

		(projectsService.getProjectRelations as jest.Mock).mockResolvedValue([
			{ userId: 'u1', role: { slug: 'project:admin' } },
			{ userId: 'u2', role: { slug: 'project:viewer' } },
		]);

		const res = makeRes();

		// Act
		await controller.addProjectUsers(req, res, projectId, payload as any);

		// Assert
		expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
			userId: 'actor-user',
			role: 'global:owner',
			members: [
				{ userId: 'u1', role: 'project:admin' },
				{ userId: 'u2', role: 'project:viewer' },
			],
			projectId,
		});

		// Verify mailer called for new sharees
		expect(userManagementMailer.notifyProjectShared).toHaveBeenCalledWith({
			sharer: req.user,
			newSharees: payload.relations,
			project: { id: projectId, name: 'Project' },
		});
	});
});
