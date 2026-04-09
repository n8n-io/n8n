"use client";
require("../_virtual/_rolldown/runtime.cjs");
const require_client = require("../client.cjs");
const require_errors = require("../ui/errors.cjs");
const require_messages = require("../ui/messages.cjs");
const require_tools = require("../utils/tools.cjs");
const require_manager = require("../ui/manager.cjs");
const require_utils = require("../ui/utils.cjs");
const require_branching = require("../ui/branching.cjs");
const require_interrupts = require("../ui/interrupts.cjs");
const require_thread = require("./thread.cjs");
let react = require("react");
//#region src/react/stream.lgp.tsx
function getFetchHistoryKey(client, threadId, limit) {
	return [
		require_client.getClientConfigHash(client),
		threadId,
		limit
	].join(":");
}
function fetchHistory(client, threadId, options) {
	if (options?.limit === false) return client.threads.getState(threadId).then((state) => {
		if (state.checkpoint == null) return [];
		return [state];
	});
	const limit = typeof options?.limit === "number" ? options.limit : 10;
	return client.threads.getHistory(threadId, { limit });
}
function useThreadHistory(client, threadId, limit, options) {
	const key = getFetchHistoryKey(client, threadId, limit);
	const [state, setState] = (0, react.useState)(() => ({
		key: void 0,
		data: void 0,
		error: void 0,
		isLoading: threadId != null
	}));
	const clientRef = (0, react.useRef)(client);
	clientRef.current = client;
	const onErrorRef = (0, react.useRef)(options?.onError);
	onErrorRef.current = options?.onError;
	const fetcher = (0, react.useCallback)((threadId, limit) => {
		if (options.passthrough) return Promise.resolve([]);
		const client = clientRef.current;
		const key = getFetchHistoryKey(client, threadId, limit);
		if (threadId != null) {
			setState((state) => {
				if (state.key === key) return {
					...state,
					isLoading: true
				};
				return {
					key,
					data: void 0,
					error: void 0,
					isLoading: true
				};
			});
			return fetchHistory(client, threadId, { limit }).then((data) => {
				setState((state) => {
					if (state.key !== key) return state;
					return {
						key,
						data,
						error: void 0,
						isLoading: false
					};
				});
				return data;
			}, (error) => {
				setState((state) => {
					if (state.key !== key) return state;
					return {
						key,
						data: state.data,
						error,
						isLoading: false
					};
				});
				onErrorRef.current?.(error);
				return Promise.reject(error);
			});
		}
		setState({
			key,
			data: void 0,
			error: void 0,
			isLoading: false
		});
		return Promise.resolve([]);
	}, [options.passthrough]);
	(0, react.useEffect)(() => {
		if (options.submittingRef.current != null && options.submittingRef.current === threadId) return;
		fetcher(threadId, limit);
	}, [fetcher, key]);
	return {
		data: state.data,
		error: state.error,
		isLoading: state.isLoading,
		mutate: (mutateId) => fetcher(mutateId ?? threadId, limit)
	};
}
function useStreamLGP(options) {
	const reconnectOnMountRef = (0, react.useRef)(options.reconnectOnMount);
	const runMetadataStorage = (0, react.useMemo)(() => {
		if (typeof window === "undefined") return null;
		const storage = reconnectOnMountRef.current;
		if (storage === true) return window.sessionStorage;
		if (typeof storage === "function") return storage();
		return null;
	}, []);
	const client = (0, react.useMemo)(() => options.client ?? new require_client.Client({
		apiUrl: options.apiUrl,
		apiKey: options.apiKey,
		callerOptions: options.callerOptions,
		defaultHeaders: options.defaultHeaders
	}), [
		options.client,
		options.apiKey,
		options.apiUrl,
		options.callerOptions,
		options.defaultHeaders
	]);
	const [messageManager] = (0, react.useState)(() => new require_messages.MessageTupleManager());
	const [stream] = (0, react.useState)(() => new require_manager.StreamManager(messageManager, {
		throttle: options.throttle ?? false,
		subagentToolNames: options.subagentToolNames,
		filterSubagentMessages: options.filterSubagentMessages
	}));
	(0, react.useSyncExternalStore)(stream.subscribe, stream.getSnapshot, stream.getSnapshot);
	const [threadId, onThreadId] = require_thread.useControllableThreadId(options);
	const trackStreamModeRef = (0, react.useRef)([]);
	const trackStreamMode = (0, react.useCallback)((...mode) => {
		const ref = trackStreamModeRef.current;
		for (const m of mode) if (!ref.includes(m)) ref.push(m);
	}, []);
	const hasUpdateListener = options.onUpdateEvent != null;
	const hasCustomListener = options.onCustomEvent != null;
	const hasLangChainListener = options.onLangChainEvent != null;
	const hasDebugListener = options.onDebugEvent != null;
	const hasCheckpointListener = options.onCheckpointEvent != null;
	const hasTaskListener = options.onTaskEvent != null;
	const hasToolListener = options.onToolEvent != null;
	const callbackStreamMode = (0, react.useMemo)(() => {
		const modes = [];
		if (hasUpdateListener) modes.push("updates");
		if (hasCustomListener) modes.push("custom");
		if (hasLangChainListener) modes.push("events");
		if (hasDebugListener) modes.push("debug");
		if (hasCheckpointListener) modes.push("checkpoints");
		if (hasTaskListener) modes.push("tasks");
		if (hasToolListener) modes.push("tools");
		return modes;
	}, [
		hasUpdateListener,
		hasCustomListener,
		hasLangChainListener,
		hasDebugListener,
		hasCheckpointListener,
		hasTaskListener,
		hasToolListener
	]);
	const threadIdRef = (0, react.useRef)(threadId);
	const threadIdStreamingRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		if (threadIdRef.current !== threadId) {
			threadIdRef.current = threadId;
			stream.clear();
		}
	}, [threadId, stream]);
	const switchThread = (0, react.useCallback)((newThreadId) => {
		if (newThreadId !== threadIdRef.current) {
			threadIdRef.current = newThreadId;
			stream.clear();
			onThreadId(newThreadId);
		}
	}, [stream, onThreadId]);
	const historyLimit = typeof options.fetchStateHistory === "object" && options.fetchStateHistory != null ? options.fetchStateHistory.limit ?? false : options.fetchStateHistory ?? false;
	const builtInHistory = useThreadHistory(client, threadId, historyLimit, {
		passthrough: options.thread != null,
		submittingRef: threadIdStreamingRef,
		onError: options.onError
	});
	const history = options.thread ?? builtInHistory;
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
	const [branch, setBranch] = (0, react.useState)("");
	const branchContext = require_branching.getBranchContext(branch, history.data ?? void 0);
	const [toolProgressMap, setToolProgressMap] = (0, react.useState)(/* @__PURE__ */ new Map());
	const handleToolEvent = (0, react.useCallback)((data) => {
		setToolProgressMap((prev) => {
			const next = new Map(prev);
			const key = data.toolCallId ?? data.name;
			const existing = next.get(key);
			switch (data.event) {
				case "on_tool_start":
					next.set(key, {
						toolCallId: data.toolCallId,
						name: data.name,
						state: "starting",
						input: data.input
					});
					break;
				case "on_tool_event":
					if (existing) next.set(key, {
						...existing,
						state: "running",
						data: data.data
					});
					break;
				case "on_tool_end":
					if (existing) next.set(key, {
						...existing,
						state: "completed",
						result: data.output
					});
					break;
				case "on_tool_error":
					if (existing) next.set(key, {
						...existing,
						state: "error",
						error: data.error
					});
					break;
				default: throw new Error(`Unexpected tool event: ${data.event}`);
			}
			return next;
		});
	}, []);
	const historyValues = branchContext.threadHead?.values ?? options.initialValues ?? {};
	const historyMessages = getMessages(historyValues);
	const shouldReconstructSubagents = options.filterSubagentMessages && !stream.isLoading && !history.isLoading && historyMessages.length > 0;
	(0, react.useEffect)(() => {
		if (shouldReconstructSubagents) {
			stream.reconstructSubagents(historyMessages, { skipIfPopulated: true });
			if (threadId) {
				const controller = new AbortController();
				stream.fetchSubagentHistory(client.threads, threadId, {
					messagesKey: options.messagesKey ?? "messages",
					signal: controller.signal
				});
				return () => controller.abort();
			}
		}
	}, [shouldReconstructSubagents, historyMessages.length]);
	const historyError = (() => {
		const error = branchContext.threadHead?.tasks?.at(-1)?.error;
		if (error == null) return void 0;
		try {
			const parsed = JSON.parse(error);
			if (require_errors.StreamError.isStructuredError(parsed)) return new require_errors.StreamError(parsed);
			return parsed;
		} catch {}
		return error;
	})();
	const messageMetadata = (() => {
		const alreadyShown = /* @__PURE__ */ new Set();
		return getMessages(historyValues).map((message, idx) => {
			const messageId = message.id ?? idx;
			const firstSeenState = require_utils.findLast(history.data ?? [], (state) => state.values != null && getMessages(state.values).map((m, idx) => m.id ?? idx).includes(messageId));
			const checkpointId = firstSeenState?.checkpoint?.checkpoint_id;
			let branch = checkpointId != null ? branchContext.branchByCheckpoint[checkpointId] : void 0;
			if (!branch?.branch?.length) branch = void 0;
			const optionsShown = branch?.branchOptions?.flat(2).join(",");
			if (optionsShown) {
				if (alreadyShown.has(optionsShown)) branch = void 0;
				alreadyShown.add(optionsShown);
			}
			return {
				messageId: messageId.toString(),
				firstSeenState,
				branch: branch?.branch,
				branchOptions: branch?.branchOptions
			};
		});
	})();
	const stop = () => stream.stop(historyValues, { onStop: (args) => {
		if (runMetadataStorage && threadId) {
			const runId = runMetadataStorage.getItem(`lg:stream:${threadId}`);
			if (runId) client.runs.cancel(threadId, runId);
			runMetadataStorage.removeItem(`lg:stream:${threadId}`);
		}
		options.onStop?.(args);
	} });
	const submit = async (values, submitOptions) => {
		setToolProgressMap(/* @__PURE__ */ new Map());
		const checkpointId = submitOptions?.checkpoint?.checkpoint_id;
		setBranch(checkpointId != null ? branchContext.branchByCheckpoint[checkpointId]?.branch ?? "" : "");
		const includeImplicitBranch = historyLimit === true || typeof historyLimit === "number";
		const shouldRefetch = includeImplicitBranch || require_utils.onFinishRequiresThreadState(options.onFinish);
		let callbackMeta;
		let rejoinKey;
		let usableThreadId = threadId;
		const shouldAbortPrevious = (submitOptions?.multitaskStrategy === "interrupt" || submitOptions?.multitaskStrategy === "rollback") && stream.isLoading;
		await stream.start(async (signal) => {
			stream.setStreamValues((values) => {
				const prev = {
					...historyValues,
					...values
				};
				if (submitOptions?.optimisticValues != null) return {
					...prev,
					...typeof submitOptions.optimisticValues === "function" ? submitOptions.optimisticValues(prev) : submitOptions.optimisticValues
				};
				return { ...prev };
			});
			if (!usableThreadId) {
				usableThreadId = (await client.threads.create({
					threadId: submitOptions?.threadId,
					metadata: submitOptions?.metadata,
					signal
				})).thread_id;
				threadIdRef.current = usableThreadId;
				threadIdStreamingRef.current = usableThreadId;
				onThreadId(usableThreadId);
			}
			if (!usableThreadId) throw new Error("Failed to obtain valid thread ID.");
			threadIdStreamingRef.current = usableThreadId;
			const streamMode = require_utils.unique([
				...submitOptions?.streamMode ?? [],
				...trackStreamModeRef.current,
				...callbackStreamMode
			]);
			let checkpoint = submitOptions?.checkpoint ?? (includeImplicitBranch ? branchContext.threadHead?.checkpoint : void 0) ?? void 0;
			if (submitOptions?.checkpoint === null) checkpoint = void 0;
			if (checkpoint != null) delete checkpoint.thread_id;
			const streamResumable = submitOptions?.streamResumable ?? !!runMetadataStorage;
			return client.runs.stream(usableThreadId, options.assistantId, {
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
				onRunCreated(params) {
					callbackMeta = {
						run_id: params.run_id,
						thread_id: params.thread_id ?? usableThreadId
					};
					if (runMetadataStorage) {
						rejoinKey = `lg:stream:${usableThreadId}`;
						runMetadataStorage.setItem(rejoinKey, callbackMeta.run_id);
					}
					options.onCreated?.(callbackMeta);
				}
			});
		}, {
			getMessages,
			setMessages,
			initialValues: historyValues,
			callbacks: {
				...options,
				onToolEvent: (data, opts) => {
					handleToolEvent(data);
					options.onToolEvent?.(data, opts);
				}
			},
			async onSuccess() {
				if (rejoinKey) runMetadataStorage?.removeItem(rejoinKey);
				if (shouldRefetch) {
					const lastHead = (await history.mutate(usableThreadId))?.at(0);
					if (lastHead) {
						options.onFinish?.(lastHead, callbackMeta);
						return null;
					}
				} else if (options.onFinish != null && !require_utils.onFinishRequiresThreadState(options.onFinish)) options.onFinish(void 0, callbackMeta);
			},
			onError(error) {
				options.onError?.(error, callbackMeta);
			},
			onFinish() {
				threadIdStreamingRef.current = null;
			}
		}, { abortPrevious: shouldAbortPrevious });
	};
	const joinStream = async (runId, lastEventId, joinOptions) => {
		setToolProgressMap(/* @__PURE__ */ new Map());
		lastEventId ??= "-1";
		if (!threadId) return;
		const callbackMeta = {
			thread_id: threadId,
			run_id: runId
		};
		const shouldRefetchJoin = historyLimit === true || typeof historyLimit === "number" || require_utils.onFinishRequiresThreadState(options.onFinish);
		await stream.start(async (signal) => {
			threadIdStreamingRef.current = threadId;
			const stream = client.runs.joinStream(threadId, runId, {
				signal,
				lastEventId,
				streamMode: joinOptions?.streamMode
			});
			return joinOptions?.filter != null ? require_utils.filterStream(stream, joinOptions.filter) : stream;
		}, {
			getMessages,
			setMessages,
			initialValues: historyValues,
			callbacks: {
				...options,
				onToolEvent: (data, opts) => {
					handleToolEvent(data);
					options.onToolEvent?.(data, opts);
				}
			},
			async onSuccess() {
				runMetadataStorage?.removeItem(`lg:stream:${threadId}`);
				if (!shouldRefetchJoin) {
					if (options.onFinish != null && !require_utils.onFinishRequiresThreadState(options.onFinish)) options.onFinish(void 0, callbackMeta);
					return;
				}
				const lastHead = (await history.mutate(threadId))?.at(0);
				if (lastHead) options.onFinish?.(lastHead, callbackMeta);
			},
			onError(error) {
				options.onError?.(error, callbackMeta);
			},
			onFinish() {
				threadIdStreamingRef.current = null;
			}
		});
	};
	const reconnectKey = (0, react.useMemo)(() => {
		if (!runMetadataStorage || stream.isLoading) return void 0;
		if (typeof window === "undefined") return void 0;
		const runId = runMetadataStorage?.getItem(`lg:stream:${threadId}`);
		if (!runId) return void 0;
		return {
			runId,
			threadId
		};
	}, [
		runMetadataStorage,
		stream.isLoading,
		threadId
	]);
	const shouldReconnect = !!runMetadataStorage;
	const reconnectRef = (0, react.useRef)({
		threadId,
		shouldReconnect
	});
	const joinStreamRef = (0, react.useRef)(joinStream);
	joinStreamRef.current = joinStream;
	(0, react.useEffect)(() => {
		if (reconnectRef.current.threadId !== threadId) reconnectRef.current = {
			threadId,
			shouldReconnect
		};
	}, [threadId, shouldReconnect]);
	(0, react.useEffect)(() => {
		if (reconnectKey && reconnectRef.current.shouldReconnect) {
			reconnectRef.current.shouldReconnect = false;
			joinStreamRef.current?.(reconnectKey.runId);
		}
	}, [reconnectKey]);
	const error = stream.error ?? historyError ?? history.error;
	const values = stream.values ?? historyValues;
	return {
		get values() {
			trackStreamMode("values");
			return values;
		},
		client,
		assistantId: options.assistantId,
		error,
		isLoading: stream.isLoading,
		stop,
		submit,
		switchThread,
		joinStream,
		branch,
		setBranch,
		get history() {
			if (historyLimit === false) throw new Error("`fetchStateHistory` must be set to `true` to use `history`");
			return branchContext.flatHistory;
		},
		isThreadLoading: history.isLoading && history.data == null,
		get experimental_branchTree() {
			if (historyLimit === false) throw new Error("`fetchStateHistory` must be set to `true` to use `experimental_branchTree`");
			return branchContext.branchTree;
		},
		get interrupts() {
			if (values != null && "__interrupt__" in values && Array.isArray(values.__interrupt__)) {
				const valueInterrupts = values.__interrupt__;
				if (valueInterrupts.length === 0) return [{ when: "breakpoint" }];
				return require_interrupts.normalizeInterruptsList(valueInterrupts);
			}
			if (stream.isLoading) return [];
			const allInterrupts = (branchContext.threadHead?.tasks ?? []).flatMap((t) => t.interrupts ?? []);
			if (allInterrupts.length > 0) return require_interrupts.normalizeInterruptsList(allInterrupts);
			if (!(branchContext.threadHead?.next ?? []).length || error != null) return [];
			return [{ when: "breakpoint" }];
		},
		get interrupt() {
			const all = this.interrupts;
			if (all.length === 0) return void 0;
			if (all.length === 1) return all[0];
			return all;
		},
		get messages() {
			trackStreamMode("messages-tuple", "values");
			return getMessages(values);
		},
		get toolCalls() {
			trackStreamMode("messages-tuple", "values");
			return require_tools.getToolCallsWithResults(getMessages(values));
		},
		get toolProgress() {
			trackStreamMode("tools");
			return Array.from(toolProgressMap.values());
		},
		getToolCalls(message) {
			trackStreamMode("messages-tuple", "values");
			return require_tools.getToolCallsWithResults(getMessages(values)).filter((tc) => tc.aiMessage.id === message.id);
		},
		getMessagesMetadata(message, index) {
			trackStreamMode("values");
			const streamMetadata = messageManager.get(message.id)?.metadata;
			const historyMetadata = messageMetadata?.find((m) => m.messageId === (message.id ?? index));
			if (streamMetadata != null || historyMetadata != null) return {
				...historyMetadata,
				streamMetadata
			};
		},
		get subagents() {
			trackStreamMode("updates", "messages-tuple");
			return stream.getSubagents();
		},
		get activeSubagents() {
			trackStreamMode("updates", "messages-tuple");
			return stream.getActiveSubagents();
		},
		getSubagent(toolCallId) {
			trackStreamMode("updates", "messages-tuple");
			return stream.getSubagent(toolCallId);
		},
		getSubagentsByType(type) {
			trackStreamMode("updates", "messages-tuple");
			return stream.getSubagentsByType(type);
		},
		getSubagentsByMessage(messageId) {
			trackStreamMode("updates", "messages-tuple");
			return stream.getSubagentsByMessage(messageId);
		}
	};
}
//#endregion
exports.useStreamLGP = useStreamLGP;

//# sourceMappingURL=stream.lgp.cjs.map