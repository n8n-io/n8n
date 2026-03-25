import { Buffer } from 'node:buffer';
import { Minimatch } from 'minimatch';
export interface KnownProps {
    end_of_line?: 'lf' | 'crlf' | 'unset';
    indent_style?: 'tab' | 'space' | 'unset';
    indent_size?: number | 'tab' | 'unset';
    insert_final_newline?: true | false | 'unset';
    tab_width?: number | 'unset';
    trim_trailing_whitespace?: true | false | 'unset';
    charset?: string | 'unset';
}
interface UnknownMap {
    [index: string]: unknown;
}
export type Props = KnownProps & UnknownMap;
export interface ECFile {
    name: string;
    contents?: Buffer;
}
type SectionGlob = Minimatch | null;
type GlobbedProps = [SectionName, Props, SectionGlob][];
export interface ProcessedFileConfig {
    root: boolean;
    name: string;
    config: GlobbedProps;
    notfound?: true;
}
export interface Visited {
    fileName: string;
    glob: string;
}
export interface Cache {
    get(path: string): ProcessedFileConfig | undefined;
    set(path: string, config: ProcessedFileConfig): this;
}
export interface ParseOptions {
    config?: string;
    version?: string;
    root?: string;
    files?: Visited[];
    cache?: Cache;
    unset?: boolean;
}
export type SectionName = string | null;
export interface SectionBody {
    [key: string]: string;
}
export type ParseStringResult = [SectionName, SectionBody][];
/**
 * Parse a buffer using the faster one-ini WASM approach into something
 * relatively easy to deal with in JS.
 *
 * @param data UTF8-encoded bytes.
 * @returns Parsed contents.  Will be truncated if there was a parse error.
 */
export declare function parseBuffer(data: Buffer): ParseStringResult;
/**
 * Parses a string.  If possible, you should always use ParseBuffer instead,
 * since this function does a UTF16-to-UTF8 conversion first.
 *
 * @param data String to parse.
 * @returns Parsed contents.  Will be truncated if there was a parse error.
 * @deprecated Use {@link ParseBuffer} instead.
 */
export declare function parseString(data: string): ParseStringResult;
/**
 * For any pair, a value of `unset` removes the effect of that pair, even if
 * it has been set before.  This method modifies the properties object in
 * place to remove any property that has a value of `unset`.
 *
 * @param props Properties object to modify.
 */
export declare function unset(props: Props): void;
/**
 * Low-level interface, which exists only for backward-compatibility.
 * Deprecated.
 *
 * @param filepath The name of the target file, relative to process.cwd().
 * @param files A list of objects describing the files.
 * @param options All options
 * @returns The properties found for filepath
 * @deprecated
 */
export declare function parseFromFilesSync(filepath: string, files: ECFile[], options?: ParseOptions): Props;
/**
 * Low-level interface, which exists only for backward-compatibility.
 * Deprecated.
 *
 * @param filepath The name of the target file, relative to process.cwd().
 * @param files A promise for a list of objects describing the files.
 * @param options All options
 * @returns The properties found for filepath
 * @deprecated
 */
export declare function parseFromFiles(filepath: string, files: Promise<ECFile[]>, options?: ParseOptions): Promise<Props>;
/**
 * Find all of the properties from matching sections in config files in the
 * same directory or toward the root of the filesystem.
 *
 * @param filepath The target file name, relative to process.cwd().
 * @param options All options
 * @returns Combined properties for the target file
 */
export declare function parse(filepath: string, options?: ParseOptions): Promise<Props>;
/**
 * Find all of the properties from matching sections in config files in the
 * same directory or toward the root of the filesystem.  Synchronous.
 *
 * @param filepath The target file name, relative to process.cwd().
 * @param options All options
 * @returns Combined properties for the target file
 */
export declare function parseSync(filepath: string, options?: ParseOptions): Props;
/**
 * I think this may be of limited utility at the moment, but I need something
 * like this for testing.  As such, the interface of this may change without
 * warning.
 *
 * Something this direction may be better for editors than the caching bits
 * we've got today, but that will need some thought.
 *
 * @param options All options.  root will be process.cwd if not specified.
 * @param buffers 1 or more Buffers that have .editorconfig contents.
 * @returns Function that can be called multiple times for different paths.
 * @private
 */
export declare function matcher(options: ParseOptions, ...buffers: Buffer[]): (filepath: string) => Props;
export {};
