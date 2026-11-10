import { Logger } from '@n8n/backend-common';
import {
	OutboundHttp,
	type HttpRequestClient,
	type HttpRequestClientOptions,
} from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	assertSecureTransport,
	createEngineHttpServer,
	openEngineTls,
	type EngineTlsSource,
} from '@n8n/engine';
import type { RequestListener, Server } from 'node:http';

import { ReloadingHttpRequestClient } from './reloading-http-request-client';

/**
 * Mutual TLS between the control plane and the engine. Gives out the servers
 * and the clients of this process, which use the certificate, key and CA from
 * `N8N_ENGINE_TLS_*` and follow changes to those files. Without them, both
 * use plain HTTP, which the boot checks allow only in-process or with the
 * opt-out.
 */
@Service()
export class EngineMtls {
	private opened?: { tls: EngineTlsSource | undefined };

	private readonly clients = new Set<HttpRequestClient>();

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/** Opened on first use, so the server and the clients share one watch of the files. */
	private get tls(): EngineTlsSource | undefined {
		this.opened ??= { tls: openEngineTls(this.engineConfig, this.logger) };
		return this.opened.tls;
	}

	get enabled(): boolean {
		return this.tls !== undefined;
	}

	/** Refuses plain HTTP without the opt-out, and an `http://` peer URL with TLS on. */
	assertSecureTransport(peerUrls: Record<string, string>): void {
		assertSecureTransport(this.engineConfig, this.enabled, peerUrls, this.logger);
	}

	/** With TLS, requires a client certificate from the engine CA on every path except `/healthz`. */
	createServer(handler: RequestListener): Server {
		return createEngineHttpServer(handler, this.tls);
	}

	/**
	 * With TLS, a client that presents this process's certificate and trusts
	 * only the engine CA. After a reload it sends new requests with the new
	 * certificate and lets running ones finish.
	 */
	requests(options: HttpRequestClientOptions): HttpRequestClient {
		const client = this.newClient(options);
		this.clients.add(client);
		return client;
	}

	/** Closes the clients from `requests()` and stops watching the files. */
	close(): void {
		for (const client of this.clients) client.close();
		this.clients.clear();
		this.opened?.tls?.close();
	}

	private newClient(options: HttpRequestClientOptions): HttpRequestClient {
		const { tls } = this;
		if (!tls) return this.outboundHttp.requests(options);

		return new ReloadingHttpRequestClient(
			() =>
				this.outboundHttp.requests({
					...options,
					// Explicit, so a global NODE_TLS_REJECT_UNAUTHORIZED=0 cannot turn off the peer check.
					connectionPool: { agentOptions: { ...tls.current, rejectUnauthorized: true } },
				}),
			(reload) => tls.subscribe(reload),
		);
	}
}
