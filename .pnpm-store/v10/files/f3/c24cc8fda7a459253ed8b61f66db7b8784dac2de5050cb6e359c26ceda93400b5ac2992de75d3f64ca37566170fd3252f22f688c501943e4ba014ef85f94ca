import { BaseChannel } from "../channels/base.cjs";
import { OverwriteValue } from "../constants.cjs";
import { RunnableLike } from "../pregel/runnable_types.cjs";
import { SerializableSchema } from "./types.cjs";
import { ReducedValue } from "./values/reduced.cjs";
import { UntrackedValue } from "./values/untracked.cjs";
import { JSONSchema } from "@langchain/core/utils/json_schema";

//#region src/state/schema.d.ts
declare const STATE_SCHEMA_SYMBOL: unique symbol;
/**
 * Maps a single StateSchema field definition to its corresponding Channel type.
 *
 * This utility type inspects the type of the field and returns an appropriate
 * `BaseChannel` type, parameterized with the state "value" and "input" types according to the field's shape.
 *
 * Rules:
 * - If the field (`F`) is a `ReducedValue<V, I>`, the channel will store values of type `V`
 *   and accept input of type `I`.
 * - If the field is a `UntrackedValue<V>`, the channel will store and accept values of type `V`.
 * - If the field is a `SerializableSchema<I, O>`, the channel will store values of type `O`
 *   (the schema's output/validated value) and accept input of type `I`.
 * - For all other types, a generic `BaseChannel<unknown, unknown>` is used as fallback.
 *
 * @template F - The StateSchema field type to map to a Channel type.
 *
 * @example
 * ```typescript
 * type MyField = ReducedValue<number, string>;
 * type ChannelType = StateSchemaFieldToChannel<MyField>;
 * // ChannelType is BaseChannel<number, string>
 * ```
 */
type StateSchemaFieldToChannel<F> = F extends ReducedValue<infer V, infer I> ? BaseChannel<V, OverwriteValue<V> | I> : F extends UntrackedValue<infer V> ? BaseChannel<V, V> : F extends SerializableSchema<infer I, infer O> ? BaseChannel<O, I> : BaseChannel<unknown, unknown>;
/**
 * Converts StateSchema fields into a strongly-typed
 * State Definition object, where each field is mapped to its channel type.
 *
 * This utility type is used internally to create the shape of the state channels for a given schema,
 * substituting each field with the result of `StateSchemaFieldToChannel`.
 *
 * If you define a state schema as:
 * ```typescript
 * const fields = {
 *   a: ReducedValue<number, string>(),
 *   b: UntrackedValue<boolean>(),
 *   c: SomeSerializableSchemaType, // SerializableSchema<in, out>
 * }
 * ```
 * then `StateSchemaFieldsToStateDefinition<typeof fields>` yields:
 * ```typescript
 * {
 *   a: BaseChannel<number, string>;
 *   b: BaseChannel<boolean, boolean>;
 *   c: BaseChannel<typeof schema's output type, typeof schema's input type>;
 * }
 * ```
 *
 * @template TFields - The mapping of field names to StateSchema field types.
 * @returns An object type mapping field names to channel types.
 *
 * @see StateSchemaFieldToChannel
 */
type StateSchemaFieldsToStateDefinition<TFields extends StateSchemaFields> = { [K in keyof TFields]: StateSchemaFieldToChannel<TFields[K]> };
/**
 * Valid field types for StateSchema.
 * Either a LangGraph state value type or a raw schema (e.g., Zod schema).
 */
type StateSchemaField<Input = unknown, Output = Input> = ReducedValue<Input, Output> | UntrackedValue<Output> | SerializableSchema<Input, Output>;
/**
 * Init object for StateSchema constructor.
 * Uses `any` to allow variance in generic types (e.g., ReducedValue<string, string[]>).
 */
type StateSchemaFields = {
  [key: string]: StateSchemaField<any, any>;
};
/**
 * Infer the State type from a StateSchemaFields.
 * This is the type of the full state object.
 *
 * - ReducedValue<Value, Input> → Value (the stored type)
 * - UntrackedValue<Value> → Value
 * - SerializableSchema<Input, Output> → Output (the validated type)
 */
type InferStateSchemaValue<TFields extends StateSchemaFields> = { [K in keyof TFields]: TFields[K] extends ReducedValue<any, any> ? TFields[K]["ValueType"] : TFields[K] extends UntrackedValue<any> ? TFields[K]["ValueType"] : TFields[K] extends SerializableSchema<any, infer TOutput> ? TOutput : never };
/**
 * Infer the Update type from a StateSchemaFields.
 * This is the type for partial updates to state.
 *
 * - ReducedValue<Value, Input> → Input (the reducer input type)
 * - UntrackedValue<Value> → Value
 * - SerializableSchema<Input, Output> → Input (what you provide)
 */
type InferStateSchemaUpdate<TFields extends StateSchemaFields> = { [K in keyof TFields]?: TFields[K] extends ReducedValue<infer V, infer I> ? OverwriteValue<V> | I : TFields[K] extends UntrackedValue<any> ? TFields[K]["ValueType"] : TFields[K] extends SerializableSchema<infer TInput, any> ? TInput : never };
/**
 * StateSchema provides a unified API for defining LangGraph state schemas.
 *
 * @example
 * ```ts
 * import { z } from "zod";
 * import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";
 *
 * const AgentState = new StateSchema({
 *   // Prebuilt messages value
 *   messages: MessagesValue,
 *   // Basic LastValue channel from any standard schema
 *   currentStep: z.string(),
 *   // LastValue with native default
 *   count: z.number().default(0),
 *   // ReducedValue for fields needing reducers
 *   history: new ReducedValue(
 *     z.array(z.string()).default(() => []),
 *     {
 *       inputSchema: z.string(),
 *       reducer: (current, next) => [...current, next],
 *     }
 *   ),
 * });
 *
 * // Extract types
 * type State = typeof AgentState.State;
 * type Update = typeof AgentState.Update;
 *
 * // Use in StateGraph
 * const graph = new StateGraph(AgentState);
 * ```
 */
declare class StateSchema<TFields extends StateSchemaFields> {
  readonly fields: TFields;
  /**
   * Symbol for runtime identification.
   * @internal Used by isInstance for runtime type checking
   */
  private readonly [STATE_SCHEMA_SYMBOL];
  /**
   * Type declaration for the full state type.
   * Use: `typeof myState.State`
   */
  State: InferStateSchemaValue<TFields>;
  /**
   * Type declaration for the update type.
   * Use: `typeof myState.Update`
   */
  Update: InferStateSchemaUpdate<TFields>;
  /**
   * Type declaration for node functions.
   * Use: `typeof myState.Node` to type node functions outside the graph builder.
   *
   * @example
   * ```typescript
   * const AgentState = new StateSchema({
   *   count: z.number().default(0),
   * });
   *
   * const myNode: typeof AgentState.Node = (state) => {
   *   return { count: state.count + 1 };
   * };
   * ```
   */
  Node: RunnableLike<InferStateSchemaValue<TFields>, InferStateSchemaUpdate<TFields>>;
  constructor(fields: TFields);
  /**
   * Get the channel definitions for use with StateGraph.
   * This converts the StateSchema fields into BaseChannel instances.
   */
  getChannels(): Record<string, BaseChannel>;
  /**
   * Get the JSON schema for the full state type.
   * Used by Studio and API for schema introspection.
   */
  getJsonSchema(): JSONSchema;
  /**
   * Get the JSON schema for the update/input type.
   * All fields are optional in updates.
   */
  getInputJsonSchema(): JSONSchema;
  /**
   * Get the list of channel keys (excluding managed values).
   */
  getChannelKeys(): string[];
  /**
   * Get all keys (channels + managed values).
   */
  getAllKeys(): string[];
  /**
   * Validate input data against the schema.
   * This validates each field using its corresponding schema.
   *
   * @param data - The input data to validate
   * @returns The validated data with coerced types
   */
  validateInput<T>(data: T): Promise<T>;
  /**
   * Type guard to check if a value is a StateSchema instance.
   *
   * @param value - The value to check.
   * @returns True if the value is a StateSchema instance with the correct runtime tag.
   */
  static isInstance<TFields extends StateSchemaFields>(value: StateSchema<TFields>): value is StateSchema<TFields>;
  static isInstance(value: unknown): value is StateSchema<any>;
}
type AnyStateSchema = StateSchema<any>;
//#endregion
export { AnyStateSchema, InferStateSchemaUpdate, InferStateSchemaValue, StateSchema, StateSchemaField, StateSchemaFields, StateSchemaFieldsToStateDefinition };
//# sourceMappingURL=schema.d.cts.map