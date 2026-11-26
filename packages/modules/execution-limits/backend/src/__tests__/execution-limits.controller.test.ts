import type { PutInstanceExecutionLimitDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitsController } from '../execution-limits.controller';
import type { ExecutionLimitsService } from '../execution-limits.service';

describe('ExecutionLimitsController route metadata', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		ExecutionLimitsController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('mounts at /execution-limits with getInstanceLimit and putInstanceLimit', () => {
		expect(metadata.basePath).toBe('/execution-limits');
		expect(routeCases.map(({ handlerName }) => handlerName).sort()).toEqual([
			'getInstanceLimit',
			'putInstanceLimit',
		]);
	});

	it.each(routeCases)(
		'$handlerName is gated by the executionLimits license feature',
		({ route }) => {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.EXECUTION_LIMITS);
		},
	);

	it.each(routeCases)(
		'$handlerName is gated by a global-only executionLimit:* RBAC scope',
		({ handlerName, route }) => {
			expect(route.accessScope?.globalOnly).toBe(true);
			expect(route.accessScope?.scope).toBe(
				handlerName === 'getInstanceLimit' ? 'executionLimit:read' : 'executionLimit:update',
			);
		},
	);
});

describe('ExecutionLimitsController handlers', () => {
	const service = mock<ExecutionLimitsService>();
	const controller = new ExecutionLimitsController(service);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('getInstanceLimit maps instanceMaxExecutions to maxExecutions', async () => {
		service.getSettings.mockResolvedValue({
			periodUnit: 'month',
			instanceMaxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
		});

		expect(await controller.getInstanceLimit()).toEqual({
			periodUnit: 'month',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
		});
	});

	it('putInstanceLimit forwards fields, user id and loginId from request context', async () => {
		service.updateSettings.mockResolvedValue({
			periodUnit: 'week',
			instanceMaxExecutions: 500,
			defaultProjectMaxExecutions: 100,
		});
		const req = mock<AuthenticatedRequest>({
			user: mock<User>({ id: 'user-1' }),
			ctx: {
				security: {
					subIdentityId: 'login-1',
				} as AuthenticatedRequest['ctx'] extends { security?: infer S } ? S : never,
			},
		});
		const dto = {
			periodUnit: 'week',
			maxExecutions: 500,
			defaultProjectMaxExecutions: 100,
		} as PutInstanceExecutionLimitDto;

		const result = await controller.putInstanceLimit(req, undefined, dto);

		expect(service.updateSettings).toHaveBeenCalledWith(
			{
				periodUnit: 'week',
				instanceMaxExecutions: 500,
				defaultProjectMaxExecutions: 100,
			},
			'user-1',
			'login-1',
		);
		expect(result).toEqual({
			periodUnit: 'week',
			maxExecutions: 500,
			defaultProjectMaxExecutions: 100,
		});
	});
});
