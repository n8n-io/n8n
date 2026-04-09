import { MessageTupleManager, ensureMessageInstances, toMessageClass } from "./messages.js";
import { getToolCallsWithResults } from "../utils/tools.js";
import { StreamManager } from "./manager.js";
import { extractInterrupts, normalizeInterruptsList } from "./interrupts.js";
//#region src/ui/orchestrator-custom.ts
/**
* Create a custom transport thread state.
* @param values - The values to use.
* @param threadId - The ID of the thread to use.
* @returns The custom transport thread state.
*/
function createCustomTransportThreadState(values, threadId) {
	return {
		values,
		next: [],
		tasks: [],
		metadata: void 0,
		created_at: null,
		checkpoint: {
			thread_id: threadId,
			checkpoint_id: null,
			checkpoint_ns: "",
			checkpoint_map: null
		},
		parent_checkpoint: null
	};
}
/**
* Framework-agnostic orchestrator for custom transport streams.
*
* Encapsulates all business logic shared across React, Vue, Svelte, and Angular
* for custom transport (non-LGP) streaming.
*/
var CustomStreamOrchestrator = class {
	stream;
	messageManager;
	#options;
	#historyValues;
	#threadId;
	#branch = "";
	#listeners = /* @__PURE__ */ new Set();
	#version = 0;
	#streamUnsub = null;
	#disposed = false;
	/**
	* Create a new {@link CustomStreamOrchestrator} instance.
	*
	* @param options - Configuration options for the custom transport stream,
	*   including thread ID, transport, callbacks, and subagent settings.
	*/
	constructor(options) {
		this.#options = options;
		this.#threadId = options.threadId ?? null;
		this.messageManager = new MessageTupleManager();
		this.stream = new StreamManager(this.messageManager, {
			throttle: options.throttle ?? false,
			subagentToolNames: options.subagentToolNames,
			filterSubagentMessages: options.filterSubagentMessages,
			toMessage: options.toMessage ?? toMessageClass
		});
		this.#historyValues = options.initialValues ?? {};
		this.#streamUnsub = this.stream.subscribe(() => {
			this.#notify();
		});
		const historyMessages = this.#getMessages(this.#historyValues);
		if (options.filterSubagentMessages && !this.stream.isLoading && historyMessages.length > 0) this.stream.reconstructSubagents(historyMessages, { skipIfPopulated: true });
	}
	/**
	* Register a listener that is called whenever the orchestrator state changes.
	*
	* @param listener - Callback invoked on each state change.
	* @returns An unsubscribe function that removes the listener.
	*/
	subscribe = (listener) => {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	};
	/**
	* Return the current version number, incremented on each state change.
	* Useful as a cache key for external sync (e.g. `useSyncExternalStore`).
	*
	* @returns The current version counter.
	*/
	getSnapshot = () => this.#version;
	#notify() {
		if (this.#disposed) return;
		this.#version += 1;
		for (const listener of this.#listeners) listener();
	}
	/**
	* Synchronize the external thread ID with the orchestrator.
	* If the ID has changed, the current stream is cleared and listeners
	* are notified.
	*
	* @param newId - The new thread ID, or `null` to clear.
	*/
	syncThreadId(newId) {
		if (newId !== this.#threadId) {
			this.#threadId = newId;
			this.stream.clear();
			this.#notify();
		}
	}
	#getMessages = (value) => {
		const messagesKey = this.#options.messagesKey ?? "messages";
		return Array.isArray(value[messagesKey]) ? value[messagesKey] : [];
	};
	#setMessages = (current, messages) => {
		const messagesKey = this.#options.messagesKey ?? "messages";
		return {
			...current,
			[messagesKey]: messages
		};
	};
	/**
	* The current stream state values, falling back to an empty object
	* when no stream values are available.
	*/
	get values() {
		return this.stream.values ?? {};
	}
	/**
	* The raw stream state values, or `null` if no stream has been started
	* or values have not yet been received.
	*/
	get streamValues() {
		return this.stream.values;
	}
	/** The most recent stream error, or `undefined` if no error occurred. */
	get error() {
		return this.stream.error;
	}
	/** Whether a stream is currently in progress. */
	get isLoading() {
		return this.stream.isLoading;
	}
	/** The current branch identifier. */
	get branch() {
		return this.#branch;
	}
	/**
	* Update the current branch and notify listeners.
	*
	* @param value - The new branch identifier.
	*/
	setBranch(value) {
		this.#branch = value;
		this.#notify();
	}
	/**
	* All messages from the current stream values, converted to
	* {@link BaseMessage} instances. Returns an empty array when no
	* stream values are available.
	*/
	get messages() {
		if (!this.stream.values) return [];
		return ensureMessageInstances(this.#getMessages(this.stream.values));
	}
	/**
	* All tool calls paired with their results extracted from the
	* current stream messages.
	*/
	get toolCalls() {
		if (!this.stream.values) return [];
		return getToolCallsWithResults(this.#getMessages(this.stream.values));
	}
	/**
	* Get tool calls (with results) that belong to a specific AI message.
	*
	* @param message - The AI message whose tool calls to retrieve.
	* @returns Tool calls associated with the given message.
	*/
	getToolCalls(message) {
		if (!this.stream.values) return [];
		return getToolCallsWithResults(this.#getMessages(this.stream.values)).filter((tc) => tc.aiMessage.id === message.id);
	}
	/**
	* All active interrupts from the current stream values.
	* Returns a single breakpoint interrupt when the interrupt array is
	* present but empty, or an empty array when no interrupts exist.
	*/
	get interrupts() {
		if (this.stream.values != null && "__interrupt__" in this.stream.values && Array.isArray(this.stream.values.__interrupt__)) {
			const valueInterrupts = this.stream.values.__interrupt__;
			if (valueInterrupts.length === 0) return [{ when: "breakpoint" }];
			return normalizeInterruptsList(valueInterrupts);
		}
		return [];
	}
	/**
	* The first active interrupt extracted from the current stream values,
	* or `undefined` if there are no interrupts.
	*/
	get interrupt() {
		return extractInterrupts(this.stream.values);
	}
	/**
	* Retrieve stream-level metadata for a given message.
	*
	* @param message - The message to look up metadata for.
	* @param index - Optional positional index used as fallback message ID.
	* @returns The metadata associated with the message, or `undefined`
	*   if no stream metadata is available.
	*/
	getMessagesMetadata(message, index) {
		const streamMetadata = this.messageManager.get(message.id)?.metadata;
		if (streamMetadata != null) return {
			messageId: message.id ?? String(index),
			firstSeenState: void 0,
			branch: void 0,
			branchOptions: void 0,
			streamMetadata
		};
	}
	/** A map of all tracked subagent streams, keyed by tool call ID. */
	get subagents() {
		return this.stream.getSubagents();
	}
	/** The subset of subagent streams that are currently active (loading). */
	get activeSubagents() {
		return this.stream.getActiveSubagents();
	}
	/**
	* Look up a single subagent stream by its tool call ID.
	*
	* @param toolCallId - The tool call ID that initiated the subagent.
	* @returns The subagent stream, or `undefined` if not found.
	*/
	getSubagent(toolCallId) {
		return this.stream.getSubagent(toolCallId);
	}
	/**
	* Retrieve all subagent streams matching a given tool name / type.
	*
	* @param type - The subagent type (tool name) to filter by.
	* @returns An array of matching subagent streams.
	*/
	getSubagentsByType(type) {
		return this.stream.getSubagentsByType(type);
	}
	/**
	* Retrieve all subagent streams associated with a specific AI message.
	*
	* @param messageId - The ID of the parent AI message.
	* @returns An array of subagent streams linked to the message.
	*/
	getSubagentsByMessage(messageId) {
		return this.stream.getSubagentsByMessage(messageId);
	}
	/**
	* Reconstruct subagent streams from history values when subagent
	* filtering is enabled and the stream is not currently loading.
	* This is a no-op if subagents are already populated.
	*/
	reconstructSubagentsIfNeeded() {
		const hvMessages = this.#getMessages(this.#historyValues);
		if (this.#options.filterSubagentMessages && !this.stream.isLoading && hvMessages.length > 0) this.stream.reconstructSubagents(hvMessages, { skipIfPopulated: true });
	}
	/**
	* Abort the current stream and invoke the `onStop` callback
	* if one was provided in the options.
	*/
	stop() {
		this.stream.stop(this.#historyValues, { onStop: this.#options.onStop });
	}
	/**
	* Switch to a different thread. If the thread ID actually changed,
	* the current stream is cleared and listeners are notified.
	*
	* @param newThreadId - The thread ID to switch to, or `null` to clear.
	*/
	switchThread(newThreadId) {
		if (newThreadId !== this.#threadId) {
			this.#threadId = newThreadId;
			this.stream.clear();
			this.#notify();
		}
	}
	/**
	* Start a new stream run against the custom transport.
	*
	* This is the low-level submit entry point that handles thread ID
	* resolution, optimistic value merging, and transport invocation.
	* Prefer {@link submit} unless you need to bypass higher-level wrappers.
	*
	* @param values - The input values to send, or `null`/`undefined` for
	*   a resume-style invocation.
	* @param submitOptions - Optional per-call overrides such as
	*   `optimisticValues`, `config`, `command`, and error callbacks.
	*/
	async submitDirect(values, submitOptions) {
		const currentThreadId = this.#options.threadId ?? null;
		if (currentThreadId !== this.#threadId) {
			this.#threadId = currentThreadId;
			this.stream.clear();
		}
		let usableThreadId = this.#threadId ?? submitOptions?.threadId;
		this.stream.setStreamValues(() => {
			if (submitOptions?.optimisticValues != null) return {
				...this.#historyValues,
				...typeof submitOptions.optimisticValues === "function" ? submitOptions.optimisticValues(this.#historyValues) : submitOptions.optimisticValues
			};
			return { ...this.#historyValues };
		});
		await this.stream.start(async (signal) => {
			if (!usableThreadId) {
				usableThreadId = crypto.randomUUID();
				this.#threadId = usableThreadId;
				this.#options.onThreadId?.(usableThreadId);
			}
			if (!usableThreadId) throw new Error("Failed to obtain valid thread ID.");
			return this.#options.transport.stream({
				input: values,
				context: submitOptions?.context,
				command: submitOptions?.command,
				streamSubgraphs: submitOptions?.streamSubgraphs,
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
			getMessages: this.#getMessages,
			setMessages: this.#setMessages,
			initialValues: {},
			callbacks: this.#options,
			onSuccess: () => {
				if (!usableThreadId) return void 0;
				const finalValues = this.stream.values ?? this.#historyValues;
				this.#options.onFinish?.(createCustomTransportThreadState(finalValues, usableThreadId), void 0);
			},
			onError: (error) => {
				this.#options.onError?.(error, void 0);
				submitOptions?.onError?.(error, void 0);
			}
		});
	}
	/**
	* Submit input values and start a new stream run.
	*
	* Delegates to {@link submitDirect}. Override or wrap this method
	* in framework adapters to add queuing or other middleware.
	*
	* @param values - The input values to send, or `null`/`undefined` for
	*   a resume-style invocation.
	* @param submitOptions - Optional per-call overrides.
	*/
	async submit(values, submitOptions) {
		await this.submitDirect(values, submitOptions);
	}
	/**
	* Tear down the orchestrator. Marks the instance as disposed,
	* unsubscribes from the stream, and aborts any in-progress stream.
	* After calling this method, no further notifications will be emitted.
	*/
	dispose() {
		this.#disposed = true;
		this.#streamUnsub?.();
		this.#streamUnsub = null;
		this.stream.stop(this.#historyValues, { onStop: this.#options.onStop });
	}
};
//#endregion
export { CustomStreamOrchestrator };

//# sourceMappingURL=orchestrator-custom.js.map