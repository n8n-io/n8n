"use client";


const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_sse = require('../utils/sse.cjs');
const require_stream = require('../utils/stream.cjs');
const require_messages = require('../ui/messages.cjs');
const require_manager = require('../ui/manager.cjs');
const require_thread = require('./thread.cjs');
const react = require_rolldown_runtime.__toESM(require("react"));

//#region src/react/stream.custom.tsx
var FetchStreamTransport = class {
	constructor(options) {
		this.options = options;
	}
	async stream(payload) {
		const { signal,...body } = payload;
		let requestInit = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.options.defaultHeaders
			},
			body: JSON.stringify(body),
			signal
		};
		if (this.options.onRequest) requestInit = await this.options.onRequest(this.options.apiUrl, requestInit);
		const fetchFn = this.options.fetch ?? fetch;
		const response = await fetchFn(this.options.apiUrl, requestInit);
		if (!response.ok) throw new Error(`Failed to stream: ${response.statusText}`);
		const stream = (response.body || new ReadableStream({ start: (ctrl) => ctrl.close() })).pipeThrough(require_sse.BytesLineDecoder()).pipeThrough(require_sse.SSEDecoder());
		return require_stream.IterableReadableStream.fromReadableStream(stream);
	}
};
function useStreamCustom(options) {
	const [messageManager] = (0, react.useState)(() => new require_messages.MessageTupleManager());
	const [stream] = (0, react.useState)(() => new require_manager.StreamManager(messageManager));
	(0, react.useSyncExternalStore)(stream.subscribe, stream.getSnapshot, stream.getSnapshot);
	const [threadId, onThreadId] = require_thread.useControllableThreadId(options);
	const threadIdRef = (0, react.useRef)(threadId);
	(0, react.useEffect)(() => {
		if (threadIdRef.current !== threadId) {
			threadIdRef.current = threadId;
			stream.clear();
		}
	}, [threadId, stream]);
	const getMessages = (value) => {
		const messagesKey = options.messagesKey ?? "messages";
		return Array.isArray(value[messagesKey]) ? value[messagesKey] : [];
	};
	const setMessages = (current, messages) => {
		const messagesKey = options.messagesKey ?? "messages";
		return {
			...current,
			[messagesKey]: messages
		};
	};
	const historyValues = options.initialValues ?? {};
	const stop = () => stream.stop(historyValues, { onStop: options.onStop });
	const submit = async (values, submitOptions) => {
		let callbackMeta;
		let usableThreadId = threadId;
		stream.setStreamValues(() => {
			if (submitOptions?.optimisticValues != null) return {
				...historyValues,
				...typeof submitOptions.optimisticValues === "function" ? submitOptions.optimisticValues(historyValues) : submitOptions.optimisticValues
			};
			return { ...historyValues };
		});
		await stream.start(async (signal) => {
			if (!usableThreadId) {
				usableThreadId = crypto.randomUUID();
				threadIdRef.current = usableThreadId;
				onThreadId(usableThreadId);
			}
			if (!usableThreadId) throw new Error("Failed to obtain valid thread ID.");
			return options.transport.stream({
				input: values,
				context: submitOptions?.context,
				command: submitOptions?.command,
				signal,
				config: {
					...submitOptions?.config,
					configurable: {
						thread_id: usableThreadId,
						...submitOptions?.config?.configurable
					}
				}
			});
		}, {
			getMessages,
			setMessages,
			initialValues: {},
			callbacks: options,
			onSuccess: () => void 0,
			onError(error) {
				options.onError?.(error, callbackMeta);
			}
		});
	};
	return {
		get values() {
			return stream.values ?? {};
		},
		error: stream.error,
		isLoading: stream.isLoading,
		stop,
		submit,
		get interrupt() {
			if (stream.values != null && "__interrupt__" in stream.values && Array.isArray(stream.values.__interrupt__)) {
				const valueInterrupts = stream.values.__interrupt__;
				if (valueInterrupts.length === 0) return { when: "breakpoint" };
				if (valueInterrupts.length === 1) return valueInterrupts[0];
				return valueInterrupts;
			}
			return void 0;
		},
		get messages() {
			if (!stream.values) return [];
			return getMessages(stream.values);
		}
	};
}

//#endregion
exports.FetchStreamTransport = FetchStreamTransport;
exports.useStreamCustom = useStreamCustom;
//# sourceMappingURL=stream.custom.cjs.map