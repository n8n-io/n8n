const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_errors = require('../errors.cjs');
const require_base = require('../channels/base.cjs');
const require_constants = require('../constants.cjs');
const require_hash = require('../hash.cjs');
const require_io = require('./io.cjs');
const require_types = require('./types.cjs');
const require_index = require('./utils/index.cjs');
const require_call = require('./call.cjs');
const __langchain_langgraph_checkpoint = require_rolldown_runtime.__toESM(require("@langchain/langgraph-checkpoint"));
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));

//#region src/pregel/algo.ts
const increment = (current) => {
	return current !== void 0 ? current + 1 : 1;
};
function triggersNextStep(updatedChannels, triggerToNodes) {
	if (triggerToNodes == null) return false;
	for (const chan of updatedChannels) if (triggerToNodes[chan]) return true;
	return false;
}
function maxChannelMapVersion(channelVersions) {
	let maxVersion;
	for (const chan in channelVersions) {
		if (!Object.prototype.hasOwnProperty.call(channelVersions, chan)) continue;
		if (maxVersion == null) maxVersion = channelVersions[chan];
		else maxVersion = (0, __langchain_langgraph_checkpoint.maxChannelVersion)(maxVersion, channelVersions[chan]);
	}
	return maxVersion;
}
function shouldInterrupt(checkpoint, interruptNodes, tasks) {
	const nullVersion = require_index.getNullChannelVersion(checkpoint.channel_versions);
	const seen = checkpoint.versions_seen[require_constants.INTERRUPT] ?? {};
	let anyChannelUpdated = false;
	if ((checkpoint.channel_versions[require_constants.START] ?? nullVersion) > (seen[require_constants.START] ?? nullVersion)) anyChannelUpdated = true;
	else for (const chan in checkpoint.channel_versions) {
		if (!Object.prototype.hasOwnProperty.call(checkpoint.channel_versions, chan)) continue;
		if (checkpoint.channel_versions[chan] > (seen[chan] ?? nullVersion)) {
			anyChannelUpdated = true;
			break;
		}
	}
	const anyTriggeredNodeInInterruptNodes = tasks.some((task) => interruptNodes === "*" ? !task.config?.tags?.includes(require_constants.TAG_HIDDEN) : interruptNodes.includes(task.name));
	return anyChannelUpdated && anyTriggeredNodeInInterruptNodes;
}
function _localRead(checkpoint, channels, task, select, fresh = false) {
	let updated = /* @__PURE__ */ new Set();
	if (!Array.isArray(select)) {
		for (const [c] of task.writes) if (c === select) {
			updated = new Set([c]);
			break;
		}
		updated = updated || /* @__PURE__ */ new Set();
	} else updated = new Set(select.filter((c) => task.writes.some(([key, _]) => key === c)));
	let values;
	if (fresh && updated.size > 0) {
		const localChannels = Object.fromEntries(Object.entries(channels).filter(([k, _]) => updated.has(k)));
		const newCheckpoint = require_base.createCheckpoint(checkpoint, localChannels, -1);
		const newChannels = require_base.emptyChannels(localChannels, newCheckpoint);
		_applyWrites((0, __langchain_langgraph_checkpoint.copyCheckpoint)(newCheckpoint), newChannels, [task], void 0, void 0);
		values = require_io.readChannels({
			...channels,
			...newChannels
		}, select);
	} else values = require_io.readChannels(channels, select);
	return values;
}
function _localWrite(commit, processes, writes) {
	for (const [chan, value] of writes) if ([require_constants.PUSH, require_constants.TASKS].includes(chan) && value != null) {
		if (!require_constants._isSend(value)) throw new require_errors.InvalidUpdateError(`Invalid packet type, expected SendProtocol, got ${JSON.stringify(value)}`);
		if (!(value.node in processes)) throw new require_errors.InvalidUpdateError(`Invalid node name "${value.node}" in Send packet`);
	}
	commit(writes);
}
const IGNORE = new Set([
	require_constants.NO_WRITES,
	require_constants.PUSH,
	require_constants.RESUME,
	require_constants.INTERRUPT,
	require_constants.RETURN,
	require_constants.ERROR
]);
function _applyWrites(checkpoint, channels, tasks, getNextVersion, triggerToNodes) {
	tasks.sort((a, b) => {
		const aPath = a.path?.slice(0, 3) || [];
		const bPath = b.path?.slice(0, 3) || [];
		for (let i = 0; i < Math.min(aPath.length, bPath.length); i += 1) {
			if (aPath[i] < bPath[i]) return -1;
			if (aPath[i] > bPath[i]) return 1;
		}
		return aPath.length - bPath.length;
	});
	const bumpStep = tasks.some((task) => task.triggers.length > 0);
	const onlyChannels = require_base.getOnlyChannels(channels);
	for (const task of tasks) {
		checkpoint.versions_seen[task.name] ??= {};
		for (const chan of task.triggers) if (chan in checkpoint.channel_versions) checkpoint.versions_seen[task.name][chan] = checkpoint.channel_versions[chan];
	}
	let maxVersion = maxChannelMapVersion(checkpoint.channel_versions);
	const channelsToConsume = new Set(tasks.flatMap((task) => task.triggers).filter((chan) => !require_constants.RESERVED.includes(chan)));
	let usedNewVersion = false;
	for (const chan of channelsToConsume) if (chan in onlyChannels && onlyChannels[chan].consume()) {
		if (getNextVersion !== void 0) {
			checkpoint.channel_versions[chan] = getNextVersion(maxVersion);
			usedNewVersion = true;
		}
	}
	const pendingWritesByChannel = {};
	for (const task of tasks) for (const [chan, val] of task.writes) if (IGNORE.has(chan)) {} else if (chan in onlyChannels) {
		pendingWritesByChannel[chan] ??= [];
		pendingWritesByChannel[chan].push(val);
	}
	if (maxVersion != null && getNextVersion != null) maxVersion = usedNewVersion ? getNextVersion(maxVersion) : maxVersion;
	const updatedChannels = /* @__PURE__ */ new Set();
	for (const [chan, vals] of Object.entries(pendingWritesByChannel)) if (chan in onlyChannels) {
		const channel = onlyChannels[chan];
		let updated;
		try {
			updated = channel.update(vals);
		} catch (e) {
			if (e.name === require_errors.InvalidUpdateError.unminifiable_name) {
				const wrappedError = new require_errors.InvalidUpdateError(`Invalid update for channel "${chan}" with values ${JSON.stringify(vals)}: ${e.message}`);
				wrappedError.lc_error_code = e.lc_error_code;
				throw wrappedError;
			} else throw e;
		}
		if (updated && getNextVersion !== void 0) {
			checkpoint.channel_versions[chan] = getNextVersion(maxVersion);
			if (channel.isAvailable()) updatedChannels.add(chan);
		}
	}
	if (bumpStep) for (const chan in onlyChannels) {
		if (!Object.prototype.hasOwnProperty.call(onlyChannels, chan)) continue;
		const channel = onlyChannels[chan];
		if (channel.isAvailable() && !updatedChannels.has(chan)) {
			const updated = channel.update([]);
			if (updated && getNextVersion !== void 0) {
				checkpoint.channel_versions[chan] = getNextVersion(maxVersion);
				if (channel.isAvailable()) updatedChannels.add(chan);
			}
		}
	}
	if (bumpStep && !triggersNextStep(updatedChannels, triggerToNodes)) for (const chan in onlyChannels) {
		if (!Object.prototype.hasOwnProperty.call(onlyChannels, chan)) continue;
		const channel = onlyChannels[chan];
		if (channel.finish() && getNextVersion !== void 0) {
			checkpoint.channel_versions[chan] = getNextVersion(maxVersion);
			if (channel.isAvailable()) updatedChannels.add(chan);
		}
	}
	return updatedChannels;
}
function* candidateNodes(checkpoint, processes, extra) {
	if (extra.updatedChannels != null && extra.triggerToNodes != null) {
		const triggeredNodes = /* @__PURE__ */ new Set();
		for (const channel of extra.updatedChannels) {
			const nodeIds = extra.triggerToNodes[channel];
			for (const id of nodeIds ?? []) triggeredNodes.add(id);
		}
		yield* [...triggeredNodes].sort();
		return;
	}
	const isEmptyChannelVersions = (() => {
		for (const chan in checkpoint.channel_versions) if (checkpoint.channel_versions[chan] !== null) return false;
		return true;
	})();
	if (isEmptyChannelVersions) return;
	for (const name in processes) {
		if (!Object.prototype.hasOwnProperty.call(processes, name)) continue;
		yield name;
	}
}
/**
* Prepare the set of tasks that will make up the next Pregel step.
* This is the union of all PUSH tasks (Sends) and PULL tasks (nodes triggered
* by edges).
*/
function _prepareNextTasks(checkpoint, pendingWrites, processes, channels, config, forExecution, extra) {
	const tasks = {};
	const tasksChannel = channels[require_constants.TASKS];
	if (tasksChannel?.isAvailable()) {
		const len = tasksChannel.get().length;
		for (let i = 0; i < len; i += 1) {
			const task = _prepareSingleTask([require_constants.PUSH, i], checkpoint, pendingWrites, processes, channels, config, forExecution, extra);
			if (task !== void 0) tasks[task.id] = task;
		}
	}
	for (const name of candidateNodes(checkpoint, processes, extra)) {
		const task = _prepareSingleTask([require_constants.PULL, name], checkpoint, pendingWrites, processes, channels, config, forExecution, extra);
		if (task !== void 0) tasks[task.id] = task;
	}
	return tasks;
}
/**
* Prepares a single task for the next Pregel step, given a task path, which
* uniquely identifies a PUSH or PULL task within the graph.
*/
function _prepareSingleTask(taskPath, checkpoint, pendingWrites, processes, channels, config, forExecution, extra) {
	const { step, checkpointer, manager } = extra;
	const configurable = config.configurable ?? {};
	const parentNamespace = configurable.checkpoint_ns ?? "";
	if (taskPath[0] === require_constants.PUSH && require_types.isCall(taskPath[taskPath.length - 1])) {
		const call = taskPath[taskPath.length - 1];
		const proc = require_call.getRunnableForFunc(call.name, call.func);
		const triggers = [require_constants.PUSH];
		const checkpointNamespace = parentNamespace === "" ? call.name : `${parentNamespace}${require_constants.CHECKPOINT_NAMESPACE_SEPARATOR}${call.name}`;
		const id = (0, __langchain_langgraph_checkpoint.uuid5)(JSON.stringify([
			checkpointNamespace,
			step.toString(),
			call.name,
			require_constants.PUSH,
			taskPath[1],
			taskPath[2]
		]), checkpoint.id);
		const taskCheckpointNamespace = `${checkpointNamespace}${require_constants.CHECKPOINT_NAMESPACE_END}${id}`;
		const outputTaskPath = [...taskPath.slice(0, 3), true];
		const metadata = {
			langgraph_step: step,
			langgraph_node: call.name,
			langgraph_triggers: triggers,
			langgraph_path: outputTaskPath,
			langgraph_checkpoint_ns: taskCheckpointNamespace
		};
		if (forExecution) {
			const writes = [];
			const task = {
				name: call.name,
				input: call.input,
				proc,
				writes,
				config: (0, __langchain_core_runnables.patchConfig)((0, __langchain_core_runnables.mergeConfigs)(config, {
					metadata,
					store: extra.store ?? config.store
				}), {
					runName: call.name,
					callbacks: manager?.getChild(`graph:step:${step}`),
					configurable: {
						[require_constants.CONFIG_KEY_TASK_ID]: id,
						[require_constants.CONFIG_KEY_SEND]: (writes_) => _localWrite((items) => writes.push(...items), processes, writes_),
						[require_constants.CONFIG_KEY_READ]: (select_, fresh_ = false) => _localRead(checkpoint, channels, {
							name: call.name,
							writes,
							triggers,
							path: outputTaskPath
						}, select_, fresh_),
						[require_constants.CONFIG_KEY_CHECKPOINTER]: checkpointer ?? configurable[require_constants.CONFIG_KEY_CHECKPOINTER],
						[require_constants.CONFIG_KEY_CHECKPOINT_MAP]: {
							...configurable[require_constants.CONFIG_KEY_CHECKPOINT_MAP],
							[parentNamespace]: checkpoint.id
						},
						[require_constants.CONFIG_KEY_SCRATCHPAD]: _scratchpad({
							pendingWrites: pendingWrites ?? [],
							taskId: id,
							currentTaskInput: call.input,
							resumeMap: config.configurable?.[require_constants.CONFIG_KEY_RESUME_MAP],
							namespaceHash: require_hash.XXH3(taskCheckpointNamespace)
						}),
						[require_constants.CONFIG_KEY_PREVIOUS_STATE]: checkpoint.channel_values[require_constants.PREVIOUS],
						checkpoint_id: void 0,
						checkpoint_ns: taskCheckpointNamespace
					}
				}),
				triggers,
				retry_policy: call.retry,
				cache_key: call.cache ? {
					key: require_hash.XXH3((call.cache.keyFunc ?? JSON.stringify)([call.input])),
					ns: [require_constants.CACHE_NS_WRITES, call.name ?? "__dynamic__"],
					ttl: call.cache.ttl
				} : void 0,
				id,
				path: outputTaskPath,
				writers: []
			};
			return task;
		} else return {
			id,
			name: call.name,
			interrupts: [],
			path: outputTaskPath
		};
	} else if (taskPath[0] === require_constants.PUSH) {
		const index = typeof taskPath[1] === "number" ? taskPath[1] : parseInt(taskPath[1], 10);
		if (!channels[require_constants.TASKS]?.isAvailable()) return void 0;
		const sends = channels[require_constants.TASKS].get();
		if (index < 0 || index >= sends.length) return void 0;
		const packet = require_constants._isSendInterface(sends[index]) && !require_constants._isSend(sends[index]) ? new require_constants.Send(sends[index].node, sends[index].args) : sends[index];
		if (!require_constants._isSendInterface(packet)) {
			console.warn(`Ignoring invalid packet ${JSON.stringify(packet)} in pending sends.`);
			return void 0;
		}
		if (!(packet.node in processes)) {
			console.warn(`Ignoring unknown node name ${packet.node} in pending sends.`);
			return void 0;
		}
		const triggers = [require_constants.PUSH];
		const checkpointNamespace = parentNamespace === "" ? packet.node : `${parentNamespace}${require_constants.CHECKPOINT_NAMESPACE_SEPARATOR}${packet.node}`;
		const taskId = (0, __langchain_langgraph_checkpoint.uuid5)(JSON.stringify([
			checkpointNamespace,
			step.toString(),
			packet.node,
			require_constants.PUSH,
			index.toString()
		]), checkpoint.id);
		const taskCheckpointNamespace = `${checkpointNamespace}${require_constants.CHECKPOINT_NAMESPACE_END}${taskId}`;
		let metadata = {
			langgraph_step: step,
			langgraph_node: packet.node,
			langgraph_triggers: triggers,
			langgraph_path: taskPath.slice(0, 3),
			langgraph_checkpoint_ns: taskCheckpointNamespace
		};
		if (forExecution) {
			const proc = processes[packet.node];
			const node = proc.getNode();
			if (node !== void 0) {
				if (proc.metadata !== void 0) metadata = {
					...metadata,
					...proc.metadata
				};
				const writes = [];
				return {
					name: packet.node,
					input: packet.args,
					proc: node,
					subgraphs: proc.subgraphs,
					writes,
					config: (0, __langchain_core_runnables.patchConfig)((0, __langchain_core_runnables.mergeConfigs)(config, {
						metadata,
						tags: proc.tags,
						store: extra.store ?? config.store
					}), {
						runName: packet.node,
						callbacks: manager?.getChild(`graph:step:${step}`),
						configurable: {
							[require_constants.CONFIG_KEY_TASK_ID]: taskId,
							[require_constants.CONFIG_KEY_SEND]: (writes_) => _localWrite((items) => writes.push(...items), processes, writes_),
							[require_constants.CONFIG_KEY_READ]: (select_, fresh_ = false) => _localRead(checkpoint, channels, {
								name: packet.node,
								writes,
								triggers,
								path: taskPath
							}, select_, fresh_),
							[require_constants.CONFIG_KEY_CHECKPOINTER]: checkpointer ?? configurable[require_constants.CONFIG_KEY_CHECKPOINTER],
							[require_constants.CONFIG_KEY_CHECKPOINT_MAP]: {
								...configurable[require_constants.CONFIG_KEY_CHECKPOINT_MAP],
								[parentNamespace]: checkpoint.id
							},
							[require_constants.CONFIG_KEY_SCRATCHPAD]: _scratchpad({
								pendingWrites: pendingWrites ?? [],
								taskId,
								currentTaskInput: packet.args,
								resumeMap: config.configurable?.[require_constants.CONFIG_KEY_RESUME_MAP],
								namespaceHash: require_hash.XXH3(taskCheckpointNamespace)
							}),
							[require_constants.CONFIG_KEY_PREVIOUS_STATE]: checkpoint.channel_values[require_constants.PREVIOUS],
							checkpoint_id: void 0,
							checkpoint_ns: taskCheckpointNamespace
						}
					}),
					triggers,
					retry_policy: proc.retryPolicy,
					cache_key: proc.cachePolicy ? {
						key: require_hash.XXH3((proc.cachePolicy.keyFunc ?? JSON.stringify)([packet.args])),
						ns: [
							require_constants.CACHE_NS_WRITES,
							proc.name ?? "__dynamic__",
							packet.node
						],
						ttl: proc.cachePolicy.ttl
					} : void 0,
					id: taskId,
					path: taskPath,
					writers: proc.getWriters()
				};
			}
		} else return {
			id: taskId,
			name: packet.node,
			interrupts: [],
			path: taskPath
		};
	} else if (taskPath[0] === require_constants.PULL) {
		const name = taskPath[1].toString();
		const proc = processes[name];
		if (proc === void 0) return void 0;
		if (pendingWrites?.length) {
			const checkpointNamespace = parentNamespace === "" ? name : `${parentNamespace}${require_constants.CHECKPOINT_NAMESPACE_SEPARATOR}${name}`;
			const taskId = (0, __langchain_langgraph_checkpoint.uuid5)(JSON.stringify([
				checkpointNamespace,
				step.toString(),
				name,
				require_constants.PULL,
				name
			]), checkpoint.id);
			const hasSuccessfulWrites = pendingWrites.some((w) => w[0] === taskId && w[1] !== require_constants.ERROR);
			if (hasSuccessfulWrites) return void 0;
		}
		const nullVersion = require_index.getNullChannelVersion(checkpoint.channel_versions);
		if (nullVersion === void 0) return void 0;
		const seen = checkpoint.versions_seen[name] ?? {};
		const trigger = proc.triggers.find((chan) => {
			if (!channels[chan].isAvailable()) return false;
			return (checkpoint.channel_versions[chan] ?? nullVersion) > (seen[chan] ?? nullVersion);
		});
		if (trigger !== void 0) {
			const val = _procInput(proc, channels, forExecution);
			if (val === void 0) return void 0;
			const checkpointNamespace = parentNamespace === "" ? name : `${parentNamespace}${require_constants.CHECKPOINT_NAMESPACE_SEPARATOR}${name}`;
			const taskId = (0, __langchain_langgraph_checkpoint.uuid5)(JSON.stringify([
				checkpointNamespace,
				step.toString(),
				name,
				require_constants.PULL,
				[trigger]
			]), checkpoint.id);
			const taskCheckpointNamespace = `${checkpointNamespace}${require_constants.CHECKPOINT_NAMESPACE_END}${taskId}`;
			let metadata = {
				langgraph_step: step,
				langgraph_node: name,
				langgraph_triggers: [trigger],
				langgraph_path: taskPath,
				langgraph_checkpoint_ns: taskCheckpointNamespace
			};
			if (forExecution) {
				const node = proc.getNode();
				if (node !== void 0) {
					if (proc.metadata !== void 0) metadata = {
						...metadata,
						...proc.metadata
					};
					const writes = [];
					return {
						name,
						input: val,
						proc: node,
						subgraphs: proc.subgraphs,
						writes,
						config: (0, __langchain_core_runnables.patchConfig)((0, __langchain_core_runnables.mergeConfigs)(config, {
							metadata,
							tags: proc.tags,
							store: extra.store ?? config.store
						}), {
							runName: name,
							callbacks: manager?.getChild(`graph:step:${step}`),
							configurable: {
								[require_constants.CONFIG_KEY_TASK_ID]: taskId,
								[require_constants.CONFIG_KEY_SEND]: (writes_) => _localWrite((items) => {
									writes.push(...items);
								}, processes, writes_),
								[require_constants.CONFIG_KEY_READ]: (select_, fresh_ = false) => _localRead(checkpoint, channels, {
									name,
									writes,
									triggers: [trigger],
									path: taskPath
								}, select_, fresh_),
								[require_constants.CONFIG_KEY_CHECKPOINTER]: checkpointer ?? configurable[require_constants.CONFIG_KEY_CHECKPOINTER],
								[require_constants.CONFIG_KEY_CHECKPOINT_MAP]: {
									...configurable[require_constants.CONFIG_KEY_CHECKPOINT_MAP],
									[parentNamespace]: checkpoint.id
								},
								[require_constants.CONFIG_KEY_SCRATCHPAD]: _scratchpad({
									pendingWrites: pendingWrites ?? [],
									taskId,
									currentTaskInput: val,
									resumeMap: config.configurable?.[require_constants.CONFIG_KEY_RESUME_MAP],
									namespaceHash: require_hash.XXH3(taskCheckpointNamespace)
								}),
								[require_constants.CONFIG_KEY_PREVIOUS_STATE]: checkpoint.channel_values[require_constants.PREVIOUS],
								checkpoint_id: void 0,
								checkpoint_ns: taskCheckpointNamespace
							}
						}),
						triggers: [trigger],
						retry_policy: proc.retryPolicy,
						cache_key: proc.cachePolicy ? {
							key: require_hash.XXH3((proc.cachePolicy.keyFunc ?? JSON.stringify)([val])),
							ns: [
								require_constants.CACHE_NS_WRITES,
								proc.name ?? "__dynamic__",
								name
							],
							ttl: proc.cachePolicy.ttl
						} : void 0,
						id: taskId,
						path: taskPath,
						writers: proc.getWriters()
					};
				}
			} else return {
				id: taskId,
				name,
				interrupts: [],
				path: taskPath
			};
		}
	}
	return void 0;
}
/**
*  Function injected under CONFIG_KEY_READ in task config, to read current state.
*  Used by conditional edges to read a copy of the state with reflecting the writes
*  from that node only.
*
* @internal
*/
function _procInput(proc, channels, forExecution) {
	let val;
	if (typeof proc.channels === "object" && !Array.isArray(proc.channels)) {
		val = {};
		for (const [k, chan] of Object.entries(proc.channels)) if (proc.triggers.includes(chan)) try {
			val[k] = require_io.readChannel(channels, chan, false);
		} catch (e) {
			if (e.name === require_errors.EmptyChannelError.unminifiable_name) return void 0;
			else throw e;
		}
		else if (chan in channels) try {
			val[k] = require_io.readChannel(channels, chan, false);
		} catch (e) {
			if (e.name === require_errors.EmptyChannelError.unminifiable_name) continue;
			else throw e;
		}
	} else if (Array.isArray(proc.channels)) {
		let successfulRead = false;
		for (const chan of proc.channels) try {
			val = require_io.readChannel(channels, chan, false);
			successfulRead = true;
			break;
		} catch (e) {
			if (e.name === require_errors.EmptyChannelError.unminifiable_name) continue;
			else throw e;
		}
		if (!successfulRead) return void 0;
	} else throw new Error(`Invalid channels type, expected list or dict, got ${proc.channels}`);
	if (forExecution && proc.mapper !== void 0) val = proc.mapper(val);
	return val;
}
function _scratchpad({ pendingWrites, taskId, currentTaskInput, resumeMap, namespaceHash }) {
	const nullResume = pendingWrites.find(([writeTaskId, chan]) => writeTaskId === require_constants.NULL_TASK_ID && chan === require_constants.RESUME)?.[2];
	const resume = (() => {
		const result = pendingWrites.filter(([writeTaskId, chan]) => writeTaskId === taskId && chan === require_constants.RESUME).flatMap(([_writeTaskId, _chan, resume$1]) => resume$1);
		if (resumeMap != null && namespaceHash in resumeMap) {
			const mappedResume = resumeMap[namespaceHash];
			result.push(mappedResume);
		}
		return result;
	})();
	const scratchpad = {
		callCounter: 0,
		interruptCounter: -1,
		resume,
		nullResume,
		subgraphCounter: 0,
		currentTaskInput,
		consumeNullResume: () => {
			if (scratchpad.nullResume) {
				delete scratchpad.nullResume;
				pendingWrites.splice(pendingWrites.findIndex(([writeTaskId, chan]) => writeTaskId === require_constants.NULL_TASK_ID && chan === require_constants.RESUME), 1);
				return nullResume;
			}
			return void 0;
		}
	};
	return scratchpad;
}

//#endregion
exports._applyWrites = _applyWrites;
exports._localRead = _localRead;
exports._prepareNextTasks = _prepareNextTasks;
exports._prepareSingleTask = _prepareSingleTask;
exports.increment = increment;
exports.shouldInterrupt = shouldInterrupt;
//# sourceMappingURL=algo.cjs.map