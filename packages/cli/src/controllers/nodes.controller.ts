import { Get, GlobalScope, RestController } from '@n8n/decorators';
import type { Request } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeCatalogService, type NodeSchema } from '@/node-catalog/node-catalog.service';

interface SearchQuery {
	q?: string;
	hasCredential?: string;
}

interface SearchResultItem {
	/** Stable operation id, e.g. `n8n-nodes-base.slack.message.send`. Pass this back to `POST /executions/node`. */
	id: string;
	nodeId: string;
	resource?: string;
	operation?: string;
	displayName: string;
	description: string;
}

interface SearchResult {
	results: SearchResultItem[];
}

/**
 * REST endpoints for the node catalog.
 *
 * Mirrors the MCP `n8n_search_tools` tool so non-MCP consumers (Hub UI, CLI
 * tooling, agent runtimes) can search and describe nodes over plain HTTP.
 */
@RestController('/nodes')
export class NodesController {
	constructor(private readonly nodeCatalogService: NodeCatalogService) {}

	/**
	 * Search the node catalog and expand each matching node into its operations.
	 *
	 * For Slack the query "slack" returns entries like:
	 *   - `slack.message.send`
	 *   - `slack.channel.create`
	 *   - `slack.file.upload`
	 *
	 * The shape mirrors what the MCP `n8n_search_tools` tool returns so a caller
	 * can pass the `id` field back to `POST /executions/node` to execute it.
	 *
	 * An empty or missing `q` returns `{ results: [] }`.
	 */
	@Get('/search')
	@GlobalScope('tool:search')
	async search(
		req: Request<Record<string, string>, unknown, unknown, SearchQuery>,
	): Promise<SearchResult> {
		const rawQuery = req.query.q;
		const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
		if (q.length === 0) return { results: [] };

		const hasCredential = req.query.hasCredential === 'true';

		const nodeHits = await this.nodeCatalogService.searchNodesStructured([q], { hasCredential });

		const results: SearchResultItem[] = [];
		for (const hit of nodeHits) {
			const schema = await this.nodeCatalogService.getNodeSchema(hit.nodeId);
			if (!schema) {
				// Catalog entry exists but we couldn't get its operations.
				// Emit one bare entry rather than dropping the hit entirely.
				results.push({
					id: hit.nodeId,
					nodeId: hit.nodeId,
					displayName: hit.displayName,
					description: hit.description,
				});
				continue;
			}

			for (const op of schema.operations) {
				results.push({
					id: op.id,
					nodeId: hit.nodeId,
					...(op.resource ? { resource: op.resource } : {}),
					...(op.operation ? { operation: op.operation } : {}),
					// Compose displayName: "Slack: Send Message" reads better than bare op name.
					displayName:
						op.displayName && op.displayName !== hit.displayName
							? `${hit.displayName}: ${op.displayName}`
							: hit.displayName,
					description: op.description ?? hit.description,
				});
			}
		}

		return { results };
	}

	/**
	 * Return the full schema for a single node by id.
	 *
	 * The id may be URL-encoded (e.g. `%40n8n%2Fn8n-nodes-langchain.agent` for
	 * `@n8n/n8n-nodes-langchain.agent`). Throws 404 when the node is unknown.
	 */
	@Get('/:id')
	@GlobalScope('tool:search')
	async getById(req: Request<{ id: string }>): Promise<NodeSchema> {
		const nodeId = decodeURIComponent(req.params.id);
		const schema = await this.nodeCatalogService.getNodeSchema(nodeId);
		if (!schema) {
			throw new NotFoundError(`Node not found: ${nodeId}`);
		}
		return schema;
	}
}
