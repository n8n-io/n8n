/**
 * A Packed array of signed 64 bit values, and supports {@link #get get()}, {@link #set set()},
 * {@link #add add()} and {@link #increment increment()} operations on the logical contents of the array.
 *
 * An {@link PackedLongArray} Uses {@link PackedArrayContext} to track
 * the array's logical contents. Contexts may be switched when a context requires resizing
 * to complete logical array operations (get, set, add, increment). Contexts are
 * established and used within critical sections in order to facilitate concurrent
 * implementors.
 *
 */
export declare class PackedArray {
    private arrayContext;
    constructor(virtualLength: number, initialPhysicalLength?: number);
    setVirtualLength(newVirtualArrayLength: number): void;
    /**
     * Get value at virtual index in the array
     * @param index the virtual array index
     * @return the array value at the virtual index given
     */
    get(index: number): number;
    /**
     * Increment value at a virrual index in the array
     * @param index virtual index of value to increment
     */
    increment(index: number): void;
    private safeGetPackedIndexgetPackedIndex;
    /**
     * Add to a value at a virtual index in the array
     * @param index the virtual index of the value to be added to
     * @param value the value to add
     */
    add(index: number, value: number): void;
    /**
     * Set the value at a virtual index in the array
     * @param index the virtual index of the value to set
     * @param value the value to set
     */
    set(index: number, value: number): void;
    /**
     * Get the current physical length (in longs) of the array's backing storage
     * @return the current physical length (in longs) of the array's current backing storage
     */
    getPhysicalLength(): number;
    /**
     * Get the (virtual) length of the array
     * @return the (virtual) length of the array
     */
    length(): number;
    /**
     * Clear the array contents
     */
    clear(): void;
    toString(): string;
}
