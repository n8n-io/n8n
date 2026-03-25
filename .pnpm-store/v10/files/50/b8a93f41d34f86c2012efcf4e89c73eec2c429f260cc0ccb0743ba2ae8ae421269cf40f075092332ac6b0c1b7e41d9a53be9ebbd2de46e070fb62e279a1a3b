import { MaskingTransformer } from "./transformer.cjs";
import { HashFunction, MaskingPattern } from "./types.cjs";

//#region src/experimental/masking/regex_masking_transformer.d.ts

/**
 * RegexMaskingTransformer class for masking and rehydrating messages with Regex.
 */
declare class RegexMaskingTransformer extends MaskingTransformer {
  private patterns;
  private hashFunction;
  /**
   * Constructs a RegexMaskingTransformer with given patterns and an optional hash function.
   * Validates the provided patterns to ensure they conform to the expected structure.
   *
   * @param patterns - An object containing masking patterns. Each pattern should include
   *                   a regular expression (`regex`) and optionally a `replacement` string
   *                   or a `mask` function.
   * @param hashFunction - An optional custom hash function to be used for masking.
   */
  constructor(patterns: {
    [key: string]: MaskingPattern;
  }, hashFunction?: HashFunction);
  /**
   * Validates the given masking patterns to ensure each pattern has a valid regular expression.
   * Throws an error if any pattern is found to be invalid.
   *
   * @param patterns - The patterns object to validate.
   */
  private validatePatterns;
  /**
   * Masks content in a message based on the defined patterns.
   * @param message - The message to be masked.
   * @param state - The current state containing original values.
   * @returns A tuple of the masked message and the updated state.
   */
  transform(message: string, state: Map<string, string>): Promise<[string, Map<string, string>]>;
  /**
   * Rehydrates a masked message back to its original form using the provided state.
   * @param message - The masked message to be rehydrated.
   * @param state - The state map containing mappings of masked values to their original values.
   * @returns The rehydrated (original) message.
   */
  rehydrate(message: string, state: Map<string, string>): Promise<string>;
  /**
   * Default hash function for creating unique hash values.
   * @param input - The input string to hash.
   * @returns The resulting hash as a string.
   */
  private defaultHashFunction;
}
//#endregion
export { RegexMaskingTransformer };
//# sourceMappingURL=regex_masking_transformer.d.cts.map