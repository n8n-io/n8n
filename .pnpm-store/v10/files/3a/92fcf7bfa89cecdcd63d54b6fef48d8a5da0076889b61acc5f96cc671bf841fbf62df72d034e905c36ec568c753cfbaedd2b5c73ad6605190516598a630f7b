const require_errors = require("./errors.cjs");
const require_messages = require("./messages.cjs");
const require_tools = require("../utils/tools.cjs");
const require_manager = require("./manager.cjs");
const require_utils = require("./utils.cjs");
const require_branching = require("./branching.cjs");
const require_interrupts = require("./interrupts.cjs");
const require_queue = require("./queue.cjs");
//#region src/ui/orchestrator.ts
/**
* Fetch the history of a thread.
* @param client - The client to use.
* @param threadId - The ID of the thread to fetch the history of.
* @param options - The options to use.
* @returns The history of the thread.
*/
function fetchHistory(client, threadId, options) {
	if (options?.limit === false) return client.threads.getState(threadId).then((state) => {
		if (state.checkpoint == null) return [];
		return [state];
	});
	const limit = typeof options?.limit === "number" ? options.limit : 10;
	return client.threads.getHistory(threadId, { limit });
}
/**
* Resolve the run metadata storage.
* @param reconnectOnMount - The reconnect on mount option.
* @returns The run metadata storage.
*/
function resolveRunMetadataStorage(reconnectOnMount) {
	if (typeof globalThis.window === "undefined") return null;
	if (reconnectOnMount === true) return globalThis.window.sessionStorage;
	if (typeof reconnectOnMount === "function") return reconnectOnMount();
	return null;
}
/**
* Resolve the callback stream modes.
* @param options - The options to use.
* @returns The callback stream modes.
*/
function resolveCallbackStreamModes(options) {
	const modes = [];
	if (options.onUpdateEvent) modes.push("updates");
	if (options.onCustomEvent) modes.push("custom");
	if (options.onCheckpointEvent) modes.push("checkpoints");
	if (options.onTaskEvent) modes.push("tasks");
	if ("onDebugEvent" in options && options.onDebugEvent) modes.push("debug");
	if ("onLangChainEvent" in options && options.onLangChainEvent) modes.push("events");
	return modes;
}
/**
* Framework-agnostic orchestrator for LangGraph Platform streams.
*
* Encapsulates all business logic shared across React, Vue, Svelte, and Angular:
* thread management, history fetching, stream lifecycle, queue management,
* branching, subagent management, and auto-reconnect.
*
* Framework adapters subscribe to state changes via {@link subscribe} and
* map the orchestrator's getters to framework-specific reactive primitives.
*/
var StreamOrchestrator = class {
	stream;
	messageManager;
	pendingRuns;
	#options;
	#accessors;
	historyLimit;
	#runMetadataStorage;
	#callbackStreamModes;
	#trackedStreamModes = [];
	#threadId;
	#threadIdPromise = null;
	#threadIdStreaming = null;
	#history;
	#branch = "";
	#submitting = false;
	#listeners = /* @__PURE__ */ new Set();
	#version = 0;
	#streamUnsub = null;
	#queueUnsub = null;
	#disposed = false;
	/**
	* Create a new StreamOrchestrator.
	*
	* @param options - Configuration options for the stream, including callbacks,
	*   throttle settings, reconnect behaviour, and subagent filters.
	* @param accessors - Framework-specific accessors that resolve reactive
	*   primitives (client, assistant ID, messages key) at call time.
	*/
	constructor(options, accessors) {
		this.#options = options;
		this.#accessors = accessors;
		this.#runMetadataStorage = resolveRunMetadataStorage(options.reconnectOnMount);
		this.#callbackStreamModes = resolveCallbackStreamModes(options);
		this.historyLimit = typeof options.fetchStateHistory === "object" && options.fetchStateHistory != null ? options.fetchStateHistory.limit ?? false : options.fetchStateHistory ?? false;
		this.messageManager = new require_messages.MessageTupleManager();
		this.stream = new require_manager.StreamManager(this.messageManager, {
			throttle: options.throttle ?? false,
			subagentToolNames: options.subagentToolNames,
			filterSubagentMessages: options.filterSubagentMessages,
			toMessage: options.toMessage ?? require_messages.toMessageClass
		});
		this.pendingRuns = new require_queue.PendingRunsTracker();
		this.#threadId = void 0;
		this.#history = {
			data: void 0,
			error: void 0,
			isLoading: false,
			mutate: this.#mutate
		};
		this.#streamUnsub = this.stream.subscribe(() => {
			this.#notify();
		});
		this.#queueUnsub = this.pendingRuns.subscribe(() => {
			this.#notify();
		});
	}
	/**
	* Register a listener that is called whenever the orchestrator's internal
	* state changes (stream updates, queue changes, history mutations, etc.).
	*
	* @param listener - Callback invoked on every state change.
	* @returns An unsubscribe function that removes the listener.
	*/
	subscribe(listener) {
		this.#listeners.add(listener);
		return () => {
			this.#listeners.delete(listener);
		};
	}
	/**
	* Return the current version number, incremented on every state change.
	* Useful as a React `useSyncExternalStore` snapshot.
	*
	* @returns The current monotonically increasing version counter.
	*/
	getSnapshot() {
		return this.#version;
	}
	/**
	* Increment the version counter and invoke all registered listeners.
	* No-op if the orchestrator has been disposed.
	*/
	#notify() {
		if (this.#disposed) return;
		this.#version += 1;
		for (const listener of this.#listeners) listener();
	}
	/**
	* The current thread ID, or `undefined` if no thread is active.
	*/
	get threadId() {
		return this.#threadId;
	}
	/**
	* Update thread ID from an external source (e.g. reactive prop change).
	* Clears the current stream and triggers a history fetch.
	* @param newId - The new thread ID to set.
	* @returns The new thread ID.
	*/
	setThreadId(newId) {
		if (newId === this.#threadId) return;
		this.#threadId = newId;
		this.stream.clear();
		this.#fetchHistoryForThread(newId);
		this.#notify();
	}
	/**
	* Update the thread ID from within a submit flow. Sets both the
	* streaming and canonical thread IDs, fires the `onThreadId` callback,
	* and notifies listeners.
	*
	* @param newId - The newly created or resolved thread ID.
	*/
	#setThreadIdFromSubmit(newId) {
		this.#threadIdStreaming = newId;
		this.#threadId = newId;
		this.#options.onThreadId?.(newId);
		this.#notify();
	}
	#fetchHistoryForThread(threadId) {
		if (this.#threadIdStreaming != null && this.#threadIdStreaming === threadId) return;
		if (threadId != null) {
			this.#history = {
				...this.#history,
				isLoading: true,
				mutate: this.#mutate
			};
			this.#notify();
			this.#mutate(threadId);
		} else {
			this.#history = {
				data: void 0,
				error: void 0,
				isLoading: false,
				mutate: this.#mutate
			};
			this.#notify();
		}
	}
	/**
	* The current thread history fetch state, including data, loading status,
	* error, and a {@link UseStreamThread.mutate | mutate} function to
	* manually re-fetch.
	*/
	get historyData() {
		return this.#history;
	}
	async #mutate(mutateId) {
		const tid = mutateId ?? this.#threadId;
		if (!tid) return void 0;
		try {
			const data = await fetchHistory(this.#accessors.getClient(), tid, { limit: this.historyLimit });
			this.#history = {
				data,
				error: void 0,
				isLoading: false,
				mutate: this.#mutate
			};
			this.#notify();
			return data;
		} catch (err) {
			this.#history = {
				...this.#history,
				error: err,
				isLoading: false
			};
			this.#notify();
			this.#options.onError?.(err, void 0);
			return;
		}
	}
	/**
	* Trigger initial history fetch for the current thread ID.
	* Should be called once after construction when the initial threadId is known.
	*/
	initThreadId(threadId) {
		this.#threadId = threadId;
		this.#fetchHistoryForThread(threadId);
	}
	/**
	* The currently active branch identifier. An empty string represents
	* the main (default) branch.
	*/
	get branch() {
		return this.#branch;
	}
	/**
	* Set the active branch and notify listeners if the value changed.
	*
	* @param value - The branch identifier to switch to.
	*/
	setBranch(value) {
		if (value === this.#branch) return;
		this.#branch = value;
		this.#notify();
	}
	/**
	* Derived branch context computed from the current branch and thread
	* history. Contains the thread head, branch tree, and checkpoint-to-branch
	* mapping for the active branch.
	*/
	get branchContext() {
		return require_branching.getBranchContext(this.#branch, this.#history.data ?? void 0);
	}
	#getMessages(value) {
		const messagesKey = this.#accessors.getMessagesKey();
		return Array.isArray(value[messagesKey]) ? value[messagesKey] : [];
	}
	#setMessages(current, messages) {
		const messagesKey = this.#accessors.getMessagesKey();
		return {
			...current,
			[messagesKey]: messages
		};
	}
	/**
	* The state values from the thread head of the current branch history,
	* falling back to {@link AnyStreamOptions.initialValues | initialValues}
	* or an empty object.
	*/
	get historyValues() {
		return this.branchContext.threadHead?.values ?? this.#options.initialValues ?? {};
	}
	/**
	* The error from the last task in the thread head, if any.
	* Attempts to parse structured {@link StreamError} instances from JSON.
	*/
	get historyError() {
		const error = this.branchContext.threadHead?.tasks?.at(-1)?.error;
		if (error == null) return void 0;
		try {
			const parsed = JSON.parse(error);
			if (require_errors.StreamError.isStructuredError(parsed)) return new require_errors.StreamError(parsed);
			return parsed;
		} catch {}
		return error;
	}
	/**
	* The latest state values received from the active stream, or `null` if
	* no stream is running or no values have been received yet.
	*/
	get streamValues() {
		return this.stream.values;
	}
	/**
	* The error from the active stream, if one occurred during streaming.
	*/
	get streamError() {
		return this.stream.error;
	}
	/**
	* The merged state values, preferring live stream values over history.
	* This is the primary way to read the current thread state.
	*/
	get values() {
		return this.stream.values ?? this.historyValues;
	}
	/**
	* The first available error from the stream, history, or thread fetch.
	* Returns `undefined` when no error is present.
	*/
	get error() {
		return this.stream.error ?? this.historyError ?? this.#history.error;
	}
	/**
	* Whether the stream is currently active and receiving events.
	*/
	get isLoading() {
		return this.stream.isLoading;
	}
	/**
	* The messages array extracted from the current {@link values} using the
	* configured messages key.
	*/
	get messages() {
		return this.#getMessages(this.values);
	}
	/**
	* The current messages converted to LangChain {@link BaseMessage} instances.
	* Automatically tracks the `"messages-tuple"` stream mode.
	*/
	get messageInstances() {
		this.trackStreamMode("messages-tuple");
		return require_messages.ensureMessageInstances(this.messages);
	}
	/**
	* All tool calls with their corresponding results extracted from
	* the current messages. Automatically tracks the `"messages-tuple"`
	* stream mode.
	*/
	get toolCalls() {
		this.trackStreamMode("messages-tuple");
		return require_tools.getToolCallsWithResults(this.#getMessages(this.values));
	}
	/**
	* Get tool calls with results for a specific AI message.
	* Automatically tracks the `"messages-tuple"` stream mode.
	*
	* @param message - The AI message to extract tool calls from.
	* @returns Tool calls whose AI message ID matches the given message.
	*/
	getToolCalls(message) {
		this.trackStreamMode("messages-tuple");
		return require_tools.getToolCallsWithResults(this.#getMessages(this.values)).filter((tc) => tc.aiMessage.id === message.id);
	}
	/**
	* All active interrupts for the current thread state.
	* Returns an empty array when the stream is loading or no interrupts
	* are present. Falls back to a `{ when: "breakpoint" }` sentinel when
	* there are pending next nodes but no explicit interrupt data.
	*/
	get interrupts() {
		const v = this.values;
		if (v != null && "__interrupt__" in v && Array.isArray(v.__interrupt__)) {
			const valueInterrupts = v.__interrupt__;
			if (valueInterrupts.length === 0) return [{ when: "breakpoint" }];
			return require_interrupts.normalizeInterruptsList(valueInterrupts);
		}
		if (this.isLoading) return [];
		const allInterrupts = (this.branchContext.threadHead?.tasks ?? []).flatMap((t) => t.interrupts ?? []);
		if (allInterrupts.length > 0) return require_interrupts.normalizeInterruptsList(allInterrupts);
		if (!(this.branchContext.threadHead?.next ?? []).length || this.error != null) return [];
		return [{ when: "breakpoint" }];
	}
	/**
	* The single most relevant interrupt for the current thread state,
	* or `undefined` if no interrupt is active. Convenience accessor that
	* delegates to {@link extractInterrupts}.
	*/
	get interrupt() {
		return require_interrupts.extractInterrupts(this.values, {
			isLoading: this.isLoading,
			threadState: this.branchContext.threadHead,
			error: this.error
		});
	}
	/**
	* Flattened history messages as LangChain {@link BaseMessage} instances,
	* ordered chronologically across all branch checkpoints.
	*
	* @throws If `fetchStateHistory` was not enabled in the options.
	*/
	get flatHistory() {
		if (this.historyLimit === false) throw new Error("`fetchStateHistory` must be set to `true` to use `history`");
		return require_messages.ensureHistoryMessageInstances(this.branchContext.flatHistory, this.#accessors.getMessagesKey());
	}
	/**
	* Whether the initial thread history is still being loaded and no data
	* is available yet. Returns `false` once the first fetch completes.
	*/
	get isThreadLoading() {
		return this.#history.isLoading && this.#history.data == null;
	}
	/**
	* The full branch tree structure for the current thread history.
	*
	* @experimental This API may change in future releases.
	* @throws If `fetchStateHistory` was not enabled in the options.
	*/
	get experimental_branchTree() {
		if (this.historyLimit === false) throw new Error("`fetchStateHistory` must be set to `true` to use `experimental_branchTree`");
		return this.branchContext.branchTree;
	}
	/**
	* A map of metadata entries for all messages, derived from history
	* and branch context. Used internally by {@link getMessagesMetadata}.
	*/
	get messageMetadata() {
		return require_branching.getMessagesMetadataMap({
			initialValues: this.#options.initialValues,
			history: this.#history.data,
			getMessages: (value) => this.#getMessages(value),
			branchContext: this.branchContext
		});
	}
	/**
	* Look up metadata for a specific message, merging stream-time metadata
	* with history-derived metadata.
	*
	* @param message - The message to look up metadata for.
	* @param index - Optional positional index used as a fallback identifier.
	* @returns The merged metadata, or `undefined` if none is available.
	*/
	getMessagesMetadata(message, index) {
		const streamMetadata = this.messageManager.get(message.id)?.metadata;
		const historyMetadata = this.messageMetadata?.find((m) => m.messageId === (message.id ?? index));
		if (streamMetadata != null || historyMetadata != null) return {
			...historyMetadata,
			streamMetadata
		};
	}
	/**
	* The list of pending run entries currently waiting in the queue.
	*/
	get queueEntries() {
		return this.pendingRuns.entries;
	}
	/**
	* The number of pending runs in the queue.
	*/
	get queueSize() {
		return this.pendingRuns.size;
	}
	/**
	* Cancel and remove a specific pending run from the queue.
	* If the run exists and a thread is active, the run is also cancelled
	* on the server.
	*
	* @param id - The run ID to cancel.
	* @returns `true` if the run was found and removed, `false` otherwise.
	*/
	async cancelQueueItem(id) {
		const tid = this.#threadId;
		const removed = this.pendingRuns.remove(id);
		if (removed && tid) await this.#accessors.getClient().runs.cancel(tid, id);
		return removed;
	}
	/**
	* Remove all pending runs from the queue and cancel them on the server.
	*/
	async clearQueue() {
		const tid = this.#threadId;
		const removed = this.pendingRuns.removeAll();
		if (tid && removed.length > 0) await Promise.all(removed.map((e) => this.#accessors.getClient().runs.cancel(tid, e.id)));
	}
	/**
	* A map of all known subagent stream interfaces, keyed by tool call ID.
	*/
	get subagents() {
		return this.stream.getSubagents();
	}
	/**
	* The subset of subagents that are currently active (streaming).
	*/
	get activeSubagents() {
		return this.stream.getActiveSubagents();
	}
	/**
	* Retrieve a specific subagent stream interface by its tool call ID.
	*
	* @param toolCallId - The tool call ID that spawned the subagent.
	* @returns The subagent interface, or `undefined` if not found.
	*/
	getSubagent(toolCallId) {
		return this.stream.getSubagent(toolCallId);
	}
	/**
	* Retrieve all subagent stream interfaces that match a given agent type.
	*
	* @param type - The agent type name to filter by.
	* @returns An array of matching subagent interfaces.
	*/
	getSubagentsByType(type) {
		return this.stream.getSubagentsByType(type);
	}
	/**
	* Retrieve all subagent stream interfaces associated with a specific
	* AI message.
	*
	* @param messageId - The ID of the parent AI message.
	* @returns An array of subagent interfaces spawned by that message.
	*/
	getSubagentsByMessage(messageId) {
		return this.stream.getSubagentsByMessage(messageId);
	}
	/**
	* Reconstruct subagents from history messages if applicable.
	* Call this when history finishes loading and the stream isn't active.
	* Returns an AbortController for cancelling the subagent history fetch,
	* or null if no reconstruction was needed.
	*/
	reconstructSubagentsIfNeeded() {
		const hvMessages = this.#getMessages(this.historyValues);
		if (!(this.#options.filterSubagentMessages && !this.isLoading && !this.#history.isLoading && hvMessages.length > 0)) return null;
		this.stream.reconstructSubagents(hvMessages, { skipIfPopulated: true });
		const tid = this.#threadId;
		if (tid) {
			const controller = new AbortController();
			this.stream.fetchSubagentHistory(this.#accessors.getClient().threads, tid, {
				messagesKey: this.#accessors.getMessagesKey(),
				signal: controller.signal
			});
			return controller;
		}
		return null;
	}
	/**
	* Register additional stream modes that should be included in future
	* stream requests. Modes are deduplicated automatically.
	*
	* @param modes - One or more stream modes to track.
	*/
	trackStreamMode(...modes) {
		for (const mode of modes) if (!this.#trackedStreamModes.includes(mode)) this.#trackedStreamModes.push(mode);
	}
	/**
	* Stop the currently active stream. If reconnect metadata storage is
	* configured, also cancels the run on the server and cleans up stored
	* run metadata.
	*/
	stop() {
		this.stream.stop(this.historyValues, { onStop: (args) => {
			if (this.#runMetadataStorage && this.#threadId) {
				const runId = this.#runMetadataStorage.getItem(`lg:stream:${this.#threadId}`);
				if (runId) this.#accessors.getClient().runs.cancel(this.#threadId, runId);
				this.#runMetadataStorage.removeItem(`lg:stream:${this.#threadId}`);
			}
			this.#options.onStop?.(args);
		} });
	}
	/**
	* Join an existing run's event stream by run ID. Used for reconnecting
	* to in-progress runs or consuming queued runs.
	*
	* @param runId - The ID of the run to join.
	* @param lastEventId - The last event ID received, for resuming mid-stream.
	*   Defaults to `"-1"` (start from the beginning).
	* @param joinOptions - Additional options for stream mode and event filtering.
	*/
	async joinStream(runId, lastEventId, joinOptions) {
		lastEventId ??= "-1";
		const tid = this.#threadId;
		if (!tid) return;
		this.#threadIdStreaming = tid;
		const callbackMeta = {
			thread_id: tid,
			run_id: runId
		};
		const shouldRefetchJoin = this.historyLimit === true || typeof this.historyLimit === "number" || require_utils.onFinishRequiresThreadState(this.#options.onFinish);
		const client = this.#accessors.getClient();
		await this.stream.start(async (signal) => {
			const rawStream = client.runs.joinStream(tid, runId, {
				signal,
				lastEventId,
				streamMode: joinOptions?.streamMode
			});
			return joinOptions?.filter != null ? require_utils.filterStream(rawStream, joinOptions.filter) : rawStream;
		}, {
			getMessages: (value) => this.#getMessages(value),
			setMessages: (current, messages) => this.#setMessages(current, messages),
			initialValues: this.historyValues,
			callbacks: this.#options,
			onSuccess: async () => {
				this.#runMetadataStorage?.removeItem(`lg:stream:${tid}`);
				if (!shouldRefetchJoin) {
					if (this.#options.onFinish != null && !require_utils.onFinishRequiresThreadState(this.#options.onFinish)) this.#options.onFinish(void 0, callbackMeta);
					return;
				}
				const lastHead = (await this.#mutate(tid))?.at(0);
				if (lastHead) this.#options.onFinish?.(lastHead, callbackMeta);
			},
			onError: (error) => {
				this.#options.onError?.(error, callbackMeta);
			},
			onFinish: () => {
				this.#threadIdStreaming = null;
			}
		});
	}
	/**
	* Submit input values directly to the LangGraph Platform, creating a new
	* thread if necessary. Starts a streaming run and processes events until
	* completion. Unlike {@link submit}, this does not handle queueing — if
	* a stream is already active, a concurrent run will be started.
	*
	* @param values - The state values to send as run input.
	* @param submitOptions - Optional configuration for the run (config,
	*   checkpoint, multitask strategy, optimistic values, etc.).
	*/
	submitDirect(values, submitOptions) {
		const currentBranchContext = this.branchContext;
		const checkpointId = submitOptions?.checkpoint?.checkpoint_id;
		this.#branch = checkpointId != null ? currentBranchContext.branchByCheckpoint[checkpointId]?.branch ?? "" : "";
		const includeImplicitBranch = this.historyLimit === true || typeof this.historyLimit === "number";
		const shouldRefetch = includeImplicitBranch || require_utils.onFinishRequiresThreadState(this.#options.onFinish);
		let checkpoint = submitOptions?.checkpoint ?? (includeImplicitBranch ? currentBranchContext.threadHead?.checkpoint : void 0) ?? void 0;
		if (submitOptions?.checkpoint === null) checkpoint = void 0;
		if (checkpoint != null) delete checkpoint.thread_id;
		let callbackMeta;
		let rejoinKey;
		let usableThreadId;
		const client = this.#accessors.getClient();
		const assistantId = this.#accessors.getAssistantId();
		return this.stream.start(async (signal) => {
			usableThreadId = this.#threadId;
			if (usableThreadId) this.#threadIdStreaming = usableThreadId;
			if (!usableThreadId) {
				const threadPromise = client.threads.create({
					threadId: submitOptions?.threadId,
					metadata: submitOptions?.metadata
				});
				this.#threadIdPromise = threadPromise.then((t) => t.thread_id);
				usableThreadId = (await threadPromise).thread_id;
				this.#setThreadIdFromSubmit(usableThreadId);
			}
			const streamMode = require_utils.unique([
				"values",
				"updates",
				...submitOptions?.streamMode ?? [],
				...this.#trackedStreamModes,
				...this.#callbackStreamModes
			]);
			this.stream.setStreamValues(() => {
				const prev = {
					...this.historyValues,
					...this.stream.values
				};
				if (submitOptions?.optimisticValues != null) return {
					...prev,
					...typeof submitOptions.optimisticValues === "function" ? submitOptions.optimisticValues(prev) : submitOptions.optimisticValues
				};
				return { ...prev };
			});
			const streamResumable = submitOptions?.streamResumable ?? !!this.#runMetadataStorage;
			return client.runs.stream(usableThreadId, assistantId, {
				input: values,
				config: submitOptions?.config,
				context: submitOptions?.context,
				command: submitOptions?.command,
				interruptBefore: submitOptions?.interruptBefore,
				interruptAfter: submitOptions?.interruptAfter,
				metadata: submitOptions?.metadata,
				multitaskStrategy: submitOptions?.multitaskStrategy,
				onCompletion: submitOptions?.onCompletion,
				onDisconnect: submitOptions?.onDisconnect ?? (streamResumable ? "continue" : "cancel"),
				signal,
				checkpoint,
				streamMode,
				streamSubgraphs: submitOptions?.streamSubgraphs,
				streamResumable,
				durability: submitOptions?.durability,
				onRunCreated: (params) => {
					callbackMeta = {
						run_id: params.run_id,
						thread_id: params.thread_id ?? usableThreadId
					};
					if (this.#runMetadataStorage) {
						rejoinKey = `lg:stream:${usableThreadId}`;
						this.#runMetadataStorage.setItem(rejoinKey, callbackMeta.run_id);
					}
					this.#options.onCreated?.(callbackMeta);
				}
			});
		}, {
			getMessages: (value) => this.#getMessages(value),
			setMessages: (current, messages) => this.#setMessages(current, messages),
			initialValues: this.historyValues,
			callbacks: this.#options,
			onSuccess: async () => {
				if (rejoinKey) this.#runMetadataStorage?.removeItem(rejoinKey);
				if (shouldRefetch && usableThreadId) {
					const lastHead = (await this.#mutate(usableThreadId))?.at(0);
					if (lastHead) {
						this.#options.onFinish?.(lastHead, callbackMeta);
						return null;
					}
				} else if (this.#options.onFinish != null && !require_utils.onFinishRequiresThreadState(this.#options.onFinish)) this.#options.onFinish(void 0, callbackMeta);
			},
			onError: (error) => {
				this.#options.onError?.(error, callbackMeta);
				submitOptions?.onError?.(error, callbackMeta);
			},
			onFinish: () => {
				this.#threadIdStreaming = null;
			}
		});
	}
	#drainQueue() {
		if (!this.isLoading && !this.#submitting && this.pendingRuns.size > 0) {
			const next = this.pendingRuns.shift();
			if (next) {
				this.#submitting = true;
				this.joinStream(next.id).finally(() => {
					this.#submitting = false;
					this.#drainQueue();
				});
			}
		}
	}
	/**
	* Trigger queue draining. Framework adapters should call this
	* when isLoading or queue size changes.
	*/
	drainQueue() {
		this.#drainQueue();
	}
	/**
	* Submit input values with automatic queue management. If a stream is
	* already active, the run is enqueued (unless the multitask strategy
	* is `"interrupt"` or `"rollback"`, in which case the current run is
	* replaced). Queued runs are drained sequentially via {@link drainQueue}.
	*
	* @param values - The state values to send as run input.
	* @param submitOptions - Optional configuration for the run.
	* @returns The result of {@link submitDirect} if the run was started
	*   immediately, or `void` if the run was enqueued.
	*/
	async submit(values, submitOptions) {
		if (this.stream.isLoading || this.#submitting) {
			if (submitOptions?.multitaskStrategy === "interrupt" || submitOptions?.multitaskStrategy === "rollback") {
				this.#submitting = true;
				try {
					await this.submitDirect(values, submitOptions);
				} finally {
					this.#submitting = false;
				}
				return;
			}
			let usableThreadId = this.#threadId;
			if (!usableThreadId && this.#threadIdPromise) usableThreadId = await this.#threadIdPromise;
			if (usableThreadId) {
				const client = this.#accessors.getClient();
				const assistantId = this.#accessors.getAssistantId();
				try {
					const run = await client.runs.create(usableThreadId, assistantId, {
						input: values,
						config: submitOptions?.config,
						context: submitOptions?.context,
						command: submitOptions?.command,
						interruptBefore: submitOptions?.interruptBefore,
						interruptAfter: submitOptions?.interruptAfter,
						metadata: submitOptions?.metadata,
						multitaskStrategy: "enqueue",
						streamResumable: true,
						streamSubgraphs: submitOptions?.streamSubgraphs,
						durability: submitOptions?.durability
					});
					this.pendingRuns.add({
						id: run.run_id,
						values,
						options: submitOptions,
						createdAt: new Date(run.created_at)
					});
				} catch (error) {
					this.#options.onError?.(error, void 0);
					submitOptions?.onError?.(error, void 0);
				}
				return;
			}
		}
		this.#submitting = true;
		const result = this.submitDirect(values, submitOptions);
		Promise.resolve(result).finally(() => {
			this.#submitting = false;
			this.#drainQueue();
		});
		return result;
	}
	/**
	* Switch to a different thread (or clear the current thread).
	* Clears the active stream, cancels all queued runs on the previous
	* thread, fetches history for the new thread, and notifies the
	* {@link AnyStreamOptions.onThreadId | onThreadId} callback.
	*
	* @param newThreadId - The thread ID to switch to, or `null` to clear.
	*/
	switchThread(newThreadId) {
		if (newThreadId !== (this.#threadId ?? null)) {
			const prevThreadId = this.#threadId;
			this.#threadId = newThreadId ?? void 0;
			this.stream.clear();
			const removed = this.pendingRuns.removeAll();
			if (prevThreadId && removed.length > 0) {
				const client = this.#accessors.getClient();
				Promise.all(removed.map((e) => client.runs.cancel(prevThreadId, e.id)));
			}
			this.#fetchHistoryForThread(this.#threadId);
			if (newThreadId != null) this.#options.onThreadId?.(newThreadId);
			this.#notify();
		}
	}
	/**
	* Attempt to reconnect to a previously running stream.
	* Returns true if a reconnection was initiated.
	*/
	tryReconnect() {
		if (this.#runMetadataStorage && this.#threadId) {
			const runId = this.#runMetadataStorage.getItem(`lg:stream:${this.#threadId}`);
			if (runId) {
				this.joinStream(runId);
				return true;
			}
		}
		return false;
	}
	/**
	* Whether reconnect-on-mount behaviour is enabled (i.e. run metadata
	* storage is available).
	*/
	get shouldReconnect() {
		return !!this.#runMetadataStorage;
	}
	/**
	* Tear down the orchestrator: stop the active stream, remove all
	* internal subscriptions, and mark the instance as disposed.
	* After calling this method, the orchestrator should not be reused.
	*/
	dispose() {
		this.#disposed = true;
		this.#streamUnsub?.();
		this.#queueUnsub?.();
		this.#streamUnsub = null;
		this.#queueUnsub = null;
		this.stop();
	}
};
//#endregion
exports.StreamOrchestrator = StreamOrchestrator;

//# sourceMappingURL=orchestrator.cjs.map