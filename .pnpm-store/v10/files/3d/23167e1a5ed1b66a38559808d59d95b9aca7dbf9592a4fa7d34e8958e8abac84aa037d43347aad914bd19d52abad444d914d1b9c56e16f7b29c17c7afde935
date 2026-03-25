export declare class Yallist<T = unknown> {
    tail?: Node<T>;
    head?: Node<T>;
    length: number;
    static create<T = unknown>(list?: Iterable<T>): Yallist<T>;
    constructor(list?: Iterable<T>);
    [Symbol.iterator](): Generator<T, void, unknown>;
    removeNode(node: Node<T>): Node<T> | undefined;
    unshiftNode(node: Node<T>): void;
    pushNode(node: Node<T>): void;
    push(...args: T[]): number;
    unshift(...args: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    forEach(fn: (value: T, i: number, list: Yallist<T>) => any, thisp?: any): void;
    forEachReverse(fn: (value: T, i: number, list: Yallist<T>) => any, thisp?: any): void;
    get(n: number): T | undefined;
    getReverse(n: number): T | undefined;
    map<R = any>(fn: (value: T, list: Yallist<T>) => R, thisp?: any): Yallist<R>;
    mapReverse<R = any>(fn: (value: T, list: Yallist<T>) => R, thisp?: any): Yallist<R>;
    reduce(fn: (left: T, right: T, i: number) => T): T;
    reduce<R = any>(fn: (acc: R, next: T, i: number) => R, initial: R): R;
    reduceReverse(fn: (left: T, right: T, i: number) => T): T;
    reduceReverse<R = any>(fn: (acc: R, next: T, i: number) => R, initial: R): R;
    toArray(): any[];
    toArrayReverse(): any[];
    slice(from?: number, to?: number): Yallist<unknown>;
    sliceReverse(from?: number, to?: number): Yallist<unknown>;
    splice(start: number, deleteCount?: number, ...nodes: T[]): T[];
    reverse(): this;
}
export declare class Node<T = unknown> {
    list?: Yallist<T>;
    next?: Node<T>;
    prev?: Node<T>;
    value: T;
    constructor(value: T, prev?: Node<T> | undefined, next?: Node<T> | undefined, list?: Yallist<T> | undefined);
}
//# sourceMappingURL=index.d.ts.map