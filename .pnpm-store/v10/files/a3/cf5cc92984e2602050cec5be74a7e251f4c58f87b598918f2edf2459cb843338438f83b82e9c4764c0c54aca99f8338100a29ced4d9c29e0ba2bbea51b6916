import { BaseStore } from "./base.js";

//#region src/store/batch.ts
/**
* Extracts and returns the underlying store from an `AsyncBatchedStore`,
* or returns the input if it is not an `AsyncBatchedStore`.
*/
const extractStore = (input) => {
	if ("lg_name" in input && input.lg_name === "AsyncBatchedStore") return input.store;
	return input;
};
var AsyncBatchedStore = class extends BaseStore {
	lg_name = "AsyncBatchedStore";
	store;
	queue = /* @__PURE__ */ new Map();
	nextKey = 0;
	running = false;
	processingTask = null;
	constructor(store) {
		super();
		this.store = extractStore(store);
	}
	get isRunning() {
		return this.running;
	}
	/**
	* @ignore
	* Batch is not implemented here as we're only extending `BaseStore`
	* to allow it to be passed where `BaseStore` is expected, and implement
	* the convenience methods (get, search, put, delete).
	*/
	async batch(_operations) {
		throw new Error("The `batch` method is not implemented on `AsyncBatchedStore`.\n Instead, it calls the `batch` method on the wrapped store.\n If you are seeing this error, something is wrong.");
	}
	async get(namespace, key) {
		return this.enqueueOperation({
			namespace,
			key
		});
	}
	async search(namespacePrefix, options) {
		const { filter, limit = 10, offset = 0, query } = options || {};
		return this.enqueueOperation({
			namespacePrefix,
			filter,
			limit,
			offset,
			query
		});
	}
	async put(namespace, key, value) {
		return this.enqueueOperation({
			namespace,
			key,
			value
		});
	}
	async delete(namespace, key) {
		return this.enqueueOperation({
			namespace,
			key,
			value: null
		});
	}
	start() {
		if (!this.running) {
			this.running = true;
			this.processingTask = this.processBatchQueue();
		}
	}
	async stop() {
		this.running = false;
		if (this.processingTask) await this.processingTask;
	}
	enqueueOperation(operation) {
		return new Promise((resolve, reject) => {
			const key = this.nextKey;
			this.nextKey += 1;
			this.queue.set(key, {
				operation,
				resolve,
				reject
			});
		});
	}
	async processBatchQueue() {
		while (this.running) {
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			if (this.queue.size === 0) continue;
			const batch = new Map(this.queue);
			this.queue.clear();
			try {
				const operations = Array.from(batch.values()).map(({ operation }) => operation);
				const results = await this.store.batch(operations);
				batch.forEach(({ resolve }, key) => {
					const index = Array.from(batch.keys()).indexOf(key);
					resolve(results[index]);
				});
			} catch (e) {
				batch.forEach(({ reject }) => {
					reject(e);
				});
			}
		}
	}
	toJSON() {
		return {
			queue: this.queue,
			nextKey: this.nextKey,
			running: this.running,
			store: "[LangGraphStore]"
		};
	}
};

//#endregion
export { AsyncBatchedStore };
//# sourceMappingURL=batch.js.map