import * as vue_demi from 'vue-demi';
import { WatchOptionsBase, Ref, ComputedRef, WritableComputedRef, WatchSource, ComputedGetter, WritableComputedOptions, ShallowUnwrapRef as ShallowUnwrapRef$1, WatchOptions, UnwrapRef, ToRefs, WatchCallback, WatchStopHandle } from 'vue-demi';

declare function computedEager<T>(fn: () => T, options?: WatchOptionsBase): Readonly<Ref<T>>;

interface ComputedWithControlRefExtra {
    /**
     * Force update the computed value.
     */
    trigger(): void;
}
interface ComputedRefWithControl<T> extends ComputedRef<T>, ComputedWithControlRefExtra {
}
interface WritableComputedRefWithControl<T> extends WritableComputedRef<T>, ComputedWithControlRefExtra {
}
declare function computedWithControl<T, S>(source: WatchSource<S> | WatchSource<S>[], fn: ComputedGetter<T>): ComputedRefWithControl<T>;
declare function computedWithControl<T, S>(source: WatchSource<S> | WatchSource<S>[], fn: WritableComputedOptions<T>): WritableComputedRefWithControl<T>;

type EventHookOn<T = any> = (fn: (param: T) => void) => {
    off: () => void;
};
type EventHookOff<T = any> = (fn: (param: T) => void) => void;
type EventHookTrigger<T = any> = (param: T) => void;
interface EventHook<T = any> {
    on: EventHookOn<T>;
    off: EventHookOff<T>;
    trigger: EventHookTrigger<T>;
}
/**
 * Utility for creating event hooks
 *
 * @see https://vueuse.org/createEventHook
 */
declare function createEventHook<T = any>(): EventHook<T>;

type CreateGlobalStateReturn<T> = () => T;
/**
 * Keep states in the global scope to be reusable across Vue instances.
 *
 * @see https://vueuse.org/createGlobalState
 * @param stateFactory A factory function to create the state
 */
declare function createGlobalState<T>(stateFactory: () => T): CreateGlobalStateReturn<T>;

/**
 * Create global state that can be injected into components.
 *
 * @see https://vueuse.org/createInjectionState
 *
 */
declare function createInjectionState<Arguments extends Array<any>, Return>(composable: (...args: Arguments) => Return): readonly [useProvidingState: (...args: Arguments) => Return, useInjectedState: () => Return | undefined];

/**
 * Make a composable function usable with multiple Vue instances.
 *
 * @see https://vueuse.org/createSharedComposable
 */
declare function createSharedComposable<Fn extends ((...args: any[]) => any)>(composable: Fn): Fn;

interface ExtendRefOptions<Unwrap extends boolean = boolean> {
    /**
     * Is the extends properties enumerable
     *
     * @default false
     */
    enumerable?: boolean;
    /**
     * Unwrap for Ref properties
     *
     * @default true
     */
    unwrap?: Unwrap;
}
/**
 * Overload 1: Unwrap set to false
 */
declare function extendRef<R extends Ref<any>, Extend extends object, Options extends ExtendRefOptions<false>>(ref: R, extend: Extend, options?: Options): ShallowUnwrapRef$1<Extend> & R;
/**
 * Overload 2: Unwrap unset or set to true
 */
declare function extendRef<R extends Ref<any>, Extend extends object, Options extends ExtendRefOptions>(ref: R, extend: Extend, options?: Options): Extend & R;

declare const isClient: boolean;
declare const isDef: <T = any>(val?: T | undefined) => val is T;
declare const assert: (condition: boolean, ...infos: any[]) => void;
declare const isBoolean: (val: any) => val is boolean;
declare const isFunction: <T extends Function>(val: any) => val is T;
declare const isNumber: (val: any) => val is number;
declare const isString: (val: unknown) => val is string;
declare const isObject: (val: any) => val is object;
declare const isWindow: (val: any) => val is Window;
declare const now: () => number;
declare const timestamp: () => number;
declare const clamp: (n: number, min: number, max: number) => number;
declare const noop: () => void;
declare const rand: (min: number, max: number) => number;
declare const isIOS: boolean | "";
declare const hasOwn: <T extends object, K extends keyof T>(val: T, key: K) => key is K;

/**
 * Void function
 */
type Fn = () => void;
/**
 * Any function
 */
type AnyFn = (...args: any[]) => any;
/**
 * A ref that allow to set null or undefined
 */
type RemovableRef<T> = Omit<Ref<T>, 'value'> & {
    get value(): T;
    set value(value: T | null | undefined);
};
/**
 * @deprecated Use `RemovableRef`
 */
type RemoveableRef<T> = RemovableRef<T>;
/**
 * Maybe it's a ref, or a plain value
 *
 * ```ts
 * type MaybeRef<T> = T | Ref<T>
 * ```
 */
type MaybeRef<T> = T | Ref<T>;
/**
 * Maybe it's a ref, or a plain value, or a getter function
 *
 * ```ts
 * type MaybeComputedRef<T> = (() => T) | T | Ref<T> | ComputedRef<T>
 * ```
 */
type MaybeComputedRef<T> = MaybeReadonlyRef<T> | MaybeRef<T>;
/**
 * Maybe it's a computed ref, or a getter function
 *
 * ```ts
 * type MaybeReadonlyRef<T> = (() => T) | ComputedRef<T>
 * ```
 */
type MaybeReadonlyRef<T> = (() => T) | ComputedRef<T>;
/**
 * Make all the nested attributes of an object or array to MaybeRef<T>
 *
 * Good for accepting options that will be wrapped with `reactive` or `ref`
 *
 * ```ts
 * UnwrapRef<DeepMaybeRef<T>> === T
 * ```
 */
type DeepMaybeRef<T> = T extends Ref<infer V> ? MaybeRef<V> : T extends Array<any> | object ? {
    [K in keyof T]: DeepMaybeRef<T[K]>;
} : MaybeRef<T>;
type Arrayable<T> = T[] | T;
/**
 * Infers the element type of an array
 */
type ElementOf<T> = T extends (infer E)[] ? E : never;
type ShallowUnwrapRef<T> = T extends Ref<infer P> ? P : T;
type Awaitable<T> = Promise<T> | T;
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;
type PromisifyFn<T extends AnyFn> = (...args: ArgumentsType<T>) => Promise<ReturnType<T>>;
interface Pausable {
    /**
     * A ref indicate whether a pausable instance is active
     */
    isActive: Readonly<Ref<boolean>>;
    /**
     * Temporary pause the effect from executing
     */
    pause: Fn;
    /**
     * Resume the effects
     */
    resume: Fn;
}
interface Stoppable<StartFnArgs extends any[] = any[]> {
    /**
     * A ref indicate whether a stoppable instance is executing
     */
    isPending: Readonly<Ref<boolean>>;
    /**
     * Stop the effect from executing
     */
    stop: Fn;
    /**
     * Start the effects
     */
    start: (...args: StartFnArgs) => void;
}
/**
 * @deprecated Use `Stoppable`
 */
type Stopable = Stoppable;
interface ConfigurableFlush {
    /**
     * Timing for monitoring changes, refer to WatchOptions for more details
     *
     * @default 'pre'
     */
    flush?: WatchOptions['flush'];
}
interface ConfigurableFlushSync {
    /**
     * Timing for monitoring changes, refer to WatchOptions for more details.
     * Unlike `watch()`, the default is set to `sync`
     *
     * @default 'sync'
     */
    flush?: WatchOptions['flush'];
}
type MapSources<T> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? V : never;
};
type MapOldSources<T, Immediate> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? Immediate extends true ? V | undefined : V : never;
};

type FunctionArgs<Args extends any[] = any[], Return = void> = (...args: Args) => Return;
interface FunctionWrapperOptions<Args extends any[] = any[], This = any> {
    fn: FunctionArgs<Args, This>;
    args: Args;
    thisArg: This;
}
type EventFilter<Args extends any[] = any[], This = any, Invoke extends AnyFn = AnyFn> = (invoke: Invoke, options: FunctionWrapperOptions<Args, This>) => ReturnType<Invoke> | Promise<ReturnType<Invoke>>;
interface ConfigurableEventFilter {
    /**
     * Filter for if events should to be received.
     *
     * @see https://vueuse.org/guide/config.html#event-filters
     */
    eventFilter?: EventFilter;
}
interface DebounceFilterOptions {
    /**
     * The maximum time allowed to be delayed before it's invoked.
     * In milliseconds.
     */
    maxWait?: MaybeComputedRef<number>;
    /**
     * Whether to reject the last call if it's been cancel.
     *
     * @default false
     */
    rejectOnCancel?: boolean;
}
/**
 * @internal
 */
declare function createFilterWrapper<T extends AnyFn>(filter: EventFilter, fn: T): (this: any, ...args: ArgumentsType<T>) => Promise<ReturnType<T>>;
declare const bypassFilter: EventFilter;
/**
 * Create an EventFilter that debounce the events
 *
 * @param ms
 * @param options
 */
declare function debounceFilter(ms: MaybeComputedRef<number>, options?: DebounceFilterOptions): EventFilter<any[], any, AnyFn>;
/**
 * Create an EventFilter that throttle the events
 *
 * @param ms
 * @param [trailing=true]
 * @param [leading=true]
 * @param [rejectOnCancel=false]
 */
declare function throttleFilter(ms: MaybeComputedRef<number>, trailing?: boolean, leading?: boolean, rejectOnCancel?: boolean): EventFilter<any[], any, AnyFn>;
/**
 * EventFilter that gives extra controls to pause and resume the filter
 *
 * @param extendFilter  Extra filter to apply when the PausableFilter is active, default to none
 *
 */
declare function pausableFilter(extendFilter?: EventFilter): Pausable & {
    eventFilter: EventFilter;
};

declare function __onlyVue3(name?: string): void;
declare function __onlyVue27Plus(name?: string): void;
declare const directiveHooks: {
    mounted: "mounted";
    updated: "updated";
    unmounted: "unmounted";
};

declare function promiseTimeout(ms: number, throwOnTimeout?: boolean, reason?: string): Promise<void>;
declare function identity<T>(arg: T): T;
interface SingletonPromiseReturn<T> {
    (): Promise<T>;
    /**
     * Reset current staled promise.
     * await it to have proper shutdown.
     */
    reset: () => Promise<void>;
}
/**
 * Create singleton promise function
 *
 * @example
 * ```
 * const promise = createSingletonPromise(async () => { ... })
 *
 * await promise()
 * await promise() // all of them will be bind to a single promise instance
 * await promise() // and be resolved together
 * ```
 */
declare function createSingletonPromise<T>(fn: () => Promise<T>): SingletonPromiseReturn<T>;
declare function invoke<T>(fn: () => T): T;
declare function containsProp(obj: object, ...props: string[]): boolean;
/**
 * Increase string a value with unit
 *
 * @example '2px' + 1 = '3px'
 * @example '15em' + (-2) = '13em'
 */
declare function increaseWithUnit(target: number, delta: number): number;
declare function increaseWithUnit(target: string, delta: number): string;
declare function increaseWithUnit(target: string | number, delta: number): string | number;
/**
 * Create a new subset object by giving keys
 *
 * @category Object
 */
declare function objectPick<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined?: boolean): Pick<O, T>;

/**
 * Shorthand for accessing `ref.value`
 */
declare function get<T>(ref: MaybeRef<T>): T;
declare function get<T, K extends keyof T>(ref: MaybeRef<T>, key: K): T[K];

declare function isDefined<T>(v: Ref<T>): v is Ref<Exclude<T, null | undefined>>;
declare function isDefined<T>(v: ComputedRef<T>): v is ComputedRef<Exclude<T, null | undefined>>;
declare function isDefined<T>(v: T): v is Exclude<T, null | undefined>;

declare function makeDestructurable<T extends Record<string, unknown>, A extends readonly any[]>(obj: T, arr: A): T & A;

type Reactified<T, Computed extends boolean> = T extends (...args: infer A) => infer R ? (...args: {
    [K in keyof A]: Computed extends true ? MaybeComputedRef<A[K]> : MaybeRef<A[K]>;
}) => ComputedRef<R> : never;
interface ReactifyOptions<T extends boolean> {
    /**
     * Accept passing a function as a reactive getter
     *
     * @default true
     */
    computedGetter?: T;
}
/**
 * Converts plain function into a reactive function.
 * The converted function accepts refs as it's arguments
 * and returns a ComputedRef, with proper typing.
 *
 * @param fn - Source function
 */
declare function reactify<T extends Function, K extends boolean = true>(fn: T, options?: ReactifyOptions<K>): Reactified<T, K>;

type ReactifyNested<T, Keys extends keyof T = keyof T, S extends boolean = true> = {
    [K in Keys]: T[K] extends (...args: any[]) => any ? Reactified<T[K], S> : T[K];
};
interface ReactifyObjectOptions<T extends boolean> extends ReactifyOptions<T> {
    /**
     * Includes names from Object.getOwnPropertyNames
     *
     * @default true
     */
    includeOwnProperties?: boolean;
}
/**
 * Apply `reactify` to an object
 */
declare function reactifyObject<T extends object, Keys extends keyof T>(obj: T, keys?: (keyof T)[]): ReactifyNested<T, Keys, true>;
declare function reactifyObject<T extends object, S extends boolean = true>(obj: T, options?: ReactifyObjectOptions<S>): ReactifyNested<T, keyof T, S>;

/**
 * Computed reactive object.
 */
declare function reactiveComputed<T extends {}>(fn: () => T): T;

/**
 * Reactively omit fields from a reactive object
 *
 * @see https://vueuse.org/reactiveOmit
 */
declare function reactiveOmit<T extends object, K extends keyof T>(obj: T, ...keys: (K | K[])[]): Omit<T, K>;

/**
 * Reactively pick fields from a reactive object
 *
 * @see https://vueuse.org/reactivePick
 */
declare function reactivePick<T extends object, K extends keyof T>(obj: T, ...keys: (K | K[])[]): {
    [S in K]: UnwrapRef<T[S]>;
};

/**
 * Create a ref which will be reset to the default value after some time.
 *
 * @see https://vueuse.org/refAutoReset
 * @param defaultValue The value which will be set.
 * @param afterMs      A zero-or-greater delay in milliseconds.
 */
declare function refAutoReset<T>(defaultValue: T, afterMs?: MaybeComputedRef<number>): Ref<T>;

/**
 * Debounce updates of a ref.
 *
 * @return A new debounced ref.
 */
declare function refDebounced<T>(value: Ref<T>, ms?: MaybeComputedRef<number>, options?: DebounceFilterOptions): Readonly<Ref<T>>;

/**
 * Apply default value to a ref.
 *
 * @param source source ref
 * @param targets
 */
declare function refDefault<T>(source: Ref<T | undefined | null>, defaultValue: T): Ref<T>;

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param value Ref value to be watched with throttle effect
 * @param  delay  A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param [trailing=true] if true, update the value again after the delay time is up
 * @param [leading=true] if true, update the value on the leading edge of the ms timeout
 */
declare function refThrottled<T>(value: Ref<T>, delay?: number, trailing?: boolean, leading?: boolean): Ref<T>;

interface ControlledRefOptions<T> {
    /**
     * Callback function before the ref changing.
     *
     * Returning `false` to dismiss the change.
     */
    onBeforeChange?: (value: T, oldValue: T) => void | boolean;
    /**
     * Callback function after the ref changed
     *
     * This happens synchronously, with less overhead compare to `watch`
     */
    onChanged?: (value: T, oldValue: T) => void;
}
/**
 * Explicitly define the deps of computed.
 *
 * @param source
 * @param fn
 */
declare function refWithControl<T>(initial: T, options?: ControlledRefOptions<T>): vue_demi.ShallowUnwrapRef<{
    get: (tracking?: boolean) => T;
    set: (value: T, triggering?: boolean) => void;
    untrackedGet: () => T;
    silentSet: (v: T) => void;
    peek: () => T;
    lay: (v: T) => void;
}> & vue_demi.Ref<T>;
/**
 * Alias for `refWithControl`
 */
declare const controlledRef: typeof refWithControl;

/**
 * Normalize value/ref/getter to `ref` or `computed`.
 */
declare function resolveRef<T>(r: MaybeComputedRef<T>): ComputedRef<T>;
declare function resolveRef<T>(r: MaybeRef<T>): Ref<T>;
declare function resolveRef<T>(r: T): Ref<T>;

/**
 * Get the value of value/ref/getter.
 */
declare function resolveUnref<T>(r: MaybeComputedRef<T>): T;

declare function set<T>(ref: Ref<T>, value: T): void;
declare function set<O extends object, K extends keyof O>(target: O, key: K, value: O[K]): void;

interface SyncRefOptions<L, R = L> extends ConfigurableFlushSync {
    /**
     * Watch deeply
     *
     * @default false
     */
    deep?: boolean;
    /**
     * Sync values immediately
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Direction of syncing. Value will be redefined if you define syncConvertors
     *
     * @default 'both'
     */
    direction?: 'ltr' | 'rtl' | 'both';
    /**
     * Custom transform function
     */
    transform?: {
        ltr?: (left: L) => R;
        rtl?: (right: R) => L;
    };
}
/**
 * Two-way refs synchronization.
 *
 * @param left
 * @param right
 */
declare function syncRef<L, R = L>(left: Ref<L>, right: Ref<R>, options?: SyncRefOptions<L, R>): () => void;

interface SyncRefsOptions extends ConfigurableFlushSync {
    /**
     * Watch deeply
     *
     * @default false
     */
    deep?: boolean;
    /**
     * Sync values immediately
     *
     * @default true
     */
    immediate?: boolean;
}
/**
 * Keep target ref(s) in sync with the source ref
 *
 * @param source source ref
 * @param targets
 */
declare function syncRefs<T>(source: WatchSource<T>, targets: Ref<T> | Ref<T>[], options?: SyncRefsOptions): vue_demi.WatchStopHandle;

/**
 * Converts ref to reactive.
 *
 * @see https://vueuse.org/toReactive
 * @param objectRef A ref of object
 */
declare function toReactive<T extends object>(objectRef: MaybeRef<T>): T;

/**
 * Extended `toRefs` that also accepts refs of an object.
 *
 * @see https://vueuse.org/toRefs
 * @param objectRef A ref or normal object or array.
 */
declare function toRefs<T extends object>(objectRef: MaybeRef<T>): ToRefs<T>;

/**
 * Call onBeforeMount() if it's inside a component lifecycle, if not, just call the function
 *
 * @param fn
 * @param sync if set to false, it will run in the nextTick() of Vue
 */
declare function tryOnBeforeMount(fn: Fn, sync?: boolean): void;

/**
 * Call onBeforeUnmount() if it's inside a component lifecycle, if not, do nothing
 *
 * @param fn
 */
declare function tryOnBeforeUnmount(fn: Fn): void;

/**
 * Call onMounted() if it's inside a component lifecycle, if not, just call the function
 *
 * @param fn
 * @param sync if set to false, it will run in the nextTick() of Vue
 */
declare function tryOnMounted(fn: Fn, sync?: boolean): void;

/**
 * Call onScopeDispose() if it's inside an effect scope lifecycle, if not, do nothing
 *
 * @param fn
 */
declare function tryOnScopeDispose(fn: Fn): boolean;

/**
 * Call onUnmounted() if it's inside a component lifecycle, if not, do nothing
 *
 * @param fn
 */
declare function tryOnUnmounted(fn: Fn): void;

interface UntilToMatchOptions {
    /**
     * Milliseconds timeout for promise to resolve/reject if the when condition does not meet.
     * 0 for never timed out
     *
     * @default 0
     */
    timeout?: number;
    /**
     * Reject the promise when timeout
     *
     * @default false
     */
    throwOnTimeout?: boolean;
    /**
     * `flush` option for internal watch
     *
     * @default 'sync'
     */
    flush?: WatchOptions['flush'];
    /**
     * `deep` option for internal watch
     *
     * @default 'false'
     */
    deep?: WatchOptions['deep'];
}
interface UntilBaseInstance<T, Not extends boolean = false> {
    toMatch<U extends T = T>(condition: (v: T) => v is U, options?: UntilToMatchOptions): Not extends true ? Promise<Exclude<T, U>> : Promise<U>;
    toMatch(condition: (v: T) => boolean, options?: UntilToMatchOptions): Promise<T>;
    changed(options?: UntilToMatchOptions): Promise<T>;
    changedTimes(n?: number, options?: UntilToMatchOptions): Promise<T>;
}
type Falsy = false | void | null | undefined | 0 | 0n | '';
interface UntilValueInstance<T, Not extends boolean = false> extends UntilBaseInstance<T, Not> {
    readonly not: UntilValueInstance<T, Not extends true ? false : true>;
    toBe<P = T>(value: MaybeComputedRef<P>, options?: UntilToMatchOptions): Not extends true ? Promise<T> : Promise<P>;
    toBeTruthy(options?: UntilToMatchOptions): Not extends true ? Promise<T & Falsy> : Promise<Exclude<T, Falsy>>;
    toBeNull(options?: UntilToMatchOptions): Not extends true ? Promise<Exclude<T, null>> : Promise<null>;
    toBeUndefined(options?: UntilToMatchOptions): Not extends true ? Promise<Exclude<T, undefined>> : Promise<undefined>;
    toBeNaN(options?: UntilToMatchOptions): Promise<T>;
}
interface UntilArrayInstance<T> extends UntilBaseInstance<T> {
    readonly not: UntilArrayInstance<T>;
    toContains(value: MaybeComputedRef<ElementOf<ShallowUnwrapRef<T>>>, options?: UntilToMatchOptions): Promise<T>;
}
/**
 * Promised one-time watch for changes
 *
 * @see https://vueuse.org/until
 * @example
 * ```
 * const { count } = useCounter()
 *
 * await until(count).toMatch(v => v > 7)
 *
 * alert('Counter is now larger than 7!')
 * ```
 */
declare function until<T extends unknown[]>(r: WatchSource<T> | MaybeComputedRef<T>): UntilArrayInstance<T>;
declare function until<T>(r: WatchSource<T> | MaybeComputedRef<T>): UntilValueInstance<T>;

/**
 * Reactive `Array.every`
 *
 * @see https://vueuse.org/useArrayEvery
 * @param {Array} list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns {boolean} **true** if the `fn` function returns a **truthy** value for every element from the array. Otherwise, **false**.
 */
declare function useArrayEvery<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, fn: (element: T, index: number, array: MaybeComputedRef<T>[]) => unknown): ComputedRef<boolean>;

/**
 * Reactive `Array.filter`
 *
 * @see https://vueuse.org/useArrayFilter
 * @param {Array} list - the array was called upon.
 * @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
 *
 * @returns {Array} a shallow copy of a portion of the given array, filtered down to just the elements from the given array that pass the test implemented by the provided function. If no elements pass the test, an empty array will be returned.
 */
declare function useArrayFilter<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, fn: (element: T, index: number, array: T[]) => boolean): ComputedRef<T[]>;

/**
 * Reactive `Array.find`
 *
 * @see https://vueuse.org/useArrayFind
 * @param {Array} list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the first element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
 */
declare function useArrayFind<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, fn: (element: T, index: number, array: MaybeComputedRef<T>[]) => boolean): ComputedRef<T | undefined>;

/**
 * Reactive `Array.findIndex`
 *
 * @see https://vueuse.org/useArrayFindIndex
 * @param {Array} list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns {number} the index of the first element in the array that passes the test. Otherwise, "-1".
 */
declare function useArrayFindIndex<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, fn: (element: T, index: number, array: MaybeComputedRef<T>[]) => unknown): ComputedRef<number>;

/**
 * Reactive `Array.findLast`
 *
 * @see https://vueuse.org/useArrayFindLast
 * @param {Array} list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the last element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
 */
declare function useArrayFindLast<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, fn: (element: T, index: number, array: MaybeComputedRef<T>[]) => boolean): ComputedRef<T | undefined>;

/**
 * Reactive `Array.join`
 *
 * @see https://vueuse.org/useArrayJoin
 * @param {Array} list - the array was called upon.
 * @param {string} separator - a string to separate each pair of adjacent elements of the array. If omitted, the array elements are separated with a comma (",").
 *
 * @returns {string} a string with all array elements joined. If arr.length is 0, the empty string is returned.
 */
declare function useArrayJoin(list: MaybeComputedRef<MaybeComputedRef<any>[]>, separator?: MaybeComputedRef<string>): ComputedRef<string>;

/**
 * Reactive `Array.map`
 *
 * @see https://vueuse.org/useArrayMap
 * @param {Array} list - the array was called upon.
 * @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
 *
 * @returns {Array} a new array with each element being the result of the callback function.
 */
declare function useArrayMap<T, U = T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, fn: (element: T, index: number, array: T[]) => U): ComputedRef<U[]>;

type UseArrayReducer<PV, CV, R> = (previousValue: PV, currentValue: CV, currentIndex: number) => R;
/**
 * Reactive `Array.reduce`
 *
 * @see https://vueuse.org/useArrayReduce
 * @param {Array} list - the array was called upon.
 * @param reducer - a "reducer" function.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
declare function useArrayReduce<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, reducer: UseArrayReducer<T, T, T>): ComputedRef<T>;
/**
 * Reactive `Array.reduce`
 *
 * @see https://vueuse.org/useArrayReduce
 * @param {Array} list - the array was called upon.
 * @param reducer - a "reducer" function.
 * @param initialValue - a value to be initialized the first time when the callback is called.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
declare function useArrayReduce<T, U>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, reducer: UseArrayReducer<U, T, U>, initialValue: MaybeComputedRef<U>): ComputedRef<U>;

/**
 * Reactive `Array.some`
 *
 * @see https://vueuse.org/useArraySome
 * @param {Array} list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns {boolean} **true** if the `fn` function returns a **truthy** value for any element from the array. Otherwise, **false**.
 */
declare function useArraySome<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>, fn: (element: T, index: number, array: MaybeComputedRef<T>[]) => unknown): ComputedRef<boolean>;

/**
 * reactive unique array
 * @see https://vueuse.org/useArrayUnique
 * @param {Array} list - the array was called upon.
 * @returns {Array} A computed ref that returns a unique array of items.
 */
declare function useArrayUnique<T>(list: MaybeComputedRef<MaybeComputedRef<T>[]>): ComputedRef<T[]>;

interface UseCounterOptions {
    min?: number;
    max?: number;
}
/**
 * Basic counter with utility functions.
 *
 * @see https://vueuse.org/useCounter
 * @param [initialValue=0]
 * @param {Object} options
 */
declare function useCounter(initialValue?: number, options?: UseCounterOptions): {
    count: vue_demi.Ref<number>;
    inc: (delta?: number) => number;
    dec: (delta?: number) => number;
    get: () => number;
    set: (val: number) => number;
    reset: (val?: number) => number;
};

type DateLike = Date | number | string | undefined;
interface UseDateFormatOptions {
    /**
     * The locale(s) to used for dd/ddd/dddd/MMM/MMMM format
     *
     * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locales_argument).
     */
    locales?: Intl.LocalesArgument;
    /**
     * A custom function to re-modify the way to display meridiem
     *
     */
    customMeridiem?: (hours: number, minutes: number, isLowercase?: boolean, hasPeriod?: boolean) => string;
}
declare const formatDate: (date: Date, formatStr: string, options?: UseDateFormatOptions) => string;
declare const normalizeDate: (date: DateLike) => Date;
/**
 * Get the formatted date according to the string of tokens passed in.
 *
 * @see https://vueuse.org/useDateFormat
 * @param date - The date to format, can either be a `Date` object, a timestamp, or a string
 * @param formatStr - The combination of tokens to format the date
 * @param options - UseDateFormatOptions
 */
declare function useDateFormat(date: MaybeComputedRef<DateLike>, formatStr?: MaybeComputedRef<string>, options?: UseDateFormatOptions): vue_demi.ComputedRef<string>;
type UseDateFormatReturn = ReturnType<typeof useDateFormat>;

/**
 * Debounce execution of a function.
 *
 * @see https://vueuse.org/useDebounceFn
 * @param  fn          A function to be executed after delay milliseconds debounced.
 * @param  ms          A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param  opts        options
 *
 * @return A new, debounce, function.
 */
declare function useDebounceFn<T extends FunctionArgs>(fn: T, ms?: MaybeComputedRef<number>, options?: DebounceFilterOptions): PromisifyFn<T>;

interface UseIntervalOptions<Controls extends boolean> {
    /**
     * Expose more controls
     *
     * @default false
     */
    controls?: Controls;
    /**
     * Execute the update immediately on calling
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Callback on every interval
     */
    callback?: (count: number) => void;
}
interface UseIntervalControls {
    counter: Ref<number>;
    reset: () => void;
}
/**
 * Reactive counter increases on every interval
 *
 * @see https://vueuse.org/useInterval
 * @param interval
 * @param options
 */
declare function useInterval(interval?: MaybeComputedRef<number>, options?: UseIntervalOptions<false>): Ref<number>;
declare function useInterval(interval: MaybeComputedRef<number>, options: UseIntervalOptions<true>): UseIntervalControls & Pausable;

interface UseIntervalFnOptions {
    /**
     * Start the timer immediately
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Execute the callback immediate after calling this function
     *
     * @default false
     */
    immediateCallback?: boolean;
}
/**
 * Wrapper for `setInterval` with controls
 *
 * @param cb
 * @param interval
 * @param options
 */
declare function useIntervalFn(cb: Fn, interval?: MaybeComputedRef<number>, options?: UseIntervalFnOptions): Pausable;

interface UseLastChangedOptions<Immediate extends boolean, InitialValue extends number | null | undefined = undefined> extends WatchOptions<Immediate> {
    initialValue?: InitialValue;
}
/**
 * Records the timestamp of the last change
 *
 * @see https://vueuse.org/useLastChanged
 */
declare function useLastChanged(source: WatchSource, options?: UseLastChangedOptions<false>): Ref<number | null>;
declare function useLastChanged(source: WatchSource, options: UseLastChangedOptions<true>): Ref<number>;
declare function useLastChanged(source: WatchSource, options: UseLastChangedOptions<boolean, number>): Ref<number>;

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param   fn             A function to be executed after delay milliseconds. The `this` context and all arguments are passed through, as-is,
 *                                    to `callback` when the throttled-function is executed.
 * @param   ms             A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 *
 * @param [trailing=false] if true, call fn again after the time is up
 *
 * @param [leading=true] if true, call fn on the leading edge of the ms timeout
 *
 * @param [rejectOnCancel=false] if true, reject the last call if it's been cancel
 *
 * @return  A new, throttled, function.
 */
declare function useThrottleFn<T extends FunctionArgs>(fn: T, ms?: MaybeComputedRef<number>, trailing?: boolean, leading?: boolean, rejectOnCancel?: boolean): PromisifyFn<T>;

interface UseTimeoutFnOptions {
    /**
     * Start the timer immediate after calling this function
     *
     * @default true
     */
    immediate?: boolean;
}
/**
 * Wrapper for `setTimeout` with controls.
 *
 * @param cb
 * @param interval
 * @param options
 */
declare function useTimeoutFn<CallbackFn extends (...args: any[]) => any>(cb: CallbackFn, interval: MaybeComputedRef<number>, options?: UseTimeoutFnOptions): Stoppable<Parameters<CallbackFn> | []>;

interface UseTimeoutOptions<Controls extends boolean> extends UseTimeoutFnOptions {
    /**
     * Expose more controls
     *
     * @default false
     */
    controls?: Controls;
    /**
     * Callback on timeout
     */
    callback?: Fn;
}
/**
 * Update value after a given time with controls.
 *
 * @see   {@link https://vueuse.org/useTimeout}
 * @param interval
 * @param options
 */
declare function useTimeout(interval?: number, options?: UseTimeoutOptions<false>): ComputedRef<boolean>;
declare function useTimeout(interval: number, options: UseTimeoutOptions<true>): {
    ready: ComputedRef<boolean>;
} & Stoppable;

interface UseToNumberOptions {
    /**
     * Method to use to convert the value to a number.
     *
     * @default 'parseFloat'
     */
    method?: 'parseFloat' | 'parseInt';
    /**
     * The base in mathematical numeral systems passed to `parseInt`.
     * Only works with `method: 'parseInt'`
     */
    radix?: number;
    /**
     * Replace NaN with zero
     *
     * @default false
     */
    nanToZero?: boolean;
}
/**
 * Computed reactive object.
 */
declare function useToNumber(value: MaybeComputedRef<number | string>, options?: UseToNumberOptions): ComputedRef<number>;

/**
 * Reactively convert a ref to string.
 *
 * @see https://vueuse.org/useToString
 */
declare function useToString(value: MaybeComputedRef<unknown>): ComputedRef<string>;

interface UseToggleOptions<Truthy, Falsy> {
    truthyValue?: MaybeComputedRef<Truthy>;
    falsyValue?: MaybeComputedRef<Falsy>;
}
declare function useToggle<Truthy, Falsy, T = Truthy | Falsy>(initialValue: Ref<T>, options?: UseToggleOptions<Truthy, Falsy>): (value?: T) => T;
declare function useToggle<Truthy = true, Falsy = false, T = Truthy | Falsy>(initialValue?: T, options?: UseToggleOptions<Truthy, Falsy>): [Ref<T>, (value?: T) => T];

declare type WatchArrayCallback<V = any, OV = any> = (value: V, oldValue: OV, added: V, removed: OV, onCleanup: (cleanupFn: () => void) => void) => any;
/**
 * Watch for an array with additions and removals.
 *
 * @see https://vueuse.org/watchArray
 */
declare function watchArray<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T[]> | T[], cb: WatchArrayCallback<T[], Immediate extends true ? T[] | undefined : T[]>, options?: WatchOptions<Immediate>): vue_demi.WatchStopHandle;

interface WatchWithFilterOptions<Immediate> extends WatchOptions<Immediate>, ConfigurableEventFilter {
}
declare function watchWithFilter<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchWithFilterOptions<Immediate>): WatchStopHandle;
declare function watchWithFilter<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchStopHandle;
declare function watchWithFilter<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchStopHandle;

interface WatchAtMostOptions<Immediate> extends WatchWithFilterOptions<Immediate> {
    count: MaybeComputedRef<number>;
}
interface WatchAtMostReturn {
    stop: WatchStopHandle;
    count: Ref<number>;
}
declare function watchAtMost<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options: WatchAtMostOptions<Immediate>): WatchAtMostReturn;
declare function watchAtMost<T, Immediate extends Readonly<boolean> = false>(sources: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options: WatchAtMostOptions<Immediate>): WatchAtMostReturn;

interface WatchDebouncedOptions<Immediate> extends WatchOptions<Immediate>, DebounceFilterOptions {
    debounce?: MaybeComputedRef<number>;
}
declare function watchDebounced<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchDebouncedOptions<Immediate>): WatchStopHandle;
declare function watchDebounced<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchDebouncedOptions<Immediate>): WatchStopHandle;
declare function watchDebounced<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchDebouncedOptions<Immediate>): WatchStopHandle;

type IgnoredUpdater = (updater: () => void) => void;
interface WatchIgnorableReturn {
    ignoreUpdates: IgnoredUpdater;
    ignorePrevAsyncUpdates: () => void;
    stop: WatchStopHandle;
}
declare function watchIgnorable<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;
declare function watchIgnorable<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;
declare function watchIgnorable<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;

declare function watchOnce<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(source: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchOptions<Immediate>): void;
declare function watchOnce<T, Immediate extends Readonly<boolean> = false>(sources: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchOptions<Immediate>): void;

interface WatchPausableReturn extends Pausable {
    stop: WatchStopHandle;
}
declare function watchPausable<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchWithFilterOptions<Immediate>): WatchPausableReturn;
declare function watchPausable<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchPausableReturn;
declare function watchPausable<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchPausableReturn;

interface WatchThrottledOptions<Immediate> extends WatchOptions<Immediate> {
    throttle?: MaybeComputedRef<number>;
    trailing?: boolean;
    leading?: boolean;
}
declare function watchThrottled<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchThrottledOptions<Immediate>): WatchStopHandle;
declare function watchThrottled<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchThrottledOptions<Immediate>): WatchStopHandle;
declare function watchThrottled<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchThrottledOptions<Immediate>): WatchStopHandle;

interface WatchTriggerableReturn<FnReturnT = void> extends WatchIgnorableReturn {
    /** Execute `WatchCallback` immediately */
    trigger: () => FnReturnT;
}
type OnCleanup = (cleanupFn: () => void) => void;
type WatchTriggerableCallback<V = any, OV = any, R = void> = (value: V, oldValue: OV, onCleanup: OnCleanup) => R;
declare function watchTriggerable<T extends Readonly<WatchSource<unknown>[]>, FnReturnT>(sources: [...T], cb: WatchTriggerableCallback<MapSources<T>, MapOldSources<T, true>, FnReturnT>, options?: WatchWithFilterOptions<boolean>): WatchTriggerableReturn<FnReturnT>;
declare function watchTriggerable<T, FnReturnT>(source: WatchSource<T>, cb: WatchTriggerableCallback<T, T | undefined, FnReturnT>, options?: WatchWithFilterOptions<boolean>): WatchTriggerableReturn<FnReturnT>;
declare function watchTriggerable<T extends object, FnReturnT>(source: T, cb: WatchTriggerableCallback<T, T | undefined, FnReturnT>, options?: WatchWithFilterOptions<boolean>): WatchTriggerableReturn<FnReturnT>;

/**
 * Shorthand for watching value to be truthy
 *
 * @see https://vueuse.org/whenever
 */
declare function whenever<T>(source: WatchSource<T | false | null | undefined>, cb: WatchCallback<T>, options?: WatchOptions): vue_demi.WatchStopHandle;

export { AnyFn, ArgumentsType, Arrayable, Awaitable, ComputedRefWithControl, ComputedWithControlRefExtra, ConfigurableEventFilter, ConfigurableFlush, ConfigurableFlushSync, ControlledRefOptions, CreateGlobalStateReturn, DateLike, DebounceFilterOptions, DeepMaybeRef, ElementOf, EventFilter, EventHook, EventHookOff, EventHookOn, EventHookTrigger, ExtendRefOptions, Fn, FunctionArgs, FunctionWrapperOptions, IgnoredUpdater, MapOldSources, MapSources, MaybeComputedRef, MaybeReadonlyRef, MaybeRef, Pausable, PromisifyFn, Reactified, ReactifyNested, ReactifyObjectOptions, ReactifyOptions, RemovableRef, RemoveableRef, ShallowUnwrapRef, SingletonPromiseReturn, Stopable, Stoppable, SyncRefOptions, SyncRefsOptions, UntilArrayInstance, UntilBaseInstance, UntilToMatchOptions, UntilValueInstance, UseArrayReducer, UseCounterOptions, UseDateFormatOptions, UseDateFormatReturn, UseIntervalControls, UseIntervalFnOptions, UseIntervalOptions, UseLastChangedOptions, UseTimeoutFnOptions, UseTimeoutOptions, UseToNumberOptions, UseToggleOptions, WatchArrayCallback, WatchAtMostOptions, WatchAtMostReturn, WatchDebouncedOptions, WatchIgnorableReturn, WatchPausableReturn, WatchThrottledOptions, WatchTriggerableCallback, WatchTriggerableReturn, WatchWithFilterOptions, WritableComputedRefWithControl, __onlyVue27Plus, __onlyVue3, assert, refAutoReset as autoResetRef, bypassFilter, clamp, computedEager, computedWithControl, containsProp, computedWithControl as controlledComputed, controlledRef, createEventHook, createFilterWrapper, createGlobalState, createInjectionState, reactify as createReactiveFn, createSharedComposable, createSingletonPromise, debounceFilter, refDebounced as debouncedRef, watchDebounced as debouncedWatch, directiveHooks, computedEager as eagerComputed, extendRef, formatDate, get, hasOwn, identity, watchIgnorable as ignorableWatch, increaseWithUnit, invoke, isBoolean, isClient, isDef, isDefined, isFunction, isIOS, isNumber, isObject, isString, isWindow, makeDestructurable, noop, normalizeDate, now, objectPick, pausableFilter, watchPausable as pausableWatch, promiseTimeout, rand, reactify, reactifyObject, reactiveComputed, reactiveOmit, reactivePick, refAutoReset, refDebounced, refDefault, refThrottled, refWithControl, resolveRef, resolveUnref, set, syncRef, syncRefs, throttleFilter, refThrottled as throttledRef, watchThrottled as throttledWatch, timestamp, toReactive, toRefs, tryOnBeforeMount, tryOnBeforeUnmount, tryOnMounted, tryOnScopeDispose, tryOnUnmounted, until, useArrayEvery, useArrayFilter, useArrayFind, useArrayFindIndex, useArrayFindLast, useArrayJoin, useArrayMap, useArrayReduce, useArraySome, useArrayUnique, useCounter, useDateFormat, refDebounced as useDebounce, useDebounceFn, useInterval, useIntervalFn, useLastChanged, refThrottled as useThrottle, useThrottleFn, useTimeout, useTimeoutFn, useToNumber, useToString, useToggle, watchArray, watchAtMost, watchDebounced, watchIgnorable, watchOnce, watchPausable, watchThrottled, watchTriggerable, watchWithFilter, whenever };
