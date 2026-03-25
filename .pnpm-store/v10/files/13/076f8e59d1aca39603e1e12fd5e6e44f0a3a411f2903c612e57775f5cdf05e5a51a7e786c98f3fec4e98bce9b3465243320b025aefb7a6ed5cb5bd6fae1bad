import { IterableReadableStream } from "@langchain/core/utils/stream";

//#region src/pregel/stream.ts
/**
* A wrapper around an IterableReadableStream that allows for aborting the stream when
* {@link cancel} is called.
*/
var IterableReadableStreamWithAbortSignal = class extends IterableReadableStream {
	_abortController;
	_innerReader;
	/**
	* @param readableStream - The stream to wrap.
	* @param abortController - The abort controller to use. Optional. One will be created if not provided.
	*/
	constructor(readableStream, abortController) {
		const reader = readableStream.getReader();
		const ac = abortController ?? new AbortController();
		super({ start(controller) {
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
		} });
		this._abortController = ac;
		this._innerReader = reader;
	}
	/**
	* Aborts the stream, abandoning any pending operations in progress. Calling this triggers an
	* {@link AbortSignal} that is propagated to the tasks that are producing the data for this stream.
	* @param reason - The reason for aborting the stream. Optional.
	*/
	async cancel(reason) {
		this._abortController.abort(reason);
		this._innerReader.releaseLock();
	}
	/**
	* The {@link AbortSignal} for the stream. Aborted when {@link cancel} is called.
	*/
	get signal() {
		return this._abortController.signal;
	}
};
var IterableReadableWritableStream = class extends IterableReadableStream {
	modes;
	controller;
	passthroughFn;
	_closed = false;
	get closed() {
		return this._closed;
	}
	constructor(params) {
		let streamControllerPromiseResolver;
		const streamControllerPromise = new Promise((resolve) => {
			streamControllerPromiseResolver = resolve;
		});
		super({ start: (controller) => {
			streamControllerPromiseResolver(controller);
		} });
		streamControllerPromise.then((controller) => {
			this.controller = controller;
		});
		this.passthroughFn = params.passthroughFn;
		this.modes = params.modes;
	}
	push(chunk) {
		this.passthroughFn?.(chunk);
		this.controller.enqueue(chunk);
	}
	close() {
		try {
			this.controller.close();
		} catch (e) {} finally {
			this._closed = true;
		}
	}
	error(e) {
		this.controller.error(e);
	}
};
function _stringifyAsDict(obj) {
	return JSON.stringify(obj, function(key, value) {
		const rawValue = this[key];
		if (rawValue != null && typeof rawValue === "object" && "toDict" in rawValue && typeof rawValue.toDict === "function") {
			const { type, data } = rawValue.toDict();
			return {
				...data,
				type
			};
		}
		return value;
	});
}
function _serializeError(error) {
	if (error instanceof Error) return {
		error: error.name,
		message: error.message
	};
	return {
		error: "Error",
		message: JSON.stringify(error)
	};
}
function _isRunnableConfig(config) {
	if (typeof config !== "object" || config == null) return false;
	return "configurable" in config && typeof config.configurable === "object" && config.configurable != null;
}
function _extractCheckpointFromConfig(config) {
	if (!_isRunnableConfig(config) || !config.configurable.thread_id) return null;
	return {
		thread_id: config.configurable.thread_id,
		checkpoint_ns: config.configurable.checkpoint_ns || "",
		checkpoint_id: config.configurable.checkpoint_id || null,
		checkpoint_map: config.configurable.checkpoint_map || null
	};
}
function _serializeConfig(config) {
	if (_isRunnableConfig(config)) {
		const configurable = Object.fromEntries(Object.entries(config.configurable).filter(([key]) => !key.startsWith("__")));
		const newConfig = {
			...config,
			configurable
		};
		delete newConfig.callbacks;
		return newConfig;
	}
	return config;
}
function _serializeCheckpoint(payload) {
	const result = {
		...payload,
		checkpoint: _extractCheckpointFromConfig(payload.config),
		parent_checkpoint: _extractCheckpointFromConfig(payload.parentConfig),
		config: _serializeConfig(payload.config),
		parent_config: _serializeConfig(payload.parentConfig),
		tasks: payload.tasks.map((task) => {
			if (_isRunnableConfig(task.state)) {
				const checkpoint = _extractCheckpointFromConfig(task.state);
				if (checkpoint != null) {
					const cloneTask = {
						...task,
						checkpoint
					};
					delete cloneTask.state;
					return cloneTask;
				}
			}
			return task;
		})
	};
	delete result.parentConfig;
	return result;
}
function toEventStream(stream) {
	const encoder = new TextEncoder();
	return new ReadableStream({ async start(controller) {
		const enqueueChunk = (sse) => {
			controller.enqueue(encoder.encode(`event: ${sse.event}\ndata: ${_stringifyAsDict(sse.data)}\n\n`));
		};
		try {
			for await (const payload of stream) {
				const [ns, mode, chunk] = payload;
				let data = chunk;
				if (mode === "debug") {
					const debugChunk = chunk;
					if (debugChunk.type === "checkpoint") data = {
						...debugChunk,
						payload: _serializeCheckpoint(debugChunk.payload)
					};
				}
				if (mode === "checkpoints") data = _serializeCheckpoint(chunk);
				const event = ns?.length ? `${mode}|${ns.join("|")}` : mode;
				enqueueChunk({
					event,
					data
				});
			}
		} catch (error) {
			enqueueChunk({
				event: "error",
				data: _serializeError(error)
			});
		}
		controller.close();
	} });
}

//#endregion
export { IterableReadableStreamWithAbortSignal, IterableReadableWritableStream, toEventStream };
//# sourceMappingURL=stream.js.map