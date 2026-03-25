import {
    IArrayWillChange,
    IArrayWillSplice,
    IInterceptor,
    IMapWillChange,
    IObjectWillChange,
    IObservableArray,
    IObservableValue,
    IValueWillChange,
    Lambda,
    ObservableMap,
    getAdministration,
    ObservableSet,
    ISetWillChange,
    isFunction
} from "../internal"

export function intercept<T>(
    value: IObservableValue<T>,
    handler: IInterceptor<IValueWillChange<T>>
): Lambda
export function intercept<T>(
    observableArray: IObservableArray<T> | Array<T>,
    handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>
): Lambda
export function intercept<K, V>(
    observableMap: ObservableMap<K, V> | Map<K, V>,
    handler: IInterceptor<IMapWillChange<K, V>>
): Lambda
export function intercept<V>(
    observableSet: ObservableSet<V> | Set<V>,
    handler: IInterceptor<ISetWillChange<V>>
): Lambda
export function intercept<K, V>(
    observableMap: ObservableMap<K, V> | Map<K, V>,
    property: K,
    handler: IInterceptor<IValueWillChange<V>>
): Lambda
export function intercept(object: object, handler: IInterceptor<IObjectWillChange>): Lambda
export function intercept<T extends object, K extends keyof T>(
    object: T,
    property: K,
    handler: IInterceptor<IValueWillChange<T[K]>>
): Lambda
export function intercept(thing, propOrHandler?, handler?): Lambda {
    if (isFunction(handler)) {
        return interceptProperty(thing, propOrHandler, handler)
    } else {
        return interceptInterceptable(thing, propOrHandler)
    }
}

function interceptInterceptable(thing, handler) {
    return getAdministration(thing).intercept_(handler)
}

function interceptProperty(thing, property, handler) {
    return getAdministration(thing, property).intercept_(handler)
}
