// IncludeOptions definitions copied from minimatch (https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/minimatch/index.d.ts)
interface IncludeOptions {
  /**
   * Dump a ton of stuff to stderr.
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Do not expand {a,b} and {1..3} brace sets.
   *
   * @default false
   */
  nobrace?: boolean;

  /**
   * Disable ** matching against multiple folder names.
   *
   * @default false
   */
  noglobstar?: boolean;

  /**
   * Allow patterns to match filenames starting with a period,
   * even if the pattern does not explicitly have a period in that spot.
   *
   * @default false
   */
  dot?: boolean;

  /**
   * Disable "extglob" style patterns like +(a|b).
   *
   * @default false
   */
  noext?: boolean;

  /**
   * Perform a case-insensitive match.
   *
   * @default false
   */
  nocase?: boolean;

  /**
   * When a match is not found by minimatch.match,
   * return a list containing the pattern itself if this option is set.
   * Otherwise, an empty list is returned if there are no matches.
   *
   * @default false
   */
  nonull?: boolean;

  /**
   * If set, then patterns without slashes will be matched against
   * the basename of the path if it contains slashes.
   *
   * @default false
   */
  matchBase?: boolean;

  /**
   * Suppress the behavior of treating #
   * at the start of a pattern as a comment.
   *
   * @default false
   */
  nocomment?: boolean;

  /**
   * Suppress the behavior of treating a leading ! character as negation.
   *
   * @default false
   */
  nonegate?: boolean;

  /**
   * Returns from negate expressions the same as if they were not negated.
   * (Ie, true on a hit, false on a miss.)
   *
   * @default false
   */
  flipNegate?: boolean;
}

export class FileList {
  static clone(): FileList
  static verbose: boolean
}

export interface FileList extends Omit<Array<string>, "length"> {
  pendingAdd: string[]
  pending: boolean
  excludes: {
    pats: RegExp[],
    funcs: Function[],
    regex: null | RegExp
  }
  items: string[]
  toArray(): string[]
  include(...items: string[]): this
  include(...items: (IncludeOptions | string)[]): this
  exclude(...items: string[]): this
  shouldExclude(item: string): boolean
  resolve(): this
  clearInclusions(): this
  clearExclusions(): this
  length(): number
}