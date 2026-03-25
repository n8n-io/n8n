import { EmptyChannelError, InvalidUpdateError } from "../errors.js";
import { BaseChannel } from "./base.js";

//#region src/channels/ephemeral_value.ts
/**
* Stores the value received in the step immediately preceding, clears after.
*/
var EphemeralValue = class EphemeralValue extends BaseChannel {
	lc_graph_name = "EphemeralValue";
	guard;
	value = [];
	constructor(guard = true) {
		super();
		this.guard = guard;
	}
	fromCheckpoint(checkpoint) {
		const empty = new EphemeralValue(this.guard);
		if (typeof checkpoint !== "undefined") empty.value = [checkpoint];
		return empty;
	}
	update(values) {
		if (values.length === 0) {
			const updated = this.value.length > 0;
			this.value = [];
			return updated;
		}
		if (values.length !== 1 && this.guard) throw new InvalidUpdateError("EphemeralValue can only receive one value per step.");
		this.value = [values[values.length - 1]];
		return true;
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
export { EphemeralValue };
//# sourceMappingURL=ephemeral_value.js.map