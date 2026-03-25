"use client";
import { BytesLineDecoder, SSEDecoder } from "../utils/sse.js";
import { IterableReadableStream } from "../utils/stream.js";
import { MessageTupleManager } from "../ui/messages.js";
import { getToolCallsWithResults } from "../utils/tools.js";
import { StreamManager } from "../ui/manager.js";
import { useControllableThreadId } from "./thread.js";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
//#region src/react/stream.custom.tsx
var FetchStreamTransport = class {
	constructor(options) {
		this.options = options;
	}
	async stream(payload) {
		const { signal, ...body } = payload;
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
		const response = await (this.options.fetch ?? fetch)(this.options.apiUrl, requestInit);
		if (!response.ok) throw new Error(`Failed to stream: ${response.statusText}`);
		const stream = (response.body || new ReadableStream({ start: (ctrl) => ctrl.close() })).pipeThrough(BytesLineDecoder()).pipeThrough(SSEDecoder());
		return IterableReadableStream.fromReadableStream(stream);
	}
};
function useStreamCustom(options) {
	const [messageManager] = useState(() => new MessageTupleManager());
	const [stream] = useState(() => new StreamManager(messageManager, {
		throttle: options.throttle ?? false,
		subagentToolNames: options.subagentToolNames,
		filterSubagentMessages: options.filterSubagentMessages
	}));
	useSyncExternalStore(stream.subscribe, stream.getSnapshot, stream.getSnapshot);
	const [threadId, onThreadId] = useControllableThreadId(options);
	const threadIdRef = useRef(threadId);
	useEffect(() => {
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
	const historyMessages = getMessages(historyValues);
	const shouldReconstructSubagents = options.filterSubagentMessages && !stream.isLoading && historyMessages.length > 0;
	useEffect(() => {
		if (shouldReconstructSubagents) stream.reconstructSubagents(historyMessages, { skipIfPopulated: true });
	}, [shouldReconstructSubagents, historyMessages.length]);
	const stop = () => stream.stop(historyValues, { onStop: options.onStop });
	const submit = async (values, submitOptions) => {
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
				options.onError?.(error, void 0);
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
		get interrupts() {
			if (stream.values != null && "__interrupt__" in stream.values && Array.isArray(stream.values.__interrupt__)) {
				const valueInterrupts = stream.values.__interrupt__;
				if (valueInterrupts.length === 0) return [{ when: "breakpoint" }];
				return valueInterrupts;
			}
			return [];
		},
		get interrupt() {
			const all = this.interrupts;
			if (all.length === 0) return void 0;
			if (all.length === 1) return all[0];
			return all;
		},
		get messages() {
			if (!stream.values) return [];
			return getMessages(stream.values);
		},
		get toolCalls() {
			if (!stream.values) return [];
			return getToolCallsWithResults(getMessages(stream.values));
		},
		getToolCalls(message) {
			if (!stream.values) return [];
			return getToolCallsWithResults(getMessages(stream.values)).filter((tc) => tc.aiMessage.id === message.id);
		},
		get subagents() {
			return stream.getSubagents();
		},
		get activeSubagents() {
			return stream.getActiveSubagents();
		},
		getSubagent(toolCallId) {
			return stream.getSubagent(toolCallId);
		},
		getSubagentsByType(type) {
			return stream.getSubagentsByType(type);
		},
		getSubagentsByMessage(messageId) {
			return stream.getSubagentsByMessage(messageId);
		}
	};
}
//#endregion
export { FetchStreamTransport, useStreamCustom };

//# sourceMappingURL=stream.custom.js.map