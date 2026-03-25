import type { ITerminalChunk } from './ITerminalChunk';
/**
 * Constructor options for {@link TerminalWritable}
 *
 * @public
 */
export interface ITerminalWritableOptions {
    /**
     * When this object is the {@link TerminalTransform.destination} for a transform,
     * the transform will automatically close this object.  Set `preventAutoclose` to `true`
     * to prevent that behavior.
     *
     * @remarks
     * When a transform is closed, normally it will automatically close its destination
     * `TerminalWritable` object.  There are two ways to prevent that: either by setting
     * `preventDestinationAutoclose` to `true` for the transform, or by setting
     * {@link TerminalWritable.preventAutoclose} to `true` for the `destination` object.
     */
    preventAutoclose?: boolean;
}
/**
 * The abstract base class for objects that can present, route, or process text output for
 * a console application.  This output is typically prepared using
 * the {@link Terminal} API.
 *
 * @remarks
 *
 * The design is based loosely on the `WritableStream` and `TransformStream` classes from
 * the system {@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts
 * | Streams API}, except that instead of asynchronous byte streams, the `TerminalWritable`
 * system synchronously transmits human readable messages intended to be rendered on a text
 * console or log file.
 *
 * Consider a console application whose output may need to be processed in different ways
 * before finally being output.  The conceptual block diagram might look like this:
 *
 * ```
 *          [Terminal API]
 *                 |
 *                 V
 *        [normalize newlines]
 *                 |
 *                 V
 *       +----[splitter]-------+
 *       |                     |
 *       V                     V
 *   [shell console]     [remove ANSI colors]
 *                             |
 *                             V
 *                       [write to build.log]
 * ```
 *
 * The application uses the `Terminal` API to print `stdout` and `stderr` messages, for example with standardized
 * formatting for errors and warnings, and ANSI escapes to make nice colors.  Maybe it also includes text
 * received from external processes, whose newlines may be inconsistent.  Ultimately we want to write the
 * output to the shell console and a `build.log` file, but we don't want to put ANSI colors in the build log.
 *
 * For the above example, `[shell console]` and `[write to build.log]` would be modeled as subclasses of
 * `TerminalWritable`.  The `[normalize newlines]` and `[remove ANSI colors]` steps are modeled as subclasses
 * of {@link TerminalTransform}, because they output to a "destination" object.  The `[splitter]` would be
 * implemented using {@link SplitterTransform}.
 *
 * The stream of messages are {@link ITerminalChunk} objects, which can represent both `stdout` and `stderr`
 * channels.  The pipeline operates synchronously on each chunk, but by processing one chunk at a time,
 * it avoids storing the entire output in memory.  This means that operations like `[remove ANSI colors]`
 * cannot be simple regular expressions -- they must be implemented as state machines ({@link TextRewriter}
 * subclasses) capable of matching substrings that span multiple chunks.
 *
 * @public
 */
export declare abstract class TerminalWritable {
    private _isOpen;
    readonly preventAutoclose: boolean;
    constructor(options?: ITerminalWritableOptions);
    /**
     * This property is initially `true` when the object is constructed, and becomes `false`
     * when `close()` is called.
     * @sealed
     */
    get isOpen(): boolean;
    /**
     * Upstream objects call this method to provide inputs to this object.
     *
     * @remarks
     * The subclass provides its implementation via the the {@link TerminalWritable.onWriteChunk}
     * method, which is called by `writeChunk()`.
     *
     * The object that calls `writeChunk()` must call `close()` when it is finished;
     * failing to do so may introduce a resource leak, or may prevent some buffered data from
     * being written.
     *
     * @sealed
     */
    writeChunk(chunk: ITerminalChunk): void;
    /**
     * Subclasses should implement this `abstract` method to process the chunk.
     */
    protected abstract onWriteChunk(chunk: ITerminalChunk): void;
    /**
     * Calling this method flushes any remaining outputs and permanently transitions the
     * `TerminalWritable` to a "closed" state, where no further chunks can be written.
     *
     * @remarks
     * The subclass provides its implementation via the the {@link TerminalWritable.onClose}
     * method, which is called by `close()`.
     *
     * If this method is called more than once, the additional calls are ignored;
     * `TerminalWritable.onClose` will be called at most once.
     *
     * @sealed
     */
    close(): void;
    /**
     * Subclasses can override this empty method to perform additional operations
     * such as closing a file handle.
     *
     * @remarks
     * It is guaranteed that this method will be called at most once during the lifetime
     * of a `TerminalWritable` object.
     *
     * @virtual
     */
    protected onClose(): void;
}
//# sourceMappingURL=TerminalWritable.d.ts.map