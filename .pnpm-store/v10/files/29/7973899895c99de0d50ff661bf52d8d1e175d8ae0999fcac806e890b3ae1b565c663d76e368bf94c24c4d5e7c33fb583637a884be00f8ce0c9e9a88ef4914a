"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackedArray = void 0;
/*
 * This is a TypeScript port of the original Java version, which was written by
 * Gil Tene as described in
 * https://github.com/HdrHistogram/HdrHistogram
 * and released to the public domain, as explained at
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
const PackedArrayContext_1 = require("./PackedArrayContext");
const NUMBER_OF_SETS = 8;
const { pow, floor } = Math;
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
class PackedArray {
    constructor(virtualLength, initialPhysicalLength = PackedArrayContext_1.MINIMUM_INITIAL_PACKED_ARRAY_CAPACITY) {
        this.arrayContext = new PackedArrayContext_1.PackedArrayContext(virtualLength, initialPhysicalLength);
    }
    setVirtualLength(newVirtualArrayLength) {
        if (newVirtualArrayLength < this.length()) {
            throw new Error("Cannot set virtual length, as requested length " +
                newVirtualArrayLength +
                " is smaller than the current virtual length " +
                this.length());
        }
        const currentArrayContext = this.arrayContext;
        if (currentArrayContext.isPacked &&
            currentArrayContext.determineTopLevelShiftForVirtualLength(newVirtualArrayLength) == currentArrayContext.getTopLevelShift()) {
            // No changes to the array context contents is needed. Just change the virtual length.
            currentArrayContext.setVirtualLength(newVirtualArrayLength);
            return;
        }
        this.arrayContext = currentArrayContext.copyAndIncreaseSize(this.getPhysicalLength(), newVirtualArrayLength);
    }
    /**
     * Get value at virtual index in the array
     * @param index the virtual array index
     * @return the array value at the virtual index given
     */
    get(index) {
        let value = 0;
        for (let byteNum = 0; byteNum < NUMBER_OF_SETS; byteNum++) {
            let byteValueAtPackedIndex = 0;
            // Deal with unpacked context:
            if (!this.arrayContext.isPacked) {
                return this.arrayContext.getAtUnpackedIndex(index);
            }
            // Context is packed:
            const packedIndex = this.arrayContext.getPackedIndex(byteNum, index, false);
            if (packedIndex < 0) {
                return value;
            }
            byteValueAtPackedIndex =
                this.arrayContext.getAtByteIndex(packedIndex) * pow(2, byteNum << 3);
            value += byteValueAtPackedIndex;
        }
        return value;
    }
    /**
     * Increment value at a virrual index in the array
     * @param index virtual index of value to increment
     */
    increment(index) {
        this.add(index, 1);
    }
    safeGetPackedIndexgetPackedIndex(setNumber, virtualIndex) {
        //do {
        //try {
        return this.arrayContext.getPackedIndex(setNumber, virtualIndex, true);
        /*} catch (ex) {
            if (ex instanceof ResizeError) {
              this.arrayContext.resizeArray(ex.newSize);
            } else {
              throw ex;
            }
          }*/
        //} while (true);
    }
    /**
     * Add to a value at a virtual index in the array
     * @param index the virtual index of the value to be added to
     * @param value the value to add
     */
    add(index, value) {
        let remainingValueToAdd = value;
        for (let byteNum = 0, byteShift = 0; byteNum < NUMBER_OF_SETS; byteNum++, byteShift += 8) {
            // Deal with unpacked context:
            if (!this.arrayContext.isPacked) {
                this.arrayContext.addAndGetAtUnpackedIndex(index, value);
                return;
            }
            // Context is packed:
            const packedIndex = this.safeGetPackedIndexgetPackedIndex(byteNum, index);
            const byteToAdd = remainingValueToAdd & 0xff;
            const afterAddByteValue = this.arrayContext.addAtByteIndex(packedIndex, byteToAdd);
            // Reduce remaining value to add by amount just added:
            remainingValueToAdd -= byteToAdd;
            remainingValueToAdd = remainingValueToAdd / pow(2, 8);
            // Account for carry:
            remainingValueToAdd += floor(afterAddByteValue / pow(2, 8));
            if (remainingValueToAdd == 0) {
                return; // nothing to add to higher magnitudes
            }
        }
    }
    /**
     * Set the value at a virtual index in the array
     * @param index the virtual index of the value to set
     * @param value the value to set
     */
    set(index, value) {
        let bytesAlreadySet = 0;
        let valueForNextLevels = value;
        for (let byteNum = 0; byteNum < NUMBER_OF_SETS; byteNum++) {
            // Establish context within: critical section
            // Deal with unpacked context:
            if (!this.arrayContext.isPacked) {
                this.arrayContext.setAtUnpackedIndex(index, value);
                return;
            }
            // Context is packed:
            if (valueForNextLevels == 0) {
                // Special-case zeros to avoid inflating packed array for no reason
                const packedIndex = this.arrayContext.getPackedIndex(byteNum, index, false);
                if (packedIndex < 0) {
                    return; // no need to create entries for zero values if they don't already exist
                }
            }
            // Make sure byte is populated:
            const packedIndex = this.arrayContext.getPackedIndex(byteNum, index, true);
            // Determine value to write, and prepare for next levels
            const byteToWrite = valueForNextLevels & 0xff;
            valueForNextLevels = floor(valueForNextLevels / pow(2, 8));
            if (byteNum < bytesAlreadySet) {
                // We want to avoid writing to the same byte twice when not doing so for the
                // entire 64 bit value atomically, as doing so opens a race with e.g. concurrent
                // adders. So dobn't actually write the byte if has been written before.
                continue;
            }
            this.arrayContext.setAtByteIndex(packedIndex, byteToWrite);
            bytesAlreadySet++;
        }
    }
    /**
     * Get the current physical length (in longs) of the array's backing storage
     * @return the current physical length (in longs) of the array's current backing storage
     */
    getPhysicalLength() {
        return this.arrayContext.physicalLength;
    }
    /**
     * Get the (virtual) length of the array
     * @return the (virtual) length of the array
     */
    length() {
        return this.arrayContext.getVirtualLength();
    }
    /**
     * Clear the array contents
     */
    clear() {
        this.arrayContext.clear();
    }
    toString() {
        let output = "PackedArray:\n";
        output += this.arrayContext.toString();
        return output;
    }
}
exports.PackedArray = PackedArray;
//# sourceMappingURL=PackedArray.js.map