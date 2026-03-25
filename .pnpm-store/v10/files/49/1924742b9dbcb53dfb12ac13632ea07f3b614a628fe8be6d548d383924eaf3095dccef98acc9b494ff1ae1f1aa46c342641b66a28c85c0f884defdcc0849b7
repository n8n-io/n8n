import * as _vueuse_shared from '@vueuse/shared';
import { Fn, MaybeRef, MaybeComputedRef, Awaitable, ConfigurableEventFilter, ConfigurableFlush, RemovableRef, EventHookOn, Arrayable, MaybeReadonlyRef, UseIntervalFnOptions, Pausable, UseTimeoutFnOptions, EventHook } from '@vueuse/shared';
export * from '@vueuse/shared';
import * as vue_demi from 'vue-demi';
import { Ref, InjectionKey, ComputedRef, ComponentPublicInstance, Component, UnwrapRef, WatchOptions, UnwrapNestedRefs, WatchSource, ToRefs, StyleValue, ShallowRef } from 'vue-demi';
import * as vue from 'vue-demi';

/**
 * Handle overlapping async evaluations.
 *
 * @param cancelCallback The provided callback is invoked when a re-evaluation of the computed value is triggered before the previous one finished
 */
type AsyncComputedOnCancel = (cancelCallback: Fn) => void;
interface AsyncComputedOptions {
    /**
     * Should value be evaluated lazily
     *
     * @default false
     */
    lazy?: boolean;
    /**
     * Ref passed to receive the updated of async evaluation
     */
    evaluating?: Ref<boolean>;
    /**
     * Use shallowRef
     *
     * The default value will be changed to `true` in the next major version
     *
     * @default false
     */
    shallow?: boolean;
    /**
     * Callback when error is caught.
     */
    onError?: (e: unknown) => void;
}
/**
 * Create an asynchronous computed dependency.
 *
 * @see https://vueuse.org/computedAsync
 * @param evaluationCallback     The promise-returning callback which generates the computed value
 * @param initialState           The initial state, used until the first evaluation finishes
 * @param optionsOrRef           Additional options or a ref passed to receive the updates of the async evaluation
 */
declare function computedAsync<T>(evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>, initialState?: T, optionsOrRef?: Ref<boolean> | AsyncComputedOptions): Ref<T>;

type ComputedInjectGetter<T, K> = (source: T | undefined, ctx?: any) => K;
type ComputedInjectGetterWithDefault<T, K> = (source: T, ctx?: any) => K;
type ComputedInjectSetter<T> = (v: T) => void;
interface WritableComputedInjectOptions<T, K> {
    get: ComputedInjectGetter<T, K>;
    set: ComputedInjectSetter<K>;
}
interface WritableComputedInjectOptionsWithDefault<T, K> {
    get: ComputedInjectGetterWithDefault<T, K>;
    set: ComputedInjectSetter<K>;
}
declare function computedInject<T, K = any>(key: InjectionKey<T> | string, getter: ComputedInjectGetter<T, K>): ComputedRef<K | undefined>;
declare function computedInject<T, K = any>(key: InjectionKey<T> | string, options: WritableComputedInjectOptions<T, K>): ComputedRef<K | undefined>;
declare function computedInject<T, K = any>(key: InjectionKey<T> | string, getter: ComputedInjectGetterWithDefault<T, K>, defaultSource: T, treatDefaultAsFactory?: false): ComputedRef<K>;
declare function computedInject<T, K = any>(key: InjectionKey<T> | string, options: WritableComputedInjectOptionsWithDefault<T, K>, defaultSource: T | (() => T), treatDefaultAsFactory: true): ComputedRef<K>;

type UnrefFn<T> = T extends (...args: infer A) => infer R ? (...args: {
    [K in keyof A]: MaybeRef<A[K]>;
}) => R : never;
/**
 * Make a plain function accepting ref and raw values as arguments.
 * Returns the same value the unconverted function returns, with proper typing.
 */
declare const createUnrefFn: <T extends Function>(fn: T) => UnrefFn<T>;

type VueInstance = ComponentPublicInstance;
type MaybeElementRef<T extends MaybeElement = MaybeElement> = MaybeRef<T>;
type MaybeComputedElementRef<T extends MaybeElement = MaybeElement> = MaybeComputedRef<T>;
type MaybeElement = HTMLElement | SVGElement | VueInstance | undefined | null;
type UnRefElementReturn<T extends MaybeElement = MaybeElement> = T extends VueInstance ? Exclude<MaybeElement, VueInstance> : T | undefined;
/**
 * Get the dom element of a ref of element or Vue component instance
 *
 * @param elRef
 */
declare function unrefElement<T extends MaybeElement>(elRef: MaybeComputedElementRef<T>): UnRefElementReturn<T>;

interface ConfigurableWindow {
    window?: Window;
}
interface ConfigurableDocument {
    document?: Document;
}
interface ConfigurableDocumentOrShadowRoot {
    document?: DocumentOrShadowRoot;
}
interface ConfigurableNavigator {
    navigator?: Navigator;
}
interface ConfigurableLocation {
    location?: Location;
}
declare const defaultWindow: (Window & typeof globalThis) | undefined;
declare const defaultDocument: Document | undefined;
declare const defaultNavigator: Navigator | undefined;
declare const defaultLocation: Location | undefined;

interface OnClickOutsideOptions extends ConfigurableWindow {
    /**
     * List of elements that should not trigger the event.
     */
    ignore?: (MaybeElementRef | string)[];
    /**
     * Use capturing phase for internal event listener.
     * @default true
     */
    capture?: boolean;
    /**
     * Run handler function if focus moves to an iframe.
     * @default false
     */
    detectIframe?: boolean;
}
type OnClickOutsideHandler<T extends {
    detectIframe: OnClickOutsideOptions['detectIframe'];
} = {
    detectIframe: false;
}> = (evt: T['detectIframe'] extends true ? PointerEvent | FocusEvent : PointerEvent) => void;
/**
 * Listen for clicks outside of an element.
 *
 * @see https://vueuse.org/onClickOutside
 * @param target
 * @param handler
 * @param options
 */
declare function onClickOutside<T extends OnClickOutsideOptions>(target: MaybeElementRef, handler: OnClickOutsideHandler<{
    detectIframe: T['detectIframe'];
}>, options?: T): (() => void) | undefined;

type KeyPredicate = (event: KeyboardEvent) => boolean;
type KeyFilter = true | string | string[] | KeyPredicate;
type KeyStrokeEventName = 'keydown' | 'keypress' | 'keyup';
interface OnKeyStrokeOptions {
    eventName?: KeyStrokeEventName;
    target?: MaybeComputedRef<EventTarget | null | undefined>;
    passive?: boolean;
}
declare function onKeyStroke(key: KeyFilter, handler: (event: KeyboardEvent) => void, options?: OnKeyStrokeOptions): () => void;
declare function onKeyStroke(handler: (event: KeyboardEvent) => void, options?: OnKeyStrokeOptions): () => void;
/**
 * Listen for keyboard keys being stroked.
 *
 * @see https://vueuse.org/onKeyStroke
 */
declare function onKeyStroke(key: KeyFilter, handler: (event: KeyboardEvent) => void, options?: OnKeyStrokeOptions): () => void;
declare function onKeyStroke(handler: (event: KeyboardEvent) => void, options?: OnKeyStrokeOptions): () => void;
/**
 * Listen to the keydown event of the given key.
 *
 * @see https://vueuse.org/onKeyStroke
 * @param key
 * @param handler
 * @param options
 */
declare function onKeyDown(key: KeyFilter, handler: (event: KeyboardEvent) => void, options?: Omit<OnKeyStrokeOptions, 'eventName'>): () => void;
/**
 * Listen to the keypress event of the given key.
 *
 * @see https://vueuse.org/onKeyStroke
 * @param key
 * @param handler
 * @param options
 */
declare function onKeyPressed(key: KeyFilter, handler: (event: KeyboardEvent) => void, options?: Omit<OnKeyStrokeOptions, 'eventName'>): () => void;
/**
 * Listen to the keyup event of the given key.
 *
 * @see https://vueuse.org/onKeyStroke
 * @param key
 * @param handler
 * @param options
 */
declare function onKeyUp(key: KeyFilter, handler: (event: KeyboardEvent) => void, options?: Omit<OnKeyStrokeOptions, 'eventName'>): () => void;

interface OnLongPressOptions {
    /**
     * Time in ms till `longpress` gets called
     *
     * @default 500
     */
    delay?: number;
    modifiers?: OnLongPressModifiers;
}
interface OnLongPressModifiers {
    stop?: boolean;
    once?: boolean;
    prevent?: boolean;
    capture?: boolean;
    self?: boolean;
}
declare function onLongPress(target: MaybeElementRef, handler: (evt: PointerEvent) => void, options?: OnLongPressOptions): void;

/**
 * Fires when users start typing on non-editable elements.
 *
 * @see https://vueuse.org/onStartTyping
 * @param callback
 * @param options
 */
declare function onStartTyping(callback: (event: KeyboardEvent) => void, options?: ConfigurableDocument): void;

/**
 * Shorthand for binding ref to template element.
 *
 * @see https://vueuse.org/templateRef
 * @param key
 * @param initialValue
 */
declare function templateRef<T extends HTMLElement | SVGElement | Component | null>(key: string, initialValue?: T | null): Readonly<Ref<T>>;

interface UseActiveElementOptions extends ConfigurableWindow, ConfigurableDocumentOrShadowRoot {
}
/**
 * Reactive `document.activeElement`
 *
 * @see https://vueuse.org/useActiveElement
 * @param options
 */
declare function useActiveElement<T extends HTMLElement>(options?: UseActiveElementOptions): _vueuse_shared.ComputedRefWithControl<T | null | undefined>;

type UseAsyncQueueTask<T> = (...args: any[]) => T | Promise<T>;
interface UseAsyncQueueResult<T> {
    state: 'pending' | 'fulfilled' | 'rejected';
    data: T | null;
}
interface UseAsyncQueueReturn<T> {
    activeIndex: Ref<number>;
    result: T;
}
interface UseAsyncQueueOptions {
    /**
     * Interrupt tasks when current task fails.
     *
     * @default true
     */
    interrupt?: boolean;
    /**
     * Trigger it when the tasks fails.
     *
     */
    onError?: () => void;
    /**
     * Trigger it when the tasks ends.
     *
     */
    onFinished?: () => void;
}
/**
 * Asynchronous queue task controller.
 *
 * @see https://vueuse.org/useAsyncQueue
 * @param tasks
 * @param options
 */
declare function useAsyncQueue<T1>(tasks: [UseAsyncQueueTask<T1>], options?: UseAsyncQueueOptions): UseAsyncQueueReturn<[UseAsyncQueueResult<T1>]>;
declare function useAsyncQueue<T1, T2>(tasks: [UseAsyncQueueTask<T1>, UseAsyncQueueTask<T2>], options?: UseAsyncQueueOptions): UseAsyncQueueReturn<[UseAsyncQueueResult<T1>, UseAsyncQueueResult<T2>]>;
declare function useAsyncQueue<T1, T2, T3>(tasks: [UseAsyncQueueTask<T1>, UseAsyncQueueTask<T2>, UseAsyncQueueTask<T3>], options?: UseAsyncQueueOptions): UseAsyncQueueReturn<[UseAsyncQueueResult<T1>, UseAsyncQueueResult<T2>, UseAsyncQueueResult<T3>]>;
declare function useAsyncQueue<T1, T2, T3, T4>(tasks: [UseAsyncQueueTask<T1>, UseAsyncQueueTask<T2>, UseAsyncQueueTask<T3>, UseAsyncQueueTask<T4>], options?: UseAsyncQueueOptions): UseAsyncQueueReturn<[UseAsyncQueueResult<T1>, UseAsyncQueueResult<T2>, UseAsyncQueueResult<T3>, UseAsyncQueueResult<T4>]>;
declare function useAsyncQueue<T1, T2, T3, T4, T5>(tasks: [UseAsyncQueueTask<T1>, UseAsyncQueueTask<T2>, UseAsyncQueueTask<T3>, UseAsyncQueueTask<T4>, UseAsyncQueueTask<T5>], options?: UseAsyncQueueOptions): UseAsyncQueueReturn<[UseAsyncQueueResult<T1>, UseAsyncQueueResult<T2>, UseAsyncQueueResult<T3>, UseAsyncQueueResult<T4>, UseAsyncQueueResult<T5>]>;
declare function useAsyncQueue<T>(tasks: UseAsyncQueueTask<T>[], options?: UseAsyncQueueOptions): UseAsyncQueueReturn<UseAsyncQueueResult<T>[]>;

interface UseAsyncStateReturn<Data, Params extends any[], Shallow extends boolean> {
    state: Shallow extends true ? Ref<Data> : Ref<UnwrapRef<Data>>;
    isReady: Ref<boolean>;
    isLoading: Ref<boolean>;
    error: Ref<unknown>;
    execute: (delay?: number, ...args: Params) => Promise<Data>;
}
interface UseAsyncStateOptions<Shallow extends boolean, D = any> {
    /**
     * Delay for executing the promise. In milliseconds.
     *
     * @default 0
     */
    delay?: number;
    /**
     * Execute the promise right after the function is invoked.
     * Will apply the delay if any.
     *
     * When set to false, you will need to execute it manually.
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Callback when error is caught.
     */
    onError?: (e: unknown) => void;
    /**
     * Callback when success is caught.
     * @param {D} data
     */
    onSuccess?: (data: D) => void;
    /**
     * Sets the state to initialState before executing the promise.
     *
     * This can be useful when calling the execute function more than once (for
     * example, to refresh data). When set to false, the current state remains
     * unchanged until the promise resolves.
     *
     * @default true
     */
    resetOnExecute?: boolean;
    /**
     * Use shallowRef.
     *
     * @default true
     */
    shallow?: Shallow;
    /**
     *
     * An error is thrown when executing the execute function
     *
     * @default false
     */
    throwError?: boolean;
}
/**
 * Reactive async state. Will not block your setup function and will trigger changes once
 * the promise is ready.
 *
 * @see https://vueuse.org/useAsyncState
 * @param promise         The promise / async function to be resolved
 * @param initialState    The initial state, used until the first evaluation finishes
 * @param options
 */
declare function useAsyncState<Data, Params extends any[] = [], Shallow extends boolean = true>(promise: Promise<Data> | ((...args: Params) => Promise<Data>), initialState: Data, options?: UseAsyncStateOptions<Shallow, Data>): UseAsyncStateReturn<Data, Params, Shallow>;

interface ToDataURLOptions {
    /**
     * MIME type
     */
    type?: string | undefined;
    /**
     * Image quality of jpeg or webp
     */
    quality?: any;
}
interface UseBase64ObjectOptions<T> {
    serializer: (v: T) => string;
}
interface UseBase64Return {
    base64: Ref<string>;
    promise: Ref<Promise<string>>;
    execute: () => Promise<string>;
}
declare function useBase64(target: MaybeComputedRef<string>): UseBase64Return;
declare function useBase64(target: MaybeComputedRef<Blob>): UseBase64Return;
declare function useBase64(target: MaybeComputedRef<ArrayBuffer>): UseBase64Return;
declare function useBase64(target: MaybeComputedRef<HTMLCanvasElement>, options?: ToDataURLOptions): UseBase64Return;
declare function useBase64(target: MaybeComputedRef<HTMLImageElement>, options?: ToDataURLOptions): UseBase64Return;
declare function useBase64<T extends Record<string, unknown>>(target: MaybeComputedRef<T>, options?: UseBase64ObjectOptions<T>): UseBase64Return;
declare function useBase64<T extends Map<string, unknown>>(target: MaybeComputedRef<T>, options?: UseBase64ObjectOptions<T>): UseBase64Return;
declare function useBase64<T extends Set<unknown>>(target: MaybeComputedRef<T>, options?: UseBase64ObjectOptions<T>): UseBase64Return;
declare function useBase64<T>(target: MaybeComputedRef<T[]>, options?: UseBase64ObjectOptions<T[]>): UseBase64Return;

interface BatteryManager extends EventTarget {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
}
/**
 * Reactive Battery Status API.
 *
 * @see https://vueuse.org/useBattery
 * @param options
 */
declare function useBattery({ navigator }?: ConfigurableNavigator): {
    isSupported: vue_demi.Ref<boolean>;
    charging: vue_demi.Ref<boolean>;
    chargingTime: vue_demi.Ref<number>;
    dischargingTime: vue_demi.Ref<number>;
    level: vue_demi.Ref<number>;
};
type UseBatteryReturn = ReturnType<typeof useBattery>;

interface UseBluetoothRequestDeviceOptions {
    /**
      *
      * An array of BluetoothScanFilters. This filter consists of an array
      * of BluetoothServiceUUIDs, a name parameter, and a namePrefix parameter.
      *
      */
    filters?: BluetoothLEScanFilter[] | undefined;
    /**
      *
      * An array of BluetoothServiceUUIDs.
      *
      * @see https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTService/uuid
      *
      */
    optionalServices?: BluetoothServiceUUID[] | undefined;
}
interface UseBluetoothOptions extends UseBluetoothRequestDeviceOptions, ConfigurableNavigator {
    /**
      *
      * A boolean value indicating that the requesting script can accept all Bluetooth
      * devices. The default is false.
      *
      * !! This may result in a bunch of unrelated devices being shown
      * in the chooser and energy being wasted as there are no filters.
      *
      *
      * Use it with caution.
      *
      * @default false
      *
      */
    acceptAllDevices?: boolean;
}
declare function useBluetooth(options?: UseBluetoothOptions): UseBluetoothReturn;
interface UseBluetoothReturn {
    isSupported: Ref<boolean>;
    isConnected: ComputedRef<boolean>;
    device: Ref<BluetoothDevice | undefined>;
    requestDevice: () => Promise<void>;
    server: Ref<BluetoothRemoteGATTServer | undefined>;
    error: Ref<unknown | null>;
}

/**
 * Breakpoints from Tailwind V2
 *
 * @see https://tailwindcss.com/docs/breakpoints
 */
declare const breakpointsTailwind: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
};
/**
 * Breakpoints from Bootstrap V5
 *
 * @see https://getbootstrap.com/docs/5.0/layout/breakpoints
 */
declare const breakpointsBootstrapV5: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
};
/**
 * Breakpoints from Vuetify V2
 *
 * @see https://vuetifyjs.com/en/features/breakpoints
 */
declare const breakpointsVuetify: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
};
/**
 * Breakpoints from Ant Design
 *
 * @see https://ant.design/components/layout/#breakpoint-width
 */
declare const breakpointsAntDesign: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
};
/**
 * Breakpoints from Quasar V2
 *
 * @see https://quasar.dev/style/breakpoints
 */
declare const breakpointsQuasar: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
};
/**
 * Sematic Breakpoints
 */
declare const breakpointsSematic: {
    mobileS: number;
    mobileM: number;
    mobileL: number;
    tablet: number;
    laptop: number;
    laptopL: number;
    desktop4K: number;
};
/**
 * Breakpoints from Master CSS
 *
 * @see https://docs.master.co/css/breakpoints
 */
declare const breakpointsMasterCss: {
    '3xs': number;
    '2xs': number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
};

type Breakpoints<K extends string = string> = Record<K, number | string>;
/**
 * Reactively viewport breakpoints
 *
 * @see https://vueuse.org/useBreakpoints
 * @param options
 */
declare function useBreakpoints<K extends string>(breakpoints: Breakpoints<K>, options?: ConfigurableWindow): {
    greater(k: K): Ref<boolean>;
    greaterOrEqual: (k: K) => Ref<boolean>;
    smaller(k: K): Ref<boolean>;
    smallerOrEqual(k: K): Ref<boolean>;
    between(a: K, b: K): Ref<boolean>;
    isGreater(k: K): boolean;
    isGreaterOrEqual(k: K): boolean;
    isSmaller(k: K): boolean;
    isSmallerOrEqual(k: K): boolean;
    isInBetween(a: K, b: K): boolean;
} & Record<K, Ref<boolean>>;
type UseBreakpointsReturn<K extends string = string> = {
    greater: (k: K) => Ref<boolean>;
    greaterOrEqual: (k: K) => Ref<boolean>;
    smaller(k: K): Ref<boolean>;
    smallerOrEqual: (k: K) => Ref<boolean>;
    between(a: K, b: K): Ref<boolean>;
    isGreater(k: K): boolean;
    isGreaterOrEqual(k: K): boolean;
    isSmaller(k: K): boolean;
    isSmallerOrEqual(k: K): boolean;
    isInBetween(a: K, b: K): boolean;
} & Record<K, Ref<boolean>>;

interface UseBroadcastChannelOptions extends ConfigurableWindow {
    /**
     * The name of the channel.
     */
    name: string;
}
/**
 * Reactive BroadcastChannel
 *
 * @see https://vueuse.org/useBroadcastChannel
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
 * @param options
 *
 */
declare const useBroadcastChannel: <D, P>(options: UseBroadcastChannelOptions) => UseBroadcastChannelReturn<D, P>;
interface UseBroadcastChannelReturn<D, P> {
    isSupported: Ref<boolean>;
    channel: Ref<BroadcastChannel | undefined>;
    data: Ref<D>;
    post: (data: P) => void;
    close: () => void;
    error: Ref<Event | null>;
    isClosed: Ref<boolean>;
}

interface BrowserLocationState {
    trigger: string;
    state?: any;
    length?: number;
    hash?: string;
    host?: string;
    hostname?: string;
    href?: string;
    origin?: string;
    pathname?: string;
    port?: string;
    protocol?: string;
    search?: string;
}
/**
 * Reactive browser location.
 *
 * @see https://vueuse.org/useBrowserLocation
 * @param options
 */
declare function useBrowserLocation({ window }?: ConfigurableWindow): vue_demi.Ref<{
    trigger: string;
    state?: any;
    length?: number | undefined;
    hash?: string | undefined;
    host?: string | undefined;
    hostname?: string | undefined;
    href?: string | undefined;
    origin?: string | undefined;
    pathname?: string | undefined;
    port?: string | undefined;
    protocol?: string | undefined;
    search?: string | undefined;
}>;
type UseBrowserLocationReturn = ReturnType<typeof useBrowserLocation>;

declare function useCached<T>(refValue: Ref<T>, comparator?: (a: T, b: T) => boolean, watchOptions?: WatchOptions): Ref<T>;

interface UseClipboardOptions<Source> extends ConfigurableNavigator {
    /**
     * Enabled reading for clipboard
     *
     * @default false
     */
    read?: boolean;
    /**
     * Copy source
     */
    source?: Source;
    /**
     * Milliseconds to reset state of `copied` ref
     *
     * @default 1500
     */
    copiedDuring?: number;
    /**
     * Whether fallback to document.execCommand('copy') if clipboard is undefined.
     *
     * @default false
     */
    legacy?: boolean;
}
interface UseClipboardReturn<Optional> {
    isSupported: Ref<boolean>;
    text: ComputedRef<string>;
    copied: ComputedRef<boolean>;
    copy: Optional extends true ? (text?: string) => Promise<void> : (text: string) => Promise<void>;
}
/**
 * Reactive Clipboard API.
 *
 * @see https://vueuse.org/useClipboard
 * @param options
 */
declare function useClipboard(options?: UseClipboardOptions<undefined>): UseClipboardReturn<false>;
declare function useClipboard(options: UseClipboardOptions<MaybeComputedRef<string>>): UseClipboardReturn<true>;

interface UseClonedOptions<T = any> extends WatchOptions {
    /**
     * Custom clone function.
     *
     * By default, it use `JSON.parse(JSON.stringify(value))` to clone.
     */
    clone?: (source: T) => T;
    /**
     * Manually sync the ref
     *
     * @default false
     */
    manual?: boolean;
}
interface UseClonedReturn<T> {
    /**
     * Cloned ref
     */
    cloned: ComputedRef<T>;
    /**
     * Sync cloned data with source manually
     */
    sync: () => void;
}
type CloneFn<F, T = F> = (x: F) => T;
declare function cloneFnJSON<T>(source: T): T;
declare function useCloned<T>(source: MaybeComputedRef<T>, options?: UseClonedOptions): {
    cloned: vue_demi.Ref<vue_demi.UnwrapRef<T>>;
    sync: () => void;
};

interface StorageLikeAsync {
    getItem(key: string): Awaitable<string | null>;
    setItem(key: string, value: string): Awaitable<void>;
    removeItem(key: string): Awaitable<void>;
}
interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/**
 * @experimental The API is not finalized yet. It might not follow semver.
 */
interface SSRHandlersMap {
    getDefaultStorage: () => StorageLike | undefined;
    getDefaultStorageAsync: () => StorageLikeAsync | undefined;
    updateHTMLAttrs: (selector: string, attribute: string, value: string) => void;
}
declare function getSSRHandler<T extends keyof SSRHandlersMap>(key: T, fallback: SSRHandlersMap[T]): SSRHandlersMap[T];
declare function getSSRHandler<T extends keyof SSRHandlersMap>(key: T, fallback: SSRHandlersMap[T] | undefined): SSRHandlersMap[T] | undefined;
declare function setSSRHandler<T extends keyof SSRHandlersMap>(key: T, fn: SSRHandlersMap[T]): void;

interface Serializer<T> {
    read(raw: string): T;
    write(value: T): string;
}
interface SerializerAsync<T> {
    read(raw: string): Awaitable<T>;
    write(value: T): Awaitable<string>;
}
declare const StorageSerializers: Record<'boolean' | 'object' | 'number' | 'any' | 'string' | 'map' | 'set' | 'date', Serializer<any>>;
declare const customStorageEventName = "vueuse-storage";
interface StorageEventLike {
    storageArea: StorageLike | null;
    key: StorageEvent['key'];
    oldValue: StorageEvent['oldValue'];
    newValue: StorageEvent['newValue'];
}
interface UseStorageOptions<T> extends ConfigurableEventFilter, ConfigurableWindow, ConfigurableFlush {
    /**
     * Watch for deep changes
     *
     * @default true
     */
    deep?: boolean;
    /**
     * Listen to storage changes, useful for multiple tabs application
     *
     * @default true
     */
    listenToStorageChanges?: boolean;
    /**
     * Write the default value to the storage when it does not exist
     *
     * @default true
     */
    writeDefaults?: boolean;
    /**
     * Merge the default value with the value read from the storage.
     *
     * When setting it to true, it will perform a **shallow merge** for objects.
     * You can pass a function to perform custom merge (e.g. deep merge), for example:
     *
     * @default false
     */
    mergeDefaults?: boolean | ((storageValue: T, defaults: T) => T);
    /**
     * Custom data serialization
     */
    serializer?: Serializer<T>;
    /**
     * On error callback
     *
     * Default log error to `console.error`
     */
    onError?: (error: unknown) => void;
    /**
     * Use shallow ref as reference
     *
     * @default false
     */
    shallow?: boolean;
}
declare function useStorage(key: string, defaults: MaybeComputedRef<string>, storage?: StorageLike, options?: UseStorageOptions<string>): RemovableRef<string>;
declare function useStorage(key: string, defaults: MaybeComputedRef<boolean>, storage?: StorageLike, options?: UseStorageOptions<boolean>): RemovableRef<boolean>;
declare function useStorage(key: string, defaults: MaybeComputedRef<number>, storage?: StorageLike, options?: UseStorageOptions<number>): RemovableRef<number>;
declare function useStorage<T>(key: string, defaults: MaybeComputedRef<T>, storage?: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
declare function useStorage<T = unknown>(key: string, defaults: MaybeComputedRef<null>, storage?: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;

type BasicColorSchema = 'light' | 'dark' | 'auto';
interface UseColorModeOptions<T extends string = BasicColorSchema> extends UseStorageOptions<T | BasicColorSchema> {
    /**
     * CSS Selector for the target element applying to
     *
     * @default 'html'
     */
    selector?: string;
    /**
     * HTML attribute applying the target element
     *
     * @default 'class'
     */
    attribute?: string;
    /**
     * The initial color mode
     *
     * @default 'auto'
     */
    initialValue?: T | BasicColorSchema;
    /**
     * Prefix when adding value to the attribute
     */
    modes?: Partial<Record<T | BasicColorSchema, string>>;
    /**
     * A custom handler for handle the updates.
     * When specified, the default behavior will be overridden.
     *
     * @default undefined
     */
    onChanged?: (mode: T | BasicColorSchema, defaultHandler: ((mode: T | BasicColorSchema) => void)) => void;
    /**
     * Custom storage ref
     *
     * When provided, `useStorage` will be skipped
     */
    storageRef?: Ref<T | BasicColorSchema>;
    /**
     * Key to persist the data into localStorage/sessionStorage.
     *
     * Pass `null` to disable persistence
     *
     * @default 'vueuse-color-scheme'
     */
    storageKey?: string | null;
    /**
     * Storage object, can be localStorage or sessionStorage
     *
     * @default localStorage
     */
    storage?: StorageLike;
    /**
     * Emit `auto` mode from state
     *
     * When set to `true`, preferred mode won't be translated into `light` or `dark`.
     * This is useful when the fact that `auto` mode was selected needs to be known.
     *
     * @default undefined
     */
    emitAuto?: boolean;
}
/**
 * Reactive color mode with auto data persistence.
 *
 * @see https://vueuse.org/useColorMode
 * @param options
 */
declare function useColorMode<T extends string = BasicColorSchema>(options?: UseColorModeOptions<T>): vue_demi.WritableComputedRef<BasicColorSchema | T>;

type UseConfirmDialogRevealResult<C, D> = {
    data?: C;
    isCanceled: false;
} | {
    data?: D;
    isCanceled: true;
};
interface UseConfirmDialogReturn<RevealData, ConfirmData, CancelData> {
    /**
     * Revealing state
     */
    isRevealed: ComputedRef<boolean>;
    /**
     * Opens the dialog.
     * Create promise and return it. Triggers `onReveal` hook.
     */
    reveal: (data?: RevealData) => Promise<UseConfirmDialogRevealResult<ConfirmData, CancelData>>;
    /**
     * Confirms and closes the dialog. Triggers a callback inside `onConfirm` hook.
     * Resolves promise from `reveal()` with `data` and `isCanceled` ref with `false` value.
     * Can accept any data and to pass it to `onConfirm` hook.
     */
    confirm: (data?: ConfirmData) => void;
    /**
     * Cancels and closes the dialog. Triggers a callback inside `onCancel` hook.
     * Resolves promise from `reveal()` with `data` and `isCanceled` ref with `true` value.
     * Can accept any data and to pass it to `onCancel` hook.
     */
    cancel: (data?: CancelData) => void;
    /**
     * Event Hook to be triggered right before dialog creating.
     */
    onReveal: EventHookOn<RevealData>;
    /**
     * Event Hook to be called on `confirm()`.
     * Gets data object from `confirm` function.
     */
    onConfirm: EventHookOn<ConfirmData>;
    /**
     * Event Hook to be called on `cancel()`.
     * Gets data object from `cancel` function.
     */
    onCancel: EventHookOn<CancelData>;
}
/**
 * Hooks for creating confirm dialogs. Useful for modal windows, popups and logins.
 *
 * @see https://vueuse.org/useConfirmDialog/
 * @param revealed `boolean` `ref` that handles a modal window
 */
declare function useConfirmDialog<RevealData = any, ConfirmData = any, CancelData = any>(revealed?: Ref<boolean>): UseConfirmDialogReturn<RevealData, ConfirmData, CancelData>;

interface UseCssVarOptions extends ConfigurableWindow {
    initialValue?: string;
}
/**
 * Manipulate CSS variables.
 *
 * @see https://vueuse.org/useCssVar
 * @param prop
 * @param target
 * @param initialValue
 * @param options
 */
declare function useCssVar(prop: MaybeComputedRef<string>, target?: MaybeElementRef, { window, initialValue }?: UseCssVarOptions): vue_demi.Ref<string>;

declare function useCurrentElement<T extends Element = Element>(): _vueuse_shared.ComputedRefWithControl<T>;

interface UseCycleListOptions<T> {
    /**
     * The initial value of the state.
     * A ref can be provided to reuse.
     */
    initialValue?: MaybeRef<T>;
    /**
     * The default index when
     */
    fallbackIndex?: number;
    /**
     * Custom function to get the index of the current value.
     */
    getIndexOf?: (value: T, list: T[]) => number;
}
/**
 * Cycle through a list of items
 *
 * @see https://vueuse.org/useCycleList
 */
declare function useCycleList<T>(list: T[], options?: UseCycleListOptions<T>): UseCycleListReturn<T>;
interface UseCycleListReturn<T> {
    state: Ref<T>;
    index: Ref<number>;
    next: (n?: number) => T;
    prev: (n?: number) => T;
}

interface UseDarkOptions extends Omit<UseColorModeOptions<BasicColorSchema>, 'modes' | 'onChanged'> {
    /**
     * Value applying to the target element when isDark=true
     *
     * @default 'dark'
     */
    valueDark?: string;
    /**
     * Value applying to the target element when isDark=false
     *
     * @default ''
     */
    valueLight?: string;
    /**
     * A custom handler for handle the updates.
     * When specified, the default behavior will be overridden.
     *
     * @default undefined
     */
    onChanged?: (isDark: boolean) => void;
}
/**
 * Reactive dark mode with auto data persistence.
 *
 * @see https://vueuse.org/useDark
 * @param options
 */
declare function useDark(options?: UseDarkOptions): vue_demi.WritableComputedRef<boolean>;

interface UseRefHistoryRecord<T> {
    snapshot: T;
    timestamp: number;
}
interface UseManualRefHistoryOptions<Raw, Serialized = Raw> {
    /**
     * Maximum number of history to be kept. Default to unlimited.
     */
    capacity?: number;
    /**
     * Clone when taking a snapshot, shortcut for dump: JSON.parse(JSON.stringify(value)).
     * Default to false
     *
     * @default false
     */
    clone?: boolean | CloneFn<Raw>;
    /**
     * Serialize data into the history
     */
    dump?: (v: Raw) => Serialized;
    /**
     * Deserialize data from the history
     */
    parse?: (v: Serialized) => Raw;
    /**
     * Deserialize data from the history
     */
    setSource?: (source: Ref<Raw>, v: Raw) => void;
}
interface UseManualRefHistoryReturn<Raw, Serialized> {
    /**
     * Bypassed tracking ref from the argument
     */
    source: Ref<Raw>;
    /**
     * An array of history records for undo, newest comes to first
     */
    history: Ref<UseRefHistoryRecord<Serialized>[]>;
    /**
     * Last history point, source can be different if paused
     */
    last: Ref<UseRefHistoryRecord<Serialized>>;
    /**
     * Same as {@link UseManualRefHistoryReturn.history | history}
     */
    undoStack: Ref<UseRefHistoryRecord<Serialized>[]>;
    /**
     * Records array for redo
     */
    redoStack: Ref<UseRefHistoryRecord<Serialized>[]>;
    /**
     * A ref representing if undo is possible (non empty undoStack)
     */
    canUndo: Ref<boolean>;
    /**
     * A ref representing if redo is possible (non empty redoStack)
     */
    canRedo: Ref<boolean>;
    /**
     * Undo changes
     */
    undo: () => void;
    /**
     * Redo changes
     */
    redo: () => void;
    /**
     * Clear all the history
     */
    clear: () => void;
    /**
     * Create new a new history record
     */
    commit: () => void;
    /**
     * Reset ref's value with latest history
     */
    reset: () => void;
}
/**
 * Track the change history of a ref, also provides undo and redo functionality.
 *
 * @see https://vueuse.org/useManualRefHistory
 * @param source
 * @param options
 */
declare function useManualRefHistory<Raw, Serialized = Raw>(source: Ref<Raw>, options?: UseManualRefHistoryOptions<Raw, Serialized>): UseManualRefHistoryReturn<Raw, Serialized>;

interface UseRefHistoryOptions<Raw, Serialized = Raw> extends ConfigurableEventFilter {
    /**
     * Watch for deep changes, default to false
     *
     * When set to true, it will also create clones for values store in the history
     *
     * @default false
     */
    deep?: boolean;
    /**
     * The flush option allows for greater control over the timing of a history point, default to 'pre'
     *
     * Possible values: 'pre', 'post', 'sync'
     * It works in the same way as the flush option in watch and watch effect in vue reactivity
     *
     * @default 'pre'
     */
    flush?: 'pre' | 'post' | 'sync';
    /**
     * Maximum number of history to be kept. Default to unlimited.
     */
    capacity?: number;
    /**
     * Clone when taking a snapshot, shortcut for dump: JSON.parse(JSON.stringify(value)).
     * Default to false
     *
     * @default false
     */
    clone?: boolean | CloneFn<Raw>;
    /**
     * Serialize data into the history
     */
    dump?: (v: Raw) => Serialized;
    /**
     * Deserialize data from the history
     */
    parse?: (v: Serialized) => Raw;
}
interface UseRefHistoryReturn<Raw, Serialized> extends UseManualRefHistoryReturn<Raw, Serialized> {
    /**
     * A ref representing if the tracking is enabled
     */
    isTracking: Ref<boolean>;
    /**
     * Pause change tracking
     */
    pause(): void;
    /**
     * Resume change tracking
     *
     * @param [commit] if true, a history record will be create after resuming
     */
    resume(commit?: boolean): void;
    /**
     * A sugar for auto pause and auto resuming within a function scope
     *
     * @param fn
     */
    batch(fn: (cancel: Fn) => void): void;
    /**
     * Clear the data and stop the watch
     */
    dispose(): void;
}
/**
 * Track the change history of a ref, also provides undo and redo functionality.
 *
 * @see https://vueuse.org/useRefHistory
 * @param source
 * @param options
 */
declare function useRefHistory<Raw, Serialized = Raw>(source: Ref<Raw>, options?: UseRefHistoryOptions<Raw, Serialized>): UseRefHistoryReturn<Raw, Serialized>;

/**
 * Shorthand for [useRefHistory](https://vueuse.org/useRefHistory) with debounce filter.
 *
 * @see https://vueuse.org/useDebouncedRefHistory
 * @param source
 * @param options
 */
declare function useDebouncedRefHistory<Raw, Serialized = Raw>(source: Ref<Raw>, options?: Omit<UseRefHistoryOptions<Raw, Serialized>, 'eventFilter'> & {
    debounce?: MaybeComputedRef<number>;
}): UseRefHistoryReturn<Raw, Serialized>;

interface DeviceMotionOptions extends ConfigurableWindow, ConfigurableEventFilter {
}
/**
 * Reactive DeviceMotionEvent.
 *
 * @see https://vueuse.org/useDeviceMotion
 * @param options
 */
declare function useDeviceMotion(options?: DeviceMotionOptions): {
    acceleration: Ref<DeviceMotionEventAcceleration | null>;
    accelerationIncludingGravity: Ref<DeviceMotionEventAcceleration | null>;
    rotationRate: Ref<DeviceMotionEventRotationRate | null>;
    interval: Ref<number>;
};
type UseDeviceMotionReturn = ReturnType<typeof useDeviceMotion>;

/**
 * Reactive DeviceOrientationEvent.
 *
 * @see https://vueuse.org/useDeviceOrientation
 * @param options
 */
declare function useDeviceOrientation(options?: ConfigurableWindow): {
    isSupported: Ref<boolean>;
    isAbsolute: Ref<boolean>;
    alpha: Ref<number | null>;
    beta: Ref<number | null>;
    gamma: Ref<number | null>;
};
type UseDeviceOrientationReturn = ReturnType<typeof useDeviceOrientation>;

/**
 * Reactively track `window.devicePixelRatio`.
 *
 * @see https://vueuse.org/useDevicePixelRatio
 * @param options
 */
declare function useDevicePixelRatio({ window, }?: ConfigurableWindow): {
    pixelRatio: vue_demi.Ref<number>;
};
type UseDevicePixelRatioReturn = ReturnType<typeof useDevicePixelRatio>;

interface UseDevicesListOptions extends ConfigurableNavigator {
    onUpdated?: (devices: MediaDeviceInfo[]) => void;
    /**
     * Request for permissions immediately if it's not granted,
     * otherwise label and deviceIds could be empty
     *
     * @default false
     */
    requestPermissions?: boolean;
    /**
     * Request for types of media permissions
     *
     * @default { audio: true, video: true }
     */
    constraints?: MediaStreamConstraints;
}
interface UseDevicesListReturn {
    /**
     * All devices
     */
    devices: Ref<MediaDeviceInfo[]>;
    videoInputs: ComputedRef<MediaDeviceInfo[]>;
    audioInputs: ComputedRef<MediaDeviceInfo[]>;
    audioOutputs: ComputedRef<MediaDeviceInfo[]>;
    permissionGranted: Ref<boolean>;
    ensurePermissions: () => Promise<boolean>;
    isSupported: Ref<boolean>;
}
/**
 * Reactive `enumerateDevices` listing available input/output devices
 *
 * @see https://vueuse.org/useDevicesList
 * @param options
 */
declare function useDevicesList(options?: UseDevicesListOptions): UseDevicesListReturn;

interface UseDisplayMediaOptions extends ConfigurableNavigator {
    /**
     * If the stream is enabled
     * @default false
     */
    enabled?: MaybeRef<boolean>;
    /**
     * If the stream video media constraints
     */
    video?: boolean | MediaTrackConstraints | undefined;
    /**
     * If the stream audio media constraints
     */
    audio?: boolean | MediaTrackConstraints | undefined;
}
/**
 * Reactive `mediaDevices.getDisplayMedia` streaming
 *
 * @see https://vueuse.org/useDisplayMedia
 * @param options
 */
declare function useDisplayMedia(options?: UseDisplayMediaOptions): {
    isSupported: Ref<boolean>;
    stream: Ref<MediaStream | undefined>;
    start: () => Promise<MediaStream | undefined>;
    stop: () => void;
    enabled: Ref<boolean>;
};
type UseDisplayMediaReturn = ReturnType<typeof useDisplayMedia>;

/**
 * Reactively track `document.visibilityState`.
 *
 * @see https://vueuse.org/useDocumentVisibility
 * @param options
 */
declare function useDocumentVisibility({ document }?: ConfigurableDocument): Ref<DocumentVisibilityState>;

interface Position {
    x: number;
    y: number;
}
interface RenderableComponent {
    /**
     * The element that the component should be rendered as
     *
     * @default 'div'
     */
    as?: Object | string;
}
type PointerType = 'mouse' | 'touch' | 'pen';

interface UseDraggableOptions {
    /**
     * Only start the dragging when click on the element directly
     *
     * @default false
     */
    exact?: MaybeComputedRef<boolean>;
    /**
     * Prevent events defaults
     *
     * @default false
     */
    preventDefault?: MaybeComputedRef<boolean>;
    /**
     * Prevent events propagation
     *
     * @default false
     */
    stopPropagation?: MaybeComputedRef<boolean>;
    /**
     * Element to attach `pointermove` and `pointerup` events to.
     *
     * @default window
     */
    draggingElement?: MaybeComputedRef<HTMLElement | SVGElement | Window | Document | null | undefined>;
    /**
     * Handle that triggers the drag event
     *
     * @default target
     */
    handle?: MaybeComputedRef<HTMLElement | SVGElement | null | undefined>;
    /**
     * Pointer types that listen to.
     *
     * @default ['mouse', 'touch', 'pen']
     */
    pointerTypes?: PointerType[];
    /**
     * Initial position of the element.
     *
     * @default { x: 0, y: 0 }
     */
    initialValue?: MaybeComputedRef<Position>;
    /**
     * Callback when the dragging starts. Return `false` to prevent dragging.
     */
    onStart?: (position: Position, event: PointerEvent) => void | false;
    /**
     * Callback during dragging.
     */
    onMove?: (position: Position, event: PointerEvent) => void;
    /**
     * Callback when dragging end.
     */
    onEnd?: (position: Position, event: PointerEvent) => void;
}
/**
 * Make elements draggable.
 *
 * @see https://vueuse.org/useDraggable
 * @param target
 * @param options
 */
declare function useDraggable(target: MaybeComputedRef<HTMLElement | SVGElement | null | undefined>, options?: UseDraggableOptions): {
    position: vue_demi.Ref<{
        x: number;
        y: number;
    }>;
    isDragging: vue_demi.ComputedRef<boolean>;
    style: vue_demi.ComputedRef<string>;
    x: vue_demi.Ref<number>;
    y: vue_demi.Ref<number>;
};
type UseDraggableReturn = ReturnType<typeof useDraggable>;

interface UseDropZoneReturn {
    isOverDropZone: Ref<boolean>;
}
declare function useDropZone(target: MaybeComputedRef<HTMLElement | null | undefined>, onDrop?: (files: File[] | null) => void): UseDropZoneReturn;

interface UseElementBoundingOptions {
    /**
     * Reset values to 0 on component unmounted
     *
     * @default true
     */
    reset?: boolean;
    /**
     * Listen to window resize event
     *
     * @default true
     */
    windowResize?: boolean;
    /**
     * Listen to window scroll event
     *
     * @default true
     */
    windowScroll?: boolean;
    /**
     * Immediately call update on component mounted
     *
     * @default true
     */
    immediate?: boolean;
}
/**
 * Reactive bounding box of an HTML element.
 *
 * @see https://vueuse.org/useElementBounding
 * @param target
 */
declare function useElementBounding(target: MaybeComputedElementRef, options?: UseElementBoundingOptions): {
    height: vue_demi.Ref<number>;
    bottom: vue_demi.Ref<number>;
    left: vue_demi.Ref<number>;
    right: vue_demi.Ref<number>;
    top: vue_demi.Ref<number>;
    width: vue_demi.Ref<number>;
    x: vue_demi.Ref<number>;
    y: vue_demi.Ref<number>;
    update: () => void;
};
type UseElementBoundingReturn = ReturnType<typeof useElementBounding>;

interface UseElementByPointOptions extends ConfigurableDocument {
    x: MaybeComputedRef<number>;
    y: MaybeComputedRef<number>;
}
/**
 * Reactive element by point.
 *
 * @see https://vueuse.org/useElementByPoint
 * @param options - UseElementByPointOptions
 */
declare function useElementByPoint(options: UseElementByPointOptions): {
    isActive: Readonly<vue_demi.Ref<boolean>>;
    pause: _vueuse_shared.Fn;
    resume: _vueuse_shared.Fn;
    element: vue_demi.Ref<HTMLElement | null>;
};
type UseElementByPointReturn = ReturnType<typeof useElementByPoint>;

interface UseElementHoverOptions extends ConfigurableWindow {
    delayEnter?: number;
    delayLeave?: number;
}
declare function useElementHover(el: MaybeComputedRef<EventTarget | null | undefined>, options?: UseElementHoverOptions): Ref<boolean>;

interface ResizeObserverSize {
    readonly inlineSize: number;
    readonly blockSize: number;
}
interface ResizeObserverEntry {
    readonly target: Element;
    readonly contentRect: DOMRectReadOnly;
    readonly borderBoxSize?: ReadonlyArray<ResizeObserverSize>;
    readonly contentBoxSize?: ReadonlyArray<ResizeObserverSize>;
    readonly devicePixelContentBoxSize?: ReadonlyArray<ResizeObserverSize>;
}
type ResizeObserverCallback = (entries: ReadonlyArray<ResizeObserverEntry>, observer: ResizeObserver) => void;
interface UseResizeObserverOptions extends ConfigurableWindow {
    /**
     * Sets which box model the observer will observe changes to. Possible values
     * are `content-box` (the default), `border-box` and `device-pixel-content-box`.
     *
     * @default 'content-box'
     */
    box?: ResizeObserverBoxOptions;
}
declare class ResizeObserver {
    constructor(callback: ResizeObserverCallback);
    disconnect(): void;
    observe(target: Element, options?: UseResizeObserverOptions): void;
    unobserve(target: Element): void;
}
/**
 * Reports changes to the dimensions of an Element's content or the border-box
 *
 * @see https://vueuse.org/useResizeObserver
 * @param target
 * @param callback
 * @param options
 */
declare function useResizeObserver(target: MaybeComputedElementRef, callback: ResizeObserverCallback, options?: UseResizeObserverOptions): {
    isSupported: vue_demi.Ref<boolean>;
    stop: () => void;
};
type UseResizeObserverReturn = ReturnType<typeof useResizeObserver>;

interface ElementSize {
    width: number;
    height: number;
}
/**
 * Reactive size of an HTML element.
 *
 * @see https://vueuse.org/useElementSize
 * @param target
 * @param callback
 * @param options
 */
declare function useElementSize(target: MaybeComputedElementRef, initialSize?: ElementSize, options?: UseResizeObserverOptions): {
    width: vue_demi.Ref<number>;
    height: vue_demi.Ref<number>;
};
type UseElementSizeReturn = ReturnType<typeof useElementSize>;

interface UseElementVisibilityOptions extends ConfigurableWindow {
    scrollTarget?: MaybeComputedRef<HTMLElement | undefined | null>;
}
/**
 * Tracks the visibility of an element within the viewport.
 *
 * @see https://vueuse.org/useElementVisibility
 * @param element
 * @param options
 */
declare function useElementVisibility(element: MaybeComputedElementRef, { window, scrollTarget }?: UseElementVisibilityOptions): vue_demi.Ref<boolean>;

type EventBusListener<T = unknown, P = any> = (event: T, payload?: P) => void;
type EventBusEvents<T, P = any> = EventBusListener<T, P>[];
interface EventBusKey<T> extends Symbol {
}
type EventBusIdentifier<T = unknown> = EventBusKey<T> | string | number;
interface UseEventBusReturn<T, P> {
    /**
     * Subscribe to an event. When calling emit, the listeners will execute.
     * @param listener watch listener.
     * @returns a stop function to remove the current callback.
     */
    on: (listener: EventBusListener<T, P>) => Fn;
    /**
     * Similar to `on`, but only fires once
     * @param listener watch listener.
     * @returns a stop function to remove the current callback.
     */
    once: (listener: EventBusListener<T, P>) => Fn;
    /**
     * Emit an event, the corresponding event listeners will execute.
     * @param event data sent.
     */
    emit: (event?: T, payload?: P) => void;
    /**
     * Remove the corresponding listener.
     * @param listener watch listener.
     */
    off: (listener: EventBusListener<T>) => void;
    /**
     * Clear all events
     */
    reset: () => void;
}
declare function useEventBus<T = unknown, P = any>(key: EventBusIdentifier<T>): UseEventBusReturn<T, P>;

interface InferEventTarget<Events> {
    addEventListener(event: Events, fn?: any, options?: any): any;
    removeEventListener(event: Events, fn?: any, options?: any): any;
}
type WindowEventName = keyof WindowEventMap;
type DocumentEventName = keyof DocumentEventMap;
interface GeneralEventListener<E = Event> {
    (evt: E): void;
}
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 1: Omitted Window target
 *
 * @see https://vueuse.org/useEventListener
 * @param event
 * @param listener
 * @param options
 */
declare function useEventListener<E extends keyof WindowEventMap>(event: Arrayable<E>, listener: Arrayable<(this: Window, ev: WindowEventMap[E]) => any>, options?: MaybeComputedRef<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 2: Explicitly Window target
 *
 * @see https://vueuse.org/useEventListener
 * @param target
 * @param event
 * @param listener
 * @param options
 */
declare function useEventListener<E extends keyof WindowEventMap>(target: Window, event: Arrayable<E>, listener: Arrayable<(this: Window, ev: WindowEventMap[E]) => any>, options?: MaybeComputedRef<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 3: Explicitly Document target
 *
 * @see https://vueuse.org/useEventListener
 * @param target
 * @param event
 * @param listener
 * @param options
 */
declare function useEventListener<E extends keyof DocumentEventMap>(target: DocumentOrShadowRoot, event: Arrayable<E>, listener: Arrayable<(this: Document, ev: DocumentEventMap[E]) => any>, options?: MaybeComputedRef<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 4: Custom event target with event type infer
 *
 * @see https://vueuse.org/useEventListener
 * @param target
 * @param event
 * @param listener
 * @param options
 */
declare function useEventListener<Names extends string, EventType = Event>(target: InferEventTarget<Names>, event: Arrayable<Names>, listener: Arrayable<GeneralEventListener<EventType>>, options?: MaybeComputedRef<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 5: Custom event target fallback
 *
 * @see https://vueuse.org/useEventListener
 * @param target
 * @param event
 * @param listener
 * @param options
 */
declare function useEventListener<EventType = Event>(target: MaybeComputedRef<EventTarget | null | undefined>, event: Arrayable<string>, listener: Arrayable<GeneralEventListener<EventType>>, options?: MaybeComputedRef<boolean | AddEventListenerOptions>): Fn;

type UseEventSourceOptions = EventSourceInit;
/**
 * Reactive wrapper for EventSource.
 *
 * @see https://vueuse.org/useEventSource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource EventSource
 * @param url
 * @param events
 * @param options
 */
declare function useEventSource(url: string, events?: Array<string>, options?: UseEventSourceOptions): {
    eventSource: Ref<EventSource | null>;
    event: Ref<string | null>;
    data: Ref<string | null>;
    status: Ref<"OPEN" | "CONNECTING" | "CLOSED">;
    error: Ref<Event | null>;
    close: () => void;
};
type UseEventSourceReturn = ReturnType<typeof useEventSource>;

interface EyeDropperOpenOptions {
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
     */
    signal?: AbortSignal;
}
interface EyeDropper {
    new (): EyeDropper;
    open: (options?: EyeDropperOpenOptions) => Promise<{
        sRGBHex: string;
    }>;
    [Symbol.toStringTag]: 'EyeDropper';
}
interface UseEyeDropperOptions {
    /**
     * Initial sRGBHex.
     *
     * @default ''
     */
    initialValue?: string;
}
/**
 * Reactive [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API)
 *
 * @see https://vueuse.org/useEyeDropper
 * @param initialValue string
 */
declare function useEyeDropper(options?: UseEyeDropperOptions): {
    isSupported: vue_demi.Ref<boolean>;
    sRGBHex: vue_demi.Ref<string>;
    open: (openOptions?: EyeDropperOpenOptions) => Promise<{
        sRGBHex: string;
    } | undefined>;
};
type UseEyeDropperReturn = ReturnType<typeof useEyeDropper>;

interface UseFaviconOptions extends ConfigurableDocument {
    baseUrl?: string;
    rel?: string;
}
/**
 * Reactive favicon.
 *
 * @see https://vueuse.org/useFavicon
 * @param newIcon
 * @param options
 */
declare function useFavicon(newIcon: MaybeReadonlyRef<string | null | undefined>, options?: UseFaviconOptions): ComputedRef<string | null | undefined>;
declare function useFavicon(newIcon?: MaybeRef<string | null | undefined>, options?: UseFaviconOptions): Ref<string | null | undefined>;
type UseFaviconReturn = ReturnType<typeof useFavicon>;

interface UseFetchReturn<T> {
    /**
     * Indicates if the fetch request has finished
     */
    isFinished: Ref<boolean>;
    /**
     * The statusCode of the HTTP fetch response
     */
    statusCode: Ref<number | null>;
    /**
     * The raw response of the fetch response
     */
    response: Ref<Response | null>;
    /**
     * Any fetch errors that may have occurred
     */
    error: Ref<any>;
    /**
     * The fetch response body, may either be JSON or text
     */
    data: Ref<T | null>;
    /**
     * Indicates if the request is currently being fetched.
     */
    isFetching: Ref<boolean>;
    /**
     * Indicates if the fetch request is able to be aborted
     */
    canAbort: ComputedRef<boolean>;
    /**
     * Indicates if the fetch request was aborted
     */
    aborted: Ref<boolean>;
    /**
     * Abort the fetch request
     */
    abort: Fn;
    /**
     * Manually call the fetch
     * (default not throwing error)
     */
    execute: (throwOnFailed?: boolean) => Promise<any>;
    /**
     * Fires after the fetch request has finished
     */
    onFetchResponse: EventHookOn<Response>;
    /**
     * Fires after a fetch request error
     */
    onFetchError: EventHookOn;
    /**
     * Fires after a fetch has completed
     */
    onFetchFinally: EventHookOn;
    get(): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
    post(payload?: MaybeComputedRef<unknown>, type?: string): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
    put(payload?: MaybeComputedRef<unknown>, type?: string): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
    delete(payload?: MaybeComputedRef<unknown>, type?: string): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
    patch(payload?: MaybeComputedRef<unknown>, type?: string): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
    head(payload?: MaybeComputedRef<unknown>, type?: string): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
    options(payload?: MaybeComputedRef<unknown>, type?: string): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
    json<JSON = any>(): UseFetchReturn<JSON> & PromiseLike<UseFetchReturn<JSON>>;
    text(): UseFetchReturn<string> & PromiseLike<UseFetchReturn<string>>;
    blob(): UseFetchReturn<Blob> & PromiseLike<UseFetchReturn<Blob>>;
    arrayBuffer(): UseFetchReturn<ArrayBuffer> & PromiseLike<UseFetchReturn<ArrayBuffer>>;
    formData(): UseFetchReturn<FormData> & PromiseLike<UseFetchReturn<FormData>>;
}
type Combination = 'overwrite' | 'chain';
interface BeforeFetchContext {
    /**
     * The computed url of the current request
     */
    url: string;
    /**
     * The request options of the current request
     */
    options: RequestInit;
    /**
     * Cancels the current request
     */
    cancel: Fn;
}
interface AfterFetchContext<T = any> {
    response: Response;
    data: T | null;
}
interface OnFetchErrorContext<T = any, E = any> {
    error: E;
    data: T | null;
}
interface UseFetchOptions {
    /**
     * Fetch function
     */
    fetch?: typeof window.fetch;
    /**
     * Will automatically run fetch when `useFetch` is used
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Will automatically refetch when:
     * - the URL is changed if the URL is a ref
     * - the payload is changed if the payload is a ref
     *
     * @default false
     */
    refetch?: MaybeComputedRef<boolean>;
    /**
     * Initial data before the request finished
     *
     * @default null
     */
    initialData?: any;
    /**
     * Timeout for abort request after number of millisecond
     * `0` means use browser default
     *
     * @default 0
     */
    timeout?: number;
    /**
     * Will run immediately before the fetch request is dispatched
     */
    beforeFetch?: (ctx: BeforeFetchContext) => Promise<Partial<BeforeFetchContext> | void> | Partial<BeforeFetchContext> | void;
    /**
     * Will run immediately after the fetch request is returned.
     * Runs after any 2xx response
     */
    afterFetch?: (ctx: AfterFetchContext) => Promise<Partial<AfterFetchContext>> | Partial<AfterFetchContext>;
    /**
     * Will run immediately after the fetch request is returned.
     * Runs after any 4xx and 5xx response
     */
    onFetchError?: (ctx: {
        data: any;
        response: Response | null;
        error: any;
    }) => Promise<Partial<OnFetchErrorContext>> | Partial<OnFetchErrorContext>;
}
interface CreateFetchOptions {
    /**
     * The base URL that will be prefixed to all urls unless urls are absolute
     */
    baseUrl?: MaybeComputedRef<string>;
    /**
     * Determine the inherit behavior for beforeFetch, afterFetch, onFetchError
     * @default 'chain'
     */
    combination?: Combination;
    /**
     * Default Options for the useFetch function
     */
    options?: UseFetchOptions;
    /**
     * Options for the fetch request
     */
    fetchOptions?: RequestInit;
}
declare function createFetch(config?: CreateFetchOptions): typeof useFetch;
declare function useFetch<T>(url: MaybeComputedRef<string>): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
declare function useFetch<T>(url: MaybeComputedRef<string>, useFetchOptions: UseFetchOptions): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
declare function useFetch<T>(url: MaybeComputedRef<string>, options: RequestInit, useFetchOptions?: UseFetchOptions): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;

interface UseFileDialogOptions extends ConfigurableDocument {
    /**
     * @default true
     */
    multiple?: boolean;
    /**
     * @default '*'
     */
    accept?: string;
    /**
     * Select the input source for the capture file.
     * @see [HTMLInputElement Capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture)
     */
    capture?: string;
}
interface UseFileDialogReturn {
    files: Ref<FileList | null>;
    open: (localOptions?: Partial<UseFileDialogOptions>) => void;
    reset: () => void;
}
/**
 * Open file dialog with ease.
 *
 * @see https://vueuse.org/useFileDialog
 * @param options
 */
declare function useFileDialog(options?: UseFileDialogOptions): UseFileDialogReturn;

/**
 * window.showOpenFilePicker parameters
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePicker#parameters
 */
interface FileSystemAccessShowOpenFileOptions {
    multiple?: boolean;
    types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
}
/**
 * window.showSaveFilePicker parameters
 * @see https://developer.mozilla.org/en-US/docs/Web/API/window/showSaveFilePicker#parameters
 */
interface FileSystemAccessShowSaveFileOptions {
    suggestedName?: string;
    types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
    }>;
    excludeAcceptAllOption?: boolean;
}
/**
 * FileHandle
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle
 */
interface FileSystemFileHandle {
    getFile: () => Promise<File>;
    createWritable: () => FileSystemWritableFileStream;
}
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
 */
interface FileSystemWritableFileStream extends WritableStream {
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
     */
    write: FileSystemWritableFileStreamWrite;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/seek
     */
    seek: (position: number) => Promise<void>;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/truncate
     */
    truncate: (size: number) => Promise<void>;
}
/**
 * FileStream.write
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
 */
interface FileSystemWritableFileStreamWrite {
    (data: string | BufferSource | Blob): Promise<void>;
    (options: {
        type: 'write';
        position: number;
        data: string | BufferSource | Blob;
    }): Promise<void>;
    (options: {
        type: 'seek';
        position: number;
    }): Promise<void>;
    (options: {
        type: 'truncate';
        size: number;
    }): Promise<void>;
}
/**
 * FileStream.write
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream/write
 */
type FileSystemAccessWindow = Window & {
    showSaveFilePicker: (options: FileSystemAccessShowSaveFileOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker: (options: FileSystemAccessShowOpenFileOptions) => Promise<FileSystemFileHandle[]>;
};
type UseFileSystemAccessCommonOptions = Pick<FileSystemAccessShowOpenFileOptions, 'types' | 'excludeAcceptAllOption'>;
type UseFileSystemAccessShowSaveFileOptions = Pick<FileSystemAccessShowSaveFileOptions, 'suggestedName'>;
type UseFileSystemAccessOptions = ConfigurableWindow & UseFileSystemAccessCommonOptions & {
    /**
     * file data type
     */
    dataType?: MaybeComputedRef<'Text' | 'ArrayBuffer' | 'Blob'>;
};
/**
 * Create and read and write local files.
 * @see https://vueuse.org/useFileSystemAccess
 * @param options
 */
declare function useFileSystemAccess(options: UseFileSystemAccessOptions & {
    dataType: 'Text';
}): UseFileSystemAccessReturn<string>;
declare function useFileSystemAccess(options: UseFileSystemAccessOptions & {
    dataType: 'ArrayBuffer';
}): UseFileSystemAccessReturn<ArrayBuffer>;
declare function useFileSystemAccess(options: UseFileSystemAccessOptions & {
    dataType: 'Blob';
}): UseFileSystemAccessReturn<Blob>;
declare function useFileSystemAccess(options: UseFileSystemAccessOptions): UseFileSystemAccessReturn<string | ArrayBuffer | Blob>;
interface UseFileSystemAccessReturn<T = string> {
    isSupported: Ref<boolean>;
    data: Ref<T | undefined>;
    file: Ref<File | undefined>;
    fileName: Ref<string>;
    fileMIME: Ref<string>;
    fileSize: Ref<number>;
    fileLastModified: Ref<number>;
    open: (_options?: UseFileSystemAccessCommonOptions) => Awaitable<void>;
    create: (_options?: UseFileSystemAccessShowSaveFileOptions) => Awaitable<void>;
    save: (_options?: UseFileSystemAccessShowSaveFileOptions) => Awaitable<void>;
    saveAs: (_options?: UseFileSystemAccessShowSaveFileOptions) => Awaitable<void>;
    updateData: () => Awaitable<void>;
}

interface UseFocusOptions extends ConfigurableWindow {
    /**
     * Initial value. If set true, then focus will be set on the target
     *
     * @default false
     */
    initialValue?: boolean;
}
interface UseFocusReturn {
    /**
     * If read as true, then the element has focus. If read as false, then the element does not have focus
     * If set to true, then the element will be focused. If set to false, the element will be blurred.
     */
    focused: Ref<boolean>;
}
/**
 * Track or set the focus state of a DOM element.
 *
 * @see https://vueuse.org/useFocus
 * @param target The target element for the focus and blur events.
 * @param options
 */
declare function useFocus(target: MaybeElementRef, options?: UseFocusOptions): UseFocusReturn;

interface UseFocusWithinReturn {
    /**
     * True if the element or any of its descendants are focused
     */
    focused: ComputedRef<boolean>;
}
/**
 * Track if focus is contained within the target element
 *
 * @see https://vueuse.org/useFocusWithin
 * @param target The target element to track
 * @param options Focus within options
 */
declare function useFocusWithin(target: MaybeElementRef, options?: ConfigurableWindow): UseFocusWithinReturn;

interface UseFpsOptions {
    /**
     * Calculate the FPS on every x frames.
     * @default 10
     */
    every?: number;
}
declare function useFps(options?: UseFpsOptions): Ref<number>;

interface UseFullscreenOptions extends ConfigurableDocument {
    /**
     * Automatically exit fullscreen when component is unmounted
     *
     * @default false
     */
    autoExit?: boolean;
}
/**
 * Reactive Fullscreen API.
 *
 * @see https://vueuse.org/useFullscreen
 * @param target
 * @param options
 */
declare function useFullscreen(target?: MaybeElementRef, options?: UseFullscreenOptions): {
    isSupported: vue_demi.Ref<boolean>;
    isFullscreen: vue_demi.Ref<boolean>;
    enter: () => Promise<void>;
    exit: () => Promise<void>;
    toggle: () => Promise<void>;
};
type UseFullscreenReturn = ReturnType<typeof useFullscreen>;

interface UseGamepadOptions extends ConfigurableWindow, ConfigurableNavigator {
}
/**
 * Maps a standard standard gamepad to an Xbox 360 Controller.
 */
declare function mapGamepadToXbox360Controller(gamepad: Ref<Gamepad | undefined>): vue_demi.ComputedRef<{
    buttons: {
        a: GamepadButton;
        b: GamepadButton;
        x: GamepadButton;
        y: GamepadButton;
    };
    bumper: {
        left: GamepadButton;
        right: GamepadButton;
    };
    triggers: {
        left: GamepadButton;
        right: GamepadButton;
    };
    stick: {
        left: {
            horizontal: number;
            vertical: number;
            button: GamepadButton;
        };
        right: {
            horizontal: number;
            vertical: number;
            button: GamepadButton;
        };
    };
    dpad: {
        up: GamepadButton;
        down: GamepadButton;
        left: GamepadButton;
        right: GamepadButton;
    };
    back: GamepadButton;
    start: GamepadButton;
} | null>;
declare function useGamepad(options?: UseGamepadOptions): {
    isSupported: Ref<boolean>;
    onConnected: _vueuse_shared.EventHookOn<number>;
    onDisconnected: _vueuse_shared.EventHookOn<number>;
    gamepads: Ref<{
        readonly axes: readonly number[];
        readonly buttons: readonly {
            readonly pressed: boolean;
            readonly touched: boolean;
            readonly value: number;
        }[];
        readonly connected: boolean;
        readonly hapticActuators: readonly {
            readonly type: "vibration";
        }[];
        readonly id: string;
        readonly index: number;
        readonly mapping: GamepadMappingType;
        readonly timestamp: number;
    }[]>;
    pause: _vueuse_shared.Fn;
    resume: _vueuse_shared.Fn;
    isActive: Readonly<Ref<boolean>>;
};
type UseGamepadReturn = ReturnType<typeof useGamepad>;

interface UseGeolocationOptions extends Partial<PositionOptions>, ConfigurableNavigator {
    immediate?: boolean;
}
/**
 * Reactive Geolocation API.
 *
 * @see https://vueuse.org/useGeolocation
 * @param options
 */
declare function useGeolocation(options?: UseGeolocationOptions): {
    isSupported: Ref<boolean>;
    coords: Ref<GeolocationCoordinates>;
    locatedAt: Ref<number | null>;
    error: Ref<{
        readonly code: number;
        readonly message: string;
        readonly PERMISSION_DENIED: number;
        readonly POSITION_UNAVAILABLE: number;
        readonly TIMEOUT: number;
    } | null>;
    resume: () => void;
    pause: () => void;
};
type UseGeolocationReturn = ReturnType<typeof useGeolocation>;

interface UseIdleOptions extends ConfigurableWindow, ConfigurableEventFilter {
    /**
     * Event names that listen to for detected user activity
     *
     * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
     */
    events?: WindowEventName[];
    /**
     * Listen for document visibility change
     *
     * @default true
     */
    listenForVisibilityChange?: boolean;
    /**
     * Initial state of the ref idle
     *
     * @default false
     */
    initialState?: boolean;
}
interface UseIdleReturn {
    idle: Ref<boolean>;
    lastActive: Ref<number>;
}
/**
 * Tracks whether the user is being inactive.
 *
 * @see https://vueuse.org/useIdle
 * @param timeout default to 1 minute
 * @param options IdleOptions
 */
declare function useIdle(timeout?: number, options?: UseIdleOptions): UseIdleReturn;

interface UseImageOptions {
    /** Address of the resource */
    src: string;
    /** Images to use in different situations, e.g., high-resolution displays, small monitors, etc. */
    srcset?: string;
    /** Image sizes for different page layouts */
    sizes?: string;
}
/**
 * Reactive load an image in the browser, you can wait the result to display it or show a fallback.
 *
 * @see https://vueuse.org/useImage
 * @param options Image attributes, as used in the <img> tag
 * @param asyncStateOptions
 */
declare const useImage: <Shallow extends true>(options: MaybeComputedRef<UseImageOptions>, asyncStateOptions?: UseAsyncStateOptions<Shallow, any>) => UseAsyncStateReturn<HTMLImageElement | undefined, [], true>;
type UseImageReturn = ReturnType<typeof useImage>;

interface UseScrollOptions {
    /**
     * Throttle time for scroll event, it’s disabled by default.
     *
     * @default 0
     */
    throttle?: number;
    /**
     * The check time when scrolling ends.
     * This configuration will be setting to (throttle + idle) when the `throttle` is configured.
     *
     * @default 200
     */
    idle?: number;
    /**
     * Offset arrived states by x pixels
     *
     */
    offset?: {
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
    };
    /**
     * Trigger it when scrolling.
     *
     */
    onScroll?: (e: Event) => void;
    /**
     * Trigger it when scrolling ends.
     *
     */
    onStop?: (e: Event) => void;
    /**
     * Listener options for scroll event.
     *
     * @default {capture: false, passive: true}
     */
    eventListenerOptions?: boolean | AddEventListenerOptions;
    /**
     * Optionally specify a scroll behavior of `auto` (default, not smooth scrolling) or
     * `smooth` (for smooth scrolling) which takes effect when changing the `x` or `y` refs.
     *
     * @default 'auto'
     */
    behavior?: MaybeComputedRef<ScrollBehavior>;
}
/**
 * Reactive scroll.
 *
 * @see https://vueuse.org/useScroll
 * @param element
 * @param options
 */
declare function useScroll(element: MaybeComputedRef<HTMLElement | SVGElement | Window | Document | null | undefined>, options?: UseScrollOptions): {
    x: vue_demi.WritableComputedRef<number>;
    y: vue_demi.WritableComputedRef<number>;
    isScrolling: vue_demi.Ref<boolean>;
    arrivedState: {
        left: boolean;
        right: boolean;
        top: boolean;
        bottom: boolean;
    };
    directions: {
        left: boolean;
        right: boolean;
        top: boolean;
        bottom: boolean;
    };
};
type UseScrollReturn = ReturnType<typeof useScroll>;

interface UseInfiniteScrollOptions extends UseScrollOptions {
    /**
     * The minimum distance between the bottom of the element and the bottom of the viewport
     *
     * @default 0
     */
    distance?: number;
    /**
     * The direction in which to listen the scroll.
     *
     * @default 'bottom'
     */
    direction?: 'top' | 'bottom' | 'left' | 'right';
    /**
     * Whether to preserve the current scroll position when loading more items.
     *
     * @default false
     */
    preserveScrollPosition?: boolean;
}
/**
 * Reactive infinite scroll.
 *
 * @see https://vueuse.org/useInfiniteScroll
 */
declare function useInfiniteScroll(element: MaybeComputedRef<HTMLElement | SVGElement | Window | Document | null | undefined>, onLoadMore: (state: UnwrapNestedRefs<ReturnType<typeof useScroll>>) => void | Promise<void>, options?: UseInfiniteScrollOptions): void;

interface UseIntersectionObserverOptions extends ConfigurableWindow {
    /**
     * The Element or Document whose bounds are used as the bounding box when testing for intersection.
     */
    root?: MaybeElementRef;
    /**
     * A string which specifies a set of offsets to add to the root's bounding_box when calculating intersections.
     */
    rootMargin?: string;
    /**
     * Either a single number or an array of numbers between 0.0 and 1.
     */
    threshold?: number | number[];
}
/**
 * Detects that a target element's visibility.
 *
 * @see https://vueuse.org/useIntersectionObserver
 * @param target
 * @param callback
 * @param options
 */
declare function useIntersectionObserver(target: MaybeElementRef, callback: IntersectionObserverCallback, options?: UseIntersectionObserverOptions): {
    isSupported: vue_demi.Ref<boolean>;
    stop: () => void;
};
type UseIntersectionObserverReturn = ReturnType<typeof useIntersectionObserver>;

type KeyModifier = 'Alt' | 'AltGraph' | 'CapsLock' | 'Control' | 'Fn' | 'FnLock' | 'Meta' | 'NumLock' | 'ScrollLock' | 'Shift' | 'Symbol' | 'SymbolLock';
interface UseModifierOptions<Initial> extends ConfigurableDocument {
    /**
     * Event names that will prompt update to modifier states
     *
     * @default ['mousedown', 'mouseup', 'keydown', 'keyup']
     */
    events?: WindowEventName[];
    /**
     * Initial value of the returned ref
     *
     * @default null
     */
    initial?: Initial;
}
type UseKeyModifierReturn<Initial> = Ref<Initial extends boolean ? boolean : boolean | null>;
declare function useKeyModifier<Initial extends boolean | null>(modifier: KeyModifier, options?: UseModifierOptions<Initial>): UseKeyModifierReturn<Initial>;

declare function useLocalStorage(key: string, initialValue: MaybeComputedRef<string>, options?: UseStorageOptions<string>): RemovableRef<string>;
declare function useLocalStorage(key: string, initialValue: MaybeComputedRef<boolean>, options?: UseStorageOptions<boolean>): RemovableRef<boolean>;
declare function useLocalStorage(key: string, initialValue: MaybeComputedRef<number>, options?: UseStorageOptions<number>): RemovableRef<number>;
declare function useLocalStorage<T>(key: string, initialValue: MaybeComputedRef<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
declare function useLocalStorage<T = unknown>(key: string, initialValue: MaybeComputedRef<null>, options?: UseStorageOptions<T>): RemovableRef<T>;

declare const DefaultMagicKeysAliasMap: Readonly<Record<string, string>>;

interface UseMagicKeysOptions<Reactive extends Boolean> {
    /**
     * Returns a reactive object instead of an object of refs
     *
     * @default false
     */
    reactive?: Reactive;
    /**
     * Target for listening events
     *
     * @default window
     */
    target?: MaybeComputedRef<EventTarget>;
    /**
     * Alias map for keys, all the keys should be lowercase
     * { target: keycode }
     *
     * @example { ctrl: "control" }
     * @default <predefined-map>
     */
    aliasMap?: Record<string, string>;
    /**
     * Register passive listener
     *
     * @default true
     */
    passive?: boolean;
    /**
     * Custom event handler for keydown/keyup event.
     * Useful when you want to apply custom logic.
     *
     * When using `e.preventDefault()`, you will need to pass `passive: false` to useMagicKeys().
     */
    onEventFired?: (e: KeyboardEvent) => void | boolean;
}
interface MagicKeysInternal {
    /**
     * A Set of currently pressed keys,
     * Stores raw keyCodes.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
     */
    current: Set<string>;
}
type UseMagicKeysReturn<Reactive extends Boolean> = Readonly<Omit<Reactive extends true ? Record<string, boolean> : Record<string, ComputedRef<boolean>>, keyof MagicKeysInternal> & MagicKeysInternal>;
/**
 * Reactive keys pressed state, with magical keys combination support.
 *
 * @see https://vueuse.org/useMagicKeys
 */
declare function useMagicKeys(options?: UseMagicKeysOptions<false>): UseMagicKeysReturn<false>;
declare function useMagicKeys(options: UseMagicKeysOptions<true>): UseMagicKeysReturn<true>;

/**
 * Many of the jsdoc definitions here are modified version of the
 * documentation from MDN(https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)
 */
interface UseMediaSource {
    /**
     * The source url for the media
     */
    src: string;
    /**
     * The media codec type
     */
    type?: string;
}
interface UseMediaTextTrackSource {
    /**
     * Indicates that the track should be enabled unless the user's preferences indicate
     * that another track is more appropriate
     */
    default?: boolean;
    /**
     * How the text track is meant to be used. If omitted the default kind is subtitles.
     */
    kind: TextTrackKind;
    /**
     * A user-readable title of the text track which is used by the browser
     * when listing available text tracks.
     */
    label: string;
    /**
     * Address of the track (.vtt file). Must be a valid URL. This attribute
     * must be specified and its URL value must have the same origin as the document
     */
    src: string;
    /**
     * Language of the track text data. It must be a valid BCP 47 language tag.
     * If the kind attribute is set to subtitles, then srclang must be defined.
     */
    srcLang: string;
}
interface UseMediaControlsOptions extends ConfigurableDocument {
    /**
     * The source for the media, may either be a string, a `UseMediaSource` object, or a list
     * of `UseMediaSource` objects.
     */
    src?: MaybeComputedRef<string | UseMediaSource | UseMediaSource[]>;
    /**
     * A list of text tracks for the media
     */
    tracks?: MaybeComputedRef<UseMediaTextTrackSource[]>;
}
interface UseMediaTextTrack {
    /**
     * The index of the text track
     */
    id: number;
    /**
     * The text track label
     */
    label: string;
    /**
     * Language of the track text data. It must be a valid BCP 47 language tag.
     * If the kind attribute is set to subtitles, then srclang must be defined.
     */
    language: string;
    /**
     * Specifies the display mode of the text track, either `disabled`,
     * `hidden`, or `showing`
     */
    mode: TextTrackMode;
    /**
     * How the text track is meant to be used. If omitted the default kind is subtitles.
     */
    kind: TextTrackKind;
    /**
     * Indicates the track's in-band metadata track dispatch type.
     */
    inBandMetadataTrackDispatchType: string;
    /**
     * A list of text track cues
     */
    cues: TextTrackCueList | null;
    /**
     * A list of active text track cues
     */
    activeCues: TextTrackCueList | null;
}
declare function useMediaControls(target: MaybeRef<HTMLMediaElement | null | undefined>, options?: UseMediaControlsOptions): {
    currentTime: vue_demi.Ref<number>;
    duration: vue_demi.Ref<number>;
    waiting: vue_demi.Ref<boolean>;
    seeking: vue_demi.Ref<boolean>;
    ended: vue_demi.Ref<boolean>;
    stalled: vue_demi.Ref<boolean>;
    buffered: vue_demi.Ref<[number, number][]>;
    playing: vue_demi.Ref<boolean>;
    rate: vue_demi.Ref<number>;
    volume: vue_demi.Ref<number>;
    muted: vue_demi.Ref<boolean>;
    tracks: vue_demi.Ref<{
        id: number;
        label: string;
        language: string;
        mode: TextTrackMode;
        kind: TextTrackKind;
        inBandMetadataTrackDispatchType: string;
        cues: {
            [x: number]: {
                endTime: number;
                id: string;
                onenter: ((this: TextTrackCue, ev: Event) => any) | null;
                onexit: ((this: TextTrackCue, ev: Event) => any) | null;
                pauseOnExit: boolean;
                startTime: number;
                readonly track: {
                    readonly activeCues: any | null;
                    readonly cues: any | null;
                    readonly id: string;
                    readonly inBandMetadataTrackDispatchType: string;
                    readonly kind: TextTrackKind;
                    readonly label: string;
                    readonly language: string;
                    mode: TextTrackMode;
                    oncuechange: ((this: TextTrack, ev: Event) => any) | null;
                    addCue: (cue: TextTrackCue) => void;
                    removeCue: (cue: TextTrackCue) => void;
                    addEventListener: {
                        <K extends "cuechange">(type: K, listener: (this: TextTrack, ev: TextTrackEventMap[K]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
                        (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
                    };
                    removeEventListener: {
                        <K_1 extends "cuechange">(type: K_1, listener: (this: TextTrack, ev: TextTrackEventMap[K_1]) => any, options?: boolean | EventListenerOptions | undefined): void;
                        (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
                    };
                    dispatchEvent: (event: Event) => boolean;
                } | null;
                addEventListener: {
                    <K_2 extends keyof TextTrackCueEventMap>(type: K_2, listener: (this: TextTrackCue, ev: TextTrackCueEventMap[K_2]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
                    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
                };
                removeEventListener: {
                    <K_3 extends keyof TextTrackCueEventMap>(type: K_3, listener: (this: TextTrackCue, ev: TextTrackCueEventMap[K_3]) => any, options?: boolean | EventListenerOptions | undefined): void;
                    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
                };
                dispatchEvent: (event: Event) => boolean;
            };
            readonly length: number;
            getCueById: (id: string) => TextTrackCue | null;
            [Symbol.iterator]: () => IterableIterator<TextTrackCue>;
        } | null;
        activeCues: {
            [x: number]: {
                endTime: number;
                id: string;
                onenter: ((this: TextTrackCue, ev: Event) => any) | null;
                onexit: ((this: TextTrackCue, ev: Event) => any) | null;
                pauseOnExit: boolean;
                startTime: number;
                readonly track: {
                    readonly activeCues: any | null;
                    readonly cues: any | null;
                    readonly id: string;
                    readonly inBandMetadataTrackDispatchType: string;
                    readonly kind: TextTrackKind;
                    readonly label: string;
                    readonly language: string;
                    mode: TextTrackMode;
                    oncuechange: ((this: TextTrack, ev: Event) => any) | null;
                    addCue: (cue: TextTrackCue) => void;
                    removeCue: (cue: TextTrackCue) => void;
                    addEventListener: {
                        <K extends "cuechange">(type: K, listener: (this: TextTrack, ev: TextTrackEventMap[K]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
                        (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
                    };
                    removeEventListener: {
                        <K_1 extends "cuechange">(type: K_1, listener: (this: TextTrack, ev: TextTrackEventMap[K_1]) => any, options?: boolean | EventListenerOptions | undefined): void;
                        (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
                    };
                    dispatchEvent: (event: Event) => boolean;
                } | null;
                addEventListener: {
                    <K_2 extends keyof TextTrackCueEventMap>(type: K_2, listener: (this: TextTrackCue, ev: TextTrackCueEventMap[K_2]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
                    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
                };
                removeEventListener: {
                    <K_3 extends keyof TextTrackCueEventMap>(type: K_3, listener: (this: TextTrackCue, ev: TextTrackCueEventMap[K_3]) => any, options?: boolean | EventListenerOptions | undefined): void;
                    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
                };
                dispatchEvent: (event: Event) => boolean;
            };
            readonly length: number;
            getCueById: (id: string) => TextTrackCue | null;
            [Symbol.iterator]: () => IterableIterator<TextTrackCue>;
        } | null;
    }[]>;
    selectedTrack: vue_demi.Ref<number>;
    enableTrack: (track: number | UseMediaTextTrack, disableTracks?: boolean) => void;
    disableTrack: (track?: number | UseMediaTextTrack) => void;
    supportsPictureInPicture: boolean | undefined;
    togglePictureInPicture: () => Promise<unknown>;
    isPictureInPicture: vue_demi.Ref<boolean>;
    onSourceError: _vueuse_shared.EventHookOn<Event>;
};
type UseMediaControlsReturn = ReturnType<typeof useMediaControls>;

/**
 * Reactive Media Query.
 *
 * @see https://vueuse.org/useMediaQuery
 * @param query
 * @param options
 */
declare function useMediaQuery(query: MaybeComputedRef<string>, options?: ConfigurableWindow): vue_demi.Ref<boolean>;

type CacheKey = any;
/**
 * Custom memoize cache handler
 */
interface UseMemoizeCache<Key, Value> {
    /**
     * Get value for key
     */
    get(key: Key): Value | undefined;
    /**
     * Set value for key
     */
    set(key: Key, value: Value): void;
    /**
     * Return flag if key exists
     */
    has(key: Key): boolean;
    /**
     * Delete value for key
     */
    delete(key: Key): void;
    /**
     * Clear cache
     */
    clear(): void;
}
/**
 * Memoized function
 */
interface UseMemoizeReturn<Result, Args extends unknown[]> {
    /**
     * Get result from cache or call memoized function
     */
    (...args: Args): Result;
    /**
     * Call memoized function and update cache
     */
    load(...args: Args): Result;
    /**
     * Delete cache of given arguments
     */
    delete(...args: Args): void;
    /**
     * Clear cache
     */
    clear(): void;
    /**
     * Generate cache key for given arguments
     */
    generateKey(...args: Args): CacheKey;
    /**
     * Cache container
     */
    cache: UseMemoizeCache<CacheKey, Result>;
}
interface UseMemoizeOptions<Result, Args extends unknown[]> {
    getKey?: (...args: Args) => string | number;
    cache?: UseMemoizeCache<CacheKey, Result>;
}
/**
 * Reactive function result cache based on arguments
 */
declare function useMemoize<Result, Args extends unknown[]>(resolver: (...args: Args) => Result, options?: UseMemoizeOptions<Result, Args>): UseMemoizeReturn<Result, Args>;

/**
 * Performance.memory
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
interface MemoryInfo {
    /**
     * The maximum size of the heap, in bytes, that is available to the context.
     */
    readonly jsHeapSizeLimit: number;
    /**
     *  The total allocated heap size, in bytes.
     */
    readonly totalJSHeapSize: number;
    /**
     * The currently active segment of JS heap, in bytes.
     */
    readonly usedJSHeapSize: number;
    [Symbol.toStringTag]: 'MemoryInfo';
}
interface UseMemoryOptions extends UseIntervalFnOptions {
    interval?: number;
}
/**
 * Reactive Memory Info.
 *
 * @see https://vueuse.org/useMemory
 * @param options
 */
declare function useMemory(options?: UseMemoryOptions): {
    isSupported: vue_demi.Ref<boolean>;
    memory: vue_demi.Ref<MemoryInfo | undefined>;
};
type UseMemoryReturn = ReturnType<typeof useMemory>;

/**
 * Mounted state in ref.
 *
 * @see https://vueuse.org/useMounted
 * @param options
 */
declare function useMounted(): vue_demi.Ref<boolean>;

interface UseMouseOptions extends ConfigurableWindow, ConfigurableEventFilter {
    /**
     * Mouse position based by page, client, or relative to previous position
     *
     * @default 'page'
     */
    type?: 'page' | 'client' | 'movement';
    /**
     * Listen to `touchmove` events
     *
     * @default true
     */
    touch?: boolean;
    /**
     * Reset to initial value when `touchend` event fired
     *
     * @default false
     */
    resetOnTouchEnds?: boolean;
    /**
     * Initial values
     */
    initialValue?: Position;
}
type MouseSourceType = 'mouse' | 'touch' | null;
/**
 * Reactive mouse position.
 *
 * @see https://vueuse.org/useMouse
 * @param options
 */
declare function useMouse(options?: UseMouseOptions): {
    x: vue_demi.Ref<number>;
    y: vue_demi.Ref<number>;
    sourceType: vue_demi.Ref<MouseSourceType>;
};
type UseMouseReturn = ReturnType<typeof useMouse>;

interface MouseInElementOptions extends UseMouseOptions {
    handleOutside?: boolean;
}
/**
 * Reactive mouse position related to an element.
 *
 * @see https://vueuse.org/useMouseInElement
 * @param target
 * @param options
 */
declare function useMouseInElement(target?: MaybeElementRef, options?: MouseInElementOptions): {
    x: vue_demi.Ref<number>;
    y: vue_demi.Ref<number>;
    sourceType: vue_demi.Ref<MouseSourceType>;
    elementX: vue_demi.Ref<number>;
    elementY: vue_demi.Ref<number>;
    elementPositionX: vue_demi.Ref<number>;
    elementPositionY: vue_demi.Ref<number>;
    elementHeight: vue_demi.Ref<number>;
    elementWidth: vue_demi.Ref<number>;
    isOutside: vue_demi.Ref<boolean>;
    stop: () => void;
};
type UseMouseInElementReturn = ReturnType<typeof useMouseInElement>;

interface MousePressedOptions extends ConfigurableWindow {
    /**
     * Listen to `touchstart` `touchend` events
     *
     * @default true
     */
    touch?: boolean;
    /**
     * Listen to `dragstart` `drop` and `dragend` events
     *
     * @default true
     */
    drag?: boolean;
    /**
     * Initial values
     *
     * @default false
     */
    initialValue?: boolean;
    /**
     * Element target to be capture the click
     */
    target?: MaybeElementRef;
}
/**
 * Reactive mouse position.
 *
 * @see https://vueuse.org/useMousePressed
 * @param options
 */
declare function useMousePressed(options?: MousePressedOptions): {
    pressed: vue_demi.Ref<boolean>;
    sourceType: vue_demi.Ref<MouseSourceType>;
};
type UseMousePressedReturn = ReturnType<typeof useMousePressed>;

interface UseMutationObserverOptions extends MutationObserverInit, ConfigurableWindow {
}
/**
 * Watch for changes being made to the DOM tree.
 *
 * @see https://vueuse.org/useMutationObserver
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver MutationObserver MDN
 * @param target
 * @param callback
 * @param options
 */
declare function useMutationObserver(target: MaybeElementRef, callback: MutationCallback, options?: UseMutationObserverOptions): {
    isSupported: vue_demi.Ref<boolean>;
    stop: () => void;
};
type UseMutationObserverReturn = ReturnType<typeof useMutationObserver>;

interface NavigatorLanguageState {
    isSupported: Ref<boolean>;
    /**
     *
     * ISO 639-1 standard Language Code
     *
     * @info The detected user agent language preference as a language tag
     * (which is sometimes referred to as a "locale identifier").
     * This consists of a 2-3 letter base language tag that indicates a
     * language, optionally followed by additional subtags separated by
     * '-'. The most common extra information is the country or region
     * variant (like 'en-US' or 'fr-CA').
     *
     *
     * @see https://www.iso.org/iso-639-language-codes.html
     * @see https://www.loc.gov/standards/iso639-2/php/code_list.php
     *
     */
    language: Ref<string | undefined>;
}
/**
 *
 * Reactive useNavigatorLanguage
 *
 * Detects the currently selected user language and returns a reactive language
 * @see https://vueuse.org/useNavigatorLanguage
 *
 */
declare const useNavigatorLanguage: (options?: ConfigurableWindow) => Readonly<NavigatorLanguageState>;
type UseNavigatorLanguageReturn = ReturnType<typeof useNavigatorLanguage>;

type NetworkType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | undefined;
interface NetworkState {
    isSupported: Ref<boolean>;
    /**
     * If the user is currently connected.
     */
    isOnline: Ref<boolean>;
    /**
     * The time since the user was last connected.
     */
    offlineAt: Ref<number | undefined>;
    /**
     * At this time, if the user is offline and reconnects
     */
    onlineAt: Ref<number | undefined>;
    /**
     * The download speed in Mbps.
     */
    downlink: Ref<number | undefined>;
    /**
     * The max reachable download speed in Mbps.
     */
    downlinkMax: Ref<number | undefined>;
    /**
     * The detected effective speed type.
     */
    effectiveType: Ref<NetworkEffectiveType | undefined>;
    /**
     * The estimated effective round-trip time of the current connection.
     */
    rtt: Ref<number | undefined>;
    /**
     * If the user activated data saver mode.
     */
    saveData: Ref<boolean | undefined>;
    /**
     * The detected connection/network type.
     */
    type: Ref<NetworkType>;
}
/**
 * Reactive Network status.
 *
 * @see https://vueuse.org/useNetwork
 * @param options
 */
declare function useNetwork(options?: ConfigurableWindow): Readonly<NetworkState>;
type UseNetworkReturn = ReturnType<typeof useNetwork>;

interface UseNowOptions<Controls extends boolean> {
    /**
     * Expose more controls
     *
     * @default false
     */
    controls?: Controls;
    /**
     * Update interval, or use requestAnimationFrame
     *
     * @default requestAnimationFrame
     */
    interval?: 'requestAnimationFrame' | number;
}
/**
 * Reactive current Date instance.
 *
 * @see https://vueuse.org/useNow
 * @param options
 */
declare function useNow(options?: UseNowOptions<false>): Ref<Date>;
declare function useNow(options: UseNowOptions<true>): {
    now: Ref<Date>;
} & Pausable;
type UseNowReturn = ReturnType<typeof useNow>;

/**
 * Reactive URL representing an object.
 *
 * @see https://vueuse.org/useObjectUrl
 * @param object
 */
declare function useObjectUrl(object: MaybeRef<Blob | MediaSource | undefined>): Readonly<vue_demi.Ref<string | undefined>>;

interface UseOffsetPaginationOptions {
    /**
     * Total number of items.
     */
    total?: MaybeRef<number>;
    /**
     * The number of items to display per page.
     * @default 10
     */
    pageSize?: MaybeRef<number>;
    /**
     * The current page number.
     * @default 1
     */
    page?: MaybeRef<number>;
    /**
     * Callback when the `page` change.
     */
    onPageChange?: (returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown;
    /**
     * Callback when the `pageSize` change.
     */
    onPageSizeChange?: (returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown;
    /**
     * Callback when the `pageCount` change.
     */
    onPageCountChange?: (returnValue: UnwrapNestedRefs<UseOffsetPaginationReturn>) => unknown;
}
interface UseOffsetPaginationReturn {
    currentPage: Ref<number>;
    currentPageSize: Ref<number>;
    pageCount: ComputedRef<number>;
    isFirstPage: ComputedRef<boolean>;
    isLastPage: ComputedRef<boolean>;
    prev: () => void;
    next: () => void;
}
type UseOffsetPaginationInfinityPageReturn = Omit<UseOffsetPaginationReturn, 'isLastPage'>;
declare function useOffsetPagination(options: Omit<UseOffsetPaginationOptions, 'total'>): UseOffsetPaginationInfinityPageReturn;
declare function useOffsetPagination(options: UseOffsetPaginationOptions): UseOffsetPaginationReturn;

/**
 * Reactive online state.
 *
 * @see https://vueuse.org/useOnline
 * @param options
 */
declare function useOnline(options?: ConfigurableWindow): vue.Ref<boolean>;

/**
 * Reactive state to show whether mouse leaves the page.
 *
 * @see https://vueuse.org/usePageLeave
 * @param options
 */
declare function usePageLeave(options?: ConfigurableWindow): vue_demi.Ref<boolean>;

interface UseParallaxOptions extends ConfigurableWindow {
    deviceOrientationTiltAdjust?: (i: number) => number;
    deviceOrientationRollAdjust?: (i: number) => number;
    mouseTiltAdjust?: (i: number) => number;
    mouseRollAdjust?: (i: number) => number;
}
interface UseParallaxReturn {
    /**
     * Roll value. Scaled to `-0.5 ~ 0.5`
     */
    roll: ComputedRef<number>;
    /**
     * Tilt value. Scaled to `-0.5 ~ 0.5`
     */
    tilt: ComputedRef<number>;
    /**
     * Sensor source, can be `mouse` or `deviceOrientation`
     */
    source: ComputedRef<'deviceOrientation' | 'mouse'>;
}
/**
 * Create parallax effect easily. It uses `useDeviceOrientation` and fallback to `useMouse`
 * if orientation is not supported.
 *
 * @param target
 * @param options
 */
declare function useParallax(target: MaybeElementRef, options?: UseParallaxOptions): UseParallaxReturn;

type DescriptorNamePolyfill = 'accelerometer' | 'accessibility-events' | 'ambient-light-sensor' | 'background-sync' | 'camera' | 'clipboard-read' | 'clipboard-write' | 'gyroscope' | 'magnetometer' | 'microphone' | 'notifications' | 'payment-handler' | 'persistent-storage' | 'push' | 'speaker';
type GeneralPermissionDescriptor = PermissionDescriptor | {
    name: DescriptorNamePolyfill;
};
interface UsePermissionOptions<Controls extends boolean> extends ConfigurableNavigator {
    /**
     * Expose more controls
     *
     * @default false
     */
    controls?: Controls;
}
type UsePermissionReturn = Readonly<Ref<PermissionState | undefined>>;
interface UsePermissionReturnWithControls {
    state: UsePermissionReturn;
    isSupported: Ref<boolean>;
    query: () => Promise<PermissionStatus | undefined>;
}
/**
 * Reactive Permissions API.
 *
 * @see https://vueuse.org/usePermission
 */
declare function usePermission(permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'], options?: UsePermissionOptions<false>): UsePermissionReturn;
declare function usePermission(permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'], options: UsePermissionOptions<true>): UsePermissionReturnWithControls;

interface UsePointerState extends Position {
    pressure: number;
    pointerId: number;
    tiltX: number;
    tiltY: number;
    width: number;
    height: number;
    twist: number;
    pointerType: PointerType | null;
}
interface UsePointerOptions extends ConfigurableWindow {
    /**
     * Pointer types that listen to.
     *
     * @default ['mouse', 'touch', 'pen']
     */
    pointerTypes?: PointerType[];
    /**
     * Initial values
     */
    initialValue?: MaybeRef<Partial<UsePointerState>>;
    /**
     * @default window
     */
    target?: MaybeRef<EventTarget | null | undefined> | Document | Window;
}
/**
 * Reactive pointer state.
 *
 * @see https://vueuse.org/usePointer
 * @param options
 */
declare function usePointer(options?: UsePointerOptions): {
    isInside: Ref<boolean>;
    pressure: Ref<number>;
    pointerId: Ref<number>;
    tiltX: Ref<number>;
    tiltY: Ref<number>;
    width: Ref<number>;
    height: Ref<number>;
    twist: Ref<number>;
    pointerType: Ref<PointerType | null>;
    x: Ref<number>;
    y: Ref<number>;
};
type UsePointerReturn = ReturnType<typeof usePointer>;

declare global {
    interface PointerLockOptions {
        unadjustedMovement?: boolean;
    }
    interface Element {
        requestPointerLock(options?: PointerLockOptions): Promise<void> | void;
    }
}
type MaybeHTMLElement = HTMLElement | undefined | null;
interface UsePointerLockOptions extends ConfigurableDocument {
    pointerLockOptions?: PointerLockOptions;
}
/**
 * Reactive pointer lock.
 *
 * @see https://vueuse.org/usePointerLock
 * @param target
 * @param options
 */
declare function usePointerLock(target?: MaybeElementRef<MaybeHTMLElement>, options?: UsePointerLockOptions): {
    isSupported: vue_demi.Ref<boolean>;
    element: vue_demi.Ref<MaybeHTMLElement>;
    triggerElement: vue_demi.Ref<MaybeHTMLElement>;
    lock: (e: MaybeElementRef<MaybeHTMLElement> | Event, options?: PointerLockOptions) => Promise<HTMLElement>;
    unlock: () => Promise<boolean>;
};
type UsePointerLockReturn = ReturnType<typeof usePointerLock>;

declare enum SwipeDirection {
    UP = "UP",
    RIGHT = "RIGHT",
    DOWN = "DOWN",
    LEFT = "LEFT",
    NONE = "NONE"
}
interface UseSwipeOptions extends ConfigurableWindow {
    /**
     * Register events as passive
     *
     * @default true
     */
    passive?: boolean;
    /**
     * @default 50
     */
    threshold?: number;
    /**
     * Callback on swipe start
     */
    onSwipeStart?: (e: TouchEvent) => void;
    /**
     * Callback on swipe moves
     */
    onSwipe?: (e: TouchEvent) => void;
    /**
     * Callback on swipe ends
     */
    onSwipeEnd?: (e: TouchEvent, direction: SwipeDirection) => void;
}
interface UseSwipeReturn {
    isPassiveEventSupported: boolean;
    isSwiping: Ref<boolean>;
    direction: ComputedRef<SwipeDirection | null>;
    coordsStart: Readonly<Position>;
    coordsEnd: Readonly<Position>;
    lengthX: ComputedRef<number>;
    lengthY: ComputedRef<number>;
    stop: () => void;
}
/**
 * Reactive swipe detection.
 *
 * @see https://vueuse.org/useSwipe
 * @param target
 * @param options
 */
declare function useSwipe(target: MaybeComputedRef<EventTarget | null | undefined>, options?: UseSwipeOptions): UseSwipeReturn;

interface UsePointerSwipeOptions {
    /**
     * @default 50
     */
    threshold?: number;
    /**
     * Callback on swipe start.
     */
    onSwipeStart?: (e: PointerEvent) => void;
    /**
     * Callback on swipe move.
     */
    onSwipe?: (e: PointerEvent) => void;
    /**
     * Callback on swipe end.
     */
    onSwipeEnd?: (e: PointerEvent, direction: SwipeDirection) => void;
    /**
     * Pointer types to listen to.
     *
     * @default ['mouse', 'touch', 'pen']
     */
    pointerTypes?: PointerType[];
}
interface UsePointerSwipeReturn {
    readonly isSwiping: Ref<boolean>;
    direction: Readonly<Ref<SwipeDirection | null>>;
    readonly posStart: Position;
    readonly posEnd: Position;
    distanceX: Readonly<Ref<number>>;
    distanceY: Readonly<Ref<number>>;
    stop: () => void;
}
/**
 * Reactive swipe detection based on PointerEvents.
 *
 * @see https://vueuse.org/usePointerSwipe
 * @param target
 * @param options
 */
declare function usePointerSwipe(target: MaybeComputedRef<HTMLElement | null | undefined>, options?: UsePointerSwipeOptions): UsePointerSwipeReturn;

type ColorSchemeType = 'dark' | 'light' | 'no-preference';
/**
 * Reactive prefers-color-scheme media query.
 *
 * @see https://vueuse.org/usePreferredColorScheme
 * @param [options]
 */
declare function usePreferredColorScheme(options?: ConfigurableWindow): vue_demi.ComputedRef<ColorSchemeType>;

type ContrastType = 'more' | 'less' | 'custom' | 'no-preference';
/**
 * Reactive prefers-contrast media query.
 *
 * @see https://vueuse.org/usePreferredContrast
 * @param [options]
 */
declare function usePreferredContrast(options?: ConfigurableWindow): vue_demi.ComputedRef<ContrastType>;

/**
 * Reactive dark theme preference.
 *
 * @see https://vueuse.org/usePreferredDark
 * @param [options]
 */
declare function usePreferredDark(options?: ConfigurableWindow): vue.Ref<boolean>;

/**
 * Reactive Navigator Languages.
 *
 * @see https://vueuse.org/usePreferredLanguages
 * @param options
 */
declare function usePreferredLanguages(options?: ConfigurableWindow): Ref<readonly string[]>;

type ReducedMotionType = 'reduce' | 'no-preference';
/**
 * Reactive prefers-reduced-motion media query.
 *
 * @see https://vueuse.org/usePreferredReducedMotion
 * @param [options]
 */
declare function usePreferredReducedMotion(options?: ConfigurableWindow): vue_demi.ComputedRef<ReducedMotionType>;

/**
 * Holds the previous value of a ref.
 *
 * @see   {@link https://vueuse.org/usePrevious}
 */
declare function usePrevious<T>(value: MaybeComputedRef<T>): Readonly<Ref<T | undefined>>;
declare function usePrevious<T>(value: MaybeComputedRef<T>, initialValue: T): Readonly<Ref<T>>;

interface UseRafFnCallbackArguments {
    /**
     * Time elapsed between this and the last frame.
     */
    delta: number;
    /**
     * Time elapsed since the creation of the web page. See {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp#the_time_origin Time origin}.
     */
    timestamp: DOMHighResTimeStamp;
}
interface UseRafFnOptions extends ConfigurableWindow {
    /**
     * Start the requestAnimationFrame loop immediately on creation
     *
     * @default true
     */
    immediate?: boolean;
}
/**
 * Call function on every `requestAnimationFrame`. With controls of pausing and resuming.
 *
 * @see https://vueuse.org/useRafFn
 * @param fn
 * @param options
 */
declare function useRafFn(fn: (args: UseRafFnCallbackArguments) => void, options?: UseRafFnOptions): Pausable;

/**
 * Reactive screen orientation
 *
 * @see https://vueuse.org/useScreenOrientation
 */
declare const useScreenOrientation: (options?: ConfigurableWindow) => {
    isSupported: vue_demi.Ref<boolean>;
    orientation: vue_demi.Ref<OrientationType | undefined>;
    angle: vue_demi.Ref<number>;
    lockOrientation: (type: OrientationLockType) => Promise<void>;
    unlockOrientation: () => void;
};
type UseScreenOrientationReturn = ReturnType<typeof useScreenOrientation>;

/**
 * Reactive `env(safe-area-inset-*)`
 *
 * @see https://vueuse.org/useScreenSafeArea
 */
declare function useScreenSafeArea(): {
    top: vue_demi.Ref<string>;
    right: vue_demi.Ref<string>;
    bottom: vue_demi.Ref<string>;
    left: vue_demi.Ref<string>;
    update: () => void;
};

interface UseScriptTagOptions extends ConfigurableDocument {
    /**
     * Load the script immediately
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Add `async` attribute to the script tag
     *
     * @default true
     */
    async?: boolean;
    /**
     * Script type
     *
     * @default 'text/javascript'
     */
    type?: string;
    /**
     * Manual controls the timing of loading and unloading
     *
     * @default false
     */
    manual?: boolean;
    crossOrigin?: 'anonymous' | 'use-credentials';
    referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
    noModule?: boolean;
    defer?: boolean;
    /**
     * Add custom attribute to the script tag
     *
     */
    attrs?: Record<string, string>;
}
/**
 * Async script tag loading.
 *
 * @see https://vueuse.org/useScriptTag
 * @param src
 * @param onLoaded
 * @param options
 */
declare function useScriptTag(src: MaybeComputedRef<string>, onLoaded?: (el: HTMLScriptElement) => void, options?: UseScriptTagOptions): {
    scriptTag: vue_demi.Ref<HTMLScriptElement | null>;
    load: (waitForScriptLoad?: boolean) => Promise<HTMLScriptElement | boolean>;
    unload: () => void;
};
type UseScriptTagReturn = ReturnType<typeof useScriptTag>;

/**
 * Lock scrolling of the element.
 *
 * @see https://vueuse.org/useScrollLock
 * @param element
 */
declare function useScrollLock(element: MaybeComputedRef<HTMLElement | SVGElement | Window | Document | null | undefined>, initialState?: boolean): vue_demi.WritableComputedRef<boolean>;

declare function useSessionStorage(key: string, initialValue: MaybeComputedRef<string>, options?: UseStorageOptions<string>): RemovableRef<string>;
declare function useSessionStorage(key: string, initialValue: MaybeComputedRef<boolean>, options?: UseStorageOptions<boolean>): RemovableRef<boolean>;
declare function useSessionStorage(key: string, initialValue: MaybeComputedRef<number>, options?: UseStorageOptions<number>): RemovableRef<number>;
declare function useSessionStorage<T>(key: string, initialValue: MaybeComputedRef<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
declare function useSessionStorage<T = unknown>(key: string, initialValue: MaybeComputedRef<null>, options?: UseStorageOptions<T>): RemovableRef<T>;

interface UseShareOptions {
    title?: string;
    files?: File[];
    text?: string;
    url?: string;
}
/**
 * Reactive Web Share API.
 *
 * @see https://vueuse.org/useShare
 * @param shareOptions
 * @param options
 */
declare function useShare(shareOptions?: MaybeComputedRef<UseShareOptions>, options?: ConfigurableNavigator): {
    isSupported: vue.Ref<boolean>;
    share: (overrideOptions?: MaybeComputedRef<UseShareOptions>) => Promise<void>;
};
type UseShareReturn = ReturnType<typeof useShare>;

type UseSortedCompareFn<T = any> = (a: T, b: T) => number;
type UseSortedFn<T = any> = (arr: T[], compareFn: UseSortedCompareFn<T>) => T[];
interface UseSortedOptions<T = any> {
    /**
     * sort algorithm
     */
    sortFn?: UseSortedFn<T>;
    /**
     * compare function
     */
    compareFn?: UseSortedCompareFn<T>;
    /**
     * change the value of the source array
     * @default false
     */
    dirty?: boolean;
}
declare function useSorted<T = any>(source: MaybeRef<T[]>, compareFn?: UseSortedCompareFn<T>): Ref<T[]>;
declare function useSorted<T = any>(source: MaybeRef<T[]>, options?: UseSortedOptions<T>): Ref<T[]>;
declare function useSorted<T = any>(source: MaybeRef<T[]>, compareFn?: UseSortedCompareFn<T>, options?: Omit<UseSortedOptions<T>, 'compareFn'>): Ref<T[]>;

type SpeechRecognitionErrorCode = 'aborted' | 'audio-capture' | 'bad-grammar' | 'language-not-supported' | 'network' | 'no-speech' | 'not-allowed' | 'service-not-allowed';
interface SpeechGrammar {
    src: string;
    weight: number;
}
interface SpeechGrammarList {
    readonly length: number;
    addFromString(string: string, weight?: number): void;
    addFromURI(src: string, weight?: number): void;
    item(index: number): SpeechGrammar;
    [index: number]: SpeechGrammar;
}
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: SpeechRecognitionErrorCode;
    readonly message: string;
}
interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionEventMap {
    'audioend': Event;
    'audiostart': Event;
    'end': Event;
    'error': SpeechRecognitionErrorEvent;
    'nomatch': SpeechRecognitionEvent;
    'result': SpeechRecognitionEvent;
    'soundend': Event;
    'soundstart': Event;
    'speechend': Event;
    'speechstart': Event;
    'start': Event;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: SpeechGrammarList;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    abort(): void;
    start(): void;
    stop(): void;
    addEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

interface UseSpeechRecognitionOptions extends ConfigurableWindow {
    /**
     * Controls whether continuous results are returned for each recognition, or only a single result.
     *
     * @default true
     */
    continuous?: boolean;
    /**
     * Controls whether interim results should be returned (true) or not (false.) Interim results are results that are not yet final
     *
     * @default true
     */
    interimResults?: boolean;
    /**
     * Language for SpeechRecognition
     *
     * @default 'en-US'
     */
    lang?: MaybeComputedRef<string>;
}
/**
 * Reactive SpeechRecognition.
 *
 * @see https://vueuse.org/useSpeechRecognition
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition SpeechRecognition
 * @param options
 */
declare function useSpeechRecognition(options?: UseSpeechRecognitionOptions): {
    isSupported: Ref<boolean>;
    isListening: Ref<boolean>;
    isFinal: Ref<boolean>;
    recognition: SpeechRecognition | undefined;
    result: Ref<string>;
    error: Ref<SpeechRecognitionErrorEvent | undefined>;
    toggle: (value?: boolean) => void;
    start: () => void;
    stop: () => void;
};
type UseSpeechRecognitionReturn = ReturnType<typeof useSpeechRecognition>;

type UseSpeechSynthesisStatus = 'init' | 'play' | 'pause' | 'end';
interface UseSpeechSynthesisOptions extends ConfigurableWindow {
    /**
     * Language for SpeechSynthesis
     *
     * @default 'en-US'
     */
    lang?: MaybeComputedRef<string>;
    /**
     * Gets and sets the pitch at which the utterance will be spoken at.
     *
     * @default 1
     */
    pitch?: SpeechSynthesisUtterance['pitch'];
    /**
     * Gets and sets the speed at which the utterance will be spoken at.
     *
     * @default 1
     */
    rate?: SpeechSynthesisUtterance['rate'];
    /**
     * Gets and sets the voice that will be used to speak the utterance.
     */
    voice?: MaybeRef<SpeechSynthesisVoice>;
    /**
     * Gets and sets the volume that the utterance will be spoken at.
     *
     * @default 1
     */
    volume?: SpeechSynthesisUtterance['volume'];
}
/**
 * Reactive SpeechSynthesis.
 *
 * @see https://vueuse.org/useSpeechSynthesis
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis SpeechSynthesis
 * @param options
 */
declare function useSpeechSynthesis(text: MaybeComputedRef<string>, options?: UseSpeechSynthesisOptions): {
    isSupported: Ref<boolean>;
    isPlaying: Ref<boolean>;
    status: Ref<UseSpeechSynthesisStatus>;
    utterance: vue_demi.ComputedRef<SpeechSynthesisUtterance>;
    error: Ref<SpeechSynthesisErrorEvent | undefined>;
    stop: () => void;
    toggle: (value?: boolean) => void;
    speak: () => void;
};
type UseSpeechSynthesisReturn = ReturnType<typeof useSpeechSynthesis>;

interface UseStepperReturn<StepName, Steps, Step> {
    /** List of steps. */
    steps: Readonly<Ref<Steps>>;
    /** List of step names. */
    stepNames: Readonly<Ref<StepName[]>>;
    /** Index of the current step. */
    index: Ref<number>;
    /** Current step. */
    current: ComputedRef<Step>;
    /** Next step, or undefined if the current step is the last one. */
    next: ComputedRef<StepName | undefined>;
    /** Previous step, or undefined if the current step is the first one. */
    previous: ComputedRef<StepName | undefined>;
    /** Whether the current step is the first one. */
    isFirst: ComputedRef<boolean>;
    /** Whether the current step is the last one. */
    isLast: ComputedRef<boolean>;
    /** Get the step at the specified index. */
    at: (index: number) => Step | undefined;
    /** Get a step by the specified name. */
    get: (step: StepName) => Step | undefined;
    /** Go to the specified step. */
    goTo: (step: StepName) => void;
    /** Go to the next step. Does nothing if the current step is the last one. */
    goToNext: () => void;
    /** Go to the previous step. Does nothing if the current step is the previous one. */
    goToPrevious: () => void;
    /** Go back to the given step, only if the current step is after. */
    goBackTo: (step: StepName) => void;
    /** Checks whether the given step is the next step. */
    isNext: (step: StepName) => boolean;
    /** Checks whether the given step is the previous step. */
    isPrevious: (step: StepName) => boolean;
    /** Checks whether the given step is the current step. */
    isCurrent: (step: StepName) => boolean;
    /** Checks if the current step is before the given step. */
    isBefore: (step: StepName) => boolean;
    /** Checks if the current step is after the given step. */
    isAfter: (step: StepName) => boolean;
}
declare function useStepper<T extends string | number>(steps: MaybeRef<T[]>, initialStep?: T): UseStepperReturn<T, T[], T>;
declare function useStepper<T extends Record<string, any>>(steps: MaybeRef<T>, initialStep?: keyof T): UseStepperReturn<Exclude<keyof T, symbol>, T, T[keyof T]>;

interface UseStorageAsyncOptions<T> extends Omit<UseStorageOptions<T>, 'serializer'> {
    /**
     * Custom data serialization
     */
    serializer?: SerializerAsync<T>;
}
declare function useStorageAsync(key: string, initialValue: MaybeComputedRef<string>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<string>): RemovableRef<string>;
declare function useStorageAsync(key: string, initialValue: MaybeComputedRef<boolean>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<boolean>): RemovableRef<boolean>;
declare function useStorageAsync(key: string, initialValue: MaybeComputedRef<number>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<number>): RemovableRef<number>;
declare function useStorageAsync<T>(key: string, initialValue: MaybeComputedRef<T>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<T>): RemovableRef<T>;
declare function useStorageAsync<T = unknown>(key: string, initialValue: MaybeComputedRef<null>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<T>): RemovableRef<T>;

interface UseStyleTagOptions extends ConfigurableDocument {
    /**
     * Media query for styles to apply
     */
    media?: string;
    /**
     * Load the style immediately
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Manual controls the timing of loading and unloading
     *
     * @default false
     */
    manual?: boolean;
    /**
     * DOM id of the style tag
     *
     * @default auto-incremented
     */
    id?: string;
}
interface UseStyleTagReturn {
    id: string;
    css: Ref<string>;
    load: () => void;
    unload: () => void;
    isLoaded: Readonly<Ref<boolean>>;
}
/**
 * Inject <style> element in head.
 *
 * Overload: Omitted id
 *
 * @see https://vueuse.org/useStyleTag
 * @param css
 * @param options
 */
declare function useStyleTag(css: MaybeRef<string>, options?: UseStyleTagOptions): UseStyleTagReturn;

declare function useSupported(callback: () => unknown, sync?: boolean): Ref<boolean>;

type TemplateRefsList<T> = T[] & {
    set(el: Object | null): void;
};
declare function useTemplateRefsList<T = Element>(): Readonly<Ref<Readonly<TemplateRefsList<T>>>>;

type UseTextDirectionValue = 'ltr' | 'rtl' | 'auto';
interface UseTextDirectionOptions extends ConfigurableDocument {
    /**
     * CSS Selector for the target element applying to
     *
     * @default 'html'
     */
    selector?: string;
    /**
     * Observe `document.querySelector(selector)` changes using MutationObserve
     *
     * @default false
     */
    observe?: boolean;
    /**
     * Initial value
     *
     * @default 'ltr'
     */
    initialValue?: UseTextDirectionValue;
}
/**
 * Reactive dir of the element's text.
 *
 * @see https://vueuse.org/useTextDirection
 */
declare function useTextDirection(options?: UseTextDirectionOptions): vue_demi.WritableComputedRef<UseTextDirectionValue>;

/**
 * Reactively track user text selection based on [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection).
 *
 * @see https://vueuse.org/useTextSelection
 */
declare function useTextSelection(options?: ConfigurableWindow): {
    text: vue_demi.ComputedRef<string>;
    rects: vue_demi.ComputedRef<DOMRect[]>;
    ranges: vue_demi.ComputedRef<Range[]>;
    selection: vue_demi.Ref<{
        readonly anchorNode: Node | null;
        readonly anchorOffset: number;
        readonly focusNode: Node | null;
        readonly focusOffset: number;
        readonly isCollapsed: boolean;
        readonly rangeCount: number;
        readonly type: string;
        addRange: (range: Range) => void;
        collapse: (node: Node | null, offset?: number | undefined) => void;
        collapseToEnd: () => void;
        collapseToStart: () => void;
        containsNode: (node: Node, allowPartialContainment?: boolean | undefined) => boolean;
        deleteFromDocument: () => void;
        empty: () => void;
        extend: (node: Node, offset?: number | undefined) => void;
        getRangeAt: (index: number) => Range;
        modify: (alter?: string | undefined, direction?: string | undefined, granularity?: string | undefined) => void;
        removeAllRanges: () => void;
        removeRange: (range: Range) => void;
        selectAllChildren: (node: Node) => void;
        setBaseAndExtent: (anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number) => void;
        setPosition: (node: Node | null, offset?: number | undefined) => void;
        toString: () => string;
    } | null>;
};
type UseTextSelectionReturn = ReturnType<typeof useTextSelection>;

interface UseTextareaAutosizeOptions {
    /** Textarea element to autosize. */
    element?: MaybeRef<HTMLTextAreaElement | undefined>;
    /** Textarea content. */
    input?: MaybeRef<string | undefined>;
    /** Watch sources that should trigger a textarea resize. */
    watch?: WatchSource | Array<WatchSource>;
    /** Function called when the textarea size changes. */
    onResize?: () => void;
}
declare function useTextareaAutosize(options?: UseTextareaAutosizeOptions): {
    textarea: vue_demi.Ref<HTMLTextAreaElement>;
    input: vue_demi.Ref<string>;
    triggerResize: () => void;
};
type UseTextareaAutosizeReturn = ReturnType<typeof useTextareaAutosize>;

type UseThrottledRefHistoryOptions<Raw, Serialized = Raw> = Omit<UseRefHistoryOptions<Raw, Serialized>, 'eventFilter'> & {
    throttle?: MaybeRef<number>;
    trailing?: boolean;
};
type UseThrottledRefHistoryReturn<Raw, Serialized = Raw> = UseRefHistoryReturn<Raw, Serialized>;
/**
 * Shorthand for [useRefHistory](https://vueuse.org/useRefHistory) with throttled filter.
 *
 * @see https://vueuse.org/useThrottledRefHistory
 * @param source
 * @param options
 */
declare function useThrottledRefHistory<Raw, Serialized = Raw>(source: Ref<Raw>, options?: UseThrottledRefHistoryOptions<Raw, Serialized>): UseThrottledRefHistoryReturn<Raw, Serialized>;

type UseTimeAgoFormatter<T = number> = (value: T, isPast: boolean) => string;
type UseTimeAgoUnitNamesDefault = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
interface UseTimeAgoMessagesBuiltIn {
    justNow: string;
    past: string | UseTimeAgoFormatter<string>;
    future: string | UseTimeAgoFormatter<string>;
    invalid: string;
}
type UseTimeAgoMessages<UnitNames extends string = UseTimeAgoUnitNamesDefault> = UseTimeAgoMessagesBuiltIn & Record<UnitNames, string | UseTimeAgoFormatter<number>>;
interface FormatTimeAgoOptions<UnitNames extends string = UseTimeAgoUnitNamesDefault> {
    /**
     * Maximum unit (of diff in milliseconds) to display the full date instead of relative
     *
     * @default undefined
     */
    max?: UnitNames | number;
    /**
     * Formatter for full date
     */
    fullDateFormatter?: (date: Date) => string;
    /**
     * Messages for formatting the string
     */
    messages?: UseTimeAgoMessages<UnitNames>;
    /**
     * Minimum display time unit (default is minute)
     *
     * @default false
     */
    showSecond?: boolean;
    /**
     * Rounding method to apply.
     *
     * @default 'round'
     */
    rounding?: 'round' | 'ceil' | 'floor' | number;
    /**
     * Custom units
     */
    units?: UseTimeAgoUnit<UseTimeAgoUnitNamesDefault>[];
}
interface UseTimeAgoOptions<Controls extends boolean, UnitNames extends string = UseTimeAgoUnitNamesDefault> extends FormatTimeAgoOptions<UnitNames> {
    /**
     * Expose more controls
     *
     * @default false
     */
    controls?: Controls;
    /**
     * Intervals to update, set 0 to disable auto update
     *
     * @default 30_000
     */
    updateInterval?: number;
}
interface UseTimeAgoUnit<Unit extends string = UseTimeAgoUnitNamesDefault> {
    max: number;
    value: number;
    name: Unit;
}
type UseTimeAgoReturn<Controls extends boolean = false> = Controls extends true ? {
    timeAgo: ComputedRef<string>;
} & Pausable : ComputedRef<string>;
/**
 * Reactive time ago formatter.
 *
 * @see https://vueuse.org/useTimeAgo
 * @param options
 */
declare function useTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(time: MaybeComputedRef<Date | number | string>, options?: UseTimeAgoOptions<false, UnitNames>): UseTimeAgoReturn<false>;
declare function useTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(time: MaybeComputedRef<Date | number | string>, options: UseTimeAgoOptions<true, UnitNames>): UseTimeAgoReturn<true>;
declare function formatTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(from: Date, options?: FormatTimeAgoOptions<UnitNames>, now?: Date | number): string;

declare function useTimeoutPoll(fn: () => Awaitable<void>, interval: MaybeComputedRef<number>, timeoutPollOptions?: UseTimeoutFnOptions): Pausable;

interface UseTimestampOptions<Controls extends boolean> {
    /**
     * Expose more controls
     *
     * @default false
     */
    controls?: Controls;
    /**
     * Offset value adding to the value
     *
     * @default 0
     */
    offset?: number;
    /**
     * Update the timestamp immediately
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Update interval, or use requestAnimationFrame
     *
     * @default requestAnimationFrame
     */
    interval?: 'requestAnimationFrame' | number;
    /**
     * Callback on each update
     */
    callback?: (timestamp: number) => void;
}
/**
 * Reactive current timestamp.
 *
 * @see https://vueuse.org/useTimestamp
 * @param options
 */
declare function useTimestamp(options?: UseTimestampOptions<false>): Ref<number>;
declare function useTimestamp(options: UseTimestampOptions<true>): {
    timestamp: Ref<number>;
} & Pausable;
type UseTimestampReturn = ReturnType<typeof useTimestamp>;

type UseTitleOptionsBase = {
    /**
     * Observe `document.title` changes using MutationObserve
     * Cannot be used together with `titleTemplate` option.
     *
     * @default false
     */
    observe?: boolean;
} | {
    /**
     * The template string to parse the title (e.g., '%s | My Website')
     * Cannot be used together with `observe` option.
     *
     * @default '%s'
     */
    titleTemplate?: MaybeRef<string> | ((title: string) => string);
};
type UseTitleOptions = ConfigurableDocument & UseTitleOptionsBase;
declare function useTitle(newTitle: MaybeReadonlyRef<string | null | undefined>, options?: UseTitleOptions): ComputedRef<string | null | undefined>;
declare function useTitle(newTitle?: MaybeRef<string | null | undefined>, options?: UseTitleOptions): Ref<string | null | undefined>;
type UseTitleReturn = ReturnType<typeof useTitle>;

/**
 * Cubic bezier points
 */
type CubicBezierPoints = [number, number, number, number];
/**
 * Easing function
 */
type EasingFunction = (n: number) => number;
/**
 * Transition options
 */
interface UseTransitionOptions {
    /**
     * Milliseconds to wait before starting transition
     */
    delay?: MaybeRef<number>;
    /**
     * Disables the transition
     */
    disabled?: MaybeRef<boolean>;
    /**
     * Transition duration in milliseconds
     */
    duration?: MaybeRef<number>;
    /**
     * Callback to execute after transition finishes
     */
    onFinished?: () => void;
    /**
     * Callback to execute after transition starts
     */
    onStarted?: () => void;
    /**
     * Easing function or cubic bezier points for calculating transition values
     */
    transition?: MaybeRef<EasingFunction | CubicBezierPoints>;
}
/**
 * Common transitions
 *
 * @see https://easings.net
 */
declare const TransitionPresets: Record<"easeInSine" | "easeOutSine" | "easeInOutSine" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeInCubic" | "easeOutCubic" | "easeInOutCubic" | "easeInQuart" | "easeOutQuart" | "easeInOutQuart" | "easeInQuint" | "easeOutQuint" | "easeInOutQuint" | "easeInExpo" | "easeOutExpo" | "easeInOutExpo" | "easeInCirc" | "easeOutCirc" | "easeInOutCirc" | "easeInBack" | "easeOutBack" | "easeInOutBack", CubicBezierPoints> & {
    linear: EasingFunction;
};
declare function useTransition(source: Ref<number>, options?: UseTransitionOptions): ComputedRef<number>;
declare function useTransition<T extends MaybeRef<number>[]>(source: [...T], options?: UseTransitionOptions): ComputedRef<{
    [K in keyof T]: number;
}>;
declare function useTransition<T extends Ref<number[]>>(source: T, options?: UseTransitionOptions): ComputedRef<number[]>;

type UrlParams = Record<string, string[] | string>;
interface UseUrlSearchParamsOptions<T> extends ConfigurableWindow {
    /**
     * @default true
     */
    removeNullishValues?: boolean;
    /**
     * @default false
     */
    removeFalsyValues?: boolean;
    /**
     * @default {}
     */
    initialValue?: T;
    /**
     * Write back to `window.history` automatically
     *
     * @default true
     */
    write?: boolean;
}
/**
 * Reactive URLSearchParams
 *
 * @see https://vueuse.org/useUrlSearchParams
 * @param mode
 * @param options
 */
declare function useUrlSearchParams<T extends Record<string, any> = UrlParams>(mode?: 'history' | 'hash' | 'hash-params', options?: UseUrlSearchParamsOptions<T>): T;

interface UseUserMediaOptions extends ConfigurableNavigator {
    /**
     * If the stream is enabled
     * @default false
     */
    enabled?: MaybeRef<boolean>;
    /**
     * Recreate stream when the input devices id changed
     *
     * @default true
     */
    autoSwitch?: MaybeRef<boolean>;
    /**
     * The device id of video input
     *
     * When passing with `undefined` the default device will be used.
     * Pass `false` or "none" to disabled video input
     *
     * @default undefined
     */
    videoDeviceId?: MaybeRef<string | undefined | false | 'none'>;
    /**
     * The device id of audi input
     *
     * When passing with `undefined` the default device will be used.
     * Pass `false` or "none" to disabled audi input
     *
     * @default undefined
     */
    audioDeviceId?: MaybeRef<string | undefined | false | 'none'>;
}
/**
 * Reactive `mediaDevices.getUserMedia` streaming
 *
 * @see https://vueuse.org/useUserMedia
 * @param options
 */
declare function useUserMedia(options?: UseUserMediaOptions): {
    isSupported: Ref<boolean>;
    stream: Ref<MediaStream | undefined>;
    start: () => Promise<MediaStream | undefined>;
    stop: () => void;
    restart: () => Promise<MediaStream | undefined>;
    videoDeviceId: Ref<string | false | undefined>;
    audioDeviceId: Ref<string | false | undefined>;
    enabled: Ref<boolean>;
    autoSwitch: Ref<boolean>;
};
type UseUserMediaReturn = ReturnType<typeof useUserMedia>;

interface UseVModelOptions<T> {
    /**
     * When passive is set to `true`, it will use `watch` to sync with props and ref.
     * Instead of relying on the `v-model` or `.sync` to work.
     *
     * @default false
     */
    passive?: boolean;
    /**
     * When eventName is set, it's value will be used to overwrite the emit event name.
     *
     * @default undefined
     */
    eventName?: string;
    /**
     * Attempting to check for changes of properties in a deeply nested object or array.
     * Apply only when `passive` option is set to `true`
     *
     * @default false
     */
    deep?: boolean;
    /**
     * Defining default value for return ref when no value is passed.
     *
     * @default undefined
     */
    defaultValue?: T;
    /**
     * Clone the props.
     * Accepts a custom clone function.
     * When setting to `true`, it will use `JSON.parse(JSON.stringify(value))` to clone.
     *
     * @default false
     */
    clone?: boolean | CloneFn<T>;
}
/**
 * Shorthand for v-model binding, props + emit -> ref
 *
 * @see https://vueuse.org/useVModel
 * @param props
 * @param key (default 'value' in Vue 2 and 'modelValue' in Vue 3)
 * @param emit
 */
declare function useVModel<P extends object, K extends keyof P, Name extends string>(props: P, key?: K, emit?: (name: Name, ...args: any[]) => void, options?: UseVModelOptions<P[K]>): vue_demi.Ref<UnwrapRef<P[K]>> | vue_demi.WritableComputedRef<P[K]>;

/**
 * Shorthand for props v-model binding. Think like `toRefs(props)` but changes will also emit out.
 *
 * @see https://vueuse.org/useVModels
 * @param props
 * @param emit
 */
declare function useVModels<P extends object, Name extends string>(props: P, emit?: (name: Name, ...args: any[]) => void, options?: UseVModelOptions<any>): ToRefs<P>;

interface UseVibrateOptions extends ConfigurableNavigator {
    /**
     *
     * Vibration Pattern
     *
     * An array of values describes alternating periods in which the
     * device is vibrating and not vibrating. Each value in the array
     * is converted to an integer, then interpreted alternately as
     * the number of milliseconds the device should vibrate and the
     * number of milliseconds it should not be vibrating
     *
     * @default []
     *
     */
    pattern?: MaybeComputedRef<number[] | number>;
    /**
     * Interval to run a persistent vibration, in ms
     *
     * Pass `0` to disable
     *
     * @default 0
     *
     */
    interval?: number;
}
/**
 * Reactive vibrate
 *
 * @see https://vueuse.org/useVibrate
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 * @param options
 */
declare function useVibrate(options?: UseVibrateOptions): {
    isSupported: vue.Ref<boolean>;
    pattern: MaybeComputedRef<number | number[]>;
    intervalControls: Pausable | undefined;
    vibrate: (pattern?: number | number[]) => void;
    stop: () => void;
};
type UseVibrateReturn = ReturnType<typeof useVibrate>;

type UseVirtualListItemSize = number | ((index: number) => number);
interface UseHorizontalVirtualListOptions extends UseVirtualListOptionsBase {
    /**
     * item width, accept a pixel value or a function that returns the height
     *
     * @default 0
     */
    itemWidth: UseVirtualListItemSize;
}
interface UseVerticalVirtualListOptions extends UseVirtualListOptionsBase {
    /**
     * item height, accept a pixel value or a function that returns the height
     *
     * @default 0
     */
    itemHeight: UseVirtualListItemSize;
}
interface UseVirtualListOptionsBase {
    /**
     * the extra buffer items outside of the view area
     *
     * @default 5
     */
    overscan?: number;
}
type UseVirtualListOptions = UseHorizontalVirtualListOptions | UseVerticalVirtualListOptions;
interface UseVirtualListItem<T> {
    data: T;
    index: number;
}
interface UseVirtualListReturn<T> {
    list: Ref<UseVirtualListItem<T>[]>;
    scrollTo: (index: number) => void;
    containerProps: {
        ref: Ref<HTMLElement | null>;
        onScroll: () => void;
        style: StyleValue;
    };
    wrapperProps: ComputedRef<{
        style: {
            width: string;
            height: string;
            marginTop: string;
        } | {
            width: string;
            height: string;
            marginLeft: string;
            display: string;
        };
    }>;
}
/**
 * Please consider using [`vue-virtual-scroller`](https://github.com/Akryum/vue-virtual-scroller) if you are looking for more features.
 */
declare function useVirtualList<T = any>(list: MaybeRef<T[]>, options: UseVirtualListOptions): UseVirtualListReturn<T>;

type WakeLockType = 'screen';
interface WakeLockSentinel extends EventTarget {
    type: WakeLockType;
    released: boolean;
    release: () => Promise<void>;
}
type UseWakeLockOptions = ConfigurableNavigator & ConfigurableDocument;
/**
 * Reactive Screen Wake Lock API.
 *
 * @see https://vueuse.org/useWakeLock
 * @param options
 */
declare const useWakeLock: (options?: UseWakeLockOptions) => {
    isSupported: vue_demi.Ref<boolean>;
    isActive: vue_demi.Ref<boolean>;
    request: (type: WakeLockType) => Promise<void>;
    release: () => Promise<void>;
};
type UseWakeLockReturn = ReturnType<typeof useWakeLock>;

interface WebNotificationOptions {
    /**
     * The title read-only property of the Notification interface indicates
     * the title of the notification
     *
     * @default ''
     */
    title?: string;
    /**
     * The body string of the notification as specified in the constructor's
     * options parameter.
     *
     * @default ''
     */
    body?: string;
    /**
     * The text direction of the notification as specified in the constructor's
     * options parameter.
     *
     * @default ''
     */
    dir?: 'auto' | 'ltr' | 'rtl';
    /**
     * The language code of the notification as specified in the constructor's
     * options parameter.
     *
     * @default DOMString
     */
    lang?: string;
    /**
     * The ID of the notification(if any) as specified in the constructor's options
     * parameter.
     *
     * @default ''
     */
    tag?: string;
    /**
     * The URL of the image used as an icon of the notification as specified
     * in the constructor's options parameter.
     *
     * @default ''
     */
    icon?: string;
    /**
     * Specifies whether the user should be notified after a new notification
     * replaces an old one.
     *
     * @default false
     */
    renotify?: boolean;
    /**
     * A boolean value indicating that a notification should remain active until the
     * user clicks or dismisses it, rather than closing automatically.
     *
     * @default false
     */
    requireInteraction?: boolean;
    /**
     * The silent read-only property of the Notification interface specifies
     * whether the notification should be silent, i.e., no sounds or vibrations
     * should be issued, regardless of the device settings.
     *
     * @default false
     */
    silent?: boolean;
    /**
     * Specifies a vibration pattern for devices with vibration hardware to emit.
     * A vibration pattern, as specified in the Vibration API spec
     *
     * @see https://w3c.github.io/vibration/
     */
    vibrate?: number[];
}
interface UseWebNotificationOptions extends WebNotificationOptions, ConfigurableWindow {
}
/**
 * Reactive useWebNotification
 *
 * @see https://vueuse.org/useWebNotification
 * @see https://developer.mozilla.org/en-US/docs/Web/API/notification
 * @param title
 * @param defaultOptions of type WebNotificationOptions
 * @param methods of type WebNotificationMethods
 */
declare const useWebNotification: (defaultOptions?: UseWebNotificationOptions) => {
    isSupported: Ref<boolean>;
    notification: Ref<Notification | null>;
    show: (overrides?: WebNotificationOptions) => Promise<Notification | undefined>;
    close: () => void;
    onClick: EventHook<any>;
    onShow: EventHook<any>;
    onError: EventHook<any>;
    onClose: EventHook<any>;
};
type UseWebNotificationReturn = ReturnType<typeof useWebNotification>;

type WebSocketStatus = 'OPEN' | 'CONNECTING' | 'CLOSED';
interface UseWebSocketOptions {
    onConnected?: (ws: WebSocket) => void;
    onDisconnected?: (ws: WebSocket, event: CloseEvent) => void;
    onError?: (ws: WebSocket, event: Event) => void;
    onMessage?: (ws: WebSocket, event: MessageEvent) => void;
    /**
     * Send heartbeat for every x milliseconds passed
     *
     * @default false
     */
    heartbeat?: boolean | {
        /**
         * Message for the heartbeat
         *
         * @default 'ping'
         */
        message?: string | ArrayBuffer | Blob;
        /**
         * Interval, in milliseconds
         *
         * @default 1000
         */
        interval?: number;
        /**
         * Heartbeat response timeout, in milliseconds
         *
         * @default 1000
         */
        pongTimeout?: number;
    };
    /**
     * Enabled auto reconnect
     *
     * @default false
     */
    autoReconnect?: boolean | {
        /**
         * Maximum retry times.
         *
         * Or you can pass a predicate function (which returns true if you want to retry).
         *
         * @default -1
         */
        retries?: number | (() => boolean);
        /**
         * Delay for reconnect, in milliseconds
         *
         * @default 1000
         */
        delay?: number;
        /**
         * On maximum retry times reached.
         */
        onFailed?: Fn;
    };
    /**
     * Automatically open a connection
     *
     * @default true
     */
    immediate?: boolean;
    /**
     * Automatically close a connection
     *
     * @default true
     */
    autoClose?: boolean;
    /**
     * List of one or more sub-protocol strings
     *
     * @default []
     */
    protocols?: string[];
}
interface UseWebSocketReturn<T> {
    /**
     * Reference to the latest data received via the websocket,
     * can be watched to respond to incoming messages
     */
    data: Ref<T | null>;
    /**
     * The current websocket status, can be only one of:
     * 'OPEN', 'CONNECTING', 'CLOSED'
     */
    status: Ref<WebSocketStatus>;
    /**
     * Closes the websocket connection gracefully.
     */
    close: WebSocket['close'];
    /**
     * Reopen the websocket connection.
     * If there the current one is active, will close it before opening a new one.
     */
    open: Fn;
    /**
     * Sends data through the websocket connection.
     *
     * @param data
     * @param useBuffer when the socket is not yet open, store the data into the buffer and sent them one connected. Default to true.
     */
    send: (data: string | ArrayBuffer | Blob, useBuffer?: boolean) => boolean;
    /**
     * Reference to the WebSocket instance.
     */
    ws: Ref<WebSocket | undefined>;
}
/**
 * Reactive WebSocket client.
 *
 * @see https://vueuse.org/useWebSocket
 * @param url
 */
declare function useWebSocket<Data = any>(url: MaybeComputedRef<string | URL | undefined>, options?: UseWebSocketOptions): UseWebSocketReturn<Data>;

interface UseWebWorkerReturn<Data = any> {
    data: Ref<Data>;
    post: typeof Worker.prototype['postMessage'];
    terminate: () => void;
    worker: ShallowRef<Worker | undefined>;
}
type WorkerFn = (...args: unknown[]) => Worker;
/**
 * Simple Web Workers registration and communication.
 *
 * @see https://vueuse.org/useWebWorker
 * @param url
 * @param workerOptions
 * @param options
 */
declare function useWebWorker<T = any>(url: string, workerOptions?: WorkerOptions, options?: ConfigurableWindow): UseWebWorkerReturn<T>;
/**
 * Simple Web Workers registration and communication.
 *
 * @see https://vueuse.org/useWebWorker
 * @param worker
 */
declare function useWebWorker<T = any>(worker: Worker | WorkerFn): UseWebWorkerReturn<T>;

type WebWorkerStatus = 'PENDING' | 'SUCCESS' | 'RUNNING' | 'ERROR' | 'TIMEOUT_EXPIRED';
interface UseWebWorkerOptions extends ConfigurableWindow {
    /**
     * Number of milliseconds before killing the worker
     *
     * @default undefined
     */
    timeout?: number;
    /**
     * An array that contains the external dependencies needed to run the worker
     */
    dependencies?: string[];
}
/**
 * Run expensive function without blocking the UI, using a simple syntax that makes use of Promise.
 *
 * @see https://vueuse.org/useWebWorkerFn
 * @param fn
 * @param options
 */
declare const useWebWorkerFn: <T extends (...fnArgs: any[]) => any>(fn: T, options?: UseWebWorkerOptions) => {
    workerFn: (...fnArgs: Parameters<T>) => Promise<ReturnType<T>>;
    workerStatus: vue_demi.Ref<WebWorkerStatus>;
    workerTerminate: (status?: WebWorkerStatus) => void;
};
type UseWebWorkerFnReturn = ReturnType<typeof useWebWorkerFn>;

/**
 * Reactively track window focus with `window.onfocus` and `window.onblur`.
 *
 * @see https://vueuse.org/useWindowFocus
 * @param options
 */
declare function useWindowFocus({ window }?: ConfigurableWindow): Ref<boolean>;

/**
 * Reactive window scroll.
 *
 * @see https://vueuse.org/useWindowScroll
 * @param options
 */
declare function useWindowScroll({ window }?: ConfigurableWindow): {
    x: vue_demi.Ref<number>;
    y: vue_demi.Ref<number>;
};
type UseWindowScrollReturn = ReturnType<typeof useWindowScroll>;

interface UseWindowSizeOptions extends ConfigurableWindow {
    initialWidth?: number;
    initialHeight?: number;
    /**
     * Listen to window `orientationchange` event
     *
     * @default true
     */
    listenOrientation?: boolean;
    /**
     * Whether the scrollbar should be included in the width and height
     * @default true
     */
    includeScrollbar?: boolean;
}
/**
 * Reactive window size.
 *
 * @see https://vueuse.org/useWindowSize
 * @param options
 */
declare function useWindowSize(options?: UseWindowSizeOptions): {
    width: vue_demi.Ref<number>;
    height: vue_demi.Ref<number>;
};
type UseWindowSizeReturn = ReturnType<typeof useWindowSize>;

export { AfterFetchContext, AsyncComputedOnCancel, AsyncComputedOptions, BasicColorSchema, BatteryManager, BeforeFetchContext, Breakpoints, BrowserLocationState, CloneFn, ColorSchemeType, ComputedInjectGetter, ComputedInjectGetterWithDefault, ComputedInjectSetter, ConfigurableDocument, ConfigurableDocumentOrShadowRoot, ConfigurableLocation, ConfigurableNavigator, ConfigurableWindow, ContrastType, CreateFetchOptions, CubicBezierPoints, DefaultMagicKeysAliasMap, DeviceMotionOptions, DocumentEventName, EasingFunction, ElementSize, EventBusEvents, EventBusIdentifier, EventBusKey, EventBusListener, EyeDropper, EyeDropperOpenOptions, FileSystemAccessShowOpenFileOptions, FileSystemAccessShowSaveFileOptions, FileSystemAccessWindow, FileSystemFileHandle, FormatTimeAgoOptions, GeneralEventListener, GeneralPermissionDescriptor, KeyFilter, KeyModifier, KeyPredicate, KeyStrokeEventName, MagicKeysInternal, MaybeComputedElementRef, MaybeElement, MaybeElementRef, MemoryInfo, MouseInElementOptions, MousePressedOptions, MouseSourceType, NavigatorLanguageState, NetworkEffectiveType, NetworkState, NetworkType, OnClickOutsideHandler, OnClickOutsideOptions, OnFetchErrorContext, OnKeyStrokeOptions, OnLongPressModifiers, OnLongPressOptions, PointerType, Position, ReducedMotionType, RenderableComponent, ResizeObserverCallback, ResizeObserverEntry, ResizeObserverSize, SSRHandlersMap, Serializer, SerializerAsync, StorageEventLike, StorageLike, StorageLikeAsync, StorageSerializers, SwipeDirection, TemplateRefsList, ToDataURLOptions, TransitionPresets, UnRefElementReturn, UnrefFn, UrlParams, UseActiveElementOptions, UseAsyncQueueOptions, UseAsyncQueueResult, UseAsyncQueueReturn, UseAsyncQueueTask, UseAsyncStateOptions, UseAsyncStateReturn, UseBase64ObjectOptions, UseBase64Return, UseBatteryReturn, UseBluetoothOptions, UseBluetoothRequestDeviceOptions, UseBluetoothReturn, UseBreakpointsReturn, UseBroadcastChannelOptions, UseBroadcastChannelReturn, UseBrowserLocationReturn, UseClipboardOptions, UseClipboardReturn, UseClonedOptions, UseClonedReturn, UseColorModeOptions, UseConfirmDialogReturn, UseConfirmDialogRevealResult, UseCssVarOptions, UseCycleListOptions, UseCycleListReturn, UseDarkOptions, UseDeviceMotionReturn, UseDeviceOrientationReturn, UseDevicePixelRatioReturn, UseDevicesListOptions, UseDevicesListReturn, UseDisplayMediaOptions, UseDisplayMediaReturn, UseDraggableOptions, UseDraggableReturn, UseDropZoneReturn, UseElementBoundingOptions, UseElementBoundingReturn, UseElementByPointOptions, UseElementByPointReturn, UseElementHoverOptions, UseElementSizeReturn, UseElementVisibilityOptions, UseEventBusReturn, UseEventSourceOptions, UseEventSourceReturn, UseEyeDropperOptions, UseEyeDropperReturn, UseFaviconOptions, UseFaviconReturn, UseFetchOptions, UseFetchReturn, UseFileDialogOptions, UseFileDialogReturn, UseFileSystemAccessCommonOptions, UseFileSystemAccessOptions, UseFileSystemAccessReturn, UseFileSystemAccessShowSaveFileOptions, UseFocusOptions, UseFocusReturn, UseFocusWithinReturn, UseFpsOptions, UseFullscreenOptions, UseFullscreenReturn, UseGamepadOptions, UseGamepadReturn, UseGeolocationOptions, UseGeolocationReturn, UseHorizontalVirtualListOptions, UseIdleOptions, UseIdleReturn, UseImageOptions, UseImageReturn, UseInfiniteScrollOptions, UseIntersectionObserverOptions, UseIntersectionObserverReturn, UseKeyModifierReturn, UseMagicKeysOptions, UseMagicKeysReturn, UseManualRefHistoryOptions, UseManualRefHistoryReturn, UseMediaControlsReturn, UseMediaSource, UseMediaTextTrack, UseMediaTextTrackSource, UseMemoizeCache, UseMemoizeOptions, UseMemoizeReturn, UseMemoryOptions, UseMemoryReturn, UseModifierOptions, UseMouseInElementReturn, UseMouseOptions, UseMousePressedReturn, UseMouseReturn, UseMutationObserverOptions, UseMutationObserverReturn, UseNavigatorLanguageReturn, UseNetworkReturn, UseNowOptions, UseNowReturn, UseOffsetPaginationInfinityPageReturn, UseOffsetPaginationOptions, UseOffsetPaginationReturn, UseParallaxOptions, UseParallaxReturn, UsePermissionOptions, UsePermissionReturn, UsePermissionReturnWithControls, UsePointerLockOptions, UsePointerLockReturn, UsePointerOptions, UsePointerReturn, UsePointerState, UsePointerSwipeOptions, UsePointerSwipeReturn, UseRafFnCallbackArguments, UseRafFnOptions, UseRefHistoryOptions, UseRefHistoryRecord, UseRefHistoryReturn, UseResizeObserverOptions, UseResizeObserverReturn, UseScreenOrientationReturn, UseScriptTagOptions, UseScriptTagReturn, UseScrollOptions, UseScrollReturn, UseShareOptions, UseShareReturn, UseSortedCompareFn, UseSortedFn, UseSortedOptions, UseSpeechRecognitionOptions, UseSpeechRecognitionReturn, UseSpeechSynthesisOptions, UseSpeechSynthesisReturn, UseSpeechSynthesisStatus, UseStepperReturn, UseStorageAsyncOptions, UseStorageOptions, UseStyleTagOptions, UseStyleTagReturn, UseSwipeOptions, UseSwipeReturn, UseTextDirectionOptions, UseTextDirectionValue, UseTextSelectionReturn, UseTextareaAutosizeOptions, UseTextareaAutosizeReturn, UseThrottledRefHistoryOptions, UseThrottledRefHistoryReturn, UseTimeAgoFormatter, UseTimeAgoMessages, UseTimeAgoMessagesBuiltIn, UseTimeAgoOptions, UseTimeAgoReturn, UseTimeAgoUnit, UseTimeAgoUnitNamesDefault, UseTimestampOptions, UseTimestampReturn, UseTitleOptions, UseTitleOptionsBase, UseTitleReturn, UseTransitionOptions, UseUrlSearchParamsOptions, UseUserMediaOptions, UseUserMediaReturn, UseVModelOptions, UseVerticalVirtualListOptions, UseVibrateOptions, UseVibrateReturn, UseVirtualListItem, UseVirtualListOptions, UseVirtualListOptionsBase, UseVirtualListReturn, UseWakeLockOptions, UseWakeLockReturn, UseWebNotificationOptions, UseWebNotificationReturn, UseWebSocketOptions, UseWebSocketReturn, UseWebWorkerFnReturn, UseWebWorkerOptions, UseWebWorkerReturn, UseWindowScrollReturn, UseWindowSizeOptions, UseWindowSizeReturn, VueInstance, WakeLockSentinel, WebNotificationOptions, WebSocketStatus, WebWorkerStatus, WindowEventName, WritableComputedInjectOptions, WritableComputedInjectOptionsWithDefault, computedAsync as asyncComputed, breakpointsAntDesign, breakpointsBootstrapV5, breakpointsMasterCss, breakpointsQuasar, breakpointsSematic, breakpointsTailwind, breakpointsVuetify, cloneFnJSON, computedAsync, computedInject, createFetch, createUnrefFn, customStorageEventName, defaultDocument, defaultLocation, defaultNavigator, defaultWindow, formatTimeAgo, getSSRHandler, mapGamepadToXbox360Controller, onClickOutside, onKeyDown, onKeyPressed, onKeyStroke, onKeyUp, onLongPress, onStartTyping, setSSRHandler, templateRef, unrefElement, useActiveElement, useAsyncQueue, useAsyncState, useBase64, useBattery, useBluetooth, useBreakpoints, useBroadcastChannel, useBrowserLocation, useCached, useClipboard, useCloned, useColorMode, useConfirmDialog, useCssVar, useCurrentElement, useCycleList, useDark, useDebouncedRefHistory, useDeviceMotion, useDeviceOrientation, useDevicePixelRatio, useDevicesList, useDisplayMedia, useDocumentVisibility, useDraggable, useDropZone, useElementBounding, useElementByPoint, useElementHover, useElementSize, useElementVisibility, useEventBus, useEventListener, useEventSource, useEyeDropper, useFavicon, useFetch, useFileDialog, useFileSystemAccess, useFocus, useFocusWithin, useFps, useFullscreen, useGamepad, useGeolocation, useIdle, useImage, useInfiniteScroll, useIntersectionObserver, useKeyModifier, useLocalStorage, useMagicKeys, useManualRefHistory, useMediaControls, useMediaQuery, useMemoize, useMemory, useMounted, useMouse, useMouseInElement, useMousePressed, useMutationObserver, useNavigatorLanguage, useNetwork, useNow, useObjectUrl, useOffsetPagination, useOnline, usePageLeave, useParallax, usePermission, usePointer, usePointerLock, usePointerSwipe, usePreferredColorScheme, usePreferredContrast, usePreferredDark, usePreferredLanguages, usePreferredReducedMotion, usePrevious, useRafFn, useRefHistory, useResizeObserver, useScreenOrientation, useScreenSafeArea, useScriptTag, useScroll, useScrollLock, useSessionStorage, useShare, useSorted, useSpeechRecognition, useSpeechSynthesis, useStepper, useStorage, useStorageAsync, useStyleTag, useSupported, useSwipe, useTemplateRefsList, useTextDirection, useTextSelection, useTextareaAutosize, useThrottledRefHistory, useTimeAgo, useTimeoutPoll, useTimestamp, useTitle, useTransition, useUrlSearchParams, useUserMedia, useVModel, useVModels, useVibrate, useVirtualList, useWakeLock, useWebNotification, useWebSocket, useWebWorker, useWebWorkerFn, useWindowFocus, useWindowScroll, useWindowSize };
