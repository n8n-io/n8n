import {
    $mobx,
    IEnhancer,
    IInterceptable,
    IInterceptor,
    IListenable,
    Lambda,
    ObservableValue,
    checkIfStateModificationsAreAllowed,
    createAtom,
    createInstanceofPredicate,
    deepEnhancer,
    getNextId,
    getPlainObjectKeys,
    hasInterceptors,
    hasListeners,
    interceptChange,
    isES6Map,
    isPlainObject,
    isSpyEnabled,
    makeIterable,
    notifyListeners,
    referenceEnhancer,
    registerInterceptor,
    registerListener,
    spyReportEnd,
    spyReportStart,
    stringifyKey,
    transaction,
    untracked,
    onBecomeUnobserved,
    globalState,
    die,
    isFunction,
    UPDATE,
    IAtom,
    PureSpyEvent,
    initObservable
} from "../internal"

export interface IKeyValueMap<V = any> {
    [key: string]: V
}

export type IMapEntry<K = any, V = any> = [K, V]
export type IReadonlyMapEntry<K = any, V = any> = readonly [K, V]
export type IMapEntries<K = any, V = any> = IMapEntry<K, V>[]
export type IReadonlyMapEntries<K = any, V = any> = IReadonlyMapEntry<K, V>[]

export type IMapDidChange<K = any, V = any> = { observableKind: "map"; debugObjectName: string } & (
    | {
          object: ObservableMap<K, V>
          name: K // actual the key or index, but this is based on the ancient .observe proposal for consistency
          type: "update"
          newValue: V
          oldValue: V
      }
    | {
          object: ObservableMap<K, V>
          name: K
          type: "add"
          newValue: V
      }
    | {
          object: ObservableMap<K, V>
          name: K
          type: "delete"
          oldValue: V
      }
)

export interface IMapWillChange<K = any, V = any> {
    object: ObservableMap<K, V>
    type: "update" | "add" | "delete"
    name: K
    newValue?: V
}

const ObservableMapMarker = {}

export const ADD = "add"
export const DELETE = "delete"

export type IObservableMapInitialValues<K = any, V = any> =
    | IMapEntries<K, V>
    | IReadonlyMapEntries<K, V>
    | IKeyValueMap<V>
    | Map<K, V>

// just extend Map? See also https://gist.github.com/nestharus/13b4d74f2ef4a2f4357dbd3fc23c1e54
// But: https://github.com/mobxjs/mobx/issues/1556
export class ObservableMap<K = any, V = any>
    implements Map<K, V>, IInterceptable<IMapWillChange<K, V>>, IListenable
{
    [$mobx] = ObservableMapMarker
    data_!: Map<K, ObservableValue<V>>
    hasMap_!: Map<K, ObservableValue<boolean>> // hasMap, not hashMap >-).
    keysAtom_!: IAtom
    interceptors_
    changeListeners_
    dehancer: any

    constructor(
        initialData?: IObservableMapInitialValues<K, V>,
        public enhancer_: IEnhancer<V> = deepEnhancer,
        public name_ = __DEV__ ? "ObservableMap@" + getNextId() : "ObservableMap"
    ) {
        if (!isFunction(Map)) {
            die(18)
        }
        initObservable(() => {
            this.keysAtom_ = createAtom(__DEV__ ? `${this.name_}.keys()` : "ObservableMap.keys()")
            this.data_ = new Map()
            this.hasMap_ = new Map()
            if (initialData) {
                this.merge(initialData)
            }
        })
    }

    private has_(key: K): boolean {
        return this.data_.has(key)
    }

    has(key: K): boolean {
        if (!globalState.trackingDerivation) {
            return this.has_(key)
        }

        let entry = this.hasMap_.get(key)
        if (!entry) {
            const newEntry = (entry = new ObservableValue(
                this.has_(key),
                referenceEnhancer,
                __DEV__ ? `${this.name_}.${stringifyKey(key)}?` : "ObservableMap.key?",
                false
            ))
            this.hasMap_.set(key, newEntry)
            onBecomeUnobserved(newEntry, () => this.hasMap_.delete(key))
        }

        return entry.get()
    }

    set(key: K, value: V) {
        const hasKey = this.has_(key)
        if (hasInterceptors(this)) {
            const change = interceptChange<IMapWillChange<K, V>>(this, {
                type: hasKey ? UPDATE : ADD,
                object: this,
                newValue: value,
                name: key
            })
            if (!change) {
                return this
            }
            value = change.newValue!
        }
        if (hasKey) {
            this.updateValue_(key, value)
        } else {
            this.addValue_(key, value)
        }
        return this
    }

    delete(key: K): boolean {
        checkIfStateModificationsAreAllowed(this.keysAtom_)
        if (hasInterceptors(this)) {
            const change = interceptChange<IMapWillChange<K, V>>(this, {
                type: DELETE,
                object: this,
                name: key
            })
            if (!change) {
                return false
            }
        }
        if (this.has_(key)) {
            const notifySpy = isSpyEnabled()
            const notify = hasListeners(this)
            const change: IMapDidChange<K, V> | null =
                notify || notifySpy
                    ? {
                          observableKind: "map",
                          debugObjectName: this.name_,
                          type: DELETE,
                          object: this,
                          oldValue: (<any>this.data_.get(key)).value_,
                          name: key
                      }
                    : null

            if (__DEV__ && notifySpy) {
                spyReportStart(change! as PureSpyEvent)
            } // TODO fix type
            transaction(() => {
                this.keysAtom_.reportChanged()
                this.hasMap_.get(key)?.setNewValue_(false)
                const observable = this.data_.get(key)!
                observable.setNewValue_(undefined as any)
                this.data_.delete(key)
            })
            if (notify) {
                notifyListeners(this, change)
            }
            if (__DEV__ && notifySpy) {
                spyReportEnd()
            }
            return true
        }
        return false
    }

    private updateValue_(key: K, newValue: V | undefined) {
        const observable = this.data_.get(key)!
        newValue = (observable as any).prepareNewValue_(newValue) as V
        if (newValue !== globalState.UNCHANGED) {
            const notifySpy = isSpyEnabled()
            const notify = hasListeners(this)
            const change: IMapDidChange<K, V> | null =
                notify || notifySpy
                    ? {
                          observableKind: "map",
                          debugObjectName: this.name_,
                          type: UPDATE,
                          object: this,
                          oldValue: (observable as any).value_,
                          name: key,
                          newValue
                      }
                    : null
            if (__DEV__ && notifySpy) {
                spyReportStart(change! as PureSpyEvent)
            } // TODO fix type
            observable.setNewValue_(newValue as V)
            if (notify) {
                notifyListeners(this, change)
            }
            if (__DEV__ && notifySpy) {
                spyReportEnd()
            }
        }
    }

    private addValue_(key: K, newValue: V) {
        checkIfStateModificationsAreAllowed(this.keysAtom_)
        transaction(() => {
            const observable = new ObservableValue(
                newValue,
                this.enhancer_,
                __DEV__ ? `${this.name_}.${stringifyKey(key)}` : "ObservableMap.key",
                false
            )
            this.data_.set(key, observable)
            newValue = (observable as any).value_ // value might have been changed
            this.hasMap_.get(key)?.setNewValue_(true)
            this.keysAtom_.reportChanged()
        })
        const notifySpy = isSpyEnabled()
        const notify = hasListeners(this)
        const change: IMapDidChange<K, V> | null =
            notify || notifySpy
                ? {
                      observableKind: "map",
                      debugObjectName: this.name_,
                      type: ADD,
                      object: this,
                      name: key,
                      newValue
                  }
                : null
        if (__DEV__ && notifySpy) {
            spyReportStart(change! as PureSpyEvent)
        } // TODO fix type
        if (notify) {
            notifyListeners(this, change)
        }
        if (__DEV__ && notifySpy) {
            spyReportEnd()
        }
    }

    get(key: K): V | undefined {
        if (this.has(key)) {
            return this.dehanceValue_(this.data_.get(key)!.get())
        }
        return this.dehanceValue_(undefined)
    }

    private dehanceValue_<X extends V | undefined>(value: X): X {
        if (this.dehancer !== undefined) {
            return this.dehancer(value)
        }
        return value
    }

    keys(): IterableIterator<K> {
        this.keysAtom_.reportObserved()
        return this.data_.keys()
    }

    values(): IterableIterator<V> {
        const self = this
        const keys = this.keys()
        return makeIterable({
            next() {
                const { done, value } = keys.next()
                return {
                    done,
                    value: done ? (undefined as any) : self.get(value)
                }
            }
        })
    }

    entries(): IterableIterator<IMapEntry<K, V>> {
        const self = this
        const keys = this.keys()
        return makeIterable({
            next() {
                const { done, value } = keys.next()
                return {
                    done,
                    value: done ? (undefined as any) : ([value, self.get(value)!] as [K, V])
                }
            }
        })
    }

    [Symbol.iterator]() {
        return this.entries()
    }

    forEach(callback: (value: V, key: K, object: Map<K, V>) => void, thisArg?) {
        for (const [key, value] of this) {
            callback.call(thisArg, value, key, this)
        }
    }

    /** Merge another object into this object, returns this. */
    merge(other?: IObservableMapInitialValues<K, V>): ObservableMap<K, V> {
        if (isObservableMap(other)) {
            other = new Map(other)
        }
        transaction(() => {
            if (isPlainObject(other)) {
                getPlainObjectKeys(other).forEach((key: any) =>
                    this.set(key as K, (other as IKeyValueMap)[key])
                )
            } else if (Array.isArray(other)) {
                other.forEach(([key, value]) => this.set(key, value))
            } else if (isES6Map(other)) {
                if (other.constructor !== Map) {
                    die(19, other)
                }
                other.forEach((value, key) => this.set(key, value))
            } else if (other !== null && other !== undefined) {
                die(20, other)
            }
        })
        return this
    }

    clear() {
        transaction(() => {
            untracked(() => {
                for (const key of this.keys()) {
                    this.delete(key)
                }
            })
        })
    }

    replace(values: IObservableMapInitialValues<K, V>): ObservableMap<K, V> {
        // Implementation requirements:
        // - respect ordering of replacement map
        // - allow interceptors to run and potentially prevent individual operations
        // - don't recreate observables that already exist in original map (so we don't destroy existing subscriptions)
        // - don't _keysAtom.reportChanged if the keys of resulting map are indentical (order matters!)
        // - note that result map may differ from replacement map due to the interceptors
        transaction(() => {
            // Convert to map so we can do quick key lookups
            const replacementMap = convertToMap(values)
            const orderedData = new Map()
            // Used for optimization
            let keysReportChangedCalled = false
            // Delete keys that don't exist in replacement map
            // if the key deletion is prevented by interceptor
            // add entry at the beginning of the result map
            for (const key of this.data_.keys()) {
                // Concurrently iterating/deleting keys
                // iterator should handle this correctly
                if (!replacementMap.has(key)) {
                    const deleted = this.delete(key)
                    // Was the key removed?
                    if (deleted) {
                        // _keysAtom.reportChanged() was already called
                        keysReportChangedCalled = true
                    } else {
                        // Delete prevented by interceptor
                        const value = this.data_.get(key)
                        orderedData.set(key, value)
                    }
                }
            }
            // Merge entries
            for (const [key, value] of replacementMap.entries()) {
                // We will want to know whether a new key is added
                const keyExisted = this.data_.has(key)
                // Add or update value
                this.set(key, value)
                // The addition could have been prevent by interceptor
                if (this.data_.has(key)) {
                    // The update could have been prevented by interceptor
                    // and also we want to preserve existing values
                    // so use value from _data map (instead of replacement map)
                    const value = this.data_.get(key)
                    orderedData.set(key, value)
                    // Was a new key added?
                    if (!keyExisted) {
                        // _keysAtom.reportChanged() was already called
                        keysReportChangedCalled = true
                    }
                }
            }
            // Check for possible key order change
            if (!keysReportChangedCalled) {
                if (this.data_.size !== orderedData.size) {
                    // If size differs, keys are definitely modified
                    this.keysAtom_.reportChanged()
                } else {
                    const iter1 = this.data_.keys()
                    const iter2 = orderedData.keys()
                    let next1 = iter1.next()
                    let next2 = iter2.next()
                    while (!next1.done) {
                        if (next1.value !== next2.value) {
                            this.keysAtom_.reportChanged()
                            break
                        }
                        next1 = iter1.next()
                        next2 = iter2.next()
                    }
                }
            }
            // Use correctly ordered map
            this.data_ = orderedData
        })
        return this
    }

    get size(): number {
        this.keysAtom_.reportObserved()
        return this.data_.size
    }

    toString(): string {
        return "[object ObservableMap]"
    }

    toJSON(): [K, V][] {
        return Array.from(this)
    }

    get [Symbol.toStringTag]() {
        return "Map"
    }

    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    observe_(listener: (changes: IMapDidChange<K, V>) => void, fireImmediately?: boolean): Lambda {
        if (__DEV__ && fireImmediately === true) {
            die("`observe` doesn't support fireImmediately=true in combination with maps.")
        }
        return registerListener(this, listener)
    }

    intercept_(handler: IInterceptor<IMapWillChange<K, V>>): Lambda {
        return registerInterceptor(this, handler)
    }
}

// eslint-disable-next-line
export var isObservableMap = createInstanceofPredicate("ObservableMap", ObservableMap) as (
    thing: any
) => thing is ObservableMap<any, any>

function convertToMap(dataStructure: any): Map<any, any> {
    if (isES6Map(dataStructure) || isObservableMap(dataStructure)) {
        return dataStructure
    } else if (Array.isArray(dataStructure)) {
        return new Map(dataStructure)
    } else if (isPlainObject(dataStructure)) {
        const map = new Map()
        for (const key in dataStructure) {
            map.set(key, dataStructure[key])
        }
        return map
    } else {
        return die(21, dataStructure)
    }
}
