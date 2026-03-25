import { TerminalWritable, type ITerminalWritableOptions } from './TerminalWritable';
/**
 * Constructor options for {@link TerminalTransform}.
 *
 * @public
 */
export interface ITerminalTransformOptions extends ITerminalWritableOptions {
    /**
     * The target `TerminalWritable` that the `TerminalTransform` will write its
     * output to.
     */
    destination: TerminalWritable;
    /**
     * Prevents the {@link TerminalTransform.destination} object from being
     * closed automatically when the transform is closed.
     *
     * @remarks
     * When a transform is closed, normally it will automatically close its destination
     * `TerminalWritable` object.  There are two ways to prevent that: either by setting
     * `preventDestinationAutoclose` to `true` for the transform, or by setting
     * {@link TerminalWritable.preventAutoclose} to `true` for the `destination` object.
     */
    preventDestinationAutoclose?: boolean;
}
/**
 * The abstract base class for {@link TerminalWritable} objects that receive an input,
 * transform it somehow, and then write the output to another `TerminalWritable`.
 *
 * @remarks
 *
 * The `TerminalTransform` and {@link SplitterTransform} base classes formalize the idea
 * of modeling data flow as a directed acyclic graph of reusable transforms, whose
 * final outputs are `TerminalWritable` objects.
 *
 * The design is based loosely on the `WritableStream` and `TransformStream` classes from
 * the system {@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts
 * | Streams API}, except that instead of asynchronous byte streams, the `TerminalWritable`
 * system synchronously transmits human readable messages intended to be rendered on a
 * text console or log file.
 *
 * The main feature of the `TerminalTransform` class is its {@link TerminalTransform.destination}
 * property, which tracks the next link in the graph.
 *
 * @public
 */
export declare abstract class TerminalTransform extends TerminalWritable {
    /** {@inheritDoc ITerminalTransformOptions.destination} */
    readonly destination: TerminalWritable;
    /** {@inheritDoc ITerminalTransformOptions.preventDestinationAutoclose} */
    readonly preventDestinationAutoclose: boolean;
    constructor(options: ITerminalTransformOptions);
    /** @override */
    protected onClose(): void;
    /**
     * The default implementation of {@link TerminalTransform.onClose} calls this
     * method, which closes the {@link TerminalTransform.destination} if appropriate.
     *
     * @remarks
     * The destination will not be closed if its {@link TerminalWritable.preventAutoclose}
     * property is `true`.  The destination will not be closed if
     * {@link ITerminalTransformOptions.preventDestinationAutoclose}
     * is `true`.
     *
     * @sealed
     */
    protected autocloseDestination(): void;
}
//# sourceMappingURL=TerminalTransform.d.ts.map