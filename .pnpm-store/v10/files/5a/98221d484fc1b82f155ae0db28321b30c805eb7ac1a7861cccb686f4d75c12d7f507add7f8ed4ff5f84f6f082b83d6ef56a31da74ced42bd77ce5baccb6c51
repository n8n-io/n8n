import { ZeroShotCreatePromptArgs } from "../../mrkl/index.cjs";
import { AgentExecutor } from "../../executor.cjs";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { BaseToolkit, ToolInterface } from "@langchain/core/tools";
import { VectorStoreInterface } from "@langchain/core/vectorstores";

//#region src/agents/toolkits/vectorstore/vectorstore.d.ts

/**
 * Interface that defines the information about a vector store, including
 * the vector store itself, its name, and description.
 */
interface VectorStoreInfo {
  vectorStore: VectorStoreInterface;
  name: string;
  description: string;
}
/**
 * Class representing a toolkit for working with a single vector store. It
 * initializes the vector store QA tool based on the provided vector store
 * information and language model.
 * @example
 * ```typescript
 * const toolkit = new VectorStoreToolkit(
 *   {
 *     name: "state_of_union_address",
 *     description: "the most recent state of the Union address",
 *     vectorStore: new HNSWLib(),
 *   },
 *   new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 * );
 * const result = await toolkit.invoke({
 *   input:
 *     "What did biden say about Ketanji Brown Jackson in the state of the union address?",
 * });
 * console.log(`Got output ${result.output}`);
 * ```
 */
declare class VectorStoreToolkit extends BaseToolkit {
  tools: ToolInterface[];
  llm: BaseLanguageModelInterface;
  constructor(vectorStoreInfo: VectorStoreInfo, llm: BaseLanguageModelInterface);
}
/**
 * Class representing a toolkit for working with multiple vector stores.
 * It initializes multiple vector store QA tools based on the provided
 * vector store information and language model.
 */
declare class VectorStoreRouterToolkit extends BaseToolkit {
  tools: ToolInterface[];
  vectorStoreInfos: VectorStoreInfo[];
  llm: BaseLanguageModelInterface;
  constructor(vectorStoreInfos: VectorStoreInfo[], llm: BaseLanguageModelInterface);
}
declare function createVectorStoreAgent(llm: BaseLanguageModelInterface, toolkit: VectorStoreToolkit, args?: ZeroShotCreatePromptArgs): AgentExecutor;
declare function createVectorStoreRouterAgent(llm: BaseLanguageModelInterface, toolkit: VectorStoreRouterToolkit, args?: ZeroShotCreatePromptArgs): AgentExecutor;
//#endregion
export { VectorStoreInfo, VectorStoreRouterToolkit, VectorStoreToolkit, createVectorStoreAgent, createVectorStoreRouterAgent };
//# sourceMappingURL=vectorstore.d.cts.map