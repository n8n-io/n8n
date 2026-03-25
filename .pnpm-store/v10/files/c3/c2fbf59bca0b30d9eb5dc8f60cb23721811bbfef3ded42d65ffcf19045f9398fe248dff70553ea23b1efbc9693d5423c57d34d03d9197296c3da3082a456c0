const require_errors = require('../errors.cjs');
const require_base = require('./base.cjs');

//#region src/channels/binop.ts
/**
* Stores the result of applying a binary operator to the current value and each new value.
*/
var BinaryOperatorAggregate = class BinaryOperatorAggregate extends require_base.BaseChannel {
	lc_graph_name = "BinaryOperatorAggregate";
	value;
	operator;
	initialValueFactory;
	constructor(operator, initialValueFactory) {
		super();
		this.operator = operator;
		this.initialValueFactory = initialValueFactory;
		this.value = initialValueFactory?.();
	}
	fromCheckpoint(checkpoint) {
		const empty = new BinaryOperatorAggregate(this.operator, this.initialValueFactory);
		if (typeof checkpoint !== "undefined") empty.value = checkpoint;
		return empty;
	}
	update(values) {
		let newValues = values;
		if (!newValues.length) return false;
		if (this.value === void 0) {
			[this.value] = newValues;
			newValues = newValues.slice(1);
		}
		for (const value of newValues) if (this.value !== void 0) this.value = this.operator(this.value, value);
		return true;
	}
	get() {
		if (this.value === void 0) throw new require_errors.EmptyChannelError();
		return this.value;
	}
	checkpoint() {
		if (this.value === void 0) throw new require_errors.EmptyChannelError();
		return this.value;
	}
	isAvailable() {
		return this.value !== void 0;
	}
};

//#endregion
exports.BinaryOperatorAggregate = BinaryOperatorAggregate;
//# sourceMappingURL=binop.cjs.map