import { EmptyInputError, GraphInterrupt, isGraphInterrupt } from "../errors.js";
import { createCheckpoint, emptyChannels } from "../channels/base.js";
import { CHECKPOINT_NAMESPACE_END, CHECKPOINT_NAMESPACE_SEPARATOR, CONFIG_KEY_CHECKPOINT_ID, CONFIG_KEY_CHECKPOINT_MAP, CONFIG_KEY_CHECKPOINT_NS, CONFIG_KEY_READ, CONFIG_KEY_RESUME_MAP, CONFIG_KEY_RESUMING, CONFIG_KEY_SCRATCHPAD, CONFIG_KEY_STREAM, ERROR, INPUT, INTERRUPT, NULL_TASK_ID, PUSH, RESUME, START, TAG_HIDDEN, isCommand } from "../constants.js";
import { gatherIterator, gatherIteratorSync, prefixGenerator } from "../utils.js";
import { isXXH3 } from "../hash.js";
import { mapCommand, mapInput, mapOutputUpdates, mapOutputValues, readChannels } from "./io.js";
import { getNewChannelVersions, patchConfigurable } from "./utils/index.js";
import { _applyWrites, _prepareNextTasks, _prepareSingleTask, increment, shouldInterrupt } from "./algo.js";
import { mapDebugCheckpoint, mapDebugTaskResults, mapDebugTasks, printStepTasks } from "./debug.js";
import { IterableReadableWritableStream } from "./stream.js";
import { AsyncBatchedStore, BaseCache, WRITES_IDX_MAP, copyCheckpoint, emptyCheckpoint } from "@langchain/langgraph-checkpoint";

//#region src/pregel/loop.ts
const INPUT_DONE = Symbol.for("INPUT_DONE");
const INPUT_RESUMING = Symbol.for("INPUT_RESUMING");
const DEFAULT_LOOP_LIMIT = 25;
function createDuplexStream(...streams) {
	return new IterableReadableWritableStream({
		passthroughFn: (value) => {
			for (const stream of streams) if (stream.modes.has(value[1])) stream.push(value);
		},
		modes: new Set(streams.flatMap((s) => Array.from(s.modes)))
	});
}
var AsyncBatchedCache = class extends BaseCache {
	cache;
	queue = Promise.resolve();
	constructor(cache) {
		super();
		this.cache = cache;
	}
	async get(keys) {
		return this.enqueueOperation("get", keys);
	}
	async set(pairs) {
		return this.enqueueOperation("set", pairs);
	}
	async clear(namespaces) {
		return this.enqueueOperation("clear", namespaces);
	}
	async stop() {
		await this.queue;
	}
	enqueueOperation(type, ...args) {
		const newPromise = this.queue.then(() => {
			return this.cache[type](...args);
		});
		this.queue = newPromise.then(() => void 0, () => void 0);
		return newPromise;
	}
};
var PregelLoop = class PregelLoop {
	input;
	output;
	config;
	checkpointer;
	checkpointerGetNextVersion;
	channels;
	checkpoint;
	checkpointIdSaved;
	checkpointConfig;
	checkpointMetadata;
	checkpointNamespace;
	checkpointPendingWrites = [];
	checkpointPreviousVersions;
	step;
	stop;
	durability;
	outputKeys;
	streamKeys;
	nodes;
	skipDoneTasks;
	prevCheckpointConfig;
	updatedChannels;
	status = "pending";
	tasks = {};
	stream;
	checkpointerPromises = [];
	isNested;
	_checkpointerChainedPromise = Promise.resolve();
	store;
	cache;
	manager;
	interruptAfter;
	interruptBefore;
	toInterrupt = [];
	debug = false;
	triggerToNodes;
	get isResuming() {
		let hasChannelVersions = false;
		if (START in this.checkpoint.channel_versions) hasChannelVersions = true;
		else for (const chan in this.checkpoint.channel_versions) if (Object.prototype.hasOwnProperty.call(this.checkpoint.channel_versions, chan)) {
			hasChannelVersions = true;
			break;
		}
		const configHasResumingFlag = this.config.configurable?.[CONFIG_KEY_RESUMING] !== void 0;
		const configIsResuming = configHasResumingFlag && this.config.configurable?.[CONFIG_KEY_RESUMING];
		const inputIsNullOrUndefined = this.input === null || this.input === void 0;
		const inputIsCommandResuming = isCommand(this.input) && this.input.resume != null;
		const inputIsResuming = this.input === INPUT_RESUMING;
		const runIdMatchesPrevious = !this.isNested && this.config.metadata?.run_id !== void 0 && this.checkpointMetadata?.run_id !== void 0 && this.config.metadata.run_id === this.checkpointMetadata?.run_id;
		return hasChannelVersions && (configIsResuming || inputIsNullOrUndefined || inputIsCommandResuming || inputIsResuming || runIdMatchesPrevious);
	}
	constructor(params) {
		this.input = params.input;
		this.checkpointer = params.checkpointer;
		if (this.checkpointer !== void 0) this.checkpointerGetNextVersion = this.checkpointer.getNextVersion.bind(this.checkpointer);
		else this.checkpointerGetNextVersion = increment;
		this.checkpoint = params.checkpoint;
		this.checkpointMetadata = params.checkpointMetadata;
		this.checkpointPreviousVersions = params.checkpointPreviousVersions;
		this.channels = params.channels;
		this.checkpointPendingWrites = params.checkpointPendingWrites;
		this.step = params.step;
		this.stop = params.stop;
		this.config = params.config;
		this.checkpointConfig = params.checkpointConfig;
		this.isNested = params.isNested;
		this.manager = params.manager;
		this.outputKeys = params.outputKeys;
		this.streamKeys = params.streamKeys;
		this.nodes = params.nodes;
		this.skipDoneTasks = params.skipDoneTasks;
		this.store = params.store;
		this.cache = params.cache ? new AsyncBatchedCache(params.cache) : void 0;
		this.stream = params.stream;
		this.checkpointNamespace = params.checkpointNamespace;
		this.prevCheckpointConfig = params.prevCheckpointConfig;
		this.interruptAfter = params.interruptAfter;
		this.interruptBefore = params.interruptBefore;
		this.durability = params.durability;
		this.debug = params.debug;
		this.triggerToNodes = params.triggerToNodes;
	}
	static async initialize(params) {
		let { config, stream } = params;
		if (stream !== void 0 && config.configurable?.[CONFIG_KEY_STREAM] !== void 0) stream = createDuplexStream(stream, config.configurable[CONFIG_KEY_STREAM]);
		const skipDoneTasks = config.configurable ? !("checkpoint_id" in config.configurable) : true;
		const scratchpad = config.configurable?.[CONFIG_KEY_SCRATCHPAD];
		if (config.configurable && scratchpad) {
			if (scratchpad.subgraphCounter > 0) config = patchConfigurable(config, { [CONFIG_KEY_CHECKPOINT_NS]: [config.configurable[CONFIG_KEY_CHECKPOINT_NS], scratchpad.subgraphCounter.toString()].join(CHECKPOINT_NAMESPACE_SEPARATOR) });
			scratchpad.subgraphCounter += 1;
		}
		const isNested = CONFIG_KEY_READ in (config.configurable ?? {});
		if (!isNested && config.configurable?.checkpoint_ns !== void 0 && config.configurable?.checkpoint_ns !== "") config = patchConfigurable(config, {
			checkpoint_ns: "",
			checkpoint_id: void 0
		});
		let checkpointConfig = config;
		if (config.configurable?.[CONFIG_KEY_CHECKPOINT_MAP] !== void 0 && config.configurable?.[CONFIG_KEY_CHECKPOINT_MAP]?.[config.configurable?.checkpoint_ns]) checkpointConfig = patchConfigurable(config, { checkpoint_id: config.configurable[CONFIG_KEY_CHECKPOINT_MAP][config.configurable?.checkpoint_ns] });
		const checkpointNamespace = config.configurable?.checkpoint_ns?.split(CHECKPOINT_NAMESPACE_SEPARATOR) ?? [];
		const saved = await params.checkpointer?.getTuple(checkpointConfig) ?? {
			config,
			checkpoint: emptyCheckpoint(),
			metadata: {
				source: "input",
				step: -2,
				parents: {}
			},
			pendingWrites: []
		};
		checkpointConfig = {
			...config,
			...saved.config,
			configurable: {
				checkpoint_ns: "",
				...config.configurable,
				...saved.config.configurable
			}
		};
		const prevCheckpointConfig = saved.parentConfig;
		const checkpoint = copyCheckpoint(saved.checkpoint);
		const checkpointMetadata = { ...saved.metadata };
		const checkpointPendingWrites = saved.pendingWrites ?? [];
		const channels = emptyChannels(params.channelSpecs, checkpoint);
		const step = (checkpointMetadata.step ?? 0) + 1;
		const stop = step + (config.recursionLimit ?? DEFAULT_LOOP_LIMIT) + 1;
		const checkpointPreviousVersions = { ...checkpoint.channel_versions };
		const store = params.store ? new AsyncBatchedStore(params.store) : void 0;
		if (store) await store.start();
		return new PregelLoop({
			input: params.input,
			config,
			checkpointer: params.checkpointer,
			checkpoint,
			checkpointMetadata,
			checkpointConfig,
			prevCheckpointConfig,
			checkpointNamespace,
			channels,
			isNested,
			manager: params.manager,
			skipDoneTasks,
			step,
			stop,
			checkpointPreviousVersions,
			checkpointPendingWrites,
			outputKeys: params.outputKeys ?? [],
			streamKeys: params.streamKeys ?? [],
			nodes: params.nodes,
			stream,
			store,
			cache: params.cache,
			interruptAfter: params.interruptAfter,
			interruptBefore: params.interruptBefore,
			durability: params.durability,
			debug: params.debug,
			triggerToNodes: params.triggerToNodes
		});
	}
	_checkpointerPutAfterPrevious(input) {
		this._checkpointerChainedPromise = this._checkpointerChainedPromise.then(() => {
			return this.checkpointer?.put(input.config, input.checkpoint, input.metadata, input.newVersions);
		});
		this.checkpointerPromises.push(this._checkpointerChainedPromise);
	}
	/**
	* Put writes for a task, to be read by the next tick.
	* @param taskId
	* @param writes
	*/
	putWrites(taskId, writes) {
		let writesCopy = writes;
		if (writesCopy.length === 0) return;
		if (writesCopy.every(([key]) => key in WRITES_IDX_MAP)) writesCopy = Array.from(new Map(writesCopy.map((w) => [w[0], w])).values());
		this.checkpointPendingWrites = this.checkpointPendingWrites.filter((w) => w[0] !== taskId);
		for (const [c, v] of writesCopy) this.checkpointPendingWrites.push([
			taskId,
			c,
			v
		]);
		const config = patchConfigurable(this.checkpointConfig, {
			[CONFIG_KEY_CHECKPOINT_NS]: this.config.configurable?.checkpoint_ns ?? "",
			[CONFIG_KEY_CHECKPOINT_ID]: this.checkpoint.id
		});
		if (this.durability !== "exit" && this.checkpointer != null) this.checkpointerPromises.push(this.checkpointer.putWrites(config, writesCopy, taskId));
		if (this.tasks) this._outputWrites(taskId, writesCopy);
		if (!writes.length || !this.cache || !this.tasks) return;
		const task = this.tasks[taskId];
		if (task == null || task.cache_key == null) return;
		if (writes[0][0] === ERROR || writes[0][0] === INTERRUPT) return;
		this.cache.set([{
			key: [task.cache_key.ns, task.cache_key.key],
			value: task.writes,
			ttl: task.cache_key.ttl
		}]);
	}
	_outputWrites(taskId, writes, cached = false) {
		const task = this.tasks[taskId];
		if (task !== void 0) {
			if (task.config !== void 0 && (task.config.tags ?? []).includes(TAG_HIDDEN)) return;
			if (writes.length > 0) {
				if (writes[0][0] === INTERRUPT) {
					if (task.path?.[0] === PUSH && task.path?.at(-1) === true) return;
					const interruptWrites = writes.filter((w) => w[0] === INTERRUPT).flatMap((w) => w[1]);
					this._emit([["updates", { [INTERRUPT]: interruptWrites }], ["values", { [INTERRUPT]: interruptWrites }]]);
				} else if (writes[0][0] !== ERROR) this._emit(gatherIteratorSync(prefixGenerator(mapOutputUpdates(this.outputKeys, [[task, writes]], cached), "updates")));
			}
			if (!cached) this._emit(gatherIteratorSync(prefixGenerator(mapDebugTaskResults([[task, writes]], this.streamKeys), "tasks")));
		}
	}
	async _matchCachedWrites() {
		if (!this.cache) return [];
		const matched = [];
		const serializeKey = ([ns, key]) => {
			return `ns:${ns.join(",")}|key:${key}`;
		};
		const keys = [];
		const keyMap = {};
		for (const task of Object.values(this.tasks)) if (task.cache_key != null && !task.writes.length) {
			keys.push([task.cache_key.ns, task.cache_key.key]);
			keyMap[serializeKey([task.cache_key.ns, task.cache_key.key])] = task;
		}
		if (keys.length === 0) return [];
		const cache = await this.cache.get(keys);
		for (const { key, value } of cache) {
			const task = keyMap[serializeKey(key)];
			if (task != null) {
				task.writes.push(...value);
				matched.push({
					task,
					result: value
				});
			}
		}
		return matched;
	}
	/**
	* Execute a single iteration of the Pregel loop.
	* Returns true if more iterations are needed.
	* @param params
	*/
	async tick(params) {
		if (this.store && !this.store.isRunning) await this.store?.start();
		const { inputKeys = [] } = params;
		if (this.status !== "pending") throw new Error(`Cannot tick when status is no longer "pending". Current status: "${this.status}"`);
		if (![INPUT_DONE, INPUT_RESUMING].includes(this.input)) await this._first(inputKeys);
		else if (this.toInterrupt.length > 0) {
			this.status = "interrupt_before";
			throw new GraphInterrupt();
		} else if (Object.values(this.tasks).every((task) => task.writes.length > 0)) {
			const writes = Object.values(this.tasks).flatMap((t) => t.writes);
			this.updatedChannels = _applyWrites(this.checkpoint, this.channels, Object.values(this.tasks), this.checkpointerGetNextVersion, this.triggerToNodes);
			const valuesOutput = await gatherIterator(prefixGenerator(mapOutputValues(this.outputKeys, writes, this.channels), "values"));
			this._emit(valuesOutput);
			this.checkpointPendingWrites = [];
			await this._putCheckpoint({ source: "loop" });
			if (shouldInterrupt(this.checkpoint, this.interruptAfter, Object.values(this.tasks))) {
				this.status = "interrupt_after";
				throw new GraphInterrupt();
			}
			if (this.config.configurable?.[CONFIG_KEY_RESUMING] !== void 0) delete this.config.configurable?.[CONFIG_KEY_RESUMING];
		} else return false;
		if (this.step > this.stop) {
			this.status = "out_of_steps";
			return false;
		}
		const nextTasks = _prepareNextTasks(this.checkpoint, this.checkpointPendingWrites, this.nodes, this.channels, this.config, true, {
			step: this.step,
			checkpointer: this.checkpointer,
			isResuming: this.isResuming,
			manager: this.manager,
			store: this.store,
			stream: this.stream,
			triggerToNodes: this.triggerToNodes,
			updatedChannels: this.updatedChannels
		});
		this.tasks = nextTasks;
		if (this.checkpointer) this._emit(await gatherIterator(prefixGenerator(mapDebugCheckpoint(this.checkpointConfig, this.channels, this.streamKeys, this.checkpointMetadata, Object.values(this.tasks), this.checkpointPendingWrites, this.prevCheckpointConfig, this.outputKeys), "checkpoints")));
		if (Object.values(this.tasks).length === 0) {
			this.status = "done";
			return false;
		}
		if (this.skipDoneTasks && this.checkpointPendingWrites.length > 0) {
			for (const [tid, k, v] of this.checkpointPendingWrites) {
				if (k === ERROR || k === INTERRUPT || k === RESUME) continue;
				const task = Object.values(this.tasks).find((t) => t.id === tid);
				if (task) task.writes.push([k, v]);
			}
			for (const task of Object.values(this.tasks)) if (task.writes.length > 0) this._outputWrites(task.id, task.writes, true);
		}
		if (Object.values(this.tasks).every((task) => task.writes.length > 0)) return this.tick({ inputKeys });
		if (shouldInterrupt(this.checkpoint, this.interruptBefore, Object.values(this.tasks))) {
			this.status = "interrupt_before";
			throw new GraphInterrupt();
		}
		const debugOutput = await gatherIterator(prefixGenerator(mapDebugTasks(Object.values(this.tasks)), "tasks"));
		this._emit(debugOutput);
		return true;
	}
	async finishAndHandleError(error) {
		if (this.durability === "exit" && (!this.isNested || typeof error !== "undefined" || this.checkpointNamespace.every((part) => !part.includes(CHECKPOINT_NAMESPACE_END)))) {
			this._putCheckpoint(this.checkpointMetadata);
			this._flushPendingWrites();
		}
		const suppress = this._suppressInterrupt(error);
		if (suppress || error === void 0) this.output = readChannels(this.channels, this.outputKeys);
		if (suppress) {
			if (this.tasks !== void 0 && this.checkpointPendingWrites.length > 0 && Object.values(this.tasks).some((task) => task.writes.length > 0)) {
				this.updatedChannels = _applyWrites(this.checkpoint, this.channels, Object.values(this.tasks), this.checkpointerGetNextVersion, this.triggerToNodes);
				this._emit(gatherIteratorSync(prefixGenerator(mapOutputValues(this.outputKeys, Object.values(this.tasks).flatMap((t) => t.writes), this.channels), "values")));
			}
			if (isGraphInterrupt(error) && !error.interrupts.length) this._emit([["updates", { [INTERRUPT]: [] }], ["values", { [INTERRUPT]: [] }]]);
		}
		return suppress;
	}
	async acceptPush(task, writeIdx, call) {
		if (this.interruptAfter?.length > 0 && shouldInterrupt(this.checkpoint, this.interruptAfter, [task])) {
			this.toInterrupt.push(task);
			return;
		}
		const pushed = _prepareSingleTask([
			PUSH,
			task.path ?? [],
			writeIdx,
			task.id,
			call
		], this.checkpoint, this.checkpointPendingWrites, this.nodes, this.channels, task.config ?? {}, true, {
			step: this.step,
			checkpointer: this.checkpointer,
			manager: this.manager,
			store: this.store,
			stream: this.stream
		});
		if (!pushed) return;
		if (this.interruptBefore?.length > 0 && shouldInterrupt(this.checkpoint, this.interruptBefore, [pushed])) {
			this.toInterrupt.push(pushed);
			return;
		}
		this._emit(gatherIteratorSync(prefixGenerator(mapDebugTasks([pushed]), "tasks")));
		if (this.debug) printStepTasks(this.step, [pushed]);
		this.tasks[pushed.id] = pushed;
		if (this.skipDoneTasks) this._matchWrites({ [pushed.id]: pushed });
		const tasks = await this._matchCachedWrites();
		for (const { task: task$1 } of tasks) this._outputWrites(task$1.id, task$1.writes, true);
		return pushed;
	}
	_suppressInterrupt(e) {
		return isGraphInterrupt(e) && !this.isNested;
	}
	async _first(inputKeys) {
		const { configurable } = this.config;
		const scratchpad = configurable?.[CONFIG_KEY_SCRATCHPAD];
		if (scratchpad && scratchpad.nullResume !== void 0) this.putWrites(NULL_TASK_ID, [[RESUME, scratchpad.nullResume]]);
		if (isCommand(this.input)) {
			const hasResume = this.input.resume != null;
			if (this.input.resume != null && typeof this.input.resume === "object" && Object.keys(this.input.resume).every(isXXH3)) {
				this.config.configurable ??= {};
				this.config.configurable[CONFIG_KEY_RESUME_MAP] = this.input.resume;
			}
			if (hasResume && this.checkpointer == null) throw new Error("Cannot use Command(resume=...) without checkpointer");
			const writes = {};
			for (const [tid, key, value] of mapCommand(this.input, this.checkpointPendingWrites)) {
				writes[tid] ??= [];
				writes[tid].push([key, value]);
			}
			if (Object.keys(writes).length === 0) throw new EmptyInputError("Received empty Command input");
			for (const [tid, ws] of Object.entries(writes)) this.putWrites(tid, ws);
		}
		const nullWrites = (this.checkpointPendingWrites ?? []).filter((w) => w[0] === NULL_TASK_ID).map((w) => w.slice(1));
		if (nullWrites.length > 0) _applyWrites(this.checkpoint, this.channels, [{
			name: INPUT,
			writes: nullWrites,
			triggers: []
		}], this.checkpointerGetNextVersion, this.triggerToNodes);
		const isCommandUpdateOrGoto = isCommand(this.input) && nullWrites.length > 0;
		if (this.isResuming || isCommandUpdateOrGoto) {
			for (const channelName in this.channels) {
				if (!Object.prototype.hasOwnProperty.call(this.channels, channelName)) continue;
				if (this.checkpoint.channel_versions[channelName] !== void 0) {
					const version = this.checkpoint.channel_versions[channelName];
					this.checkpoint.versions_seen[INTERRUPT] = {
						...this.checkpoint.versions_seen[INTERRUPT],
						[channelName]: version
					};
				}
			}
			const valuesOutput = await gatherIterator(prefixGenerator(mapOutputValues(this.outputKeys, true, this.channels), "values"));
			this._emit(valuesOutput);
		}
		if (this.isResuming) this.input = INPUT_RESUMING;
		else if (isCommandUpdateOrGoto) {
			await this._putCheckpoint({ source: "input" });
			this.input = INPUT_DONE;
		} else {
			const inputWrites = await gatherIterator(mapInput(inputKeys, this.input));
			if (inputWrites.length > 0) {
				const discardTasks = _prepareNextTasks(this.checkpoint, this.checkpointPendingWrites, this.nodes, this.channels, this.config, true, { step: this.step });
				this.updatedChannels = _applyWrites(this.checkpoint, this.channels, Object.values(discardTasks).concat([{
					name: INPUT,
					writes: inputWrites,
					triggers: []
				}]), this.checkpointerGetNextVersion, this.triggerToNodes);
				await this._putCheckpoint({ source: "input" });
				this.input = INPUT_DONE;
			} else if (!(CONFIG_KEY_RESUMING in (this.config.configurable ?? {}))) throw new EmptyInputError(`Received no input writes for ${JSON.stringify(inputKeys, null, 2)}`);
			else this.input = INPUT_DONE;
		}
		if (!this.isNested) this.config = patchConfigurable(this.config, { [CONFIG_KEY_RESUMING]: this.isResuming });
	}
	_emit(values) {
		for (const [mode, payload] of values) {
			if (this.stream.modes.has(mode)) this.stream.push([
				this.checkpointNamespace,
				mode,
				payload
			]);
			if ((mode === "checkpoints" || mode === "tasks") && this.stream.modes.has("debug")) {
				const step = mode === "checkpoints" ? this.step - 1 : this.step;
				const timestamp = (/* @__PURE__ */ new Date()).toISOString();
				const type = (() => {
					if (mode === "checkpoints") return "checkpoint";
					else if (typeof payload === "object" && payload != null && "result" in payload) return "task_result";
					else return "task";
				})();
				this.stream.push([
					this.checkpointNamespace,
					"debug",
					{
						step,
						type,
						timestamp,
						payload
					}
				]);
			}
		}
	}
	_putCheckpoint(inputMetadata) {
		const exiting = this.checkpointMetadata === inputMetadata;
		const doCheckpoint = this.checkpointer != null && (this.durability !== "exit" || exiting);
		const storeCheckpoint = (checkpoint) => {
			this.prevCheckpointConfig = this.checkpointConfig?.configurable?.checkpoint_id ? this.checkpointConfig : void 0;
			this.checkpointConfig = patchConfigurable(this.checkpointConfig, { [CONFIG_KEY_CHECKPOINT_NS]: this.config.configurable?.checkpoint_ns ?? "" });
			const channelVersions = { ...this.checkpoint.channel_versions };
			const newVersions = getNewChannelVersions(this.checkpointPreviousVersions, channelVersions);
			this.checkpointPreviousVersions = channelVersions;
			this._checkpointerPutAfterPrevious({
				config: { ...this.checkpointConfig },
				checkpoint: copyCheckpoint(checkpoint),
				metadata: { ...this.checkpointMetadata },
				newVersions
			});
			this.checkpointConfig = {
				...this.checkpointConfig,
				configurable: {
					...this.checkpointConfig.configurable,
					checkpoint_id: this.checkpoint.id
				}
			};
		};
		if (!exiting) this.checkpointMetadata = {
			...inputMetadata,
			step: this.step,
			parents: this.config.configurable?.[CONFIG_KEY_CHECKPOINT_MAP] ?? {}
		};
		this.checkpoint = createCheckpoint(this.checkpoint, doCheckpoint ? this.channels : void 0, this.step, exiting ? { id: this.checkpoint.id } : void 0);
		if (doCheckpoint) storeCheckpoint(this.checkpoint);
		if (!exiting) this.step += 1;
	}
	_flushPendingWrites() {
		if (this.checkpointer == null) return;
		if (this.checkpointPendingWrites.length === 0) return;
		const config = patchConfigurable(this.checkpointConfig, {
			[CONFIG_KEY_CHECKPOINT_NS]: this.config.configurable?.checkpoint_ns ?? "",
			[CONFIG_KEY_CHECKPOINT_ID]: this.checkpoint.id
		});
		const byTask = {};
		for (const [tid, key, value] of this.checkpointPendingWrites) {
			byTask[tid] ??= [];
			byTask[tid].push([key, value]);
		}
		for (const [tid, ws] of Object.entries(byTask)) this.checkpointerPromises.push(this.checkpointer.putWrites(config, ws, tid));
	}
	_matchWrites(tasks) {
		for (const [tid, k, v] of this.checkpointPendingWrites) {
			if (k === ERROR || k === INTERRUPT || k === RESUME) continue;
			const task = Object.values(tasks).find((t) => t.id === tid);
			if (task) task.writes.push([k, v]);
		}
		for (const task of Object.values(tasks)) if (task.writes.length > 0) this._outputWrites(task.id, task.writes, true);
	}
};

//#endregion
export { PregelLoop };
//# sourceMappingURL=loop.js.map