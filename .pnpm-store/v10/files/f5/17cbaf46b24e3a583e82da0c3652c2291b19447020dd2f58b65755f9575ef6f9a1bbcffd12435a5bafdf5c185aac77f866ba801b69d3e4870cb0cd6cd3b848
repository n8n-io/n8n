import { BaseChannel } from "./base.cjs";

//#region src/channels/binop.d.ts
type BinaryOperator<ValueType, UpdateType> = (a: ValueType, b: UpdateType) => ValueType;
/**
 * Stores the result of applying a binary operator to the current value and each new value.
 */
declare class BinaryOperatorAggregate<ValueType, UpdateType = ValueType> extends BaseChannel<ValueType, UpdateType, ValueType> {
  lc_graph_name: string;
  value: ValueType | undefined;
  operator: BinaryOperator<ValueType, UpdateType>;
  initialValueFactory?: () => ValueType;
  constructor(operator: BinaryOperator<ValueType, UpdateType>, initialValueFactory?: () => ValueType);
  fromCheckpoint(checkpoint?: ValueType): this;
  update(values: UpdateType[]): boolean;
  get(): ValueType;
  checkpoint(): ValueType;
  isAvailable(): boolean;
}
//#endregion
export { BinaryOperator, BinaryOperatorAggregate };
//# sourceMappingURL=binop.d.cts.map