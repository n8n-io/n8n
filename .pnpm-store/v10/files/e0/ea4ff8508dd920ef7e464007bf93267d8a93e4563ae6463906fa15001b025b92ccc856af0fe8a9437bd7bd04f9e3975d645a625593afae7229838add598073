import { SerializedBaseChain } from "./serde.cjs";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseLangChain, BaseLangChainParams } from "@langchain/core/language_models/base";
import { CallbackManager, CallbackManagerForChainRun, Callbacks } from "@langchain/core/callbacks/manager";
import { BaseMemory } from "@langchain/core/memory";

//#region src/chains/base.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoadValues = Record<string, any>;
interface ChainInputs extends BaseLangChainParams {
  memory?: BaseMemory;
  /**
   * @deprecated Use `callbacks` instead
   */
  callbackManager?: CallbackManager;
}
/**
 * Base interface that all chains must implement.
 */
declare abstract class BaseChain<RunInput extends ChainValues = ChainValues, RunOutput extends ChainValues = ChainValues> extends BaseLangChain<RunInput, RunOutput> implements ChainInputs {
  memory?: BaseMemory;
  get lc_namespace(): string[];
  constructor(fields?: BaseMemory | ChainInputs, /** @deprecated */
  verbose?: boolean, /** @deprecated */
  callbacks?: Callbacks);
  /** @ignore */
  _selectMemoryInputs(values: ChainValues): ChainValues;
  /**
   * Invoke the chain with the provided input and returns the output.
   * @param input Input values for the chain run.
   * @param config Optional configuration for the Runnable.
   * @returns Promise that resolves with the output of the chain run.
   */
  invoke(input: RunInput, options?: RunnableConfig): Promise<RunOutput>;
  private _validateOutputs;
  prepOutputs(inputs: Record<string, unknown>, outputs: Record<string, unknown>, returnOnlyOutputs?: boolean): Promise<Record<string, unknown>>;
  /**
   * Run the core logic of this chain and return the output
   */
  abstract _call(values: RunInput, runManager?: CallbackManagerForChainRun, config?: RunnableConfig): Promise<RunOutput>;
  /**
   * Return the string type key uniquely identifying this class of chain.
   */
  abstract _chainType(): string;
  /**
   * Return a json-like object representing this chain.
   */
  serialize(): SerializedBaseChain;
  abstract get inputKeys(): string[];
  abstract get outputKeys(): string[];
  /** @deprecated Use .invoke() instead. Will be removed in 0.2.0. */
  run(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any, config?: Callbacks | RunnableConfig): Promise<string>;
  protected _formatValues(values: ChainValues & {
    signal?: AbortSignal;
    timeout?: number;
  }): Promise<ChainValues & {
    signal?: AbortSignal | undefined;
    timeout?: number | undefined;
  }>;
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   *
   * Run the core logic of this chain and add to output if desired.
   *
   * Wraps _call and handles memory.
   */
  call(values: ChainValues & {
    signal?: AbortSignal;
    timeout?: number;
  }, config?: Callbacks | RunnableConfig, /** @deprecated */
  tags?: string[]): Promise<RunOutput>;
  /**
   * @deprecated Use .batch() instead. Will be removed in 0.2.0.
   *
   * Call the chain on all inputs in the list
   */
  apply(inputs: RunInput[], config?: (Callbacks | RunnableConfig)[]): Promise<RunOutput[]>;
  /**
   * Load a chain from a json-like object describing it.
   */
  static deserialize(data: SerializedBaseChain, values?: LoadValues): Promise<BaseChain>;
}
//#endregion
export { BaseChain, ChainInputs };
//# sourceMappingURL=base.d.cts.map