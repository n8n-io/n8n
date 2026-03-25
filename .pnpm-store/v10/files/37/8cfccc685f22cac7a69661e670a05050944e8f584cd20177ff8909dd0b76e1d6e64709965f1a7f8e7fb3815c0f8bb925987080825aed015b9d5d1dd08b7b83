//#region src/utils/format.d.ts
/**
 * A function that converts data from one format to another.
 *
 * This is commonly used for transforming message content blocks between different
 * provider-specific formats and standardized internal representations.
 *
 * @template T - The input type to convert from
 * @template U - The output type to convert to
 *
 * @param input - The data to convert
 * @returns The converted data in the target format
 *
 * @example
 * ```typescript
 * // Convert from OpenAI format to standard format
 * const converter: Converter<OpenAIBlock, ContentBlock.Standard> = (block) => {
 *   return { type: "text", text: block.text };
 * };
 * ```
 */
type Converter<T, U> = (input: T) => U;
/**
 * A pair of bidirectional conversion functions for transforming data between two formats.
 *
 * This type is used throughout the message system to enable conversion between
 * provider-specific message formats (like OpenAI, Anthropic, Google, etc.) and
 * standardized internal content block representations. The `encode` function
 * typically converts from a standard format to a provider-specific format, while
 * `decode` converts from a provider-specific format back to the standard format.
 *
 * @template T - The first format (typically the standard/internal format)
 * @template U - The second format (typically the provider-specific format)
 *
 * @property encode - Converts from format T to format U
 * @property decode - Converts from format U back to format T
 *
 * @example
 * ```typescript
 * // Converter pair for OpenAI message blocks
 * const openAIConverter: ConverterPair<ContentBlock.Standard, OpenAIBlock> = {
 *   encode: (standard) => ({ text: standard.text }),
 *   decode: (openai) => ({ type: "text", text: openai.text })
 * };
 *
 * // Usage
 * const standardBlock = { type: "text", text: "Hello" };
 * const openaiBlock = openAIConverter.encode(standardBlock);
 * const backToStandard = openAIConverter.decode(openaiBlock);
 * ```
 */
type ConverterPair<T, U> = {
  encode: Converter<T, U>;
  decode: Converter<U, T>;
};
//#endregion
export { Converter, ConverterPair };
//# sourceMappingURL=format.d.ts.map