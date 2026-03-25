import { LLMChain } from "../chains/llm_chain.cjs";
import { Runnable } from "@langchain/core/runnables";
import { BaseOutputParser, OutputParserException } from "@langchain/core/output_parsers";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { Callbacks } from "@langchain/core/callbacks/manager";

//#region src/output_parsers/fix.d.ts
interface OutputFixingParserRetryInput {
  instructions: string;
  completion: string;
  error: OutputParserException;
}
/**
 * Class that extends the BaseOutputParser to handle situations where the
 * initial parsing attempt fails. It contains a retryChain for retrying
 * the parsing process in case of a failure.
 */
declare class OutputFixingParser<T> extends BaseOutputParser<T> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  parser: BaseOutputParser<T>;
  retryChain: LLMChain | Runnable<OutputFixingParserRetryInput, T>;
  /**
   * Static method to create a new instance of OutputFixingParser using a
   * given language model, parser, and optional fields.
   * @param llm The language model to be used.
   * @param parser The parser to be used.
   * @param fields Optional fields which may contain a prompt.
   * @returns A new instance of OutputFixingParser.
   */
  static fromLLM<T>(llm: BaseLanguageModelInterface, parser: BaseOutputParser<T>, fields?: {
    prompt?: BasePromptTemplate;
  }): OutputFixingParser<T>;
  constructor({
    parser,
    retryChain
  }: {
    parser: BaseOutputParser<T>;
    retryChain: LLMChain | Runnable<OutputFixingParserRetryInput, T>;
  });
  /**
   * Method to parse the completion using the parser. If the initial parsing
   * fails, it uses the retryChain to attempt to fix the output and retry
   * the parsing process.
   * @param completion The completion to be parsed.
   * @param callbacks Optional callbacks to be used during parsing.
   * @returns The parsed output.
   */
  parse(completion: string, callbacks?: Callbacks): Promise<T>;
  /**
   * Method to get the format instructions for the parser.
   * @returns The format instructions for the parser.
   */
  getFormatInstructions(): string;
}
//#endregion
export { OutputFixingParser };
//# sourceMappingURL=fix.d.cts.map