import { _getOverwriteValue, _isOverwriteValue } from "../constants.js";
import { EmptyChannelError, InvalidUpdateError } from "../errors.js";
import { BaseChannel } from "./base.js";

//#region src/channels/binop.ts
const isBinaryOperatorAggregate = (value) => {
	return value != null && value.lc_graph_name === "BinaryOperatorAggregate";
};
/**
* Stores the result of applying a binary operator to the current value and each new value.
*/
var BinaryOperatorAggregate = class BinaryOperatorAggregate extends BaseChannel {
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
			const first = newValues[0];
			const [isOverwrite, overwriteVal] = _getOverwriteValue(first);
			if (isOverwrite) this.value = overwriteVal;
			else this.value = first;
			newValues = newValues.slice(1);
		}
		let seenOverwrite = false;
		for (const incoming of newValues) if (_isOverwriteValue(incoming)) {
			if (seenOverwrite) throw new InvalidUpdateError("Can receive only one Overwrite value per step.");
			const [, val] = _getOverwriteValue(incoming);
			this.value = val;
			seenOverwrite = true;
			continue;
		} else if (!seenOverwrite && this.value !== void 0) this.value = this.operator(this.value, incoming);
		return true;
	}
	get() {
		if (this.value === void 0) throw new EmptyChannelError();
		return this.value;
	}
	checkpoint() {
		if (this.value === void 0) throw new EmptyChannelError();
		return this.value;
	}
	isAvailable() {
		return this.value !== void 0;
	}
	/**
	* Compare this channel with another channel for equality.
	* Two BinaryOperatorAggregate channels are equal if they have the same operator function.
	* This follows the Python implementation which compares operator references.
	*/
	equals(other) {
		if (this === other) return true;
		if (!isBinaryOperatorAggregate(other)) return false;
		return this.operator === other.operator;
	}
};

//#endregion
export { BinaryOperatorAggregate };
//# sourceMappingURL=binop.js.map