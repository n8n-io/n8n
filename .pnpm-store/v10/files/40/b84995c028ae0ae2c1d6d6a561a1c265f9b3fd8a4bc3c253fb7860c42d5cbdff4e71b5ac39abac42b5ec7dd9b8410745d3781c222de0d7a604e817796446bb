import { IEnhancer, IObservableArray } from "../internal";
declare class StubArray {
}
export declare class LegacyObservableArray<T> extends StubArray {
    constructor(initialValues: T[] | undefined, enhancer: IEnhancer<T>, name?: string, owned?: boolean);
    concat(...arrays: T[][]): T[];
    get length(): number;
    set length(newLength: number);
    get [Symbol.toStringTag](): string;
    [Symbol.iterator](): IterableIterator<any>;
}
export declare function reserveArrayBuffer(max: number): void;
export declare function createLegacyArray<T>(initialValues: T[] | undefined, enhancer: IEnhancer<T>, name?: string): IObservableArray<T>;
export {};
