import { IArrayWillChange, IArrayWillSplice, IInterceptor, IMapWillChange, IObjectWillChange, IObservableArray, IObservableValue, IValueWillChange, Lambda, ObservableMap, ObservableSet, ISetWillChange } from "../internal";
export declare function intercept<T>(value: IObservableValue<T>, handler: IInterceptor<IValueWillChange<T>>): Lambda;
export declare function intercept<T>(observableArray: IObservableArray<T> | Array<T>, handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda;
export declare function intercept<K, V>(observableMap: ObservableMap<K, V> | Map<K, V>, handler: IInterceptor<IMapWillChange<K, V>>): Lambda;
export declare function intercept<V>(observableSet: ObservableSet<V> | Set<V>, handler: IInterceptor<ISetWillChange<V>>): Lambda;
export declare function intercept<K, V>(observableMap: ObservableMap<K, V> | Map<K, V>, property: K, handler: IInterceptor<IValueWillChange<V>>): Lambda;
export declare function intercept(object: object, handler: IInterceptor<IObjectWillChange>): Lambda;
export declare function intercept<T extends object, K extends keyof T>(object: T, property: K, handler: IInterceptor<IValueWillChange<T[K]>>): Lambda;
