import type { AuthenticatedRequest, ProjectRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { Response } from 'express';
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
		} as unknown as Response;
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

	it('emits team-project-updated on changeProjectUserRole and returns 204', async () => {
		// Arrange
		const projectId = 'p2';
		(projectsService.getProjectRelations as jest.Mock).mockResolvedValue([
			{ userId: 'u1', role: { slug: 'project:admin' } },
			{ userId: 'u2', role: { slug: 'project:editor' } },
		]);

		const res = makeRes();

		// Act
		await controller.changeProjectUserRole(req, res, projectId, 'u2', {
			role: 'project:editor',
		} as any);

		// Assert
		expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
			userId: 'actor-user',
			role: 'global:owner',
			members: [
				{ userId: 'u1', role: 'project:admin' },
				{ userId: 'u2', role: 'project:editor' },
			],
			projectId,
		});
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it('emits team-project-updated on deleteProjectUser and returns 204', async () => {
		// Arrange
		const projectId = 'p3';
		(projectsService.getProjectRelations as jest.Mock).mockResolvedValue([
			{ userId: 'u1', role: { slug: 'project:admin' } },
			{ userId: 'u3', role: { slug: 'project:viewer' } },
		]);

		const res = makeRes();

		// Act
		await controller.deleteProjectUser(req, res, projectId, 'u2');

		// Assert
		expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
			userId: 'actor-user',
			role: 'global:owner',
			members: [
				{ userId: 'u1', role: 'project:admin' },
				{ userId: 'u3', role: 'project:viewer' },
			],
			projectId,
		});
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it('returns 201 with conflicts body when some users added and some conflicted', async () => {
		// Arrange
		const projectId = 'p4';
		const added = [{ userId: 'u4', role: 'project:viewer' as const }];
		const conflicts = [
			{
				userId: 'u5',
				currentRole: 'project:viewer' as const,
				requestedRole: 'project:editor' as const,
			},
		];

		(projectsService.addUsersWithConflictSemantics as jest.Mock).mockResolvedValue({
			project: { id: projectId, name: 'Project' },
			added,
			conflicts,
		});

		(projectsService.getProjectRelations as jest.Mock).mockResolvedValue([
			{ userId: 'u1', role: { slug: 'project:admin' } },
			{ userId: 'u4', role: { slug: 'project:viewer' } },
			{ userId: 'u5', role: { slug: 'project:viewer' } },
		]);

		const res = makeRes();

		// Act
		await controller.addProjectUsers(req, res, projectId, {
			relations: [...added, { userId: 'u5', role: 'project:editor' }],
		} as any);

		// Assert: 201 with conflicts body
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({ conflicts });

		// Mailer is called for newly added sharees
		expect(userManagementMailer.notifyProjectShared).toHaveBeenCalledWith({
			sharer: req.user,
			newSharees: added,
			project: { id: projectId, name: 'Project' },
		});

		// Telemetry event has full members list
		expect(eventService.emit).toHaveBeenCalledWith('team-project-updated', {
			userId: 'actor-user',
			role: 'global:owner',
			members: [
				{ userId: 'u1', role: 'project:admin' },
				{ userId: 'u4', role: 'project:viewer' },
				{ userId: 'u5', role: 'project:viewer' },
			],
			projectId,
		});
	});
});
