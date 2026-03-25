import { deepEqual } from "../internal"

export interface IEqualsComparer<T> {
    (a: T, b: T): boolean
}

function identityComparer(a: any, b: any): boolean {
    return a === b
}

function structuralComparer(a: any, b: any): boolean {
    return deepEqual(a, b)
}

function shallowComparer(a: any, b: any): boolean {
    return deepEqual(a, b, 1)
}

function defaultComparer(a: any, b: any): boolean {
    if (Object.is) {
        return Object.is(a, b)
    }

    return a === b ? a !== 0 || 1 / a === 1 / b : a !== a && b !== b
}

export const comparer = {
    identity: identityComparer,
    structural: structuralComparer,
    default: defaultComparer,
    shallow: shallowComparer
}
