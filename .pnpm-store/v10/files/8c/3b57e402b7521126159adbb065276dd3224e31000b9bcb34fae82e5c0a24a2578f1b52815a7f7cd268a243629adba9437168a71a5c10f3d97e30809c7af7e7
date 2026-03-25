"use strict";
/*
 * This is a TypeScript port of the original Java version, which was written by
 * Gil Tene as described in
 * https://github.com/HdrHistogram/HdrHistogram
 * and released to the public domain, as explained at
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackedArrayContext = exports.MINIMUM_INITIAL_PACKED_ARRAY_CAPACITY = void 0;
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
exports.MINIMUM_INITIAL_PACKED_ARRAY_CAPACITY = 16;
const MAX_SUPPORTED_PACKED_COUNTS_ARRAY_LENGTH = Math.pow(2, 13) - 1; //(Short.MAX_VALUE / 4);  TODO ALEX why ???
const SET_0_START_INDEX = 0;
const NUMBER_OF_SETS = 8;
const LEAF_LEVEL_SHIFT = 3;
const NON_LEAF_ENTRY_SLOT_INDICATORS_OFFSET = 0;
const NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS = 1;
const PACKED_ARRAY_GROWTH_INCREMENT = 16;
const PACKED_ARRAY_GROWTH_FRACTION_POW2 = 4;
const { pow, ceil, log2, max } = Math;
const bitCount = (n) => {
    var bits = 0;
    while (n !== 0) {
        bits += bitCount32(n | 0);
        n /= 0x100000000;
    }
    return bits;
};
const bitCount32 = (n) => {
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
};
class PackedArrayContext {
    constructor(virtualLength, initialPhysicalLength) {
        this.populatedShortLength = 0;
        this.topLevelShift = Number.MAX_VALUE; // Make it non-sensical until properly initialized.
        this.physicalLength = Math.max(initialPhysicalLength, exports.MINIMUM_INITIAL_PACKED_ARRAY_CAPACITY);
        this.isPacked =
            this.physicalLength <= MAX_SUPPORTED_PACKED_COUNTS_ARRAY_LENGTH;
        if (!this.isPacked) {
            this.physicalLength = virtualLength;
        }
        this.array = new ArrayBuffer(this.physicalLength * 8);
        this.initArrayViews(this.array);
        this.init(virtualLength);
    }
    initArrayViews(array) {
        this.byteArray = new Uint8Array(array);
        this.shortArray = new Uint16Array(array);
        this.longArray = new Float64Array(array);
    }
    init(virtualLength) {
        if (!this.isPacked) {
            // Deal with non-packed context init:
            this.virtualLength = virtualLength;
            return;
        }
        this.populatedShortLength = SET_0_START_INDEX + 8;
        // Populate empty root entries, and point to them from the root indexes:
        for (let i = 0; i < NUMBER_OF_SETS; i++) {
            this.setAtShortIndex(SET_0_START_INDEX + i, 0);
        }
        this.setVirtualLength(virtualLength);
    }
    clear() {
        this.byteArray.fill(0);
        this.init(this.virtualLength);
    }
    copyAndIncreaseSize(newPhysicalArrayLength, newVirtualArrayLength) {
        const ctx = new PackedArrayContext(newVirtualArrayLength, newPhysicalArrayLength);
        if (this.isPacked) {
            ctx.populateEquivalentEntriesWithEntriesFromOther(this);
        }
        return ctx;
    }
    getPopulatedShortLength() {
        return this.populatedShortLength;
    }
    getPopulatedLongLength() {
        return (this.getPopulatedShortLength() + 3) >> 2; // round up
    }
    setAtByteIndex(byteIndex, value) {
        this.byteArray[byteIndex] = value;
    }
    getAtByteIndex(byteIndex) {
        return this.byteArray[byteIndex];
    }
    /**
     * add a byte value to a current byte value in the array
     * @param byteIndex index of byte value to add to
     * @param valueToAdd byte value to add
     * @return the afterAddValue. ((afterAddValue & 0x100) != 0) indicates a carry.
     */
    addAtByteIndex(byteIndex, valueToAdd) {
        const newValue = this.byteArray[byteIndex] + valueToAdd;
        this.byteArray[byteIndex] = newValue;
        return newValue;
    }
    setPopulatedLongLength(newPopulatedLongLength) {
        this.populatedShortLength = newPopulatedLongLength << 2;
    }
    getVirtualLength() {
        return this.virtualLength;
    }
    length() {
        return this.physicalLength;
    }
    setAtShortIndex(shortIndex, value) {
        this.shortArray[shortIndex] = value;
    }
    setAtLongIndex(longIndex, value) {
        this.longArray[longIndex] = value;
    }
    getAtShortIndex(shortIndex) {
        return this.shortArray[shortIndex];
    }
    getIndexAtShortIndex(shortIndex) {
        return this.shortArray[shortIndex];
    }
    setPackedSlotIndicators(entryIndex, newPackedSlotIndicators) {
        this.setAtShortIndex(entryIndex + NON_LEAF_ENTRY_SLOT_INDICATORS_OFFSET, newPackedSlotIndicators);
    }
    getPackedSlotIndicators(entryIndex) {
        return (this.shortArray[entryIndex + NON_LEAF_ENTRY_SLOT_INDICATORS_OFFSET] &
            0xffff);
    }
    getIndexAtEntrySlot(entryIndex, slot) {
        return this.getAtShortIndex(entryIndex + NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS + slot);
    }
    setIndexAtEntrySlot(entryIndex, slot, newIndexValue) {
        this.setAtShortIndex(entryIndex + NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS + slot, newIndexValue);
    }
    expandArrayIfNeeded(entryLengthInLongs) {
        const currentLength = this.length();
        if (currentLength < this.getPopulatedLongLength() + entryLengthInLongs) {
            const growthIncrement = max(entryLengthInLongs, PACKED_ARRAY_GROWTH_INCREMENT, this.getPopulatedLongLength() >> PACKED_ARRAY_GROWTH_FRACTION_POW2);
            this.resizeArray(currentLength + growthIncrement);
        }
    }
    newEntry(entryLengthInShorts) {
        // Add entry at the end of the array:
        const newEntryIndex = this.populatedShortLength;
        this.expandArrayIfNeeded((entryLengthInShorts >> 2) + 1);
        this.populatedShortLength = newEntryIndex + entryLengthInShorts;
        for (let i = 0; i < entryLengthInShorts; i++) {
            this.setAtShortIndex(newEntryIndex + i, -1); // Poison value -1. Must be overriden before reads
        }
        return newEntryIndex;
    }
    newLeafEntry() {
        // Add entry at the end of the array:
        let newEntryIndex;
        newEntryIndex = this.getPopulatedLongLength();
        this.expandArrayIfNeeded(1);
        this.setPopulatedLongLength(newEntryIndex + 1);
        this.setAtLongIndex(newEntryIndex, 0);
        return newEntryIndex;
    }
    /**
     * Consolidate entry with previous entry verison if one exists
     *
     * @param entryIndex The shortIndex of the entry to be consolidated
     * @param previousVersionIndex the index of the previous version of the entry
     */
    consolidateEntry(entryIndex, previousVersionIndex) {
        const previousVersionPackedSlotsIndicators = this.getPackedSlotIndicators(previousVersionIndex);
        // Previous version exists, needs consolidation
        const packedSlotsIndicators = this.getPackedSlotIndicators(entryIndex);
        const insertedSlotMask = packedSlotsIndicators ^ previousVersionPackedSlotsIndicators; // the only bit that differs
        const slotsBelowBitNumber = packedSlotsIndicators & (insertedSlotMask - 1);
        const insertedSlotIndex = bitCount(slotsBelowBitNumber);
        const numberOfSlotsInEntry = bitCount(packedSlotsIndicators);
        // Copy the entry slots from previous version, skipping the newly inserted slot in the target:
        let sourceSlot = 0;
        for (let targetSlot = 0; targetSlot < numberOfSlotsInEntry; targetSlot++) {
            if (targetSlot !== insertedSlotIndex) {
                const indexAtSlot = this.getIndexAtEntrySlot(previousVersionIndex, sourceSlot);
                if (indexAtSlot !== 0) {
                    this.setIndexAtEntrySlot(entryIndex, targetSlot, indexAtSlot);
                }
                sourceSlot++;
            }
        }
    }
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
    expandEntry(existingEntryIndex, entryPointerIndex, insertedSlotIndex, insertedSlotMask, nextLevelIsLeaf) {
        let packedSlotIndicators = this.getAtShortIndex(existingEntryIndex) & 0xffff;
        packedSlotIndicators |= insertedSlotMask;
        const numberOfslotsInExpandedEntry = bitCount(packedSlotIndicators);
        if (insertedSlotIndex >= numberOfslotsInExpandedEntry) {
            throw new Error("inserted slot index is out of range given provided masks");
        }
        const expandedEntryLength = numberOfslotsInExpandedEntry + NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS;
        // Create new next-level entry to refer to from slot at this level:
        let indexOfNewNextLevelEntry = 0;
        if (nextLevelIsLeaf) {
            indexOfNewNextLevelEntry = this.newLeafEntry(); // Establish long-index to new leaf entry
        }
        else {
            // TODO: Optimize this by creating the whole sub-tree here, rather than a step that will immediaterly expand
            // Create a new 1 word (empty, no slots set) entry for the next level:
            indexOfNewNextLevelEntry = this.newEntry(NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS); // Establish short-index to new leaf entry
            this.setPackedSlotIndicators(indexOfNewNextLevelEntry, 0);
        }
        const insertedSlotValue = indexOfNewNextLevelEntry;
        const expandedEntryIndex = this.newEntry(expandedEntryLength);
        // populate the packed indicators word:
        this.setPackedSlotIndicators(expandedEntryIndex, packedSlotIndicators);
        // Populate the inserted slot with the index of the new next level entry:
        this.setIndexAtEntrySlot(expandedEntryIndex, insertedSlotIndex, insertedSlotValue);
        this.setAtShortIndex(entryPointerIndex, expandedEntryIndex);
        this.consolidateEntry(expandedEntryIndex, existingEntryIndex);
        return expandedEntryIndex;
    }
    //
    //   ######   ######## ########    ##     ##    ###    ##             ## #### ##    ## ########  ######## ##     ##
    //  ##    ##  ##          ##       ##     ##   ## ##   ##            ##   ##  ###   ## ##     ## ##        ##   ##
    //  ##        ##          ##       ##     ##  ##   ##  ##           ##    ##  ####  ## ##     ## ##         ## ##
    //  ##   #### ######      ##       ##     ## ##     ## ##          ##     ##  ## ## ## ##     ## ######      ###
    //  ##    ##  ##          ##        ##   ##  ######### ##         ##      ##  ##  #### ##     ## ##         ## ##
    //  ##    ##  ##          ##         ## ##   ##     ## ##        ##       ##  ##   ### ##     ## ##        ##   ##
    //   ######   ########    ##          ###    ##     ## ######## ##       #### ##    ## ########  ######## ##     ##
    //
    getRootEntry(setNumber, insertAsNeeded = false) {
        const entryPointerIndex = SET_0_START_INDEX + setNumber;
        let entryIndex = this.getIndexAtShortIndex(entryPointerIndex);
        if (entryIndex == 0) {
            if (!insertAsNeeded) {
                return 0; // Index does not currently exist in packed array;
            }
            entryIndex = this.newEntry(NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS);
            // Create a new empty (no slots set) entry for the next level:
            this.setPackedSlotIndicators(entryIndex, 0);
            this.setAtShortIndex(entryPointerIndex, entryIndex);
        }
        return entryIndex;
    }
    /**
     * Get the byte-index (into the packed array) corresponding to a given (set tree) value byte of given virtual index.
     * Inserts new set tree nodes as needed if indicated.
     *
     * @param setNumber      The set tree number (0-7, 0 corresponding with the LSByte set tree)
     * @param virtualIndex   The virtual index into the PackedArray
     * @param insertAsNeeded If true, will insert new set tree nodes as needed if they do not already exist
     * @return the byte-index corresponding to the given (set tree) value byte of the given virtual index
     */
    getPackedIndex(setNumber, virtualIndex, insertAsNeeded) {
        if (virtualIndex >= this.virtualLength) {
            throw new Error(`Attempting access at index ${virtualIndex}, beyond virtualLength ${this.virtualLength}`);
        }
        let entryPointerIndex = SET_0_START_INDEX + setNumber; // TODO init needed ?
        let entryIndex = this.getRootEntry(setNumber, insertAsNeeded);
        if (entryIndex == 0) {
            return -1; // Index does not currently exist in packed array;
        }
        // Work down the levels of non-leaf entries:
        for (let indexShift = this.topLevelShift; indexShift >= LEAF_LEVEL_SHIFT; indexShift -= 4) {
            const nextLevelIsLeaf = indexShift === LEAF_LEVEL_SHIFT;
            // Target is a packedSlotIndicators entry
            const packedSlotIndicators = this.getPackedSlotIndicators(entryIndex);
            const slotBitNumber = (virtualIndex / pow(2, indexShift)) & 0xf; //(virtualIndex >>> indexShift) & 0xf;
            const slotMask = 1 << slotBitNumber;
            const slotsBelowBitNumber = packedSlotIndicators & (slotMask - 1);
            const slotNumber = bitCount(slotsBelowBitNumber);
            if ((packedSlotIndicators & slotMask) === 0) {
                // The entryIndex slot does not have the contents we want
                if (!insertAsNeeded) {
                    return -1; // Index does not currently exist in packed array;
                }
                // Expand the entry, adding the index to new entry at the proper slot:
                entryIndex = this.expandEntry(entryIndex, entryPointerIndex, slotNumber, slotMask, nextLevelIsLeaf);
            }
            // Next level's entry pointer index is in the appropriate slot in in the entries array in this entry:
            entryPointerIndex =
                entryIndex + NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS + slotNumber;
            entryIndex = this.getIndexAtShortIndex(entryPointerIndex);
        }
        // entryIndex is the long-index of a leaf entry that contains the value byte for the given set
        const byteIndex = (entryIndex << 3) + (virtualIndex & 0x7); // Determine byte index offset within leaf entry
        return byteIndex;
    }
    determineTopLevelShiftForVirtualLength(virtualLength) {
        const sizeMagnitude = ceil(log2(virtualLength));
        const eightsSizeMagnitude = sizeMagnitude - 3;
        let multipleOfFourSizeMagnitude = ceil(eightsSizeMagnitude / 4) * 4;
        multipleOfFourSizeMagnitude = max(multipleOfFourSizeMagnitude, 8);
        const topLevelShiftNeeded = multipleOfFourSizeMagnitude - 4 + 3;
        return topLevelShiftNeeded;
    }
    setVirtualLength(virtualLength) {
        if (!this.isPacked) {
            throw new Error("Should never be adjusting the virtual size of a non-packed context");
        }
        this.topLevelShift = this.determineTopLevelShiftForVirtualLength(virtualLength);
        this.virtualLength = virtualLength;
    }
    getTopLevelShift() {
        return this.topLevelShift;
    }
    //
    //  ##     ##         ########   #######  ########  ##     ## ##          ###    ######## ########
    //   ##   ##          ##     ## ##     ## ##     ## ##     ## ##         ## ##      ##    ##
    //    ## ##           ##     ## ##     ## ##     ## ##     ## ##        ##   ##     ##    ##
    //     ###    ####### ########  ##     ## ########  ##     ## ##       ##     ##    ##    ######
    //    ## ##           ##        ##     ## ##        ##     ## ##       #########    ##    ##
    //   ##   ##          ##        ##     ## ##        ##     ## ##       ##     ##    ##    ##
    //  ##     ##         ##         #######  ##         #######  ######## ##     ##    ##    ########
    //
    resizeArray(newLength) {
        const tmp = new Uint8Array(newLength * 8);
        tmp.set(this.byteArray);
        this.array = tmp.buffer;
        this.initArrayViews(this.array);
        this.physicalLength = newLength;
    }
    populateEquivalentEntriesWithEntriesFromOther(other) {
        if (this.virtualLength < other.getVirtualLength()) {
            throw new Error("Cannot populate array of smaller virtual length");
        }
        for (let i = 0; i < NUMBER_OF_SETS; i++) {
            const otherEntryIndex = other.getAtShortIndex(SET_0_START_INDEX + i);
            if (otherEntryIndex == 0)
                continue; // No tree to duplicate
            let entryIndexPointer = SET_0_START_INDEX + i;
            for (let i = this.topLevelShift; i > other.topLevelShift; i -= 4) {
                // for each inserted level:
                // Allocate entry in other:
                const sizeOfEntry = NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS + 1;
                const newEntryIndex = this.newEntry(sizeOfEntry);
                // Link new level in.
                this.setAtShortIndex(entryIndexPointer, newEntryIndex);
                // Populate new level entry, use pointer to slot 0 as place to populate under:
                this.setPackedSlotIndicators(newEntryIndex, 0x1); // Slot 0 populated
                entryIndexPointer =
                    newEntryIndex + NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS; // Where the slot 0 index goes.
            }
            this.copyEntriesAtLevelFromOther(other, otherEntryIndex, entryIndexPointer, other.topLevelShift);
        }
    }
    copyEntriesAtLevelFromOther(other, otherLevelEntryIndex, levelEntryIndexPointer, otherIndexShift) {
        const nextLevelIsLeaf = otherIndexShift == LEAF_LEVEL_SHIFT;
        const packedSlotIndicators = other.getPackedSlotIndicators(otherLevelEntryIndex);
        const numberOfSlots = bitCount(packedSlotIndicators);
        const sizeOfEntry = NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS + numberOfSlots;
        const entryIndex = this.newEntry(sizeOfEntry);
        this.setAtShortIndex(levelEntryIndexPointer, entryIndex);
        this.setAtShortIndex(entryIndex + NON_LEAF_ENTRY_SLOT_INDICATORS_OFFSET, packedSlotIndicators);
        for (let i = 0; i < numberOfSlots; i++) {
            if (nextLevelIsLeaf) {
                // Make leaf in other:
                const leafEntryIndex = this.newLeafEntry();
                this.setIndexAtEntrySlot(entryIndex, i, leafEntryIndex);
                // OPTIM
                // avoid iteration on all the values of the source ctx
                const otherNextLevelEntryIndex = other.getIndexAtEntrySlot(otherLevelEntryIndex, i);
                this.longArray[leafEntryIndex] =
                    other.longArray[otherNextLevelEntryIndex];
            }
            else {
                const otherNextLevelEntryIndex = other.getIndexAtEntrySlot(otherLevelEntryIndex, i);
                this.copyEntriesAtLevelFromOther(other, otherNextLevelEntryIndex, entryIndex + NON_LEAF_ENTRY_HEADER_SIZE_IN_SHORTS + i, otherIndexShift - 4);
            }
        }
    }
    getAtUnpackedIndex(index) {
        return this.longArray[index];
    }
    setAtUnpackedIndex(index, newValue) {
        this.longArray[index] = newValue;
    }
    lazysetAtUnpackedIndex(index, newValue) {
        this.longArray[index] = newValue;
    }
    incrementAndGetAtUnpackedIndex(index) {
        this.longArray[index]++;
        return this.longArray[index];
    }
    addAndGetAtUnpackedIndex(index, valueToAdd) {
        this.longArray[index] += valueToAdd;
        return this.longArray[index];
    }
    //
    //   ########  #######           ######  ######## ########  #### ##    ##  ######
    //      ##    ##     ##         ##    ##    ##    ##     ##  ##  ###   ## ##    ##
    //      ##    ##     ##         ##          ##    ##     ##  ##  ####  ## ##
    //      ##    ##     ## #######  ######     ##    ########   ##  ## ## ## ##   ####
    //      ##    ##     ##               ##    ##    ##   ##    ##  ##  #### ##    ##
    //      ##    ##     ##         ##    ##    ##    ##    ##   ##  ##   ### ##    ##
    //      ##     #######           ######     ##    ##     ## #### ##    ##  ######
    //
    nonLeafEntryToString(entryIndex, indexShift, indentLevel) {
        let output = "";
        for (let i = 0; i < indentLevel; i++) {
            output += "  ";
        }
        try {
            const packedSlotIndicators = this.getPackedSlotIndicators(entryIndex);
            output += `slotIndiators: 0x${toHex(packedSlotIndicators)}, prevVersionIndex: 0: [ `;
            const numberOfslotsInEntry = bitCount(packedSlotIndicators);
            for (let i = 0; i < numberOfslotsInEntry; i++) {
                output += this.getIndexAtEntrySlot(entryIndex, i);
                if (i < numberOfslotsInEntry - 1) {
                    output += ", ";
                }
            }
            output += ` ] (indexShift = ${indexShift})\n`;
            const nextLevelIsLeaf = indexShift == LEAF_LEVEL_SHIFT;
            for (let i = 0; i < numberOfslotsInEntry; i++) {
                const nextLevelEntryIndex = this.getIndexAtEntrySlot(entryIndex, i);
                if (nextLevelIsLeaf) {
                    output += this.leafEntryToString(nextLevelEntryIndex, indentLevel + 4);
                }
                else {
                    output += this.nonLeafEntryToString(nextLevelEntryIndex, indexShift - 4, indentLevel + 4);
                }
            }
        }
        catch (ex) {
            output += `Exception thrown at nonLeafEnty at index ${entryIndex} with indexShift ${indexShift}\n`;
        }
        return output;
    }
    leafEntryToString(entryIndex, indentLevel) {
        let output = "";
        for (let i = 0; i < indentLevel; i++) {
            output += "  ";
        }
        try {
            output += "Leaf bytes : ";
            for (let i = 0; i < 8; i++) {
                output += `0x${toHex(this.byteArray[entryIndex * 8 + i])} `;
            }
            output += "\n";
        }
        catch (ex) {
            output += `Exception thrown at leafEnty at index ${entryIndex}\n`;
        }
        return output;
    }
    toString() {
        let output = "PackedArrayContext:\n";
        if (!this.isPacked) {
            return output + "Context is unpacked:\n"; // unpackedToString();
        }
        for (let setNumber = 0; setNumber < NUMBER_OF_SETS; setNumber++) {
            try {
                const entryPointerIndex = SET_0_START_INDEX + setNumber;
                const entryIndex = this.getIndexAtShortIndex(entryPointerIndex);
                output += `Set ${setNumber}: root = ${entryIndex} \n`;
                if (entryIndex == 0)
                    continue;
                output += this.nonLeafEntryToString(entryIndex, this.topLevelShift, 4);
            }
            catch (ex) {
                output += `Exception thrown in set ${setNumber}%d\n`;
            }
        }
        //output += recordedValuesToString();
        return output;
    }
}
exports.PackedArrayContext = PackedArrayContext;
const toHex = (n) => {
    return Number(n)
        .toString(16)
        .padStart(2, "0");
};
//# sourceMappingURL=PackedArrayContext.js.map