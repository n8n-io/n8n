import type { HttpRequestClient, TypedHttpFullResponse } from '@n8n/backend-network';
import type { IHttpRequestOptions, IN8nHttpResponse } from 'n8n-workflow';
import type { Readable } from 'node:stream';

interface Generation {
	client: HttpRequestClient;
	running: number;
	retired: boolean;
}

/**
 * Sends every request through the newest client from `build`. `reload()` builds
 * a new client and closes the old one after its running requests finish,
 * because `close()` aborts the requests in flight. A request is running until
 * its promise settles, so a streamed response body is not tracked.
 */
export class ReloadingHttpRequestClient implements HttpRequestClient {
	private current: Generation;

	private readonly unsubscribe: () => void;

	/** `subscribe` registers `reload` and returns a function that removes it again on `close()`. */
	constructor(
		private readonly build: () => HttpRequestClient,
		subscribe: (reload: () => void) => () => void,
	) {
		this.current = this.newGeneration();
		this.unsubscribe = subscribe(() => this.reload());
	}

	request<T = IN8nHttpResponse | Readable>(
		options: IHttpRequestOptions & { returnFullResponse: true },
	): Promise<TypedHttpFullResponse<T>>;
	request<T = IN8nHttpResponse>(
		options: IHttpRequestOptions & { returnFullResponse?: false },
	): Promise<T>;
	request<T = IN8nHttpResponse>(
		options: IHttpRequestOptions,
	): Promise<T | TypedHttpFullResponse<T>>;
	async request<T>(options: IHttpRequestOptions): Promise<T | TypedHttpFullResponse<T>> {
		const generation = this.current;
		generation.running++;
		try {
			return await generation.client.request<T>(options);
		} finally {
			generation.running--;
			this.closeIfDone(generation);
		}
	}

	// oxlint-disable-next-line typescript/no-deprecated
	async requestLegacy(...args: Parameters<HttpRequestClient['requestLegacy']>): Promise<unknown> {
		// oxlint-disable-next-line typescript/no-deprecated
		return await this.current.client.requestLegacy(...args);
	}

	reload(): void {
		const old = this.current;
		this.current = this.newGeneration();
		old.retired = true;
		this.closeIfDone(old);
	}

	close(): void {
		this.unsubscribe();
		this.current.client.close();
	}

	private newGeneration(): Generation {
		return { client: this.build(), running: 0, retired: false };
	}

	private closeIfDone(generation: Generation): void {
		if (generation.retired && generation.running === 0) generation.client.close();
	}
}
