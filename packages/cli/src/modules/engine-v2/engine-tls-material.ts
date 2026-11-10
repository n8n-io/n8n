import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	assertSecureTransport,
	loadEngineTls,
	watchEngineTls,
	type EngineTls,
	type EngineTlsWatcher,
} from '@n8n/engine';

import { ReloadingHttpRequestClient } from './reloading-http-request-client';

type ReloadListener = (tls: EngineTls) => void;

/**
 * This process's engine TLS certificate, key and CA, read from
 * `N8N_ENGINE_TLS_*` and read again when the files change. `undefined` when
 * none is set: the planes then use plain HTTP, which the boot checks allow
 * only in-process or with the opt-out.
 */
@Service()
export class EngineTlsMaterial {
	private loaded?: { tls: EngineTls | undefined };

	private watcher?: EngineTlsWatcher;

	private readonly listeners = new Set<ReloadListener>();

	constructor(private readonly engineConfig: EngineConfig) {}

	get tls(): EngineTls | undefined {
		this.loaded ??= { tls: loadEngineTls(this.engineConfig) };
		return this.loaded.tls;
	}

	/** Refuses plain HTTP without the opt-out, and an `http://` peer URL with TLS on. */
	assertSecureTransport(peerUrls: Record<string, string>, logger: Logger): void {
		assertSecureTransport(this.engineConfig, this.tls, peerUrls, logger);
	}

	/** Reloads the TLS files when they change. Does nothing when TLS is off. */
	watch(logger: Logger): void {
		const { tls } = this;
		if (!tls || this.watcher) return;

		this.watcher = watchEngineTls(
			this.engineConfig,
			tls,
			(next) => {
				this.loaded = { tls: next };
				const errors: unknown[] = [];
				for (const listener of this.listeners) {
					try {
						listener(next);
					} catch (error) {
						errors.push(error);
					}
				}
				if (errors.length > 0) {
					throw new AggregateError(errors, 'Some engine TLS reload listeners failed');
				}
			},
			logger,
		);
	}

	stopWatching(): void {
		this.watcher?.close();
		this.watcher = undefined;
	}

	/** Calls `listener` with the new material after each reload. Returns a function that removes it. */
	onReload(listener: ReloadListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/**
	 * A client from `build` that is built again with the new material after each
	 * reload. Without TLS, the client from `build` itself.
	 */
	reloadingClient(build: (tls: EngineTls | undefined) => HttpRequestClient): HttpRequestClient {
		if (!this.tls) return build(undefined);

		return new ReloadingHttpRequestClient(
			() => build(this.tls),
			(reload) => this.onReload(reload),
		);
	}
}
