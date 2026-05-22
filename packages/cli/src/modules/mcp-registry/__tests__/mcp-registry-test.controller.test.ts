import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { McpRegistryTestController } from '../mcp-registry-test.controller';
import type { McpRegistryServerRepository } from '../registry/mcp-registry-server.repository';
import type { McpRegistryService } from '../registry/mcp-registry.service';
import { toEntity } from '../registry/mcp-registry.types';
import { notionMockServer, linearMockServer } from '../registry/mock-servers';

describe('McpRegistryTestController', () => {
	const repository = mock<McpRegistryServerRepository>();
	const service = mock<McpRegistryService>();
	const controller = new McpRegistryTestController(repository, service);

	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv, E2E_TESTS: 'true' };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('seed', () => {
		it('should upsert mock servers and trigger registry reload', async () => {
			repository.upsert.mockResolvedValue({} as never);
			service.handleReloadMcpRegistry.mockResolvedValue();

			const result = await controller.seed();

			expect(repository.upsert).toHaveBeenCalledWith(
				[notionMockServer, linearMockServer].map(toEntity),
				['slug'],
			);
			expect(service.handleReloadMcpRegistry).toHaveBeenCalled();
			expect(result).toEqual({ ok: true, count: 2 });
		});

		it('should throw ForbiddenError when E2E_TESTS is not set', async () => {
			delete process.env.E2E_TESTS;

			await expect(controller.seed()).rejects.toThrow(ForbiddenError);
		});

		it('should throw ForbiddenError in production even when E2E_TESTS is set', async () => {
			process.env.NODE_ENV = 'production';

			await expect(controller.seed()).rejects.toThrow(ForbiddenError);
		});
	});
});
