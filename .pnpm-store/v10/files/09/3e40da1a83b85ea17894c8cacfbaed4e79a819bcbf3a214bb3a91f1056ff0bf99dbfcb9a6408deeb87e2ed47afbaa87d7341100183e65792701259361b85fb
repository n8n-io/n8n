import { EmptyChannelError, InvalidUpdateError } from "../errors.js";
import { createCheckpoint, emptyChannels, getOnlyChannels } from "../channels/base.js";
import { CACHE_NS_WRITES, CHECKPOINT_NAMESPACE_END, CHECKPOINT_NAMESPACE_SEPARATOR, CONFIG_KEY_CHECKPOINTER, CONFIG_KEY_CHECKPOINT_MAP, CONFIG_KEY_PREVIOUS_STATE, CONFIG_KEY_READ, CONFIG_KEY_RESUME_MAP, CONFIG_KEY_SCRATCHPAD, CONFIG_KEY_SEND, CONFIG_KEY_TASK_ID, ERROR, INTERRUPT, NO_WRITES, NULL_TASK_ID, PREVIOUS, PULL, PUSH, RESERVED, RESUME, RETURN, START, Send, TAG_HIDDEN, TASKS, _isSend, _isSendInterface } from "../constants.js";
import { XXH3 } from "../hash.js";
import { readChannel, readChannels } from "./io.js";
import { isCall } from "./types.js";
import { getNullChannelVersion } from "./utils/index.js";
import { getRunnableForFunc } from "./call.js";
import { copyCheckpoint, maxChannelVersion, uuid5 } from "@langchain/langgraph-checkpoint";
import { mergeConfigs, patchConfig } from "@langchain/core/runnables";

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
		else maxVersion = maxChannelVersion(maxVersion, channelVersions[chan]);
	}
	return maxVersion;
}
function shouldInterrupt(checkpoint, interruptNodes, tasks) {
	const nullVersion = getNullChannelVersion(checkpoint.channel_versions);
	const seen = checkpoint.versions_seen[INTERRUPT] ?? {};
	let anyChannelUpdated = false;
	if ((checkpoint.channel_versions[START] ?? nullVersion) > (seen[START] ?? nullVersion)) anyChannelUpdated = true;
	else for (const chan in checkpoint.channel_versions) {
		if (!Object.prototype.hasOwnProperty.call(checkpoint.channel_versions, chan)) continue;
		if (checkpoint.channel_versions[chan] > (seen[chan] ?? nullVersion)) {
			anyChannelUpdated = true;
			break;
		}
	}
	const anyTriggeredNodeInInterruptNodes = tasks.some((task) => interruptNodes === "*" ? !task.config?.tags?.includes(TAG_HIDDEN) : interruptNodes.includes(task.name));
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
		const newCheckpoint = createCheckpoint(checkpoint, localChannels, -1);
		const newChannels = emptyChannels(localChannels, newCheckpoint);
		_applyWrites(copyCheckpoint(newCheckpoint), newChannels, [task], void 0, void 0);
		values = readChannels({
			...channels,
			...newChannels
		}, select);
	} else values = readChannels(channels, select);
	return values;
}
function _localWrite(commit, processes, writes) {
	for (const [chan, value] of writes) if ([PUSH, TASKS].includes(chan) && value != null) {
		if (!_isSend(value)) throw new InvalidUpdateError(`Invalid packet type, expected SendProtocol, got ${JSON.stringify(value)}`);
		if (!(value.node in processes)) throw new InvalidUpdateError(`Invalid node name "${value.node}" in Send packet`);
	}
	commit(writes);
}
const IGNORE = new Set([
	NO_WRITES,
	PUSH,
	RESUME,
	INTERRUPT,
	RETURN,
	ERROR
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
	const onlyChannels = getOnlyChannels(channels);
	for (const task of tasks) {
		checkpoint.versions_seen[task.name] ??= {};
		for (const chan of task.triggers) if (chan in checkpoint.channel_versions) checkpoint.versions_seen[task.name][chan] = checkpoint.channel_versions[chan];
	}
	let maxVersion = maxChannelMapVersion(checkpoint.channel_versions);
	const channelsToConsume = new Set(tasks.flatMap((task) => task.triggers).filter((chan) => !RESERVED.includes(chan)));
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
			if (e.name === InvalidUpdateError.unminifiable_name) {
				const wrappedError = new InvalidUpdateError(`Invalid update for channel "${chan}" with values ${JSON.stringify(vals)}: ${e.message}`);
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
	const tasksChannel = channels[TASKS];
	if (tasksChannel?.isAvailable()) {
		const len = tasksChannel.get().length;
		for (let i = 0; i < len; i += 1) {
			const task = _prepareSingleTask([PUSH, i], checkpoint, pendingWrites, processes, channels, config, forExecution, extra);
			if (task !== void 0) tasks[task.id] = task;
		}
	}
	for (const name of candidateNodes(checkpoint, processes, extra)) {
		const task = _prepareSingleTask([PULL, name], checkpoint, pendingWrites, processes, channels, config, forExecution, extra);
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
	if (taskPath[0] === PUSH && isCall(taskPath[taskPath.length - 1])) {
		const call = taskPath[taskPath.length - 1];
		const proc = getRunnableForFunc(call.name, call.func);
		const triggers = [PUSH];
		const checkpointNamespace = parentNamespace === "" ? call.name : `${parentNamespace}${CHECKPOINT_NAMESPACE_SEPARATOR}${call.name}`;
		const id = uuid5(JSON.stringify([
			checkpointNamespace,
			step.toString(),
			call.name,
			PUSH,
			taskPath[1],
			taskPath[2]
		]), checkpoint.id);
		const taskCheckpointNamespace = `${checkpointNamespace}${CHECKPOINT_NAMESPACE_END}${id}`;
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
				config: patchConfig(mergeConfigs(config, {
					metadata,
					store: extra.store ?? config.store
				}), {
					runName: call.name,
					callbacks: manager?.getChild(`graph:step:${step}`),
					configurable: {
						[CONFIG_KEY_TASK_ID]: id,
						[CONFIG_KEY_SEND]: (writes_) => _localWrite((items) => writes.push(...items), processes, writes_),
						[CONFIG_KEY_READ]: (select_, fresh_ = false) => _localRead(checkpoint, channels, {
							name: call.name,
							writes,
							triggers,
							path: outputTaskPath
						}, select_, fresh_),
						[CONFIG_KEY_CHECKPOINTER]: checkpointer ?? configurable[CONFIG_KEY_CHECKPOINTER],
						[CONFIG_KEY_CHECKPOINT_MAP]: {
							...configurable[CONFIG_KEY_CHECKPOINT_MAP],
							[parentNamespace]: checkpoint.id
						},
						[CONFIG_KEY_SCRATCHPAD]: _scratchpad({
							pendingWrites: pendingWrites ?? [],
							taskId: id,
							currentTaskInput: call.input,
							resumeMap: config.configurable?.[CONFIG_KEY_RESUME_MAP],
							namespaceHash: XXH3(taskCheckpointNamespace)
						}),
						[CONFIG_KEY_PREVIOUS_STATE]: checkpoint.channel_values[PREVIOUS],
						checkpoint_id: void 0,
						checkpoint_ns: taskCheckpointNamespace
					}
				}),
				triggers,
				retry_policy: call.retry,
				cache_key: call.cache ? {
					key: XXH3((call.cache.keyFunc ?? JSON.stringify)([call.input])),
					ns: [CACHE_NS_WRITES, call.name ?? "__dynamic__"],
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
	} else if (taskPath[0] === PUSH) {
		const index = typeof taskPath[1] === "number" ? taskPath[1] : parseInt(taskPath[1], 10);
		if (!channels[TASKS]?.isAvailable()) return void 0;
		const sends = channels[TASKS].get();
		if (index < 0 || index >= sends.length) return void 0;
		const packet = _isSendInterface(sends[index]) && !_isSend(sends[index]) ? new Send(sends[index].node, sends[index].args) : sends[index];
		if (!_isSendInterface(packet)) {
			console.warn(`Ignoring invalid packet ${JSON.stringify(packet)} in pending sends.`);
			return void 0;
		}
		if (!(packet.node in processes)) {
			console.warn(`Ignoring unknown node name ${packet.node} in pending sends.`);
			return void 0;
		}
		const triggers = [PUSH];
		const checkpointNamespace = parentNamespace === "" ? packet.node : `${parentNamespace}${CHECKPOINT_NAMESPACE_SEPARATOR}${packet.node}`;
		const taskId = uuid5(JSON.stringify([
			checkpointNamespace,
			step.toString(),
			packet.node,
			PUSH,
			index.toString()
		]), checkpoint.id);
		const taskCheckpointNamespace = `${checkpointNamespace}${CHECKPOINT_NAMESPACE_END}${taskId}`;
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
					config: patchConfig(mergeConfigs(config, {
						metadata,
						tags: proc.tags,
						store: extra.store ?? config.store
					}), {
						runName: packet.node,
						callbacks: manager?.getChild(`graph:step:${step}`),
						configurable: {
							[CONFIG_KEY_TASK_ID]: taskId,
							[CONFIG_KEY_SEND]: (writes_) => _localWrite((items) => writes.push(...items), processes, writes_),
							[CONFIG_KEY_READ]: (select_, fresh_ = false) => _localRead(checkpoint, channels, {
								name: packet.node,
								writes,
								triggers,
								path: taskPath
							}, select_, fresh_),
							[CONFIG_KEY_CHECKPOINTER]: checkpointer ?? configurable[CONFIG_KEY_CHECKPOINTER],
							[CONFIG_KEY_CHECKPOINT_MAP]: {
								...configurable[CONFIG_KEY_CHECKPOINT_MAP],
								[parentNamespace]: checkpoint.id
							},
							[CONFIG_KEY_SCRATCHPAD]: _scratchpad({
								pendingWrites: pendingWrites ?? [],
								taskId,
								currentTaskInput: packet.args,
								resumeMap: config.configurable?.[CONFIG_KEY_RESUME_MAP],
								namespaceHash: XXH3(taskCheckpointNamespace)
							}),
							[CONFIG_KEY_PREVIOUS_STATE]: checkpoint.channel_values[PREVIOUS],
							checkpoint_id: void 0,
							checkpoint_ns: taskCheckpointNamespace
						}
					}),
					triggers,
					retry_policy: proc.retryPolicy,
					cache_key: proc.cachePolicy ? {
						key: XXH3((proc.cachePolicy.keyFunc ?? JSON.stringify)([packet.args])),
						ns: [
							CACHE_NS_WRITES,
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
	} else if (taskPath[0] === PULL) {
		const name = taskPath[1].toString();
		const proc = processes[name];
		if (proc === void 0) return void 0;
		if (pendingWrites?.length) {
			const checkpointNamespace = parentNamespace === "" ? name : `${parentNamespace}${CHECKPOINT_NAMESPACE_SEPARATOR}${name}`;
			const taskId = uuid5(JSON.stringify([
				checkpointNamespace,
				step.toString(),
				name,
				PULL,
				name
			]), checkpoint.id);
			const hasSuccessfulWrites = pendingWrites.some((w) => w[0] === taskId && w[1] !== ERROR);
			if (hasSuccessfulWrites) return void 0;
		}
		const nullVersion = getNullChannelVersion(checkpoint.channel_versions);
		if (nullVersion === void 0) return void 0;
		const seen = checkpoint.versions_seen[name] ?? {};
		const trigger = proc.triggers.find((chan) => {
			if (!channels[chan].isAvailable()) return false;
			return (checkpoint.channel_versions[chan] ?? nullVersion) > (seen[chan] ?? nullVersion);
		});
		if (trigger !== void 0) {
			const val = _procInput(proc, channels, forExecution);
			if (val === void 0) return void 0;
			const checkpointNamespace = parentNamespace === "" ? name : `${parentNamespace}${CHECKPOINT_NAMESPACE_SEPARATOR}${name}`;
			const taskId = uuid5(JSON.stringify([
				checkpointNamespace,
				step.toString(),
				name,
				PULL,
				[trigger]
			]), checkpoint.id);
			const taskCheckpointNamespace = `${checkpointNamespace}${CHECKPOINT_NAMESPACE_END}${taskId}`;
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
						config: patchConfig(mergeConfigs(config, {
							metadata,
							tags: proc.tags,
							store: extra.store ?? config.store
						}), {
							runName: name,
							callbacks: manager?.getChild(`graph:step:${step}`),
							configurable: {
								[CONFIG_KEY_TASK_ID]: taskId,
								[CONFIG_KEY_SEND]: (writes_) => _localWrite((items) => {
									writes.push(...items);
								}, processes, writes_),
								[CONFIG_KEY_READ]: (select_, fresh_ = false) => _localRead(checkpoint, channels, {
									name,
									writes,
									triggers: [trigger],
									path: taskPath
								}, select_, fresh_),
								[CONFIG_KEY_CHECKPOINTER]: checkpointer ?? configurable[CONFIG_KEY_CHECKPOINTER],
								[CONFIG_KEY_CHECKPOINT_MAP]: {
									...configurable[CONFIG_KEY_CHECKPOINT_MAP],
									[parentNamespace]: checkpoint.id
								},
								[CONFIG_KEY_SCRATCHPAD]: _scratchpad({
									pendingWrites: pendingWrites ?? [],
									taskId,
									currentTaskInput: val,
									resumeMap: config.configurable?.[CONFIG_KEY_RESUME_MAP],
									namespaceHash: XXH3(taskCheckpointNamespace)
								}),
								[CONFIG_KEY_PREVIOUS_STATE]: checkpoint.channel_values[PREVIOUS],
								checkpoint_id: void 0,
								checkpoint_ns: taskCheckpointNamespace
							}
						}),
						triggers: [trigger],
						retry_policy: proc.retryPolicy,
						cache_key: proc.cachePolicy ? {
							key: XXH3((proc.cachePolicy.keyFunc ?? JSON.stringify)([val])),
							ns: [
								CACHE_NS_WRITES,
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
			val[k] = readChannel(channels, chan, false);
		} catch (e) {
			if (e.name === EmptyChannelError.unminifiable_name) return void 0;
			else throw e;
		}
		else if (chan in channels) try {
			val[k] = readChannel(channels, chan, false);
		} catch (e) {
			if (e.name === EmptyChannelError.unminifiable_name) continue;
			else throw e;
		}
	} else if (Array.isArray(proc.channels)) {
		let successfulRead = false;
		for (const chan of proc.channels) try {
			val = readChannel(channels, chan, false);
			successfulRead = true;
			break;
		} catch (e) {
			if (e.name === EmptyChannelError.unminifiable_name) continue;
			else throw e;
		}
		if (!successfulRead) return void 0;
	} else throw new Error(`Invalid channels type, expected list or dict, got ${proc.channels}`);
	if (forExecution && proc.mapper !== void 0) val = proc.mapper(val);
	return val;
}
function _scratchpad({ pendingWrites, taskId, currentTaskInput, resumeMap, namespaceHash }) {
	const nullResume = pendingWrites.find(([writeTaskId, chan]) => writeTaskId === NULL_TASK_ID && chan === RESUME)?.[2];
	const resume = (() => {
		const result = pendingWrites.filter(([writeTaskId, chan]) => writeTaskId === taskId && chan === RESUME).flatMap(([_writeTaskId, _chan, resume$1]) => resume$1);
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
				pendingWrites.splice(pendingWrites.findIndex(([writeTaskId, chan]) => writeTaskId === NULL_TASK_ID && chan === RESUME), 1);
				return nullResume;
			}
			return void 0;
		}
	};
	return scratchpad;
}

//#endregion
export { _applyWrites, _localRead, _prepareNextTasks, _prepareSingleTask, increment, shouldInterrupt };
//# sourceMappingURL=algo.js.map