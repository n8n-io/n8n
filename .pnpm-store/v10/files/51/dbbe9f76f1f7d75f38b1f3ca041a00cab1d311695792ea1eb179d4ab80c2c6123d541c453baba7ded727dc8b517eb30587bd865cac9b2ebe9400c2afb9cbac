export interface BundleOptions {
  intro?: string;
  separator?: string;
}

export interface SourceMapOptions {
  /**
   * Whether the mapping should be high-resolution.
   * Hi-res mappings map every single character, meaning (for example) your devtools will always
   * be able to pinpoint the exact location of function calls and so on.
   * With lo-res mappings, devtools may only be able to identify the correct
   * line - but they're quicker to generate and less bulky.
   * If sourcemap locations have been specified with s.addSourceMapLocation(), they will be used here.
   */
  hires?: boolean;
  /**
   * The filename where you plan to write the sourcemap.
   */
  file?: string;
  /**
   * The filename of the file containing the original source.
   */
  source?: string;
  /**
   * Whether to include the original content in the map's sourcesContent array.
   */
  includeContent?: boolean;
}

export type SourceMapSegment =
  | [number]
  | [number, number, number, number]
  | [number, number, number, number, number];

export interface DecodedSourceMap {
  file: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: SourceMapSegment[][];
}

export class SourceMap {
  constructor(properties: DecodedSourceMap);

  version: number;
  file: string;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;

  /**
   * Returns the equivalent of `JSON.stringify(map)`
   */
  toString(): string;
  /**
   * Returns a DataURI containing the sourcemap. Useful for doing this sort of thing:
   * `generateMap(options?: SourceMapOptions): SourceMap;`
   */
  toUrl(): string;
}

export class Bundle {
  constructor(options?: BundleOptions);
  addSource(source: MagicString | { filename?: string, content: MagicString }): Bundle;
  append(str: string, options?: BundleOptions): Bundle;
  clone(): Bundle;
  generateMap(options?: SourceMapOptions): SourceMap;
  generateDecodedMap(options?: SourceMapOptions): DecodedSourceMap;
  getIndentString(): string;
  indent(indentStr?: string): Bundle;
  indentExclusionRanges: ExclusionRange | Array<ExclusionRange>;
  prepend(str: string): Bundle;
  toString(): string;
  trimLines(): Bundle;
  trim(charType?: string): Bundle;
  trimStart(charType?: string): Bundle;
  trimEnd(charType?: string): Bundle;
  isEmpty(): boolean;
  length(): number;
}

export type ExclusionRange = [ number, number ];

export interface MagicStringOptions {
  filename?: string,
  indentExclusionRanges?: ExclusionRange | Array<ExclusionRange>;
}

export interface IndentOptions {
  exclude?: ExclusionRange | Array<ExclusionRange>;
  indentStart?: boolean;
}

export interface OverwriteOptions {
  storeName?: boolean;
  contentOnly?: boolean;
}

export default class MagicString {
  constructor(str: string, options?: MagicStringOptions);
  /**
   * Adds the specified character index (with respect to the original string) to sourcemap mappings, if `hires` is false.
   */
  addSourcemapLocation(char: number): void;
  /**
   * Appends the specified content to the end of the string.
   */
  append(content: string): MagicString;
  /**
   * Appends the specified content at the index in the original string.
   * If a range *ending* with index is subsequently moved, the insert will be moved with it. 
   * See also `s.prependLeft(...)`.
   */
  appendLeft(index: number, content: string): MagicString;
  /**
   * Appends the specified content at the index in the original string.
   * If a range *starting* with index is subsequently moved, the insert will be moved with it.
   * See also `s.prependRight(...)`.
   */
  appendRight(index: number, content: string): MagicString;
  /**
   * Does what you'd expect.
   */
  clone(): MagicString;
  /**
   * Generates a version 3 sourcemap.
   */
  generateMap(options?: SourceMapOptions): SourceMap;
  /**
   * Generates a sourcemap object with raw mappings in array form, rather than encoded as a string.
   * Useful if you need to manipulate the sourcemap further, but most of the time you will use `generateMap` instead.
   */
  generateDecodedMap(options?: SourceMapOptions): DecodedSourceMap;
  getIndentString(): string;

  /**
   * Prefixes each line of the string with prefix.
   * If prefix is not supplied, the indentation will be guessed from the original content, falling back to a single tab character.
   */
  indent(options?: IndentOptions): MagicString;
  /**
   * Prefixes each line of the string with prefix.
   * If prefix is not supplied, the indentation will be guessed from the original content, falling back to a single tab character.
   *
   * The options argument can have an exclude property, which is an array of [start, end] character ranges.
   * These ranges will be excluded from the indentation - useful for (e.g.) multiline strings.
   */
  indent(indentStr?: string, options?: IndentOptions): MagicString;
  indentExclusionRanges: ExclusionRange | Array<ExclusionRange>;

  /**
   * Moves the characters from `start and `end` to `index`.
   */
  move(start: number, end: number, index: number): MagicString;
  /**
   * Replaces the characters from `start` to `end` with `content`. The same restrictions as `s.remove()` apply.
   *
   * The fourth argument is optional. It can have a storeName property — if true, the original name will be stored
   * for later inclusion in a sourcemap's names array — and a contentOnly property which determines whether only
   * the content is overwritten, or anything that was appended/prepended to the range as well.
   */
  overwrite(start: number, end: number, content: string, options?: boolean | OverwriteOptions): MagicString;
  /**
   * Prepends the string with the specified content. 
   */
  prepend(content: string): MagicString;
  /**
   * Same as `s.appendLeft(...)`, except that the inserted content will go *before* any previous appends or prepends at index
   */
  prependLeft(index: number, content: string): MagicString;
  /**
   * Same as `s.appendRight(...)`, except that the inserted content will go *before* any previous appends or prepends at `index`
   */
  prependRight(index: number, content: string): MagicString;
  /**
   * Removes the characters from `start` to `end` (of the original string, **not** the generated string).
   * Removing the same content twice, or making removals that partially overlap, will cause an error.
   */
  remove(start: number, end: number): MagicString;
  /**
   * Returns the content of the generated string that corresponds to the slice between `start` and `end` of the original string.
   * Throws error if the indices are for characters that were already removed.
   */
  slice(start: number, end: number): string;
  /**
   * Returns a clone of `s`, with all content before the `start` and `end` characters of the original string removed.
   */
  snip(start: number, end: number): MagicString;
  /**
   * Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the start and end.
   */
  trim(charType?: string): MagicString;
  /**
   * Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the start.
   */
  trimStart(charType?: string): MagicString;
  /**
   * Trims content matching `charType` (defaults to `\s`, i.e. whitespace) from the end.
   */
  trimEnd(charType?: string): MagicString;
  /**
   * Removes empty lines from the start and end.
   */
  trimLines(): MagicString;

  lastChar(): string;
  lastLine(): string;
  /**
   * Returns true if the resulting source is empty (disregarding white space).
   */
  isEmpty(): boolean;
  length(): number;

  original: string;
  /**
   * Returns the generated string.
   */
  toString(): string;
}
