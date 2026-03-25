//#region src/state/values/untracked.ts
/**
* Symbol for runtime identification of UntrackedValue instances.
*/
const UNTRACKED_VALUE_SYMBOL = Symbol.for("langgraph.state.untracked_value");
/**
* Represents a state field whose value is transient and never checkpointed.
*
* Use {@link UntrackedValue} for state fields that should be tracked for the lifetime
* of the process, but should not participate in durable checkpoints or recovery.
*
* @typeParam Value - The type of value stored in this field.
*
* @example
* // Create an untracked in-memory cache
* const cache = new UntrackedValue<Record<string, number>>();
*
* // Use with a type schema for basic runtime validation
* import { z } from "zod";
* const tempSession = new UntrackedValue(z.object({ token: z.string() }), { guard: false });
*
* // You can customize whether to throw on multiple updates per step:
* const session = new UntrackedValue(undefined, { guard: false });
*/
var UntrackedValue = class {
	/**
	* Instance marker for runtime identification.
	* @internal
	*/
	[UNTRACKED_VALUE_SYMBOL] = true;
	/**
	* Optional schema describing the type and shape of the value stored in this field.
	*
	* If provided, this can be used for runtime validation or code generation.
	*/
	schema;
	/**
	* Whether to guard against multiple updates to this untracked value in a single step.
	*
	* - If `true` (default), throws an error if multiple updates are received in one step.
	* - If `false`, only the last value from that step is kept, others are ignored.
	*
	* This helps prevent accidental state replacement within a step.
	*/
	guard;
	/**
	* Create a new untracked value state field.
	*
	* @param schema - Optional type schema describing the value (e.g. a Zod schema).
	* @param init - Optional options for tracking updates or enabling multiple-writes-per-step.
	*/
	constructor(schema, init) {
		this.schema = schema;
		this.guard = init?.guard ?? true;
	}
	static isInstance(value) {
		return typeof value === "object" && value !== null && UNTRACKED_VALUE_SYMBOL in value;
	}
};

//#endregion
export { UntrackedValue };
//# sourceMappingURL=untracked.js.map