import { Atom, IEnhancer, IInterceptable, IEqualsComparer, IInterceptor, IListenable, Lambda } from "../internal";
export interface IValueWillChange<T> {
    object: IObservableValue<T>;
    type: "update";
    newValue: T;
}
export type IValueDidChange<T = any> = {
    type: "update";
    observableKind: "value";
    object: IObservableValue<T>;
    debugObjectName: string;
    newValue: T;
    oldValue: T | undefined;
};
export type IBoxDidChange<T = any> = {
    type: "create";
    observableKind: "value";
    object: IObservableValue<T>;
    debugObjectName: string;
    newValue: T;
} | IValueDidChange<T>;
export interface IObservableValue<T> {
    get(): T;
    set(value: T): void;
}
export declare class ObservableValue<T> extends Atom implements IObservableValue<T>, IInterceptable<IValueWillChange<T>>, IListenable {
    enhancer: IEnhancer<T>;
    name_: string;
    private equals;
    hasUnreportedChange_: boolean;
    interceptors_: any;
    changeListeners_: any;
    value_: any;
    dehancer: any;
    constructor(value: T, enhancer: IEnhancer<T>, name_?: string, notifySpy?: boolean, equals?: IEqualsComparer<any>);
    private dehanceValue;
    set(newValue: T): void;
    private prepareNewValue_;
    setNewValue_(newValue: T): void;
    get(): T;
    intercept_(handler: IInterceptor<IValueWillChange<T>>): Lambda;
    observe_(listener: (change: IValueDidChange<T>) => void, fireImmediately?: boolean): Lambda;
    raw(): any;
    toJSON(): T;
    toString(): string;
    valueOf(): T;
    [Symbol.toPrimitive](): T;
}
export declare const isObservableValue: (x: any) => x is IObservableValue<any>;
