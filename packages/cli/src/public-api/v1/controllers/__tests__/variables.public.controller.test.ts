import type { CreateVariablePublicDto, UpdateVariablePublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest, OperationContext } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';

import { VariablesPublicController } from '../variables.public.controller';

describe('VariablesPublicController', () => {
	let controller: VariablesPublicController;
	const variablesService = mock<VariablesService>();

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new VariablesPublicController(variablesService);
	});

	describe('operation context on variable changes', () => {
		type Route = {
			route: string;
			call: (req: AuthenticatedRequest) => Promise<unknown>;
			ctxPassed: () => OperationContext | undefined;
		};

		const routes: Route[] = [
			{
				route: 'createVariable',
				call: async (req) =>
					await controller.createVariable(req, mock<Response>(), {
						key: 'KEY',
						value: 'value',
					} as CreateVariablePublicDto),
				ctxPassed: () => variablesService.create.mock.calls[0][2],
			},
			{
				route: 'updateVariable',
				call: async (req) =>
					await controller.updateVariable(req, mock<Response>(), 'variable-id', {
						key: 'KEY',
						value: 'value',
					} as UpdateVariablePublicDto),
				ctxPassed: () => variablesService.update.mock.calls[0][3],
			},
			{
				route: 'deleteVariable',
				call: async (req) => await controller.deleteVariable(req, mock<Response>(), 'variable-id'),
				ctxPassed: () => variablesService.deleteForUser.mock.calls[0][2],
			},
		];

		const callRoute = async ({ call }: Route, ctx?: OperationContext) =>
			await call(Object.assign(mock<AuthenticatedRequest>(), { ctx }));

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
