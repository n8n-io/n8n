import { EventEmitter } from 'eventemitter3';
export declare class List<T> extends EventEmitter<{
    update: [];
    add: [T];
}> implements RelativeIndexable<T> {
    readonly [Symbol.toStringTag] = "List";
    constructor(values?: readonly T[] | Iterable<T> | null);
    protected data: Set<T>;
    toSet(): Set<T>;
    toArray(): T[];
    toJSON(): string;
    toString(): string;
    protected _set(index: number, value: T, _delete?: boolean): void;
    set(index: number, value: T): void;
    deleteAt(index: number): void;
    insert(value: T, index?: number): void;
    at(index: number): T;
    pop(): T | undefined;
    push(...items: T[]): number;
    join(separator?: string): string;
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    add(value: T): this;
    clear(): void;
    delete(value: T): boolean;
    has(value: T): boolean;
    get size(): number;
    entries(): IterableIterator<[number, T]>;
    keys(): IterableIterator<number>;
    values(): IterableIterator<T>;
    [Symbol.iterator](): IterableIterator<T>;
}
