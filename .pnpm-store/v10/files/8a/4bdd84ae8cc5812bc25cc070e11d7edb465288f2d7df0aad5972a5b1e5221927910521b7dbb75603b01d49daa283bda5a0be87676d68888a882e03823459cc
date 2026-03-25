import { BaseChannel } from "./base.js";

//#region src/channels/ephemeral_value.d.ts

/**
 * Stores the value received in the step immediately preceding, clears after.
 */
declare class EphemeralValue<Value> extends BaseChannel<Value, Value, Value> {
  lc_graph_name: string;
  guard: boolean;
  // value is an array so we don't misinterpret an update to undefined as no write
  value: [Value] | [];
  constructor(guard?: boolean);
  fromCheckpoint(checkpoint?: Value): this;
  update(values: Value[]): boolean;
  get(): Value;
  checkpoint(): Value;
  isAvailable(): boolean;
}
//#endregion
export { EphemeralValue };
//# sourceMappingURL=ephemeral_value.d.ts.map