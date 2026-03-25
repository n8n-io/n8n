import {
    EMPTY_OBJECT,
    IEqualsComparer,
    IReactionDisposer,
    IReactionPublic,
    Lambda,
    Reaction,
    action,
    comparer,
    getNextId,
    isAction,
    isFunction,
    isPlainObject,
    die,
    allowStateChanges,
    GenericAbortSignal
} from "../internal"

export interface IAutorunOptions {
    delay?: number
    name?: string
    /**
     * Experimental.
     * Warns if the view doesn't track observables
     */
    requiresObservable?: boolean
    scheduler?: (callback: () => void) => any
    onError?: (error: any) => void
    signal?: GenericAbortSignal
}

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(
    view: (r: IReactionPublic) => any,
    opts: IAutorunOptions = EMPTY_OBJECT
): IReactionDisposer {
    if (__DEV__) {
        if (!isFunction(view)) {
            die("Autorun expects a function as first argument")
        }
        if (isAction(view)) {
            die("Autorun does not accept actions since actions are untrackable")
        }
    }

    const name: string =
        opts?.name ?? (__DEV__ ? (view as any).name || "Autorun@" + getNextId() : "Autorun")
    const runSync = !opts.scheduler && !opts.delay
    let reaction: Reaction

    if (runSync) {
        // normal autorun
        reaction = new Reaction(
            name,
            function (this: Reaction) {
                this.track(reactionRunner)
            },
            opts.onError,
            opts.requiresObservable
        )
    } else {
        const scheduler = createSchedulerFromOptions(opts)
        // debounced autorun
        let isScheduled = false

        reaction = new Reaction(
            name,
            () => {
                if (!isScheduled) {
                    isScheduled = true
                    scheduler(() => {
                        isScheduled = false
                        if (!reaction.isDisposed_) {
                            reaction.track(reactionRunner)
                        }
                    })
                }
            },
            opts.onError,
            opts.requiresObservable
        )
    }

    function reactionRunner() {
        view(reaction)
    }

    if(!opts?.signal?.aborted) {
        reaction.schedule_()
    }
    return reaction.getDisposer_(opts?.signal)
}

export type IReactionOptions<T, FireImmediately extends boolean> = IAutorunOptions & {
    fireImmediately?: FireImmediately
    equals?: IEqualsComparer<T>
}

const run = (f: Lambda) => f()

function createSchedulerFromOptions(opts: IAutorunOptions) {
    return opts.scheduler
        ? opts.scheduler
        : opts.delay
        ? (f: Lambda) => setTimeout(f, opts.delay!)
        : run
}

export function reaction<T, FireImmediately extends boolean = false>(
    expression: (r: IReactionPublic) => T,
    effect: (
        arg: T,
        prev: FireImmediately extends true ? T | undefined : T,
        r: IReactionPublic
    ) => void,
    opts: IReactionOptions<T, FireImmediately> = EMPTY_OBJECT
): IReactionDisposer {
    if (__DEV__) {
        if (!isFunction(expression) || !isFunction(effect)) {
            die("First and second argument to reaction should be functions")
        }
        if (!isPlainObject(opts)) {
            die("Third argument of reactions should be an object")
        }
    }
    const name = opts.name ?? (__DEV__ ? "Reaction@" + getNextId() : "Reaction")
    const effectAction = action(
        name,
        opts.onError ? wrapErrorHandler(opts.onError, effect) : effect
    )
    const runSync = !opts.scheduler && !opts.delay
    const scheduler = createSchedulerFromOptions(opts)

    let firstTime = true
    let isScheduled = false
    let value: T
    let oldValue: T | undefined

    const equals: IEqualsComparer<T> = (opts as any).compareStructural
        ? comparer.structural
        : opts.equals || comparer.default

    const r = new Reaction(
        name,
        () => {
            if (firstTime || runSync) {
                reactionRunner()
            } else if (!isScheduled) {
                isScheduled = true
                scheduler!(reactionRunner)
            }
        },
        opts.onError,
        opts.requiresObservable
    )

    function reactionRunner() {
        isScheduled = false
        if (r.isDisposed_) {
            return
        }
        let changed: boolean = false
        r.track(() => {
            const nextValue = allowStateChanges(false, () => expression(r))
            changed = firstTime || !equals(value, nextValue)
            oldValue = value
            value = nextValue
        })

        // This casting is nesessary as TS cannot infer proper type in current funciton implementation
        type OldValue = FireImmediately extends true ? T | undefined : T
        if (firstTime && opts.fireImmediately!) {
            effectAction(value, oldValue as OldValue, r)
        } else if (!firstTime && changed) {
            effectAction(value, oldValue as OldValue, r)
        }
        firstTime = false
    }

    if(!opts?.signal?.aborted) {
        r.schedule_()
    }
    return r.getDisposer_(opts?.signal)
}

function wrapErrorHandler(errorHandler, baseFn) {
    return function () {
        try {
            return baseFn.apply(this, arguments)
        } catch (e) {
            errorHandler.call(this, e)
        }
    }
}
