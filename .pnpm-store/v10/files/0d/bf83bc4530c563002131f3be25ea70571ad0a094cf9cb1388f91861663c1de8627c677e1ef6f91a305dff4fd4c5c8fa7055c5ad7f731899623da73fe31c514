import { type ITerminalChunk } from './ITerminalChunk';
import { type ITerminalWritableOptions, TerminalWritable } from './TerminalWritable';
/**
 * Constructor options for {@link StdioSummarizer}.
 * @beta
 */
export interface IStdioSummarizerOptions extends ITerminalWritableOptions {
    /**
     * Specifies the maximum number of leading lines to include in the summary.
     * @defaultValue `10`
     */
    leadingLines?: number;
    /**
     * Specifies the maximum number of trailing lines to include in the summary.
     * @defaultValue `10`
     */
    trailingLines?: number;
}
/**
 * Summarizes the results of a failed build task by returning a subset of `stderr` output not to exceed
 * a specified maximum number of lines.
 *
 * @remarks
 * IMPORTANT: This transform assumes that its input was prepared by {@link StderrLineTransform}, so that each
 * {@link ITerminalChunk.text} item is a single line terminated by a `"\n"` character.
 *
 * The {@link IStdioSummarizerOptions.leadingLines} and {@link IStdioSummarizerOptions.trailingLines}
 * counts specify the maximum number of lines to be returned. Any additional lines will be omitted.
 * For example, if `leadingLines` and `trailingLines` were set to `3`, then the summary of 16 `stderr` lines might
 * look like this:
 *
 * ```
 * Line 1
 * Line 2
 * Line 3
 *   ...10 lines omitted...
 * Line 14
 * Line 15
 * Line 16
 * ```
 *
 * If the `stderr` output is completely empty, then the `stdout` output will be summarized instead.
 *
 * @beta
 */
export declare class StdioSummarizer extends TerminalWritable {
    private _leadingLines;
    private _trailingLines;
    private readonly _abridgedLeading;
    private readonly _abridgedTrailing;
    private _abridgedOmittedLines;
    private _abridgedStderr;
    constructor(options?: IStdioSummarizerOptions);
    /**
     * Returns the summary report.
     *
     * @remarks
     * The `close()` method must be called before `getReport()` can be used.
     */
    getReport(): string;
    onWriteChunk(chunk: ITerminalChunk): void;
}
//# sourceMappingURL=StdioSummarizer.d.ts.map