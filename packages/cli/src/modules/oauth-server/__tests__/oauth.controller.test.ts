import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type {
	ProtectedResource,
	ProtectedResourceRegistry,
} from '@/services/protected-resource.registry';
import type { UrlService } from '@/services/url.service';

import { OAuthServerService } from '../oauth-server.service';
import type { OAuthController as OAuthControllerClass } from '../oauth.controller';

// The controller module resolves `OAuthServerService` at import time, which
// constructs TypeORM repositories (needs a live DataSource). Register a mock for
// it before importing so the module loads without a database, then pull the class
// in via a dynamic import (static imports are hoisted above this setup).
let OAuthController: typeof OAuthControllerClass;

beforeAll(async () => {
	// The SDK's `clientRegistrationHandler` validates `clientsStore.registerClient`
	// when the module builds its routers, so the mock needs a real store.
	mockInstance(OAuthServerService, { clientsStore: mock<OAuthRegisteredClientsStore>() });
	({ OAuthController } = await import('../oauth.controller'));
});

const urlService = mock<UrlService>();
const registry = mock<ProtectedResourceRegistry>();
let controller: OAuthControllerClass;

const makeRes = () => {
	const res = mock<Response>();
	res.status.mockReturnValue(res); // status().json() / status().end() chains
	return res;
};

// Express 5 delivers wildcard params as an array of segments; the handler also
// tolerates a plain string. Only `params` is read, so a cast keeps the fixture small.
const makeReq = (resourcePath: string | string[]): Request =>
	({ params: { resourcePath } }) as unknown as Request;

const resource = (scopes: string[]): ProtectedResource => ({
	id: 'instance-mcp',
	getResourceUrl: () => 'https://n8n.test/mcp-server/http',
	getAudiences: () => ['https://n8n.test/mcp-server/http'],
	authorize: async () => true,
	scopes,
});

beforeEach(() => {
	vi.resetAllMocks();
	urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.test');
	controller = new OAuthController(urlService, registry);
});

describe('OAuthController', () => {
	describe('protectedResourceMetadata', () => {
		test('resolves the registry with the reconstructed leading-slash path', async () => {
			registry.getByResourcePath.mockResolvedValue(resource(['tool:listWorkflows']));

			await controller.protectedResourceMetadata(makeReq(['mcp-server', 'http']), makeRes());

			expect(registry.getByResourcePath).toHaveBeenCalledWith('/mcp-server/http');
		});

		test('reconstructs the path when the wildcard param is a string', async () => {
			registry.getByResourcePath.mockResolvedValue(resource(['tool:listWorkflows']));

			await controller.protectedResourceMetadata(makeReq('mcp-server/http'), makeRes());

			expect(registry.getByResourcePath).toHaveBeenCalledWith('/mcp-server/http');
		});

		test('preserves multi-segment per-workflow paths', async () => {
			registry.getByResourcePath.mockResolvedValue(resource(['tool:listWorkflows']));

			await controller.protectedResourceMetadata(makeReq(['mcp', 'wf-123', 'trigger']), makeRes());

			expect(registry.getByResourcePath).toHaveBeenCalledWith('/mcp/wf-123/trigger');
		});

		test('returns the RFC 9728 metadata document for a resolved resource', async () => {
			const scopes = ['tool:listWorkflows', 'tool:getWorkflowDetails'];
			registry.getByResourcePath.mockResolvedValue(resource(scopes));
			const res = makeRes();

			await controller.protectedResourceMetadata(makeReq(['mcp-server', 'http']), res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.status).not.toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({
				resource: 'https://n8n.test/mcp-server/http',
				bearer_methods_supported: ['header'],
				authorization_servers: ['https://n8n.test'],
				scopes_supported: scopes,
			});
		});

		test('omits scopes_supported when the resource advertises no scopes', async () => {
			registry.getByResourcePath.mockResolvedValue(resource([]));
			const res = makeRes();

			await controller.protectedResourceMetadata(makeReq(['mcp-server', 'http']), res);

			const body = res.json.mock.calls[0][0] as Record<string, unknown>;
			expect(body).not.toHaveProperty('scopes_supported');
		});

		test('responds 404 for an unknown resource', async () => {
			registry.getByResourcePath.mockResolvedValue(undefined);
			const res = makeRes();

			await controller.protectedResourceMetadata(makeReq(['nope']), res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Unknown protected resource' }),
			);
		});
	});

	describe('protectedResourceMetadataOptions', () => {
		test('returns 204 with CORS headers', () => {
			const res = makeRes();

			controller.protectedResourceMetadataOptions(makeReq(['mcp-server', 'http']), res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.end).toHaveBeenCalled();
		});
	});
});
