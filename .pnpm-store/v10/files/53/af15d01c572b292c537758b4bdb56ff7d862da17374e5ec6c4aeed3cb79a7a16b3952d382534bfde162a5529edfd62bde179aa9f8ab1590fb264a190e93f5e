import CJSImportProcessor from "./CJSImportProcessor";
import { type RawSourceMap } from "./computeSourceMap";
import { HelperManager } from "./HelperManager";
import NameManager from "./NameManager";
import type { Options, SourceMapOptions, Transform } from "./Options";
import type { Scope } from "./parser/tokenizer/state";
import TokenProcessor from "./TokenProcessor";
export interface TransformResult {
    code: string;
    sourceMap?: RawSourceMap;
}
export interface SucraseContext {
    tokenProcessor: TokenProcessor;
    scopes: Array<Scope>;
    nameManager: NameManager;
    importProcessor: CJSImportProcessor | null;
    helperManager: HelperManager;
}
export type { Options, SourceMapOptions, Transform };
export declare function getVersion(): string;
export declare function transform(code: string, options: Options): TransformResult;
/**
 * Return a string representation of the sucrase tokens, mostly useful for
 * diagnostic purposes.
 */
export declare function getFormattedTokens(code: string, options: Options): string;
