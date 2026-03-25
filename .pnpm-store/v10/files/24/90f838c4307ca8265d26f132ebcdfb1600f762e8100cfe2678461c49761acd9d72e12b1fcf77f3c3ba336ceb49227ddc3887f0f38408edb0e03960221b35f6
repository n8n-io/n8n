import { BaseChannel } from "./base.cjs";

//#region src/channels/dynamic_barrier_value.d.ts
interface WaitForNames<Value> {
  __names: Value[];
}
/**
 * A channel that switches between two states
 *
 * - in the "priming" state it can't be read from.
 *     - if it receives a WaitForNames update, it switches to the "waiting" state.
 * - in the "waiting" state it collects named values until all are received.
 *     - once all named values are received, it can be read once, and it switches
 *       back to the "priming" state.
 */
declare class DynamicBarrierValue<Value> extends BaseChannel<void, Value | WaitForNames<Value>, [Value[] | undefined, Value[]]> {
  lc_graph_name: string;
  names?: Set<Value>;
  seen: Set<Value>;
  constructor();
  fromCheckpoint(checkpoint?: [Value[] | undefined, Value[]]): this;
  update(values: (Value | WaitForNames<Value>)[]): boolean;
  consume(): boolean;
  get(): void;
  checkpoint(): [Value[] | undefined, Value[]];
  isAvailable(): boolean;
}
//#endregion
export { DynamicBarrierValue, WaitForNames };
//# sourceMappingURL=dynamic_barrier_value.d.cts.map