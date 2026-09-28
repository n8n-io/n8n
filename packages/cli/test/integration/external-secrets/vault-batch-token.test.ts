import type { SsrfProtectionService } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { startServer } from '@n8n/backend-network/testing';
import { mockLogger } from '@n8n/backend-test-utils';
import type { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { VaultProvider } from '@/modules/external-secrets.ee/providers/vault';

describe('Vault AppRole batch token over HTTP', () => {
	it('reads secrets after the first token expires', async () => {
		let logins = 0;
		let firstExpiresAt = 0;
		const readTokens: string[] = [];
		const server = await startServer((req, res) => {
			const token = req.headers['x-vault-token'];
			const path = new URL(req.url ?? '/', 'http://localhost').pathname;
			res.setHeader('content-type', 'application/json');

			if (req.method === 'POST' && path === '/v1/auth/approle/login') {
				logins++;
				if (logins === 1) firstExpiresAt = Date.now() + 4_000;
				res.end(JSON.stringify({ auth: { client_token: logins === 1 ? 'first' : 'second' } }));
				return;
			}

			if (token !== 'first' && token !== 'second') {
				res.writeHead(403).end(JSON.stringify({ errors: ['invalid token'] }));
				return;
			}
			if (token === 'first' && Date.now() >= firstExpiresAt) {
				res.writeHead(403).end(JSON.stringify({ errors: ['expired token'] }));
				return;
			}

			if (req.method === 'GET' && path === '/v1/auth/token/lookup-self') {
				res.end(
					JSON.stringify({
						data: {
							id: token,
							renewable: false,
							expire_time: new Date(
								token === 'first' ? firstExpiresAt : Date.now() + 30_000,
							).toISOString(),
						},
					}),
				);
				return;
			}
			if (req.method === 'GET' && path === '/v1/secret/metadata/') {
				res.end(JSON.stringify({ data: { keys: ['app'] } }));
				return;
			}
			if (req.method === 'GET' && path === '/v1/secret/data/app') {
				readTokens.push(token);
				res.end(JSON.stringify({ data: { data: { value: token } } }));
				return;
			}
			res.writeHead(404).end(JSON.stringify({ errors: ['unknown path'] }));
		});

		const logger = mockLogger();
		const outboundHttp = new OutboundHttp(
			mock<SsrfProtectionService>(),
			mock<SsrfProtectionConfig>({ enabled: true }),
			logger,
		);
		const config = Container.get(ExternalSecretsConfig);
		const preferGet = config.preferGet;
		config.preferGet = true;
		const provider = new VaultProvider(logger, outboundHttp);
		try {
			await provider.init({
				connected: true,
				connectedAt: null,
				settings: {
					url: `${server.url}/v1/`,
					authMethod: 'appRole',
					roleId: 'test-role',
					secretId: 'test-secret',
					kvMountPath: 'secret/',
					kvVersion: '2',
				},
			});
			await provider.connect();
			if (provider.lastError) throw provider.lastError;
			await provider.update();
			expect(provider.state).toBe('connected');
			expect(provider.getSecret('secret')).toEqual({ app: { value: 'first' } });

			await vi.waitFor(() => expect(logins).toBe(2), { timeout: 6_000 });
			await vi.waitFor(() => expect(Date.now()).toBeGreaterThan(firstExpiresAt), {
				timeout: 6_000,
			});
			await provider.update();

			expect(provider.state).toBe('connected');
			expect(provider.getSecret('secret')).toEqual({ app: { value: 'second' } });
			expect(readTokens).toEqual(['first', 'second']);
		} finally {
			await provider.disconnect();
			config.preferGet = preferGet;
			await server.close();
		}
	}, 15_000);
});
