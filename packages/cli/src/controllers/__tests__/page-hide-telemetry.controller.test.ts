import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { PageHideTelemetryController } from '../page-hide-telemetry.controller';

describe('PageHideTelemetryController', () => {
	const telemetry = mock<Telemetry>();
	const controller = new PageHideTelemetryController(telemetry);
	const req = mock<AuthenticatedRequest>({
		user: { id: 'user-1', role: { scopes: [{ slug: 'instanceAi:message' }] } },
	});
	const reqWithoutScope = mock<AuthenticatedRequest>({
		user: { id: 'user-2', role: { scopes: [] } },
	});
	const res = mock<Response>();
	const allowed = TELEMETRY_EVENT.INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN;

	beforeEach(() => vi.clearAllMocks());

	it('tracks an allowed event with the id of the signed-in user', () => {
		controller.track(req, res, {
			event: allowed.name,
			properties: { thread_id: 'thread-1', is_awaiting_user: true },
		});

		expect(telemetry.track).toHaveBeenCalledWith(allowed, {
			thread_id: 'thread-1',
			is_awaiting_user: expect.any(Boolean),
			user_id: 'user-1',
		});
	});

	it('ignores a user id that the client sends', () => {
		controller.track(req, res, {
			event: allowed.name,
			properties: { thread_id: 'thread-1', is_awaiting_user: false, user_id: 'someone-else' },
		});

		expect(telemetry.track).toHaveBeenCalledWith(allowed, {
			thread_id: 'thread-1',
			is_awaiting_user: expect.any(Boolean),
			user_id: 'user-1',
		});
	});

	it('drops properties that the event does not define', () => {
		controller.track(req, res, {
			event: allowed.name,
			properties: { thread_id: 'thread-1', is_awaiting_user: false, extra: 'ignored' },
		});

		expect(telemetry.track).toHaveBeenCalledWith(allowed, {
			thread_id: 'thread-1',
			is_awaiting_user: expect.any(Boolean),
			user_id: 'user-1',
		});
	});

	it('rejects a user who lacks the scope that the event needs', () => {
		expect(() =>
			controller.track(reqWithoutScope, res, {
				event: allowed.name,
				properties: { thread_id: 'thread-1', is_awaiting_user: false },
			}),
		).toThrow(ForbiddenError);
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('rejects an event name that is not registered', () => {
		expect(() =>
			controller.track(req, res, { event: 'Not a registered event', properties: {} }),
		).toThrow(BadRequestError);
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('rejects a registered event that is not allowed from the page', () => {
		const notAllowed = TELEMETRY_EVENT.INSTANCE_AI.USER_RETURNED_TO_AI_ASSISTANT_THREAD;

		expect(() =>
			controller.track(req, res, {
				event: notAllowed.name,
				properties: { thread_id: 'thread-1', time_away_ms: 1 },
			}),
		).toThrow(BadRequestError);
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('rejects properties that do not match the event', () => {
		expect(() =>
			controller.track(req, res, { event: allowed.name, properties: { unexpected: true } }),
		).toThrow(BadRequestError);
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	describe('route', () => {
		const registry = Container.get(ControllerRegistryMetadata);
		const route = registry.getRouteMetadata(PageHideTelemetryController as never, 'track');

		it('is a POST under /telemetry/page-hide', () => {
			expect(route).toMatchObject({ method: 'post', path: '/page-hide' });
			expect(registry.getControllerMetadata(PageHideTelemetryController as never).basePath).toBe(
				'/telemetry',
			);
		});

		it('needs a signed-in user', () => {
			expect(route.skipAuth).toBeFalsy();
		});
	});
});
