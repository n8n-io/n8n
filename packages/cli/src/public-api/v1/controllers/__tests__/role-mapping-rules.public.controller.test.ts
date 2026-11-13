import type {
	CreateRoleMappingRuleDto,
	MoveRoleMappingRuleDto,
	UpdateRoleMappingRulePublicDto,
} from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import type { AuthenticatedRequest, OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { RoleMappingRuleService } from '@/modules/provisioning.ee/role-mapping-rule.service.ee';

import { RoleMappingRulesPublicController } from '../role-mapping-rules.public.controller';

describe('RoleMappingRulesPublicController', () => {
	const roleMappingRuleService = mock<RoleMappingRuleService>();
	const licenseState = mock<LicenseState>();
	const controller = new RoleMappingRulesPublicController(roleMappingRuleService, licenseState);
	const stop = new Error('Stopping for test');

	beforeEach(() => {
		vi.clearAllMocks();
		licenseState.isProvisioningLicensed.mockReturnValue(true);
	});

	describe('operation context on rule changes', () => {
		type Route = {
			route: string;
			call: (req: AuthenticatedRequest) => Promise<unknown>;
			arrange: () => void;
			ctxPassed: () => OperationContext | undefined;
		};

		const routes: Route[] = [
			{
				route: 'createRoleMappingRule',
				call: async (req) =>
					await controller.createRoleMappingRule(
						req,
						mock<Response>(),
						{} as CreateRoleMappingRuleDto,
					),
				arrange: () => roleMappingRuleService.create.mockRejectedValue(stop),
				ctxPassed: () => roleMappingRuleService.create.mock.calls[0][2],
			},
			{
				route: 'moveRoleMappingRule',
				call: async (req) =>
					await controller.moveRoleMappingRule(req, mock<Response>(), 'rule-id', {
						targetIndex: 0,
					} as MoveRoleMappingRuleDto),
				arrange: () => roleMappingRuleService.move.mockRejectedValue(stop),
				ctxPassed: () => roleMappingRuleService.move.mock.calls[0][1],
			},
			{
				route: 'updateRoleMappingRule',
				call: async (req) =>
					await controller.updateRoleMappingRule(
						req,
						mock<Response>(),
						'rule-id',
						{} as UpdateRoleMappingRulePublicDto,
					),
				arrange: () => roleMappingRuleService.patch.mockRejectedValue(stop),
				ctxPassed: () => roleMappingRuleService.patch.mock.calls[0][1],
			},
			{
				route: 'deleteRoleMappingRule',
				call: async (req) =>
					await controller.deleteRoleMappingRule(req, mock<Response>(), 'rule-id'),
				arrange: () => roleMappingRuleService.delete.mockRejectedValue(stop),
				ctxPassed: () => roleMappingRuleService.delete.mock.calls[0][1],
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
