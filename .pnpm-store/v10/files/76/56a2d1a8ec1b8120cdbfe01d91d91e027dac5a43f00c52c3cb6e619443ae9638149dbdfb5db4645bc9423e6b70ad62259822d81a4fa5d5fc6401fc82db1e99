const require_errors = require('../errors.cjs');
const require_base = require('./base.cjs');

//#region src/channels/last_value.ts
/**
* Stores the last value received, can receive at most one value per step.
*
* Since `update` is only called once per step and value can only be of length 1,
* LastValue always stores the last value of a single node. If multiple nodes attempt to
* write to this channel in a single step, an error will be thrown.
* @internal
*/
var LastValue = class LastValue extends require_base.BaseChannel {
	lc_graph_name = "LastValue";
	value = [];
	constructor(initialValueFactory) {
		super();
		this.initialValueFactory = initialValueFactory;
		if (initialValueFactory) this.value = [initialValueFactory()];
	}
	fromCheckpoint(checkpoint) {
		const empty = new LastValue(this.initialValueFactory);
		if (typeof checkpoint !== "undefined") empty.value = [checkpoint];
		return empty;
	}
	update(values) {
		if (values.length === 0) return false;
		if (values.length !== 1) throw new require_errors.InvalidUpdateError("LastValue can only receive one value per step.", { lc_error_code: "INVALID_CONCURRENT_GRAPH_UPDATE" });
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
/**
* Stores the last value received, but only made available after finish().
* Once made available, clears the value.
*/
var LastValueAfterFinish = class LastValueAfterFinish extends require_base.BaseChannel {
	lc_graph_name = "LastValueAfterFinish";
	value = [];
	finished = false;
	fromCheckpoint(checkpoint) {
		const empty = new LastValueAfterFinish();
		if (typeof checkpoint !== "undefined") {
			const [value, finished] = checkpoint;
			empty.value = [value];
			empty.finished = finished;
		}
		return empty;
	}
	update(values) {
		if (values.length === 0) return false;
		this.finished = false;
		this.value = [values[values.length - 1]];
		return true;
	}
	get() {
		if (this.value.length === 0 || !this.finished) throw new require_errors.EmptyChannelError();
		return this.value[0];
	}
	checkpoint() {
		if (this.value.length === 0) return void 0;
		return [this.value[0], this.finished];
	}
	consume() {
		if (this.finished) {
			this.finished = false;
			this.value = [];
			return true;
		}
		return false;
	}
	finish() {
		if (!this.finished && this.value.length > 0) {
			this.finished = true;
			return true;
		}
		return false;
	}
	isAvailable() {
		return this.value.length !== 0 && this.finished;
	}
};

//#endregion
exports.LastValue = LastValue;
exports.LastValueAfterFinish = LastValueAfterFinish;
//# sourceMappingURL=last_value.cjs.map