import {
    $mobx,
    isAtom,
    isComputedValue,
    isObservableArray,
    isObservableMap,
    isObservableObject,
    isReaction,
    die,
    isStringish
} from "../internal"

function _isObservable(value, property?: PropertyKey): boolean {
    if (!value) {
        return false
    }
    if (property !== undefined) {
        if (__DEV__ && (isObservableMap(value) || isObservableArray(value))) {
            return die(
                "isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead."
            )
        }
        if (isObservableObject(value)) {
            return value[$mobx].values_.has(property)
        }
        return false
    }
    // For first check, see #701
    return (
        isObservableObject(value) ||
        !!value[$mobx] ||
        isAtom(value) ||
        isReaction(value) ||
        isComputedValue(value)
    )
}

export function isObservable(value: any): boolean {
    if (__DEV__ && arguments.length !== 1) {
        die(
            `isObservable expects only 1 argument. Use isObservableProp to inspect the observability of a property`
        )
    }
    return _isObservable(value)
}

export function isObservableProp(value: any, propName: PropertyKey): boolean {
    if (__DEV__ && !isStringish(propName)) {
        return die(`expected a property name as second argument`)
    }
    return _isObservable(value, propName)
}
