import { createHttpProxyAgent, createHttpsProxyAgent } from '@n8n/backend-network/proxy';
import { createServer, request, type Agent, type Server } from 'node:http';
import { connect } from 'node:net';

import { PAGE, close, listen, usePreviewHarness, type Answer } from './sandbox-preview-harness';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

/** The request line that the forward proxy received. */
interface ProxySeen {
	method?: string;
	url?: string;
}

/**
 * A forward proxy like the one that HTTP_PROXY names: it relays absolute-form
 * requests (`GET http://host/path`) and tunnels CONNECT requests.
 */
function stubForwardProxy(seen: ProxySeen[]): Server {
	const proxy = createServer((req, res) => {
		seen.push({ method: req.method, url: req.url });
		const target = new URL(req.url ?? '');
		const relayed = request(
			{
				host: target.hostname,
				port: target.port,
				path: `${target.pathname}${target.search}`,
				method: req.method,
				headers: req.headers,
			},
			(answer) => {
				res.writeHead(answer.statusCode ?? 502, answer.headers);
				answer.pipe(res);
			},
		);
		relayed.on('error', () => res.destroy());
		req.pipe(relayed);
	});
	proxy.on('connect', (req, clientSocket, head) => {
		seen.push({ method: req.method, url: req.url });
		const [host, port] = (req.url ?? '').split(':');
		const tunnel = connect(Number(port), host, () => {
			clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			tunnel.write(head);
			tunnel.pipe(clientSocket);
			clientSocket.pipe(tunnel);
		});
		tunnel.on('error', () => clientSocket.destroy());
		clientSocket.on('error', () => tunnel.destroy());
	});
	return proxy;
}

/** Fails fast with a clear message when an answer never comes, as when the request is never sent. */
const within = async (answer: Promise<Answer>, ms = 3_000) =>
	await Promise.race([
		answer,
		new Promise<never>((_resolve, reject) =>
			setTimeout(() => reject(new Error(`No answer within ${ms} ms`)), ms),
		),
	]);

describe('SandboxPreviewProxyController behind the instance proxy settings', () => {
	const h = usePreviewHarness();
	const { seen, apiKey, getNodeAgent, openPreview, send } = h;
	const proxySeen: ProxySeen[] = [];
	const forwardProxy = { server: undefined as Server | undefined, url: '' };
	let proxyAgent: Agent | undefined;

	beforeAll(async () => {
		forwardProxy.server = stubForwardProxy(proxySeen);
		forwardProxy.url = `http://127.0.0.1:${await listen(forwardProxy.server)}`;
	});

	afterAll(async () => {
		if (forwardProxy.server) await close(forwardProxy.server);
	});

	beforeEach(() => {
		proxySeen.length = 0;
	});

	afterEach(() => {
		proxyAgent?.destroy();
		proxyAgent = undefined;
	});

	/** The agents that `OutboundHttp` gives when HTTP_PROXY covers the sandbox service. */
	const useProxyAgent = (agent: Agent) => {
		proxyAgent = agent;
		getNodeAgent.mockReturnValue({ httpAgent: agent, httpsAgent: h.httpsAgent });
	};

	describe.each([
		[
			'an HTTP forward proxy (absolute-form requests)',
			() => createHttpProxyAgent(h.servers.upstreamUrl, forwardProxy.url, { keepAlive: true }),
			(url: string) => ({ method: 'GET', url: `${h.servers.upstreamUrl}${url}` }),
		],
		[
			'a CONNECT tunnel',
			// A CONNECT agent for a plain HTTP service, because a TLS service needs a certificate.
			() => createHttpsProxyAgent(h.servers.upstreamUrl, forwardProxy.url, { keepAlive: true }),
			() => ({ method: 'CONNECT', url: new URL(h.servers.upstreamUrl).host }),
		],
	])('through %s', (_case, makeAgent, expectedProxyRequest) => {
		it('sends a page request with the API key and without the n8n cookie', async () => {
			useProxyAgent(makeAgent());
			const { url } = await openPreview();

			const answer = await within(
				send(url, { headers: { ...PAGE, cookie: 'n8n-auth=secret-session' } }),
			);

			expect(answer.status).toBe(200);
			expect(answer.body).toBe('<html>app</html>');
			expect(proxySeen[0]).toEqual(expectedProxyRequest('/sandboxes/sb-1/ports/5173/'));
			expect(seen[0].url).toBe('/sandboxes/sb-1/ports/5173/');
			expect(seen[0].headers['x-api-key']).toBe(apiKey);
			expect(seen[0].headers.cookie).toBeUndefined();
		});

		it('sends a body that n8n already read', async () => {
			useProxyAgent(makeAgent());
			const { url } = await openPreview();

			const answer = await within(
				send(`${url}api/items`, {
					method: 'POST',
					headers: { 'content-type': 'application/json', authorization: 'Bearer secret' },
					body: '{"name":"Ada"}',
				}),
			);

			expect(answer.body).toBe('echo:{"name":"Ada"}');
			expect(seen[0].method).toBe('POST');
			expect(seen[0].headers['x-api-key']).toBe(apiKey);
			expect(seen[0].headers.authorization).toBeUndefined();
		});

		it('streams a multipart body that n8n did not read', async () => {
			useProxyAgent(makeAgent());
			const { url } = await openPreview();
			const body = ['--b', 'Content-Disposition: form-data; name="a"', '', '1', '--b--', ''].join(
				'\r\n',
			);

			await within(
				send(`${url}api/upload`, {
					method: 'POST',
					headers: { 'content-type': 'multipart/form-data; boundary=b' },
					body,
				}),
			);

			expect(seen[0].body).toBe(body);
			expect(seen[0].headers['x-api-key']).toBe(apiKey);
		});
	});
});
