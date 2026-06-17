import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import { type LocalServer, startServer } from '@n8n/backend-network/testing';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { IncomingHttpHeaders } from 'node:http';

import { ExternalSecretsConfig } from '../../external-secrets.config';
import { VaultProvider } from '../vault';

interface Received {
	method?: string;
	url?: string;
	headers: IncomingHttpHeaders;
}

function tokenLookupResponse() {
	return {
		data: {
			id: 'test-token',
			expire_time: null,
			renewable: false,
			policies: ['default'],
		},
	};
}

describe('VaultProvider (real HTTP round-trip)', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

	// Plain GETs with `?list=true` so a standard HTTP verb crosses the socket.
	mockInstance(ExternalSecretsConfig, { preferGet: true });

	let server: LocalServer;
	let received: Received[];

	beforeAll(async () => {
		server = await startServer((req, res) => {
			received.push({ method: req.method, url: req.url, headers: req.headers });
			const url = req.url ?? '';
			res.setHeader('content-type', 'application/json');
			if (url.startsWith('/v1/auth/token/lookup-self')) {
				res.writeHead(200);
				res.end(JSON.stringify(tokenLookupResponse()));
			} else if (url.startsWith('/v1/secret/metadata/')) {
				res.writeHead(200);
				res.end(JSON.stringify({ data: { keys: ['app'] } }));
			} else if (url.startsWith('/v1/secret/data/app')) {
				res.writeHead(200);
				res.end(JSON.stringify({ data: { data: { password: 'hunter2' } } }));
			} else {
				res.writeHead(404);
				res.end(JSON.stringify({ errors: ['not found'] }));
			}
		});
	});

	afterAll(async () => await server.close());

	beforeEach(() => {
		received = [];
		server.clear();
	});

	function vaultSettings() {
		return {
			connected: true,
			connectedAt: new Date(),
			settings: {
				url: `${server.url}/v1/`,
				authMethod: 'token',
				token: 'test-token',
				namespace: 'admin',
				renewToken: false,
				username: '',
				password: '',
				roleId: '',
				secretId: '',
				kvMountPath: 'secret/',
				kvVersion: '2',
			},
		};
	}

	it('sends auth and namespace headers to the configured paths over a real socket', async () => {
		const provider = new VaultProvider(
			logger,
			new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()),
		);
		await provider.init(vaultSettings());

		await provider.connect();

		expect(provider.state).toBe('connected');
		expect(server.captured).toContain('/v1/auth/token/lookup-self');
		const lookup = received.find((r) => r.url?.startsWith('/v1/auth/token/lookup-self'));
		expect(lookup?.headers['x-vault-token']).toBe('test-token');
		expect(lookup?.headers['x-vault-namespace']).toBe('admin');
	});

	it('fetches and caches a KV secret over a real socket', async () => {
		const provider = new VaultProvider(
			logger,
			new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()),
		);
		await provider.init(vaultSettings());

		await provider.connect();
		await provider.update();

		expect(provider.getSecret('secret')).toEqual({ app: { password: 'hunter2' } });
		const listCall = received.find((r) => r.url?.startsWith('/v1/secret/metadata/'));
		expect(listCall?.url).toContain('list=true');
		expect(listCall?.headers['x-vault-token']).toBe('test-token');
	});
});
