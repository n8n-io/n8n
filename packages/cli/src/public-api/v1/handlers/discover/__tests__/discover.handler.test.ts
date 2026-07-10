import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { ApiKeyRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import type { Mocked } from 'vitest';

import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import * as discoverService from '../discover.service';

// Loaded dynamically (handler routes are arrays of middleware + handler) and
// typed loosely so the suite can invoke individual entries by index.
let handler: Record<string, Array<(...args: unknown[]) => unknown>>;

beforeAll(async () => {
	handler = (await import('../discover.handler')) as unknown as typeof handler;
});

describe('Discover Handler', () => {
	let mockApiKeyRepository: Mocked<ApiKeyRepository>;
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockApiKeyRepository = mockInstance(ApiKeyRepository);

		vi.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === ApiKeyRepository) return mockApiKeyRepository as any;
			return {} as any;
		});

		mockResponse = {
			json: vi.fn().mockReturnThis(),
		};
	});

	it('should throw UnauthenticatedError when API key header is missing', async () => {
		const req = {
			headers: {},
			query: {},
		} as unknown as AuthenticatedRequest;

		const handlerFn = handler.getDiscover[0];
		let caught: unknown;
		try {
			await handlerFn(req, mockResponse as Response);
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(UnauthenticatedError);
		expect(caught).toMatchObject({ message: 'Unauthorized', httpStatusCode: 401 });
		expect(mockApiKeyRepository.findOne).not.toHaveBeenCalled();
	});

	it('should throw UnauthenticatedError when API key not found in DB', async () => {
		mockApiKeyRepository.findOne.mockResolvedValue(null);

		const req = {
			headers: { 'x-n8n-api-key': 'invalid-key' },
			query: {},
		} as unknown as AuthenticatedRequest;

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

	it('should return discover data when API key is valid', async () => {
		const scopes = ['tag:list', 'tag:create'] as any[];
		mockApiKeyRepository.findOne.mockResolvedValue({ scopes } as any);

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

		const req = {
			headers: { 'x-n8n-api-key': 'valid-key' },
			query: {},
		} as unknown as AuthenticatedRequest;

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(mockResponse.json).toHaveBeenCalledWith({ data: mockDiscoverResponse });
		expect(discoverService.buildDiscoverResponse).toHaveBeenCalledWith(scopes, {
			includeSchemas: false,
			resource: undefined,
			operation: undefined,
		});
	});

	it('should use first value when API key header is an array', async () => {
		mockApiKeyRepository.findOne.mockResolvedValue({
			scopes: ['tag:list'],
		} as any);

		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue({
			scopes: ['tag:list'] as any[],
			resources: {},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		});

		const req = {
			headers: { 'x-n8n-api-key': ['first-key', 'second-key'] },
			query: {},
		} as unknown as AuthenticatedRequest;

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
			where: { apiKey: 'first-key', audience: 'public-api' },
			select: { scopes: true },
		});
	});

	it('should pass includeSchemas true when query include is schemas', async () => {
		const scopes = ['tag:list'] as any[];
		mockApiKeyRepository.findOne.mockResolvedValue({ scopes } as any);

		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue({
			scopes,
			resources: {},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		});

		const req = {
			headers: { 'x-n8n-api-key': 'valid-key' },
			query: { include: 'schemas' },
		} as unknown as AuthenticatedRequest;

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(discoverService.buildDiscoverResponse).toHaveBeenCalledWith(scopes, {
			includeSchemas: true,
			resource: undefined,
			operation: undefined,
		});
	});

	it('should pass resource and operation query params to service', async () => {
		const scopes = ['workflow:create'] as any[];
		mockApiKeyRepository.findOne.mockResolvedValue({ scopes } as any);

		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue({
			scopes,
			resources: {},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		});

		const req = {
			headers: { 'x-n8n-api-key': 'valid-key' },
			query: { resource: 'workflow', operation: 'create' },
		} as unknown as AuthenticatedRequest;

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(discoverService.buildDiscoverResponse).toHaveBeenCalledWith(scopes, {
			includeSchemas: false,
			resource: 'workflow',
			operation: 'create',
		});
	});

	it('should query ApiKeyRepository with correct parameters', async () => {
		mockApiKeyRepository.findOne.mockResolvedValue({
			scopes: ['workflow:read'],
		} as any);

		vi.spyOn(discoverService, 'buildDiscoverResponse').mockResolvedValue({
			scopes: ['workflow:read'] as any[],
			resources: {},
			filters: {},
			specUrl: '/api/v1/openapi.yml',
		});

		const req = {
			headers: { 'x-n8n-api-key': 'my-api-key' },
			query: {},
		} as unknown as AuthenticatedRequest;

		const handlerFn = handler.getDiscover[0];
		await handlerFn(req, mockResponse);

		expect(mockApiKeyRepository.findOne).toHaveBeenCalledWith({
			where: { apiKey: 'my-api-key', audience: 'public-api' },
			select: { scopes: true },
		});
	});
});
