import { VectorDBQAChain } from "../chains/vector_db_qa.js";
import { Tool } from "@langchain/core/tools";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { VectorStoreInterface } from "@langchain/core/vectorstores";

//#region src/tools/vectorstore.d.ts

/**
 * Interface for tools that interact with a Vector Store.
 */
interface VectorStoreTool {
  vectorStore: VectorStoreInterface;
  llm: BaseLanguageModelInterface;
}
/**
 * A tool for the VectorDBQA chain to interact with a Vector Store. It is
 * used to answer questions about a specific topic. The input to this tool
 * should be a fully formed question.
 */
declare class VectorStoreQATool extends Tool implements VectorStoreTool {
  static lc_name(): string;
  vectorStore: VectorStoreInterface;
  llm: BaseLanguageModelInterface;
  name: string;
  description: string;
  chain: VectorDBQAChain;
  constructor(name: string, description: string, fields: VectorStoreTool);
  /**
   * Returns a string that describes what the tool does.
   * @param name The name of the tool.
   * @param description A description of what the tool does.
   * @returns A string that describes what the tool does.
   */
  static getDescription(name: string, description: string): string;
  /** @ignore */
  _call(input: string): Promise<string>;
}
//#endregion
export { VectorStoreQATool };
//# sourceMappingURL=vectorstore.d.ts.map