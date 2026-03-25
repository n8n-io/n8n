import { ObjectLiteral } from "../common/ObjectLiteral";
export declare class OrmUtils {
    /**
     * Chunks array into pieces.
     */
    static chunk<T>(array: T[], size: number): T[][];
    static splitClassesAndStrings<T>(classesAndStrings: (string | T)[]): [T[], string[]];
    static groupBy<T, R>(array: T[], propertyCallback: (item: T) => R): {
        id: R;
        items: T[];
    }[];
    static uniq<T>(array: T[], criteria?: (item: T) => any): T[];
    static uniq<T, K extends keyof T>(array: T[], property: K): T[];
    private static isPlainObject;
    private static mergeArrayKey;
    private static mergeObjectKey;
    private static merge;
    /**
     * Deep Object.assign.
     */
    static mergeDeep(target: any, ...sources: any[]): any;
    /**
     * Deep compare objects.
     *
     * @see http://stackoverflow.com/a/1144249
     */
    static deepCompare(...args: any[]): boolean;
    /**
     * Gets deeper value of object.
     */
    static deepValue(obj: ObjectLiteral, path: string): ObjectLiteral;
    static replaceEmptyObjectsWithBooleans(obj: any): void;
    static propertyPathsToTruthyObject(paths: string[]): any;
    /**
     * Check if two entity-id-maps are the same
     */
    static compareIds(firstId: ObjectLiteral | undefined, secondId: ObjectLiteral | undefined): boolean;
    /**
     * Transforms given value into boolean value.
     */
    static toBoolean(value: any): boolean;
    /**
     * Composes an object from the given array of keys and values.
     */
    static zipObject(keys: any[], values: any[]): ObjectLiteral;
    /**
     * Compares two arrays.
     */
    static isArraysEqual(arr1: any[], arr2: any[]): boolean;
    static areMutuallyExclusive<T>(...lists: T[][]): boolean;
    /**
     * Parses the CHECK constraint on the specified column and returns
     * all values allowed by the constraint or undefined if the constraint
     * is not present.
     */
    static parseSqlCheckExpression(sql: string, columnName: string): string[] | undefined;
    private static compare2Objects;
}
