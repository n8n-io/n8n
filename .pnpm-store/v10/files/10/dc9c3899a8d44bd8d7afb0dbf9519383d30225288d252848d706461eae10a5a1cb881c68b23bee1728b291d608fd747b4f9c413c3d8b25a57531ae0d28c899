/**
 * A packed-value, sparse array context used for storing 64 bit signed values.
 *
 * An array context is optimised for tracking sparsely set (as in mostly zeros) values that tend to not make
 * use pof the full 64 bit value range even when they are non-zero. The array context's internal representation
 * is such that the packed value at each virtual array index may be represented by 0-8 bytes of actual storage.
 *
 * An array context encodes the packed values in 8 "set trees" with each set tree representing one byte of the
 * packed value at the virtual index in question. The {@link #getPackedIndex(int, int, boolean)} method is used
 * to look up the byte-index corresponding to the given (set tree) value byte of the given virtual index, and can
 * be used to add entries to represent that byte as needed. As a succesful {@link #getPackedIndex(int, int, boolean)}
 * may require a resizing of the array, it can throw a {@link ResizeException} to indicate that the requested
 * packed index cannot be found or added without a resize of the physical storage.
 *
 */
export declare const MINIMUM_INITIAL_PACKED_ARRAY_CAPACITY = 16;
export declare class PackedArrayContext {
    readonly isPacked: boolean;
    physicalLength: number;
    private array;
    private byteArray;
    private shortArray;
    private longArray;
    private populatedShortLength;
    private virtualLength;
    private topLevelShift;
    constructor(virtualLength: number, initialPhysicalLength: number);
    private initArrayViews;
    private init;
    clear(): void;
    copyAndIncreaseSize(newPhysicalArrayLength: number, newVirtualArrayLength: number): PackedArrayContext;
    getPopulatedShortLength(): number;
    getPopulatedLongLength(): number;
    setAtByteIndex(byteIndex: number, value: number): void;
    getAtByteIndex(byteIndex: number): number;
    /**
     * add a byte value to a current byte value in the array
     * @param byteIndex index of byte value to add to
     * @param valueToAdd byte value to add
     * @return the afterAddValue. ((afterAddValue & 0x100) != 0) indicates a carry.
     */
    addAtByteIndex(byteIndex: number, valueToAdd: number): number;
    setPopulatedLongLength(newPopulatedLongLength: number): void;
    getVirtualLength(): number;
    length(): number;
    setAtShortIndex(shortIndex: number, value: number): void;
    setAtLongIndex(longIndex: number, value: number): void;
    getAtShortIndex(shortIndex: number): number;
    getIndexAtShortIndex(shortIndex: number): number;
    setPackedSlotIndicators(entryIndex: number, newPackedSlotIndicators: number): void;
    getPackedSlotIndicators(entryIndex: number): number;
    private getIndexAtEntrySlot;
    setIndexAtEntrySlot(entryIndex: number, slot: number, newIndexValue: number): void;
    private expandArrayIfNeeded;
    private newEntry;
    private newLeafEntry;
    /**
     * Consolidate entry with previous entry verison if one exists
     *
     * @param entryIndex The shortIndex of the entry to be consolidated
     * @param previousVersionIndex the index of the previous version of the entry
     */
    private consolidateEntry;
    /**
     * Expand entry as indicated.
     *
     * @param existingEntryIndex the index of the entry
     * @param entryPointerIndex  index to the slot pointing to the entry (needs to be fixed up)
     * @param insertedSlotIndex  realtive [packed] index of slot being inserted into entry
     * @param insertedSlotMask   mask value fo slot being inserted
     * @param nextLevelIsLeaf    the level below this one is a leaf level
     * @return the updated index of the entry (-1 if epansion failed due to conflict)
     * @throws RetryException if expansion fails due to concurrent conflict, and caller should try again.
     */
    expandEntry(existingEntryIndex: number, entryPointerIndex: number, insertedSlotIndex: number, insertedSlotMask: number, nextLevelIsLeaf: boolean): number;
    getRootEntry(setNumber: number, insertAsNeeded?: boolean): number;
    /**
     * Get the byte-index (into the packed array) corresponding to a given (set tree) value byte of given virtual index.
     * Inserts new set tree nodes as needed if indicated.
     *
     * @param setNumber      The set tree number (0-7, 0 corresponding with the LSByte set tree)
     * @param virtualIndex   The virtual index into the PackedArray
     * @param insertAsNeeded If true, will insert new set tree nodes as needed if they do not already exist
     * @return the byte-index corresponding to the given (set tree) value byte of the given virtual index
     */
    getPackedIndex(setNumber: number, virtualIndex: number, insertAsNeeded: boolean): number;
    determineTopLevelShiftForVirtualLength(virtualLength: number): number;
    setVirtualLength(virtualLength: number): void;
    getTopLevelShift(): number;
    resizeArray(newLength: number): void;
    private populateEquivalentEntriesWithEntriesFromOther;
    private copyEntriesAtLevelFromOther;
    getAtUnpackedIndex(index: number): number;
    setAtUnpackedIndex(index: number, newValue: number): void;
    lazysetAtUnpackedIndex(index: number, newValue: number): void;
    incrementAndGetAtUnpackedIndex(index: number): number;
    addAndGetAtUnpackedIndex(index: number, valueToAdd: number): number;
    private nonLeafEntryToString;
    private leafEntryToString;
    toString(): string;
}
