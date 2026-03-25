/**
 * An interface for a builder object that allows a large text string to be constructed incrementally by appending
 * small chunks.
 *
 * @remarks
 *
 * {@link StringBuilder} is the default implementation of this contract.
 */
export interface IStringBuilder {
    /**
     * Append the specified text to the buffer.
     */
    append(text: string): void;
    /**
     * Returns a single string containing all the text that was appended to the buffer so far.
     *
     * @remarks
     *
     * This is a potentially expensive operation.
     */
    toString(): string;
}
/**
 * This class allows a large text string to be constructed incrementally by appending small chunks.  The final
 * string can be obtained by calling StringBuilder.toString().
 *
 * @remarks
 * A naive approach might use the `+=` operator to append strings:  This would have the downside of copying
 * the entire string each time a chunk is appended, resulting in `O(n^2)` bytes of memory being allocated
 * (and later freed by the garbage  collector), and many of the allocations could be very large objects.
 * StringBuilder avoids this overhead by accumulating the chunks in an array, and efficiently joining them
 * when `getText()` is finally called.
 */
export declare class StringBuilder implements IStringBuilder {
    private _chunks;
    constructor();
    /** {@inheritdoc IStringBuilder.append} */
    append(text: string): void;
    /** {@inheritdoc IStringBuilder.toString} */
    toString(): string;
}
//# sourceMappingURL=StringBuilder.d.ts.map