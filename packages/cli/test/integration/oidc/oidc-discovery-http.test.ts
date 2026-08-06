import type { Logger } from '@n8n/backend-common';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import { type LocalServer, startServer } from '@n8n/backend-network/testing';
import { mock } from 'vitest-mock-extended';
import * as client from 'openid-client';

describe('OIDC discovery (real HTTP round-trip through the factory)', () => {
	let idpServer: LocalServer;

	const buildCustomFetch = () => {
		const outboundHttp = new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>());
		return outboundHttp
			.transport({ ssrf: 'disabled' })
			.asCustomFetch() as unknown as client.CustomFetch;
	};

	const discoveryDocument = (origin: string) => ({
		issuer: origin,
		authorization_endpoint: `${origin}/auth`,
		token_endpoint: `${origin}/token`,
		userinfo_endpoint: `${origin}/userinfo`,
		jwks_uri: `${origin}/jwks`,
		response_types_supported: ['code'],
		subject_types_supported: ['public'],
		id_token_signing_alg_values_supported: ['RS256'],
	});

	beforeAll(async () => {
		idpServer = await startServer((_req, res) => {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(discoveryDocument(idpServer.url)));
		});
	});

	afterAll(async () => await idpServer.close());

	beforeEach(() => idpServer.clear());

	it('fetches and parses the discovery document over a real socket', async () => {
		const customFetch = buildCustomFetch();

		const configuration = await client.discovery(
			new URL(`${idpServer.url}/.well-known/openid-configuration`),
			'real-client',
			'real-secret',
			undefined,
			{
				execute: [client.allowInsecureRequests],
				[client.customFetch]: customFetch,
			},
		);

		// The request actually went out over the wire ...
		expect(idpServer.captured).toEqual(['/.well-known/openid-configuration']);
		// ... and openid-client parsed the served metadata into a Configuration.
		expect(configuration.serverMetadata().issuer).toBe(idpServer.url);
		expect(configuration.serverMetadata().token_endpoint).toBe(`${idpServer.url}/token`);
	});

	it('reuses the same customFetch on the configuration for subsequent real requests', async () => {
		const customFetch = buildCustomFetch();

		const configuration = await client.discovery(
			new URL(`${idpServer.url}/.well-known/openid-configuration`),
			'real-client',
			'real-secret',
			undefined,
			{
				execute: [client.allowInsecureRequests],
				[client.customFetch]: customFetch,
			},
		);
		// The service sets the same fetch on the returned configuration so that
		// token-exchange / userinfo route through the factory too.
		configuration[client.customFetch] = customFetch;
		idpServer.clear();

		// Drive that carried fetch directly against a real endpoint.
		const response = await configuration[client.customFetch](`${idpServer.url}/token`, {
			method: 'GET',
			headers: {},
			body: null,
			redirect: 'manual',
		});

		expect(response.status).toBe(200);
		expect(idpServer.captured).toEqual(['/token']);
	});
});
