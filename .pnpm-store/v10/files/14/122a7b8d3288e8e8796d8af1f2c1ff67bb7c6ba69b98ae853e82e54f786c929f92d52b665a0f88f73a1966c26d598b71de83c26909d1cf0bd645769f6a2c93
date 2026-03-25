import { LLMChain } from "../../chains/llm_chain.cjs";
import { ObjectTool } from "./schema.cjs";
import { AutoGPTOutputParser } from "./output_parser.cjs";
import { text_splitter_d_exports } from "../../text_splitter.cjs";
import { BaseMessage } from "@langchain/core/messages";
import { Tool } from "@langchain/core/tools";
import { VectorStoreRetrieverInterface } from "@langchain/core/vectorstores";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

//#region src/experimental/autogpt/agent.d.ts

/**
 * Interface for the input parameters of the AutoGPT class.
 */
interface AutoGPTInput {
  aiName: string;
  aiRole: string;
  memory: VectorStoreRetrieverInterface;
  humanInTheLoop?: boolean;
  outputParser?: AutoGPTOutputParser;
  maxIterations?: number;
}
/**
 * Class representing the AutoGPT concept with LangChain primitives. It is
 * designed to be used with a set of tools such as a search tool,
 * write-file tool, and a read-file tool.
 * @example
 * ```typescript
 * const autogpt = AutoGPT.fromLLMAndTools(
 *   new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *   [
 *     new ReadFileTool({ store: new InMemoryFileStore() }),
 *     new WriteFileTool({ store: new InMemoryFileStore() }),
 *     new SerpAPI("YOUR_SERPAPI_API_KEY", {
 *       location: "San Francisco,California,United States",
 *       hl: "en",
 *       gl: "us",
 *     }),
 *   ],
 *   {
 *     memory: new MemoryVectorStore(new OpenAIEmbeddings()).asRetriever(),
 *     aiName: "Tom",
 *     aiRole: "Assistant",
 *   },
 * );
 * const result = await autogpt.run(["write a weather report for SF today"]);
 * ```
 */
declare class AutoGPT {
  aiName: string;
  memory: VectorStoreRetrieverInterface;
  fullMessageHistory: BaseMessage[];
  nextActionCount: number;
  chain: LLMChain;
  outputParser: AutoGPTOutputParser;
  tools: ObjectTool[];
  feedbackTool?: Tool;
  maxIterations: number;
  textSplitter: text_splitter_d_exports.TokenTextSplitter;
  constructor({
    aiName,
    memory,
    chain,
    outputParser,
    tools,
    feedbackTool,
    maxIterations
  }: Omit<Required<AutoGPTInput>, "aiRole" | "humanInTheLoop"> & {
    chain: LLMChain;
    tools: ObjectTool[];
    feedbackTool?: Tool;
  });
  /**
   * Creates a new AutoGPT instance from a given LLM and a set of tools.
   * @param llm A BaseChatModel object.
   * @param tools An array of ObjectTool objects.
   * @param options.aiName The name of the AI.
   * @param options.aiRole The role of the AI.
   * @param options.memory A VectorStoreRetriever object that represents the memory of the AI.
   * @param options.maxIterations The maximum number of iterations the AI can perform.
   * @param options.outputParser An AutoGPTOutputParser object that parses the output of the AI.
   * @returns A new instance of the AutoGPT class.
   */
  static fromLLMAndTools(llm: BaseChatModel, tools: ObjectTool[], {
    aiName,
    aiRole,
    memory,
    maxIterations,
    outputParser
  }: AutoGPTInput): AutoGPT;
  /**
   * Runs the AI with a given set of goals.
   * @param goals An array of strings representing the goals.
   * @returns A string representing the result of the run or undefined if the maximum number of iterations is reached without a result.
   */
  run(goals: string[]): Promise<string | undefined>;
}
//#endregion
export { AutoGPT, AutoGPTInput };
//# sourceMappingURL=agent.d.cts.map