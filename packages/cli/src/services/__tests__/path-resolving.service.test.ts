import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { PathResolvingService } from '../path-resolving.service';

describe('PathResolvingService', () => {
	const createService = (config: Partial<GlobalConfig> = {}) => {
		const globalConfig = mock<GlobalConfig>({
			basePath: config.basePath ?? '',
			path: config.path ?? '/',
			endpoints: {
				rest: config.endpoints?.rest ?? 'rest',
				webhook: config.endpoints?.webhook ?? 'webhook',
				webhookTest: config.endpoints?.webhookTest ?? 'webhook-test',
				webhookWaiting: config.endpoints?.webhookWaiting ?? 'webhook-waiting',
				form: config.endpoints?.form ?? 'form',
				formTest: config.endpoints?.formTest ?? 'form-test',
				formWaiting: config.endpoints?.formWaiting ?? 'form-waiting',
				mcp: config.endpoints?.mcp ?? 'mcp',
				mcpTest: config.endpoints?.mcpTest ?? 'mcp-test',
				...config.endpoints,
			},
			publicApi: {
				path: config.publicApi?.path ?? 'api',
				...config.publicApi,
			},
			...config,
		});
		return new PathResolvingService(globalConfig);
	};

	describe('getBasePath', () => {
		it('should return "/" for default configuration', () => {
			const service = createService();
			expect(service.getBasePath()).toBe('/');
		});

		it('should return normalized basePath when N8N_BASE_PATH is set', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.getBasePath()).toBe('/custom-path');
		});

		it('should return normalized path when N8N_PATH is set', () => {
			const service = createService({ path: '/app' });
			expect(service.getBasePath()).toBe('/app');
		});

		it('should combine basePath and path', () => {
			const service = createService({ basePath: '/prefix', path: '/app' });
			expect(service.getBasePath()).toBe('/prefix/app');
		});

		it('should normalize paths with trailing slashes', () => {
			const service = createService({ basePath: '/prefix/', path: '/app/' });
			expect(service.getBasePath()).toBe('/prefix/app');
		});

		it('should normalize paths without leading slashes', () => {
			const service = createService({ basePath: 'prefix', path: 'app' });
			expect(service.getBasePath()).toBe('/prefix/app');
		});
	});

	describe('resolveEndpoint', () => {
		it('should resolve endpoint with default base path', () => {
			const service = createService();
			expect(service.resolveEndpoint('healthz')).toBe('/healthz');
		});

		it('should resolve endpoint with custom base path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveEndpoint('healthz')).toBe('/custom-path/healthz');
		});

		it('should handle endpoint with leading slash', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveEndpoint('/healthz')).toBe('/custom-path/healthz');
		});

		it('should handle empty endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveEndpoint('')).toBe('/custom-path');
		});

		it('should handle nested endpoints', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveEndpoint('api/v1/users')).toBe('/custom-path/api/v1/users');
		});
	});

	describe('resolveRestEndpoint', () => {
		it('should resolve REST endpoint with default configuration', () => {
			const service = createService();
			expect(service.resolveRestEndpoint('workflows')).toBe('/rest/workflows');
		});

		it('should resolve REST endpoint with custom base path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveRestEndpoint('workflows')).toBe('/custom-path/rest/workflows');
		});

		it('should handle path with leading slash', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveRestEndpoint('/workflows')).toBe('/custom-path/rest/workflows');
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveRestEndpoint('')).toBe('/custom-path/rest');
		});

		it('should use custom REST endpoint from config', () => {
			const service = createService({
				basePath: '/custom-path',
				endpoints: { rest: 'api' } as GlobalConfig['endpoints'],
			});
			expect(service.resolveRestEndpoint('workflows')).toBe('/custom-path/api/workflows');
		});
	});

	describe('resolveWebhookEndpoint', () => {
		it('should resolve webhook endpoint with default configuration', () => {
			const service = createService();
			expect(service.resolveWebhookEndpoint('my-webhook')).toBe('/webhook/my-webhook');
		});

		it('should resolve webhook endpoint with custom base path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveWebhookEndpoint('my-webhook')).toBe('/custom-path/webhook/my-webhook');
		});

		it('should handle path with leading slash', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveWebhookEndpoint('/my-webhook')).toBe('/custom-path/webhook/my-webhook');
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveWebhookEndpoint('')).toBe('/custom-path/webhook');
		});
	});

	describe('resolveFormEndpoint', () => {
		it('should resolve form endpoint with default configuration', () => {
			const service = createService();
			expect(service.resolveFormEndpoint('my-form')).toBe('/form/my-form');
		});

		it('should resolve form endpoint with custom base path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveFormEndpoint('my-form')).toBe('/custom-path/form/my-form');
		});

		it('should handle path with leading slash', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveFormEndpoint('/my-form')).toBe('/custom-path/form/my-form');
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveFormEndpoint('')).toBe('/custom-path/form');
		});
	});

	describe('resolveWebhookTestEndpoint', () => {
		it('should resolve webhook test endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveWebhookTestEndpoint('my-webhook')).toBe(
				'/custom-path/webhook-test/my-webhook',
			);
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveWebhookTestEndpoint()).toBe('/custom-path/webhook-test');
		});
	});

	describe('resolveWebhookWaitingEndpoint', () => {
		it('should resolve webhook waiting endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveWebhookWaitingEndpoint('path')).toBe(
				'/custom-path/webhook-waiting/path',
			);
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveWebhookWaitingEndpoint()).toBe('/custom-path/webhook-waiting');
		});
	});

	describe('resolveFormTestEndpoint', () => {
		it('should resolve form test endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveFormTestEndpoint('my-form')).toBe('/custom-path/form-test/my-form');
		});
	});

	describe('resolveFormWaitingEndpoint', () => {
		it('should resolve form waiting endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveFormWaitingEndpoint('path')).toBe('/custom-path/form-waiting/path');
		});
	});

	describe('resolveMcpEndpoint', () => {
		it('should resolve MCP endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveMcpEndpoint('path')).toBe('/custom-path/mcp/path');
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveMcpEndpoint()).toBe('/custom-path/mcp');
		});
	});

	describe('resolveMcpTestEndpoint', () => {
		it('should resolve MCP test endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveMcpTestEndpoint('path')).toBe('/custom-path/mcp-test/path');
		});
	});

	describe('resolvePublicApiEndpoint', () => {
		it('should resolve public API endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolvePublicApiEndpoint('v1/workflows')).toBe(
				'/custom-path/api/v1/workflows',
			);
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolvePublicApiEndpoint()).toBe('/custom-path/api');
		});
	});

	describe('resolveIconsEndpoint', () => {
		it('should resolve icons endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveIconsEndpoint('n8n-nodes-base/icon.svg')).toBe(
				'/custom-path/icons/n8n-nodes-base/icon.svg',
			);
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveIconsEndpoint()).toBe('/custom-path/icons');
		});
	});

	describe('resolveTypesEndpoint', () => {
		it('should resolve types endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveTypesEndpoint('nodes.json')).toBe('/custom-path/types/nodes.json');
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveTypesEndpoint()).toBe('/custom-path/types');
		});
	});

	describe('resolveSchemasEndpoint', () => {
		it('should resolve schemas endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveSchemasEndpoint('node/1.0/resource.json')).toBe(
				'/custom-path/schemas/node/1.0/resource.json',
			);
		});

		it('should handle empty path', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveSchemasEndpoint()).toBe('/custom-path/schemas');
		});
	});

	describe('resolveHealthzEndpoint', () => {
		it('should resolve healthz endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveHealthzEndpoint()).toBe('/custom-path/healthz');
		});

		it('should resolve healthz readiness endpoint', () => {
			const service = createService({ basePath: '/custom-path' });
			expect(service.resolveHealthzEndpoint('readiness')).toBe('/custom-path/healthz/readiness');
		});
	});

	describe('real-world scenarios', () => {
		it('should handle typical n8n deployment under subpath', () => {
			const service = createService({ basePath: '/n8n' });

			expect(service.getBasePath()).toBe('/n8n');
			expect(service.resolveEndpoint('healthz')).toBe('/n8n/healthz');
			expect(service.resolveRestEndpoint('workflows')).toBe('/n8n/rest/workflows');
			expect(service.resolveWebhookEndpoint('abc123')).toBe('/n8n/webhook/abc123');
		});

		it('should handle deployment with both basePath and path', () => {
			const service = createService({ basePath: '/apps', path: '/n8n' });

			expect(service.getBasePath()).toBe('/apps/n8n');
			expect(service.resolveEndpoint('healthz')).toBe('/apps/n8n/healthz');
			expect(service.resolveRestEndpoint('workflows')).toBe('/apps/n8n/rest/workflows');
		});

		it('should handle root deployment', () => {
			const service = createService({ basePath: '', path: '/' });

			expect(service.getBasePath()).toBe('/');
			expect(service.resolveEndpoint('healthz')).toBe('/healthz');
			expect(service.resolveRestEndpoint('workflows')).toBe('/rest/workflows');
		});
	});
});
