import { MaskingTransformer } from "./transformer.cjs";

//#region src/experimental/masking/types.d.ts

/**
 * Configuration type for MaskingParser.
 */
type MaskingParserConfig = {
  transformers?: MaskingTransformer[];
  defaultHashFunction?: HashFunction;
  onMaskingStart?: HookFunction;
  onMaskingEnd?: HookFunction;
  onRehydratingStart?: HookFunction;
  onRehydratingEnd?: HookFunction;
};
/**
 *  Regex Masking Pattern used for masking in PIIMaskingTransformer.
 */
type MaskingPattern = {
  regex: RegExp;
  replacement?: string;
  mask?: (match: string) => string;
};
type HookFunction = ((message: string) => Promise<void>) | ((message: string) => void);
/**
 * Represents a function that can hash a string input.
 */
type HashFunction = (input: string) => string;
//#endregion
export { HashFunction, HookFunction, MaskingParserConfig, MaskingPattern };
//# sourceMappingURL=types.d.cts.map