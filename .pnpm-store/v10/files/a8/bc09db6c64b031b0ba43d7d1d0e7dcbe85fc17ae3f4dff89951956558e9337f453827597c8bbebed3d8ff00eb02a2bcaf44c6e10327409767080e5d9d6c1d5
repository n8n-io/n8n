/**
 * Describes the permissions/modifiers fields can have
 * `R`: readonly
 * `W`: writable
 * `!`: required
 * `?`: optional
 */
export declare type Modx = ['?' | '!', 'W' | 'R'];
/**
 * Describes the depth strategy when modifying types
 */
export declare type Depth = 'flat' | 'deep';
/**
 * Describes the merging strategy
 * `0`: lodash style. Preserves lists, and completes when undefined types
 * `1`: ramda style. Destroys lists, does not complete if undefined types
 * `2`: lodash style. Lists are narrowed down, tuples are not preserved
 * `3`: ramda style. Assumes that we are only working with lists
 */
export declare type MergeStyle = 0 | 1 | 2;
/**
 * Make an object properties (all) `never`. We use this to intersect `object`s and
 * preserve the combine modifiers like `+readonly` and `?optional`.
 */
export declare type Anyfy<O extends object> = {
    [K in keyof O]: any;
};
