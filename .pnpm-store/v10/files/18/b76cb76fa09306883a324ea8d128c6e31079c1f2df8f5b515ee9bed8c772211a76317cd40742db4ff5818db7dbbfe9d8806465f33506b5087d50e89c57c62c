export function create(): {
    [x: string]: any;
};
export function isObject(o: any): o is {
    [k: string]: any;
};
/**
 * Object.assign
 */
export const assign: {
    <T extends {}, U>(target: T, source: U): T & U;
    <T extends {}, U, V_1>(target: T, source1: U, source2: V_1): T & U & V_1;
    <T extends {}, U, V_1, W>(target: T, source1: U, source2: V_1, source3: W): T & U & V_1 & W;
    (target: object, ...sources: any[]): any;
};
/**
 * @param {Object<string,any>} obj
 */
export const keys: {
    (o: object): string[];
    (o: {}): string[];
};
/**
 * @template V
 * @param {{[key:string]: V}} obj
 * @return {Array<V>}
 */
export const values: {
    <T>(o: {
        [s: string]: T;
    } | ArrayLike<T>): T[];
    (o: {}): any[];
};
export function forEach<V_1>(obj: {
    [k: string]: V_1;
}, f: (arg0: V_1, arg1: string) => any): void;
export function map<R>(obj: {
    [x: string]: any;
}, f: (arg0: any, arg1: string) => R): Array<R>;
export function length(obj: {
    [x: string]: any;
}): number;
export function size(obj: {
    [x: string]: any;
}): number;
export function some<T extends {
    [key: string | number | symbol]: any;
}>(obj: T, f: (v: T[keyof T], k: keyof T) => boolean): boolean;
export function isEmpty(obj: Object | null | undefined): boolean;
export function every<T extends {
    [key: string | number | symbol]: any;
}>(obj: T, f: (v: T[keyof T], k: keyof T) => boolean): boolean;
export function hasProperty(obj: any, key: string | number | symbol): boolean;
export function equalFlat(a: {
    [x: string]: any;
}, b: {
    [x: string]: any;
}): boolean;
/**
 * Make an object immutable. This hurts performance and is usually not needed if you perform good
 * coding practices.
 */
export const freeze: {
    <T extends Function>(f: T): T;
    <T extends {
        [idx: string]: U | null | undefined | object;
    }, U extends string | bigint | number | boolean | symbol>(o: T): Readonly<T>;
    <T>(o: T): Readonly<T>;
};
export function deepFreeze<T extends unknown>(o: T): Readonly<T>;
export function setIfUndefined<KV extends object, K extends keyof KV = keyof KV>(o: KV, key: K, createT: () => KV[K]): KV[K];
//# sourceMappingURL=object.d.ts.map