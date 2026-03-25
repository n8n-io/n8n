import { SerializedVectorDBQAChain } from "./serde.cjs";
import { BaseChain, ChainInputs } from "./base.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { VectorStoreInterface } from "@langchain/core/vectorstores";

//#region src/chains/vector_db_qa.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoadValues = Record<string, any>;
/**
 * Interface that extends the `ChainInputs` interface and defines the
 * input fields required for a VectorDBQAChain. It includes properties
 * such as `vectorstore`, `combineDocumentsChain`,
 * `returnSourceDocuments`, `k`, and `inputKey`.
 */
interface VectorDBQAChainInput extends Omit<ChainInputs, "memory"> {
  vectorstore: VectorStoreInterface;
  combineDocumentsChain: BaseChain;
  returnSourceDocuments?: boolean;
  k?: number;
  inputKey?: string;
}
/**
 * Class that represents a VectorDBQAChain. It extends the `BaseChain`
 * class and implements the `VectorDBQAChainInput` interface. It performs
 * a similarity search using a vector store and combines the search
 * results using a specified combine documents chain.
 */
declare class VectorDBQAChain extends BaseChain implements VectorDBQAChainInput {
  static lc_name(): string;
  k: number;
  inputKey: string;
  get inputKeys(): string[];
  get outputKeys(): string[];
  vectorstore: VectorStoreInterface;
  combineDocumentsChain: BaseChain;
  returnSourceDocuments: boolean;
  constructor(fields: VectorDBQAChainInput);
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "vector_db_qa";
  static deserialize(data: SerializedVectorDBQAChain, values: LoadValues): Promise<VectorDBQAChain>;
  serialize(): SerializedVectorDBQAChain;
  /**
   * Static method that creates a VectorDBQAChain instance from a
   * BaseLanguageModel and a vector store. It also accepts optional options
   * to customize the chain.
   * @param llm The BaseLanguageModel instance.
   * @param vectorstore The vector store used for similarity search.
   * @param options Optional options to customize the chain.
   * @returns A new instance of VectorDBQAChain.
   */
  static fromLLM(llm: BaseLanguageModelInterface, vectorstore: VectorStoreInterface, options?: Partial<Omit<VectorDBQAChainInput, "combineDocumentsChain" | "vectorstore">>): VectorDBQAChain;
}
//#endregion
export { VectorDBQAChain, VectorDBQAChainInput };
//# sourceMappingURL=vector_db_qa.d.cts.map