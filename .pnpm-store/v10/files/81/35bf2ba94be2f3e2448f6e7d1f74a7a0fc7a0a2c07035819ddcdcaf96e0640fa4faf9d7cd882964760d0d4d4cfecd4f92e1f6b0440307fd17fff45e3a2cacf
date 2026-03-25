import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { AsyncLocalStorageProviderSingleton } from "../singletons/async_local_storage/index.js";
import "../singletons/index.js";
import { pickRunnableConfigKeys } from "../runnables/config.js";
import { raceWithSignal } from "./signal.js";
//#region src/utils/stream.ts
var stream_exports = /* @__PURE__ */ __exportAll({
	AsyncGeneratorWithSetup: () => AsyncGeneratorWithSetup,
	IterableReadableStream: () => IterableReadableStream,
	atee: () => atee,
	concat: () => concat,
	pipeGeneratorWithSetup: () => pipeGeneratorWithSetup
});
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
	[Symbol.asyncIterator]() {
		return this;
	}
	async [Symbol.asyncDispose]() {
		await this.return();
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
function atee(iter, length = 2) {
	const buffers = Array.from({ length }, () => []);
	return buffers.map(async function* makeIter(buffer) {
		while (true) if (buffer.length === 0) {
			const result = await iter.next();
			for (const buffer of buffers) buffer.push(result);
		} else if (buffer[0].done) return;
		else yield buffer.shift().value;
	});
}
function concat(first, second) {
	if (Array.isArray(first) && Array.isArray(second)) return first.concat(second);
	else if (typeof first === "string" && typeof second === "string") return first + second;
	else if (typeof first === "number" && typeof second === "number") return first + second;
	else if ("concat" in first && typeof first.concat === "function") return first.concat(second);
	else if (typeof first === "object" && typeof second === "object") {
		const chunk = { ...first };
		for (const [key, value] of Object.entries(second)) if (key in chunk && !Array.isArray(chunk[key])) chunk[key] = concat(chunk[key], value);
		else chunk[key] = value;
		return chunk;
	} else throw new Error(`Cannot concat ${typeof first} and ${typeof second}`);
}
var AsyncGeneratorWithSetup = class {
	generator;
	setup;
	config;
	signal;
	firstResult;
	firstResultUsed = false;
	constructor(params) {
		this.generator = params.generator;
		this.config = params.config;
		this.signal = params.signal ?? this.config?.signal;
		this.setup = new Promise((resolve, reject) => {
			AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(params.config), async () => {
				this.firstResult = this.signal ? raceWithSignal(params.generator.next(), this.signal) : params.generator.next();
				if (params.startSetup) this.firstResult.then(params.startSetup).then(resolve, reject);
				else this.firstResult.then((_result) => resolve(void 0), reject);
			}, true);
		});
	}
	async next(...args) {
		this.signal?.throwIfAborted();
		if (!this.firstResultUsed) {
			this.firstResultUsed = true;
			return this.firstResult;
		}
		return AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(this.config), this.signal ? async () => {
			return raceWithSignal(this.generator.next(...args), this.signal);
		} : async () => {
			return this.generator.next(...args);
		}, true);
	}
	async return(value) {
		return this.generator.return(value);
	}
	async throw(e) {
		return this.generator.throw(e);
	}
	[Symbol.asyncIterator]() {
		return this;
	}
	async [Symbol.asyncDispose]() {
		await this.return();
	}
};
async function pipeGeneratorWithSetup(to, generator, startSetup, signal, ...args) {
	const gen = new AsyncGeneratorWithSetup({
		generator,
		startSetup,
		signal
	});
	const setup = await gen.setup;
	return {
		output: to(gen, setup, ...args),
		setup
	};
}
//#endregion
export { AsyncGeneratorWithSetup, IterableReadableStream, atee, concat, pipeGeneratorWithSetup, stream_exports };

//# sourceMappingURL=stream.js.map