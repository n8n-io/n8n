import { serializable_d_exports } from "../load/serializable.js";
import { BaseOutputParser, FormatInstructionsOptions } from "@langchain/core/output_parsers";
import { InferInteropZodOutput, InteropZodType } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/output_parsers/structured.d.ts
type JsonMarkdownStructuredOutputParserInput = {
  interpolationDepth?: number;
};
interface JsonMarkdownFormatInstructionsOptions extends FormatInstructionsOptions {
  interpolationDepth?: number;
}
declare class StructuredOutputParser<T extends InteropZodType> extends BaseOutputParser<InferInteropZodOutput<T>> {
  schema: T;
  static lc_name(): string;
  lc_namespace: string[];
  toJSON(): serializable_d_exports.SerializedNotImplemented;
  constructor(schema: T);
  /**
   * Creates a new StructuredOutputParser from a Zod schema.
   * @param schema The Zod schema which the output should match
   * @returns A new instance of StructuredOutputParser.
   */
  static fromZodSchema<T extends InteropZodType>(schema: T): StructuredOutputParser<T>;
  /**
   * Creates a new StructuredOutputParser from a set of names and
   * descriptions.
   * @param schemas An object where each key is a name and each value is a description
   * @returns A new instance of StructuredOutputParser.
   */
  static fromNamesAndDescriptions<S extends {
    [key: string]: string;
  }>(schemas: S): StructuredOutputParser<z.ZodObject<{
    [k: string]: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    [x: string]: string;
  }, {
    [x: string]: string;
  }>>;
  /**
   * Returns a markdown code snippet with a JSON object formatted according
   * to the schema.
   * @param options Optional. The options for formatting the instructions
   * @returns A markdown code snippet with a JSON object formatted according to the schema.
   */
  getFormatInstructions(): string;
  /**
   * Parses the given text according to the schema.
   * @param text The text to parse
   * @returns The parsed output.
   */
  parse(text: string): Promise<InferInteropZodOutput<T>>;
}
/**
 * A specific type of `StructuredOutputParser` that parses JSON data
 * formatted as a markdown code snippet.
 */
declare class JsonMarkdownStructuredOutputParser<T extends InteropZodType> extends StructuredOutputParser<T> {
  static lc_name(): string;
  getFormatInstructions(options?: JsonMarkdownFormatInstructionsOptions): string;
  private _schemaToInstruction;
  static fromZodSchema<T extends InteropZodType>(schema: T): JsonMarkdownStructuredOutputParser<T>;
  static fromNamesAndDescriptions<S extends {
    [key: string]: string;
  }>(schemas: S): JsonMarkdownStructuredOutputParser<z.ZodObject<{
    [k: string]: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    [x: string]: string;
  }, {
    [x: string]: string;
  }>>;
}
interface AsymmetricStructuredOutputParserFields<T extends InteropZodType> {
  inputSchema: T;
}
/**
 * A type of `StructuredOutputParser` that handles asymmetric input and
 * output schemas.
 */
declare abstract class AsymmetricStructuredOutputParser<T extends InteropZodType, Y = unknown> extends BaseOutputParser<Y> {
  private structuredInputParser;
  constructor({
    inputSchema
  }: AsymmetricStructuredOutputParserFields<T>);
  /**
   * Processes the parsed input into the desired output format. Must be
   * implemented by subclasses.
   * @param input The parsed input
   * @returns The processed output.
   */
  abstract outputProcessor(input: InferInteropZodOutput<T>): Promise<Y>;
  parse(text: string): Promise<Y>;
  getFormatInstructions(): string;
}
//#endregion
export { AsymmetricStructuredOutputParser, JsonMarkdownFormatInstructionsOptions, JsonMarkdownStructuredOutputParser, JsonMarkdownStructuredOutputParserInput, StructuredOutputParser };
//# sourceMappingURL=structured.d.ts.map