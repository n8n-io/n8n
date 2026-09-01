import { ListProjectsQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ProjectController } from '@/controllers/project.controller';
import type { ProjectExecutionQuotaService } from '@/execution-quota/project-execution-quota.service';
import type { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import type { ProjectService } from '@/services/project.service.ee';

describe('ProjectController', () => {
	const projectsService = mock<ProjectService>();
	const provisioningService = mock<ProvisioningService>();
	const projectExecutionQuotaService = mock<ProjectExecutionQuotaService>();

	const controller = new ProjectController(
		projectsService as unknown as ProjectService,
		provisioningService as unknown as ProvisioningService,
		projectExecutionQuotaService as unknown as ProjectExecutionQuotaService,
	);

	const makeRes = () => {
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
		} as unknown as Response;
		return res;
	};

	const req: AuthenticatedRequest = {
		user: { id: 'actor-user', role: { slug: 'global:owner' } } as any,
	} as AuthenticatedRequest;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('getAllProjects', () => {
		it('calls service with query options and returns { count, data }', async () => {
			const projects = [
				{ id: 'p1', name: 'Project 1' },
				{ id: 'p2', name: 'Project 2' },
			];
			(projectsService.getAccessibleProjectsAndCount as Mock).mockResolvedValue({
				projects,
				count: 2,
			});
			(projectsService.addUserScopes as Mock).mockResolvedValue(projects);

			const res = makeRes();
			const query = { skip: 0, take: 10, search: 'test', type: 'team' as const };

			await controller.getAllProjects(req, res, query as any);

			expect(projectsService.getAccessibleProjectsAndCount).toHaveBeenCalledWith(req.user, query);
			expect(projectsService.addUserScopes).toHaveBeenCalledWith(req.user, projects);
			expect(res.json).toHaveBeenCalledWith({ count: 2, data: projects });
		});

		it('returns bare array when no pagination params given', async () => {
			const projects = [{ id: 'p1', name: 'Project 1' }];
			(projectsService.getAccessibleProjectsAndCount as Mock).mockResolvedValue({
				projects,
				count: 1,
			});

			const res = makeRes();
			// Simulate DTO-parsed output: when no query params are provided,
			// both skip and take must default to undefined for backward compat.
			const parsed = ListProjectsQueryDto.safeParse({});
			expect(parsed.success).toBe(true);
			const query = parsed.data!;

			const result = await controller.getAllProjects(req, res, query);

			expect(res.json).not.toHaveBeenCalled();
			expect(result).toEqual(projects);
		});
	});

	describe('getSharingCandidates', () => {
		it('calls service with query options and returns enriched { count, data }', async () => {
			const projects = [
				{ id: 'p1', name: 'Project 1' },
				{ id: 'p2', name: 'Peer personal project' },
			];
			const enriched = projects.map((p) => ({
				...p,
				role: 'global:member',
				scopes: ['user:list'],
			}));
			(projectsService.getShareableProjectsAndCount as Mock).mockResolvedValue({
				projects,
				count: 2,
			});
			(projectsService.addUserScopes as Mock).mockResolvedValue(enriched);

			const res = makeRes();
			const query = { skip: 0, take: 50, search: '' };

			await controller.getSharingCandidates(req, res, query as any);

			expect(projectsService.getShareableProjectsAndCount).toHaveBeenCalledWith(req.user, query);
			expect(projectsService.addUserScopes).toHaveBeenCalledWith(req.user, projects);
			expect(res.json).toHaveBeenCalledWith({ count: 2, data: enriched });
		});

		it('always returns the { count, data } envelope (no bare-array path)', async () => {
			(projectsService.getShareableProjectsAndCount as Mock).mockResolvedValue({
				projects: [],
				count: 0,
			});
			(projectsService.addUserScopes as Mock).mockResolvedValue([]);

			const res = makeRes();
			const parsed = ListProjectsQueryDto.safeParse({});
			expect(parsed.success).toBe(true);
			const query = parsed.data!;

			await controller.getSharingCandidates(req, res, query);

			expect(res.json).toHaveBeenCalledWith({ count: 0, data: [] });
		});
	});

	it('delegates updateProject to the service with the acting user', async () => {
		const projectId = 'p1';
		const payload = { name: 'Updated Project' };

		const res = makeRes();

		await controller.updateProject(req, res, payload as any, projectId);

		expect(projectsService.updateProject).toHaveBeenCalledWith(req.user, projectId, payload);
	});

	it('delegates addProjectUsers to the service with the acting user', async () => {
		// Arrange
		const projectId = 'p1';
		const payload = { relations: [{ userId: 'u2', role: 'project:viewer' as const }] };

		provisioningService.isProjectRoleManaged.mockResolvedValue(false);
		(projectsService.addUsersWithConflictSemantics as Mock).mockResolvedValue({
			project: { id: projectId, name: 'Project' },
			added: payload.relations,
			conflicts: [],
		});

		const res = makeRes();

		// Act
		await controller.addProjectUsers(req, res, projectId, payload as any);

		// Assert
		expect(projectsService.addUsersWithConflictSemantics).toHaveBeenCalledWith(
			req.user,
			projectId,
			payload.relations,
		);
	});

	it('delegates changeProjectUserRole to the service and returns 204', async () => {
		// Arrange
		const projectId = 'p2';
		provisioningService.isProjectRoleManaged.mockResolvedValue(false);

		const res = makeRes();

		// Act
		await controller.changeProjectUserRole(req, res, projectId, 'u2', {
			role: 'project:editor',
		} as any);

		// Assert
		expect(projectsService.changeUserRoleInProject).toHaveBeenCalledWith(
			req.user,
			projectId,
			'u2',
			'project:editor',
		);
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it('delegates deleteProjectUser to the service and returns 204', async () => {
		// Arrange
		const projectId = 'p3';
		provisioningService.isProjectRoleManaged.mockResolvedValue(false);

		const res = makeRes();

		// Act
		await controller.deleteProjectUser(req, res, projectId, 'u2');

		// Assert
		expect(projectsService.deleteUserFromProject).toHaveBeenCalledWith(req.user, projectId, 'u2');
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

		(projectsService.addUsersWithConflictSemantics as Mock).mockResolvedValue({
			project: { id: projectId, name: 'Project' },
			added,
			conflicts,
		});

		const res = makeRes();

		// Act
		await controller.addProjectUsers(req, res, projectId, {
			relations: [...added, { userId: 'u5', role: 'project:editor' }],
		} as any);

		// Assert: 201 with conflicts body
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({ conflicts });
	});

	describe('managed project roles', () => {
		it('blocks addProjectUsers when project roles are managed', async () => {
			provisioningService.isProjectRoleManaged.mockResolvedValue(true);

			const res = makeRes();

			await expect(
				controller.addProjectUsers(req, res, 'p1', {
					relations: [{ userId: 'u2', role: 'project:viewer' }],
				} as any),
			).rejects.toThrow('Project roles are managed automatically');

			expect(projectsService.addUsersWithConflictSemantics).not.toHaveBeenCalled();
		});

		it('blocks changeProjectUserRole when project roles are managed', async () => {
			provisioningService.isProjectRoleManaged.mockResolvedValue(true);

			const res = makeRes();

			await expect(
				controller.changeProjectUserRole(req, res, 'p2', 'u2', {
					role: 'project:editor',
				} as any),
			).rejects.toThrow('Project roles are managed automatically');

			expect(projectsService.changeUserRoleInProject).not.toHaveBeenCalled();
		});

		it('blocks deleteProjectUser when project roles are managed', async () => {
			provisioningService.isProjectRoleManaged.mockResolvedValue(true);

			const res = makeRes();

			await expect(controller.deleteProjectUser(req, res, 'p3', 'u2')).rejects.toThrow(
				'Project roles are managed automatically',
			);

			expect(projectsService.deleteUserFromProject).not.toHaveBeenCalled();
		});

		it.each([true, false])('exposes rolesManaged=%s on getProject', async (managed) => {
			provisioningService.isProjectRoleManaged.mockResolvedValue(managed);
			(projectsService.getProject as Mock).mockResolvedValue({
				id: 'p1',
				name: 'Project',
				icon: null,
				type: 'team',
				description: null,
				customTelemetryTags: [],
			});
			(projectsService.getProjectRelations as Mock).mockResolvedValue([]);

			const scopedReq = {
				user: { id: 'actor-user', role: { slug: 'global:owner', scopes: [] } },
			} as unknown as AuthenticatedRequest;

			const result = await controller.getProject(scopedReq, makeRes(), 'p1');

			expect(result.rolesManaged).toBe(managed);
		});
	});

	describe('execution quota endpoints', () => {
		it('getExecutionQuota delegates to the service', async () => {
			const consumption = {
				limit: 100,
				periodUnit: 'day' as const,
				consumed: 5,
				remaining: 95,
				resetsAt: '2026-09-02T00:00:00.000Z',
			};
			projectExecutionQuotaService.getConsumption.mockResolvedValue(consumption);

			const result = await controller.getExecutionQuota(req, makeRes(), 'p1');

			expect(projectExecutionQuotaService.getConsumption).toHaveBeenCalledWith('p1');
			expect(result).toEqual(consumption);
		});

		it('updateExecutionQuota delegates to the service with parsed payload', async () => {
			const payload = { limit: 50, periodUnit: 'week' as const };

			await controller.updateExecutionQuota(req, makeRes(), payload as any, 'p1');

			expect(projectExecutionQuotaService.setLimit).toHaveBeenCalledWith('p1', 50, 'week');
		});

		it('getExecutionQuotaSpikes delegates to the service', async () => {
			const spikes = [{ workflowId: 'w1', todayCount: 500, baseline: 10, multiplier: 5 }];
			projectExecutionQuotaService.getSpikes.mockResolvedValue(spikes);

			const result = await controller.getExecutionQuotaSpikes(req, makeRes(), 'p1');

			expect(projectExecutionQuotaService.getSpikes).toHaveBeenCalledWith('p1');
			expect(result).toEqual(spikes);
		});
	});
});
