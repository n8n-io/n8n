import * as vue0 from "vue";
import { ComponentInternalInstance, ComputedGetter, ComputedRef, InjectionKey, MaybeRef, MaybeRefOrGetter, MultiWatchSources, MultiWatchSources as MultiWatchSources$1, Ref, ShallowRef, ShallowUnwrapRef as ShallowUnwrapRef$1, ToRef, ToRefs, UnwrapNestedRefs, UnwrapRef, WatchCallback, WatchHandle, WatchOptions, WatchOptionsBase, WatchSource, WatchStopHandle, WritableComputedOptions, WritableComputedRef, getCurrentInstance, inject } from "vue";

//#region computedEager/index.d.ts
type ComputedEagerOptions = WatchOptionsBase;
type ComputedEagerReturn<T = any> = Readonly<ShallowRef<T>>;
/**
 *
 * @deprecated This function will be removed in future version.
 *
 * Note: If you are using Vue 3.4+, you can straight use computed instead.
 * Because in Vue 3.4+, if computed new value does not change,
 * computed, effect, watch, watchEffect, render dependencies will not be triggered.
 * refer: https://github.com/vuejs/core/pull/5912
 *
 * @param fn effect function
 * @param options WatchOptionsBase
 * @returns readonly shallowRef
 */
declare function computedEager<T>(fn: () => T, options?: ComputedEagerOptions): ComputedEagerReturn<T>;
/** @deprecated use `computedEager` instead */
declare const eagerComputed: typeof computedEager;
//#endregion
//#region computedWithControl/index.d.ts
interface ComputedWithControlRefExtra {
  /**
   * Force update the computed value.
   */
  trigger: () => void;
}
interface ComputedRefWithControl<T> extends ComputedRef<T>, ComputedWithControlRefExtra {}
interface WritableComputedRefWithControl<T> extends WritableComputedRef<T>, ComputedWithControlRefExtra {}
type ComputedWithControlRef<T = any> = ComputedRefWithControl<T> | WritableComputedRefWithControl<T>;
declare function computedWithControl<T>(source: WatchSource | MultiWatchSources$1, fn: ComputedGetter<T>, options?: WatchOptions): ComputedRefWithControl<T>;
declare function computedWithControl<T>(source: WatchSource | MultiWatchSources$1, fn: WritableComputedOptions<T>, options?: WatchOptions): WritableComputedRefWithControl<T>;
/** @deprecated use `computedWithControl` instead */
declare const controlledComputed: typeof computedWithControl;
//#endregion
//#region utils/types.d.ts
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
type RemovableRef<T> = Ref<T, T | null | undefined>;
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
type DeepMaybeRef<T> = T extends Ref<infer V> ? MaybeRef<V> : T extends Array<any> | object ? { [K in keyof T]: DeepMaybeRef<T[K]> } : MaybeRef<T>;
type Arrayable<T> = T[] | T;
/**
 * Infers the element type of an array
 */
type ElementOf<T> = T extends (infer E)[] ? E : never;
type ShallowUnwrapRef<T> = T extends Ref<infer P> ? P : T;
type Awaitable<T> = Promise<T> | T;
type ArgumentsType<T> = T extends ((...args: infer U) => any) ? U : never;
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
  readonly isActive: Readonly<ShallowRef<boolean>>;
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
  readonly isPending: Readonly<Ref<boolean>>;
  /**
   * Stop the effect from executing
   */
  stop: Fn;
  /**
   * Start the effects
   */
  start: (...args: StartFnArgs) => void;
}
type WatchOptionFlush = WatchOptions['flush'];
interface ConfigurableFlush {
  /**
   * Timing for monitoring changes, refer to WatchOptions for more details
   *
   * @default 'pre'
   */
  flush?: WatchOptionFlush;
}
interface ConfigurableFlushSync {
  /**
   * Timing for monitoring changes, refer to WatchOptions for more details.
   * Unlike `watch()`, the default is set to `sync`
   *
   * @default 'sync'
   */
  flush?: WatchOptionFlush;
}
type MapSources<T> = { [K in keyof T]: T[K] extends WatchSource<infer V> ? V : never };
type MapOldSources<T, Immediate> = { [K in keyof T]: T[K] extends WatchSource<infer V> ? Immediate extends true ? V | undefined : V : never };
type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type IfAny<T, Y, N> = 0 extends (1 & T) ? Y : N;
/**
 * will return `true` if `T` is `any`, or `false` otherwise
 */
type IsAny<T> = IfAny<T, true, false>;
/**
 * Universal timer handle that works in both browser and Node.js environments
 */
type TimerHandle = ReturnType<typeof setTimeout> | undefined;
type InstanceProxy = NonNullable<NonNullable<ReturnType<typeof getCurrentInstance>>['proxy']>;
//#endregion
//#region createEventHook/index.d.ts
type Callback<T> = IsAny<T> extends true ? (...param: any) => void : ([T] extends [void] ? (...param: unknown[]) => void : [T] extends [any[]] ? (...param: T) => void : (...param: [T, ...unknown[]]) => void);
type EventHookOn<T = any> = (fn: Callback<T>) => {
  off: () => void;
};
type EventHookOff<T = any> = (fn: Callback<T>) => void;
type EventHookTrigger<T = any> = (...param: Parameters<Callback<T>>) => Promise<unknown[]>;
interface EventHook<T = any> {
  on: EventHookOn<T>;
  off: EventHookOff<T>;
  trigger: EventHookTrigger<T>;
  clear: () => void;
}
type EventHookReturn<T> = EventHook<T>;
/**
 * Utility for creating event hooks
 *
 * @see https://vueuse.org/createEventHook
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function createEventHook<T = any>(): EventHookReturn<T>;
//#endregion
//#region utils/filters.d.ts
type FunctionArgs<Args extends any[] = any[], Return = unknown> = (...args: Args) => Return;
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
 */
declare function throttleFilter(ms: MaybeRefOrGetter<number>, trailing?: boolean, leading?: boolean, rejectOnCancel?: boolean): EventFilter;
declare function throttleFilter(options: ThrottleFilterOptions): EventFilter;
interface PausableFilterOptions {
  /**
   * The initial state
   *
   * @default 'active'
   */
  initialState?: 'active' | 'paused';
}
/**
 * EventFilter that gives extra controls to pause and resume the filter
 *
 * @param extendFilter  Extra filter to apply when the PausableFilter is active, default to none
 * @param options Options to configure the filter
 */
declare function pausableFilter(extendFilter?: EventFilter, options?: PausableFilterOptions): Pausable & {
  eventFilter: EventFilter;
};
//#endregion
//#region utils/general.d.ts
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
 * Get a px value for SSR use, do not rely on this method outside of SSR as REM unit is assumed at 16px, which might not be the case on the client
 */
declare function pxValue(px: string): number;
/**
 * Create a new subset object by giving keys
 */
declare function objectPick<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined?: boolean): Pick<O, T>;
/**
 * Create a new subset object by omit giving keys
 */
declare function objectOmit<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined?: boolean): Omit<O, T>;
declare function objectEntries<T extends object>(obj: T): Array<[keyof T, T[keyof T]]>;
declare function toArray<T>(value: T | readonly T[]): readonly T[];
declare function toArray<T>(value: T | T[]): T[];
//#endregion
//#region utils/is.d.ts
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
declare const hasOwn: <T extends object, K$1 extends keyof T>(val: T, key: K$1) => key is K$1;
declare const isIOS: boolean;
//#endregion
//#region utils/port.d.ts
declare const hyphenate: (str: string) => string;
declare const camelize: (str: string) => string;
//#endregion
//#region utils/vue.d.ts
declare function getLifeCycleTarget(target?: ComponentInternalInstance | null): ComponentInternalInstance | null;
//#endregion
//#region createGlobalState/index.d.ts
type CreateGlobalStateReturn<Fn$1 extends AnyFn = AnyFn> = Fn$1;
/**
 * Keep states in the global scope to be reusable across Vue instances.
 *
 * @see https://vueuse.org/createGlobalState
 * @param stateFactory A factory function to create the state
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function createGlobalState<Fn$1 extends AnyFn>(stateFactory: Fn$1): CreateGlobalStateReturn<Fn$1>;
//#endregion
//#region createInjectionState/index.d.ts
type CreateInjectionStateReturn<Arguments extends Array<any>, Return> = Readonly<[
/**
 * Call this function in a provider component to create and provide the state.
 *
 * @param args Arguments passed to the composable
 * @returns The state returned by the composable
 */
useProvidingState: (...args: Arguments) => Return,
/**
 * Call this function in a consumer component to inject the state.
 *
 * @returns The injected state, or `undefined` if not provided and no default value was set.
 */
useInjectedState: () => Return | undefined]>;
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
 * @__NO_SIDE_EFFECTS__
 */
declare function createInjectionState<Arguments extends Array<any>, Return>(composable: (...args: Arguments) => Return, options?: CreateInjectionStateOptions<Return>): CreateInjectionStateReturn<Arguments, Return>;
//#endregion
//#region createRef/index.d.ts
type CreateRefReturn<T = any, D extends boolean = false> = ShallowOrDeepRef<T, D>;
type ShallowOrDeepRef<T = any, D extends boolean = false> = D extends true ? Ref<T> : ShallowRef<T>;
/**
 * Returns a `deepRef` or `shallowRef` depending on the `deep` param.
 *
 * @example createRef(1) // ShallowRef<number>
 * @example createRef(1, false) // ShallowRef<number>
 * @example createRef(1, true) // Ref<number>
 * @example createRef("string") // ShallowRef<string>
 * @example createRef<"A"|"B">("A", true) // Ref<"A"|"B">
 *
 * @param value
 * @param deep
 * @returns the `deepRef` or `shallowRef`
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function createRef<T = any, D extends boolean = false>(value: T, deep?: D): CreateRefReturn<T, D>;
//#endregion
//#region createSharedComposable/index.d.ts
type SharedComposableReturn<T extends AnyFn = AnyFn> = T;
/**
 * Make a composable function usable with multiple Vue instances.
 *
 * @see https://vueuse.org/createSharedComposable
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function createSharedComposable<Fn$1 extends AnyFn>(composable: Fn$1): SharedComposableReturn<Fn$1>;
//#endregion
//#region extendRef/index.d.ts
type ExtendRefReturn<T = any> = Ref<T>;
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
declare function extendRef<R$1 extends Ref<any>, Extend extends object, Options extends ExtendRefOptions<false>>(ref: R$1, extend: Extend, options?: Options): ShallowUnwrapRef$1<Extend> & R$1;
/**
 * Overload 2: Unwrap unset or set to true
 */
declare function extendRef<R$1 extends Ref<any>, Extend extends object, Options extends ExtendRefOptions>(ref: R$1, extend: Extend, options?: Options): Extend & R$1;
//#endregion
//#region get/index.d.ts
/**
 * Shorthand for accessing `ref.value`
 */
declare function get<T>(ref: MaybeRef<T>): T;
declare function get<T, K$1 extends keyof T>(ref: MaybeRef<T>, key: K$1): T[K$1];
//#endregion
//#region injectLocal/index.d.ts
/**
 * On the basis of `inject`, it is allowed to directly call inject to obtain the value after call provide in the same component.
 *
 * @example
 * ```ts
 * injectLocal('MyInjectionKey', 1)
 * const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
 * ```
 *
 * @__NO_SIDE_EFFECTS__
 */
declare const injectLocal: typeof inject;
//#endregion
//#region isDefined/index.d.ts
type IsDefinedReturn = boolean;
declare function isDefined<T>(v: ComputedRef<T>): v is ComputedRef<Exclude<T, null | undefined>>;
declare function isDefined<T>(v: Ref<T>): v is Ref<Exclude<T, null | undefined>>;
declare function isDefined<T>(v: T): v is Exclude<T, null | undefined>;
//#endregion
//#region makeDestructurable/index.d.ts
declare function makeDestructurable<T extends Record<string, unknown>, A$1 extends readonly any[]>(obj: T, arr: A$1): T & A$1;
//#endregion
//#region provideLocal/map.d.ts
type LocalProvidedKey<T> = InjectionKey<T> | string | number;
//#endregion
//#region provideLocal/index.d.ts
type ProvideLocalReturn = void;
/**
 * On the basis of `provide`, it is allowed to directly call inject to obtain the value after call provide in the same component.
 *
 * @example
 * ```ts
 * provideLocal('MyInjectionKey', 1)
 * const injectedValue = injectLocal('MyInjectionKey') // injectedValue === 1
 * ```
 */
declare function provideLocal<T, K$1 = LocalProvidedKey<T>>(key: K$1, value: K$1 extends InjectionKey<infer V> ? V : T): ProvideLocalReturn;
//#endregion
//#region reactify/index.d.ts
type Reactified<T, Computed extends boolean> = T extends ((...args: infer A) => infer R) ? (...args: { [K in keyof A]: Computed extends true ? MaybeRefOrGetter<A[K]> : MaybeRef<A[K]> }) => ComputedRef<R> : never;
type ReactifyReturn<T extends AnyFn = AnyFn, K$1 extends boolean = true> = Reactified<T, K$1>;
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
 * @param options - Options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function reactify<T extends AnyFn, K$1 extends boolean = true>(fn: T, options?: ReactifyOptions<K$1>): ReactifyReturn<T, K$1>;
/** @deprecated use `reactify` instead */
declare const createReactiveFn: typeof reactify;
//#endregion
//#region reactifyObject/index.d.ts
type ReactifyNested<T, Keys extends keyof T = keyof T, S$1 extends boolean = true> = { [K in Keys]: T[K] extends AnyFn ? Reactified<T[K], S$1> : T[K] };
type ReactifyObjectReturn<T, Keys extends keyof T, S$1 extends boolean = true> = ReactifyNested<T, Keys, S$1>;
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function reactifyObject<T extends object, Keys extends keyof T>(obj: T, keys?: (keyof T)[]): ReactifyObjectReturn<T, Keys, true>;
declare function reactifyObject<T extends object, S$1 extends boolean = true>(obj: T, options?: ReactifyObjectOptions<S$1>): ReactifyObjectReturn<T, keyof T, S$1>;
//#endregion
//#region reactiveComputed/index.d.ts
type ReactiveComputedReturn<T extends object> = UnwrapNestedRefs<T>;
/**
 * Computed reactive object.
 */
declare function reactiveComputed<T extends object>(fn: ComputedGetter<T>): ReactiveComputedReturn<T>;
//#endregion
//#region reactiveOmit/index.d.ts
type ReactiveOmitReturn<T extends object, K$1 extends keyof T | undefined = undefined> = [K$1] extends [undefined] ? Partial<T> : Omit<T, Extract<K$1, keyof T>>;
type ReactiveOmitPredicate<T> = (value: T[keyof T], key: keyof T) => boolean;
declare function reactiveOmit<T extends object, K$1 extends keyof T>(obj: T, ...keys: (K$1 | K$1[])[]): ReactiveOmitReturn<T, K$1>;
declare function reactiveOmit<T extends object>(obj: T, predicate: ReactiveOmitPredicate<T>): ReactiveOmitReturn<T>;
//#endregion
//#region reactivePick/index.d.ts
type ReactivePickReturn<T extends object, K$1 extends keyof T> = { [S in K$1]: UnwrapRef<T[S]> };
type ReactivePickPredicate<T> = (value: T[keyof T], key: keyof T) => boolean;
declare function reactivePick<T extends object, K$1 extends keyof T>(obj: T, ...keys: (K$1 | K$1[])[]): ReactivePickReturn<T, K$1>;
declare function reactivePick<T extends object>(obj: T, predicate: ReactivePickPredicate<T>): ReactivePickReturn<T, keyof T>;
//#endregion
//#region refAutoReset/index.d.ts
type RefAutoResetReturn<T = any> = Ref<T>;
/**
 * Create a ref which will be reset to the default value after some time.
 *
 * @see https://vueuse.org/refAutoReset
 * @param defaultValue The value which will be set.
 * @param afterMs      A zero-or-greater delay in milliseconds.
 */
declare function refAutoReset<T>(defaultValue: MaybeRefOrGetter<T>, afterMs?: MaybeRefOrGetter<number>): RefAutoResetReturn<T>;
/** @deprecated use `refAutoReset` instead */
declare const autoResetRef: typeof refAutoReset;
//#endregion
//#region refDebounced/index.d.ts
type RefDebouncedReturn<T = any> = Readonly<Ref<T>>;
/**
 * Debounce updates of a ref.
 *
 * @return A new debounced ref.
 */
declare function refDebounced<T>(value: Ref<T>, ms?: MaybeRefOrGetter<number>, options?: DebounceFilterOptions): RefDebouncedReturn<T>;
/** @deprecated use `refDebounced` instead */
declare const debouncedRef: typeof refDebounced;
/** @deprecated use `refDebounced` instead */
declare const useDebounce: typeof refDebounced;
//#endregion
//#region refDefault/index.d.ts
/**
 * Apply default value to a ref.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function refDefault<T>(source: Ref<T | undefined | null>, defaultValue: T): Ref<T>;
//#endregion
//#region refManualReset/index.d.ts
/**
 * Define the shape of a ref that supports manual reset functionality.
 *
 * This interface extends the standard `Ref` type from Vue and adds a `reset` method.
 * The `reset` method allows the ref to be manually reset to its default value.
 */
interface ManualResetRefReturn<T> extends Ref<T> {
  reset: Fn;
}
/**
 * Create a ref with manual reset functionality.
 *
 * @see https://vueuse.org/refManualReset
 * @param defaultValue The value which will be set.
 */
declare function refManualReset<T>(defaultValue: MaybeRefOrGetter<T>): ManualResetRefReturn<T>;
//#endregion
//#region refThrottled/index.d.ts
type RefThrottledReturn<T = any> = Ref<T>;
/**
 * Throttle execution of a function. Especially useful for rate limiting
 * execution of handlers on events like resize and scroll.
 *
 * @param value Ref value to be watched with throttle effect
 * @param  delay  A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param trailing if true, update the value again after the delay time is up
 * @param leading if true, update the value on the leading edge of the ms timeout
 */
declare function refThrottled<T = any>(value: Ref<T>, delay?: number, trailing?: boolean, leading?: boolean): RefThrottledReturn<T>;
/** @deprecated use `refThrottled` instead */
declare const throttledRef: typeof refThrottled;
/** @deprecated use `refThrottled` instead */
declare const useThrottle: typeof refThrottled;
//#endregion
//#region refWithControl/index.d.ts
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function refWithControl<T>(initial: T, options?: ControlledRefOptions<T>): vue0.ShallowUnwrapRef<{
  get: (tracking?: boolean) => T;
  set: (value: T, triggering?: boolean) => void;
  untrackedGet: () => T;
  silentSet: (v: T) => void;
  peek: () => T;
  lay: (v: T) => void;
}> & vue0.Ref<T, T>;
/** @deprecated use `refWithControl` instead */
declare const controlledRef: typeof refWithControl;
//#endregion
//#region set/index.d.ts
declare function set<T>(ref: Ref<T>, value: T): void;
declare function set<O extends object, K$1 extends keyof O>(target: O, key: K$1, value: O[K$1]): void;
//#endregion
//#region syncRef/index.d.ts
type Direction = 'ltr' | 'rtl' | 'both';
type SpecificFieldPartial<T, K$1 extends keyof T> = Partial<Pick<T, K$1>> & Omit<T, K$1>;
/**
 * A = B
 */
type Equal<A$1, B> = [A$1] extends [B] ? ([B] extends [A$1] ? true : false) : false;
/**
 * A ∩ B ≠ ∅
 */
type IntersectButNotEqual<A$1, B> = Equal<A$1, B> extends true ? false : A$1 & B extends never ? false : true;
/**
 * A ⊆ B
 */
type IncludeButNotEqual<A$1, B> = Equal<A$1, B> extends true ? false : A$1 extends B ? true : false;
/**
 * A ∩ B = ∅
 */
type NotIntersect<A$1, B> = Equal<A$1, B> extends true ? false : A$1 & B extends never ? true : false;
interface EqualType<D extends Direction, L, R$1, O extends keyof Transform<L, R$1> = (D extends 'both' ? 'ltr' | 'rtl' : D)> {
  transform?: SpecificFieldPartial<Pick<Transform<L, R$1>, O>, O>;
}
type StrictIncludeMap<IncludeType extends 'LR' | 'RL', D extends Exclude<Direction, 'both'>, L, R$1> = (Equal<[IncludeType, D], ['LR', 'ltr']> & Equal<[IncludeType, D], ['RL', 'rtl']>) extends true ? {
  transform?: SpecificFieldPartial<Pick<Transform<L, R$1>, D>, D>;
} : {
  transform: Pick<Transform<L, R$1>, D>;
};
type StrictIncludeType<IncludeType extends 'LR' | 'RL', D extends Direction, L, R$1> = D extends 'both' ? {
  transform: SpecificFieldPartial<Transform<L, R$1>, IncludeType extends 'LR' ? 'ltr' : 'rtl'>;
} : D extends Exclude<Direction, 'both'> ? StrictIncludeMap<IncludeType, D, L, R$1> : never;
type IntersectButNotEqualType<D extends Direction, L, R$1> = D extends 'both' ? {
  transform: Transform<L, R$1>;
} : D extends Exclude<Direction, 'both'> ? {
  transform: Pick<Transform<L, R$1>, D>;
} : never;
type NotIntersectType<D extends Direction, L, R$1> = IntersectButNotEqualType<D, L, R$1>;
interface Transform<L, R$1> {
  ltr: (left: L) => R$1;
  rtl: (right: R$1) => L;
}
type TransformType<D extends Direction, L, R$1> = Equal<L, R$1> extends true ? EqualType<D, L, R$1> : IncludeButNotEqual<L, R$1> extends true ? StrictIncludeType<'LR', D, L, R$1> : IncludeButNotEqual<R$1, L> extends true ? StrictIncludeType<'RL', D, L, R$1> : IntersectButNotEqual<L, R$1> extends true ? IntersectButNotEqualType<D, L, R$1> : NotIntersect<L, R$1> extends true ? NotIntersectType<D, L, R$1> : never;
type SyncRefOptions<L, R$1, D extends Direction> = ConfigurableFlushSync & {
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
} & TransformType<D, L, R$1>;
/**
 * Two-way refs synchronization.
 * From the set theory perspective to restrict the option's type
 * Check in the following order:
 * 1. L = R
 * 2. L ∩ R ≠ ∅
 * 3. L ⊆ R
 * 4. L ∩ R = ∅
 */
declare function syncRef<L, R$1, D extends Direction = 'both'>(left: Ref<L>, right: Ref<R$1>, ...[options]: Equal<L, R$1> extends true ? [options?: SyncRefOptions<L, R$1, D>] : [options: SyncRefOptions<L, R$1, D>]): () => void;
//#endregion
//#region syncRefs/index.d.ts
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
declare function syncRefs<T>(source: WatchSource<T>, targets: Ref<T> | Ref<T>[], options?: SyncRefsOptions): vue0.WatchHandle;
//#endregion
//#region toReactive/index.d.ts
/**
 * Converts ref to reactive.
 *
 * @see https://vueuse.org/toReactive
 * @param objectRef A ref of object
 */
declare function toReactive<T extends object>(objectRef: MaybeRef<T>): UnwrapNestedRefs<T>;
//#endregion
//#region toRef/index.d.ts
/**
 * Normalize value/ref/getter to `ref` or `computed`.
 */
declare function toRef<T>(r: () => T): Readonly<Ref<T>>;
declare function toRef<T>(r: ComputedRef<T>): ComputedRef<T>;
declare function toRef<T>(r: MaybeRefOrGetter<T>): Ref<T>;
declare function toRef<T>(r: T): Ref<T>;
declare function toRef<T extends object, K$1 extends keyof T>(object: T, key: K$1): ToRef<T[K$1]>;
declare function toRef<T extends object, K$1 extends keyof T>(object: T, key: K$1, defaultValue: T[K$1]): ToRef<Exclude<T[K$1], undefined>>;
//#endregion
//#region toRefs/index.d.ts
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
 * @param options Options
 */
declare function toRefs<T extends object>(objectRef: MaybeRef<T>, options?: ToRefsOptions): ToRefs<T>;
//#endregion
//#region tryOnBeforeMount/index.d.ts
/**
 * Call onBeforeMount() if it's inside a component lifecycle, if not, just call the function
 *
 * @param fn
 * @param sync if set to false, it will run in the nextTick() of Vue
 * @param target
 */
declare function tryOnBeforeMount(fn: Fn, sync?: boolean, target?: ComponentInternalInstance | null): void;
//#endregion
//#region tryOnBeforeUnmount/index.d.ts
/**
 * Call onBeforeUnmount() if it's inside a component lifecycle, if not, do nothing
 *
 * @param fn
 * @param target
 */
declare function tryOnBeforeUnmount(fn: Fn, target?: ComponentInternalInstance | null): void;
//#endregion
//#region tryOnMounted/index.d.ts
/**
 * Call onMounted() if it's inside a component lifecycle, if not, just call the function
 *
 * @param fn
 * @param sync if set to false, it will run in the nextTick() of Vue
 * @param target
 */
declare function tryOnMounted(fn: Fn, sync?: boolean, target?: ComponentInternalInstance | null): void;
//#endregion
//#region tryOnScopeDispose/index.d.ts
/**
 * Call onScopeDispose() if it's inside an effect scope lifecycle, if not, do nothing
 *
 * @param fn
 */
declare function tryOnScopeDispose(fn: Fn, failSilently?: boolean): boolean;
//#endregion
//#region tryOnUnmounted/index.d.ts
/**
 * Call onUnmounted() if it's inside a component lifecycle, if not, do nothing
 *
 * @param fn
 * @param target
 */
declare function tryOnUnmounted(fn: Fn, target?: ComponentInternalInstance | null): void;
//#endregion
//#region until/index.d.ts
interface UntilToMatchOptions extends ConfigurableFlushSync {
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
   * `deep` option for internal watch
   *
   * @default 'false'
   */
  deep?: WatchOptions['deep'];
}
interface UntilBaseInstance<T, Not extends boolean = false> {
  toMatch: (<U$1 extends T = T>(condition: (v: T) => v is U$1, options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, U$1>> : Promise<U$1>) & ((condition: (v: T) => boolean, options?: UntilToMatchOptions) => Promise<T>);
  changed: (options?: UntilToMatchOptions) => Promise<T>;
  changedTimes: (n?: number, options?: UntilToMatchOptions) => Promise<T>;
}
type Falsy = false | void | null | undefined | 0 | 0n | '';
interface UntilValueInstance<T, Not extends boolean = false> extends UntilBaseInstance<T, Not> {
  readonly not: UntilValueInstance<T, Not extends true ? false : true>;
  toBe: <P$1 = T>(value: MaybeRefOrGetter<P$1>, options?: UntilToMatchOptions) => Not extends true ? Promise<T> : Promise<P$1>;
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
//#endregion
//#region useArrayDifference/index.d.ts
interface UseArrayDifferenceOptions {
  /**
   * Returns asymmetric difference
   *
   * @see https://en.wikipedia.org/wiki/Symmetric_difference
   * @default false
   */
  symmetric?: boolean;
}
type UseArrayDifferenceReturn<T = any> = ComputedRef<T[]>;
declare function useArrayDifference<T>(list: MaybeRefOrGetter<T[]>, values: MaybeRefOrGetter<T[]>, key?: keyof T, options?: UseArrayDifferenceOptions): UseArrayDifferenceReturn<T>;
declare function useArrayDifference<T>(list: MaybeRefOrGetter<T[]>, values: MaybeRefOrGetter<T[]>, compareFn?: (value: T, othVal: T) => boolean, options?: UseArrayDifferenceOptions): UseArrayDifferenceReturn<T>;
//#endregion
//#region useArrayEvery/index.d.ts
type UseArrayEveryReturn = ComputedRef<boolean>;
/**
 * Reactive `Array.every`
 *
 * @see https://vueuse.org/useArrayEvery
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns **true** if the `fn` function returns a **truthy** value for every element from the array. Otherwise, **false**.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayEvery<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown): UseArrayEveryReturn;
//#endregion
//#region useArrayFilter/index.d.ts
type UseArrayFilterReturn<T = any> = ComputedRef<T[]>;
/**
 * Reactive `Array.filter`
 *
 * @see https://vueuse.org/useArrayFilter
 * @param list - the array was called upon.
 * @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
 *
 * @returns a shallow copy of a portion of the given array, filtered down to just the elements from the given array that pass the test implemented by the provided function. If no elements pass the test, an empty array will be returned.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayFilter<T, S$1 extends T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: T[]) => element is S$1): UseArrayFilterReturn<S$1>;
declare function useArrayFilter<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: T[]) => unknown): UseArrayFilterReturn<T>;
//#endregion
//#region useArrayFind/index.d.ts
type UseArrayFindReturn<T = any> = ComputedRef<T | undefined>;
/**
 * Reactive `Array.find`
 *
 * @see https://vueuse.org/useArrayFind
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the first element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayFind<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => boolean): UseArrayFindReturn<T>;
//#endregion
//#region useArrayFindIndex/index.d.ts
type UseArrayFindIndexReturn = ComputedRef<number>;
/**
 * Reactive `Array.findIndex`
 *
 * @see https://vueuse.org/useArrayFindIndex
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the index of the first element in the array that passes the test. Otherwise, "-1".
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayFindIndex<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown): UseArrayFindIndexReturn;
//#endregion
//#region useArrayFindLast/index.d.ts
type UseArrayFindLastReturn<T = any> = ComputedRef<T | undefined>;
/**
 * Reactive `Array.findLast`
 *
 * @see https://vueuse.org/useArrayFindLast
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the last element in the array that satisfies the provided testing function. Otherwise, undefined is returned.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayFindLast<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => boolean): UseArrayFindLastReturn<T>;
//#endregion
//#region useArrayIncludes/index.d.ts
type UseArrayIncludesComparatorFn<T, V$1> = ((element: T, value: V$1, index: number, array: MaybeRefOrGetter<T>[]) => boolean);
interface UseArrayIncludesOptions<T, V$1> {
  fromIndex?: number;
  comparator?: UseArrayIncludesComparatorFn<T, V$1> | keyof T;
}
type UseArrayIncludesReturn = ComputedRef<boolean>;
/**
 * Reactive `Array.includes`
 *
 * @see https://vueuse.org/useArrayIncludes
 *
 * @returns true if the `value` is found in the array. Otherwise, false.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayIncludes<T, V$1 = any>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, value: MaybeRefOrGetter<V$1>, comparator?: UseArrayIncludesComparatorFn<T, V$1>): UseArrayIncludesReturn;
declare function useArrayIncludes<T, V$1 = any>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, value: MaybeRefOrGetter<V$1>, comparator?: keyof T): UseArrayIncludesReturn;
declare function useArrayIncludes<T, V$1 = any>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, value: MaybeRefOrGetter<V$1>, options?: UseArrayIncludesOptions<T, V$1>): UseArrayIncludesReturn;
//#endregion
//#region useArrayJoin/index.d.ts
type UseArrayJoinReturn = ComputedRef<string>;
/**
 * Reactive `Array.join`
 *
 * @see https://vueuse.org/useArrayJoin
 * @param list - the array was called upon.
 * @param separator - a string to separate each pair of adjacent elements of the array. If omitted, the array elements are separated with a comma (",").
 *
 * @returns a string with all array elements joined. If arr.length is 0, the empty string is returned.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayJoin(list: MaybeRefOrGetter<MaybeRefOrGetter<any>[]>, separator?: MaybeRefOrGetter<string>): UseArrayJoinReturn;
//#endregion
//#region useArrayMap/index.d.ts
type UseArrayMapReturn<T = any> = ComputedRef<T[]>;
/**
 * Reactive `Array.map`
 *
 * @see https://vueuse.org/useArrayMap
 * @param list - the array was called upon.
 * @param fn - a function that is called for every element of the given `list`. Each time `fn` executes, the returned value is added to the new array.
 *
 * @returns a new array with each element being the result of the callback function.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayMap<T, U$1 = T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: T[]) => U$1): UseArrayMapReturn<U$1>;
//#endregion
//#region useArrayReduce/index.d.ts
type UseArrayReducer<PV, CV, R$1> = (previousValue: PV, currentValue: CV, currentIndex: number) => R$1;
type UseArrayReduceReturn<T = any> = ComputedRef<T>;
/**
 * Reactive `Array.reduce`
 *
 * @see https://vueuse.org/useArrayReduce
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayReduce<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, reducer: UseArrayReducer<T, T, T>): UseArrayReduceReturn<T>;
/**
 * Reactive `Array.reduce`
 *
 * @see https://vueuse.org/useArrayReduce
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 * @param initialValue - a value to be initialized the first time when the callback is called.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayReduce<T, U$1>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, reducer: UseArrayReducer<U$1, T, U$1>, initialValue: MaybeRefOrGetter<U$1>): UseArrayReduceReturn<U$1>;
//#endregion
//#region useArraySome/index.d.ts
type UseArraySomeReturn = ComputedRef<boolean>;
/**
 * Reactive `Array.some`
 *
 * @see https://vueuse.org/useArraySome
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns **true** if the `fn` function returns a **truthy** value for any element from the array. Otherwise, **false**.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArraySome<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, fn: (element: T, index: number, array: MaybeRefOrGetter<T>[]) => unknown): UseArraySomeReturn;
//#endregion
//#region useArrayUnique/index.d.ts
type UseArrayUniqueReturn<T = any> = ComputedRef<T[]>;
/**
 * reactive unique array
 * @see https://vueuse.org/useArrayUnique
 * @param list - the array was called upon.
 * @param compareFn
 * @returns A computed ref that returns a unique array of items.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useArrayUnique<T>(list: MaybeRefOrGetter<MaybeRefOrGetter<T>[]>, compareFn?: (a: T, b: T, array: T[]) => boolean): UseArrayUniqueReturn<T>;
//#endregion
//#region useCounter/index.d.ts
interface UseCounterOptions {
  min?: number;
  max?: number;
}
interface UseCounterReturn {
  /**
   * The current value of the counter.
   */
  readonly count: Readonly<Ref<number>>;
  /**
   * Increment the counter.
   *
   * @param {number} [delta=1] The number to increment.
   */
  inc: (delta?: number) => void;
  /**
   * Decrement the counter.
   *
   * @param {number} [delta=1] The number to decrement.
   */
  dec: (delta?: number) => void;
  /**
   * Get the current value of the counter.
   */
  get: () => number;
  /**
   * Set the counter to a new value.
   *
   * @param val The new value of the counter.
   */
  set: (val: number) => void;
  /**
   * Reset the counter to an initial value.
   */
  reset: (val?: number) => number;
}
/**
 * Basic counter with utility functions.
 *
 * @see https://vueuse.org/useCounter
 * @param [initialValue]
 * @param options
 */
declare function useCounter(initialValue?: MaybeRef<number>, options?: UseCounterOptions): {
  count: Readonly<Ref<number, number> | vue0.ShallowRef<number, number> | vue0.WritableComputedRef<number, number>>;
  inc: (delta?: number) => number;
  dec: (delta?: number) => number;
  get: () => number;
  set: (val: number) => number;
  reset: (val?: number) => number;
};
//#endregion
//#region useDateFormat/index.d.ts
type DateLike = Date | number | string | undefined;
interface UseDateFormatOptions {
  /**
   * The locale(s) to used for dd/ddd/dddd/MMM/MMMM format
   *
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locales_argument).
   */
  locales?: MaybeRefOrGetter<Intl.LocalesArgument>;
  /**
   * A custom function to re-modify the way to display meridiem
   *
   */
  customMeridiem?: (hours: number, minutes: number, isLowercase?: boolean, hasPeriod?: boolean) => string;
}
declare function formatDate(date: Date, formatStr: string, options?: UseDateFormatOptions): string;
declare function normalizeDate(date: DateLike): Date;
type UseDateFormatReturn = ComputedRef<string>;
/**
 * Get the formatted date according to the string of tokens passed in.
 *
 * @see https://vueuse.org/useDateFormat
 * @param date - The date to format, can either be a `Date` object, a timestamp, or a string
 * @param formatStr - The combination of tokens to format the date
 * @param options - UseDateFormatOptions
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useDateFormat(date: MaybeRefOrGetter<DateLike>, formatStr?: MaybeRefOrGetter<string>, options?: UseDateFormatOptions): UseDateFormatReturn;
//#endregion
//#region useDebounceFn/index.d.ts
type UseDebounceFnReturn<T extends FunctionArgs> = PromisifyFn<T>;
/**
 * Debounce execution of a function.
 *
 * @see https://vueuse.org/useDebounceFn
 * @param  fn          A function to be executed after delay milliseconds debounced.
 * @param  ms          A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 * @param  options     Options
 *
 * @return A new, debounce, function.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useDebounceFn<T extends FunctionArgs>(fn: T, ms?: MaybeRefOrGetter<number>, options?: DebounceFilterOptions): UseDebounceFnReturn<T>;
//#endregion
//#region useInterval/index.d.ts
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
  counter: ShallowRef<number>;
  reset: () => void;
}
type UseIntervalReturn = Readonly<ShallowRef<number>> | Readonly<UseIntervalControls & Pausable>;
/**
 * Reactive counter increases on every interval
 *
 * @see https://vueuse.org/useInterval
 * @param interval
 * @param options
 */
declare function useInterval(interval?: MaybeRefOrGetter<number>, options?: UseIntervalOptions<false>): Readonly<ShallowRef<number>>;
declare function useInterval(interval: MaybeRefOrGetter<number>, options: UseIntervalOptions<true>): Readonly<UseIntervalControls & Pausable>;
//#endregion
//#region useIntervalFn/index.d.ts
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
type UseIntervalFnReturn = Pausable;
/**
 * Wrapper for `setInterval` with controls
 *
 * @see https://vueuse.org/useIntervalFn
 * @param cb
 * @param interval
 * @param options
 */
declare function useIntervalFn(cb: Fn, interval?: MaybeRefOrGetter<number>, options?: UseIntervalFnOptions): UseIntervalFnReturn;
//#endregion
//#region useLastChanged/index.d.ts
interface UseLastChangedOptions<Immediate extends boolean, InitialValue extends number | null | undefined = undefined> extends WatchOptions<Immediate> {
  initialValue?: InitialValue;
}
type UseLastChangedReturn = Readonly<ShallowRef<number | null>> | Readonly<ShallowRef<number>>;
/**
 * Records the timestamp of the last change
 *
 * @see https://vueuse.org/useLastChanged
 */
declare function useLastChanged(source: WatchSource, options?: UseLastChangedOptions<false>): Readonly<ShallowRef<number | null>>;
declare function useLastChanged(source: WatchSource, options: UseLastChangedOptions<true> | UseLastChangedOptions<boolean, number>): Readonly<ShallowRef<number>>;
//#endregion
//#region useThrottleFn/index.d.ts
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useThrottleFn<T extends FunctionArgs>(fn: T, ms?: MaybeRefOrGetter<number>, trailing?: boolean, leading?: boolean, rejectOnCancel?: boolean): PromisifyFn<T>;
//#endregion
//#region useTimeoutFn/index.d.ts
interface UseTimeoutFnOptions {
  /**
   * Start the timer immediately
   *
   * @default true
   */
  immediate?: boolean;
  /**
   * Execute the callback immediately after calling `start`
   *
   * @default false
   */
  immediateCallback?: boolean;
}
type UseTimeoutFnReturn<CallbackFn extends AnyFn> = Stoppable<Parameters<CallbackFn> | []>;
/**
 * Wrapper for `setTimeout` with controls.
 *
 * @param cb
 * @param interval
 * @param options
 */
declare function useTimeoutFn<CallbackFn extends AnyFn>(cb: CallbackFn, interval: MaybeRefOrGetter<number>, options?: UseTimeoutFnOptions): UseTimeoutFnReturn<CallbackFn>;
//#endregion
//#region useTimeout/index.d.ts
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
type UseTimeoutReturn = ComputedRef<boolean> | {
  readonly ready: ComputedRef<boolean>;
} & Stoppable;
/**
 * @deprecated use UseTimeoutReturn instead
 */
type UseTimoutReturn = UseTimeoutReturn;
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
//#endregion
//#region useToNumber/index.d.ts
interface UseToNumberOptions {
  /**
   * Method to use to convert the value to a number.
   *
   * Or a custom function for the conversion.
   *
   * @default 'parseFloat'
   */
  method?: 'parseFloat' | 'parseInt' | ((value: string | number) => number);
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useToNumber(value: MaybeRefOrGetter<number | string>, options?: UseToNumberOptions): ComputedRef<number>;
//#endregion
//#region useToString/index.d.ts
/**
 * Reactively convert a ref to string.
 *
 * @see https://vueuse.org/useToString
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useToString(value: MaybeRefOrGetter<unknown>): ComputedRef<string>;
//#endregion
//#region useToggle/index.d.ts
type ToggleFn = (value?: boolean) => void;
type UseToggleReturn = [ShallowRef<boolean>, ToggleFn] | ToggleFn;
interface UseToggleOptions<Truthy, Falsy$1> {
  truthyValue?: MaybeRefOrGetter<Truthy>;
  falsyValue?: MaybeRefOrGetter<Falsy$1>;
}
declare function useToggle<Truthy, Falsy$1, T = Truthy | Falsy$1>(initialValue: Ref<T>, options?: UseToggleOptions<Truthy, Falsy$1>): (value?: T) => T;
declare function useToggle<Truthy = true, Falsy$1 = false, T = Truthy | Falsy$1>(initialValue?: T, options?: UseToggleOptions<Truthy, Falsy$1>): [ShallowRef<T>, (value?: T) => T];
//#endregion
//#region watchArray/index.d.ts
declare type WatchArrayCallback<V$1 = any, OV = any> = (value: V$1, oldValue: OV, added: V$1, removed: OV, onCleanup: (cleanupFn: () => void) => void) => any;
/**
 * Watch for an array with additions and removals.
 *
 * @see https://vueuse.org/watchArray
 */
declare function watchArray<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T[]> | T[], cb: WatchArrayCallback<T[], Immediate extends true ? T[] | undefined : T[]>, options?: WatchOptions<Immediate>): vue0.WatchHandle;
//#endregion
//#region watchWithFilter/index.d.ts
interface WatchWithFilterOptions<Immediate> extends WatchOptions<Immediate>, ConfigurableEventFilter {}
declare function watchWithFilter<T extends Readonly<MultiWatchSources$1>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchWithFilterOptions<Immediate>): WatchHandle;
declare function watchWithFilter<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchHandle;
declare function watchWithFilter<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchHandle;
//#endregion
//#region watchAtMost/index.d.ts
interface WatchAtMostOptions<Immediate> extends WatchWithFilterOptions<Immediate> {
  count: MaybeRefOrGetter<number>;
}
interface WatchAtMostReturn {
  stop: WatchStopHandle;
  pause: () => void;
  resume: () => void;
  count: ShallowRef<number>;
}
declare function watchAtMost<T extends Readonly<MultiWatchSources$1>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options: WatchAtMostOptions<Immediate>): WatchAtMostReturn;
declare function watchAtMost<T, Immediate extends Readonly<boolean> = false>(sources: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options: WatchAtMostOptions<Immediate>): WatchAtMostReturn;
//#endregion
//#region watchDebounced/index.d.ts
interface WatchDebouncedOptions<Immediate> extends WatchOptions<Immediate>, DebounceFilterOptions {
  debounce?: MaybeRefOrGetter<number>;
}
declare function watchDebounced<T extends Readonly<MultiWatchSources$1>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchDebouncedOptions<Immediate>): WatchHandle;
declare function watchDebounced<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchDebouncedOptions<Immediate>): WatchHandle;
declare function watchDebounced<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchDebouncedOptions<Immediate>): WatchHandle;
/** @deprecated use `watchDebounced` instead */
declare const debouncedWatch: typeof watchDebounced;
//#endregion
//#region watchDeep/index.d.ts
declare function watchDeep<T extends Readonly<MultiWatchSources$1>, Immediate extends Readonly<boolean> = false>(source: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: Omit<WatchOptions<Immediate>, 'deep'>): WatchHandle;
declare function watchDeep<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: Omit<WatchOptions<Immediate>, 'deep'>): WatchHandle;
declare function watchDeep<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: Omit<WatchOptions<Immediate>, 'deep'>): WatchHandle;
//#endregion
//#region watchIgnorable/index.d.ts
type IgnoredUpdater = (updater: () => void) => void;
type IgnoredPrevAsyncUpdates = () => void;
interface WatchIgnorableReturn {
  ignoreUpdates: IgnoredUpdater;
  ignorePrevAsyncUpdates: IgnoredPrevAsyncUpdates;
  stop: WatchStopHandle;
}
declare function watchIgnorable<T extends Readonly<MultiWatchSources$1>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;
declare function watchIgnorable<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;
declare function watchIgnorable<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchWithFilterOptions<Immediate>): WatchIgnorableReturn;
/** @deprecated use `watchIgnorable` instead */
declare const ignorableWatch: typeof watchIgnorable;
//#endregion
//#region watchImmediate/index.d.ts
declare function watchImmediate<T extends Readonly<MultiWatchSources$1>>(source: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, true>>, options?: Omit<WatchOptions<true>, 'immediate'>): WatchHandle;
declare function watchImmediate<T>(source: WatchSource<T>, cb: WatchCallback<T, T | undefined>, options?: Omit<WatchOptions<true>, 'immediate'>): WatchHandle;
declare function watchImmediate<T extends object>(source: T, cb: WatchCallback<T, T | undefined>, options?: Omit<WatchOptions<true>, 'immediate'>): WatchHandle;
//#endregion
//#region watchOnce/index.d.ts
declare function watchOnce<T extends Readonly<MultiWatchSources$1>>(source: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, true>>, options?: Omit<WatchOptions<true>, 'once'>): WatchHandle;
declare function watchOnce<T>(source: WatchSource<T>, cb: WatchCallback<T, T | undefined>, options?: Omit<WatchOptions<true>, 'once'>): WatchHandle;
declare function watchOnce<T extends object>(source: T, cb: WatchCallback<T, T | undefined>, options?: Omit<WatchOptions<true>, 'once'>): WatchHandle;
//#endregion
//#region watchPausable/index.d.ts
interface WatchPausableReturn extends Pausable {
  stop: WatchStopHandle;
}
type WatchPausableOptions<Immediate> = WatchWithFilterOptions<Immediate> & PausableFilterOptions;
/** @deprecated Use Vue's built-in `watch` instead. This function will be removed in future version. */
declare function watchPausable<T extends Readonly<MultiWatchSources$1>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchPausableOptions<Immediate>): WatchPausableReturn;
/** @deprecated Use Vue's built-in `watch` instead. This function will be removed in future version. */
declare function watchPausable<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchPausableOptions<Immediate>): WatchPausableReturn;
/** @deprecated Use Vue's built-in `watch` instead. This function will be removed in future version. */
declare function watchPausable<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchPausableOptions<Immediate>): WatchPausableReturn;
/** @deprecated Use Vue's built-in `watch` instead. This function will be removed in future version. */
declare const pausableWatch: typeof watchPausable;
//#endregion
//#region watchThrottled/index.d.ts
interface WatchThrottledOptions<Immediate> extends WatchOptions<Immediate> {
  throttle?: MaybeRefOrGetter<number>;
  trailing?: boolean;
  leading?: boolean;
}
declare function watchThrottled<T extends Readonly<MultiWatchSources$1>, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T>, MapOldSources<T, Immediate>>, options?: WatchThrottledOptions<Immediate>): WatchHandle;
declare function watchThrottled<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchThrottledOptions<Immediate>): WatchHandle;
declare function watchThrottled<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchThrottledOptions<Immediate>): WatchHandle;
/** @deprecated use `watchThrottled` instead */
declare const throttledWatch: typeof watchThrottled;
//#endregion
//#region watchTriggerable/index.d.ts
interface WatchTriggerableReturn<FnReturnT = void> extends WatchIgnorableReturn {
  /** Execute `WatchCallback` immediately */
  trigger: () => FnReturnT;
}
type OnCleanup = (cleanupFn: () => void) => void;
type WatchTriggerableCallback<V$1 = any, OV = any, R$1 = void> = (value: V$1, oldValue: OV, onCleanup: OnCleanup) => R$1;
declare function watchTriggerable<T extends Readonly<MultiWatchSources$1>, FnReturnT>(sources: [...T], cb: WatchTriggerableCallback<MapSources<T>, MapOldSources<T, true>, FnReturnT>, options?: WatchWithFilterOptions<boolean>): WatchTriggerableReturn<FnReturnT>;
declare function watchTriggerable<T, FnReturnT>(source: WatchSource<T>, cb: WatchTriggerableCallback<T, T | undefined, FnReturnT>, options?: WatchWithFilterOptions<boolean>): WatchTriggerableReturn<FnReturnT>;
declare function watchTriggerable<T extends object, FnReturnT>(source: T, cb: WatchTriggerableCallback<T, T | undefined, FnReturnT>, options?: WatchWithFilterOptions<boolean>): WatchTriggerableReturn<FnReturnT>;
//#endregion
//#region whenever/index.d.ts
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
declare function whenever<T>(source: WatchSource<T | false | null | undefined>, cb: WatchCallback<T>, options?: WheneverOptions): vue0.WatchHandle;
//#endregion
export { AnyFn, ArgumentsType, Arrayable, Awaitable, Awaited, ComputedEagerOptions, ComputedEagerReturn, ComputedRefWithControl, ComputedWithControlRef, ComputedWithControlRefExtra, ConfigurableEventFilter, ConfigurableFlush, ConfigurableFlushSync, ControlledRefOptions, CreateGlobalStateReturn, CreateInjectionStateOptions, CreateInjectionStateReturn, CreateRefReturn, DateLike, DebounceFilterOptions, DeepMaybeRef, ElementOf, EventFilter, EventHook, EventHookOff, EventHookOn, EventHookReturn, EventHookTrigger, ExtendRefOptions, ExtendRefReturn, Fn, FunctionArgs, FunctionWrapperOptions, IfAny, IgnoredPrevAsyncUpdates, IgnoredUpdater, InstanceProxy, IsAny, IsDefinedReturn, ManualResetRefReturn, MapOldSources, MapSources, type MultiWatchSources, Mutable, Pausable, PausableFilterOptions, Promisify, PromisifyFn, ProvideLocalReturn, Reactified, ReactifyNested, ReactifyObjectOptions, ReactifyObjectReturn, ReactifyOptions, ReactifyReturn, ReactiveComputedReturn, ReactiveOmitPredicate, ReactiveOmitReturn, ReactivePickPredicate, ReactivePickReturn, ReadonlyRefOrGetter, RefAutoResetReturn, RefDebouncedReturn, RefThrottledReturn, RemovableRef, ShallowOrDeepRef, ShallowUnwrapRef, SharedComposableReturn, SingletonPromiseReturn, Stoppable, SyncRefOptions, SyncRefsOptions, ThrottleFilterOptions, TimerHandle, ToRefsOptions, ToggleFn, UntilArrayInstance, UntilBaseInstance, UntilToMatchOptions, UntilValueInstance, UseArrayDifferenceOptions, UseArrayDifferenceReturn, UseArrayEveryReturn, UseArrayFilterReturn, UseArrayFindIndexReturn, UseArrayFindLastReturn, UseArrayFindReturn, UseArrayIncludesComparatorFn, UseArrayIncludesOptions, UseArrayIncludesReturn, UseArrayJoinReturn, UseArrayMapReturn, UseArrayReduceReturn, UseArrayReducer, UseArraySomeReturn, UseArrayUniqueReturn, UseCounterOptions, UseCounterReturn, UseDateFormatOptions, UseDateFormatReturn, UseDebounceFnReturn, UseIntervalControls, UseIntervalFnOptions, UseIntervalFnReturn, UseIntervalOptions, UseIntervalReturn, UseLastChangedOptions, UseLastChangedReturn, UseTimeoutFnOptions, UseTimeoutFnReturn, UseTimeoutOptions, UseTimeoutReturn, UseTimoutReturn, UseToNumberOptions, UseToggleOptions, UseToggleReturn, WatchArrayCallback, WatchAtMostOptions, WatchAtMostReturn, WatchDebouncedOptions, WatchIgnorableReturn, WatchOptionFlush, WatchPausableOptions, WatchPausableReturn, WatchThrottledOptions, WatchTriggerableCallback, WatchTriggerableReturn, WatchWithFilterOptions, WheneverOptions, WritableComputedRefWithControl, assert, autoResetRef, bypassFilter, camelize, clamp, computedEager, computedWithControl, containsProp, controlledComputed, controlledRef, createEventHook, createFilterWrapper, createGlobalState, createInjectionState, createReactiveFn, createRef, createSharedComposable, createSingletonPromise, debounceFilter, debouncedRef, debouncedWatch, eagerComputed, extendRef, formatDate, get, getLifeCycleTarget, hasOwn, hyphenate, identity, ignorableWatch, increaseWithUnit, injectLocal, invoke, isClient, isDef, isDefined, isIOS, isObject, isWorker, makeDestructurable, noop, normalizeDate, notNullish, now, objectEntries, objectOmit, objectPick, pausableFilter, pausableWatch, promiseTimeout, provideLocal, pxValue, rand, reactify, reactifyObject, reactiveComputed, reactiveOmit, reactivePick, refAutoReset, refDebounced, refDefault, refManualReset, refThrottled, refWithControl, set, syncRef, syncRefs, throttleFilter, throttledRef, throttledWatch, timestamp, toArray, toReactive, toRef, toRefs, tryOnBeforeMount, tryOnBeforeUnmount, tryOnMounted, tryOnScopeDispose, tryOnUnmounted, until, useArrayDifference, useArrayEvery, useArrayFilter, useArrayFind, useArrayFindIndex, useArrayFindLast, useArrayIncludes, useArrayJoin, useArrayMap, useArrayReduce, useArraySome, useArrayUnique, useCounter, useDateFormat, useDebounce, useDebounceFn, useInterval, useIntervalFn, useLastChanged, useThrottle, useThrottleFn, useTimeout, useTimeoutFn, useToNumber, useToString, useToggle, watchArray, watchAtMost, watchDebounced, watchDeep, watchIgnorable, watchImmediate, watchOnce, watchPausable, watchThrottled, watchTriggerable, watchWithFilter, whenever };