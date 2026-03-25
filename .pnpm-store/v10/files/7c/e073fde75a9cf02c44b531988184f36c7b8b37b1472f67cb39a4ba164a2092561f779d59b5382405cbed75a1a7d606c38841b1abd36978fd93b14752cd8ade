import { BaseChannel } from "./base.cjs";

//#region src/channels/named_barrier_value.d.ts

/**
 * A channel that waits until all named values are received before making the value available.
 *
 * This ensures that if node N and node M both write to channel C, the value of C will not be updated
 * until N and M have completed updating.
 */
declare class NamedBarrierValue<Value> extends BaseChannel<void, Value, Value[]> {
  lc_graph_name: string;
  names: Set<Value>; // Names of nodes that we want to wait for.
  seen: Set<Value>;
  constructor(names: Set<Value>);
  fromCheckpoint(checkpoint?: Value[]): this;
  update(values: Value[]): boolean;
  // If we have not yet seen all the node names we want to wait for,
  // throw an error to prevent continuing.
  get(): void;
  checkpoint(): Value[];
  consume(): boolean;
  isAvailable(): boolean;
}
/**
 * A channel that waits until all named values are received before making the value ready to be made available.
 * It is only made available after finish() is called.
 * @internal
 */
declare class NamedBarrierValueAfterFinish<Value> extends BaseChannel<void, Value, [Value[], boolean]> {
  lc_graph_name: string;
  names: Set<Value>; // Names of nodes that we want to wait for.
  seen: Set<Value>;
  finished: boolean;
  constructor(names: Set<Value>);
  fromCheckpoint(checkpoint?: [Value[], boolean]): this;
  update(values: Value[]): boolean;
  get(): void;
  checkpoint(): [Value[], boolean];
  consume(): boolean;
  finish(): boolean;
  isAvailable(): boolean;
}
//#endregion
export { NamedBarrierValue, NamedBarrierValueAfterFinish };
//# sourceMappingURL=named_barrier_value.d.cts.map