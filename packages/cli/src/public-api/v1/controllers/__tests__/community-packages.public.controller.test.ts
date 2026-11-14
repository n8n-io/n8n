import type {
	InstallCommunityPackagePublicDto,
	UpdateCommunityPackagePublicDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';

import { CommunityPackagesPublicController } from '../community-packages.public.controller';

describe('CommunityPackagesPublicController', () => {
	const lifecycleService = mock<CommunityPackagesLifecycleService>();
	const controller = new CommunityPackagesPublicController(lifecycleService);
	const stop = new Error('Stopping for test');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('operation context on package changes', () => {
		type Route = {
			route: string;
			call: (req: AuthenticatedRequest) => Promise<unknown>;
			arrange: () => void;
			ctxPassed: () => OperationContext | undefined;
		};

		const routes: Route[] = [
			{
				route: 'installPackage',
				call: async (req) =>
					await controller.installPackage(req, mock<Response>(), {
						name: 'n8n-nodes-test',
					} as InstallCommunityPackagePublicDto),
				arrange: () => lifecycleService.install.mockRejectedValue(stop),
				ctxPassed: () => lifecycleService.install.mock.calls[0][3],
			},
			{
				route: 'updatePackage',
				call: async (req) =>
					await controller.updatePackage(
						req,
						mock<Response>(),
						'n8n-nodes-test',
						{} as UpdateCommunityPackagePublicDto,
					),
				arrange: () => lifecycleService.update.mockRejectedValue(stop),
				ctxPassed: () => lifecycleService.update.mock.calls[0][3],
			},
			{
				route: 'uninstallPackage',
				call: async (req) =>
					await controller.uninstallPackage(req, mock<Response>(), 'n8n-nodes-test'),
				arrange: () => lifecycleService.uninstall.mockRejectedValue(stop),
				ctxPassed: () => lifecycleService.uninstall.mock.calls[0][3],
			},
		];

		const callRoute = async ({ call }: Route, ctx?: OperationContext) => {
			const req = mock<AuthenticatedRequest>({ ctx });
			await call(req).catch((e: unknown) => {
				if (e !== stop) throw e;
			});
			return req;
		};

		it.each(routes)('$route passes the request operation context to the service', async (route) => {
			route.arrange();
			const req = await callRoute(route, { security: mock<SecurityContext>() });

			expect(req.ctx).toBeDefined();
			expect(route.ctxPassed()).toBe(req.ctx);
		});

		it.each(routes)(
			'$route passes no operation context when the request has none',
			async (route) => {
				route.arrange();

				await callRoute(route, undefined);

				expect(route.ctxPassed()).toBeUndefined();
			},
		);
	});
});
