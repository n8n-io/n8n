import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import { type LocalServer, startServer } from '@n8n/backend-network/testing';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import { jsonParse } from 'n8n-workflow';
import type { IncomingHttpHeaders } from 'node:http';

import { InfisicalProvider } from '../infisical';

const PROJECT_ID = 'project-123';

interface Received {
	method?: string;
	url?: string;
	headers: IncomingHttpHeaders;
	body: string;
}

describe('InfisicalProvider (real HTTP round-trip)', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);

	let server: LocalServer;
	let received: Received[];

	beforeAll(async () => {
		server = await startServer((req, res) => {
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', () => {
				received.push({ method: req.method, url: req.url, headers: req.headers, body });
				const url = req.url ?? '';
				res.setHeader('content-type', 'application/json');
				if (req.method === 'POST' && url.startsWith('/api/v1/auth/universal-auth/login')) {
					res.writeHead(200);
					res.end(JSON.stringify({ accessToken: 'issued-token', expiresIn: 7200 }));
				} else if (url.startsWith(`/api/v1/workspace/${PROJECT_ID}`)) {
					res.writeHead(200);
					res.end(JSON.stringify({ workspace: { id: PROJECT_ID } }));
				} else if (url.startsWith('/api/v4/secrets')) {
					res.writeHead(200);
					res.end(
						JSON.stringify({
							secrets: [{ secretKey: 'API_KEY', secretValue: 'socket-value' }],
							imports: [],
						}),
					);
				} else {
					res.writeHead(404);
					res.end(JSON.stringify({ message: 'not found' }));
				}
			});
		});
	});

	afterAll(async () => await server.close());

	beforeEach(() => {
		received = [];
		server.clear();
	});

	function infisicalSettings() {
		return {
			connected: true,
			connectedAt: new Date(),
			settings: {
				siteURL: server.url,
				projectId: PROJECT_ID,
				environment: 'dev',
				secretPath: '/',
				authMethod: 'universalAuth',
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
			},
		};
	}

	it('logs in, tests and fetches secrets with the bearer token over a real socket', async () => {
		const provider = new InfisicalProvider(
			logger,
			new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()),
		);
		await provider.init(infisicalSettings());

		await provider.connect();
		await provider.update();

		expect(provider.getSecret('API_KEY')).toBe('socket-value');

		const login = received.find((r) => r.url?.startsWith('/api/v1/auth/universal-auth/login'));
		expect(jsonParse(login?.body ?? '{}')).toEqual({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
		});

		const secretsCall = received.find((r) => r.url?.startsWith('/api/v4/secrets'));
		expect(secretsCall?.headers.authorization).toBe('Bearer issued-token');
		expect(secretsCall?.url).toContain(`projectId=${PROJECT_ID}`);
		expect(secretsCall?.url).toContain('environment=dev');
	});
});
