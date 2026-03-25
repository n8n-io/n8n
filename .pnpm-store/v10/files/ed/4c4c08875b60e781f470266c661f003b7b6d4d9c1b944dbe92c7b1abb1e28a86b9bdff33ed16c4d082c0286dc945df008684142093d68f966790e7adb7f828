import { ERROR, INTERRUPT, RETURN, TAG_HIDDEN } from "../constants.js";
import { readChannels } from "./io.js";
import { findSubgraphPregel } from "./utils/subgraph.js";

//#region src/pregel/debug.ts
const COLORS_MAP = {
	blue: {
		start: "\x1B[34m",
		end: "\x1B[0m"
	},
	green: {
		start: "\x1B[32m",
		end: "\x1B[0m"
	},
	yellow: {
		start: "\x1B[33;1m",
		end: "\x1B[0m"
	}
};
/**
* Wrap some text in a color for printing to the console.
*/
const wrap = (color, text) => `${color.start}${text}${color.end}`;
function* mapDebugTasks(tasks) {
	for (const { id, name, input, config, triggers, writes } of tasks) {
		if (config?.tags?.includes(TAG_HIDDEN)) continue;
		const interrupts = writes.filter(([writeId, n]) => {
			return writeId === id && n === INTERRUPT;
		}).map(([, v]) => {
			return v;
		});
		yield {
			id,
			name,
			input,
			triggers,
			interrupts
		};
	}
}
function isMultipleChannelWrite(value) {
	if (typeof value !== "object" || value === null) return false;
	return "$writes" in value && Array.isArray(value.$writes);
}
function mapTaskResultWrites(writes) {
	const result = {};
	for (const [channel, value] of writes) {
		const strChannel = String(channel);
		if (strChannel in result) {
			const channelWrites = isMultipleChannelWrite(result[strChannel]) ? result[strChannel].$writes : [result[strChannel]];
			channelWrites.push(value);
			result[strChannel] = { $writes: channelWrites };
		} else result[strChannel] = value;
	}
	return result;
}
function* mapDebugTaskResults(tasks, streamChannels) {
	for (const [{ id, name, config }, writes] of tasks) {
		if (config?.tags?.includes(TAG_HIDDEN)) continue;
		yield {
			id,
			name,
			result: mapTaskResultWrites(writes.filter(([channel]) => {
				return Array.isArray(streamChannels) ? streamChannels.includes(channel) : channel === streamChannels;
			})),
			interrupts: writes.filter((w) => w[0] === INTERRUPT).map((w) => w[1])
		};
	}
}
function* mapDebugCheckpoint(config, channels, streamChannels, metadata, tasks, pendingWrites, parentConfig, outputKeys) {
	function formatConfig(config$1) {
		const pyConfig = {};
		if (config$1.callbacks != null) pyConfig.callbacks = config$1.callbacks;
		if (config$1.configurable != null) pyConfig.configurable = config$1.configurable;
		if (config$1.maxConcurrency != null) pyConfig.max_concurrency = config$1.maxConcurrency;
		if (config$1.metadata != null) pyConfig.metadata = config$1.metadata;
		if (config$1.recursionLimit != null) pyConfig.recursion_limit = config$1.recursionLimit;
		if (config$1.runId != null) pyConfig.run_id = config$1.runId;
		if (config$1.runName != null) pyConfig.run_name = config$1.runName;
		if (config$1.tags != null) pyConfig.tags = config$1.tags;
		return pyConfig;
	}
	const parentNs = config.configurable?.checkpoint_ns;
	const taskStates = {};
	for (const task of tasks) {
		const candidates = task.subgraphs?.length ? task.subgraphs : [task.proc];
		if (!candidates.find(findSubgraphPregel)) continue;
		let taskNs = `${task.name}:${task.id}`;
		if (parentNs) taskNs = `${parentNs}|${taskNs}`;
		taskStates[task.id] = { configurable: {
			thread_id: config.configurable?.thread_id,
			checkpoint_ns: taskNs
		} };
	}
	yield {
		config: formatConfig(config),
		values: readChannels(channels, streamChannels),
		metadata,
		next: tasks.map((task) => task.name),
		tasks: tasksWithWrites(tasks, pendingWrites, taskStates, outputKeys),
		parentConfig: parentConfig ? formatConfig(parentConfig) : void 0
	};
}
function tasksWithWrites(tasks, pendingWrites, states, outputKeys) {
	return tasks.map((task) => {
		const error = pendingWrites.find(([id, n]) => id === task.id && n === ERROR)?.[2];
		const interrupts = pendingWrites.filter(([id, n]) => id === task.id && n === INTERRUPT).map(([, , v]) => v);
		const result = (() => {
			if (error || interrupts.length || !pendingWrites.length) return void 0;
			const idx = pendingWrites.findIndex(([tid, n]) => tid === task.id && n === RETURN);
			if (idx >= 0) return pendingWrites[idx][2];
			if (typeof outputKeys === "string") return pendingWrites.find(([tid, n]) => tid === task.id && n === outputKeys)?.[2];
			if (Array.isArray(outputKeys)) {
				const results = pendingWrites.filter(([tid, n]) => tid === task.id && outputKeys.includes(n)).map(([, n, v]) => [n, v]);
				if (!results.length) return void 0;
				return mapTaskResultWrites(results);
			}
			return void 0;
		})();
		if (error) return {
			id: task.id,
			name: task.name,
			path: task.path,
			error,
			interrupts,
			result
		};
		const taskState = states?.[task.id];
		return {
			id: task.id,
			name: task.name,
			path: task.path,
			interrupts,
			...taskState !== void 0 ? { state: taskState } : {},
			result
		};
	});
}
function printStepCheckpoint(step, channels, whitelist) {
	console.log([
		`${wrap(COLORS_MAP.blue, `[${step}:checkpoint]`)}`,
		`\x1b[1m State at the end of step ${step}:\x1b[0m\n`,
		JSON.stringify(readChannels(channels, whitelist), null, 2)
	].join(""));
}
function printStepTasks(step, nextTasks) {
	const nTasks = nextTasks.length;
	console.log([
		`${wrap(COLORS_MAP.blue, `[${step}:tasks]`)}`,
		`\x1b[1m Starting step ${step} with ${nTasks} task${nTasks === 1 ? "" : "s"}:\x1b[0m\n`,
		nextTasks.map((task) => `- ${wrap(COLORS_MAP.green, String(task.name))} -> ${JSON.stringify(task.input, null, 2)}`).join("\n")
	].join(""));
}
function printStepWrites(step, writes, whitelist) {
	const byChannel = {};
	for (const [channel, value] of writes) if (whitelist.includes(channel)) {
		if (!byChannel[channel]) byChannel[channel] = [];
		byChannel[channel].push(value);
	}
	console.log([
		`${wrap(COLORS_MAP.blue, `[${step}:writes]`)}`,
		`\x1b[1m Finished step ${step} with writes to ${Object.keys(byChannel).length} channel${Object.keys(byChannel).length !== 1 ? "s" : ""}:\x1b[0m\n`,
		Object.entries(byChannel).map(([name, vals]) => `- ${wrap(COLORS_MAP.yellow, name)} -> ${vals.map((v) => JSON.stringify(v)).join(", ")}`).join("\n")
	].join(""));
}

//#endregion
export { mapDebugCheckpoint, mapDebugTaskResults, mapDebugTasks, printStepCheckpoint, printStepTasks, printStepWrites, tasksWithWrites };
//# sourceMappingURL=debug.js.map