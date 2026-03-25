import { isNetworkError } from "./error.js";
//#region src/utils/stream.ts
/**
* Error thrown when maximum reconnection attempts are exceeded.
*/
var MaxReconnectAttemptsError = class extends Error {
	constructor(maxAttempts, cause) {
		super(`Exceeded maximum SSE reconnection attempts (${maxAttempts})`);
		this.name = "MaxReconnectAttemptsError";
		this.cause = cause;
	}
};
/**
* Stream with automatic retry logic for SSE connections.
* Implements reconnection behavior similar to the Python SDK.
*
* @param makeRequest Function to make requests. When `params` is undefined/empty, it's the initial request.
*                    When `params.reconnectPath` is provided, it's a reconnection request.
* @param options Configuration options
* @returns AsyncGenerator yielding stream events
*/
async function* streamWithRetry(makeRequest, options = {}) {
	const maxRetries = options.maxRetries ?? 5;
	let attempt = 0;
	let lastEventId;
	let reconnectPath;
	while (true) {
		let shouldRetry = false;
		let lastError;
		let reader;
		try {
			if (options.signal?.aborted) return;
			const { response, stream } = await makeRequest(reconnectPath ? {
				lastEventId,
				reconnectPath
			} : void 0);
			const locationHeader = response.headers.get("location");
			if (locationHeader) reconnectPath = locationHeader;
			const contentType = response.headers.get("content-type")?.split(";")[0];
			if (contentType && !contentType.includes("text/event-stream")) throw new Error(`Expected response header Content-Type to contain 'text/event-stream', got '${contentType}'`);
			reader = stream.getReader();
			try {
				while (true) {
					if (options.signal?.aborted) {
						await reader.cancel();
						return;
					}
					const { done, value } = await reader.read();
					if (done) break;
					if (value.id) lastEventId = value.id;
					yield value;
				}
				break;
			} catch (error) {
				if (reconnectPath && !options.signal?.aborted) shouldRetry = true;
				else throw error;
			} finally {
				if (reader) try {
					reader.releaseLock();
				} catch {}
			}
		} catch (error) {
			lastError = error;
			if (isNetworkError(error) && reconnectPath && !options.signal?.aborted) shouldRetry = true;
			else throw error;
		}
		if (shouldRetry) {
			attempt += 1;
			if (attempt > maxRetries) throw new MaxReconnectAttemptsError(maxRetries, lastError);
			options.onReconnect?.({
				attempt,
				lastEventId,
				cause: lastError
			});
			const delay = Math.min(1e3 * 2 ** (attempt - 1), 5e3) + Math.random() * 1e3;
			await new Promise((resolve) => {
				setTimeout(resolve, delay);
			});
			continue;
		}
		break;
	}
}
var IterableReadableStream = class IterableReadableStream extends ReadableStream {
	reader;
	ensureReader() {
		if (!this.reader) this.reader = this.getReader();
	}
	async next() {
		this.ensureReader();
		try {
			const result = await this.reader.read();
			if (result.done) {
				this.reader.releaseLock();
				return {
					done: true,
					value: void 0
				};
			} else return {
				done: false,
				value: result.value
			};
		} catch (e) {
			this.reader.releaseLock();
			throw e;
		}
	}
	async return() {
		this.ensureReader();
		if (this.locked) {
			const cancelPromise = this.reader.cancel();
			this.reader.releaseLock();
			await cancelPromise;
		}
		return {
			done: true,
			value: void 0
		};
	}
	async throw(e) {
		this.ensureReader();
		if (this.locked) {
			const cancelPromise = this.reader.cancel();
			this.reader.releaseLock();
			await cancelPromise;
		}
		throw e;
	}
	async [Symbol.asyncDispose]() {
		await this.return();
	}
	[Symbol.asyncIterator]() {
		return this;
	}
	static fromReadableStream(stream) {
		const reader = stream.getReader();
		return new IterableReadableStream({
			start(controller) {
				return pump();
				function pump() {
					return reader.read().then(({ done, value }) => {
						if (done) {
							controller.close();
							return;
						}
						controller.enqueue(value);
						return pump();
					});
				}
			},
			cancel() {
				reader.releaseLock();
			}
		});
	}
	static fromAsyncGenerator(generator) {
		return new IterableReadableStream({
			async pull(controller) {
				const { value, done } = await generator.next();
				if (done) controller.close();
				controller.enqueue(value);
			},
			async cancel(reason) {
				await generator.return(reason);
			}
		});
	}
};
//#endregion
export { IterableReadableStream, streamWithRetry };

//# sourceMappingURL=stream.js.map