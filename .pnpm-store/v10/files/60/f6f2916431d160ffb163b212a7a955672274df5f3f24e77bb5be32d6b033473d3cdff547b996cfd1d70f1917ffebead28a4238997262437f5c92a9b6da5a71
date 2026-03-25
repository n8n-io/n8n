import { TerminalWritable } from './TerminalWritable';
import type { ITerminalChunk } from './ITerminalChunk';
/**
 * Constructor options for {@link CallbackWritable}.
 * @public
 */
export interface ICallbackWritableOptions {
    onWriteChunk: (chunk: ITerminalChunk) => void;
}
/**
 * This class enables very basic {@link TerminalWritable.onWriteChunk} operations to be implemented
 * as a callback function, avoiding the need to define a subclass of `TerminalWritable`.
 *
 * @remarks
 * `CallbackWritable` is provided as a convenience for very simple situations. For most cases,
 * it is generally preferable to create a proper subclass.
 *
 * @privateRemarks
 * We intentionally do not expose a callback for {@link TerminalWritable.onClose}; if special
 * close behavior is required, it is better to create a subclass.
 *
 * @public
 */
export declare class CallbackWritable extends TerminalWritable {
    private readonly _callback;
    constructor(options: ICallbackWritableOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
}
//# sourceMappingURL=CallbackWritable.d.ts.map