import { TerminalWritable, type ITerminalWritableOptions } from './TerminalWritable';
import type { ITerminalChunk } from './ITerminalChunk';
/**
 * Constructor options for {@link SplitterTransform}.
 *
 * @public
 */
export interface ISplitterTransformOptions extends ITerminalWritableOptions {
    /**
     * Each input chunk will be passed to each destination in the array.
     */
    destinations: TerminalWritable[];
}
/**
 * Use this instead of {@link TerminalTransform} if you need to output `ITerminalChunk`
 * data to more than one destination.
 *
 * @remarks
 *
 * Splitting streams complicates the pipeline topology and can make debugging more difficult.
 * For this reason, it is modeled as an explicit `SplitterTransform` node, rather than
 * as a built-in feature of `TerminalTransform`.
 *
 * @public
 */
export declare class SplitterTransform extends TerminalWritable {
    readonly destinations: ReadonlyArray<TerminalWritable>;
    constructor(options: ISplitterTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
    protected onClose(): void;
}
//# sourceMappingURL=SplitterTransform.d.ts.map