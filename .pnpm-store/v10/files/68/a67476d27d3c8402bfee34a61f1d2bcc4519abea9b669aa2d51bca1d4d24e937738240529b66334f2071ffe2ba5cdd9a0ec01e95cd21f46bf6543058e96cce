import * as vue_demi from 'vue-demi';
import { WatchOptionsBase, Ref, ComputedRef, WritableComputedRef, WatchSource, ComputedGetter, WritableComputedOptions, WatchOptions, InjectionKey, ShallowUnwrapRef as ShallowUnwrapRef$1, inject, provide, UnwrapNestedRefs, UnwrapRef, ToRef, ToRefs, MaybeRef as MaybeRef$1, WatchCallback, WatchStopHandle } from 'vue-demi';

/**
 * Note: If you are using Vue 3.4+, you can straight use computed instead.
 * Because in Vue 3.4+, if computed new value does not change,
 * computed, effect, watch, watchEffect, render dependencies will not be triggered.
 * refer: https://github.com/vuejs/core/pull/5912
 *
 * @param fn effect function
 * @param options WatchOptionsBase
 * @returns readonly ref
 */
declare function computedEager<T>(fn: () => T, options?: WatchOptionsBase): Readonly<Ref<T>>;

interface ComputedWithControlRefExtra {
    /**
     * Force update the computed value.
     */
    trigger: () => void;
}
interface ComputedRefWithControl<T> extends ComputedRef<T>, ComputedWithControlRefExtra {
}
interface WritableComputedRefWithControl<T> extends WritableComputedRef<T>, ComputedWithControlRefExtra {
}
declare function computedWithControl<T, S>(source: WatchSource<S> | WatchSource<S>[], fn: ComputedGetter<T>): ComputedRefWithControl<T>;
declare function computedWithControl<T, S>(source: WatchSource<S> | WatchSource<S>[], fn: WritableComputedOptions<T>): WritableComputedRefWithControl<T>;

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
 * type MaybeRefOrGetter<T> = (() => T) | T | Ref<T> | ComputedRef<T>
 * ```
 */
type MaybeRefOrGetter<T> = MaybeRef<T> | (() => T);
/**
 * Maybe it's a computed ref, or a readonly value, or a getter function
 */
type ReadonlyRefOrGetter<T> = ComputedRef<T> | (() => T);
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
/**
 * Compatible with versions below TypeScript 4.5 Awaited
 */
type Awaited<T> = T extends null | undefined ? T : T extends object & {
    then: (onfulfilled: infer F, ...args: infer _) => any;
} ? F extends ((value: infer V, ...args: infer _) => any) ? Awaited<V> : never : T;
type Promisify<T> = Promise<Awaited<T>>;
type PromisifyFn<T extends AnyFn> = (...args: ArgumentsType<T>) => Promisify<ReturnType<T>>;
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
type MultiWatchSources = (WatchSource<unknown> | object)[];
type MapSources<T> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? V : never;
};
type MapOldSources<T, Immediate> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? Immediate extends true ? V | undefined : V : never;
};
type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};
type IfAny<T, Y, N> = 0 extends (1 & T) ? Y : N;
/**
 * will return `true` if `T` is `any`, or `false` otherwise
 */
type IsAny<T> = IfAny<T, true, false>;

/**
 * The source code for this function was inspired by vue-apollo's `useEventHook` util
 * https://github.com/vuejs/vue-apollo/blob/v4/packages/vue-apollo-composable/src/util/useEventHook.ts
 */

type Callback<T> = IsAny<T> extends true ? (param: any) => void : ([
    T
] extends [void] ? () => void : (param: T) => void);
type EventHookOn<T = any> = (fn: Callback<T>) => {
    off: () => void;
};
type EventHookOff<T = any> = (fn: Callback<T>) => void;
type EventHookTrigger<T = any> = (param?: T) => Promise<unknown[]>;
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

declare const isClient: boolean;
declare const isWorker: boolean;
declare const isDef: <T = any>(val?: T) => val is T;
declare const notNullish: <T = any>(val?: T | null | undefined) => val is T;
declare const assert: (condition: boolean, ...infos: any[]) => void;
declare const isObject: (val: any) => val is object;
declare const now: () => number;
declare const timestamp: () => number;
declare const clamp: (n: number, min: number, max: number) => number;
declare const noop: () => void;
declare const rand: (min: number, max: number) => number;
declare const hasOwn: <T extends object, K extends keyof T>(val: T, key: K) => key is K;
declare const isIOS: boolean | "";

type FunctionArgs<Args extends any[] = any[], Return = void> = (...args: Args) => Return;
interface FunctionWrapperOptions<Args extends any[] = any[], This = any> {
    fn: FunctionArgs<Args, This>;
    args: Args;
    thisArg: This;
}
type EventFilter<Args extends any[] = any[], This = any, Invoke extends AnyFn = AnyFn> = (invoke: Invoke, options: FunctionWrapperOptions<Args, This>) => ReturnType<Invoke> | Promisify<ReturnType<Invoke>>;
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
    maxWait?: MaybeRefOrGetter<number>;
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
declare function createFilterWrapper<T extends AnyFn>(filter: EventFilter, fn: T): (this: any, ...args: ArgumentsType<T>) => Promise<Awaited<ReturnType<T>>>;
declare const bypassFilter: EventFilter;
/**
 * Create an EventFilter that debounce the events
 */
declare function debounceFilter(ms: MaybeRefOrGetter<number>, options?: DebounceFilterOptions): EventFilter<any[], any, AnyFn>;
interface ThrottleFilterOptions {
    /**
     * The maximum time allowed to be delayed before it's invoked.
     */
    delay: MaybeRefOrGetter<number>;
    /**
     * Whether to invoke on the trailing edge of the timeout.
     */
    trailing?: boolean;
    /**
     * Whether to invoke on the leading edge of the timeout.
     */
    leading?: boolean;
    /**
     * Whether to reject the last call if it's been cancel.
     */
    rejectOnCancel?: boolean;
}
/**
 * Create an EventFilter that throttle the events
 *
 * @param ms
 * @param [trailing]
 * @param [leading]
 * @param [rejectOnCancel]
 */
declare function throttleFilter(ms: MaybeRefOrGetter<number>, trailing?: boolean, leading?: boolean, rejectOnCancel?: boolean): EventFilter;
declare function throttleFilter(options: ThrottleFilterOptions): EventFilter;
/**
 * EventFilter that gives extra controls to pause and resume the filter
 *
 * @param extendFilter  Extra filter to apply when the PausableFilter is active, default to none
 *
 */
declare function pausableFilter(extendFilter?: EventFilter): Pausable & {
    eventFilter: EventFilter;
};

declare const directiveHooks: {
    mounted: "mounted";
    updated: "updated";
    unmounted: "unmounted";
};

declare const hyphenate: (str: string) => string;
declare const camelize: (str: string) => string;

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
 */
declare function objectPick<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined?: boolean): Pick<O, T>;
/**
 * Create a new subset object by omit giving keys
 */
declare function objectOmit<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined?: boolean): Omit<O, T>;
declare function objectEntries<T extends object>(obj: T): [keyof T, T[keyof T]][];
declare function getLifeCycleTarget(target?: any): any;

/**
 * Keep states in the global scope to be reusable across Vue instances.
 *
 * @see https://vueuse.org/createGlobalState
 * @param stateFactory A factory function to create the state
 */
declare function createGlobalState<Fn extends AnyFn>(stateFactory: Fn): Fn;

interface CreateInjectionStateOptions<Return> {
    /**
     * Custom injectionKey for InjectionState
     */
    injectionKey?: string | InjectionKey<Return>;
    /**
     * Default value for the InjectionState
     */
    defaultValue?: Return;
}
/**
 * Create global state that can be injected into components.
 *
 * @see https://vueuse.org/createInjectionState
 *
 */
declare function createInjectionState<Arguments extends Array<any>, Return>(composable: (...args: Arguments) => Return, options?: CreateInjectionStateOptions<Return>): readonly [useProvidingState: (...args: Arguments) => Return, useInjectedState: () => Return | undefined];

/**
 * Make a composable function usable with multiple Vue instances.
 *
 * @see https://vueuse.org/createSharedComposable
 */
declare function createSharedComposable<Fn extends AnyFn>(composable: Fn): Fn;

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

/**
 * Shorthand for accessing `ref.value`
 */
declare function get<T>(ref: MaybeRef<T>): T;
declare function get<T, K extends keyof T>(ref: MaybeRef<T>, key: K): T[K];

/**
 * On the basis of `inject`, it is allowed to directly call inject to obtain the value after call provide in the same component.
 *
 * @example
 * ```ts
 * injectLocal('MyInjectionKey', 1)
 * const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
 * ```
 */
declare const injectLocal: typeof inject;

declare function isDefined<T>(v: Ref<T>): v is Ref<Exclude<T, null | undefined>>;
declare function isDefined<T>(v: ComputedRef<T>): v is ComputedRef<Exclude<T, null | undefined>>;
declare function isDefined<T>(v: T): v is Exclude<T, null | undefined>;

declare function makeDestructurable<T extends Record<string, unknown>, A extends readonly any[]>(obj: T, arr: A): T & A;

/**
 * On the basis of `provide`, it is allowed to directly call inject to obtain the value after call provide in the same component.
 *
 * @example
 * ```ts
 * provideLocal('MyInjectionKey', 1)
 * const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
 * ```
 */
declare const provideLocal: typeof provide;

type Reactified<T, Computed extends boolean> = T extends (...args: infer A) => infer R ? (...args: {
    [K in keyof A]: Computed extends true ? MaybeRefOrGetter<A[K]> : MaybeRef<A[K]>;
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
    [K in Keys]: T[K] extends AnyFn ? Reactified<T[K], S> : T[K];
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
declare function reactiveComputed<T extends object>(fn: () => T): UnwrapNestedRefs<T>;

type ReactiveOmitPredicate<T> = (value: T[keyof T], key: keyof T) => boolean;
declare function reactiveOmit<T extends object, K extends keyof T>(obj: T, ...keys: (K | K[])[]): Omit<T, K>;
declare function reactiveOmit<T extends object>(obj: T, predicate: ReactiveOmitPredicate<T>): Partial<T>;

type ReactivePickPredicate<T> = (value: T[keyof T], key: keyof T) => boolean;
declare function reactivePick<T extends object, K extends keyof T>(obj: T, ...keys: (K | K[])[]): {
    [S in K]: UnwrapRef<T[S]>;
};
declare function reactivePick<T extends object>(obj: T, predicate: ReactivePickPredicate<T>): {
    [S in keyof T]?: UnwrapRef<T[S]>;
};

/**
 * Create a ref which will be reset to the default value after some time.
 *
 * @see https://vueuse.org/refAutoReset
 * @param defaultValue The value which will be set.
 * @param afterMs      A zero-or-greater delay in milliseconds.
 */
declare function refAutoReset<T>(defaultValue: MaybeRefOrGetter<T>, afterMs?: MaybeRefOrGetter<number>): Ref<T>;

/**
 * Debounce updates of a ref.
 *
 * @return A new debounced ref.
 */
declare function refDebounced<T>(value: Ref<T>, ms?: MaybeRefOrGetter<number>, options?: DebounceFilterOptions): Readonly<Ref<T>>;

/**
 * Apply default value to a ref.
 */
declare function refDefault<T>(source: Ref<T | undefined | null>, defaultValue: T): Ref<T>;

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param value Ref value to be watched with throttle effect
 * @param  delay  A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param [trailing] if true, update the value again after the delay time is up
 * @param [leading] if true, update the value on the leading edge of the ms timeout
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
 * Fine-grained controls over ref and its reactivity.
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

declare function set<T>(ref: Ref<T>, value: T): void;
declare function set<O extends object, K extends keyof O>(target: O, key: K, value: O[K]): void;

type Direction = 'ltr' | 'rtl' | 'both';
type SpecificFieldPartial<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
/**
 * A = B
 */
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/**
 * A ∩ B ≠ ∅
 */
type IntersectButNotEqual<A, B> = Equal<A, B> extends true ? false : A & B extends never ? false : true;
/**
 * A ⊆ B
 */
type IncludeButNotEqual<A, B> = Equal<A, B> extends true ? false : A extends B ? true : false;
/**
 * A ∩ B = ∅
 */
type NotIntersect<A, B> = Equal<A, B> extends true ? false : A & B extends never ? true : false;
interface EqualType<D extends Direction, L, R, O extends keyof Transform<L, R> = D extends 'both' ? 'ltr' | 'rtl' : D> {
    transform?: SpecificFieldPartial<Pick<Transform<L, R>, O>, O>;
}
type StrictIncludeMap<IncludeType extends 'LR' | 'RL', D extends Exclude<Direction, 'both'>, L, R> = (Equal<[IncludeType, D], ['LR', 'ltr']> & Equal<[IncludeType, D], ['RL', 'rtl']>) extends true ? {
    transform?: SpecificFieldPartial<Pick<Transform<L, R>, D>, D>;
} : {
    transform: Pick<Transform<L, R>, D>;
};
type StrictIncludeType<IncludeType extends 'LR' | 'RL', D extends Direction, L, R> = D extends 'both' ? {
    transform: SpecificFieldPartial<Transform<L, R>, IncludeType extends 'LR' ? 'ltr' : 'rtl'>;
} : D extends Exclude<Direction, 'both'> ? StrictIncludeMap<IncludeType, D, L, R> : never;
type IntersectButNotEqualType<D extends Direction, L, R> = D extends 'both' ? {
    transform: Transform<L, R>;
} : D extends Exclude<Direction, 'both'> ? {
    transform: Pick<Transform<L, R>, D>;
} : never;
type NotIntersectType<D extends Direction, L, R> = IntersectButNotEqualType<D, L, R>;
interface Transform<L, R> {
    ltr: (left: L) => R;
    rtl: (right: R) => L;
}
type TransformType<D extends Direction, L, R> = Equal<L, R> extends true ? EqualType<D, L, R> : IncludeButNotEqual<L, R> extends true ? StrictIncludeType<'LR', D, L, R> : IncludeButNotEqual<R, L> extends true ? StrictIncludeType<'RL', D, L, R> : IntersectButNotEqual<L, R> extends true ? IntersectButNotEqualType<D, L, R> : NotIntersect<L, R> extends true ? NotIntersectType<D, L, R> : never;
type SyncRefOptions<L, R, D extends Direction> = ConfigurableFlushSync & {
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
    direction?: D;
} & TransformType<D, L, R>;
/**
 * Two-way refs synchronization.
 * From the set theory perspective to restrict the option's type
 * Check in the following order:
 * 1. L = R
 * 2. L ∩ R ≠ ∅
 * 3. L ⊆ R
 * 4. L ∩ R = ∅
 */
declare function syncRef<L, R, D extends Direction = 'both'>(left: Ref<L>, right: Ref<R>, ...[options]: Equal<L, R> extends true ? [options?: SyncRefOptions<L, R, D>] : [options: SyncRefOptions<L, R, D>]): () => void;

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
declare function toReactive<T extends object>(objectRef: MaybeRef<T>): UnwrapNestedRefs<T>;

/**
 * Normalize value/ref/getter to `ref` or `computed`.
 */
declare function toRef<T>(r: () => T): Readonly<Ref<T>>;
declare function toRef<T>(r: ComputedRef<T>): ComputedRef<T>;
declare function toRef<T>(r: MaybeRefOrGetter<T>): Ref<T>;
declare function toRef<T>(r: T): Ref<T>;
declare function toRef<T extends object, K extends keyof T>(object: T, key: K): ToRef<T[K]>;
declare function toRef<T extends object, K extends keyof T>(object: T, key: K, defaultValue: T[K]): ToRef<Exclude<T[K], undefined>>;
/**
 * @deprecated use `toRef` instead
 */
declare const resolveRef: typeof toRef;

interface ToRefsOptions {
    /**
     * Replace the original ref with a copy on property update.
     *
     * @default true
     */
    replaceRef?: MaybeRefOrGetter<boolean>;
}
/**
 * Extended `toRefs` that also accepts refs of an object.
 *
 * @see https://vueuse.org/toRefs
 * @param objectRef A ref or normal object or array.
 */
declare function toRefs<T extends object>(objectRef: MaybeRef<T>, options?: ToRefsOptions): ToRefs<T>;

/**
 * Get the value of value/ref/getter.
 */
declare function toValue<T>(r: MaybeRefOrGetter<T>): T;
/**
 * @deprecated use `toValue` instead
 */
declare const resolveUnref: typeof toValue;

/**
 * Call onBeforeMount() if it's inside a component lifecycle, if not, just call the function
 *
 * @param fn
 * @param sync if set to false, it will run in the nextTick() of Vue
 * @param target
 */
declare function tryOnBeforeMount(fn: Fn, sync?: boolean, target?: any): void;

/**
 * Call onBeforeUnmount() if it's inside a component lifecycle, if not, do nothing
 *
 * @param fn
 * @param target
 */
declare function tryOnBeforeUnmount(fn: Fn, target?: any): void;

/**
 * Call onMounted() if it's inside a component lifecycle, if not, just call the function
 *
 * @param fn
 * @param sync if set to false, it will run in the nextTick() of Vue
 * @param target
 */
declare function tryOnMounted(fn: Fn, sync?: boolean, target?: any): void;

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
 * @param target
 */
declare function tryOnUnmounted(fn: Fn, target?: any): void;

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
    toMatch: (<U extends T = T>(condition: (v: T) => v is U, options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, U>> : Promise<U>) & ((condition: (v: T) => boolean, options?: UntilToMatchOptions) => Promise<T>);
    changed: (options?: UntilToMatchOptions) => Promise<T>;
    changedTimes: (n?: number, options?: UntilToMatchOptions) => Promise<T>;
}
type Falsy = false | void | null | undefined | 0 | 0n | '';
interface UntilValueInstance<T, Not extends boolean = false> extends UntilBaseInstance<T, Not> {
    readonly not: UntilValueInstance<T, Not extends true ? false : true>;
    toBe: <P = T>(value: MaybeRefOrGetter<P>, options?: UntilToMatchOptions) => Not extends true ? Promise<T> : Promise<P>;
    toBeTruthy: (options?: UntilToMatchOptions) => Not extends true ? Promise<T & Falsy> : Promise<Exclude<T, Falsy>>;
    toBeNull: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, null>> : Promise<null>;
    toBeUndefined: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, undefined>> : Promise<undefined>;
    toBeNaN: (options?: UntilToMatchOptions) => Promise<T>;
}
interface UntilArrayInstance<T> extends UntilBaseInstance<T> {
    readonly not: UntilArrayInstance<T>;
    toContains: (value: MaybeRefOrGetter<ElementOf<ShallowUnwrapRef<T>>>, options?: UntilToMatchOptions) => Promise<T>;
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
declare function until<T extends unknown[]>(r: WatchSource<T> | MaybeRefOrGetter<T>): UntilArrayInstance<T>;
declare function until<T>(r: WatchSource<T> | MaybeRefOrGetter<T>): UntilValueInstance<T>;

declare function useArrayDifference<T>(list: MaybeRefOrGetter<T[]>, values: MaybeRefOrGetter<T[]>, key?: keyof T): ComputedRef<T[]>;
declare function useArrayDifference<T>(list: MaybeRefOrGetter<T[]>, values: MaybeRefOrGetter<T[]>, compareFn?: (value: T, othVal: T) => boolean): ComputedRef<T[]>;

/**
 * Reactive `Array.every`
 *
 * @see https://vueuse.org/useArrayEvery
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns **true** if the `fn` function returns a **truthy** value for every element from the array. Otherwise, **false**.
 */
declare function useArrayEvery<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown): ComputedRef<boolean>;

/**
 * Reactive `Array.filter`
 *
 * @see https://vueuse.org/useArrayFilter
 * @param list - the array was called upon.
 * @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
 *
 * @returns a shallow copy of a portion of the given array, filtered down to just the elements from the given array that pass the test implemented by the provided function. If no elements pass the test, an empty array will be returned.
 */
declare function useArrayFilter<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: T[]) => boolean): ComputedRef<T[]>;

/**
 * Reactive `Array.find`
 *
 * @see https://vueuse.org/useArrayFind
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the first element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
 */
declare function useArrayFind<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => boolean): ComputedRef<T | undefined>;

/**
 * Reactive `Array.findIndex`
 *
 * @see https://vueuse.org/useArrayFindIndex
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the index of the first element in the array that passes the test. Otherwise, "-1".
 */
declare function useArrayFindIndex<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown): ComputedRef<number>;

/**
 * Reactive `Array.findLast`
 *
 * @see https://vueuse.org/useArrayFindLast
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the last element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
 */
declare function useArrayFindLast<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => boolean): ComputedRef<T | undefined>;

type UseArrayIncludesComparatorFn<T, V> = ((element: T, value: V, index: number, array: MaybeRefOrGetter<T>[]) => boolean);
interface UseArrayIncludesOptions<T, V> {
    fromIndex?: number;
    comparator?: UseArrayIncludesComparatorFn<T, V> | keyof T;
}
/**
 * Reactive `Array.includes`
 *
 * @see https://vueuse.org/useArrayIncludes
 *
 * @returns true if the `value` is found in the array. Otherwise, false.
 */
declare function useArrayIncludes<T, V = any>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, value: MaybeRefOrGetter<V>, comparator?: UseArrayIncludesComparatorFn<T, V>): ComputedRef<boolean>;
declare function useArrayIncludes<T, V = any>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, value: MaybeRefOrGetter<V>, comparator?: keyof T): ComputedRef<boolean>;
declare function useArrayIncludes<T, V = any>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, value: MaybeRefOrGetter<V>, options?: UseArrayIncludesOptions<T, V>): ComputedRef<boolean>;

/**
 * Reactive `Array.join`
 *
 * @see https://vueuse.org/useArrayJoin
 * @param list - the array was called upon.
 * @param separator - a string to separate each pair of adjacent elements of the array. If omitted, the array elements are separated with a comma (",").
 *
 * @returns a string with all array elements joined. If arr.length is 0, the empty string is returned.
 */
declare function useArrayJoin(list: MaybeRefOrGetter<MaybeRefOrGetter<any>[]>, separator?: MaybeRefOrGetter<string>): ComputedRef<string>;

/**
 * Reactive `Array.map`
 *
 * @see https://vueuse.org/useArrayMap
 * @param list - the array was called upon.
 * @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
 *
 * @returns a new array with each element being the result of the callback function.
 */
declare function useArrayMap<T, U = T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: T[]) => U): ComputedRef<U[]>;

type UseArrayReducer<PV, CV, R> = (previousValue: PV, currentValue: CV, currentIndex: number) => R;
/**
 * Reactive `Array.reduce`
 *
 * @see https://vueuse.org/useArrayReduce
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
declare function useArrayReduce<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, reducer: UseArrayReducer<T, T, T>): ComputedRef<T>;
/**
 * Reactive `Array.reduce`
 *
 * @see https://vueuse.org/useArrayReduce
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 * @param initialValue - a value to be initialized the first time when the callback is called.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
declare function useArrayReduce<T, U>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, reducer: UseArrayReducer<U, T, U>, initialValue: MaybeRefOrGetter<U>): ComputedRef<U>;

/**
 * Reactive `Array.some`
 *
 * @see https://vueuse.org/useArraySome
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns **true** if the `fn` function returns a **truthy** value for any element from the array. Otherwise, **false**.
 */
declare function useArraySome<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown): ComputedRef<boolean>;

/**
 * reactive unique array
 * @see https://vueuse.org/useArrayUnique
 * @param list - the array was called upon.
 * @param compareFn
 * @returns A computed ref that returns a unique array of items.
 */
declare function useArrayUnique<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, compareFn?: (a: T, b: T, array: T[]) => boolean): ComputedRef<T[]>;

interface UseCounterOptions {
    min?: number;
    max?: number;
}
/**
 * Basic counter with utility functions.
 *
 * @see https://vueuse.org/useCounter
 * @param [initialValue]
 * @param options
 */
declare function useCounter(initialValue?: MaybeRef$1<number>, options?: UseCounterOptions): {
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
declare function formatDate(date: Date, formatStr: string, options?: UseDateFormatOptions): string;
declare function normalizeDate(date: DateLike): Date;
/**
 * Get the formatted date according to the string of tokens passed in.
 *
 * @see https://vueuse.org/useDateFormat
 * @param date - The date to format, can either be a `Date` object, a timestamp, or a string
 * @param formatStr - The combination of tokens to format the date
 * @param options - UseDateFormatOptions
 */
declare function useDateFormat(date: MaybeRefOrGetter<DateLike>, formatStr?: MaybeRefOrGetter<string>, options?: UseDateFormatOptions): vue_demi.ComputedRef<string>;
type UseDateFormatReturn = ReturnType<typeof useDateFormat>;

/**
 * Debounce execution of a function.
 *
 * @see https://vueuse.org/useDebounceFn
 * @param  fn          A function to be executed after delay milliseconds debounced.
 * @param  ms          A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param  options     Options
 *
 * @return A new, debounce, function.
 */
declare function useDebounceFn<T extends FunctionArgs>(fn: T, ms?: MaybeRefOrGetter<number>, options?: DebounceFilterOptions): PromisifyFn<T>;

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
declare function useInterval(interval?: MaybeRefOrGetter<number>, options?: UseIntervalOptions<false>): Ref<number>;
declare function useInterval(interval: MaybeRefOrGetter<number>, options: UseIntervalOptions<true>): UseIntervalControls & Pausable;

interface UseIntervalFnOptions {
    /**
     * Start the timer immediately
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Execute the callback immediately after calling `resume`
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
declare function useIntervalFn(cb: Fn, interval?: MaybeRefOrGetter<number>, options?: UseIntervalFnOptions): Pausable;

interface UseLastChangedOptions<Immediate extends boolean, InitialValue extends number | null | undefined = undefined> extends WatchOptions<Immediate> {
    initialValue?: InitialValue;
}
/**
 * Records the timestamp of the last change
 *
 * @see https://vueuse.org/useLastChanged
 */
declare function useLastChanged(source: WatchSource, options?: UseLastChangedOptions<false>): Ref<number | null>;
declare function useLastChanged(source: WatchSource, options: UseLastChangedOptions<true> | UseLastChangedOptions<boolean, number>): Ref<number>;

/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param   fn             A function to be executed after delay milliseconds. The `this` context and all arguments are passed through, as-is,
 *                                    to `callback` when the throttled-function is executed.
 * @param   ms             A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 *                                    (default value: 200)
 *
 * @param [trailing] if true, call fn again after the time is up (default value: false)
 *
 * @param [leading] if true, call fn on the leading edge of the ms timeout (default value: true)
 *
 * @param [rejectOnCancel] if true, reject the last call if it's been cancel (default value: false)
 *
 * @return  A new, throttled, function.
 */
declare function useThrottleFn<T extends FunctionArgs>(fn: T, ms?: MaybeRefOrGetter<number>, trailing?: boolean, leading?: boolean, rejectOnCancel?: boolean): PromisifyFn<T>;

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
declare function useTimeoutFn<CallbackFn extends AnyFn>(cb: CallbackFn, interval: MaybeRefOrGetter<number>, options?: UseTimeoutFnOptions): Stoppable<Parameters<CallbackFn> | []>;

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
declare function useTimeout(interval?: MaybeRefOrGetter<number>, options?: UseTimeoutOptions<false>): ComputedRef<boolean>;
declare function useTimeout(interval: MaybeRefOrGetter<number>, options: UseTimeoutOptions<true>): {
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
 * Reactively convert a string ref to number.
 */
declare function useToNumber(value: MaybeRefOrGetter<number | string>, options?: UseToNumberOptions): ComputedRef<number>;

/**
 * Reactively convert a ref to string.
 *
 * @see https://vueuse.org/useToString
 */
declare function useToString(value: MaybeRefOrGetter<unknown>): ComputedRef<string>;

interface UseToggleOptions<Truthy, Falsy> {
    truthyValue?: MaybeRefOrGetter<Truthy>;
    falsyValue?: MaybeRefOrGetter<Falsy>;
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
    count: MaybeRefOrGetter<number>;
}
interface WatchAtMostReturn {
    stop: WatchStopHandle;
    count: Ref<number>;
}
declare function watchAtMost<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options: WatchAtMostOptions<Immediate>): WatchAtMostReturn;
declare function watchAtMost<T, Immediate extends Readonly<boolean> = false>(sources: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options: WatchAtMostOptions<Immediate>): WatchAtMostReturn;

interface WatchDebouncedOptions<Immediate> extends WatchOptions<Immediate>, DebounceFilterOptions {
    debounce?: MaybeRefOrGetter<number>;
}
declare function watchDebounced<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchDebouncedOptions<Immediate>): WatchStopHandle;
declare function watchDebounced<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchDebouncedOptions<Immediate>): WatchStopHandle;
declare function watchDebounced<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchDebouncedOptions<Immediate>): WatchStopHandle;

declare function watchDeep<T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: Omit<WatchOptions<Immediate>, 'deep'>): WatchStopHandle;
declare function watchDeep<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: Omit<WatchOptions<Immediate>, 'deep'>): WatchStopHandle;
declare function watchDeep<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: Omit<WatchOptions<Immediate>, 'deep'>): WatchStopHandle;

type IgnoredUpdater = (updater: () => void) => void;
interface WatchIgnorableReturn {
    ignoreUpdates: IgnoredUpdater;
    ignorePrevAsyncUpdates: () => void;
    stop: WatchStopHandle;
}
declare function watchIgnorable<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;
declare function watchIgnorable<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;
declare function watchIgnorable<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;

declare function watchImmediate<T extends Readonly<MultiWatchSources>>(source: T, cb: WatchCallback<MapSources<T>, MapOldSources<T, true>>, options?: Omit<WatchOptions<true>, 'immediate'>): WatchStopHandle;
declare function watchImmediate<T>(source: WatchSource<T>, cb: WatchCallback<T, T | undefined>, options?: Omit<WatchOptions<true>, 'immediate'>): WatchStopHandle;
declare function watchImmediate<T extends object>(source: T, cb: WatchCallback<T, T | undefined>, options?: Omit<WatchOptions<true>, 'immediate'>): WatchStopHandle;

declare function watchOnce<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(source: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchOptions<Immediate>): WatchStopHandle;
declare function watchOnce<T, Immediate extends Readonly<boolean> = false>(sources: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchOptions<Immediate>): WatchStopHandle;

interface WatchPausableReturn extends Pausable {
    stop: WatchStopHandle;
}
declare function watchPausable<T extends Readonly<WatchSource<unknown>[]>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchWithFilterOptions<Immediate>): WatchPausableReturn;
declare function watchPausable<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchPausableReturn;
declare function watchPausable<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchPausableReturn;

interface WatchThrottledOptions<Immediate> extends WatchOptions<Immediate> {
    throttle?: MaybeRefOrGetter<number>;
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

interface WheneverOptions extends WatchOptions {
    /**
     * Only trigger once when the condition is met
     *
     * Override the `once` option in `WatchOptions`
     *
     * @default false
     */
    once?: boolean;
}
/**
 * Shorthand for watching value to be truthy
 *
 * @see https://vueuse.org/whenever
 */
declare function whenever<T>(source: WatchSource<T | false | null | undefined>, cb: WatchCallback<T>, options?: WheneverOptions): vue_demi.WatchStopHandle;

export { type AnyFn, type ArgumentsType, type Arrayable, type Awaitable, type Awaited, type ComputedRefWithControl, type ComputedWithControlRefExtra, type ConfigurableEventFilter, type ConfigurableFlush, type ConfigurableFlushSync, type ControlledRefOptions, type CreateInjectionStateOptions, type DateLike, type DebounceFilterOptions, type DeepMaybeRef, type ElementOf, type EventFilter, type EventHook, type EventHookOff, type EventHookOn, type EventHookTrigger, type ExtendRefOptions, type Fn, type FunctionArgs, type FunctionWrapperOptions, type IfAny, type IgnoredUpdater, type IsAny, type MapOldSources, type MapSources, type MaybeRef, type MaybeRefOrGetter, type MultiWatchSources, type Mutable, type Pausable, type Promisify, type PromisifyFn, type Reactified, type ReactifyNested, type ReactifyObjectOptions, type ReactifyOptions, type ReactiveOmitPredicate, type ReactivePickPredicate, type ReadonlyRefOrGetter, type RemovableRef, type ShallowUnwrapRef, type SingletonPromiseReturn, type Stoppable, type SyncRefOptions, type SyncRefsOptions, type ThrottleFilterOptions, type ToRefsOptions, type UntilArrayInstance, type UntilBaseInstance, type UntilToMatchOptions, type UntilValueInstance, type UseArrayIncludesComparatorFn, type UseArrayIncludesOptions, type UseArrayReducer, type UseCounterOptions, type UseDateFormatOptions, type UseDateFormatReturn, type UseIntervalControls, type UseIntervalFnOptions, type UseIntervalOptions, type UseLastChangedOptions, type UseTimeoutFnOptions, type UseTimeoutOptions, type UseToNumberOptions, type UseToggleOptions, type WatchArrayCallback, type WatchAtMostOptions, type WatchAtMostReturn, type WatchDebouncedOptions, type WatchIgnorableReturn, type WatchPausableReturn, type WatchThrottledOptions, type WatchTriggerableCallback, type WatchTriggerableReturn, type WatchWithFilterOptions, type WheneverOptions, type WritableComputedRefWithControl, assert, refAutoReset as autoResetRef, bypassFilter, camelize, clamp, computedEager, computedWithControl, containsProp, computedWithControl as controlledComputed, controlledRef, createEventHook, createFilterWrapper, createGlobalState, createInjectionState, reactify as createReactiveFn, createSharedComposable, createSingletonPromise, debounceFilter, refDebounced as debouncedRef, watchDebounced as debouncedWatch, directiveHooks, computedEager as eagerComputed, extendRef, formatDate, get, getLifeCycleTarget, hasOwn, hyphenate, identity, watchIgnorable as ignorableWatch, increaseWithUnit, injectLocal, invoke, isClient, isDef, isDefined, isIOS, isObject, isWorker, makeDestructurable, noop, normalizeDate, notNullish, now, objectEntries, objectOmit, objectPick, pausableFilter, watchPausable as pausableWatch, promiseTimeout, provideLocal, rand, reactify, reactifyObject, reactiveComputed, reactiveOmit, reactivePick, refAutoReset, refDebounced, refDefault, refThrottled, refWithControl, resolveRef, resolveUnref, set, syncRef, syncRefs, throttleFilter, refThrottled as throttledRef, watchThrottled as throttledWatch, timestamp, toReactive, toRef, toRefs, toValue, tryOnBeforeMount, tryOnBeforeUnmount, tryOnMounted, tryOnScopeDispose, tryOnUnmounted, until, useArrayDifference, useArrayEvery, useArrayFilter, useArrayFind, useArrayFindIndex, useArrayFindLast, useArrayIncludes, useArrayJoin, useArrayMap, useArrayReduce, useArraySome, useArrayUnique, useCounter, useDateFormat, refDebounced as useDebounce, useDebounceFn, useInterval, useIntervalFn, useLastChanged, refThrottled as useThrottle, useThrottleFn, useTimeout, useTimeoutFn, useToNumber, useToString, useToggle, watchArray, watchAtMost, watchDebounced, watchDeep, watchIgnorable, watchImmediate, watchOnce, watchPausable, watchThrottled, watchTriggerable, watchWithFilter, whenever };
