import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { ProtectedResource, ProtectedResourceResolver } from '../protected-resource.registry';
import { ProtectedResourceRegistry } from '../protected-resource.registry';

const resourceA: ProtectedResource = {
	id: 'instance-mcp',
	getResourceUrl: () => 'https://n8n.example.com/mcp-server/http',
	getAudiences: () => ['https://n8n.example.com/mcp-server/http', 'mcp-server-api'],
	scopes: ['tool:listWorkflows', 'tool:getWorkflowDetails'],
	authorize: async () => true,
	isDefault: true,
	acceptsHostAliases: true,
};

const resourceB: ProtectedResource = {
	id: 'workflow-trigger',
	getResourceUrl: () => 'https://n8n.example.com/webhook/wf-1/mcp',
	getAudiences: () => ['https://n8n.example.com/webhook/wf-1/mcp'],
	authorize: async () => true,
	scopes: ['tool:listWorkflows', 'workflow:execute'],
};

describe('ProtectedResourceRegistry', () => {
	let registry: ProtectedResourceRegistry;

	beforeEach(() => {
		registry = new ProtectedResourceRegistry(mock<Logger>());
		registry.register(resourceA);
		registry.register(resourceB);
	});

	describe('lookups', () => {
		it('should resolve resources by id', () => {
			expect(registry.getById('instance-mcp')).toBe(resourceA);
			expect(registry.getById('workflow-trigger')).toBe(resourceB);
			expect(registry.getById('unknown')).toBeUndefined();
		});

		it('should resolve resources by resource URL, ignoring trailing slashes', async () => {
			expect(await registry.getByResourceUrl('https://n8n.example.com/mcp-server/http')).toBe(
				resourceA,
			);
			expect(await registry.getByResourceUrl('https://n8n.example.com/mcp-server/http/')).toBe(
				resourceA,
			);
			expect(await registry.getByResourceUrl('https://n8n.example.com/webhook/wf-1/mcp')).toBe(
				resourceB,
			);
		});

		it('should resolve alias-accepting resources served at other hostnames by URL path', async () => {
			// Split-hostname deployments: the client-facing hostname differs from the
			// configured base URL but routes to the same backend.
			expect(await registry.getByResourceUrl('https://n8n-mcp.example.com/mcp-server/http')).toBe(
				resourceA,
			);
			expect(await registry.getByResourceUrl('http://localhost:5678/mcp-server/http/')).toBe(
				resourceA,
			);
		});

		it('should not match other hostnames for resources that do not accept aliases', async () => {
			expect(
				await registry.getByResourceUrl('https://n8n-mcp.example.com/webhook/wf-1/mcp'),
			).toBeUndefined();
		});

		it('should not resolve resource URLs with an unknown path', async () => {
			expect(
				await registry.getByResourceUrl('https://n8n.example.com/mcp-server/http/../admin'),
			).toBeUndefined();
			expect(
				await registry.getByResourceUrl('https://n8n.example.com/unknown/path'),
			).toBeUndefined();
			expect(await registry.getByResourceUrl('not-a-url')).toBeUndefined();
		});

		it('should resolve resources by URL path', async () => {
			expect(await registry.getByResourcePath('/mcp-server/http')).toBe(resourceA);
			expect(await registry.getByResourcePath('/webhook/wf-1/mcp')).toBe(resourceB);
			expect(await registry.getByResourcePath('/unknown')).toBeUndefined();
		});

		it('should not consult resolvers when matching alias-host resource URLs by path', async () => {
			const resolverRegistry = new ProtectedResourceRegistry(mock<Logger>());
			const resolver = mock<ProtectedResourceResolver>({ id: 'workflow-trigger', scopes: [] });
			resolver.resolveByUrl.mockResolvedValue(undefined); // resolver only matches its own origin
			resolver.resolveByPath.mockResolvedValue(resourceB);
			resolverRegistry.registerResolver(resolver);

			expect(
				await resolverRegistry.getByResourceUrl('https://alias.example.com/webhook/wf-1/mcp'),
			).toBeUndefined();
			expect(resolver.resolveByPath).not.toHaveBeenCalled();
		});

		it('should resolve the default resource', () => {
			expect(registry.getDefaultResource()).toBe(resourceA);
		});

		it('should return undefined as default when no resource is marked default', () => {
			const emptyDefault = new ProtectedResourceRegistry(mock<Logger>());
			emptyDefault.register(resourceB);
			expect(emptyDefault.getDefaultResource()).toBeUndefined();
		});

		it('should replace a resource registered with the same id', () => {
			const replacement: ProtectedResource = { ...resourceA, scopes: [] };
			registry.register(replacement);
			expect(registry.getById('instance-mcp')).toBe(replacement);
			expect(registry.getAll()).toHaveLength(2);
		});
	});

	describe('audiences and scopes for multiple resources', () => {
		it('should union audiences across all registered resources, deduplicated', () => {
			expect(registry.getAllAudiences()).toEqual([
				'https://n8n.example.com/mcp-server/http',
				'mcp-server-api',
				'https://n8n.example.com/webhook/wf-1/mcp',
			]);
		});

		it('should keep per-resource audiences isolated', async () => {
			// The legacy audience belongs to the instance resource only — resolving
			// audiences through a specific resource must not leak it to others.
			expect((await registry.getByResourceUrl(resourceB.getResourceUrl()))?.getAudiences()).toEqual(
				['https://n8n.example.com/webhook/wf-1/mcp'],
			);
		});

		it('should union scopes across all registered resources, deduplicated', () => {
			expect(registry.getAllScopes()).toEqual([
				'tool:listWorkflows',
				'tool:getWorkflowDetails',
				'workflow:execute',
			]);
		});
	});

	describe('resolver failures', () => {
		it('should treat a throwing resolver as a non-match and log a warning', async () => {
			const logger = mock<Logger>();
			const failingRegistry = new ProtectedResourceRegistry(logger);
			const resolver = mock<ProtectedResourceResolver>({ id: 'boom', scopes: [] });
			resolver.resolveByUrl.mockRejectedValue(new Error('backing store unavailable'));
			resolver.resolveByPath.mockRejectedValue(new Error('backing store unavailable'));
			failingRegistry.registerResolver(resolver);

			expect(await failingRegistry.getByResourceUrl('https://n8n.example.com/x')).toBeUndefined();
			expect(await failingRegistry.getByResourcePath('/x')).toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'Protected resource resolver "boom" failed to resolve',
				{ error: 'backing store unavailable' },
			);
		});
	});
});
