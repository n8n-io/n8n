import {
    CaughtException,
    IDerivation,
    IDerivationState_,
    IEqualsComparer,
    IObservable,
    Lambda,
    TraceMode,
    autorun,
    clearObserving,
    comparer,
    createAction,
    createInstanceofPredicate,
    endBatch,
    getNextId,
    globalState,
    isCaughtException,
    isSpyEnabled,
    propagateChangeConfirmed,
    propagateMaybeChanged,
    reportObserved,
    shouldCompute,
    spyReport,
    startBatch,
    toPrimitive,
    trackDerivedFunction,
    untrackedEnd,
    untrackedStart,
    UPDATE,
    die,
    allowStateChangesStart,
    allowStateChangesEnd
} from "../internal"

export interface IComputedValue<T> {
    get(): T
    set(value: T): void
}

export interface IComputedValueOptions<T> {
    get?: () => T
    set?: (value: T) => void
    name?: string
    equals?: IEqualsComparer<T>
    context?: any
    requiresReaction?: boolean
    keepAlive?: boolean
}

export type IComputedDidChange<T = any> = {
    type: "update"
    observableKind: "computed"
    object: unknown
    debugObjectName: string
    newValue: T
    oldValue: T | undefined
}

/**
 * A node in the state dependency root that observes other nodes, and can be observed itself.
 *
 * ComputedValue will remember the result of the computation for the duration of the batch, or
 * while being observed.
 *
 * During this time it will recompute only when one of its direct dependencies changed,
 * but only when it is being accessed with `ComputedValue.get()`.
 *
 * Implementation description:
 * 1. First time it's being accessed it will compute and remember result
 *    give back remembered result until 2. happens
 * 2. First time any deep dependency change, propagate POSSIBLY_STALE to all observers, wait for 3.
 * 3. When it's being accessed, recompute if any shallow dependency changed.
 *    if result changed: propagate STALE to all observers, that were POSSIBLY_STALE from the last step.
 *    go to step 2. either way
 *
 * If at any point it's outside batch and it isn't observed: reset everything and go to 1.
 */
export class ComputedValue<T> implements IObservable, IComputedValue<T>, IDerivation {
    dependenciesState_ = IDerivationState_.NOT_TRACKING_
    observing_: IObservable[] = [] // nodes we are looking at. Our value depends on these nodes
    newObserving_ = null // during tracking it's an array with new observed observers
    isBeingObserved_ = false
    isPendingUnobservation_: boolean = false
    observers_ = new Set<IDerivation>()
    diffValue_ = 0
    runId_ = 0
    lastAccessedBy_ = 0
    lowestObserverState_ = IDerivationState_.UP_TO_DATE_
    unboundDepsCount_ = 0
    protected value_: T | undefined | CaughtException = new CaughtException(null)
    name_: string
    triggeredBy_?: string
    isComputing_: boolean = false // to check for cycles
    isRunningSetter_: boolean = false
    derivation: () => T // N.B: unminified as it is used by MST
    setter_?: (value: T) => void
    isTracing_: TraceMode = TraceMode.NONE
    scope_: Object | undefined
    private equals_: IEqualsComparer<any>
    private requiresReaction_: boolean | undefined
    keepAlive_: boolean

    /**
     * Create a new computed value based on a function expression.
     *
     * The `name` property is for debug purposes only.
     *
     * The `equals` property specifies the comparer function to use to determine if a newly produced
     * value differs from the previous value. Two comparers are provided in the library; `defaultComparer`
     * compares based on identity comparison (===), and `structuralComparer` deeply compares the structure.
     * Structural comparison can be convenient if you always produce a new aggregated object and
     * don't want to notify observers if it is structurally the same.
     * This is useful for working with vectors, mouse coordinates etc.
     */
    constructor(options: IComputedValueOptions<T>) {
        if (!options.get) {
            die(31)
        }
        this.derivation = options.get!
        this.name_ = options.name || (__DEV__ ? "ComputedValue@" + getNextId() : "ComputedValue")
        if (options.set) {
            this.setter_ = createAction(
                __DEV__ ? this.name_ + "-setter" : "ComputedValue-setter",
                options.set
            ) as any
        }
        this.equals_ =
            options.equals ||
            ((options as any).compareStructural || (options as any).struct
                ? comparer.structural
                : comparer.default)
        this.scope_ = options.context
        this.requiresReaction_ = options.requiresReaction
        this.keepAlive_ = !!options.keepAlive
    }

    onBecomeStale_() {
        propagateMaybeChanged(this)
    }

    public onBOL: Set<Lambda> | undefined
    public onBUOL: Set<Lambda> | undefined

    public onBO() {
        if (this.onBOL) {
            this.onBOL.forEach(listener => listener())
        }
    }

    public onBUO() {
        if (this.onBUOL) {
            this.onBUOL.forEach(listener => listener())
        }
    }

    /**
     * Returns the current value of this computed value.
     * Will evaluate its computation first if needed.
     */
    public get(): T {
        if (this.isComputing_) {
            die(32, this.name_, this.derivation)
        }
        if (
            globalState.inBatch === 0 &&
            // !globalState.trackingDerivatpion &&
            this.observers_.size === 0 &&
            !this.keepAlive_
        ) {
            if (shouldCompute(this)) {
                this.warnAboutUntrackedRead_()
                startBatch() // See perf test 'computed memoization'
                this.value_ = this.computeValue_(false)
                endBatch()
            }
        } else {
            reportObserved(this)
            if (shouldCompute(this)) {
                let prevTrackingContext = globalState.trackingContext
                if (this.keepAlive_ && !prevTrackingContext) {
                    globalState.trackingContext = this
                }
                if (this.trackAndCompute()) {
                    propagateChangeConfirmed(this)
                }
                globalState.trackingContext = prevTrackingContext
            }
        }
        const result = this.value_!

        if (isCaughtException(result)) {
            throw result.cause
        }
        return result
    }

    public set(value: T) {
        if (this.setter_) {
            if (this.isRunningSetter_) {
                die(33, this.name_)
            }
            this.isRunningSetter_ = true
            try {
                this.setter_.call(this.scope_, value)
            } finally {
                this.isRunningSetter_ = false
            }
        } else {
            die(34, this.name_)
        }
    }

    trackAndCompute(): boolean {
        // N.B: unminified as it is used by MST
        const oldValue = this.value_
        const wasSuspended =
            /* see #1208 */ this.dependenciesState_ === IDerivationState_.NOT_TRACKING_
        const newValue = this.computeValue_(true)

        const changed =
            wasSuspended ||
            isCaughtException(oldValue) ||
            isCaughtException(newValue) ||
            !this.equals_(oldValue, newValue)

        if (changed) {
            this.value_ = newValue

            if (__DEV__ && isSpyEnabled()) {
                spyReport({
                    observableKind: "computed",
                    debugObjectName: this.name_,
                    object: this.scope_,
                    type: "update",
                    oldValue,
                    newValue
                } as IComputedDidChange)
            }
        }

        return changed
    }

    computeValue_(track: boolean) {
        this.isComputing_ = true
        // don't allow state changes during computation
        const prev = allowStateChangesStart(false)
        let res: T | CaughtException
        if (track) {
            res = trackDerivedFunction(this, this.derivation, this.scope_)
        } else {
            if (globalState.disableErrorBoundaries === true) {
                res = this.derivation.call(this.scope_)
            } else {
                try {
                    res = this.derivation.call(this.scope_)
                } catch (e) {
                    res = new CaughtException(e)
                }
            }
        }
        allowStateChangesEnd(prev)
        this.isComputing_ = false
        return res
    }

    suspend_() {
        if (!this.keepAlive_) {
            clearObserving(this)
            this.value_ = undefined // don't hold on to computed value!
            if (__DEV__ && this.isTracing_ !== TraceMode.NONE) {
                console.log(
                    `[mobx.trace] Computed value '${this.name_}' was suspended and it will recompute on the next access.`
                )
            }
        }
    }

    observe_(listener: (change: IComputedDidChange<T>) => void, fireImmediately?: boolean): Lambda {
        let firstTime = true
        let prevValue: T | undefined = undefined
        return autorun(() => {
            // TODO: why is this in a different place than the spyReport() function? in all other observables it's called in the same place
            let newValue = this.get()
            if (!firstTime || fireImmediately) {
                const prevU = untrackedStart()
                listener({
                    observableKind: "computed",
                    debugObjectName: this.name_,
                    type: UPDATE,
                    object: this,
                    newValue,
                    oldValue: prevValue
                })
                untrackedEnd(prevU)
            }
            firstTime = false
            prevValue = newValue
        })
    }

    warnAboutUntrackedRead_() {
        if (!__DEV__) {
            return
        }
        if (this.isTracing_ !== TraceMode.NONE) {
            console.log(
                `[mobx.trace] Computed value '${this.name_}' is being read outside a reactive context. Doing a full recompute.`
            )
        }
        if (
            typeof this.requiresReaction_ === "boolean"
                ? this.requiresReaction_
                : globalState.computedRequiresReaction
        ) {
            console.warn(
                `[mobx] Computed value '${this.name_}' is being read outside a reactive context. Doing a full recompute.`
            )
        }
    }

    toString() {
        return `${this.name_}[${this.derivation.toString()}]`
    }

    valueOf(): T {
        return toPrimitive(this.get())
    }

    [Symbol.toPrimitive]() {
        return this.valueOf()
    }
}

export const isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue)
