import { SerializableSchema } from "../types.js";

//#region src/state/values/reduced.d.ts
/**
 * Symbol for runtime identification of ReducedValue instances.
 */
declare const REDUCED_VALUE_SYMBOL: symbol;
interface ReducedValueInitBase<Value = unknown> {
  /**
   * The reducer function that determines how new input values are combined with the current state.
   * Receives the current output value and a new input value, and must return the updated output.
   *
   * @param current - The current value held in state.
   * @param next - The new input value to apply to the reducer.
   * @returns The next value to be stored in state.
   *
   * @remarks
   * - The logic for updating state in response to new inputs lives in this function.
   */
  reducer: (current: Value, next: Value) => Value;
  /**
   * Optional extra fields to be added to the exported JSON Schema for documentation or additional constraints.
   *
   * @remarks
   * - Use this property to attach metadata or documentation to the generated JSON Schema representation
   *   of this value.
   * - These fields are merged into the generated schema, which can assist with code generation, UI hints,
   *   or external documentation.
   */
  jsonSchemaExtra?: Record<string, unknown>;
}
interface ReducedValueInitWithSchema<Value = unknown, Input = Value> {
  /**
   * Schema describing the type and validation logic for reducer input values.
   *
   * @remarks
   * - If provided, new values passed to the reducer will be validated using this schema before reduction.
   * - This allows the reducer to accept inputs distinct from the type stored in the state (output type).
   */
  inputSchema: SerializableSchema<unknown, Input>;
  /**
   * The reducer function that determines how new input values are combined with the current state.
   * Receives the current output value and a new input value (validated using `inputSchema`), and returns the updated output.
   *
   * @param current - The current value held in state.
   * @param next - The new validated input value to be applied.
   * @returns The next value to be stored in state.
   *
   * @remarks
   * - The logic for updating state in response to new inputs lives in this function.
   */
  reducer: (current: Value, next: Input) => Value;
  /**
   * Optional extra fields to be added to the exported JSON Schema for documentation or additional constraints.
   *
   * @remarks
   * - Use this property to attach metadata or documentation to the generated JSON Schema representation
   *   of this value.
   * - These fields are merged into the generated schema, which can assist with code generation, UI hints,
   *   or external documentation.
   */
  jsonSchemaExtra?: Record<string, unknown>;
}
/**
 * Initialization options for {@link ReducedValue}.
 *
 * Two forms are supported:
 * 1. Provide only a reducer (and optionally `jsonSchemaExtra`)—in this case, the reducer's inputs are validated using the output value schema.
 * 2. Provide an explicit `inputSchema` field to distinguish the reducer's input type from the stored/output type.
 *
 * @template Value - The type of value stored and produced after reduction.
 * @template Input - The type of inputs accepted by the reducer.
 *
 * @property inputSchema - The schema describing reducer inputs. If omitted, will use the value schema.
 * @property reducer - A function that receives the current output value and a new input, and returns the new output.
 * @property jsonSchemaExtra - (Optional) Extra fields to merge into the exported JSON Schema for documentation or additional constraints.
 */
type ReducedValueInit<Value = unknown, Input = Value> = ReducedValueInitWithSchema<Value, Input> | ReducedValueInitBase<Value>;
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
declare class ReducedValue<Value = unknown, Input = Value> {
  readonly [REDUCED_VALUE_SYMBOL]: true;
  /**
   * The schema that describes the type of value stored in state (i.e., after reduction).
   * Note: We use `unknown` for the input type to allow schemas with `.default()` wrappers,
   * where the input type includes `undefined`.
   */
  readonly valueSchema: SerializableSchema<unknown, Value>;
  /**
   * The schema used to validate reducer inputs.
   * If not specified explicitly, this defaults to `valueSchema`.
   */
  readonly inputSchema: SerializableSchema<unknown, Input | Value>;
  /**
   * The reducer function that combines a current output value and an incoming input.
   */
  readonly reducer: (current: Value, next: Input) => Value;
  /**
   * Optional extra fields to merge into the generated JSON Schema (e.g., for documentation or constraints).
   */
  readonly jsonSchemaExtra?: Record<string, unknown>;
  /**
   * Represents the value stored after all reductions.
   */
  ValueType: Value;
  /**
   * Represents the type that may be provided as input on each update.
   */
  InputType: Input;
  /**
   * Constructs a ReducedValue instance, which combines a value schema and a reducer function (plus optional input schema).
   *
   * @param valueSchema - The schema that describes the type of value stored in state (the "running total").
   * @param init - An object specifying the reducer function (required), inputSchema (optional), and jsonSchemaExtra (optional).
   */
  constructor(valueSchema: SerializableSchema<unknown, Value>, init: ReducedValueInitWithSchema<Value, Input>);
  constructor(valueSchema: SerializableSchema<Input, Value>, init: ReducedValueInitBase<Value>);
  /**
   * Type guard to check if a value is a ReducedValue instance.
   */
  static isInstance<Value = unknown, Input = Value>(value: ReducedValue<Value, Input>): value is ReducedValue<Value, Input>;
  static isInstance(value: unknown): value is ReducedValue;
}
//#endregion
export { ReducedValue, ReducedValueInit };
//# sourceMappingURL=reduced.d.ts.map