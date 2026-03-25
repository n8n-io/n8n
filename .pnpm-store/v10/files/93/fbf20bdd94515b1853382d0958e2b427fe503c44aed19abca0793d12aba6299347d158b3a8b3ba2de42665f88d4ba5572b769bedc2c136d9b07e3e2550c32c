import { InvalidUpdateError } from "../errors.js";
import { CONFIG_KEY_SEND, TASKS, _isSend } from "../constants.js";
import { RunnableCallable } from "../utils.js";
import { Runnable } from "@langchain/core/runnables";

//#region src/pregel/write.ts
const SKIP_WRITE = { [Symbol.for("LG_SKIP_WRITE")]: true };
function _isSkipWrite(x) {
	return typeof x === "object" && x?.[Symbol.for("LG_SKIP_WRITE")] !== void 0;
}
const PASSTHROUGH = { [Symbol.for("LG_PASSTHROUGH")]: true };
function _isPassthrough(x) {
	return typeof x === "object" && x?.[Symbol.for("LG_PASSTHROUGH")] !== void 0;
}
const IS_WRITER = Symbol("IS_WRITER");
/**
* Mapping of write channels to Runnables that return the value to be written,
* or None to skip writing.
*/
var ChannelWrite = class ChannelWrite extends RunnableCallable {
	writes;
	constructor(writes, tags) {
		const name = `ChannelWrite<${writes.map((packet) => {
			if (_isSend(packet)) return packet.node;
			else if ("channel" in packet) return packet.channel;
			return "...";
		}).join(",")}>`;
		super({
			writes,
			name,
			tags,
			func: async (input, config) => {
				return this._write(input, config ?? {});
			}
		});
		this.writes = writes;
	}
	async _write(input, config) {
		const writes = this.writes.map((write) => {
			if (_isChannelWriteTupleEntry(write) && _isPassthrough(write.value)) return {
				mapper: write.mapper,
				value: input
			};
			else if (_isChannelWriteEntry(write) && _isPassthrough(write.value)) return {
				channel: write.channel,
				value: input,
				skipNone: write.skipNone,
				mapper: write.mapper
			};
			else return write;
		});
		await ChannelWrite.doWrite(config, writes);
		return input;
	}
	static async doWrite(config, writes) {
		for (const w of writes) {
			if (_isChannelWriteEntry(w)) {
				if (w.channel === TASKS) throw new InvalidUpdateError("Cannot write to the reserved channel TASKS");
				if (_isPassthrough(w.value)) throw new InvalidUpdateError("PASSTHROUGH value must be replaced");
			}
			if (_isChannelWriteTupleEntry(w)) {
				if (_isPassthrough(w.value)) throw new InvalidUpdateError("PASSTHROUGH value must be replaced");
			}
		}
		const writeEntries = [];
		for (const w of writes) if (_isSend(w)) writeEntries.push([TASKS, w]);
		else if (_isChannelWriteTupleEntry(w)) {
			const mappedResult = await w.mapper.invoke(w.value, config);
			if (mappedResult != null && mappedResult.length > 0) writeEntries.push(...mappedResult);
		} else if (_isChannelWriteEntry(w)) {
			const mappedValue = w.mapper !== void 0 ? await w.mapper.invoke(w.value, config) : w.value;
			if (_isSkipWrite(mappedValue)) continue;
			if (w.skipNone && mappedValue === void 0) continue;
			writeEntries.push([w.channel, mappedValue]);
		} else throw new Error(`Invalid write entry: ${JSON.stringify(w)}`);
		const write = config.configurable?.[CONFIG_KEY_SEND];
		write(writeEntries);
	}
	static isWriter(runnable) {
		return runnable instanceof ChannelWrite || IS_WRITER in runnable && !!runnable[IS_WRITER];
	}
	static registerWriter(runnable) {
		return Object.defineProperty(runnable, IS_WRITER, { value: true });
	}
};
function _isChannelWriteEntry(x) {
	return x !== void 0 && typeof x.channel === "string";
}
function _isChannelWriteTupleEntry(x) {
	return x !== void 0 && !_isChannelWriteEntry(x) && Runnable.isRunnable(x.mapper);
}

//#endregion
export { ChannelWrite, PASSTHROUGH };
//# sourceMappingURL=write.js.map