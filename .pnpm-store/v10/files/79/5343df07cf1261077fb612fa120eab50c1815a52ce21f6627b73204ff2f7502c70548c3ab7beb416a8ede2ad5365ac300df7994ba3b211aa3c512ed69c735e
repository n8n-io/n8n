import { TerminalWritable, type ITerminalWritableOptions } from './TerminalWritable';
import type { ITerminalChunk } from './ITerminalChunk';
/**
 * Constructor options for {@link SplitterTransform}.
 *
 * @public
 */
export interface ISplitterTransformOptions extends ITerminalWritableOptions {
    /**
     * Each input chunk will be passed to each destination in the iterable.
     */
    destinations: Iterable<TerminalWritable>;
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
    private readonly _destinations;
    constructor(options: ISplitterTransformOptions);
    get destinations(): ReadonlySet<TerminalWritable>;
    /**
     * Adds a destination to the set of destinations. Duplicates are ignored.
     * Only new chunks received after the destination is added will be sent to it.
     * @param destination - The destination to add.
     */
    addDestination(destination: TerminalWritable): void;
    /**
     * Removes a destination from the set of destinations. It will no longer receive chunks, and will be closed, unless
     * `destination.preventAutoclose` is set to `true`.
     * @param destination - The destination to remove.
     * @param close - If `true` (default), the destination will be closed when removed, unless `destination.preventAutoclose` is set to `true`.
     * @returns `true` if the destination was removed, `false` if it was not found.
     * @remarks
     * If the destination is not found, it will not be closed.
     */
    removeDestination(destination: TerminalWritable, close?: boolean): boolean;
    protected onWriteChunk(chunk: ITerminalChunk): void;
    protected onClose(): void;
}
//# sourceMappingURL=SplitterTransform.d.ts.map