export function simpleDiffString(a: string, b: string): SimpleDiff<string>;
export function simpleDiff(a: string, b: string): SimpleDiff<string>;
export function simpleDiffArray<T>(a: Array<T>, b: Array<T>, compare?: (arg0: T, arg1: T) => boolean): SimpleDiff<Array<T>>;
export function simpleDiffStringWithCursor(a: string, b: string, cursor: number): {
    index: number;
    remove: number;
    insert: string;
};
/**
 * A SimpleDiff describes a change on a String.
 *
 * ```js
 * console.log(a) // the old value
 * console.log(b) // the updated value
 * // Apply changes of diff (pseudocode)
 * a.remove(diff.index, diff.remove) // Remove `diff.remove` characters
 * a.insert(diff.index, diff.insert) // Insert `diff.insert`
 * a === b // values match
 * ```
 */
export type SimpleDiff<T extends string | Array<any>> = {
    /**
     * The index where changes were applied
     */
    index: number;
    /**
     * The number of characters to delete starting
     *        at `index`.
     */
    remove: number;
    /**
     * The new text to insert at `index` after applying
     */
    insert: T;
};
//# sourceMappingURL=diff.d.ts.map