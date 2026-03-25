import { IObservableArray, IObservableValue, Lambda, ObservableMap, ObservableSet } from "../internal";
export type ReadInterceptor<T> = (value: any) => T;
/** Experimental feature right now, tested indirectly via Mobx-State-Tree */
export declare function interceptReads<T>(value: IObservableValue<T>, handler: ReadInterceptor<T>): Lambda;
export declare function interceptReads<T>(observableArray: IObservableArray<T>, handler: ReadInterceptor<T>): Lambda;
export declare function interceptReads<K, V>(observableMap: ObservableMap<K, V>, handler: ReadInterceptor<V>): Lambda;
export declare function interceptReads<V>(observableSet: ObservableSet<V>, handler: ReadInterceptor<V>): Lambda;
export declare function interceptReads(object: Object, property: string, handler: ReadInterceptor<any>): Lambda;
