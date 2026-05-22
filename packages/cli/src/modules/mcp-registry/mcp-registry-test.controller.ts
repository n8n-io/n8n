import { Post, RestController } from '@n8n/decorators';
import { In } from '@n8n/typeorm';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

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

		const servers = [notionMockServer, linearMockServer];
		const existingBySlug = new Map(
			(
				await this.repository.findBy({
					slug: In(servers.map(({ slug }) => slug)),
				})
			).map((entity) => [entity.slug, entity.id]),
		);
		const entities = servers.map((server) => {
			const entity = toEntity(server);
			const existingId = existingBySlug.get(server.slug);
			if (existingId !== undefined) {
				entity.id = existingId;
			}

			return entity;
		});
		await this.repository.upsert(entities, ['slug']);
		await this.service.handleReloadMcpRegistry();

		return { ok: true, count: entities.length };
	}

	private assertE2ETestsEnabled(): void {
		if (process.env.E2E_TESTS !== 'true' || process.env.NODE_ENV === 'production') {
			throw new ForbiddenError('MCP registry test endpoints are not enabled');
		}
	}
}
