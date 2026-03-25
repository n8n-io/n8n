export declare function pickBy<T extends {
    [s: string]: T[keyof T];
} | ArrayLike<T[keyof T]>>(obj: T, fn: (i: T[keyof T]) => boolean): Partial<T>;
export declare function compact<T>(a: (T | undefined)[]): T[];
export declare function uniqBy<T>(arr: T[], fn: (cur: T) => any): T[];
export declare function last<T>(arr?: T[]): T | undefined;
type SortTypes = boolean | number | string | undefined;
export declare function sortBy<T>(arr: T[], fn: (i: T) => SortTypes | SortTypes[]): T[];
export declare function castArray<T>(input?: T | T[]): T[];
export declare function isProd(): boolean;
export declare function maxBy<T>(arr: T[], fn: (i: T) => number): T | undefined;
export declare function sumBy<T>(arr: T[], fn: (i: T) => number): number;
export declare function capitalize(s: string): string;
export declare function isTruthy(input: string): boolean;
export declare function isNotFalsy(input: string): boolean;
export declare function uniq<T>(arr: T[]): T[];
export declare function mapValues<T extends Record<string, any>, TResult>(obj: {
    [P in keyof T]: T[P];
}, fn: (i: T[keyof T], k: keyof T) => TResult): {
    [P in keyof T]: TResult;
};
export declare function mergeNestedObjects(objs: Record<string, any>[], path: string): Record<string, any>;
export {};
