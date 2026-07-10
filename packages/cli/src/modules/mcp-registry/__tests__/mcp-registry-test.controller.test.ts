import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { McpRegistryTestController } from '../mcp-registry-test.controller';
import { McpRegistryServerEntity } from '../registry/mcp-registry-server.entity';
import type { McpRegistryServerRepository } from '../registry/mcp-registry-server.repository';
import type { McpRegistryService } from '../registry/mcp-registry.service';
import { toEntity } from '../registry/mcp-registry.types';
import { notionMockServer, linearMockServer } from '../registry/mock-servers';

describe('McpRegistryTestController', () => {
	const deleteQueryBuilder = {
		delete: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue({}),
	};

	const transactionManager = {
		createQueryBuilder: vi.fn().mockReturnValue(deleteQueryBuilder),
		insert: vi.fn().mockResolvedValue({}),
	};

	const manager = {
		transaction: vi.fn(
			async (runInTransaction: (m: typeof transactionManager) => Promise<unknown>) =>
				await runInTransaction(transactionManager),
		),
	};

	const repository = mock<McpRegistryServerRepository>();
	Object.assign(repository, { manager });

	const service = mock<McpRegistryService>();
	const controller = new McpRegistryTestController(repository, service);

	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv, E2E_TESTS: 'true' };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe('seed', () => {
		it('should replace mock servers and trigger registry reload', async () => {
			service.handleReloadMcpRegistry.mockResolvedValue();

			const result = await controller.seed();

			expect(manager.transaction).toHaveBeenCalled();
			expect(deleteQueryBuilder.from).toHaveBeenCalledWith(McpRegistryServerEntity);
			expect(deleteQueryBuilder.execute).toHaveBeenCalled();
			expect(transactionManager.insert).toHaveBeenCalledWith(
				McpRegistryServerEntity,
				[notionMockServer, linearMockServer].map(toEntity),
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
