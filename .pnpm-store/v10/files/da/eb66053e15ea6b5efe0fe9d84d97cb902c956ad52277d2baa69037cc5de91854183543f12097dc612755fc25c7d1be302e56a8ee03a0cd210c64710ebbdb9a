import { EmptyChannelError } from "../errors.js";
import { BaseChannel } from "./base.js";

//#region src/channels/any_value.ts
/**
* Stores the last value received, assumes that if multiple values are received, they are all equal.
*
* Note: Unlike 'LastValue' if multiple nodes write to this channel in a single step, the values
* will be continuously overwritten.
*/
var AnyValue = class AnyValue extends BaseChannel {
	lc_graph_name = "AnyValue";
	value = [];
	constructor() {
		super();
	}
	fromCheckpoint(checkpoint) {
		const empty = new AnyValue();
		if (typeof checkpoint !== "undefined") empty.value = [checkpoint];
		return empty;
	}
	update(values) {
		if (values.length === 0) {
			const updated = this.value.length > 0;
			this.value = [];
			return updated;
		}
		this.value = [values[values.length - 1]];
		return false;
	}
	get() {
		if (this.value.length === 0) throw new EmptyChannelError();
		return this.value[0];
	}
	checkpoint() {
		if (this.value.length === 0) throw new EmptyChannelError();
		return this.value[0];
	}
	isAvailable() {
		return this.value.length !== 0;
	}
};

//#endregion
export { AnyValue };
//# sourceMappingURL=any_value.js.map