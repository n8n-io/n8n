import { BaseChain } from "../chains/base.js";
import { DynamicTool, DynamicToolInput } from "@langchain/core/tools";

//#region src/tools/chain.d.ts

/**
 * Interface for the input parameters of the ChainTool constructor.
 * Extends the DynamicToolInput interface, replacing the 'func' property
 * with a 'chain' property.
 */
interface ChainToolInput extends Omit<DynamicToolInput, "func"> {
  chain: BaseChain;
}
/**
 * Class that extends DynamicTool for creating tools that can run chains.
 * Takes an instance of a class that extends BaseChain as a parameter in
 * its constructor and uses it to run the chain when its 'func' method is
 * called.
 */
declare class ChainTool extends DynamicTool {
  static lc_name(): string;
  chain: BaseChain;
  constructor({
    chain,
    ...rest
  }: ChainToolInput);
}
//#endregion
export { ChainTool, ChainToolInput };
//# sourceMappingURL=chain.d.ts.map