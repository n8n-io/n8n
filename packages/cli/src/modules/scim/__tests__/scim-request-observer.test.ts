import type { EventService } from '@n8n/backend-services';
import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { markScimRejection, ScimRequestObserver, scimOperationOf } from '../scim-request-observer';

describe('scimOperationOf', () => {
	it.each([
		['GET', '/Users', 'list_users'],
		['POST', '/Users', 'create_user'],
		['GET', '/Users/user-1', 'get_user'],
		['PUT', '/Users/user-1', 'replace_user'],
		['PATCH', '/Users/user-1', 'patch_user'],
		['DELETE', '/Users/user-1', 'delete_user'],
		['GET', '/ServiceProviderConfig', 'discovery'],
		['GET', '/ResourceTypes', 'discovery'],
		['GET', '/Schemas', 'discovery'],
		['DELETE', '/Users', 'other'],
		['GET', '/Users/user-1/extra', 'other'],
		['GET', '/Groups', 'other'],
	])('maps %s %s to %s', (method, path, operation) => {
		expect(scimOperationOf(method, path)).toBe(operation);
	});
});

describe('ScimRequestObserver', () => {
	const eventService = mock<EventService>();
	const observer = new ScimRequestObserver(eventService);

	const run = (status: number, reason?: Parameters<typeof markScimRejection>[1]) => {
		const req = mock<Request>({ method: 'POST', path: '/Users' });
		const res = Object.assign(new EventEmitter(), { statusCode: status }) as unknown as Response;
		const next = vi.fn();

		void observer.getMiddleware()(req, res, next);
		if (reason) markScimRejection(res, reason);
		res.emit('finish');

		expect(next).toHaveBeenCalledTimes(1);
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('does not report a response without an error status', () => {
		run(201);

		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('reads the operation when the request starts', () => {
		const req = mock<Request>({ method: 'GET', path: '/Users/user-1' });
		const res = Object.assign(new EventEmitter(), { statusCode: 404 }) as unknown as Response;

		observer.observe(req, res);
		// Express rewrites the path while the request passes other routers.
		Object.assign(req, { path: '/scim/v2/Users/user-1' });
		res.emit('finish');

		expect(eventService.emit).toHaveBeenCalledWith('scim-request-rejected', {
			operation: 'get_user',
			status: 404,
			reason: 'not_found',
		});
	});

	it('reports the reason that the handler recorded', () => {
		run(401, 'superseded_token');

		expect(eventService.emit).toHaveBeenCalledWith('scim-request-rejected', {
			operation: 'create_user',
			status: 401,
			reason: 'superseded_token',
		});
	});

	it.each([
		[400, 'invalid_request'],
		[422, 'invalid_request'],
		[401, 'invalid_token'],
		[403, 'forbidden'],
		[404, 'not_found'],
		[409, 'conflict'],
		[429, 'rate_limited'],
		[500, 'internal_error'],
		[418, 'other'],
	] as const)('derives the reason of a %i without a recorded reason', (status, reason) => {
		run(status);

		expect(eventService.emit).toHaveBeenCalledWith('scim-request-rejected', {
			operation: 'create_user',
			status,
			reason,
		});
	});
});
