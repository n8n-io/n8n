import { SerializedChatVectorDBQAChain } from "./serde.cjs";
import { BaseChain, ChainInputs } from "./base.cjs";
import { LLMChain } from "./llm_chain.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { VectorStoreInterface } from "@langchain/core/vectorstores";

//#region src/chains/chat_vector_db_chain.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoadValues = Record<string, any>;
/**
 * Interface for the input parameters of the ChatVectorDBQAChain class.
 */
interface ChatVectorDBQAChainInput extends ChainInputs {
  vectorstore: VectorStoreInterface;
  combineDocumentsChain: BaseChain;
  questionGeneratorChain: LLMChain;
  returnSourceDocuments?: boolean;
  outputKey?: string;
  inputKey?: string;
  k?: number;
}
/** @deprecated use `ConversationalRetrievalQAChain` instead. */
declare class ChatVectorDBQAChain extends BaseChain implements ChatVectorDBQAChainInput {
  k: number;
  inputKey: string;
  chatHistoryKey: string;
  get inputKeys(): string[];
  outputKey: string;
  get outputKeys(): string[];
  vectorstore: VectorStoreInterface;
  combineDocumentsChain: BaseChain;
  questionGeneratorChain: LLMChain;
  returnSourceDocuments: boolean;
  constructor(fields: ChatVectorDBQAChainInput);
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "chat-vector-db";
  static deserialize(data: SerializedChatVectorDBQAChain, values: LoadValues): Promise<ChatVectorDBQAChain>;
  serialize(): SerializedChatVectorDBQAChain;
  /**
   * Creates an instance of ChatVectorDBQAChain using a BaseLanguageModel
   * and other options.
   * @param llm Instance of BaseLanguageModel used to generate a new question.
   * @param vectorstore Instance of VectorStore used for vector operations.
   * @param options (Optional) Additional options for creating the ChatVectorDBQAChain instance.
   * @returns New instance of ChatVectorDBQAChain.
   */
  static fromLLM(llm: BaseLanguageModelInterface, vectorstore: VectorStoreInterface, options?: {
    inputKey?: string;
    outputKey?: string;
    k?: number;
    returnSourceDocuments?: boolean;
    questionGeneratorTemplate?: string;
    qaTemplate?: string;
    verbose?: boolean;
  }): ChatVectorDBQAChain;
}
//#endregion
export { ChatVectorDBQAChain, ChatVectorDBQAChainInput };
//# sourceMappingURL=chat_vector_db_chain.d.cts.map