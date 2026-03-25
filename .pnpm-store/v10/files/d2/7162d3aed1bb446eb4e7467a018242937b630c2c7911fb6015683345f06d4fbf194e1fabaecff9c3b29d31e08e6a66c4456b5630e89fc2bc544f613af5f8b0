//#region src/state/values/reduced.ts
/**
* Symbol for runtime identification of ReducedValue instances.
*/
const REDUCED_VALUE_SYMBOL = Symbol.for("langgraph.state.reduced_value");
/**
* Represents a state field whose value is computed and updated using a reducer function.
*
* {@link ReducedValue} allows you to define accumulators, counters, aggregators, or other fields
* whose value is determined incrementally by applying a reducer to incoming updates.
*
* Each time a new input is provided, the reducer function is called with the current output
* and the new input, producing an updated value. Input validation can be controlled separately
* from output validation by providing an explicit input schema.
*
* @template Value - The type of the value stored in state and produced by reduction.
* @template Input - The type of updates accepted by the reducer.
*
* @example
* // Accumulator with distinct input validation
* const Sum = new ReducedValue(z.number(), {
*   inputSchema: z.number().min(1),
*   reducer: (total, toAdd) => total + toAdd
* });
*
* @example
* // Simple running max, using only the value schema
* const Max = new ReducedValue(z.number(), {
*   reducer: (current, next) => Math.max(current, next)
* });
*/
var ReducedValue = class {
	/**
	* Instance marker for runtime identification.
	* @internal
	*/
	[REDUCED_VALUE_SYMBOL] = true;
	/**
	* The schema that describes the type of value stored in state (i.e., after reduction).
	* Note: We use `unknown` for the input type to allow schemas with `.default()` wrappers,
	* where the input type includes `undefined`.
	*/
	valueSchema;
	/**
	* The schema used to validate reducer inputs.
	* If not specified explicitly, this defaults to `valueSchema`.
	*/
	inputSchema;
	/**
	* The reducer function that combines a current output value and an incoming input.
	*/
	reducer;
	/**
	* Optional extra fields to merge into the generated JSON Schema (e.g., for documentation or constraints).
	*/
	jsonSchemaExtra;
	constructor(valueSchema, init) {
		this.reducer = init.reducer;
		this.jsonSchemaExtra = init.jsonSchemaExtra;
		this.valueSchema = valueSchema;
		this.inputSchema = "inputSchema" in init ? init.inputSchema : valueSchema;
		this.jsonSchemaExtra = init.jsonSchemaExtra;
	}
	static isInstance(value) {
		return typeof value === "object" && value !== null && REDUCED_VALUE_SYMBOL in value && value[REDUCED_VALUE_SYMBOL] === true;
	}
};

//#endregion
export { ReducedValue };
//# sourceMappingURL=reduced.js.map