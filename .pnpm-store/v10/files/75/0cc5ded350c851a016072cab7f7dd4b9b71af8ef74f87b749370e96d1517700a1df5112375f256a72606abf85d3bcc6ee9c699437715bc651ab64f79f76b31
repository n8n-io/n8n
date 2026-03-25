const require_errors = require('../errors.cjs');
const require_base = require('./base.cjs');

//#region src/channels/ephemeral_value.ts
/**
* Stores the value received in the step immediately preceding, clears after.
*/
var EphemeralValue = class EphemeralValue extends require_base.BaseChannel {
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
		if (values.length !== 1 && this.guard) throw new require_errors.InvalidUpdateError("EphemeralValue can only receive one value per step.");
		this.value = [values[values.length - 1]];
		return true;
	}
	get() {
		if (this.value.length === 0) throw new require_errors.EmptyChannelError();
		return this.value[0];
	}
	checkpoint() {
		if (this.value.length === 0) throw new require_errors.EmptyChannelError();
		return this.value[0];
	}
	isAvailable() {
		return this.value.length !== 0;
	}
};

//#endregion
exports.EphemeralValue = EphemeralValue;
//# sourceMappingURL=ephemeral_value.cjs.map