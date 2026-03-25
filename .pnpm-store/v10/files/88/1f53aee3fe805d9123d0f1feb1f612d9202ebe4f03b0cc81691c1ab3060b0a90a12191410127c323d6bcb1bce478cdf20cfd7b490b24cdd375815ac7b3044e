import { IAtom, IEnhancer, IInterceptable, IInterceptor, IListenable, Lambda } from "../internal";
export declare const UPDATE = "update";
export declare const MAX_SPLICE_SIZE = 10000;
export interface IObservableArray<T = any> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[];
    clear(): T[];
    replace(newItems: T[]): T[];
    remove(value: T): boolean;
    toJSON(): T[];
}
interface IArrayBaseChange<T> {
    object: IObservableArray<T>;
    observableKind: "array";
    debugObjectName: string;
    index: number;
}
export type IArrayDidChange<T = any> = IArrayUpdate<T> | IArraySplice<T>;
export interface IArrayUpdate<T = any> extends IArrayBaseChange<T> {
    type: "update";
    newValue: T;
    oldValue: T;
}
export interface IArraySplice<T = any> extends IArrayBaseChange<T> {
    type: "splice";
    added: T[];
    addedCount: number;
    removed: T[];
    removedCount: number;
}
export interface IArrayWillChange<T = any> {
    object: IObservableArray<T>;
    index: number;
    type: "update";
    newValue: T;
}
export interface IArrayWillSplice<T = any> {
    object: IObservableArray<T>;
    index: number;
    type: "splice";
    added: T[];
    removedCount: number;
}
export declare class ObservableArrayAdministration implements IInterceptable<IArrayWillChange<any> | IArrayWillSplice<any>>, IListenable {
    owned_: boolean;
    legacyMode_: boolean;
    atom_: IAtom;
    readonly values_: any[];
    interceptors_: any;
    changeListeners_: any;
    enhancer_: (newV: any, oldV: any | undefined) => any;
    dehancer: any;
    proxy_: IObservableArray<any>;
    lastKnownLength_: number;
    constructor(name: string | undefined, enhancer: IEnhancer<any>, owned_: boolean, legacyMode_: boolean);
    dehanceValue_(value: any): any;
    dehanceValues_(values: any[]): any[];
    intercept_(handler: IInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>): Lambda;
    observe_(listener: (changeData: IArrayDidChange<any>) => void, fireImmediately?: boolean): Lambda;
    getArrayLength_(): number;
    setArrayLength_(newLength: number): void;
    updateArrayLength_(oldLength: number, delta: number): void;
    spliceWithArray_(index: number, deleteCount?: number, newItems?: any[]): any[];
    spliceItemsIntoValues_(index: number, deleteCount: number, newItems: any[]): any[];
    notifyArrayChildUpdate_(index: number, newValue: any, oldValue: any): void;
    notifyArraySplice_(index: number, added: any[], removed: any[]): void;
    get_(index: number): any | undefined;
    set_(index: number, newValue: any): void;
}
export declare function createObservableArray<T>(initialValues: T[] | undefined, enhancer: IEnhancer<T>, name?: string, owned?: boolean): IObservableArray<T>;
export declare var arrayExtensions: {
    clear(): any[];
    replace(newItems: any[]): any[];
    toJSON(): any[];
    splice(index: number, deleteCount?: number, ...newItems: any[]): any[];
    spliceWithArray(index: number, deleteCount?: number, newItems?: any[]): any[];
    push(...items: any[]): number;
    pop(): any;
    shift(): any;
    unshift(...items: any[]): number;
    reverse(): any[];
    sort(): any[];
    remove(value: any): boolean;
};
export declare function isObservableArray(thing: any): thing is IObservableArray<any>;
export {};
