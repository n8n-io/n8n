import { SerializableSchema } from "../types.js";

//#region src/state/values/untracked.d.ts
/**
 * Symbol for runtime identification of UntrackedValue instances.
 */
declare const UNTRACKED_VALUE_SYMBOL: symbol;
/**
 * Initialization options for {@link UntrackedValue}.
 */
interface UntrackedValueInit {
  /**
   * If true (default), throws an error if multiple updates are made in a single step.
   * If false, only the last value is kept per step.
   */
  guard?: boolean;
}
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
declare class UntrackedValue<Value = unknown> {
  readonly [UNTRACKED_VALUE_SYMBOL]: true;
  /**
   * Optional schema describing the type and shape of the value stored in this field.
   *
   * If provided, this can be used for runtime validation or code generation.
   */
  readonly schema?: SerializableSchema<Value>;
  /**
   * Whether to guard against multiple updates to this untracked value in a single step.
   *
   * - If `true` (default), throws an error if multiple updates are received in one step.
   * - If `false`, only the last value from that step is kept, others are ignored.
   *
   * This helps prevent accidental state replacement within a step.
   */
  readonly guard: boolean;
  /**
   * Represents the type of value stored in this untracked state field.
   */
  ValueType: Value;
  /**
   * Create a new untracked value state field.
   *
   * @param schema - Optional type schema describing the value (e.g. a Zod schema).
   * @param init - Optional options for tracking updates or enabling multiple-writes-per-step.
   */
  constructor(schema?: SerializableSchema<Value>, init?: UntrackedValueInit);
  /**
   * Type guard to check if a value is an UntrackedValue instance.
   */
  static isInstance<Value = unknown>(value: UntrackedValue<Value>): value is UntrackedValue<Value>;
  static isInstance(value: unknown): value is UntrackedValue;
}
//#endregion
export { UntrackedValue, UntrackedValueInit };
//# sourceMappingURL=untracked.d.ts.map