import { NewlineKind } from '@rushstack/node-core-library';
import { type ITerminalChunk } from './ITerminalChunk';
import { TerminalTransform, type ITerminalTransformOptions } from './TerminalTransform';
/**
 * Constructor options for {@link StderrLineTransform}
 * @beta
 */
export interface IStdioLineTransformOptions extends ITerminalTransformOptions {
    /**
     * Specifies the kind of newline for the output.
     */
    newlineKind?: NewlineKind;
}
/**
 * `StderrLineTransform` normalizes lines that mix characters from `stdout` and `stderr`,
 * so that each output line is routed entirely to `stdout` or `stderr`.
 *
 * @remarks
 * IMPORTANT: This transform assumes that its input has been normalized to use `"\n"` newlines.
 *
 * IMPORTANT: This transform does not produce realtime output, because lines are buffered
 * until a newline character is encountered.
 *
 * Suppose that a poorly behaved process produces output like this:
 *
 * ```ts
 * process.stderr.write('An error occurred, cleaning up');
 * process.stdout.write('.'); // (delay)
 * process.stdout.write('.'); // (delay)
 * process.stdout.write('.');
 * process.stdout.write('\n');
 * process.stderr.write('The process completed with errors\n');
 * ```
 *
 * When `stdout` and `stderr` are combined on the console, the mistake in the output would not be noticeable:
 * ```
 * An error occurred, cleaning up...
 * The process completed with errors
 * ```
 *
 * However, if we discard `stdout`, then `stderr` is malformed:
 * ```
 * An error occurred, cleaning upThe process completed with errors
 * ```
 *
 * Tooling scripts can introduce these sorts of problems via edge cases that are difficult to find and fix.
 *
 * `StderrLineTransform` normalizes the output so that if a combined line contains any `stderr` characters,
 * then the entire line is routed to `stderr`.  Later, if we discard `stdout`, then the output will
 * preserve the appropriate context:
 *
 * ```
 * An error occurred, cleaning up...
 * The process completed with errors
 * ```
 *
 * @privateRemarks
 * This class is experimental and marked as `@beta`.  The algorithm may need some fine-tuning, or there may
 * be better solutions to this problem.
 *
 * @beta
 */
export declare class StderrLineTransform extends TerminalTransform {
    private _accumulatedLine;
    private _accumulatedStderr;
    readonly newline: string;
    constructor(options: IStdioLineTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
    protected onClose(): void;
    private _processAccumulatedLine;
}
//# sourceMappingURL=StdioLineTransform.d.ts.map