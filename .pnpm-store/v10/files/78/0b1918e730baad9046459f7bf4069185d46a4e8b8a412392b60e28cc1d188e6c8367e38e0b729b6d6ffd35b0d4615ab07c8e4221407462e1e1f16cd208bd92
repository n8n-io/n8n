import {
    IArrayDidChange,
    IComputedValue,
    IMapDidChange,
    IObjectDidChange,
    IObservableArray,
    IObservableValue,
    IValueDidChange,
    Lambda,
    ObservableMap,
    getAdministration,
    ObservableSet,
    ISetDidChange,
    isFunction
} from "../internal"

export function observe<T>(
    value: IObservableValue<T> | IComputedValue<T>,
    listener: (change: IValueDidChange<T>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<T>(
    observableArray: IObservableArray<T> | Array<T>,
    listener: (change: IArrayDidChange<T>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<V>(
    // ObservableSet/ObservableMap are required despite they implement Set/Map: https://github.com/mobxjs/mobx/pull/3180#discussion_r746542929
    observableSet: ObservableSet<V> | Set<V>,
    listener: (change: ISetDidChange<V>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<K, V>(
    observableMap: ObservableMap<K, V> | Map<K, V>,
    listener: (change: IMapDidChange<K, V>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<K, V>(
    observableMap: ObservableMap<K, V> | Map<K, V>,
    property: K,
    listener: (change: IValueDidChange<V>) => void,
    fireImmediately?: boolean
): Lambda
export function observe(
    object: Object,
    listener: (change: IObjectDidChange) => void,
    fireImmediately?: boolean
): Lambda
export function observe<T, K extends keyof T>(
    object: T,
    property: K,
    listener: (change: IValueDidChange<T[K]>) => void,
    fireImmediately?: boolean
): Lambda
export function observe(thing, propOrCb?, cbOrFire?, fireImmediately?): Lambda {
    if (isFunction(cbOrFire)) {
        return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately)
    } else {
        return observeObservable(thing, propOrCb, cbOrFire)
    }
}

function observeObservable(thing, listener, fireImmediately: boolean) {
    return getAdministration(thing).observe_(listener, fireImmediately)
}

function observeObservableProperty(thing, property, listener, fireImmediately: boolean) {
    return getAdministration(thing, property).observe_(listener, fireImmediately)
}
