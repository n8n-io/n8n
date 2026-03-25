import { BaseChain, ChainInputs } from "./base.js";
import { CallbackManagerForChainRun, Callbacks } from "@langchain/core/callbacks/manager";
import { ChainValues } from "@langchain/core/utils/types";

//#region src/chains/transform.d.ts

/**
 * Interface that extends the `ChainInputs` interface and defines the
 * fields required for a transform chain. It includes the `transform`
 * function, `inputVariables`, and `outputVariables` properties.
 */
interface TransformChainFields<I extends ChainValues, O extends ChainValues> extends ChainInputs {
  transform: (values: I, callbacks?: Callbacks) => O | Promise<O>;
  inputVariables: (keyof I extends string ? keyof I : never)[];
  outputVariables: (keyof O extends string ? keyof O : never)[];
}
/**
 * Class that represents a transform chain. It extends the `BaseChain`
 * class and implements the `TransformChainFields` interface. It provides
 * a way to transform input values to output values using a specified
 * transform function.
 */
declare class TransformChain<I extends ChainValues, O extends ChainValues> extends BaseChain {
  static lc_name(): string;
  transformFunc: (values: I, callbacks?: Callbacks) => O | Promise<O>;
  inputVariables: (keyof I extends string ? keyof I : never)[];
  outputVariables: (keyof O extends string ? keyof O : never)[];
  _chainType(): "transform";
  get inputKeys(): (keyof I extends string ? keyof I : never)[];
  get outputKeys(): (keyof O extends string ? keyof O : never)[];
  constructor(fields: TransformChainFields<I, O>);
  _call(values: I, runManager?: CallbackManagerForChainRun): Promise<O>;
}
//#endregion
export { TransformChain, TransformChainFields };
//# sourceMappingURL=transform.d.ts.map