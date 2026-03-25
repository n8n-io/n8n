import { type ITerminalChunk } from './ITerminalChunk';
import { TerminalTransform, type ITerminalTransformOptions } from './TerminalTransform';
/**
 * Constructor options for {@link DiscardStdoutTransform}
 *
 * @beta
 */
export interface IDiscardStdoutTransformOptions extends ITerminalTransformOptions {
}
/**
 * `DiscardStdoutTransform` discards `stdout` chunks while fixing up malformed `stderr` lines.
 *
 * @remarks
 * Suppose that a poorly behaved process produces output like this:
 *
 * ```ts
 * process.stdout.write('Starting operation...\n');
 * process.stderr.write('An error occurred');
 * process.stdout.write('\nFinishing up\n');
 * process.stderr.write('The process completed with errors\n');
 * ```
 *
 * When `stdout` and `stderr` are combined on the console, the mistake in the output would not be noticeable:
 * ```
 * Starting operation...
 * An error occurred
 * Finishing up
 * The process completed with errors
 * ```
 *
 * However, if we discard `stdout`, then `stderr` is missing a newline:
 * ```
 * An error occurredThe process completed with errors
 * ```
 *
 * Tooling scripts can introduce these sorts of problems via edge cases that are difficult to find and fix.
 * `DiscardStdoutTransform` can discard the `stdout` stream and fix up `stderr`:
 *
 * ```
 * An error occurred
 * The process completed with errors
 * ```
 *
 * @privateRemarks
 * This class is experimental and marked as `@beta`.  The algorithm may need some fine-tuning, or there may
 * be better solutions to this problem.
 *
 * @beta
 */
export declare class DiscardStdoutTransform extends TerminalTransform {
    private _state;
    constructor(options: IDiscardStdoutTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
}
//# sourceMappingURL=DiscardStdoutTransform.d.ts.map