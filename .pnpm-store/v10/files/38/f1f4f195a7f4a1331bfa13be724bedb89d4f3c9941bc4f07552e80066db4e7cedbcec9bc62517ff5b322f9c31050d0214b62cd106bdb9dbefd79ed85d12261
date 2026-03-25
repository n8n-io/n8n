import { EmptyChannelError, InvalidUpdateError } from "../errors.js";
import { BaseChannel } from "./base.js";

//#region src/channels/named_barrier_value.ts
const areSetsEqual = (a, b) => a.size === b.size && [...a].every((value) => b.has(value));
/**
* A channel that waits until all named values are received before making the value available.
*
* This ensures that if node N and node M both write to channel C, the value of C will not be updated
* until N and M have completed updating.
*/
var NamedBarrierValue = class NamedBarrierValue extends BaseChannel {
	lc_graph_name = "NamedBarrierValue";
	names;
	seen;
	constructor(names) {
		super();
		this.names = names;
		this.seen = /* @__PURE__ */ new Set();
	}
	fromCheckpoint(checkpoint) {
		const empty = new NamedBarrierValue(this.names);
		if (typeof checkpoint !== "undefined") empty.seen = new Set(checkpoint);
		return empty;
	}
	update(values) {
		let updated = false;
		for (const nodeName of values) if (this.names.has(nodeName)) {
			if (!this.seen.has(nodeName)) {
				this.seen.add(nodeName);
				updated = true;
			}
		} else throw new InvalidUpdateError(`Value ${JSON.stringify(nodeName)} not in names ${JSON.stringify(this.names)}`);
		return updated;
	}
	get() {
		if (!areSetsEqual(this.names, this.seen)) throw new EmptyChannelError();
	}
	checkpoint() {
		return [...this.seen];
	}
	consume() {
		if (this.seen && this.names && areSetsEqual(this.seen, this.names)) {
			this.seen = /* @__PURE__ */ new Set();
			return true;
		}
		return false;
	}
	isAvailable() {
		return !!this.names && areSetsEqual(this.names, this.seen);
	}
};
/**
* A channel that waits until all named values are received before making the value ready to be made available.
* It is only made available after finish() is called.
* @internal
*/
var NamedBarrierValueAfterFinish = class NamedBarrierValueAfterFinish extends BaseChannel {
	lc_graph_name = "NamedBarrierValueAfterFinish";
	names;
	seen;
	finished;
	constructor(names) {
		super();
		this.names = names;
		this.seen = /* @__PURE__ */ new Set();
		this.finished = false;
	}
	fromCheckpoint(checkpoint) {
		const empty = new NamedBarrierValueAfterFinish(this.names);
		if (typeof checkpoint !== "undefined") {
			const [seen, finished] = checkpoint;
			empty.seen = new Set(seen);
			empty.finished = finished;
		}
		return empty;
	}
	update(values) {
		let updated = false;
		for (const nodeName of values) if (this.names.has(nodeName) && !this.seen.has(nodeName)) {
			this.seen.add(nodeName);
			updated = true;
		} else if (!this.names.has(nodeName)) throw new InvalidUpdateError(`Value ${JSON.stringify(nodeName)} not in names ${JSON.stringify(this.names)}`);
		return updated;
	}
	get() {
		if (!this.finished || !areSetsEqual(this.names, this.seen)) throw new EmptyChannelError();
	}
	checkpoint() {
		return [[...this.seen], this.finished];
	}
	consume() {
		if (this.finished && this.seen && this.names && areSetsEqual(this.seen, this.names)) {
			this.seen = /* @__PURE__ */ new Set();
			this.finished = false;
			return true;
		}
		return false;
	}
	finish() {
		if (!this.finished && !!this.names && areSetsEqual(this.names, this.seen)) {
			this.finished = true;
			return true;
		}
		return false;
	}
	isAvailable() {
		return this.finished && !!this.names && areSetsEqual(this.names, this.seen);
	}
};

//#endregion
export { NamedBarrierValue, NamedBarrierValueAfterFinish, areSetsEqual };
//# sourceMappingURL=named_barrier_value.js.map