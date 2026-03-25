import { BaseChannel } from "./base.js";
import { OverwriteValue } from "../constants.js";

//#region src/channels/binop.d.ts
type OverwriteOrValue<ValueType, UpdateType> = OverwriteValue<ValueType> | UpdateType;
type BinaryOperator<ValueType, UpdateType> = (a: ValueType, b: UpdateType) => ValueType;
/**
 * Stores the result of applying a binary operator to the current value and each new value.
 */
declare class BinaryOperatorAggregate<ValueType, UpdateType = ValueType> extends BaseChannel<ValueType, OverwriteOrValue<ValueType, UpdateType>, ValueType> {
  lc_graph_name: string;
  value: ValueType | undefined;
  operator: BinaryOperator<ValueType, UpdateType>;
  initialValueFactory?: () => ValueType;
  constructor(operator: BinaryOperator<ValueType, UpdateType>, initialValueFactory?: () => ValueType);
  fromCheckpoint(checkpoint?: ValueType): this;
  update(values: OverwriteOrValue<ValueType, UpdateType>[]): boolean;
  get(): ValueType;
  checkpoint(): ValueType;
  isAvailable(): boolean;
  /**
   * Compare this channel with another channel for equality.
   * Two BinaryOperatorAggregate channels are equal if they have the same operator function.
   * This follows the Python implementation which compares operator references.
   */
  equals(other: BaseChannel): boolean;
}
//#endregion
export { BinaryOperator, BinaryOperatorAggregate };
//# sourceMappingURL=binop.d.ts.map