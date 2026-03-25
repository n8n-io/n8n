import {
    $mobx,
    createAtom,
    deepEnhancer,
    getNextId,
    IEnhancer,
    isSpyEnabled,
    hasListeners,
    IListenable,
    registerListener,
    Lambda,
    spyReportStart,
    notifyListeners,
    spyReportEnd,
    createInstanceofPredicate,
    hasInterceptors,
    interceptChange,
    IInterceptable,
    IInterceptor,
    registerInterceptor,
    checkIfStateModificationsAreAllowed,
    untracked,
    makeIterable,
    transaction,
    isES6Set,
    IAtom,
    DELETE,
    ADD,
    die,
    isFunction,
    initObservable
} from "../internal"

const ObservableSetMarker = {}

export type IObservableSetInitialValues<T> = Set<T> | readonly T[]

export type ISetDidChange<T = any> =
    | {
          object: ObservableSet<T>
          observableKind: "set"
          debugObjectName: string
          type: "add"
          newValue: T
      }
    | {
          object: ObservableSet<T>
          observableKind: "set"
          debugObjectName: string
          type: "delete"
          oldValue: T
      }

export type ISetWillChange<T = any> =
    | {
          type: "delete"
          object: ObservableSet<T>
          oldValue: T
      }
    | {
          type: "add"
          object: ObservableSet<T>
          newValue: T
      }

export class ObservableSet<T = any> implements Set<T>, IInterceptable<ISetWillChange>, IListenable {
    [$mobx] = ObservableSetMarker
    private data_: Set<any> = new Set()
    atom_!: IAtom
    changeListeners_
    interceptors_
    dehancer: any
    enhancer_: (newV: any, oldV: any | undefined) => any

    constructor(
        initialData?: IObservableSetInitialValues<T>,
        enhancer: IEnhancer<T> = deepEnhancer,
        public name_ = __DEV__ ? "ObservableSet@" + getNextId() : "ObservableSet"
    ) {
        if (!isFunction(Set)) {
            die(22)
        }
        this.enhancer_ = (newV, oldV) => enhancer(newV, oldV, name_)
        initObservable(() => {
            this.atom_ = createAtom(this.name_)
            if (initialData) {
                this.replace(initialData)
            }
        })
    }

    private dehanceValue_<X extends T | undefined>(value: X): X {
        if (this.dehancer !== undefined) {
            return this.dehancer(value)
        }
        return value
    }

    clear() {
        transaction(() => {
            untracked(() => {
                for (const value of this.data_.values()) {
                    this.delete(value)
                }
            })
        })
    }

    forEach(callbackFn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any) {
        for (const value of this) {
            callbackFn.call(thisArg, value, value, this)
        }
    }

    get size() {
        this.atom_.reportObserved()
        return this.data_.size
    }

    add(value: T) {
        checkIfStateModificationsAreAllowed(this.atom_)
        if (hasInterceptors(this)) {
            const change = interceptChange<ISetWillChange<T>>(this, {
                type: ADD,
                object: this,
                newValue: value
            })
            if (!change) {
                return this
            }
            // ideally, value = change.value would be done here, so that values can be
            // changed by interceptor. Same applies for other Set and Map api's.
        }
        if (!this.has(value)) {
            transaction(() => {
                this.data_.add(this.enhancer_(value, undefined))
                this.atom_.reportChanged()
            })
            const notifySpy = __DEV__ && isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <ISetDidChange<T>>{
                          observableKind: "set",
                          debugObjectName: this.name_,
                          type: ADD,
                          object: this,
                          newValue: value
                      }
                    : null
            if (notifySpy && __DEV__) {
                spyReportStart(change!)
            }
            if (notify) {
                notifyListeners(this, change)
            }
            if (notifySpy && __DEV__) {
                spyReportEnd()
            }
        }

        return this
    }

    delete(value: T) {
        if (hasInterceptors(this)) {
            const change = interceptChange<ISetWillChange<T>>(this, {
                type: DELETE,
                object: this,
                oldValue: value
            })
            if (!change) {
                return false
            }
        }
        if (this.has(value)) {
            const notifySpy = __DEV__ && isSpyEnabled()
            const notify = hasListeners(this)
            const change =
                notify || notifySpy
                    ? <ISetDidChange<T>>{
                          observableKind: "set",
                          debugObjectName: this.name_,
                          type: DELETE,
                          object: this,
                          oldValue: value
                      }
                    : null

            if (notifySpy && __DEV__) {
                spyReportStart(change!)
            }
            transaction(() => {
                this.atom_.reportChanged()
                this.data_.delete(value)
            })
            if (notify) {
                notifyListeners(this, change)
            }
            if (notifySpy && __DEV__) {
                spyReportEnd()
            }
            return true
        }
        return false
    }

    has(value: T) {
        this.atom_.reportObserved()
        return this.data_.has(this.dehanceValue_(value))
    }

    entries() {
        let nextIndex = 0
        const keys = Array.from(this.keys())
        const values = Array.from(this.values())
        return makeIterable<[T, T]>({
            next() {
                const index = nextIndex
                nextIndex += 1
                return index < values.length
                    ? { value: [keys[index], values[index]], done: false }
                    : { done: true }
            }
        } as any)
    }

    keys(): IterableIterator<T> {
        return this.values()
    }

    values(): IterableIterator<T> {
        this.atom_.reportObserved()
        const self = this
        let nextIndex = 0
        const observableValues = Array.from(this.data_.values())
        return makeIterable<T>({
            next() {
                return nextIndex < observableValues.length
                    ? { value: self.dehanceValue_(observableValues[nextIndex++]), done: false }
                    : { done: true }
            }
        } as any)
    }

    replace(other: ObservableSet<T> | IObservableSetInitialValues<T>): ObservableSet<T> {
        if (isObservableSet(other)) {
            other = new Set(other)
        }

        transaction(() => {
            if (Array.isArray(other)) {
                this.clear()
                other.forEach(value => this.add(value))
            } else if (isES6Set(other)) {
                this.clear()
                other.forEach(value => this.add(value))
            } else if (other !== null && other !== undefined) {
                die("Cannot initialize set from " + other)
            }
        })

        return this
    }
    observe_(listener: (changes: ISetDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        // ... 'fireImmediately' could also be true?
        if (__DEV__ && fireImmediately === true) {
            die("`observe` doesn't support fireImmediately=true in combination with sets.")
        }
        return registerListener(this, listener)
    }

    intercept_(handler: IInterceptor<ISetWillChange<T>>): Lambda {
        return registerInterceptor(this, handler)
    }

    toJSON(): T[] {
        return Array.from(this)
    }

    toString(): string {
        return "[object ObservableSet]"
    }

    [Symbol.iterator]() {
        return this.values()
    }

    get [Symbol.toStringTag]() {
        return "Set"
    }
}

// eslint-disable-next-line
export var isObservableSet = createInstanceofPredicate("ObservableSet", ObservableSet) as (
    thing: any
) => thing is ObservableSet<any>
