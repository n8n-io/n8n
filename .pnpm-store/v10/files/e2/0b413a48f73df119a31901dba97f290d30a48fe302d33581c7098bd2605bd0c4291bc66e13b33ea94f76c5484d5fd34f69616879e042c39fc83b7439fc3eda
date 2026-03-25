import { BaseChannel } from "./base.cjs";

//#region src/channels/untracked_value.d.ts
/**
 * Stores the last value received, never checkpointed.
 *
 * This channel stores values during graph execution but does NOT persist
 * the value to checkpoints. On restoration from a checkpoint, the value
 * will be reset to empty (or the initial value if provided).
 *
 * Useful for transient state like:
 * - Database connections
 * - Temporary caches
 * - Runtime-only configuration
 *
 * @internal
 */
declare class UntrackedValueChannel<Value> extends BaseChannel<Value, Value, undefined> {
  lc_graph_name: string;
  /**
   * If true, throws an error when multiple values are received in a single step.
   * If false, stores the last value received.
   */
  guard: boolean;
  /**
   * The current value. MISSING sentinel indicates no value has been set.
   */
  private _value;
  /**
   * Optional factory function for the initial value.
   */
  private initialValueFactory?;
  constructor(options?: {
    guard?: boolean;
    initialValueFactory?: () => Value;
  });
  /**
   * Return a new channel, ignoring the checkpoint since we don't persist.
   * The initial value (if any) is restored.
   */
  fromCheckpoint(_checkpoint?: undefined): this;
  /**
   * Update the channel with the given values.
   * If guard is true, throws if more than one value is received.
   */
  update(values: Value[]): boolean;
  /**
   * Get the current value.
   * @throws EmptyChannelError if no value has been set.
   */
  get(): Value;
  /**
   * Always returns undefined - untracked values are never checkpointed.
   */
  checkpoint(): undefined;
  /**
   * Return true if a value has been set.
   */
  isAvailable(): boolean;
}
//#endregion
export { UntrackedValueChannel };
//# sourceMappingURL=untracked_value.d.cts.map