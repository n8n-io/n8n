const require_errors = require("./errors.cjs");
const require_messages = require("./messages.cjs");
const require_subagents = require("./subagents.cjs");
var StreamManager = class {
	abortRef = new AbortController();
	messages;
	subagentManager;
	listeners = /* @__PURE__ */ new Set();
	throttle;
	filterSubagentMessages;
	toMessage;
	queue = Promise.resolve();
	queueSize = 0;
	state;
	constructor(messages, options) {
		this.messages = messages;
		this.state = {
			isLoading: false,
			values: null,
			error: void 0,
			version: 0
		};
		this.throttle = options.throttle;
		this.filterSubagentMessages = options.filterSubagentMessages ?? false;
		this.toMessage = options.toMessage ?? require_messages.toMessageDict;
		this.subagentManager = new require_subagents.SubagentManager({
			subagentToolNames: options.subagentToolNames,
			onSubagentChange: () => this.bumpVersion(),
			toMessage: this.toMessage
		});
	}
	/**
	* Increment version counter to trigger React re-renders.
	* Called when subagent state changes.
	*/
	bumpVersion = () => {
		this.state = {
			...this.state,
			version: this.state.version + 1
		};
		this.notifyListeners();
	};
	/**
	* Get all subagents as a Map.
	*/
	getSubagents() {
		return this.subagentManager.getSubagents();
	}
	/**
	* Get all currently running subagents.
	*/
	getActiveSubagents() {
		return this.subagentManager.getActiveSubagents();
	}
	/**
	* Get a specific subagent by tool call ID.
	*/
	getSubagent(toolCallId) {
		return this.subagentManager.getSubagent(toolCallId);
	}
	/**
	* Get all subagents of a specific type.
	*/
	getSubagentsByType(type) {
		return this.subagentManager.getSubagentsByType(type);
	}
	/**
	* Get all subagents triggered by a specific AI message.
	*/
	getSubagentsByMessage(messageId) {
		return this.subagentManager.getSubagentsByMessage(messageId);
	}
	/**
	* Reconstruct subagent state from historical messages.
	*
	* This method should be called when loading thread history to restore
	* subagent visualization after:
	* - Page refresh (when stream has already completed)
	* - Loading thread history
	* - Navigating between threads
	*
	* @param messages - Array of messages from thread history
	* @param options - Optional configuration
	* @param options.skipIfPopulated - If true, skip reconstruction if subagents already exist
	*/
	reconstructSubagents(messages, options) {
		this.subagentManager.reconstructFromMessages(messages, options);
	}
	/**
	* Fetch and restore internal messages for reconstructed subagents from their
	* subgraph checkpoints. Should be called after `reconstructSubagents` to
	* restore the full subagent conversation after a page refresh.
	*
	* Subagent messages are persisted in the LangGraph checkpointer under a
	* subgraph-specific `checkpoint_ns` (e.g. `tools:<uuid>`). This method
	* discovers the correct namespace by inspecting the main thread's intermediate
	* history checkpoints, where each pending task's `checkpoint.checkpoint_ns`
	* identifies the subgraph. Tasks are matched to tool calls by their Send index
	* (`task.path[1]`), which corresponds to the order of tool calls in the AI
	* message — no deepagent-specific metadata required.
	*
	* @param threads - Client with a `getHistory` method (e.g. `client.threads`)
	* @param threadId - The parent thread ID
	* @param options - Optional configuration
	* @param options.messagesKey - Key in state values containing messages (default: "messages")
	* @param options.signal - AbortSignal to cancel in-flight requests on effect cleanup
	*/
	async fetchSubagentHistory(threads, threadId, options) {
		const messagesKey = options?.messagesKey ?? "messages";
		const signal = options?.signal;
		/**
		* Bail immediately if already cancelled (React Strict Mode cleanup)
		*/
		if (signal?.aborted) return;
		/**
		* Only fetch for subagents that have no messages (reconstructed from history)
		*/
		const toFetch = [...this.subagentManager.getSubagents().entries()].filter(([, s]) => s.messages.length === 0);
		/**
		* Bail immediately if there are no subagents to fetch
		*/
		if (toFetch.length === 0) return;
		/**
		* Step 1: Discover subgraph namespaces from intermediate history
		*
		* When LangGraph dispatches parallel tool calls (v2 mode), each is a
		* separate Send task with a unique UUID-based checkpoint_ns. The intermediate
		* history checkpoints record these as `tasks[i]` where:
		*   - `tasks[i].checkpoint.checkpoint_ns` = "tools:<uuid>" for each subgraph
		*   - `tasks[i].path = ["__pregel_push", sendIndex]` matches tool_calls order
		*
		* By matching task Send index → tool_call position in the AI message we can
		* derive the subgraph namespace for every tool call without any external
		* metadata on the ToolMessage itself.
		*/
		let toolCallIdToNamespace;
		try {
			/**
			* Fetch enough history to include the intermediate checkpoint where
			* tool-call tasks were pending (typically within the last 10 checkpoints).
			*/
			const mainHistory = await threads.getHistory(threadId, {
				limit: 20,
				signal
			});
			for (const checkpoint of mainHistory) {
				const { tasks } = checkpoint;
				if (!tasks || tasks.length === 0) continue;
				/**
				* When a completed checkpoint contains task results, each task.result
				* has a ToolMessage whose tool_call_id directly and unambiguously maps
				* the task to the LLM tool call that triggered it. This is more robust
				* than positional alignment: it works even when a step mixes subagent
				* tool calls with other tool calls, and requires no assumptions about
				* the ordering of tasks vs tool_calls.
				*
				* LangGraph v2 dispatches each parallel tool call as a separate PUSH
				* task ("__pregel_push"). The subgraph checkpoint_ns is constructed as
				* `task.name + ":" + task.id`, mirroring algo.ts:
				*   taskCheckpointNamespace = checkpointNamespace + ":" + taskId
				*   where checkpointNamespace = task.name for root-level tasks.
				*
				* task.checkpoint is always null for completed tasks, so we derive the
				* namespace from task.name + task.id rather than task.checkpoint.checkpoint_ns.
				*/
				const directMap = /* @__PURE__ */ new Map();
				for (const task of tasks) {
					if (!Array.isArray(task.path) || task.path[0] !== "__pregel_push" || typeof task.id !== "string" || typeof task.name !== "string") continue;
					/**
					* Read tool_call_id directly from the task's result ToolMessage.
					*/
					const resultMessages = task.result?.messages;
					if (Array.isArray(resultMessages)) for (const msg of resultMessages) {
						const m = msg;
						if (m.type === "tool" && typeof m.tool_call_id === "string" && toFetch.some(([id]) => id === m.tool_call_id)) directMap.set(m.tool_call_id, `${task.name}:${task.id}`);
					}
				}
				if (directMap.size > 0) {
					toolCallIdToNamespace = directMap;
					break;
				}
				/**
				* Fallback for checkpoints where task results are not yet populated
				* (tasks are still pending). Use positional alignment via the Send
				* index in task.path[1] as a secondary strategy.
				*/
				const pushTasks = tasks.filter((t) => Array.isArray(t.path) && t.path[0] === "__pregel_push" && typeof t.path[1] === "number" && typeof t.id === "string" && typeof t.name === "string");
				if (pushTasks.length === 0) continue;
				/**
				* Find the AI message with subagent tool calls to align by Send index.
				*/
				const msgs = checkpoint.values[messagesKey];
				if (!Array.isArray(msgs)) continue;
				let aiMessage;
				for (let i = msgs.length - 1; i >= 0; i -= 1) {
					const m = msgs[i];
					if (m.type === "ai" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0 && m.tool_calls.some((tc) => this.subagentManager.isSubagentToolCall(tc.name))) {
						aiMessage = m;
						break;
					}
				}
				if (!aiMessage) continue;
				/**
				* Only consider subagent tool calls from the AI message — not all tool
				* calls. This ensures regular tool calls (searchWeb, queryDatabase, etc.)
				* are never mistaken for subagents even when they appear in the same step.
				*/
				const subagentToolCalls = aiMessage.tool_calls.filter((tc) => this.subagentManager.isSubagentToolCall(tc.name));
				if (subagentToolCalls.length === 0) continue;
				/**
				* Sort push tasks by Send index (path[1]) to align with tool_calls order
				*/
				const sorted = [...pushTasks].sort((a, b) => {
					return (Array.isArray(a.path) ? a.path[1] : 0) - (Array.isArray(b.path) ? b.path[1] : 0);
				});
				toolCallIdToNamespace = /* @__PURE__ */ new Map();
				for (let i = 0; i < sorted.length && i < subagentToolCalls.length; i += 1) {
					const tc = subagentToolCalls[i];
					const task = sorted[i];
					if (tc?.id && task.id && task.name) toolCallIdToNamespace.set(tc.id, `${task.name}:${task.id}`);
				}
				if (toolCallIdToNamespace.size > 0) break;
			}
		} catch {}
		/**
		* Step 2: Fetch each subagent's conversation from its subgraph checkpoint
		*/
		await Promise.all(toFetch.map(async ([toolCallId, subagent]) => {
			/**
			* Priority order for the subgraph checkpoint_ns:
			*   1. Derived from main thread's intermediate task list (preferred, no coupling)
			*   2. Already on the subagent's namespace (e.g. populated during streaming)
			*   3. Skip — we cannot reliably identify the namespace
			*/
			const checkpointNs = toolCallIdToNamespace?.get(toolCallId) ?? (subagent.namespace.length > 0 ? subagent.namespace.join("|") : void 0);
			if (!checkpointNs) return;
			try {
				/**
				* If the HTTP request was cancelled mid-flight the getHistory call
				* would have thrown an AbortError (caught below). If we reach here the
				* fetch completed successfully, so always process the result.
				*/
				const latestState = (await threads.getHistory(threadId, {
					checkpoint: { checkpoint_ns: checkpointNs },
					limit: 1,
					signal
				}))[0];
				if (!latestState?.values) return;
				const messages = latestState.values[messagesKey];
				if (!Array.isArray(messages) || messages.length === 0) return;
				/**
				* Normalize messages: promote tool_calls from additional_kwargs to top
				* level when the checkpointer serialized them in the legacy format.
				*/
				const normalizedMessages = messages.map((msg) => {
					const m = msg;
					if (m.type === "ai" && (!m.tool_calls || m.tool_calls.length === 0)) {
						const legacy = m.additional_kwargs?.tool_calls;
						if (Array.isArray(legacy) && legacy.length > 0) return {
							...m,
							tool_calls: legacy
						};
					}
					return m;
				});
				this.subagentManager.updateSubagentFromSubgraphState(toolCallId, normalizedMessages, latestState.values);
			} catch {}
		}));
	}
	/**
	* Check if any subagents are currently tracked.
	*/
	hasSubagents() {
		return this.subagentManager.hasSubagents();
	}
	setState = (newState) => {
		this.state = {
			...this.state,
			...newState
		};
		this.notifyListeners();
	};
	notifyListeners = () => {
		this.listeners.forEach((listener) => listener());
	};
	subscribe = (listener) => {
		if (this.throttle === false) {
			this.listeners.add(listener);
			return () => this.listeners.delete(listener);
		}
		const timeoutMs = this.throttle === true ? 0 : this.throttle;
		let timeoutId;
		const throttledListener = () => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				clearTimeout(timeoutId);
				listener();
			}, timeoutMs);
		};
		this.listeners.add(throttledListener);
		return () => {
			clearTimeout(timeoutId);
			this.listeners.delete(throttledListener);
		};
	};
	getSnapshot = () => this.state;
	get isLoading() {
		return this.state.isLoading;
	}
	get values() {
		return this.state.values?.[0] ?? null;
	}
	get error() {
		return this.state.error;
	}
	setStreamValues = (values, kind = "stream") => {
		if (typeof values === "function") {
			const [prevValues, prevKind] = this.state.values ?? [null, "stream"];
			const nextValues = values(prevValues, prevKind);
			this.setState({ values: nextValues != null ? [nextValues, kind] : null });
		} else {
			const nextValues = values != null ? [values, kind] : null;
			this.setState({ values: nextValues });
		}
	};
	getMutateFn = (kind, historyValues) => {
		return (update) => {
			const stateValues = (this.state.values ?? [null, "stream"])[0];
			const prev = {
				...historyValues,
				...stateValues
			};
			const next = typeof update === "function" ? update(prev) : update;
			this.setStreamValues({
				...prev,
				...next
			}, kind);
		};
	};
	matchEventType = (expected, actual, _data) => {
		return expected === actual || actual.startsWith(`${expected}|`);
	};
	enqueue = async (action, options) => {
		try {
			this.queueSize = Math.max(0, this.queueSize - 1);
			this.setState({
				isLoading: true,
				error: void 0
			});
			this.abortRef = new AbortController();
			const run = await action(this.abortRef.signal);
			let streamError;
			for await (const { event, data } of run) {
				if (event === "error") {
					streamError = new require_errors.StreamError(data);
					break;
				}
				const namespace = event.includes("|") ? event.split("|").slice(1) : void 0;
				const mutate = this.getMutateFn("stream", options.initialValues);
				if (event === "metadata") options.callbacks.onMetadataEvent?.(data);
				if (event === "events") options.callbacks.onLangChainEvent?.(data);
				if (this.matchEventType("updates", event, data)) {
					options.callbacks.onUpdateEvent?.(data, {
						namespace,
						mutate
					});
					if (namespace && require_subagents.isSubagentNamespace(namespace)) {
						const namespaceId = require_subagents.extractToolCallIdFromNamespace(namespace);
						if (namespaceId && this.filterSubagentMessages) this.subagentManager.markRunningFromNamespace(namespaceId, namespace);
					}
					if (!namespace || !require_subagents.isSubagentNamespace(namespace)) {
						const updateData = data;
						for (const nodeData of Object.values(updateData)) if (nodeData && typeof nodeData === "object" && "messages" in nodeData) {
							const { messages } = nodeData;
							if (Array.isArray(messages)) for (const msg of messages) {
								if (!msg || typeof msg !== "object") continue;
								const msgObj = msg;
								if (msgObj.type === "ai" && "tool_calls" in msgObj && Array.isArray(msgObj.tool_calls)) this.subagentManager.registerFromToolCalls(msgObj.tool_calls, msgObj.id);
								if (msgObj.type === "tool" && "tool_call_id" in msgObj && typeof msgObj.tool_call_id === "string") {
									const content = typeof msgObj.content === "string" ? msgObj.content : JSON.stringify(msgObj.content);
									const status = "status" in msgObj && msgObj.status === "error" ? "error" : "success";
									this.subagentManager.processToolMessage(msgObj.tool_call_id, content, status);
								}
							}
						}
					}
				}
				if (this.matchEventType("custom", event, data)) options.callbacks.onCustomEvent?.(data, {
					namespace,
					mutate
				});
				if (this.matchEventType("checkpoints", event, data)) options.callbacks.onCheckpointEvent?.(data, { namespace });
				if (this.matchEventType("tasks", event, data)) options.callbacks.onTaskEvent?.(data, { namespace });
				if (this.matchEventType("debug", event, data)) options.callbacks.onDebugEvent?.(data, { namespace });
				if (this.matchEventType("tools", event, data)) options.callbacks.onToolEvent?.(data, {
					namespace,
					mutate
				});
				if (event === "values" || event.startsWith("values|")) if (namespace && require_subagents.isSubagentNamespace(namespace)) {
					const namespaceId = require_subagents.extractToolCallIdFromNamespace(namespace);
					if (namespaceId && this.filterSubagentMessages) {
						const valuesData = data;
						const messages = valuesData.messages;
						if (Array.isArray(messages) && messages.length > 0) {
							const firstMsg = messages[0];
							if (firstMsg?.type === "human" && typeof firstMsg?.content === "string") this.subagentManager.matchSubgraphToSubagent(namespaceId, firstMsg.content);
						}
						this.subagentManager.updateSubagentValues(namespaceId, valuesData);
					}
				} else if (data && typeof data === "object" && "__interrupt__" in data) {
					const interruptData = data;
					this.setStreamValues((prev) => ({
						...prev,
						...interruptData
					}));
				} else this.setStreamValues(data);
				if (this.matchEventType("messages", event, data)) {
					const [serialized, metadata] = data;
					const rawCheckpointNs = metadata?.langgraph_checkpoint_ns || metadata?.checkpoint_ns;
					const checkpointNs = typeof rawCheckpointNs === "string" ? rawCheckpointNs : void 0;
					const isFromSubagent = require_subagents.isSubagentNamespace(checkpointNs);
					const toolCallId = isFromSubagent ? require_subagents.extractToolCallIdFromNamespace(checkpointNs?.split("|")) : void 0;
					if (this.filterSubagentMessages && isFromSubagent && toolCallId) {
						this.subagentManager.addMessageToSubagent(toolCallId, serialized, metadata);
						continue;
					}
					const messageId = this.messages.add(serialized, metadata);
					if (!messageId) {
						console.warn("Failed to add message to manager, no message ID found");
						continue;
					}
					this.setStreamValues((streamValues) => {
						const values = {
							...options.initialValues,
							...streamValues
						};
						let messages = options.getMessages(values).slice();
						const { chunk, index } = this.messages.get(messageId, messages.length) ?? {};
						if (!chunk || index == null) return values;
						if (chunk.getType() === "remove") if (chunk.id === "__remove_all__") messages = [];
						else messages.splice(index, 1);
						else {
							const msgDict = this.toMessage(chunk);
							messages[index] = msgDict;
							if (!isFromSubagent && msgDict.type === "ai" && "tool_calls" in msgDict && Array.isArray(msgDict.tool_calls)) this.subagentManager.registerFromToolCalls(msgDict.tool_calls, msgDict.id);
							if (!isFromSubagent && msgDict.type === "tool" && "tool_call_id" in msgDict) {
								const tcId = msgDict.tool_call_id;
								const content = typeof msgDict.content === "string" ? msgDict.content : JSON.stringify(msgDict.content);
								const status = "status" in msgDict && msgDict.status === "error" ? "error" : "success";
								this.subagentManager.processToolMessage(tcId, content, status);
							}
						}
						return options.setMessages(values, messages);
					});
				}
			}
			if (streamError != null) throw streamError;
			if (!this.abortRef.signal.aborted) {
				const values = await options.onSuccess?.();
				if (typeof values !== "undefined" && this.queueSize === 0) this.setStreamValues(values);
			}
		} catch (error) {
			if (!(error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))) {
				console.error(error);
				this.setState({ error });
				await options.onError?.(error);
			}
		} finally {
			this.setState({ isLoading: false });
			this.abortRef = new AbortController();
			options.onFinish?.();
		}
	};
	start = async (action, options, startOptions) => {
		if (startOptions?.abortPrevious) this.abortRef.abort();
		this.queueSize += 1;
		const queued = this.queue.then(() => this.enqueue(action, options));
		this.queue = queued;
		await queued;
	};
	stop = async (historyValues, options) => {
		this.abortRef.abort();
		this.abortRef = new AbortController();
		options.onStop?.({ mutate: this.getMutateFn("stop", historyValues) });
	};
	clear = () => {
		this.abortRef.abort();
		this.abortRef = new AbortController();
		this.setState({
			error: void 0,
			values: null,
			isLoading: false
		});
		this.messages.clear();
		this.subagentManager.clear();
	};
};
//#endregion
exports.StreamManager = StreamManager;

//# sourceMappingURL=manager.cjs.map