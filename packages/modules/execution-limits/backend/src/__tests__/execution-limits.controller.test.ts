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

	it('registers the instance read and write routes', () => {
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

	it.each(routeCases)('$handlerName is gated by a global executionLimit:* scope', ({ route }) => {
		expect(route.accessScope?.globalOnly).toBe(true);
		expect(route.accessScope?.scope).toBe(
			route.method === 'get' ? 'executionLimit:read' : 'executionLimit:update',
		);
	});
});

describe('ExecutionLimitsController handlers', () => {
	const service = mock<ExecutionLimitsService>();
	const controller = new ExecutionLimitsController(service);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('getInstanceLimit maps instanceMaxExecutions to maxExecutions', async () => {
		service.getSettings.mockResolvedValue({
			periodUnit: 'month',
			instanceMaxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 3,
		});

		const result = await controller.getInstanceLimit();

		expect(result).toEqual({
			periodUnit: 'month',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
			version: 3,
		});
	});

	it('putInstanceLimit forwards mapped fields, version, user id and loginId', async () => {
		service.updateSettings.mockResolvedValue({
			periodUnit: 'week',
			instanceMaxExecutions: 50_000,
			defaultProjectMaxExecutions: 5_000,
			version: 4,
		});
		const req = mock<AuthenticatedRequest>({
			user: mock<User>({ id: 'user-1' }),
			ctx: { security: { subIdentityId: 'login-1' } as never },
		});
		const dto: PutInstanceExecutionLimitDto = {
			periodUnit: 'week',
			maxExecutions: 50_000,
			defaultProjectMaxExecutions: 5_000,
			version: 3,
		};

		const result = await controller.putInstanceLimit(req, {}, dto);

		expect(service.updateSettings).toHaveBeenCalledWith(
			{
				periodUnit: 'week',
				instanceMaxExecutions: 50_000,
				defaultProjectMaxExecutions: 5_000,
			},
			3,
			'user-1',
			'login-1',
		);
		expect(result).toEqual({
			periodUnit: 'week',
			maxExecutions: 50_000,
			defaultProjectMaxExecutions: 5_000,
			version: 4,
		});
	});
});
