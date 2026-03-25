interface HashOptions {
    /**
     * Function to determine if a key should be excluded from hashing.
     * @optional
     * @param key - The key to check for exclusion.
     * @returns {boolean} - Returns true to exclude the key from hashing.
     */
    excludeKeys?: ((key: string) => boolean) | undefined;
    /**
     * Specifies whether to exclude values from hashing, so that only the object keys are hashed.
     * @optional
     */
    excludeValues?: boolean | undefined;
    /**
     * Specifies whether to ignore objects of unknown type (not directly serialisable) when hashing.
     * @optional
     * @default false
     */
    ignoreUnknown?: boolean | undefined;
    /**
     * A function that replaces values before they are hashed, which can be used to customise the hashing process.
     * @optional
     * @param value - The current value to be hashed.
     * @returns {any} - The value to use for hashing instead.
     */
    replacer?: ((value: any) => any) | undefined;
    /**
     * Specifies whether the 'name' property of functions should be taken into account when hashing.
     * @optional
     * @default false
     */
    respectFunctionNames?: boolean | undefined;
    /**
     * Specifies whether properties of functions should be taken into account when hashing.
     * @optional
     * @default false
     */
    respectFunctionProperties?: boolean | undefined;
    /**
     * Specifies whether to include type-specific properties such as prototype or constructor in the hash to distinguish between types.
     * @optional
     * @default false
     */
    respectType?: boolean | undefined;
    /**
     * Specifies whether arrays should be sorted before hashing to ensure consistent order.
     * @optional
     * @default false
     */
    unorderedArrays?: boolean | undefined;
    /**
     * Specifies whether Set and Map instances should be sorted by key before hashing to ensure consistent order.
     * @optional
     * @default true
     */
    unorderedObjects?: boolean | undefined;
    /**
     * Specifies whether the elements of `Set' and keys of `Map' should be sorted before hashing to ensure consistent order.
     * @optional
     * @default false
     */
    unorderedSets?: boolean | undefined;
}
/**
 * Serialize any JS value into a stable, hashable string
 * @param {object} object value to hash
 * @param {HashOptions} options hashing options. See {@link HashOptions}.
 * @return {string} serialized value
 * @api public
 */
declare function objectHash(object: any, options?: HashOptions): string;

/**
 * Calculates the difference between two objects and returns a list of differences.
 *
 * @param {any} obj1 - The first object to compare.
 * @param {any} obj2 - The second object to compare.
 * @param {HashOptions} [opts={}] - Configuration options for hashing the objects. See {@link HashOptions}.
 * @returns {DiffEntry[]} An array with the differences between the two objects.
 */
declare function diff(obj1: any, obj2: any, opts?: HashOptions): DiffEntry[];
declare class DiffEntry {
    key: string;
    type: "changed" | "added" | "removed";
    newValue: DiffHashedObject;
    oldValue?: DiffHashedObject | undefined;
    constructor(key: string, type: "changed" | "added" | "removed", newValue: DiffHashedObject, oldValue?: DiffHashedObject | undefined);
    toString(): string;
    toJSON(): string;
}
declare class DiffHashedObject {
    key: string;
    value: any;
    hash?: string | undefined;
    props?: Record<string, DiffHashedObject> | undefined;
    constructor(key: string, value: any, hash?: string | undefined, props?: Record<string, DiffHashedObject> | undefined);
    toString(): string;
    toJSON(): string;
}

/**
 * Compare two objects using reference equality and stable deep hashing.
 * @param {any} object1 First object
 * @param {any} object2 Second object
 * @param {HashOptions} hashOptions. Configuration options for hashing the objects. See {@link HashOptions}.
 * @return {boolean} true if equal and false if not
 * @api public
 */
declare function isEqual(object1: any, object2: any, hashOptions?: HashOptions): boolean;

export { type HashOptions as H, diff as d, isEqual as i, objectHash as o };
