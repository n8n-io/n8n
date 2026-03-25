/**
 * Specifies the kind of data represented by a {@link ITerminalChunk} object.
 * @public
 */
export declare enum TerminalChunkKind {
    /**
     * Indicates a `ITerminalChunk` object representing `stdout` console output.
     */
    Stdout = "O",
    /**
     * Indicates a `ITerminalChunk` object representing `stderr` console output.
     */
    Stderr = "E"
}
/**
 * Represents a chunk of output that will ultimately be written to a {@link TerminalWritable}.
 *
 * @remarks
 * Today `ITerminalChunk` represents the `stdout` and `stderr` text streams.  In the future,
 * we plan to expand it to include other console UI elements such as instructions for displaying
 * an interactive progress bar.  We may also add other metadata, for example tracking whether
 * the `text` string is known to contain color codes or not.
 *
 * The `ITerminalChunk` object should be considered to be immutable once it is created.
 * For example, {@link SplitterTransform} may pass the same chunk to multiple destinations.
 *
 * @public
 */
export interface ITerminalChunk {
    /**
     * Indicates the kind of information stored in this chunk.
     *
     * @remarks
     * More kinds will be introduced in the future.  Implementors of
     * {@link TerminalWritable.onWriteChunk} should ignore unrecognized `TerminalChunkKind`
     * values.  `TerminalTransform` implementors should pass along unrecognized chunks
     * rather than discarding them.
     */
    kind: TerminalChunkKind;
    /**
     * The next chunk of text from the `stderr` or `stdout` stream.
     */
    text: string;
}
//# sourceMappingURL=ITerminalChunk.d.ts.map