"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalWritable = void 0;
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
class TerminalWritable {
    constructor(options) {
        this._isOpen = true;
        if (!options) {
            options = {};
        }
        this.preventAutoclose = !!options.preventAutoclose;
    }
    /**
     * This property is initially `true` when the object is constructed, and becomes `false`
     * when `close()` is called.
     * @sealed
     */
    get isOpen() {
        return this._isOpen;
    }
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
    writeChunk(chunk) {
        if (!this._isOpen) {
            throw new Error('Writer was already closed');
        }
        this.onWriteChunk(chunk);
    }
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
    close() {
        if (this._isOpen) {
            this.onClose();
            this._isOpen = false;
        }
    }
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
    onClose() { }
}
exports.TerminalWritable = TerminalWritable;
//# sourceMappingURL=TerminalWritable.js.map