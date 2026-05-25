import { Post, RestController } from '@n8n/decorators';
import { In } from '@n8n/typeorm';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { McpRegistryServerEntity } from './registry/mcp-registry-server.entity';
import { McpRegistryServerRepository } from './registry/mcp-registry-server.repository';
import { McpRegistryService } from './registry/mcp-registry.service';
import { toEntity } from './registry/mcp-registry.types';
import { notionMockServer, linearMockServer } from './registry/mock-servers';

/**
 * Test-only endpoints for seeding MCP registry data in E2E tests.
 * Only registered when E2E_TESTS is set.
 */
@RestController('/mcp-registry')
export class McpRegistryTestController {
	constructor(
		private readonly repository: McpRegistryServerRepository,
		private readonly service: McpRegistryService,
	) {}

	@Post('/test/seed', { skipAuth: true })
	async seed() {
		this.assertE2ETestsEnabled();

		const entities = [notionMockServer, linearMockServer].map(toEntity);

		// Replace rather than upsert: a startup refresh can leave rows whose slug collides with our mocks at a different id, which `ON CONFLICT (id) DO UPDATE` does not cover.
		await this.repository.manager.transaction(async (manager) => {
			await manager.createQueryBuilder().delete().from(McpRegistryServerEntity).execute();
			await manager.insert(McpRegistryServerEntity, entities);
		});
		await this.service.handleReloadMcpRegistry();

		return { ok: true, count: entities.length };
	}

	private assertE2ETestsEnabled(): void {
		if (process.env.E2E_TESTS !== 'true' || process.env.NODE_ENV === 'production') {
			throw new ForbiddenError('MCP registry test endpoints are not enabled');
		}
	}
}
