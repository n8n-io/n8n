import { BaseChannel } from "./base.js";

//#region src/channels/last_value.d.ts

/**
 * Stores the last value received, can receive at most one value per step.
 *
 * Since `update` is only called once per step and value can only be of length 1,
 * LastValue always stores the last value of a single node. If multiple nodes attempt to
 * write to this channel in a single step, an error will be thrown.
 * @internal
 */
declare class LastValue<Value> extends BaseChannel<Value, Value, Value> {
  lc_graph_name: string;
  // value is an array so we don't misinterpret an update to undefined as no write
  value: [Value] | [];
  fromCheckpoint(checkpoint?: Value): this;
  update(values: Value[]): boolean;
  get(): Value;
  checkpoint(): Value;
  isAvailable(): boolean;
}
/**
 * Stores the last value received, but only made available after finish().
 * Once made available, clears the value.
 */
declare class LastValueAfterFinish<Value> extends BaseChannel<Value, Value, [Value, boolean]> {
  lc_graph_name: string;
  // value is an array so we don't misinterpret an update to undefined as no write
  value: [Value] | [];
  finished: boolean;
  fromCheckpoint(checkpoint?: [Value, boolean]): this;
  update(values: Value[]): boolean;
  get(): Value;
  checkpoint(): [Value, boolean] | undefined;
  consume(): boolean;
  finish(): boolean;
  isAvailable(): boolean;
}
//#endregion
export { LastValue, LastValueAfterFinish };
//# sourceMappingURL=last_value.d.ts.map