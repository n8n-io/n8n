import { onScopeDispose } from 'vue';

import { prototypeResponse } from './prototype.responses';

/**
 * Answers the requests for prototype items with sample data while the calling scope lives.
 * The REST client sends requests through `XMLHttpRequest`. A matched request never reaches
 * the server: it resolves with status 200 and the sample body. Every other request is sent.
 * Call it in `setup`, before child components send their first request.
 */
export function usePrototypeRequests() {
	const NativeRequest = window.XMLHttpRequest;

	class PrototypeRequest extends NativeRequest {
		#payload: string | undefined;

		override open(
			method: string,
			url: string | URL,
			async = true,
			username?: string | null,
			password?: string | null,
		) {
			const response = prototypeResponse(method, String(url));
			// The REST client reads the `data` key of every response.
			this.#payload = response === undefined ? undefined : JSON.stringify({ data: response });
			super.open(method, url, async, username, password);
		}

		override send(body?: Document | XMLHttpRequestBodyInit | null) {
			if (this.#payload === undefined) {
				super.send(body);
				return;
			}

			const payload = this.#payload;
			Object.defineProperty(this, 'status', { configurable: true, get: () => 200 });
			Object.defineProperty(this, 'statusText', { configurable: true, get: () => 'OK' });
			Object.defineProperty(this, 'responseText', { configurable: true, get: () => payload });
			Object.defineProperty(this, 'response', { configurable: true, get: () => payload });
			this.getAllResponseHeaders = () => 'content-type: application/json\r\n';
			queueMicrotask(() => {
				this.dispatchEvent(new ProgressEvent('load'));
				this.onloadend?.(new ProgressEvent('loadend'));
			});
		}
	}

	window.XMLHttpRequest = PrototypeRequest;
	onScopeDispose(() => {
		if (window.XMLHttpRequest === PrototypeRequest) window.XMLHttpRequest = NativeRequest;
	});
}
