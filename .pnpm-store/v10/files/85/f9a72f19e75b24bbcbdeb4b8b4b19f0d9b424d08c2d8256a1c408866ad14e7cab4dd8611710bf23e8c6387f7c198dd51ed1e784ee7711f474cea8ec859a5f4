interface JSONFlattenOptions {
    key?: string;
    index?: number;
    showComma: boolean;
    length: number;
    type: 'content' | 'objectStart' | 'objectEnd' | 'objectCollapsed' | 'arrayStart' | 'arrayEnd' | 'arrayCollapsed';
}
export declare type JSONDataType = string | number | boolean | unknown[] | Record<string, unknown> | null;
export interface JSONFlattenReturnType extends JSONFlattenOptions {
    content: string | number | null | boolean;
    level: number;
    path: string;
}
export declare function emitError(message: string): void;
export declare function getDataType(value: unknown): string;
export declare function jsonFlatten(data: JSONDataType, path?: string, level?: number, options?: JSONFlattenOptions): JSONFlattenReturnType[];
export declare function arrFlat<T extends unknown[]>(arr: T): unknown[];
export declare function cloneDeep<T extends unknown>(source: T, hash?: WeakMap<object, any>): T;
export declare function stringToAutoType(source: string): unknown;
export {};
