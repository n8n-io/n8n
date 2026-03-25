import { isAction } from "../api/action"
import {
    $mobx,
    IDepTreeNode,
    isAtom,
    isComputedValue,
    isObservableArray,
    isObservableMap,
    isObservableObject,
    isReaction,
    isObservableSet,
    die,
    isFunction,
    allowStateChangesStart,
    untrackedStart,
    allowStateChangesEnd,
    untrackedEnd,
    startBatch,
    endBatch
} from "../internal"

export function getAtom(thing: any, property?: PropertyKey): IDepTreeNode {
    if (typeof thing === "object" && thing !== null) {
        if (isObservableArray(thing)) {
            if (property !== undefined) {
                die(23)
            }
            return (thing as any)[$mobx].atom_
        }
        if (isObservableSet(thing)) {
            return thing.atom_
        }
        if (isObservableMap(thing)) {
            if (property === undefined) {
                return thing.keysAtom_
            }
            const observable = thing.data_.get(property) || thing.hasMap_.get(property)
            if (!observable) {
                die(25, property, getDebugName(thing))
            }
            return observable
        }
        if (property && !thing[$mobx]) {
            thing[property]
        } // See #1072
        if (isObservableObject(thing)) {
            if (!property) {
                return die(26)
            }
            const observable = (thing as any)[$mobx].values_.get(property)
            if (!observable) {
                die(27, property, getDebugName(thing))
            }
            return observable
        }
        if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
            return thing
        }
    } else if (isFunction(thing)) {
        if (isReaction(thing[$mobx])) {
            // disposer function
            return thing[$mobx]
        }
    }
    die(28)
}

export function getAdministration(thing: any, property?: string) {
    if (!thing) {
        die(29)
    }
    if (property !== undefined) {
        return getAdministration(getAtom(thing, property))
    }
    if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
        return thing
    }
    if (isObservableMap(thing) || isObservableSet(thing)) {
        return thing
    }
    if (thing[$mobx]) {
        return thing[$mobx]
    }
    die(24, thing)
}

export function getDebugName(thing: any, property?: string): string {
    let named
    if (property !== undefined) {
        named = getAtom(thing, property)
    } else if (isAction(thing)) {
        return thing.name
    } else if (isObservableObject(thing) || isObservableMap(thing) || isObservableSet(thing)) {
        named = getAdministration(thing)
    } else {
        // valid for arrays as well
        named = getAtom(thing)
    }
    return named.name_
}

/**
 * Helper function for initializing observable structures, it applies:
 * 1. allowStateChanges so we don't violate enforceActions.
 * 2. untracked so we don't accidentaly subscribe to anything observable accessed during init in case the observable is created inside derivation.
 * 3. batch to avoid state version updates
 */
export function initObservable<T>(cb: () => T): T {
    const derivation = untrackedStart()
    const allowStateChanges = allowStateChangesStart(true)
    startBatch()
    try {
        return cb()
    } finally {
        endBatch()
        allowStateChangesEnd(allowStateChanges)
        untrackedEnd(derivation)
    }
}
