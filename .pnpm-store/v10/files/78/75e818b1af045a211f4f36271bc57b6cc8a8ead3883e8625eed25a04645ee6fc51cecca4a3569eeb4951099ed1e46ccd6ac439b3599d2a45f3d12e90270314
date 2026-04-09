/**
 * Parse VS Code style problem matcher definitions and use them to extract
 * structured problem reports from strings.
 *
 * @packageDocumentation
 */

/**
 * Represents a problem (generally an error or warning) detected in the console output.
 *
 * @public
 */
export declare interface IProblem {
    /** The name of the matcher that detected the problem. */
    readonly matcherName: string;
    /** Parsed message from the problem matcher */
    readonly message: string;
    /** Parsed severity level from the problem matcher */
    readonly severity?: ProblemSeverity;
    /** Parsed file path from the problem matcher */
    readonly file?: string;
    /** Parsed line number from the problem matcher */
    readonly line?: number;
    /** Parsed column number from the problem matcher */
    readonly column?: number;
    /** Parsed ending line number from the problem matcher */
    readonly endLine?: number;
    /** Parsed ending column number from the problem matcher */
    readonly endColumn?: number;
    /** Parsed error or warning code from the problem matcher */
    readonly code?: string;
}

/**
 * A problem matcher processes one line at a time and returns an {@link IProblem} if a match occurs.
 *
 * @remarks
 * Multi-line matchers may keep internal state and emit on a later line; they can also optionally
 * implement `flush()` to emit any buffered problems when the stream closes.
 *
 * @public
 */
export declare interface IProblemMatcher {
    /** A friendly (and stable) name identifying the matcher. */
    readonly name: string;
    /**
     * Attempt to match a problem for the provided line of console output.
     *
     * @param line - A single line of text, always terminated with a newline character (\\n).
     * @returns A problem if recognized, otherwise `false`.
     */
    exec(line: string): IProblem | false;
    /**
     * Flush any buffered state and return additional problems. Optional.
     */
    flush?(): IProblem[];
}

/**
 * Minimal VS Code problem matcher definition.
 *
 * @public
 */
export declare interface IProblemMatcherJson {
    /** A friendly (and stable) name identifying the matcher. */
    name: string;
    /** An optional default severity to apply if the pattern does not capture one. */
    severity?: ProblemSeverity;
    /** A single pattern or an array of patterns to match. */
    pattern: IProblemPattern | IProblemPattern[];
}

/**
 * VS Code style problem matcher pattern definition.
 *
 * @remarks
 * This mirrors the shape used in VS Code's `problemMatcher.pattern` entries.
 * Reference: https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher
 *
 * @public
 */
export declare interface IProblemPattern {
    /** A regular expression used to match the problem. */
    regexp: string;
    /** Match index for the file path. */
    file?: number;
    /** Match index for the location. */
    location?: number;
    /** Match index for the starting line number. */
    line?: number;
    /** Match index for the starting column number. */
    column?: number;
    /** Match index for the ending line number. */
    endLine?: number;
    /** Match index for the ending column number. */
    endColumn?: number;
    /** Match index for the severity level. */
    severity?: number;
    /** Match index for the problem code. */
    code?: number;
    /** Match index for the problem message. */
    message: number;
    /** If true, the last pattern in a multi-line matcher may repeat (loop) producing multiple problems */
    loop?: boolean;
}

/**
 * Parse VS Code problem matcher JSON definitions into {@link IProblemMatcher} objects.
 *
 * @public
 */
export declare function parseProblemMatchersJson(problemMatchers: IProblemMatcherJson[]): IProblemMatcher[];

/**
 * Represents the severity level of a problem.
 *
 * @public
 */
export declare type ProblemSeverity = 'error' | 'warning' | 'info';

export { }
