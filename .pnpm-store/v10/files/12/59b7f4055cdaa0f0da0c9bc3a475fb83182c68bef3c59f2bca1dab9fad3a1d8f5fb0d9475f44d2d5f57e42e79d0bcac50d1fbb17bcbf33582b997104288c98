const require_errors = require('./errors.cjs');
const require_messages = require('./messages.cjs');

//#region src/ui/manager.ts
var StreamManager = class {
	abortRef = new AbortController();
	messages;
	listeners = /* @__PURE__ */ new Set();
	state;
	constructor(messages) {
		this.messages = messages;
		this.state = {
			isLoading: false,
			values: null,
			error: void 0
		};
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
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
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
			const prev = {
				...historyValues,
				...(this.state.values ?? [null, "stream"])[0]
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
	start = async (action, options) => {
		if (this.state.isLoading) return;
		try {
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
				if (this.matchEventType("updates", event, data)) options.callbacks.onUpdateEvent?.(data, {
					namespace,
					mutate
				});
				if (this.matchEventType("custom", event, data)) options.callbacks.onCustomEvent?.(data, {
					namespace,
					mutate
				});
				if (this.matchEventType("checkpoints", event, data)) options.callbacks.onCheckpointEvent?.(data, { namespace });
				if (this.matchEventType("tasks", event, data)) options.callbacks.onTaskEvent?.(data, { namespace });
				if (this.matchEventType("debug", event, data)) options.callbacks.onDebugEvent?.(data, { namespace });
				if (event === "values") if ("__interrupt__" in data) this.setStreamValues((prev) => ({
					...prev,
					...data
				}));
				else this.setStreamValues(data);
				if (this.matchEventType("messages", event, data)) {
					const [serialized, metadata] = data;
					const messageId = this.messages.add(serialized, metadata);
					if (!messageId) {
						console.warn("Failed to add message to manager, no message ID found");
						continue;
					}
					this.setStreamValues((streamValues) => {
						const values$1 = {
							...options.initialValues,
							...streamValues
						};
						const messages = options.getMessages(values$1).slice();
						const { chunk, index } = this.messages.get(messageId, messages.length) ?? {};
						if (!chunk || index == null) return values$1;
						if (chunk.getType() === "remove") messages.splice(index, 1);
						else messages[index] = require_messages.toMessageDict(chunk);
						return options.setMessages(values$1, messages);
					});
				}
			}
			if (streamError != null) throw streamError;
			const values = await options.onSuccess?.();
			if (typeof values !== "undefined") this.setStreamValues(values);
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
	};
};

//#endregion
exports.StreamManager = StreamManager;
//# sourceMappingURL=manager.cjs.map