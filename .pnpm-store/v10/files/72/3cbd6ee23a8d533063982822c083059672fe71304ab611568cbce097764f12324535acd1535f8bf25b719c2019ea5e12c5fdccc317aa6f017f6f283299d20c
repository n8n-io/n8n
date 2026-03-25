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