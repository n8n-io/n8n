import { BaseChannel } from "./base.js";

//#region src/channels/any_value.d.ts

/**
 * Stores the last value received, assumes that if multiple values are received, they are all equal.
 *
 * Note: Unlike 'LastValue' if multiple nodes write to this channel in a single step, the values
 * will be continuously overwritten.
 */
declare class AnyValue<Value> extends BaseChannel<Value, Value, Value> {
  lc_graph_name: string;
  // value is an array so we don't misinterpret an update to undefined as no write
  value: [Value] | [];
  constructor();
  fromCheckpoint(checkpoint?: Value): this;
  update(values: Value[]): boolean;
  get(): Value;
  checkpoint(): Value;
  isAvailable(): boolean;
}
//#endregion
export { AnyValue };
//# sourceMappingURL=any_value.d.ts.map