import { $mobx, getAtom, isComputedValue, isObservableObject, die, isStringish } from "../internal"

export function _isComputed(value, property?: PropertyKey): boolean {
    if (property === undefined) {
        return isComputedValue(value)
    }
    if (isObservableObject(value) === false) {
        return false
    }
    if (!value[$mobx].values_.has(property)) {
        return false
    }
    const atom = getAtom(value, property)
    return isComputedValue(atom)
}

export function isComputed(value: any): boolean {
    if (__DEV__ && arguments.length > 1) {
        return die(
            `isComputed expects only 1 argument. Use isComputedProp to inspect the observability of a property`
        )
    }
    return _isComputed(value)
}

export function isComputedProp(value: any, propName: PropertyKey): boolean {
    if (__DEV__ && !isStringish(propName)) {
        return die(`isComputed expected a property name as second argument`)
    }
    return _isComputed(value, propName)
}
