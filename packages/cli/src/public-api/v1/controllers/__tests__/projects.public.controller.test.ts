import type { AddProjectMembersPublicDto, DeleteProjectQueryPublicDto } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import type { PublicApiRequest } from '@/public-api/public-api-client';
import type { ProjectService } from '@/services/project.service.ee';

import { ProjectsPublicController } from '../projects.public.controller';

describe('ProjectsPublicController', () => {
	let controller: ProjectsPublicController;
	const projectService = mock<ProjectService>();
	const provisioningService = mock<ProvisioningService>();

	beforeEach(() => {
		vi.clearAllMocks();
		provisioningService.isProjectRoleManaged.mockResolvedValue(false);
		controller = new ProjectsPublicController(projectService, provisioningService);
	});

	describe('operation context on project changes', () => {
		type Route = {
			route: string;
			call: (req: PublicApiRequest) => Promise<unknown>;
			ctxPassed: () => OperationContext | undefined;
		};

		const routes: Route[] = [
			{
				route: 'deleteProject',
				call: async (req) =>
					await controller.deleteProject(
						req,
						mock<Response>(),
						'project-id',
						{} as DeleteProjectQueryPublicDto,
					),
				ctxPassed: () => projectService.deleteProject.mock.calls[0][3],
			},
			{
				route: 'addUsersToProject',
				call: async (req) =>
					await controller.addUsersToProject(req, mock<Response>(), 'project-id', {
						relations: [{ userId: 'user-id', role: 'project:viewer' }],
					} as AddProjectMembersPublicDto),
				ctxPassed: () => projectService.addUsersToProject.mock.calls[0][1],
			},
		];

		const callRoute = async ({ call }: Route, ctx?: OperationContext) =>
			await call(
				Object.assign(mock<PublicApiRequest>(), { ctx, publicApiClient: 'other' as const }),
			);

		it.each(routes)('$route passes the operation context of the request', async (route) => {
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await callRoute(route, ctx);

			expect(route.ctxPassed()).toBe(ctx);
		});

		it.each(routes)(
			'$route passes no operation context when the request has none',
			async (route) => {
				await callRoute(route, undefined);

				expect(route.ctxPassed()).toBeUndefined();
			},
		);
	});
});
