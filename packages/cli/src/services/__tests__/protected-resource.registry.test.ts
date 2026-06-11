import type { ProtectedResource, ProtectedResourceResolver } from '../protected-resource.registry';
import { ProtectedResourceRegistry } from '../protected-resource.registry';

const resourceA: ProtectedResource = {
	id: 'instance-mcp',
	getResourceUrl: () => 'https://n8n.example.com/mcp-server/http',
	getAudiences: () => ['https://n8n.example.com/mcp-server/http', 'mcp-server-api'],
	scopes: ['tool:listWorkflows', 'tool:getWorkflowDetails'],
	isDefault: true,
};

const resourceB: ProtectedResource = {
	id: 'workflow-trigger',
	getResourceUrl: () => 'https://n8n.example.com/webhook/wf-1/mcp',
	getAudiences: () => ['https://n8n.example.com/webhook/wf-1/mcp'],
	scopes: ['tool:listWorkflows', 'workflow:execute'],
};

describe('ProtectedResourceRegistry', () => {
	let registry: ProtectedResourceRegistry;

	beforeEach(() => {
		registry = new ProtectedResourceRegistry();
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
			expect(
				await registry.getByResourceUrl('https://evil.example.com/mcp-server/http'),
			).toBeUndefined();
		});

		it('should resolve resources by URL path', async () => {
			expect(await registry.getByResourcePath('/mcp-server/http')).toBe(resourceA);
			expect(await registry.getByResourcePath('/webhook/wf-1/mcp')).toBe(resourceB);
			expect(await registry.getByResourcePath('/unknown')).toBeUndefined();
		});

		it('should resolve the default resource', () => {
			expect(registry.getDefaultResource()).toBe(resourceA);
		});

		it('should return undefined as default when no resource is marked default', () => {
			const emptyDefault = new ProtectedResourceRegistry();
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

	describe('isAnyResourceEnabled', () => {
		it('should return false when no resources are registered', async () => {
			expect(await new ProtectedResourceRegistry().isAnyResourceEnabled()).toBe(false);
		});

		it('should treat resources without an isEnabled hook as enabled', async () => {
			expect(await registry.isAnyResourceEnabled()).toBe(true);
		});

		it('should return false when every resource reports disabled', async () => {
			const gated = new ProtectedResourceRegistry();
			gated.register({ ...resourceA, isEnabled: async () => false });
			gated.register({ ...resourceB, isEnabled: async () => false });
			expect(await gated.isAnyResourceEnabled()).toBe(false);
		});

		it('should return true when at least one resource reports enabled', async () => {
			const gated = new ProtectedResourceRegistry();
			gated.register({ ...resourceA, isEnabled: async () => false });
			gated.register({ ...resourceB, isEnabled: async () => true });
			expect(await gated.isAnyResourceEnabled()).toBe(true);
		});
	});

	describe('resolvers', () => {
		// A resource reachable only through a resolver — its URL/path is absent
		// from the static map registered in beforeEach.
		const resolvedResource: ProtectedResource = {
			id: 'resolved-trigger',
			getResourceUrl: () => 'https://n8n.example.com/webhook/wf-9/mcp',
			getAudiences: () => ['https://n8n.example.com/webhook/wf-9/mcp'],
			scopes: ['workflow:execute'],
		};

		const makeResolver = (): jest.Mocked<ProtectedResourceResolver> => ({
			id: 'db-resolver',
			// Overlaps a static scope and adds a resolver-only one.
			scopes: ['tool:listWorkflows', 'tool:resolvedOnly'],
			resolveByUrl: jest.fn().mockResolvedValue(undefined),
			resolveByPath: jest.fn().mockResolvedValue(undefined),
			hasAnyEnabledResource: jest.fn().mockResolvedValue(false),
		});

		it('should not consult resolvers when the static map matches by URL', async () => {
			const resolver = makeResolver();
			registry.registerResolver(resolver);

			expect(await registry.getByResourceUrl('https://n8n.example.com/mcp-server/http')).toBe(
				resourceA,
			);
			expect(resolver.resolveByUrl).not.toHaveBeenCalled();
		});

		it('should not consult resolvers when the static map matches by path', async () => {
			const resolver = makeResolver();
			registry.registerResolver(resolver);

			expect(await registry.getByResourcePath('/mcp-server/http')).toBe(resourceA);
			expect(resolver.resolveByPath).not.toHaveBeenCalled();
		});

		it('should consult the resolver on a static URL miss and return its result', async () => {
			const resolver = makeResolver();
			resolver.resolveByUrl.mockResolvedValue(resolvedResource);
			registry.registerResolver(resolver);

			expect(await registry.getByResourceUrl('https://n8n.example.com/webhook/wf-9/mcp')).toBe(
				resolvedResource,
			);
			expect(resolver.resolveByUrl).toHaveBeenCalledWith(
				'https://n8n.example.com/webhook/wf-9/mcp',
			);
		});

		it('should pass the resolver the trailing-slash-trimmed URL', async () => {
			const resolver = makeResolver();
			resolver.resolveByUrl.mockResolvedValue(resolvedResource);
			registry.registerResolver(resolver);

			expect(await registry.getByResourceUrl('https://n8n.example.com/webhook/wf-9/mcp/')).toBe(
				resolvedResource,
			);
			expect(resolver.resolveByUrl).toHaveBeenCalledWith(
				'https://n8n.example.com/webhook/wf-9/mcp',
			);
		});

		it('should consult the resolver on a static path miss and return its result', async () => {
			const resolver = makeResolver();
			resolver.resolveByPath.mockResolvedValue(resolvedResource);
			registry.registerResolver(resolver);

			expect(await registry.getByResourcePath('/webhook/wf-9/mcp')).toBe(resolvedResource);
			expect(resolver.resolveByPath).toHaveBeenCalledWith('/webhook/wf-9/mcp');
		});

		it('should union resolver scopes into getAllScopes, deduplicated', () => {
			registry.registerResolver(makeResolver());

			expect(registry.getAllScopes()).toEqual([
				'tool:listWorkflows',
				'tool:getWorkflowDetails',
				'workflow:execute',
				'tool:resolvedOnly',
			]);
		});

		it('should report enabled when only a resolver has an enabled resource', async () => {
			const gated = new ProtectedResourceRegistry();
			gated.register({ ...resourceA, isEnabled: async () => false });
			const resolver = makeResolver();
			resolver.hasAnyEnabledResource.mockResolvedValue(true);
			gated.registerResolver(resolver);

			expect(await gated.isAnyResourceEnabled()).toBe(true);
		});
	});
});
