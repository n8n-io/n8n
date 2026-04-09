/**
 * Deeply merges two objects together.
 * - Properties from the `overrides` object override those in the `base` object with the same key.
 * - For nested objects, the merge is performed recursively (deep merge).
 * - Arrays are replaced, not merged.
 * - Primitive values are replaced.
 * - If both `base` and `overrides` are undefined, returns undefined.
 * - If one of `base` or `overrides` is undefined, returns the other.
 *
 * @param base The target object to merge into
 * @param overrides The source object to merge from
 * @returns A new object with the merged properties, or undefined if both inputs are undefined
 */
export function mergeObjects<T extends object, U extends object>(
  base: T | undefined,
  overrides: U | undefined,
): (T & U) | T | U | undefined {
  // If both inputs are undefined, return undefined
  if (base === undefined && overrides === undefined) {
    return undefined;
  }

  // If target is undefined, return source
  if (base === undefined) {
    return overrides;
  }

  // If source is undefined, return target
  if (overrides === undefined) {
    return base;
  }

  // Create a new object to avoid mutating the inputs
  const result = { ...base } as T & U;

  // Iterate through all keys in the source object
  for (const key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      const overridesValue = overrides[key];

      // Skip if the overrides value is undefined
      if (overridesValue === undefined) continue;

      // Get the base value if it exists
      const baseValue =
        key in base ? base[key as unknown as keyof T] : undefined;

      // Check if both values are objects that can be deeply merged
      const isSourceObject =
        overridesValue !== null &&
        typeof overridesValue === 'object' &&
        !Array.isArray(overridesValue) &&
        !(overridesValue instanceof Date) &&
        !(overridesValue instanceof RegExp);

      const isTargetObject =
        baseValue !== null &&
        baseValue !== undefined &&
        typeof baseValue === 'object' &&
        !Array.isArray(baseValue) &&
        !(baseValue instanceof Date) &&
        !(baseValue instanceof RegExp);

      // If both values are mergeable objects, merge them recursively
      if (isSourceObject && isTargetObject) {
        result[key as keyof (T & U)] = mergeObjects(
          baseValue as object,
          overridesValue as object,
        ) as any;
      } else {
        // For primitives, arrays, or when one value is not a mergeable object,
        // simply override with the source value
        result[key as keyof (T & U)] = overridesValue as any;
      }
    }
  }

  return result;
}
