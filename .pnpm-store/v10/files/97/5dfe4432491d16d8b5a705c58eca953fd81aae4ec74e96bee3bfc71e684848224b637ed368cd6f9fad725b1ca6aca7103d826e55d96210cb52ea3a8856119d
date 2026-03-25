import { QueryTransformer, TraverseType } from "./parser.js";
import { DEFAULT_EXAMPLES, DEFAULT_PREFIX, DEFAULT_SCHEMA, DEFAULT_SUFFIX, EXAMPLE_PROMPT } from "./prompt.js";
import { AsymmetricStructuredOutputParser } from "../../output_parsers/structured.js";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { InferInteropZodOutput, InputValues } from "@langchain/core/utils/types";
import { z } from "zod/v3";
import { Comparator, Operator, StructuredQuery } from "@langchain/core/structured_query";

//#region src/chains/query_constructor/index.d.ts

/**
 * A simple data structure that holds information about an attribute. It
 * is typically used to provide metadata about attributes in other classes
 * or data structures within the LangChain framework.
 */
declare class AttributeInfo {
  name: string;
  type: string;
  description: string;
  constructor(name: string, type: string, description: string);
}
declare const queryInputSchema: z.ZodObject<{
  query: z.ZodString;
  filter: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
  query: string;
  filter?: string | undefined;
}, {
  query: string;
  filter?: string | undefined;
}>;
/**
 * A class that extends AsymmetricStructuredOutputParser to parse
 * structured query output.
 */
declare class StructuredQueryOutputParser extends AsymmetricStructuredOutputParser<typeof queryInputSchema, StructuredQuery> {
  lc_namespace: string[];
  queryTransformer: QueryTransformer;
  constructor(fields: {
    allowedComparators: Comparator[];
    allowedOperators: Operator[];
  });
  /**
   * Processes the output of a structured query.
   * @param query The query string.
   * @param filter The filter condition.
   * @returns A Promise that resolves to a StructuredQuery instance.
   */
  outputProcessor({
    query,
    filter
  }: InferInteropZodOutput<typeof queryInputSchema>): Promise<StructuredQuery>;
  /**
   * Creates a new StructuredQueryOutputParser instance from the provided
   * components.
   * @param allowedComparators An array of allowed Comparator instances.
   * @param allowedOperators An array of allowed Operator instances.
   * @returns A new StructuredQueryOutputParser instance.
   */
  static fromComponents(allowedComparators?: Comparator[], allowedOperators?: Operator[]): StructuredQueryOutputParser;
}
declare function formatAttributeInfo(info: AttributeInfo[]): string;
/**
 * A type that represents options for the query constructor chain.
 */
type QueryConstructorRunnableOptions = {
  llm: BaseLanguageModelInterface;
  documentContents: string;
  attributeInfo: AttributeInfo[];
  examples?: InputValues[];
  allowedComparators?: Comparator[];
  allowedOperators?: Operator[];
};
/** @deprecated */
type QueryConstructorChainOptions = QueryConstructorRunnableOptions;
declare function loadQueryConstructorRunnable(opts: QueryConstructorRunnableOptions): Runnable<any, StructuredQuery, RunnableConfig<Record<string, any>>>;
//#endregion
export { AttributeInfo, DEFAULT_EXAMPLES, DEFAULT_PREFIX, DEFAULT_SCHEMA, DEFAULT_SUFFIX, EXAMPLE_PROMPT, QueryConstructorChainOptions, QueryConstructorRunnableOptions, QueryTransformer, StructuredQueryOutputParser, type TraverseType, formatAttributeInfo, loadQueryConstructorRunnable };
//# sourceMappingURL=index.d.ts.map