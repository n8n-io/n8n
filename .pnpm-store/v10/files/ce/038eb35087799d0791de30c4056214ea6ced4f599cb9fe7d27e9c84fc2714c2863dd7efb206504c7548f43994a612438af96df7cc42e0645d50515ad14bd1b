import { EmptyChannelError } from "../errors.js";
import { uuid6 } from "@langchain/langgraph-checkpoint";

//#region src/channels/base.ts
function isBaseChannel(obj) {
	return obj != null && obj.lg_is_channel === true;
}
/** @internal */
var BaseChannel = class {
	ValueType;
	UpdateType;
	/** @ignore */
	lg_is_channel = true;
	/**
	* Mark the current value of the channel as consumed. By default, no-op.
	* A channel can use this method to modify its state, preventing the value
	* from being consumed again.
	*
	* Returns True if the channel was updated, False otherwise.
	*/
	consume() {
		return false;
	}
	/**
	* Notify the channel that the Pregel run is finishing. By default, no-op.
	* A channel can use this method to modify its state, preventing finish.
	*
	* Returns True if the channel was updated, False otherwise.
	*/
	finish() {
		return false;
	}
	/**
	* Return True if the channel is available (not empty), False otherwise.
	* Subclasses should override this method to provide a more efficient
	* implementation than calling get() and catching EmptyChannelError.
	*/
	isAvailable() {
		try {
			this.get();
			return true;
		} catch (error) {
			if (error.name === EmptyChannelError.unminifiable_name) return false;
			throw error;
		}
	}
};
const IS_ONLY_BASE_CHANNEL = Symbol.for("LG_IS_ONLY_BASE_CHANNEL");
function getOnlyChannels(channels) {
	if (channels[IS_ONLY_BASE_CHANNEL] === true) return channels;
	const newChannels = {};
	for (const k in channels) {
		if (!Object.prototype.hasOwnProperty.call(channels, k)) continue;
		const value = channels[k];
		if (isBaseChannel(value)) newChannels[k] = value;
	}
	Object.assign(newChannels, { [IS_ONLY_BASE_CHANNEL]: true });
	return newChannels;
}
function emptyChannels(channels, checkpoint) {
	const filteredChannels = getOnlyChannels(channels);
	const newChannels = {};
	for (const k in filteredChannels) {
		if (!Object.prototype.hasOwnProperty.call(filteredChannels, k)) continue;
		const channelValue = checkpoint.channel_values[k];
		newChannels[k] = filteredChannels[k].fromCheckpoint(channelValue);
	}
	Object.assign(newChannels, { [IS_ONLY_BASE_CHANNEL]: true });
	return newChannels;
}
function createCheckpoint(checkpoint, channels, step, options) {
	let values;
	if (channels === void 0) values = checkpoint.channel_values;
	else {
		values = {};
		for (const k in channels) {
			if (!Object.prototype.hasOwnProperty.call(channels, k)) continue;
			try {
				values[k] = channels[k].checkpoint();
			} catch (error) {
				if (error.name === EmptyChannelError.unminifiable_name) {} else throw error;
			}
		}
	}
	return {
		v: 4,
		id: options?.id ?? uuid6(step),
		ts: (/* @__PURE__ */ new Date()).toISOString(),
		channel_values: values,
		channel_versions: checkpoint.channel_versions,
		versions_seen: checkpoint.versions_seen
	};
}

//#endregion
export { BaseChannel, createCheckpoint, emptyChannels, getOnlyChannels, isBaseChannel };
//# sourceMappingURL=base.js.map