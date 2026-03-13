import type { ApiKeyScope } from '@n8n/permissions';

import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

// Mock middleware factories before any handler is loaded via require()
// The tagged wrapper must still have __apiKeyScope for introspection
const createMockMiddleware = (_req: unknown, _res: unknown, next: unknown) => (next as Function)();
jest.spyOn(middlewares, 'apiKeyHasScope').mockImplementation((scope: ApiKeyScope) => {
	return Object.assign(
		(req: unknown, res: unknown, next: unknown) => createMockMiddleware(req, res, next),
		{ __apiKeyScope: scope },
	) as middlewares.ScopeTaggedMiddleware;
});
jest
	.spyOn(middlewares, 'apiKeyHasScopeWithGlobalScopeFallback')
	.mockImplementation(
		(config: { scope: ApiKeyScope } | { apiKeyScope: ApiKeyScope; globalScope: unknown }) => {
			const scope = 'scope' in config ? config.scope : config.apiKeyScope;
			return Object.assign(
				(req: unknown, res: unknown, next: unknown) => createMockMiddleware(req, res, next),
				{ __apiKeyScope: scope },
			) as middlewares.ScopeTaggedMiddleware;
		},
	);

// Also mock other middleware that handlers import
jest.spyOn(middlewares, 'projectScope').mockReturnValue(createMockMiddleware as any);
jest.spyOn(middlewares, 'validCursor').mockReturnValue(createMockMiddleware as any);
jest.spyOn(middlewares, 'globalScope').mockReturnValue(createMockMiddleware as any);
jest.spyOn(middlewares, 'validLicenseWithUserQuota').mockReturnValue(createMockMiddleware as any);
jest.spyOn(middlewares, 'isLicensed').mockReturnValue(createMockMiddleware as any);

import { buildDiscoverResponse, resolveRefs, _resetCache } from '../discover.service';

beforeEach(() => {
	_resetCache();
});

describe('buildDiscoverResponse', () => {
	it('should return resources grouped by tag', async () => {
		const scopes: ApiKeyScope[] = ['tag:list', 'tag:create', 'workflow:read', 'workflow:list'];
		const result = await buildDiscoverResponse(scopes);

		expect(result.resources.tags).toBeDefined();
		expect(result.resources.workflow).toBeDefined();
	});

	it('should filter endpoints by caller scopes', async () => {
		const result = await buildDiscoverResponse(['tag:list'] as ApiKeyScope[]);

		expect(result.resources.tags).toBeDefined();
		expect(result.resources.tags.endpoints.some((e) => e.operationId === 'getTags')).toBe(true);

		// Should not include tag create endpoint (no tag:create scope)
		expect(result.resources.tags.endpoints.some((e) => e.operationId === 'createTag')).toBe(false);
	});

	it('should include null-scoped endpoints for any caller', async () => {
		const result = await buildDiscoverResponse([] as ApiKeyScope[]);

		// getCredentialType has no scope middleware - should always be visible
		const allEndpoints = Object.values(result.resources).flatMap((r) => r.endpoints);
		expect(allEndpoints.some((e) => e.operationId === 'getCredentialType')).toBe(true);
	});

	it('should include caller scopes in response', async () => {
		const scopes: ApiKeyScope[] = ['tag:list', 'workflow:read'];
		const result = await buildDiscoverResponse(scopes);

		expect(result.scopes).toEqual(scopes);
	});

	it('should include specUrl', async () => {
		const result = await buildDiscoverResponse([] as ApiKeyScope[]);

		expect(result.specUrl).toBe('/api/v1/openapi.yml');
	});

	it('should deduplicate operations within a resource', async () => {
		// workflow:read covers both getWorkflow and getWorkflowVersion
		const result = await buildDiscoverResponse(['workflow:read'] as ApiKeyScope[]);

		if (result.resources.workflow) {
			const readCount = result.resources.workflow.operations.filter((o) => o === 'read').length;
			expect(readCount).toBe(1);
		}
	});

	it('should include method, path, and operationId for each endpoint', async () => {
		const result = await buildDiscoverResponse(['tag:list'] as ApiKeyScope[]);

		const tagsEndpoint = result.resources.tags?.endpoints.find((e) => e.operationId === 'getTags');
		expect(tagsEndpoint).toEqual({
			method: 'GET',
			path: '/api/v1/tags',
			operationId: 'getTags',
		});
	});

	it('should not include workflow endpoints when caller has no workflow scopes', async () => {
		const result = await buildDiscoverResponse([] as ApiKeyScope[]);

		const workflowEndpoints = result.resources.workflow?.endpoints ?? [];
		// Only null-scoped workflow endpoints should appear (there are none)
		expect(workflowEndpoints.length).toBe(0);
	});

	it('should not include requestSchema by default', async () => {
		const result = await buildDiscoverResponse(['credential:create'] as ApiKeyScope[]);

		const allEndpoints = Object.values(result.resources).flatMap((r) => r.endpoints);
		const withSchema = allEndpoints.filter((e) => 'requestSchema' in e);
		expect(withSchema).toHaveLength(0);
	});

	it('should include requestSchema when includeSchemas is true', async () => {
		const result = await buildDiscoverResponse(['credential:create'] as ApiKeyScope[], {
			includeSchemas: true,
		});

		const createEndpoint = result.resources.credential?.endpoints.find(
			(e) => e.operationId === 'createCredential',
		);
		expect(createEndpoint).toBeDefined();
		expect(createEndpoint?.requestSchema).toBeDefined();
		expect(createEndpoint?.requestSchema).toHaveProperty('type');
	});

	it('should not include requestSchema on GET endpoints even with includeSchemas', async () => {
		const result = await buildDiscoverResponse(['tag:list'] as ApiKeyScope[], {
			includeSchemas: true,
		});

		const getEndpoint = result.resources.tags?.endpoints.find((e) => e.operationId === 'getTags');
		expect(getEndpoint).toBeDefined();
		expect(getEndpoint?.requestSchema).toBeUndefined();
	});

	it('should resolve nested $ref in schemas recursively', async () => {
		const result = await buildDiscoverResponse(['workflow:create'] as ApiKeyScope[], {
			includeSchemas: true,
		});

		const createEndpoint = result.resources.workflow?.endpoints.find(
			(e) => e.operationId === 'createWorkflow',
		);
		expect(createEndpoint).toBeDefined();
		expect(createEndpoint?.requestSchema).toBeDefined();

		// The workflow schema references nodes via $ref - verify it's resolved inline
		const properties = createEndpoint?.requestSchema?.properties;
		expect(properties).toBeDefined();
		if (isRecord(properties)) {
			const nodes = properties.nodes;
			// nodes should be resolved (array of node objects), not a dangling $ref
			expect(nodes).toBeDefined();
			if (isRecord(nodes)) {
				expect(nodes.$ref).toBeUndefined();
			}
		}
	});
});

describe('resolveRefs', () => {
	it('should return object as-is when no $ref present', () => {
		const schema = { type: 'string', example: 'hello' };
		const result = resolveRefs(schema, {});
		expect(result).toEqual(schema);
	});

	it('should resolve a top-level $ref', () => {
		const components = { foo: { type: 'object', properties: { name: { type: 'string' } } } };
		const result = resolveRefs({ $ref: '#/components/schemas/foo' }, components);
		expect(result).toEqual(components.foo);
	});

	it('should resolve nested $ref in properties', () => {
		const components = { bar: { type: 'string' } };
		const schema = { type: 'object', properties: { child: { $ref: '#/components/schemas/bar' } } };
		const result = resolveRefs(schema, components);
		expect(result.properties).toEqual({ child: { type: 'string' } });
	});

	it('should resolve $ref inside arrays', () => {
		const components = { item: { type: 'number' } };
		const schema = { items: [{ $ref: '#/components/schemas/item' }, { type: 'string' }] };
		const result = resolveRefs(schema, components);
		expect(result.items).toEqual([{ type: 'number' }, { type: 'string' }]);
	});

	it('should handle circular references without infinite loop', () => {
		const components: Record<string, unknown> = {};
		components.self = {
			type: 'object',
			properties: { child: { $ref: '#/components/schemas/self' } },
		};
		const result = resolveRefs({ $ref: '#/components/schemas/self' }, components);
		expect(result.type).toBe('object');
		const props = result.properties as Record<string, Record<string, unknown>>;
		expect(props.child.description).toContain('circular');
	});

	it('should return original object when $ref target not found in components', () => {
		const schema = { $ref: '#/components/schemas/missing' };
		const result = resolveRefs(schema, {});
		expect(result).toEqual(schema);
	});

	it('should preserve non-object, non-array values', () => {
		const schema = { type: 'string', maxLength: 100, required: true };
		const result = resolveRefs(schema, {});
		expect(result).toEqual(schema);
	});
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
