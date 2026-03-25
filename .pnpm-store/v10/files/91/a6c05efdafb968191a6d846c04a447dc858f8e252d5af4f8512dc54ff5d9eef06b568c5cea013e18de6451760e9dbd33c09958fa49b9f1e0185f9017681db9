const require_errors = require('../errors.cjs');
const require_base = require('./base.cjs');

//#region src/channels/topic.ts
/**
* A configurable PubSub Topic.
*/
var Topic = class Topic extends require_base.BaseChannel {
	lc_graph_name = "Topic";
	unique = false;
	accumulate = false;
	seen;
	values;
	constructor(fields) {
		super();
		this.unique = fields?.unique ?? this.unique;
		this.accumulate = fields?.accumulate ?? this.accumulate;
		this.seen = /* @__PURE__ */ new Set();
		this.values = [];
	}
	fromCheckpoint(checkpoint) {
		const empty = new Topic({
			unique: this.unique,
			accumulate: this.accumulate
		});
		if (typeof checkpoint !== "undefined") {
			empty.seen = new Set(checkpoint[0]);
			empty.values = checkpoint[1];
		}
		return empty;
	}
	update(values) {
		let updated = false;
		if (!this.accumulate) {
			updated = this.values.length > 0;
			this.values = [];
		}
		const flatValues = values.flat();
		if (flatValues.length > 0) if (this.unique) {
			for (const value of flatValues) if (!this.seen.has(value)) {
				updated = true;
				this.seen.add(value);
				this.values.push(value);
			}
		} else {
			updated = true;
			this.values.push(...flatValues);
		}
		return updated;
	}
	get() {
		if (this.values.length === 0) throw new require_errors.EmptyChannelError();
		return this.values;
	}
	checkpoint() {
		return [[...this.seen], this.values];
	}
	isAvailable() {
		return this.values.length !== 0;
	}
};

//#endregion
exports.Topic = Topic;
//# sourceMappingURL=topic.cjs.map