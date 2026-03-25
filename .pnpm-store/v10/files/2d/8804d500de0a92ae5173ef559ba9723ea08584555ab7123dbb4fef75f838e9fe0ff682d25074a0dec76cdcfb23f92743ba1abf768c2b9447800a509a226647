const require_errors = require('../errors.cjs');
const require_base = require('./base.cjs');
const require_named_barrier_value = require('./named_barrier_value.cjs');

//#region src/channels/dynamic_barrier_value.ts
function isWaitForNames(v) {
	return v.__names !== void 0;
}
/**
* A channel that switches between two states
*
* - in the "priming" state it can't be read from.
*     - if it receives a WaitForNames update, it switches to the "waiting" state.
* - in the "waiting" state it collects named values until all are received.
*     - once all named values are received, it can be read once, and it switches
*       back to the "priming" state.
*/
var DynamicBarrierValue = class DynamicBarrierValue extends require_base.BaseChannel {
	lc_graph_name = "DynamicBarrierValue";
	names;
	seen;
	constructor() {
		super();
		this.names = void 0;
		this.seen = /* @__PURE__ */ new Set();
	}
	fromCheckpoint(checkpoint) {
		const empty = new DynamicBarrierValue();
		if (typeof checkpoint !== "undefined") {
			empty.names = new Set(checkpoint[0]);
			empty.seen = new Set(checkpoint[1]);
		}
		return empty;
	}
	update(values) {
		const waitForNames = values.filter(isWaitForNames);
		if (waitForNames.length > 0) {
			if (waitForNames.length > 1) throw new require_errors.InvalidUpdateError("Received multiple WaitForNames updates in the same step.");
			this.names = new Set(waitForNames[0].__names);
			return true;
		} else if (this.names !== void 0) {
			let updated = false;
			for (const value of values) {
				if (isWaitForNames(value)) throw new Error("Assertion Error: Received unexpected WaitForNames instance.");
				if (this.names.has(value) && !this.seen.has(value)) {
					this.seen.add(value);
					updated = true;
				}
			}
			return updated;
		}
		return false;
	}
	consume() {
		if (this.seen && this.names && require_named_barrier_value.areSetsEqual(this.seen, this.names)) {
			this.seen = /* @__PURE__ */ new Set();
			this.names = void 0;
			return true;
		}
		return false;
	}
	get() {
		if (!this.names || !require_named_barrier_value.areSetsEqual(this.names, this.seen)) throw new require_errors.EmptyChannelError();
	}
	checkpoint() {
		return [this.names ? [...this.names] : void 0, [...this.seen]];
	}
	isAvailable() {
		return !!this.names && require_named_barrier_value.areSetsEqual(this.names, this.seen);
	}
};

//#endregion
exports.DynamicBarrierValue = DynamicBarrierValue;
//# sourceMappingURL=dynamic_barrier_value.cjs.map