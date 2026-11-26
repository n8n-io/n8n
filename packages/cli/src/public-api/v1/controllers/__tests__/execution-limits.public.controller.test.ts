import type { PutInstanceExecutionLimitDto } from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import { ExecutionLimitsService } from '@n8n/backend-module-execution-limits';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ServiceUnavailableError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ExecutionLimitsPublicController } from '../execution-limits.public.controller';

describe('ExecutionLimitsPublicController route metadata', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		ExecutionLimitsPublicController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('mounts at /execution-limits with getInstanceExecutionLimit and putInstanceExecutionLimit', () => {
		expect(metadata.basePath).toBe('/execution-limits');
		expect(routeCases.map(({ handlerName }) => handlerName).sort()).toEqual([
			'getInstanceExecutionLimit',
			'putInstanceExecutionLimit',
		]);
	});

	it.each(routeCases)(
		'$handlerName requires the matching API key scope',
		({ handlerName, route }) => {
			expect(route.apiKeyScope).toBe(
				handlerName === 'getInstanceExecutionLimit'
					? 'executionLimit:read'
					: 'executionLimit:update',
			);
		},
	);

	it.each(routeCases)(
		'$handlerName is gated by a global-only executionLimit:* RBAC check',
		({ handlerName, route }) => {
			expect(route.accessScope?.globalOnly).toBe(true);
			expect(route.accessScope?.scope).toBe(
				handlerName === 'getInstanceExecutionLimit'
					? 'executionLimit:read'
					: 'executionLimit:update',
			);
		},
	);

	it.each(routeCases)(
		'$handlerName is gated by the executionLimits license feature',
		({ route }) => {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.EXECUTION_LIMITS);
		},
	);

	it.each(routeCases)(
		'$handlerName starts its summary with Preview: and documents 503',
		({ route }) => {
			expect(route.summary).toMatch(/^Preview:/);
			expect(route.successStatus).toBe(200);
			expect(route.responseDto).toBeDefined();
			expect(route.errorResponses?.some((response) => response.status === 503)).toBe(true);
		},
	);
});

describe('ExecutionLimitsPublicController with the module disabled', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const controller = new ExecutionLimitsPublicController(moduleRegistry);
	const req = mock<AuthenticatedRequest>();
	const res = mock<Response>();

	beforeEach(() => {
		moduleRegistry.isActive.mockReturnValue(false);
	});

	it('answers 503 before touching the service', async () => {
		await expect(controller.getInstanceExecutionLimit()).rejects.toThrow(ServiceUnavailableError);
		await expect(
			controller.putInstanceExecutionLimit(req, res, {} as PutInstanceExecutionLimitDto),
		).rejects.toThrow(ServiceUnavailableError);

		expect(moduleRegistry.isActive).toHaveBeenCalledWith('execution-limits');
	});
});

describe('ExecutionLimitsPublicController handler bodies', () => {
	const moduleRegistry = mock<ModuleRegistry>();
	const service = mock<ExecutionLimitsService>();
	const controller = new ExecutionLimitsPublicController(moduleRegistry);
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		moduleRegistry.isActive.mockReturnValue(true);
		Container.set(ExecutionLimitsService, service);
	});

	afterEach(() => {
		Container.reset();
	});

	it('getInstanceExecutionLimit maps instanceMaxExecutions to maxExecutions', async () => {
		service.getSettings.mockResolvedValue({
			periodUnit: 'month',
			instanceMaxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
		});

		expect(await controller.getInstanceExecutionLimit()).toEqual({
			periodUnit: 'month',
			maxExecutions: 100_000,
			defaultProjectMaxExecutions: 10_000,
		});
	});

	it('putInstanceExecutionLimit forwards fields, user id and loginId', async () => {
		service.updateSettings.mockResolvedValue({
			periodUnit: 'day',
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
			periodUnit: 'day',
			maxExecutions: 500,
			defaultProjectMaxExecutions: 100,
		} as PutInstanceExecutionLimitDto;

		const result = await controller.putInstanceExecutionLimit(req, res, dto);

		expect(service.updateSettings).toHaveBeenCalledWith(
			{
				periodUnit: 'day',
				instanceMaxExecutions: 500,
				defaultProjectMaxExecutions: 100,
			},
			'user-1',
			'login-1',
		);
		expect(result).toEqual({
			periodUnit: 'day',
			maxExecutions: 500,
			defaultProjectMaxExecutions: 100,
		});
	});
});
