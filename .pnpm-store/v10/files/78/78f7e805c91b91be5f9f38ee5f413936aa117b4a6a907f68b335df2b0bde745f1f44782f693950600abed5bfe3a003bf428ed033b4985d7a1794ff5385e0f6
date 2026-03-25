// @ts-check
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Offsets", {
    enumerable: true,
    get: function() {
        return Offsets;
    }
});
const _bigSign = /*#__PURE__*/ _interop_require_default(require("../util/bigSign"));
const _remapbitfield = require("./remap-bitfield.js");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
class Offsets {
    constructor(){
        /**
     * Offsets for the next rule in a given layer
     *
     * @type {Record<Layer, bigint>}
     */ this.offsets = {
            defaults: 0n,
            base: 0n,
            components: 0n,
            utilities: 0n,
            variants: 0n,
            user: 0n
        };
        /**
     * Positions for a given layer
     *
     * @type {Record<Layer, bigint>}
     */ this.layerPositions = {
            defaults: 0n,
            base: 1n,
            components: 2n,
            utilities: 3n,
            // There isn't technically a "user" layer, but we need to give it a position
            // Because it's used for ordering user-css from @apply
            user: 4n,
            variants: 5n
        };
        /**
     * The total number of functions currently registered across all variants (including arbitrary variants)
     *
     * @type {bigint}
     */ this.reservedVariantBits = 0n;
        /**
     * Positions for a given variant
     *
     * @type {Map<string, bigint>}
     */ this.variantOffsets = new Map();
    }
    /**
   * @param {Layer} layer
   * @returns {RuleOffset}
   */ create(layer) {
        return {
            layer,
            parentLayer: layer,
            arbitrary: 0n,
            variants: 0n,
            parallelIndex: 0n,
            index: this.offsets[layer]++,
            propertyOffset: 0n,
            property: "",
            options: []
        };
    }
    /**
   * @param {string} name
   * @returns {RuleOffset}
   */ arbitraryProperty(name) {
        return {
            ...this.create("utilities"),
            arbitrary: 1n,
            property: name
        };
    }
    /**
   * Get the offset for a variant
   *
   * @param {string} variant
   * @param {number} index
   * @returns {RuleOffset}
   */ forVariant(variant, index = 0) {
        let offset = this.variantOffsets.get(variant);
        if (offset === undefined) {
            throw new Error(`Cannot find offset for unknown variant ${variant}`);
        }
        return {
            ...this.create("variants"),
            variants: offset << BigInt(index)
        };
    }
    /**
   * @param {RuleOffset} rule
   * @param {RuleOffset} variant
   * @param {VariantOption} options
   * @returns {RuleOffset}
   */ applyVariantOffset(rule, variant, options) {
        options.variant = variant.variants;
        return {
            ...rule,
            layer: "variants",
            parentLayer: rule.layer === "variants" ? rule.parentLayer : rule.layer,
            variants: rule.variants | variant.variants,
            options: options.sort ? [].concat(options, rule.options) : rule.options,
            // TODO: Technically this is wrong. We should be handling parallel index on a per variant basis.
            // We'll take the max of all the parallel indexes for now.
            // @ts-ignore
            parallelIndex: max([
                rule.parallelIndex,
                variant.parallelIndex
            ])
        };
    }
    /**
   * @param {RuleOffset} offset
   * @param {number} parallelIndex
   * @returns {RuleOffset}
   */ applyParallelOffset(offset, parallelIndex) {
        return {
            ...offset,
            parallelIndex: BigInt(parallelIndex)
        };
    }
    /**
   * Each variant gets 1 bit per function / rule registered.
   * This is because multiple variants can be applied to a single rule and we need to know which ones are present and which ones are not.
   * Additionally, every unique group of variants is grouped together in the stylesheet.
   *
   * This grouping is order-independent. For instance, we do not differentiate between `hover:focus` and `focus:hover`.
   *
   * @param {string[]} variants
   * @param {(name: string) => number} getLength
   */ recordVariants(variants, getLength) {
        for (let variant of variants){
            this.recordVariant(variant, getLength(variant));
        }
    }
    /**
   * The same as `recordVariants` but for a single arbitrary variant at runtime.
   * @param {string} variant
   * @param {number} fnCount
   *
   * @returns {RuleOffset} The highest offset for this variant
   */ recordVariant(variant, fnCount = 1) {
        this.variantOffsets.set(variant, 1n << this.reservedVariantBits);
        // Ensure space is reserved for each "function" in the parallel variant
        // by offsetting the next variant by the number of parallel variants
        // in the one we just added.
        // Single functions that return parallel variants are NOT handled separately here
        // They're offset by 1 (or the number of functions) as usual
        // And each rule returned is tracked separately since the functions are evaluated lazily.
        // @see `RuleOffset.parallelIndex`
        this.reservedVariantBits += BigInt(fnCount);
        return {
            ...this.create("variants"),
            variants: this.variantOffsets.get(variant)
        };
    }
    /**
   * @param {RuleOffset} a
   * @param {RuleOffset} b
   * @returns {bigint}
   */ compare(a, b) {
        // Sort layers together
        if (a.layer !== b.layer) {
            return this.layerPositions[a.layer] - this.layerPositions[b.layer];
        }
        // When sorting the `variants` layer, we need to sort based on the parent layer as well within
        // this variants layer.
        if (a.parentLayer !== b.parentLayer) {
            return this.layerPositions[a.parentLayer] - this.layerPositions[b.parentLayer];
        }
        // Sort based on the sorting function
        for (let aOptions of a.options){
            for (let bOptions of b.options){
                if (aOptions.id !== bOptions.id) continue;
                if (!aOptions.sort || !bOptions.sort) continue;
                var _max;
                let maxFnVariant = (_max = max([
                    aOptions.variant,
                    bOptions.variant
                ])) !== null && _max !== void 0 ? _max : 0n;
                // Create a mask of 0s from bits 1..N where N represents the mask of the Nth bit
                let mask = ~(maxFnVariant | maxFnVariant - 1n);
                let aVariantsAfterFn = a.variants & mask;
                let bVariantsAfterFn = b.variants & mask;
                // If the variants the same, we _can_ sort them
                if (aVariantsAfterFn !== bVariantsAfterFn) {
                    continue;
                }
                let result = aOptions.sort({
                    value: aOptions.value,
                    modifier: aOptions.modifier
                }, {
                    value: bOptions.value,
                    modifier: bOptions.modifier
                });
                if (result !== 0) return result;
            }
        }
        // Sort variants in the order they were registered
        if (a.variants !== b.variants) {
            return a.variants - b.variants;
        }
        // Make sure each rule returned by a parallel variant is sorted in ascending order
        if (a.parallelIndex !== b.parallelIndex) {
            return a.parallelIndex - b.parallelIndex;
        }
        // Always sort arbitrary properties after other utilities
        if (a.arbitrary !== b.arbitrary) {
            return a.arbitrary - b.arbitrary;
        }
        // Always sort arbitrary properties alphabetically
        if (a.propertyOffset !== b.propertyOffset) {
            return a.propertyOffset - b.propertyOffset;
        }
        // Sort utilities, components, etc… in the order they were registered
        return a.index - b.index;
    }
    /**
   * Arbitrary variants are recorded in the order they're encountered.
   * This means that the order is not stable between environments and sets of content files.
   *
   * In order to make the order stable, we need to remap the arbitrary variant offsets to
   * be in alphabetical order starting from the offset of the first arbitrary variant.
   */ recalculateVariantOffsets() {
        // Sort the variants by their name
        let variants = Array.from(this.variantOffsets.entries()).filter(([v])=>v.startsWith("[")).sort(([a], [z])=>fastCompare(a, z));
        // Sort the list of offsets
        // This is not necessarily a discrete range of numbers which is why
        // we're using sort instead of creating a range from min/max
        let newOffsets = variants.map(([, offset])=>offset).sort((a, z)=>(0, _bigSign.default)(a - z));
        // Create a map from the old offsets to the new offsets in the new sort order
        /** @type {[bigint, bigint][]} */ let mapping = variants.map(([, oldOffset], i)=>[
                oldOffset,
                newOffsets[i]
            ]);
        // Remove any variants that will not move letting us skip
        // remapping if everything happens to be in order
        return mapping.filter(([a, z])=>a !== z);
    }
    /**
   * @template T
   * @param {[RuleOffset, T][]} list
   * @returns {[RuleOffset, T][]}
   */ remapArbitraryVariantOffsets(list) {
        let mapping = this.recalculateVariantOffsets();
        // No arbitrary variants? Nothing to do.
        // Everyhing already in order? Nothing to do.
        if (mapping.length === 0) {
            return list;
        }
        // Remap every variant offset in the list
        return list.map((item)=>{
            let [offset, rule] = item;
            offset = {
                ...offset,
                variants: (0, _remapbitfield.remapBitfield)(offset.variants, mapping)
            };
            return [
                offset,
                rule
            ];
        });
    }
    /**
   * @template T
   * @param {[RuleOffset, T][]} list
   * @returns {[RuleOffset, T][]}
   */ sortArbitraryProperties(list) {
        // Collect all known arbitrary properties
        let known = new Set();
        for (let [offset] of list){
            if (offset.arbitrary === 1n) {
                known.add(offset.property);
            }
        }
        // No arbitrary properties? Nothing to do.
        if (known.size === 0) {
            return list;
        }
        // Sort the properties alphabetically
        let properties = Array.from(known).sort();
        // Create a map from the property name to its offset
        let offsets = new Map();
        let offset = 1n;
        for (let property of properties){
            offsets.set(property, offset++);
        }
        // Apply the sorted offsets to the list
        return list.map((item)=>{
            let [offset, rule] = item;
            var _offsets_get;
            offset = {
                ...offset,
                propertyOffset: (_offsets_get = offsets.get(offset.property)) !== null && _offsets_get !== void 0 ? _offsets_get : 0n
            };
            return [
                offset,
                rule
            ];
        });
    }
    /**
   * @template T
   * @param {[RuleOffset, T][]} list
   * @returns {[RuleOffset, T][]}
   */ sort(list) {
        // Sort arbitrary variants so they're in alphabetical order
        list = this.remapArbitraryVariantOffsets(list);
        // Sort arbitrary properties so they're in alphabetical order
        list = this.sortArbitraryProperties(list);
        return list.sort(([a], [b])=>(0, _bigSign.default)(this.compare(a, b)));
    }
}
/**
 *
 * @param {bigint[]} nums
 * @returns {bigint|null}
 */ function max(nums) {
    let max = null;
    for (const num of nums){
        max = max !== null && max !== void 0 ? max : num;
        max = max > num ? max : num;
    }
    return max;
}
/**
 * A fast ASCII order string comparison function.
 *
 * Using `.sort()` without a custom compare function is faster
 * But you can only use that if you're sorting an array of
 * only strings. If you're sorting strings inside objects
 * or arrays, you need must use a custom compare function.
 *
 * @param {string} a
 * @param {string} b
 */ function fastCompare(a, b) {
    let aLen = a.length;
    let bLen = b.length;
    let minLen = aLen < bLen ? aLen : bLen;
    for(let i = 0; i < minLen; i++){
        let cmp = a.charCodeAt(i) - b.charCodeAt(i);
        if (cmp !== 0) return cmp;
    }
    return aLen - bLen;
}
