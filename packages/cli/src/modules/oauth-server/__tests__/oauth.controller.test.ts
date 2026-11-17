import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { PathResolvingService, UrlService } from '@n8n/backend-services';
import type { AuthenticationService } from '@n8n/inbound-auth';
import type { ProtectedResource, ProtectedResourceRegistry } from '@n8n/backend-services/auth';

import type { OAuthServerLocalAuthorizationServer } from '../oauth-local-authorization-server';
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
	({ OAuthController } = await import('../oauth.controller.js'));
});

const urlService = mock<UrlService>();
const registry = mock<ProtectedResourceRegistry>();
const localServer = mock<OAuthServerLocalAuthorizationServer>();
const authenticationService = mock<AuthenticationService>();
const pathResolvingService = mock<PathResolvingService>();
let controller: OAuthControllerClass;

const makeRes = () => {
	const res = mock<Response>();
	res.status.mockReturnValue(res); // status().json() / status().end() chains
	return res;
};

// Express 5 delivers wildcard params as an array of segments; the handler also
// tolerates a plain string. Only `params` and `originalUrl` are read, so a cast keeps
// the fixture small.
const makeReq = (resourcePath: string | string[], originalUrl?: string): Request =>
	({ params: { resourcePath }, originalUrl }) as unknown as Request;

const resource = (scopes: string[], isAvailable?: () => Promise<boolean>): ProtectedResource => ({
	surface: 'instance-mcp',
	id: 'instance-mcp',
	getResourceUrl: () => 'https://n8n.test/mcp-server/http',
	getAudiences: () => ['https://n8n.test/mcp-server/http'],
	authorize: async () => true,
	isAvailable,
	scopes,
});

const publicApiResource: ProtectedResource = {
	surface: 'public-api',
	id: 'public-api',
	getResourceUrl: () => 'https://n8n.test/api/v1',
	getAudiences: () => ['https://n8n.test/api/v1'],
	authorize: async () => true,
	scopes: [],
};

beforeEach(() => {
	vi.resetAllMocks();
	urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.test');
	authenticationService.advertise.mockResolvedValue({
		authorizationServers: ['https://n8n.test'],
		challenges: [],
	});
	pathResolvingService.getBasePath.mockReturnValue('/');
	controller = new OAuthController(
		urlService,
		registry,
		localServer,
		authenticationService,
		pathResolvingService,
	);
});

describe('OAuthController', () => {
	describe('metadata', () => {
		test("returns the local authorization server's document with CORS headers", async () => {
			const document = { issuer: 'https://n8n.test', jwks_uri: 'https://n8n.test/jwks' };
			localServer.getMetadata.mockResolvedValue(document);
			const res = makeRes();

			await controller.metadata(makeReq([]), res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.json).toHaveBeenCalledWith(document);
		});
	});

	describe('pathInsertedMetadata', () => {
		const makeIssuerReq = (issuerPath: string[]): Request =>
			({ params: { issuerPath } }) as unknown as Request;

		test('returns the metadata when the path matches the issuer path', async () => {
			const document = { issuer: 'https://n8n.test/n8n', jwks_uri: 'https://n8n.test/n8n/jwks' };
			localServer.getMetadata.mockResolvedValue(document);
			const res = makeRes();

			await controller.pathInsertedMetadata(makeIssuerReq(['n8n']), res);

			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(res.json).toHaveBeenCalledWith(document);
			expect(res.status).not.toHaveBeenCalled();
		});

		test('accepts a single terminating slash on the issuer path', async () => {
			const document = { issuer: 'https://n8n.test/n8n', jwks_uri: 'https://n8n.test/n8n/jwks' };
			localServer.getMetadata.mockResolvedValue(document);
			const res = makeRes();

			await controller.pathInsertedMetadata(makeIssuerReq(['n8n', '']), res);

			expect(res.json).toHaveBeenCalledWith(document);
			expect(res.status).not.toHaveBeenCalled();
		});

		test('returns a JSON 404 for an issuer path with several terminating slashes', async () => {
			localServer.getMetadata.mockResolvedValue({
				issuer: 'https://n8n.test/n8n',
				jwks_uri: 'https://n8n.test/n8n/jwks',
			});
			const res = makeRes();

			await controller.pathInsertedMetadata(makeIssuerReq(['n8n', '', '', '']), res);

			expect(res.status).toHaveBeenCalledWith(404);
		});

		test('returns a JSON 404 for any other issuer path', async () => {
			localServer.getMetadata.mockResolvedValue({
				issuer: 'https://n8n.test',
				jwks_uri: 'https://n8n.test/jwks',
			});
			const res = makeRes();

			await controller.pathInsertedMetadata(makeIssuerReq(['mcp', 'some-trigger']), res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ message: 'Unknown authorization server' });
		});
	});

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

		test('forwards the raw query component, which the wildcard param drops', async () => {
			// some resources select on a query (e.g. a webhook trigger's `?method=`)
			registry.getByResourcePath.mockResolvedValue(resource([]));

			await controller.protectedResourceMetadata(
				makeReq(
					['webhook', 'orders'],
					'/.well-known/oauth-protected-resource/webhook/orders?method=GET',
				),
				makeRes(),
			);

			expect(registry.getByResourcePath).toHaveBeenCalledWith('/webhook/orders?method=GET');
		});

		describe('under a base path', () => {
			beforeEach(() => {
				pathResolvingService.getBasePath.mockReturnValue('/n8n');
			});

			test('resolves a static resource by its full path first', async () => {
				registry.getByResourcePath.mockResolvedValue(resource([]));

				await controller.protectedResourceMetadata(
					makeReq(['n8n', 'mcp-server', 'http']),
					makeRes(),
				);

				expect(registry.getByResourcePath).toHaveBeenCalledTimes(1);
				expect(registry.getByResourcePath).toHaveBeenCalledWith('/n8n/mcp-server/http');
			});

			test('retries a miss with the path relative to the base path', async () => {
				const trigger = { ...resource([]), surface: 'trigger' as const };
				registry.getByResourcePath.mockResolvedValueOnce(undefined).mockResolvedValueOnce(trigger);
				const res = makeRes();

				await controller.protectedResourceMetadata(
					makeReq(
						['n8n', 'webhook', 'orders'],
						'/n8n/.well-known/oauth-protected-resource/n8n/webhook/orders?method=GET',
					),
					res,
				);

				expect(registry.getByResourcePath).toHaveBeenNthCalledWith(
					1,
					'/n8n/webhook/orders?method=GET',
				);
				expect(registry.getByResourcePath).toHaveBeenNthCalledWith(2, '/webhook/orders?method=GET');
				expect(res.json).toHaveBeenCalledWith(
					expect.objectContaining({ resource: 'https://n8n.test/mcp-server/http' }),
				);
			});

			test.each(['n8nx/webhook/orders', 'webhook/orders'])(
				'does not retry %s, which is outside the base path',
				async (path) => {
					registry.getByResourcePath.mockResolvedValue(undefined);
					const res = makeRes();

					await controller.protectedResourceMetadata(makeReq(path), res);

					expect(registry.getByResourcePath).toHaveBeenCalledTimes(1);
					expect(res.status).toHaveBeenCalledWith(404);
				},
			);
		});

		test('returns the RFC 9728 metadata document for a surface outside the pipeline', async () => {
			const scopes = ['tool:listWorkflows', 'tool:getWorkflowDetails'];
			registry.getByResourcePath.mockResolvedValue({ ...resource(scopes), surface: 'trigger' });
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
			expect(authenticationService.advertise).not.toHaveBeenCalled();
		});

		test('lists the issuers of the trusted sources accepted on the instance-mcp surface', async () => {
			registry.getByResourcePath.mockResolvedValue(resource(['tool:listWorkflows']));
			authenticationService.advertise.mockResolvedValue({
				authorizationServers: ['https://n8n.test', 'https://idp.example'],
				challenges: [],
			});
			const res = makeRes();

			await controller.protectedResourceMetadata(makeReq(['mcp-server', 'http']), res);

			expect(authenticationService.advertise).toHaveBeenCalledWith({
				surface: 'instance-mcp',
				resource: {
					url: 'https://n8n.test/mcp-server/http',
					acceptedAudiences: ['https://n8n.test/mcp-server/http'],
				},
			});
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					authorization_servers: ['https://n8n.test', 'https://idp.example'],
				}),
			);
		});

		test('lists the issuers of the trusted sources accepted on the public-api surface', async () => {
			registry.getByResourcePath.mockResolvedValue(publicApiResource);
			authenticationService.advertise.mockResolvedValue({
				authorizationServers: ['https://n8n.test', 'https://idp.example'],
				challenges: [],
			});
			const res = makeRes();

			await controller.protectedResourceMetadata(makeReq(['api', 'v1']), res);

			expect(authenticationService.advertise).toHaveBeenCalledWith(
				expect.objectContaining({
					surface: 'public-api',
					resource: {
						url: 'https://n8n.test/api/v1',
						acceptedAudiences: ['https://n8n.test/api/v1'],
					},
				}),
			);
			expect(res.json).toHaveBeenCalledWith({
				resource: 'https://n8n.test/api/v1',
				bearer_methods_supported: ['header'],
				authorization_servers: ['https://n8n.test', 'https://idp.example'],
			});
		});

		test('lists only the issuer of the source a trigger accepts', async () => {
			const trigger: ProtectedResource = {
				...resource([]),
				surface: 'trigger',
				getResourceUrl: () => 'https://n8n.test/webhook/orders?method=POST',
				getAudiences: () => ['https://n8n.test/webhook/orders?method=POST'],
				getAcceptedSourceIds: () => ['idp-1'],
			};
			registry.getByResourcePath.mockResolvedValue(trigger);
			authenticationService.advertise.mockResolvedValue({
				authorizationServers: ['https://idp.example'],
				challenges: [],
			});
			const res = makeRes();

			await controller.protectedResourceMetadata(makeReq(['webhook', 'orders']), res);

			expect(authenticationService.advertise).toHaveBeenCalledWith({
				surface: 'trigger',
				resource: {
					url: 'https://n8n.test/webhook/orders?method=POST',
					acceptedAudiences: ['https://n8n.test/webhook/orders?method=POST'],
				},
				acceptedSourceIds: ['idp-1'],
			});
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ authorization_servers: ['https://idp.example'] }),
			);
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

		test('responds 404 for a resource that is currently unavailable', async () => {
			registry.getByResourcePath.mockResolvedValue(resource([], async () => false));
			const res = makeRes();

			await controller.protectedResourceMetadata(makeReq(['mcp-server', 'http']), res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Unknown protected resource' }),
			);
		});
	});

	describe('defaultProtectedResourceMetadata', () => {
		test('returns the metadata document of the default resource', async () => {
			registry.getDefaultResource.mockReturnValue(resource([], async () => true));
			const res = makeRes();

			await controller.defaultProtectedResourceMetadata(makeReq([]), res);

			expect(res.status).not.toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ resource: 'https://n8n.test/mcp-server/http' }),
			);
		});

		test('responds 404 when the default resource is currently unavailable', async () => {
			registry.getDefaultResource.mockReturnValue(resource([], async () => false));
			const res = makeRes();

			await controller.defaultProtectedResourceMetadata(makeReq([]), res);

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
