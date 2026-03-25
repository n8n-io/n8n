import type { SourceMapOptions } from "./index";
import type { Token } from "./parser/tokenizer";
import type { RootTransformerResult } from "./transformers/RootTransformer";
export interface RawSourceMap {
    version: number;
    file: string;
    sources: Array<string>;
    sourceRoot?: string;
    sourcesContent?: Array<string>;
    mappings: string;
    names: Array<string>;
}
/**
 * Generate a source map indicating that each line maps directly to the original line,
 * with the tokens in their new positions.
 */
export default function computeSourceMap({ code: generatedCode, mappings: rawMappings }: RootTransformerResult, filePath: string, options: SourceMapOptions, source: string, tokens: Array<Token>): RawSourceMap;
