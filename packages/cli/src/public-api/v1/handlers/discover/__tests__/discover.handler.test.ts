import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';

import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import * as discoverService from '../discover.service';

// Loaded dynamically (handler routes are arrays of middleware + handler) and
// typed loosely so the suite can invoke individual entries by index.
let handler: Record<string, Array<(...args: unknown[]) => unknown>>;

beforeAll(async () => {
	handler = (await import('../discover.handler.js')) as unknown as typeof handler;
});

describe('Discover Handler', () => {
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockResponse = {
			json: vi.fn().mockReturnThis(),
		};
	});

	function makeRequest(
		query: { include?: string; resource?: string; operation?: string } = {},
		apiKeyScopes?: string[],
	) {
		return {
			query,
			tokenGrant: apiKeyScopes ? { apiKeyScopes } : undefined,
		} as unknown as AuthenticatedRequest;
	}

	it('should throw UnauthenticatedError when tokenGrant is missing', async () => {
		const req = makeRequest();

		const handlerFn = handler.getDiscover[0];
		let caught: unknown;
		try {
			await handlerFn(req, mockResponse as Response);
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(UnauthenticatedError);
		expect(caught).toMatchObject({ message: 'Unauthorized', httpStatusCode: 401 });
	});

	it('should return discover data when tokenGrant has scopes', async () => {
		const scopes = ['tag:list', 'tag:create'];

		const mockDiscoverResponse = {
			scopes,
			resources: {
				tags: {
					operations: ['list', 'create'],
					endpoints: [
						{ method: 'GET', path: '/api/v1/tags', operationId: 'getTags' },
						{ method: 'POST', path: '/api/v1/tags', operationId: 'createTag' },
					],
				},
			},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		};

		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue(mockDiscoverResponse);

		const req = makeRequest({}, scopes);

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(mockResponse.json).toHaveBeenCalledWith({ data: mockDiscoverResponse });
		expect(discoverService.buildDiscoverResponse).toHaveBeenCalledWith(scopes, {
			includeSchemas: false,
			resource: undefined,
			operation: undefined,
		});
	});

	it('should pass includeSchemas true when query include is schemas', async () => {
		const scopes = ['tag:list'];

		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue({
			scopes,
			resources: {},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		});

		const req = makeRequest({ include: 'schemas' }, scopes);

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(discoverService.buildDiscoverResponse).toHaveBeenCalledWith(scopes, {
			includeSchemas: true,
			resource: undefined,
			operation: undefined,
		});
	});

	it('should pass resource and operation query params to service', async () => {
		const scopes = ['workflow:create'];

		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue({
			scopes,
			resources: {},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		});

		const req = makeRequest({ resource: 'workflow', operation: 'create' }, scopes);

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(discoverService.buildDiscoverResponse).toHaveBeenCalledWith(scopes, {
			includeSchemas: false,
			resource: 'workflow',
			operation: 'create',
		});
	});
});
