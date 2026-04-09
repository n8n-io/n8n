import {
    $mobx,
    Atom,
    EMPTY_ARRAY,
    IAtom,
    IEnhancer,
    IInterceptable,
    IInterceptor,
    IListenable,
    Lambda,
    addHiddenFinalProp,
    checkIfStateModificationsAreAllowed,
    createInstanceofPredicate,
    getNextId,
    hasInterceptors,
    hasListeners,
    interceptChange,
    isObject,
    isSpyEnabled,
    notifyListeners,
    registerInterceptor,
    registerListener,
    spyReportEnd,
    spyReportStart,
    assertProxies,
    reserveArrayBuffer,
    hasProp,
    die,
    globalState,
    initObservable
} from "../internal"

const SPLICE = "splice"
export const UPDATE = "update"
export const MAX_SPLICE_SIZE = 10000 // See e.g. https://github.com/mobxjs/mobx/issues/859

export interface IObservableArray<T = any> extends Array<T> {
    spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[]
    clear(): T[]
    replace(newItems: T[]): T[]
    remove(value: T): boolean
    toJSON(): T[]
}

interface IArrayBaseChange<T> {
    object: IObservableArray<T>
    observableKind: "array"
    debugObjectName: string
    index: number
}

export type IArrayDidChange<T = any> = IArrayUpdate<T> | IArraySplice<T>

export interface IArrayUpdate<T = any> extends IArrayBaseChange<T> {
    type: "update"
    newValue: T
    oldValue: T
}

export interface IArraySplice<T = any> extends IArrayBaseChange<T> {
    type: "splice"
    added: T[]
    addedCount: number
    removed: T[]
    removedCount: number
}

export interface IArrayWillChange<T = any> {
    object: IObservableArray<T>
    index: number
    type: "update"
    newValue: T
}

export interface IArrayWillSplice<T = any> {
    object: IObservableArray<T>
    index: number
    type: "splice"
    added: T[]
    removedCount: number
}

const arrayTraps = {
    get(target, name) {
        const adm: ObservableArrayAdministration = target[$mobx]
        if (name === $mobx) {
            return adm
        }
        if (name === "length") {
            return adm.getArrayLength_()
        }
        if (typeof name === "string" && !isNaN(name as any)) {
            return adm.get_(parseInt(name))
        }
        if (hasProp(arrayExtensions, name)) {
            return arrayExtensions[name]
        }
        return target[name]
    },
    set(target, name, value): boolean {
        const adm: ObservableArrayAdministration = target[$mobx]
        if (name === "length") {
            adm.setArrayLength_(value)
        }
        if (typeof name === "symbol" || isNaN(name)) {
            target[name] = value
        } else {
            // numeric string
            adm.set_(parseInt(name), value)
        }
        return true
    },
    preventExtensions() {
        die(15)
    }
}

export class ObservableArrayAdministration
    implements IInterceptable<IArrayWillChange<any> | IArrayWillSplice<any>>, IListenable
{
    atom_: IAtom
    readonly values_: any[] = [] // this is the prop that gets proxied, so can't replace it!
    interceptors_
    changeListeners_
    enhancer_: (newV: any, oldV: any | undefined) => any
    dehancer: any
    proxy_!: IObservableArray<any>
    lastKnownLength_ = 0

    constructor(
        name = __DEV__ ? "ObservableArray@" + getNextId() : "ObservableArray",
        enhancer: IEnhancer<any>,
        public owned_: boolean,
        public legacyMode_: boolean
    ) {
        this.atom_ = new Atom(name)
        this.enhancer_ = (newV, oldV) =>
            enhancer(newV, oldV, __DEV__ ? name + "[..]" : "ObservableArray[..]")
    }

    dehanceValue_(value: any): any {
        if (this.dehancer !== undefined) {
            return this.dehancer(value)
        }
        return value
    }

    dehanceValues_(values: any[]): any[] {
        if (this.dehancer !== undefined && values.length > 0) {
            return values.map(this.dehancer) as any
        }
        return values
    }

    intercept_(handler: IInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>): Lambda {
        return registerInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>(this, handler)
    }

    observe_(
        listener: (changeData: IArrayDidChange<any>) => void,
        fireImmediately = false
    ): Lambda {
        if (fireImmediately) {
            listener(<IArraySplice<any>>{
                observableKind: "array",
                object: this.proxy_ as any,
                debugObjectName: this.atom_.name_,
                type: "splice",
                index: 0,
                added: this.values_.slice(),
                addedCount: this.values_.length,
                removed: [],
                removedCount: 0
            })
        }
        return registerListener(this, listener)
    }

    getArrayLength_(): number {
        this.atom_.reportObserved()
        return this.values_.length
    }

    setArrayLength_(newLength: number) {
        if (typeof newLength !== "number" || isNaN(newLength) || newLength < 0) {
            die("Out of range: " + newLength)
        }
        let currentLength = this.values_.length
        if (newLength === currentLength) {
            return
        } else if (newLength > currentLength) {
            const newItems = new Array(newLength - currentLength)
            for (let i = 0; i < newLength - currentLength; i++) {
                newItems[i] = undefined
            } // No Array.fill everywhere...
            this.spliceWithArray_(currentLength, 0, newItems)
        } else {
            this.spliceWithArray_(newLength, currentLength - newLength)
        }
    }

    updateArrayLength_(oldLength: number, delta: number) {
        if (oldLength !== this.lastKnownLength_) {
            die(16)
        }
        this.lastKnownLength_ += delta
        if (this.legacyMode_ && delta > 0) {
            reserveArrayBuffer(oldLength + delta + 1)
        }
    }

    spliceWithArray_(index: number, deleteCount?: number, newItems?: any[]): any[] {
        checkIfStateModificationsAreAllowed(this.atom_)
        const length = this.values_.length

        if (index === undefined) {
            index = 0
        } else if (index > length) {
            index = length
        } else if (index < 0) {
            index = Math.max(0, length + index)
        }

        if (arguments.length === 1) {
            deleteCount = length - index
        } else if (deleteCount === undefined || deleteCount === null) {
            deleteCount = 0
        } else {
            deleteCount = Math.max(0, Math.min(deleteCount, length - index))
        }

        if (newItems === undefined) {
            newItems = EMPTY_ARRAY
        }

        if (hasInterceptors(this)) {
            const change = interceptChange<IArrayWillSplice<any>>(this as any, {
                object: this.proxy_ as any,
                type: SPLICE,
                index,
                removedCount: deleteCount,
                added: newItems
            })
            if (!change) {
                return EMPTY_ARRAY
            }
            deleteCount = change.removedCount
            newItems = change.added
        }

        newItems =
            newItems.length === 0 ? newItems : newItems.map(v => this.enhancer_(v, undefined))
        if (this.legacyMode_ || __DEV__) {
            const lengthDelta = newItems.length - deleteCount
            this.updateArrayLength_(length, lengthDelta) // checks if internal array wasn't modified
        }
        const res = this.spliceItemsIntoValues_(index, deleteCount, newItems)

        if (deleteCount !== 0 || newItems.length !== 0) {
            this.notifyArraySplice_(index, newItems, res)
        }
        return this.dehanceValues_(res)
    }

    spliceItemsIntoValues_(index: number, deleteCount: number, newItems: any[]): any[] {
        if (newItems.length < MAX_SPLICE_SIZE) {
            return this.values_.splice(index, deleteCount, ...newItems)
        } else {
            // The items removed by the splice
            const res = this.values_.slice(index, index + deleteCount)
            // The items that that should remain at the end of the array
            let oldItems = this.values_.slice(index + deleteCount)
            // New length is the previous length + addition count - deletion count
            this.values_.length += newItems.length - deleteCount
            for (let i = 0; i < newItems.length; i++) {
                this.values_[index + i] = newItems[i]
            }
            for (let i = 0; i < oldItems.length; i++) {
                this.values_[index + newItems.length + i] = oldItems[i]
            }
            return res
        }
    }

    notifyArrayChildUpdate_(index: number, newValue: any, oldValue: any) {
        const notifySpy = !this.owned_ && isSpyEnabled()
        const notify = hasListeners(this)
        const change: IArrayDidChange | null =
            notify || notifySpy
                ? ({
                      observableKind: "array",
                      object: this.proxy_,
                      type: UPDATE,
                      debugObjectName: this.atom_.name_,
                      index,
                      newValue,
                      oldValue
                  } as const)
                : null

        // The reason why this is on right hand side here (and not above), is this way the uglifier will drop it, but it won't
        // cause any runtime overhead in development mode without NODE_ENV set, unless spying is enabled
        if (__DEV__ && notifySpy) {
            spyReportStart(change!)
        }
        this.atom_.reportChanged()
        if (notify) {
            notifyListeners(this, change)
        }
        if (__DEV__ && notifySpy) {
            spyReportEnd()
        }
    }

    notifyArraySplice_(index: number, added: any[], removed: any[]) {
        const notifySpy = !this.owned_ && isSpyEnabled()
        const notify = hasListeners(this)
        const change: IArraySplice | null =
            notify || notifySpy
                ? ({
                      observableKind: "array",
                      object: this.proxy_,
                      debugObjectName: this.atom_.name_,
                      type: SPLICE,
                      index,
                      removed,
                      added,
                      removedCount: removed.length,
                      addedCount: added.length
                  } as const)
                : null

        if (__DEV__ && notifySpy) {
            spyReportStart(change!)
        }
        this.atom_.reportChanged()
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        if (notify) {
            notifyListeners(this, change)
        }
        if (__DEV__ && notifySpy) {
            spyReportEnd()
        }
    }

    get_(index: number): any | undefined {
        if (this.legacyMode_ && index >= this.values_.length) {
            console.warn(
                __DEV__
                    ? `[mobx.array] Attempt to read an array index (${index}) that is out of bounds (${this.values_.length}). Please check length first. Out of bound indices will not be tracked by MobX`
                    : `[mobx] Out of bounds read: ${index}`
            )
            return undefined
        }
        this.atom_.reportObserved()
        return this.dehanceValue_(this.values_[index])
    }

    set_(index: number, newValue: any) {
        const values = this.values_
        if (this.legacyMode_ && index > values.length) {
            // out of bounds
            die(17, index, values.length)
        }
        if (index < values.length) {
            // update at index in range
            checkIfStateModificationsAreAllowed(this.atom_)
            const oldValue = values[index]
            if (hasInterceptors(this)) {
                const change = interceptChange<IArrayWillChange<any>>(this as any, {
                    type: UPDATE,
                    object: this.proxy_ as any, // since "this" is the real array we need to pass its proxy
                    index,
                    newValue
                })
                if (!change) {
                    return
                }
                newValue = change.newValue
            }
            newValue = this.enhancer_(newValue, oldValue)
            const changed = newValue !== oldValue
            if (changed) {
                values[index] = newValue
                this.notifyArrayChildUpdate_(index, newValue, oldValue)
            }
        } else {
            // For out of bound index, we don't create an actual sparse array,
            // but rather fill the holes with undefined (same as setArrayLength_).
            // This could be considered a bug.
            const newItems = new Array(index + 1 - values.length)
            for (let i = 0; i < newItems.length - 1; i++) {
                newItems[i] = undefined
            } // No Array.fill everywhere...
            newItems[newItems.length - 1] = newValue
            this.spliceWithArray_(values.length, 0, newItems)
        }
    }
}

export function createObservableArray<T>(
    initialValues: T[] | undefined,
    enhancer: IEnhancer<T>,
    name = __DEV__ ? "ObservableArray@" + getNextId() : "ObservableArray",
    owned = false
): IObservableArray<T> {
    assertProxies()
    return initObservable(() => {
        const adm = new ObservableArrayAdministration(name, enhancer, owned, false)
        addHiddenFinalProp(adm.values_, $mobx, adm)
        const proxy = new Proxy(adm.values_, arrayTraps) as any
        adm.proxy_ = proxy
        if (initialValues && initialValues.length) {
            adm.spliceWithArray_(0, 0, initialValues)
        }
        return proxy
    })
}

// eslint-disable-next-line
export var arrayExtensions = {
    clear(): any[] {
        return this.splice(0)
    },

    replace(newItems: any[]) {
        const adm: ObservableArrayAdministration = this[$mobx]
        return adm.spliceWithArray_(0, adm.values_.length, newItems)
    },

    // Used by JSON.stringify
    toJSON(): any[] {
        return this.slice()
    },

    /*
     * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
     * since these functions alter the inner structure of the array, the have side effects.
     * Because the have side effects, they should not be used in computed function,
     * and for that reason the do not call dependencyState.notifyObserved
     */
    splice(index: number, deleteCount?: number, ...newItems: any[]): any[] {
        const adm: ObservableArrayAdministration = this[$mobx]
        switch (arguments.length) {
            case 0:
                return []
            case 1:
                return adm.spliceWithArray_(index)
            case 2:
                return adm.spliceWithArray_(index, deleteCount)
        }
        return adm.spliceWithArray_(index, deleteCount, newItems)
    },

    spliceWithArray(index: number, deleteCount?: number, newItems?: any[]): any[] {
        return (this[$mobx] as ObservableArrayAdministration).spliceWithArray_(
            index,
            deleteCount,
            newItems
        )
    },

    push(...items: any[]): number {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.spliceWithArray_(adm.values_.length, 0, items)
        return adm.values_.length
    },

    pop() {
        return this.splice(Math.max(this[$mobx].values_.length - 1, 0), 1)[0]
    },

    shift() {
        return this.splice(0, 1)[0]
    },

    unshift(...items: any[]): number {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.spliceWithArray_(0, 0, items)
        return adm.values_.length
    },

    reverse(): any[] {
        // reverse by default mutates in place before returning the result
        // which makes it both a 'derivation' and a 'mutation'.
        if (globalState.trackingDerivation) {
            die(37, "reverse")
        }
        this.replace(this.slice().reverse())
        return this
    },

    sort(): any[] {
        // sort by default mutates in place before returning the result
        // which goes against all good practices. Let's not change the array in place!
        if (globalState.trackingDerivation) {
            die(37, "sort")
        }
        const copy = this.slice()
        copy.sort.apply(copy, arguments)
        this.replace(copy)
        return this
    },

    remove(value: any): boolean {
        const adm: ObservableArrayAdministration = this[$mobx]
        const idx = adm.dehanceValues_(adm.values_).indexOf(value)
        if (idx > -1) {
            this.splice(idx, 1)
            return true
        }
        return false
    }
}

/**
 * Wrap function from prototype
 * Without this, everything works as well, but this works
 * faster as everything works on unproxied values
 */
addArrayExtension("at", simpleFunc)
addArrayExtension("concat", simpleFunc)
addArrayExtension("flat", simpleFunc)
addArrayExtension("includes", simpleFunc)
addArrayExtension("indexOf", simpleFunc)
addArrayExtension("join", simpleFunc)
addArrayExtension("lastIndexOf", simpleFunc)
addArrayExtension("slice", simpleFunc)
addArrayExtension("toString", simpleFunc)
addArrayExtension("toLocaleString", simpleFunc)
addArrayExtension("toSorted", simpleFunc)
addArrayExtension("toSpliced", simpleFunc)
addArrayExtension("with", simpleFunc)
// map
addArrayExtension("every", mapLikeFunc)
addArrayExtension("filter", mapLikeFunc)
addArrayExtension("find", mapLikeFunc)
addArrayExtension("findIndex", mapLikeFunc)
addArrayExtension("findLast", mapLikeFunc)
addArrayExtension("findLastIndex", mapLikeFunc)
addArrayExtension("flatMap", mapLikeFunc)
addArrayExtension("forEach", mapLikeFunc)
addArrayExtension("map", mapLikeFunc)
addArrayExtension("some", mapLikeFunc)
addArrayExtension("toReversed", mapLikeFunc)
// reduce
addArrayExtension("reduce", reduceLikeFunc)
addArrayExtension("reduceRight", reduceLikeFunc)

function addArrayExtension(funcName, funcFactory) {
    if (typeof Array.prototype[funcName] === "function") {
        arrayExtensions[funcName] = funcFactory(funcName)
    }
}

// Report and delegate to dehanced array
function simpleFunc(funcName) {
    return function () {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.atom_.reportObserved()
        const dehancedValues = adm.dehanceValues_(adm.values_)
        return dehancedValues[funcName].apply(dehancedValues, arguments)
    }
}

// Make sure callbacks receive correct array arg #2326
function mapLikeFunc(funcName) {
    return function (callback, thisArg) {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.atom_.reportObserved()
        const dehancedValues = adm.dehanceValues_(adm.values_)
        return dehancedValues[funcName]((element, index) => {
            return callback.call(thisArg, element, index, this)
        })
    }
}

// Make sure callbacks receive correct array arg #2326
function reduceLikeFunc(funcName) {
    return function () {
        const adm: ObservableArrayAdministration = this[$mobx]
        adm.atom_.reportObserved()
        const dehancedValues = adm.dehanceValues_(adm.values_)
        // #2432 - reduce behavior depends on arguments.length
        const callback = arguments[0]
        arguments[0] = (accumulator, currentValue, index) => {
            return callback(accumulator, currentValue, index, this)
        }
        return dehancedValues[funcName].apply(dehancedValues, arguments)
    }
}

const isObservableArrayAdministration = createInstanceofPredicate(
    "ObservableArrayAdministration",
    ObservableArrayAdministration
)

export function isObservableArray(thing): thing is IObservableArray<any> {
    return isObject(thing) && isObservableArrayAdministration(thing[$mobx])
}
