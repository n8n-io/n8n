"use client";


const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_client = require('../client.cjs');
const require_utils = require('../ui/utils.cjs');
const require_errors = require('../ui/errors.cjs');
const require_branching = require('../ui/branching.cjs');
const require_messages = require('../ui/messages.cjs');
const require_manager = require('../ui/manager.cjs');
const require_thread = require('./thread.cjs');
const react = require_rolldown_runtime.__toESM(require("react"));

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
	const fetcher = (0, react.useCallback)((threadId$1, limit$1) => {
		if (options.passthrough) return Promise.resolve([]);
		const client$1 = clientRef.current;
		const key$1 = getFetchHistoryKey(client$1, threadId$1, limit$1);
		if (threadId$1 != null) {
			setState((state$1) => {
				if (state$1.key === key$1) return {
					...state$1,
					isLoading: true
				};
				return {
					key: key$1,
					data: void 0,
					error: void 0,
					isLoading: true
				};
			});
			return fetchHistory(client$1, threadId$1, { limit: limit$1 }).then((data) => {
				setState((state$1) => {
					if (state$1.key !== key$1) return state$1;
					return {
						key: key$1,
						data,
						error: void 0,
						isLoading: false
					};
				});
				return data;
			}, (error) => {
				setState((state$1) => {
					if (state$1.key !== key$1) return state$1;
					return {
						key: key$1,
						data: state$1.data,
						error,
						isLoading: false
					};
				});
				onErrorRef.current?.(error);
				return Promise.reject(error);
			});
		}
		setState({
			key: key$1,
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
	const [stream] = (0, react.useState)(() => new require_manager.StreamManager(messageManager));
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
	const callbackStreamMode = (0, react.useMemo)(() => {
		const modes = [];
		if (hasUpdateListener) modes.push("updates");
		if (hasCustomListener) modes.push("custom");
		if (hasLangChainListener) modes.push("events");
		if (hasDebugListener) modes.push("debug");
		if (hasCheckpointListener) modes.push("checkpoints");
		if (hasTaskListener) modes.push("tasks");
		return modes;
	}, [
		hasUpdateListener,
		hasCustomListener,
		hasLangChainListener,
		hasDebugListener,
		hasCheckpointListener,
		hasTaskListener
	]);
	const clearCallbackRef = (0, react.useRef)(null);
	clearCallbackRef.current = stream.clear;
	const threadIdRef = (0, react.useRef)(threadId);
	const threadIdStreamingRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		if (threadIdRef.current !== threadId) {
			threadIdRef.current = threadId;
			stream.clear();
		}
	}, [threadId, stream]);
	const historyLimit = typeof options.fetchStateHistory === "object" && options.fetchStateHistory != null ? options.fetchStateHistory.limit ?? false : options.fetchStateHistory ?? false;
	const builtInHistory = useThreadHistory(client, threadId, historyLimit, {
		passthrough: options.experimental_thread != null,
		submittingRef: threadIdStreamingRef,
		onError: options.onError
	});
	const history = options.experimental_thread ?? builtInHistory;
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
	const historyValues = branchContext.threadHead?.values ?? options.initialValues ?? {};
	const historyError = (() => {
		const error$1 = branchContext.threadHead?.tasks?.at(-1)?.error;
		if (error$1 == null) return void 0;
		try {
			const parsed = JSON.parse(error$1);
			if (require_errors.StreamError.isStructuredError(parsed)) return new require_errors.StreamError(parsed);
			return parsed;
		} catch {}
		return error$1;
	})();
	const messageMetadata = (() => {
		const alreadyShown = /* @__PURE__ */ new Set();
		return getMessages(historyValues).map((message, idx) => {
			const messageId = message.id ?? idx;
			const firstSeenState = require_utils.findLast(history.data ?? [], (state) => getMessages(state.values).map((m, idx$1) => m.id ?? idx$1).includes(messageId));
			const checkpointId = firstSeenState?.checkpoint?.checkpoint_id;
			let branch$1 = checkpointId != null ? branchContext.branchByCheckpoint[checkpointId] : void 0;
			if (!branch$1?.branch?.length) branch$1 = void 0;
			const optionsShown = branch$1?.branchOptions?.flat(2).join(",");
			if (optionsShown) {
				if (alreadyShown.has(optionsShown)) branch$1 = void 0;
				alreadyShown.add(optionsShown);
			}
			return {
				messageId: messageId.toString(),
				firstSeenState,
				branch: branch$1?.branch,
				branchOptions: branch$1?.branchOptions
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
	const submit = async (values$1, submitOptions) => {
		const checkpointId = submitOptions?.checkpoint?.checkpoint_id;
		setBranch(checkpointId != null ? branchContext.branchByCheckpoint[checkpointId]?.branch ?? "" : "");
		const includeImplicitBranch = historyLimit === true || typeof historyLimit === "number";
		const shouldRefetch = options.onFinish != null || includeImplicitBranch;
		stream.setStreamValues(() => {
			const prev = shouldRefetch ? historyValues : {
				...historyValues,
				...stream.values
			};
			if (submitOptions?.optimisticValues != null) return {
				...prev,
				...typeof submitOptions.optimisticValues === "function" ? submitOptions.optimisticValues(prev) : submitOptions.optimisticValues
			};
			return { ...prev };
		});
		let callbackMeta;
		let rejoinKey;
		let usableThreadId = threadId;
		await stream.start(async (signal) => {
			if (!usableThreadId) {
				const thread = await client.threads.create({
					threadId: submitOptions?.threadId,
					metadata: submitOptions?.metadata
				});
				usableThreadId = thread.thread_id;
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
				input: values$1,
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
			callbacks: options,
			async onSuccess() {
				if (rejoinKey) runMetadataStorage?.removeItem(rejoinKey);
				if (shouldRefetch) {
					const newHistory = await history.mutate(usableThreadId);
					const lastHead = newHistory?.at(0);
					if (lastHead) {
						options.onFinish?.(lastHead, callbackMeta);
						return null;
					}
				}
				return void 0;
			},
			onError(error$1) {
				options.onError?.(error$1, callbackMeta);
			},
			onFinish() {
				threadIdStreamingRef.current = null;
			}
		});
	};
	const joinStream = async (runId, lastEventId, joinOptions) => {
		lastEventId ??= "-1";
		if (!threadId) return;
		const callbackMeta = {
			thread_id: threadId,
			run_id: runId
		};
		await stream.start(async (signal) => {
			threadIdStreamingRef.current = threadId;
			return client.runs.joinStream(threadId, runId, {
				signal,
				lastEventId,
				streamMode: joinOptions?.streamMode
			});
		}, {
			getMessages,
			setMessages,
			initialValues: historyValues,
			callbacks: options,
			async onSuccess() {
				runMetadataStorage?.removeItem(`lg:stream:${threadId}`);
				const newHistory = await history.mutate(threadId);
				const lastHead = newHistory?.at(0);
				if (lastHead) options.onFinish?.(lastHead, callbackMeta);
			},
			onError(error$1) {
				options.onError?.(error$1, callbackMeta);
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
		get interrupt() {
			if (values != null && "__interrupt__" in values && Array.isArray(values.__interrupt__)) {
				const valueInterrupts = values.__interrupt__;
				if (valueInterrupts.length === 0) return { when: "breakpoint" };
				if (valueInterrupts.length === 1) return valueInterrupts[0];
				return valueInterrupts;
			}
			if (stream.isLoading) return void 0;
			const interrupts = branchContext.threadHead?.tasks?.at(-1)?.interrupts;
			if (interrupts == null || interrupts.length === 0) {
				const next = branchContext.threadHead?.next ?? [];
				if (!next.length || error != null) return void 0;
				return { when: "breakpoint" };
			}
			return interrupts.at(-1);
		},
		get messages() {
			trackStreamMode("messages-tuple", "values");
			return getMessages(values);
		},
		getMessagesMetadata(message, index) {
			trackStreamMode("values");
			const streamMetadata = messageManager.get(message.id)?.metadata;
			const historyMetadata = messageMetadata?.find((m) => m.messageId === (message.id ?? index));
			if (streamMetadata != null || historyMetadata != null) return {
				...historyMetadata,
				streamMetadata
			};
			return void 0;
		}
	};
}

//#endregion
exports.useStreamLGP = useStreamLGP;
//# sourceMappingURL=stream.lgp.cjs.map