import { JsonMarkdownStructuredOutputParser } from "./structured.js";
import { InferInteropZodOutput, InteropZodType } from "@langchain/core/utils/types";

//#region src/output_parsers/router.d.ts

/**
 * Defines the input parameters for the RouterOutputParser class. It can
 * include a default destination and an interpolation depth.
 */
type RouterOutputParserInput = {
  defaultDestination?: string;
  interpolationDepth?: number;
};
/**
 * A type of output parser that extends the
 * JsonMarkdownStructuredOutputParser. It is used to parse the output of a
 * router in LangChain. The class takes a schema and an optional
 * RouterOutputParserInput object as parameters.
 */
declare class RouterOutputParser<Y extends InteropZodType> extends JsonMarkdownStructuredOutputParser<Y> {
  defaultDestination: string;
  constructor(schema: Y, options?: RouterOutputParserInput);
  /**
   * Overrides the parse method from JsonMarkdownStructuredOutputParser.
   * This method takes a string as input, attempts to parse it, and returns
   * the parsed text. If the destination of the parsed text matches the
   * defaultDestination, the destination is set to null. If the parsing
   * fails, an OutputParserException is thrown.
   * @param text The text to be parsed.
   * @returns The parsed text as a Promise.
   */
  parse(text: string): Promise<InferInteropZodOutput<Y>>;
}
//#endregion
export { RouterOutputParser, RouterOutputParserInput };
//# sourceMappingURL=router.d.ts.map