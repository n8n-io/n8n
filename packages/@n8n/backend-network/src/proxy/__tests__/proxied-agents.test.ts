import { HttpsProxyAgent } from 'https-proxy-agent';
import type http from 'node:http';
import type https from 'node:https';
import type net from 'node:net';
import type { MockInstance } from 'vitest';

import { createProxiedHttpAgent, createProxiedHttpsAgent } from '../proxied-agents';

const PROXY_URL = 'https://proxy.internal:3128';

const TARGET_TLS: https.AgentOptions = {
	servername: 'target.example.com',
	ca: 'TARGET_CA',
	cert: 'TARGET_CERT',
	key: 'TARGET_KEY',
	passphrase: 'TARGET_PASSPHRASE',
};

type ConnectOpts = Parameters<HttpsProxyAgent<string>['connect']>[1];

const targetRequestOpts = {
	host: 'target.example.com',
	port: 443,
	secureEndpoint: true,
} as ConnectOpts;

describe('createProxiedHttpsAgent', () => {
	it('keeps the target SNI and trust material off the connection to the proxy', () => {
		const agent = createProxiedHttpsAgent(PROXY_URL, TARGET_TLS);

		expect(agent.connectOpts).toMatchObject({ host: 'proxy.internal', port: 3128 });
		expect(agent.connectOpts).not.toHaveProperty('servername');
		expect(agent.connectOpts).not.toHaveProperty('ca');
		expect(agent.connectOpts).not.toHaveProperty('cert');
		expect(agent.connectOpts).not.toHaveProperty('key');
		expect(agent.connectOpts).not.toHaveProperty('passphrase');
	});

	it('verifies the proxy certificate even when the request opts out of verification', () => {
		const agent = createProxiedHttpsAgent(PROXY_URL, {
			...TARGET_TLS,
			rejectUnauthorized: false,
			secureOptions: 4,
		});

		expect(agent.connectOpts).not.toHaveProperty('rejectUnauthorized');
		expect(agent.connectOpts).not.toHaveProperty('secureOptions');
	});

	it('keeps a target TLS policy from reshaping the proxy handshake', () => {
		const agent = createProxiedHttpsAgent(PROXY_URL, {
			ciphers: 'TARGET_CIPHERS',
			minVersion: 'TLSv1.1',
			checkServerIdentity: () => undefined,
		});

		expect(agent.connectOpts).not.toHaveProperty('ciphers');
		expect(agent.connectOpts).not.toHaveProperty('minVersion');
		expect(agent.connectOpts).not.toHaveProperty('checkServerIdentity');
	});

	it('forwards pool and socket options to the connection to the proxy', () => {
		const agent = createProxiedHttpsAgent(PROXY_URL, { keepAlive: true, timeout: 5000 });

		expect(agent.connectOpts).toMatchObject({ keepAlive: true, timeout: 5000 });
	});

	describe('tunnelled session', () => {
		let parentConnect: MockInstance<HttpsProxyAgent<string>['connect']>;

		beforeEach(() => {
			parentConnect = vi
				.spyOn(HttpsProxyAgent.prototype, 'connect')
				.mockResolvedValue({} as net.Socket);
		});

		afterEach(() => parentConnect.mockRestore());

		it('carries the target trust material', async () => {
			const agent = createProxiedHttpsAgent(PROXY_URL, {
				...TARGET_TLS,
				rejectUnauthorized: false,
			});

			await agent.connect({} as http.ClientRequest, targetRequestOpts);

			expect(parentConnect).toHaveBeenCalledWith(
				{},
				expect.objectContaining({
					host: 'target.example.com',
					port: 443,
					secureEndpoint: true,
					ca: 'TARGET_CA',
					cert: 'TARGET_CERT',
					key: 'TARGET_KEY',
					passphrase: 'TARGET_PASSPHRASE',
					rejectUnauthorized: false,
				}),
			);
		});

		it('leaves the SNI to be derived from the host of each hop', async () => {
			const agent = createProxiedHttpsAgent(PROXY_URL, TARGET_TLS);

			await agent.connect({} as http.ClientRequest, targetRequestOpts);

			expect(parentConnect.mock.calls[0][1]).not.toHaveProperty('servername');
		});
	});
});

describe('createProxiedHttpAgent', () => {
	it('keeps the target SNI and trust material off the connection to the proxy', () => {
		const agent = createProxiedHttpAgent(PROXY_URL, TARGET_TLS);

		expect(agent.connectOpts).toMatchObject({ host: 'proxy.internal', port: 3128 });
		expect(agent.connectOpts).not.toHaveProperty('servername');
		expect(agent.connectOpts).not.toHaveProperty('ca');
		expect(agent.connectOpts).not.toHaveProperty('cert');
		expect(agent.connectOpts).not.toHaveProperty('key');
		expect(agent.connectOpts).not.toHaveProperty('passphrase');
	});
});
