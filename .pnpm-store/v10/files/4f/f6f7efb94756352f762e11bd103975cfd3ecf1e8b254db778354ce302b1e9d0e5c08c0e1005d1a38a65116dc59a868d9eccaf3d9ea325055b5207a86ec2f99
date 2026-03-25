// @ts-check

/**
 * We must remap all the old bits to new bits for each set variant
 * Only arbitrary variants are considered as those are the only
 * ones that need to be re-sorted at this time
 *
 * An iterated process that removes and sets individual bits simultaneously
 * will not work because we may have a new bit that is also a later old bit
 * This means that we would be removing a previously set bit which we don't
 * want to do
 *
 * For example (assume `bN` = `1<<N`)
 * Given the "total" mapping `[[b1, b3], [b2, b4], [b3, b1], [b4, b2]]`
 * The mapping is "total" because:
 * 1. Every input and output is accounted for
 * 2. All combinations are unique
 * 3. No one input maps to multiple outputs and vice versa
 * And, given an offset with all bits set:
 * V = b1 | b2 | b3 | b4
 *
 * Let's explore the issue with removing and setting bits simultaneously:
 * V & ~b1 | b3 = b2 | b3 | b4
 * V & ~b2 | b4 = b3 | b4
 * V & ~b3 | b1 = b1 | b4
 * V & ~b4 | b2 = b1 | b2
 *
 * As you can see, we end up with the wrong result.
 * This is because we're removing a bit that was previously set.
 * And, thus the final result is missing b3 and b4.
 *
 * Now, let's explore the issue with removing the bits first:
 * V & ~b1 = b2 | b3 | b4
 * V & ~b2 = b3 | b4
 * V & ~b3 = b4
 * V & ~b4 = 0
 *
 * And then setting the bits:
 * V | b3 = b3
 * V | b4 = b3 | b4
 * V | b1 = b1 | b3 | b4
 * V | b2 = b1 | b2 | b3 | b4
 *
 * We get the correct result because we're not removing any bits that were
 * previously set thus properly remapping the bits to the new order
 *
 * To collect this into a single operation that can be done simultaneously
 * we must first create a mask for the old bits that are set and a mask for
 * the new bits that are set. Then we can remove the old bits and set the new
 * bits simultaneously in a "single" operation like so:
 * OldMask = b1 | b2 | b3 | b4
 * NewMask = b3 | b4 | b1 | b2
 *
 * So this:
 * V & ~oldMask | newMask
 *
 * Expands to this:
 * V & ~b1 & ~b2 & ~b3 & ~b4 | b3 | b4 | b1 | b2
 *
 * Which becomes this:
 * b1 | b2 | b3 | b4
 *
 * Which is the correct result!
 *
 * @param {bigint} num
 * @param {[bigint, bigint][]} mapping
 */
export function remapBitfield(num, mapping) {
  // Create masks for the old and new bits that are set
  let oldMask = 0n
  let newMask = 0n
  for (let [oldBit, newBit] of mapping) {
    if (num & oldBit) {
      oldMask = oldMask | oldBit
      newMask = newMask | newBit
    }
  }

  // Remove all old bits
  // Set all new bits
  return (num & ~oldMask) | newMask
}
