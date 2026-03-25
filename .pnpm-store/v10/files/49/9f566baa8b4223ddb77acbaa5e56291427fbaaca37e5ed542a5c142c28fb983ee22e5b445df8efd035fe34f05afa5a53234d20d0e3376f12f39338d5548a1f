const require_errors = require('../errors.cjs');
const require_constants = require('../constants.cjs');
const require_hash = require('../hash.cjs');

//#region src/pregel/io.ts
function readChannel(channels, chan, catchErrors = true, returnException = false) {
	try {
		return channels[chan].get();
	} catch (e) {
		if (e.name === require_errors.EmptyChannelError.unminifiable_name) {
			if (returnException) return e;
			else if (catchErrors) return null;
		}
		throw e;
	}
}
function readChannels(channels, select, skipEmpty = true) {
	if (Array.isArray(select)) {
		const values = {};
		for (const k of select) try {
			values[k] = readChannel(channels, k, !skipEmpty);
		} catch (e) {
			if (e.name === require_errors.EmptyChannelError.unminifiable_name) continue;
		}
		return values;
	} else return readChannel(channels, select);
}
/**
* Map input chunk to a sequence of pending writes in the form (channel, value).
*/
function* mapCommand(cmd, pendingWrites) {
	if (cmd.graph === require_constants.Command.PARENT) throw new require_errors.InvalidUpdateError("There is no parent graph.");
	if (cmd.goto) {
		let sends;
		if (Array.isArray(cmd.goto)) sends = cmd.goto;
		else sends = [cmd.goto];
		for (const send of sends) if (require_constants._isSend(send)) yield [
			require_constants.NULL_TASK_ID,
			require_constants.TASKS,
			send
		];
		else if (typeof send === "string") yield [
			require_constants.NULL_TASK_ID,
			`branch:to:${send}`,
			"__start__"
		];
		else throw new Error(`In Command.send, expected Send or string, got ${typeof send}`);
	}
	if (cmd.resume) if (typeof cmd.resume === "object" && Object.keys(cmd.resume).length && Object.keys(cmd.resume).every(require_hash.isXXH3)) for (const [tid, resume] of Object.entries(cmd.resume)) {
		const existing = pendingWrites.filter((w) => w[0] === tid && w[1] === require_constants.RESUME).map((w) => w[2]).slice(0, 1) ?? [];
		existing.push(resume);
		yield [
			tid,
			require_constants.RESUME,
			existing
		];
	}
	else yield [
		require_constants.NULL_TASK_ID,
		require_constants.RESUME,
		cmd.resume
	];
	if (cmd.update) {
		if (typeof cmd.update !== "object" || !cmd.update) throw new Error("Expected cmd.update to be a dict mapping channel names to update values");
		if (Array.isArray(cmd.update)) for (const [k, v] of cmd.update) yield [
			require_constants.NULL_TASK_ID,
			k,
			v
		];
		else for (const [k, v] of Object.entries(cmd.update)) yield [
			require_constants.NULL_TASK_ID,
			k,
			v
		];
	}
}
/**
* Map input chunk to a sequence of pending writes in the form [channel, value].
*/
function* mapInput(inputChannels, chunk) {
	if (chunk !== void 0 && chunk !== null) if (Array.isArray(inputChannels) && typeof chunk === "object" && !Array.isArray(chunk)) {
		for (const k in chunk) if (inputChannels.includes(k)) yield [k, chunk[k]];
	} else if (Array.isArray(inputChannels)) throw new Error(`Input chunk must be an object when "inputChannels" is an array`);
	else yield [inputChannels, chunk];
}
/**
* Map pending writes (a sequence of tuples (channel, value)) to output chunk.
*/
function* mapOutputValues(outputChannels, pendingWrites, channels) {
	if (Array.isArray(outputChannels)) {
		if (pendingWrites === true || pendingWrites.find(([chan, _]) => outputChannels.includes(chan))) yield readChannels(channels, outputChannels);
	} else if (pendingWrites === true || pendingWrites.some(([chan, _]) => chan === outputChannels)) yield readChannel(channels, outputChannels);
}
/**
* Map pending writes (a sequence of tuples (channel, value)) to output chunk.
* @internal
*
* @param outputChannels - The channels to output.
* @param tasks - The tasks to output.
* @param cached - Whether the output is cached.
*
* @returns A generator that yields the output chunk (if any).
*/
function* mapOutputUpdates(outputChannels, tasks, cached) {
	const outputTasks = tasks.filter(([task, ww]) => {
		return (task.config === void 0 || !task.config.tags?.includes(require_constants.TAG_HIDDEN)) && ww[0][0] !== require_constants.ERROR && ww[0][0] !== require_constants.INTERRUPT;
	});
	if (!outputTasks.length) return;
	let updated;
	if (outputTasks.some(([task]) => task.writes.some(([chan, _]) => chan === require_constants.RETURN))) updated = outputTasks.flatMap(([task]) => task.writes.filter(([chan, _]) => chan === require_constants.RETURN).map(([_, value]) => [task.name, value]));
	else if (!Array.isArray(outputChannels)) updated = outputTasks.flatMap(([task]) => task.writes.filter(([chan, _]) => chan === outputChannels).map(([_, value]) => [task.name, value]));
	else updated = outputTasks.flatMap(([task]) => {
		const { writes } = task;
		const counts = {};
		for (const [chan] of writes) if (outputChannels.includes(chan)) counts[chan] = (counts[chan] || 0) + 1;
		if (Object.values(counts).some((count) => count > 1)) return writes.filter(([chan]) => outputChannels.includes(chan)).map(([chan, value]) => [task.name, { [chan]: value }]);
		else return [[task.name, Object.fromEntries(writes.filter(([chan]) => outputChannels.includes(chan)))]];
	});
	const grouped = {};
	for (const [node, value] of updated) {
		if (!(node in grouped)) grouped[node] = [];
		grouped[node].push(value);
	}
	const flattened = {};
	for (const node in grouped) if (grouped[node].length === 1) {
		const [write] = grouped[node];
		flattened[node] = write;
	} else flattened[node] = grouped[node];
	if (cached) flattened["__metadata__"] = { cached };
	yield flattened;
}

//#endregion
exports.mapCommand = mapCommand;
exports.mapInput = mapInput;
exports.mapOutputUpdates = mapOutputUpdates;
exports.mapOutputValues = mapOutputValues;
exports.readChannel = readChannel;
exports.readChannels = readChannels;
//# sourceMappingURL=io.cjs.map