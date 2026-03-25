import { $mobx, IEnhancer, IListenable, Lambda, IInterceptable, IInterceptor, IAtom } from "../internal";
export type IObservableSetInitialValues<T> = Set<T> | readonly T[];
export type ISetDidChange<T = any> = {
    object: ObservableSet<T>;
    observableKind: "set";
    debugObjectName: string;
    type: "add";
    newValue: T;
} | {
    object: ObservableSet<T>;
    observableKind: "set";
    debugObjectName: string;
    type: "delete";
    oldValue: T;
};
export type ISetWillChange<T = any> = {
    type: "delete";
    object: ObservableSet<T>;
    oldValue: T;
} | {
    type: "add";
    object: ObservableSet<T>;
    newValue: T;
};
export declare class ObservableSet<T = any> implements Set<T>, IInterceptable<ISetWillChange>, IListenable {
    name_: string;
    [$mobx]: {};
    private data_;
    atom_: IAtom;
    changeListeners_: any;
    interceptors_: any;
    dehancer: any;
    enhancer_: (newV: any, oldV: any | undefined) => any;
    constructor(initialData?: IObservableSetInitialValues<T>, enhancer?: IEnhancer<T>, name_?: string);
    private dehanceValue_;
    clear(): void;
    forEach(callbackFn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;
    get size(): number;
    add(value: T): this;
    delete(value: T): boolean;
    has(value: T): boolean;
    entries(): IterableIterator<[T, T]>;
    keys(): IterableIterator<T>;
    values(): IterableIterator<T>;
    replace(other: ObservableSet<T> | IObservableSetInitialValues<T>): ObservableSet<T>;
    observe_(listener: (changes: ISetDidChange<T>) => void, fireImmediately?: boolean): Lambda;
    intercept_(handler: IInterceptor<ISetWillChange<T>>): Lambda;
    toJSON(): T[];
    toString(): string;
    [Symbol.iterator](): IterableIterator<T>;
    get [Symbol.toStringTag](): string;
}
export declare var isObservableSet: (thing: any) => thing is ObservableSet<any>;
