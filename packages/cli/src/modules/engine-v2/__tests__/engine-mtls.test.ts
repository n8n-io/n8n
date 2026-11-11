import type { Logger } from '@n8n/backend-common';
import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import { createEngineHttpServer, openEngineTls, type EngineTls } from '@n8n/engine';
import type { Server } from 'node:http';
import { mock } from 'vitest-mock-extended';

import { EngineMtls } from '../engine-mtls';

vi.mock('@n8n/engine', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/engine')>()),
	createEngineHttpServer: vi.fn(),
	openEngineTls: vi.fn(),
}));

const tlsOf = (name: string): EngineTls => ({
	cert: Buffer.from(`${name} cert`),
	key: Buffer.from(`${name} key`),
	ca: Buffer.from('ca'),
});

/** A TLS source that a test reloads by hand. */
const fakeSource = (initial: EngineTls) => {
	const listeners = new Set<(tls: EngineTls) => void>();
	return {
		current: initial,
		subscribe: vi.fn((listener: (tls: EngineTls) => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}),
		close: vi.fn(),
		reload(next: EngineTls) {
			this.current = next;
			for (const listener of listeners) listener(next);
		},
	};
};

describe('EngineMtls', () => {
	const options: HttpRequestClientOptions = {
		baseURL: 'https://cp:3001',
		useDefaultSsrfPolicy: 'unsafe',
	};
	let clients: HttpRequestClient[];
	let outboundHttp: OutboundHttp;
	let mtls: EngineMtls;

	const newMtls = (tls: ReturnType<typeof fakeSource> | undefined) => {
		vi.mocked(openEngineTls).mockReset().mockReturnValue(tls);
		clients = [];
		outboundHttp = mock<OutboundHttp>({
			requests: vi.fn(() => {
				const client = mock<HttpRequestClient>();
				clients.push(client);
				return client;
			}),
		});
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		mtls = new EngineMtls(mock<EngineConfig>(), outboundHttp, logger);
	};

	describe('without TLS', () => {
		beforeEach(() => newMtls(undefined));

		it('builds one plain client with the given options', () => {
			const client = mtls.requests(options);

			expect(outboundHttp.requests).toHaveBeenCalledExactlyOnceWith(options);
			expect(client).toBe(clients[0]);
			expect(mtls.enabled).toBe(false);
		});

		it('closes its clients when closed', () => {
			mtls.requests(options);

			mtls.close();

			expect(clients[0].close).toHaveBeenCalledOnce();
		});

		it('creates a plain HTTP server', () => {
			const handler = vi.fn();

			mtls.createServer(handler);

			expect(createEngineHttpServer).toHaveBeenCalledWith(handler, undefined);
		});
	});

	describe('with TLS', () => {
		let source: ReturnType<typeof fakeSource>;

		beforeEach(() => {
			source = fakeSource(tlsOf('old'));
			newMtls(source);
		});

		it('opens the TLS files once for the servers and the clients', () => {
			vi.mocked(createEngineHttpServer).mockReturnValue(mock<Server>());
			const handler = vi.fn();

			mtls.createServer(handler);
			mtls.requests(options);

			expect(openEngineTls).toHaveBeenCalledOnce();
			expect(createEngineHttpServer).toHaveBeenCalledWith(handler, source);
			expect(mtls.enabled).toBe(true);
		});

		it('presents the client certificate and verifies the peer against the engine CA alone', () => {
			mtls.requests(options);

			expect(outboundHttp.requests).toHaveBeenCalledExactlyOnceWith({
				...options,
				connectionPool: { agentOptions: { ...tlsOf('old'), rejectUnauthorized: true } },
			});
		});

		it("keeps the caller's connection pool settings and adds the certificate to them", () => {
			mtls.requests({
				...options,
				connectionPool: { agentOptions: { keepAlive: false, rejectUnauthorized: false } },
			});

			expect(outboundHttp.requests).toHaveBeenCalledExactlyOnceWith({
				...options,
				connectionPool: {
					agentOptions: { keepAlive: false, ...tlsOf('old'), rejectUnauthorized: true },
				},
			});
		});

		it('rebuilds a client with the reloaded certificate and closes the old one', async () => {
			const client = mtls.requests(options);

			source.reload(tlsOf('new'));
			await client.request({ url: '/after-reload' });

			expect(vi.mocked(outboundHttp.requests).mock.calls[1][0]).toMatchObject({
				connectionPool: { agentOptions: { ...tlsOf('new'), rejectUnauthorized: true } },
			});
			expect(clients[0].close).toHaveBeenCalledOnce();
			expect(clients[1].request).toHaveBeenCalledExactlyOnceWith({ url: '/after-reload' });
		});

		it('closes its clients and stops watching the files when closed', () => {
			mtls.requests(options);

			mtls.close();

			expect(clients[0].close).toHaveBeenCalledOnce();
			expect(source.close).toHaveBeenCalledOnce();
		});

		it('does not open the TLS files just to close them', () => {
			mtls.close();

			expect(openEngineTls).not.toHaveBeenCalled();
		});
	});
});
