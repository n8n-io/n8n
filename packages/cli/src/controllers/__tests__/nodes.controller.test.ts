import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Request } from 'express';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { NodeCatalogService } from '@/node-catalog/node-catalog.service';

import { NodesController } from '../nodes.controller';

describe('NodesController', () => {
	const nodeCatalogService = mockInstance(NodeCatalogService);

	const controller = Container.get(NodesController);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('search', () => {
		it('expands each matching node into one entry per operation', async () => {
			nodeCatalogService.searchNodesStructured.mockResolvedValue([
				{ nodeId: 'n8n-nodes-base.slack', displayName: 'Slack', description: 'd' },
			]);
			nodeCatalogService.getNodeSchema.mockResolvedValue({
				nodeId: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				description: 'd',
				credentials: [],
				operations: [
					{
						id: 'n8n-nodes-base.slack.message.send',
						resource: 'message',
						operation: 'send',
						displayName: 'Send Message',
						inputSchema: { type: 'object', properties: {} },
					},
					{
						id: 'n8n-nodes-base.slack.channel.create',
						resource: 'channel',
						operation: 'create',
						displayName: 'Create Channel',
						inputSchema: { type: 'object', properties: {} },
					},
				],
			});

			const req = { query: { q: 'slack' } } as unknown as Request<
				Record<string, string>,
				unknown,
				unknown,
				{ q?: string; hasCredential?: string }
			>;

			const result = await controller.search(req);

			expect(result.results).toEqual([
				expect.objectContaining({
					id: 'n8n-nodes-base.slack.message.send',
					nodeId: 'n8n-nodes-base.slack',
					resource: 'message',
					operation: 'send',
					displayName: 'Slack: Send Message',
				}),
				expect.objectContaining({
					id: 'n8n-nodes-base.slack.channel.create',
					nodeId: 'n8n-nodes-base.slack',
					resource: 'channel',
					operation: 'create',
					displayName: 'Slack: Create Channel',
				}),
			]);
			expect(nodeCatalogService.searchNodesStructured).toHaveBeenCalledWith(['slack'], {
				hasCredential: false,
			});
		});

		it('falls back to a bare entry when getNodeSchema returns null', async () => {
			nodeCatalogService.searchNodesStructured.mockResolvedValue([
				{ nodeId: 'n8n-nodes-base.foo', displayName: 'Foo', description: 'd' },
			]);
			nodeCatalogService.getNodeSchema.mockResolvedValue(null);

			const req = { query: { q: 'foo' } } as unknown as Request<
				Record<string, string>,
				unknown,
				unknown,
				{ q?: string; hasCredential?: string }
			>;

			const result = await controller.search(req);

			expect(result.results).toEqual([
				expect.objectContaining({
					id: 'n8n-nodes-base.foo',
					nodeId: 'n8n-nodes-base.foo',
					displayName: 'Foo',
				}),
			]);
		});

		it('returns empty results without calling service when q is missing', async () => {
			const req = { query: {} } as unknown as Request<
				Record<string, string>,
				unknown,
				unknown,
				{ q?: string; hasCredential?: string }
			>;

			const result = await controller.search(req);

			expect(result).toEqual({ results: [] });
			expect(nodeCatalogService.searchNodesStructured).not.toHaveBeenCalled();
		});

		it('returns empty results without calling service when q is blank', async () => {
			const req = { query: { q: '   ' } } as unknown as Request<
				Record<string, string>,
				unknown,
				unknown,
				{ q?: string; hasCredential?: string }
			>;

			const result = await controller.search(req);

			expect(result).toEqual({ results: [] });
			expect(nodeCatalogService.searchNodesStructured).not.toHaveBeenCalled();
		});

		it('forwards hasCredential=true to the service', async () => {
			nodeCatalogService.searchNodesStructured.mockResolvedValue([]);

			const req = { query: { q: 'gmail', hasCredential: 'true' } } as unknown as Request<
				Record<string, string>,
				unknown,
				unknown,
				{ q?: string; hasCredential?: string }
			>;

			await controller.search(req);

			expect(nodeCatalogService.searchNodesStructured).toHaveBeenCalledWith(['gmail'], {
				hasCredential: true,
			});
		});
	});

	describe('getById', () => {
		it('returns the schema returned by NodeCatalogService', async () => {
			const schema = {
				nodeId: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				description: 'Slack node',
				credentials: [{ name: 'slackApi' }],
				operations: [
					{
						id: 'n8n-nodes-base.slack.message.send',
						resource: 'message',
						operation: 'send',
						displayName: 'Send',
						inputSchema: { type: 'object' as const, properties: {} },
					},
				],
			};
			nodeCatalogService.getNodeSchema.mockResolvedValue(schema);

			const req = { params: { id: 'n8n-nodes-base.slack' } } as unknown as Request<{
				id: string;
			}>;

			const result = await controller.getById(req);

			expect(result).toBe(schema);
			expect(nodeCatalogService.getNodeSchema).toHaveBeenCalledWith('n8n-nodes-base.slack');
		});

		it('decodes URL-encoded ids before looking up', async () => {
			nodeCatalogService.getNodeSchema.mockResolvedValue({
				nodeId: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'Agent',
				description: '',
				credentials: [],
				operations: [],
			});

			const req = { params: { id: '%40n8n%2Fn8n-nodes-langchain.agent' } } as unknown as Request<{
				id: string;
			}>;

			await controller.getById(req);

			expect(nodeCatalogService.getNodeSchema).toHaveBeenCalledWith(
				'@n8n/n8n-nodes-langchain.agent',
			);
		});

		it('throws NotFoundError when the service returns null', async () => {
			nodeCatalogService.getNodeSchema.mockResolvedValue(null);

			const req = { params: { id: 'n8n-nodes-base.unknown' } } as unknown as Request<{
				id: string;
			}>;

			await expect(controller.getById(req)).rejects.toBeInstanceOf(NotFoundError);
		});
	});

	describe('route metadata', () => {
		it('gates every route with tool:search scope', async () => {
			// Lazy import to avoid pulling Container metadata before mocks are in place.
			const { ControllerRegistryMetadata } = await import('@n8n/decorators');
			const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
				NodesController as never,
			);
			const routes = Array.from(metadata.routes.values());
			expect(routes.length).toBeGreaterThan(0);
			for (const route of routes) {
				expect(route.accessScope).toBeDefined();
				expect(route.accessScope?.scope).toBe('tool:search');
				expect(route.accessScope?.globalOnly).toBe(true);
			}
		});
	});

	// Silence unused-import lint when mock construction fails: keep mock() referenced.
	void mock;
});
