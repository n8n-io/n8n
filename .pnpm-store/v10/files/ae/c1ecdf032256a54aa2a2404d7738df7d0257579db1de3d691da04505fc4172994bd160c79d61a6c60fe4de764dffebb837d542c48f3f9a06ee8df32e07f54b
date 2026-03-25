/**
 * Compares two objects, returns true if identical
 *
 * Reference object contains keys
 */
declare function compareObjects<T extends Record<string, unknown>>(obj1: T, obj2: T, ref?: T): boolean;
/**
 * Unmerge objects, removing items that match in both objects
 */
declare function unmergeObjects<T extends Record<string, unknown>>(obj1: T, obj2: T): T;
/**
 * Get common properties in 2 objects
 */
declare function commonObjectProps<T extends Record<string, unknown>>(item: unknown, reference: T): Partial<T>;

export { commonObjectProps, compareObjects, unmergeObjects };
