import * as _vueuse_shared0 from "@vueuse/shared";
import { Arrayable, Awaitable, ConfigurableEventFilter, ConfigurableFlush, ConfigurableFlushSync, EventHookOn, Fn, IsAny, Pausable, ReadonlyRefOrGetter, RemovableRef, ShallowOrDeepRef, Stoppable, UseTimeoutFnOptions } from "@vueuse/shared";
import * as vue0 from "vue";
import { App, Component, ComponentObjectPropsOptions, ComponentPublicInstance, ComputedRef, DefineComponent, InjectionKey, MaybeRef, MaybeRefOrGetter, MultiWatchSources, Ref, ShallowRef, Slot, StyleValue, ToRefs, TransitionGroupProps, UnwrapNestedRefs, UnwrapRef, WatchOptions, WatchOptionsBase, WatchSource, WatchStopHandle, WritableComputedRef } from "vue";
export * from "@vueuse/shared";

//#region computedAsync/index.d.ts
/**
 * Handle overlapping async evaluations.
 *
 * @param cancelCallback The provided callback is invoked when a re-evaluation of the computed value is triggered before the previous one finished
 */
type AsyncComputedOnCancel = (cancelCallback: Fn) => void;
interface AsyncComputedOptions<Lazy = boolean> extends ConfigurableFlushSync {
  /**
   * Should value be evaluated lazily
   *
   * @default false
   */
  lazy?: Lazy;
  /**
   * Ref passed to receive the updated of async evaluation
   */
  evaluating?: Ref<boolean>;
  /**
   * Use shallowRef
   *
   * @default true
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
declare function computedAsync<T>(evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>, initialState: T, optionsOrRef: AsyncComputedOptions<true>): ComputedRef<T>;
declare function computedAsync<T>(evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>, initialState: undefined, optionsOrRef: AsyncComputedOptions<true>): ComputedRef<T | undefined>;
declare function computedAsync<T>(evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>, initialState: T, optionsOrRef?: Ref<boolean> | AsyncComputedOptions): Ref<T>;
declare function computedAsync<T>(evaluationCallback: (onCancel: AsyncComputedOnCancel) => T | Promise<T>, initialState?: undefined, optionsOrRef?: Ref<boolean> | AsyncComputedOptions): Ref<T | undefined>;
/** @deprecated use `computedAsync` instead */
declare const asyncComputed: typeof computedAsync;
//#endregion
//#region computedInject/index.d.ts
type ComputedInjectGetter<T, K$1> = (source: T | undefined, oldValue?: K$1) => K$1;
type ComputedInjectGetterWithDefault<T, K$1> = (source: T, oldValue?: K$1) => K$1;
type ComputedInjectSetter<T> = (v: T) => void;
interface WritableComputedInjectOptions<T, K$1> {
  get: ComputedInjectGetter<T, K$1>;
  set: ComputedInjectSetter<K$1>;
}
interface WritableComputedInjectOptionsWithDefault<T, K$1> {
  get: ComputedInjectGetterWithDefault<T, K$1>;
  set: ComputedInjectSetter<K$1>;
}
declare function computedInject<T, K$1 = any>(key: InjectionKey<T> | string, getter: ComputedInjectGetter<T, K$1>): ComputedRef<K$1 | undefined>;
declare function computedInject<T, K$1 = any>(key: InjectionKey<T> | string, options: WritableComputedInjectOptions<T, K$1>): ComputedRef<K$1 | undefined>;
declare function computedInject<T, K$1 = any>(key: InjectionKey<T> | string, getter: ComputedInjectGetterWithDefault<T, K$1>, defaultSource: T, treatDefaultAsFactory?: false): ComputedRef<K$1>;
declare function computedInject<T, K$1 = any>(key: InjectionKey<T> | string, options: WritableComputedInjectOptionsWithDefault<T, K$1>, defaultSource: T | (() => T), treatDefaultAsFactory: true): ComputedRef<K$1>;
//#endregion
//#region createReusableTemplate/index.d.ts
type ObjectLiteralWithPotentialObjectLiterals = Record<string, Record<string, any> | undefined>;
type GenerateSlotsFromSlotMap<T extends ObjectLiteralWithPotentialObjectLiterals> = { [K in keyof T]: Slot<T[K]> };
type DefineTemplateComponent<Bindings extends Record<string, any>, MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals> = DefineComponent & {
  new (): {
    $slots: {
      default: (_: Bindings & {
        $slots: GenerateSlotsFromSlotMap<MapSlotNameToSlotProps>;
      }) => any;
    };
  };
};
type ReuseTemplateComponent<Bindings extends Record<string, any>, MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals> = DefineComponent<Bindings> & {
  new (): {
    $slots: GenerateSlotsFromSlotMap<MapSlotNameToSlotProps>;
  };
};
type ReusableTemplatePair<Bindings extends Record<string, any>, MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals> = [DefineTemplateComponent<Bindings, MapSlotNameToSlotProps>, ReuseTemplateComponent<Bindings, MapSlotNameToSlotProps>] & {
  define: DefineTemplateComponent<Bindings, MapSlotNameToSlotProps>;
  reuse: ReuseTemplateComponent<Bindings, MapSlotNameToSlotProps>;
};
interface CreateReusableTemplateOptions<Props extends Record<string, any>> {
  /**
   * Inherit attrs from reuse component.
   *
   * @default true
   */
  inheritAttrs?: boolean;
  /**
   * Props definition for reuse component.
   */
  props?: ComponentObjectPropsOptions<Props>;
}
/**
 * This function creates `define` and `reuse` components in pair,
 * It also allow to pass a generic to bind with type.
 *
 * @see https://vueuse.org/createReusableTemplate
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function createReusableTemplate<Bindings extends Record<string, any>, MapSlotNameToSlotProps extends ObjectLiteralWithPotentialObjectLiterals = Record<'default', undefined>>(options?: CreateReusableTemplateOptions<Bindings>): ReusableTemplatePair<Bindings, MapSlotNameToSlotProps>;
//#endregion
//#region createTemplatePromise/index.d.ts
interface TemplatePromiseProps<Return, Args extends any[] = []> {
  /**
   * The promise instance.
   */
  promise: Promise<Return> | undefined;
  /**
   * Resolve the promise.
   */
  resolve: (v: Return | Promise<Return>) => void;
  /**
   * Reject the promise.
   */
  reject: (v: any) => void;
  /**
   * Arguments passed to TemplatePromise.start()
   */
  args: Args;
  /**
   * Indicates if the promise is resolving.
   * When passing another promise to `resolve`, this will be set to `true` until the promise is resolved.
   */
  isResolving: boolean;
  /**
   * Options passed to createTemplatePromise()
   */
  options: TemplatePromiseOptions;
  /**
   * Unique key for list rendering.
   */
  key: number;
}
interface TemplatePromiseOptions {
  /**
   * Determines if the promise can be called only once at a time.
   *
   * @default false
   */
  singleton?: boolean;
  /**
   * Transition props for the promise.
   */
  transition?: TransitionGroupProps;
}
type TemplatePromise<Return, Args extends any[] = []> = DefineComponent<object> & {
  new (): {
    $slots: {
      default: (_: TemplatePromiseProps<Return, Args>) => any;
    };
  };
} & {
  start: (...args: Args) => Promise<Return>;
};
/**
 * Creates a template promise component.
 *
 * @see https://vueuse.org/createTemplatePromise
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function createTemplatePromise<Return, Args extends any[] = []>(options?: TemplatePromiseOptions): TemplatePromise<Return, Args>;
//#endregion
//#region createUnrefFn/index.d.ts
type UnrefFn<T> = T extends ((...args: infer A) => infer R) ? (...args: { [K in keyof A]: MaybeRef<A[K]> }) => R : never;
/**
 * Make a plain function accepting ref and raw values as arguments.
 * Returns the same value the unconverted function returns, with proper typing.
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function createUnrefFn<T extends Function>(fn: T): UnrefFn<T>;
//#endregion
//#region _configurable.d.ts
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
interface ConfigurableDeepRefs<D extends boolean> {
  /**
   * Return deep refs instead of shallow refs.
   *
   * @default true - will be changed to `false` by default in the next major
   */
  deepRefs?: D;
}
interface ConfigurableScheduler {
  /**
   * Custom scheduler to use for interval execution.
   */
  scheduler?: (cb: Fn) => Pausable;
}
//#endregion
//#region unrefElement/index.d.ts
type VueInstance = ComponentPublicInstance;
type MaybeElementRef<T extends MaybeElement = MaybeElement> = MaybeRef<T>;
type MaybeComputedElementRef<T extends MaybeElement = MaybeElement> = MaybeRefOrGetter<T>;
type MaybeElement = HTMLElement | SVGElement | VueInstance | undefined | null;
type UnRefElementReturn<T extends MaybeElement = MaybeElement> = T extends VueInstance ? Exclude<MaybeElement, VueInstance> : T | undefined;
/**
 * Get the dom element of a ref of element or Vue component instance
 *
 * @param elRef
 */
declare function unrefElement<T extends MaybeElement>(elRef: MaybeComputedElementRef<T>): UnRefElementReturn<T>;
//#endregion
//#region onClickOutside/index.d.ts
interface OnClickOutsideOptions<Controls extends boolean = false> extends ConfigurableWindow {
  /**
   * List of elements that should not trigger the event,
   * provided as Refs or CSS Selectors.
   */
  ignore?: MaybeRefOrGetter<(MaybeElementRef | string)[]>;
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
  /**
   * Use controls to cancel/trigger listener.
   * @default false
   */
  controls?: Controls;
}
type OnClickOutsideHandler<T extends OnClickOutsideOptions<boolean> = OnClickOutsideOptions> = (event: (T['detectIframe'] extends true ? FocusEvent : never) | (T['controls'] extends true ? Event : never) | PointerEvent) => void;
type OnClickOutsideReturn<Controls extends boolean = false> = Controls extends false ? Fn : {
  stop: Fn;
  cancel: Fn;
  trigger: (event: Event) => void;
};
/**
 * Listen for clicks outside of an element.
 *
 * @see https://vueuse.org/onClickOutside
 * @param target
 * @param handler
 * @param options
 */
declare function onClickOutside<T extends OnClickOutsideOptions>(target: MaybeComputedElementRef, handler: OnClickOutsideHandler<T>, options?: T): Fn;
declare function onClickOutside<T extends OnClickOutsideOptions<true>>(target: MaybeComputedElementRef, handler: OnClickOutsideHandler<T>, options: T): {
  stop: Fn;
  cancel: Fn;
  trigger: (event: Event) => void;
};
//#endregion
//#region onElementRemoval/index.d.ts
interface OnElementRemovalOptions extends ConfigurableWindow, ConfigurableDocumentOrShadowRoot, WatchOptionsBase {}
/**
 * Fires when the element or any element containing it is removed.
 *
 * @param target
 * @param callback
 * @param options
 */
declare function onElementRemoval(target: MaybeElementRef, callback: (mutationRecords: MutationRecord[]) => void, options?: OnElementRemovalOptions): Fn;
//#endregion
//#region onKeyStroke/index.d.ts
type KeyPredicate = (event: KeyboardEvent) => boolean;
type KeyFilter = true | string | string[] | KeyPredicate;
type KeyStrokeEventName = 'keydown' | 'keypress' | 'keyup';
interface OnKeyStrokeOptions {
  eventName?: KeyStrokeEventName;
  target?: MaybeRefOrGetter<EventTarget | null | undefined>;
  passive?: boolean;
  /**
   * Set to `true` to ignore repeated events when the key is being held down.
   *
   * @default false
   */
  dedupe?: MaybeRefOrGetter<boolean>;
}
/**
 * Listen for keyboard keystrokes.
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
//#endregion
//#region onLongPress/index.d.ts
interface OnLongPressOptions {
  /**
   * Time in ms till `longpress` gets called
   *
   * @default 500
   */
  delay?: number | ((ev: PointerEvent) => number);
  modifiers?: OnLongPressModifiers;
  /**
   * Allowance of moving distance in pixels,
   * The action will get canceled When moving too far from the pointerdown position.
   * @default 10
   */
  distanceThreshold?: number | false;
  /**
   * Function called when the ref element is released.
   * @param duration how long the element was pressed in ms
   * @param distance distance from the pointerdown position
   * @param isLongPress whether the action was a long press or not
   */
  onMouseUp?: (duration: number, distance: number, isLongPress: boolean) => void;
}
interface OnLongPressModifiers {
  stop?: boolean;
  once?: boolean;
  prevent?: boolean;
  capture?: boolean;
  self?: boolean;
}
type OnLongPressReturn = () => void;
/** @deprecated use {@link OnLongPressReturn} instead */
type UseOnLongPressReturn = OnLongPressReturn;
declare function onLongPress(target: MaybeElementRef, handler: (evt: PointerEvent) => void, options?: OnLongPressOptions): OnLongPressReturn;
//#endregion
//#region onStartTyping/index.d.ts
/**
 * Fires when users start typing on non-editable elements.
 *
 * @see https://vueuse.org/onStartTyping
 * @param callback
 * @param options
 */
declare function onStartTyping(callback: (event: KeyboardEvent) => void, options?: ConfigurableDocument): void;
//#endregion
//#region templateRef/index.d.ts
/**
 * @deprecated Use Vue's built-in `useTemplateRef` instead.
 *
 * Shorthand for binding ref to template element.
 *
 * @see https://vueuse.org/templateRef
 * @param key
 * @param initialValue
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function templateRef<T extends HTMLElement | SVGElement | Component | null, Keys extends string = string>(key: Keys, initialValue?: T | null): Readonly<Ref<T>>;
//#endregion
//#region useActiveElement/index.d.ts
interface UseActiveElementOptions extends ConfigurableWindow, ConfigurableDocumentOrShadowRoot {
  /**
   * Search active element deeply inside shadow dom
   *
   * @default true
   */
  deep?: boolean;
  /**
   * Track active element when it's removed from the DOM
   * Using a MutationObserver under the hood
   * @default false
   */
  triggerOnRemoval?: boolean;
}
type UseActiveElementReturn<T extends HTMLElement = HTMLElement> = ShallowRef<T | null | undefined>;
/**
 * Reactive `document.activeElement`
 *
 * @see https://vueuse.org/useActiveElement
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useActiveElement<T extends HTMLElement>(options?: UseActiveElementOptions): UseActiveElementReturn<T>;
//#endregion
//#region types.d.ts
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
  as?: object | string;
}
type PointerType = 'mouse' | 'touch' | 'pen';
interface Supportable {
  isSupported: ComputedRef<boolean>;
}
//#endregion
//#region useAnimate/index.d.ts
interface UseAnimateOptions extends KeyframeAnimationOptions, ConfigurableWindow {
  /**
   * Will automatically run play when `useAnimate` is used
   *
   * @default true
   */
  immediate?: boolean;
  /**
   * Whether to commits the end styling state of an animation to the element being animated
   * In general, you should use `fill` option with this.
   *
   * @default false
   */
  commitStyles?: boolean;
  /**
   * Whether to persists the animation
   *
   * @default false
   */
  persist?: boolean;
  /**
   * Executed after animation initialization
   */
  onReady?: (animate: Animation) => void;
  /**
   * Callback when error is caught.
   */
  onError?: (e: unknown) => void;
}
type UseAnimateKeyframes = MaybeRef<Keyframe[] | PropertyIndexedKeyframes | null>;
interface UseAnimateReturn extends Supportable {
  animate: ShallowRef<Animation | undefined>;
  play: () => void;
  pause: () => void;
  reverse: () => void;
  finish: () => void;
  cancel: () => void;
  pending: ComputedRef<boolean>;
  playState: ComputedRef<AnimationPlayState>;
  replaceState: ComputedRef<AnimationReplaceState>;
  startTime: WritableComputedRef<CSSNumberish | number | null>;
  currentTime: WritableComputedRef<CSSNumberish | null>;
  timeline: WritableComputedRef<AnimationTimeline | null>;
  playbackRate: WritableComputedRef<number>;
}
/**
 * Reactive Web Animations API
 *
 * @see https://vueuse.org/useAnimate
 * @param target
 * @param keyframes
 * @param options
 */
declare function useAnimate(target: MaybeComputedElementRef, keyframes: UseAnimateKeyframes, options?: number | UseAnimateOptions): UseAnimateReturn;
//#endregion
//#region useAsyncQueue/index.d.ts
type UseAsyncQueueTask<T> = (...args: any[]) => T | Promise<T>;
type MapQueueTask<T extends any[]> = { [K in keyof T]: UseAsyncQueueTask<T[K]> };
interface UseAsyncQueueResult<T> {
  state: 'aborted' | 'fulfilled' | 'pending' | 'rejected';
  data: T | null;
}
interface UseAsyncQueueReturn<T> {
  activeIndex: ShallowRef<number>;
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
  /**
   * A AbortSignal that can be used to abort the task.
   */
  signal?: AbortSignal;
}
/**
 * Asynchronous queue task controller.
 *
 * @see https://vueuse.org/useAsyncQueue
 * @param tasks
 * @param options
 */
declare function useAsyncQueue<T extends any[], S = MapQueueTask<T>>(tasks: S & Array<UseAsyncQueueTask<any>>, options?: UseAsyncQueueOptions): UseAsyncQueueReturn<{ [P in keyof T]: UseAsyncQueueResult<T[P]> }>;
//#endregion
//#region useAsyncState/index.d.ts
interface UseAsyncStateReturnBase<Data, Params extends any[], Shallow extends boolean> {
  state: Shallow extends true ? Ref<Data> : Ref<UnwrapRef<Data>>;
  isReady: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<unknown>;
  execute: (delay?: number, ...args: Params) => Promise<Data | undefined>;
  executeImmediate: (...args: Params) => Promise<Data | undefined>;
}
type UseAsyncStateReturn<Data, Params extends any[], Shallow extends boolean> = UseAsyncStateReturnBase<Data, Params, Shallow> & PromiseLike<UseAsyncStateReturnBase<Data, Params, Shallow>>;
interface UseAsyncStateOptions<Shallow extends boolean, D = any> {
  /**
   * Delay for the first execution of the promise when "immediate" is true. In milliseconds.
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
declare function useAsyncState<Data, Params extends any[] = any[], Shallow extends boolean = true>(promise: Promise<Data> | ((...args: Params) => Promise<Data>), initialState: MaybeRef<Data>, options?: UseAsyncStateOptions<Shallow, Data>): UseAsyncStateReturn<Data, Params, Shallow>;
//#endregion
//#region useBase64/index.d.ts
interface UseBase64Options {
  /**
   * Output as Data URL format
   *
   * @default true
   */
  dataUrl?: boolean;
}
interface ToDataURLOptions extends UseBase64Options {
  /**
   * MIME type
   */
  type?: string | undefined;
  /**
   * Image quality of jpeg or webp
   */
  quality?: any;
}
interface UseBase64ObjectOptions<T> extends UseBase64Options {
  serializer?: (v: T) => string;
}
interface UseBase64Return {
  base64: ShallowRef<string>;
  promise: ShallowRef<Promise<string>>;
  execute: () => Promise<string>;
}
declare function useBase64(target: MaybeRefOrGetter<string | undefined>, options?: UseBase64Options): UseBase64Return;
declare function useBase64(target: MaybeRefOrGetter<Blob | undefined>, options?: UseBase64Options): UseBase64Return;
declare function useBase64(target: MaybeRefOrGetter<ArrayBuffer | undefined>, options?: UseBase64Options): UseBase64Return;
declare function useBase64(target: MaybeRefOrGetter<HTMLCanvasElement | undefined>, options?: ToDataURLOptions): UseBase64Return;
declare function useBase64(target: MaybeRefOrGetter<HTMLImageElement | undefined>, options?: ToDataURLOptions): UseBase64Return;
declare function useBase64<T extends Record<string, unknown>>(target: MaybeRefOrGetter<T>, options?: UseBase64ObjectOptions<T>): UseBase64Return;
declare function useBase64<T extends Map<string, unknown>>(target: MaybeRefOrGetter<T>, options?: UseBase64ObjectOptions<T>): UseBase64Return;
declare function useBase64<T extends Set<unknown>>(target: MaybeRefOrGetter<T>, options?: UseBase64ObjectOptions<T>): UseBase64Return;
declare function useBase64<T>(target: MaybeRefOrGetter<T[]>, options?: UseBase64ObjectOptions<T[]>): UseBase64Return;
//#endregion
//#region useBattery/index.d.ts
interface UseBatteryOptions extends ConfigurableNavigator {}
interface UseBatteryReturn extends Supportable {
  charging: ShallowRef<boolean>;
  chargingTime: ShallowRef<number>;
  dischargingTime: ShallowRef<number>;
  level: ShallowRef<number>;
}
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useBattery(options?: UseBatteryOptions): UseBatteryReturn;
//#endregion
//#region useBluetooth/index.d.ts
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
interface UseBluetoothReturn extends Supportable {
  isConnected: Readonly<ShallowRef<boolean>>;
  device: ShallowRef<BluetoothDevice | undefined>;
  requestDevice: () => Promise<void>;
  server: ShallowRef<BluetoothRemoteGATTServer | undefined>;
  error: ShallowRef<unknown | null>;
}
//#endregion
//#region useBreakpoints/breakpoints.d.ts
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
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};
/**
 * Breakpoints from Vuetify V2
 *
 * @see https://v2.vuetifyjs.com/en/features/breakpoints/
 */
declare const breakpointsVuetifyV2: {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};
/**
 * Breakpoints from Vuetify V3
 *
 * @see https://vuetifyjs.com/en/styles/float/#overview
 */
declare const breakpointsVuetifyV3: {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};
/**
 * Alias to `breakpointsVuetifyV2`
 *
 * @deprecated explictly use `breakpointsVuetifyV2` or `breakpointsVuetifyV3` instead
 */
declare const breakpointsVuetify: {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
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
  xl: number;
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
/**
 * Breakpoints from PrimeFlex
 *
 * @see https://primeflex.org/installation
 */
declare const breakpointsPrimeFlex: {
  sm: number;
  md: number;
  lg: number;
  xl: number;
};
/**
 * Breakpoints from ElementUI/ElementPlus
 *
 * @see https://element.eleme.io/#/en-US/component/layout
 * @see https://element-plus.org/en-US/component/layout.html
 */
declare const breakpointsElement: {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};
//#endregion
//#region useBreakpoints/index.d.ts
type Breakpoints<K$1 extends string = string> = Record<K$1, MaybeRefOrGetter<number | string>>;
interface UseBreakpointsOptions extends ConfigurableWindow {
  /**
   * The query strategy to use for the generated shortcut methods like `.lg`
   *
   * 'min-width' - .lg will be true when the viewport is greater than or equal to the lg breakpoint (mobile-first)
   * 'max-width' - .lg will be true when the viewport is smaller than the xl breakpoint (desktop-first)
   *
   * @default "min-width"
   */
  strategy?: 'min-width' | 'max-width';
  ssrWidth?: number;
}
type UseBreakpointReturn<K$1 extends string = string> = Record<K$1, ComputedRef<boolean>> & {
  greaterOrEqual: (k: MaybeRefOrGetter<K$1>) => ComputedRef<boolean>;
  smallerOrEqual: (k: MaybeRefOrGetter<K$1>) => ComputedRef<boolean>;
  greater: (k: MaybeRefOrGetter<K$1>) => ComputedRef<boolean>;
  smaller: (k: MaybeRefOrGetter<K$1>) => ComputedRef<boolean>;
  between: (a: MaybeRefOrGetter<K$1>, b: MaybeRefOrGetter<K$1>) => ComputedRef<boolean>;
  isGreater: (k: MaybeRefOrGetter<K$1>) => boolean;
  isGreaterOrEqual: (k: MaybeRefOrGetter<K$1>) => boolean;
  isSmaller: (k: MaybeRefOrGetter<K$1>) => boolean;
  isSmallerOrEqual: (k: MaybeRefOrGetter<K$1>) => boolean;
  isInBetween: (a: MaybeRefOrGetter<K$1>, b: MaybeRefOrGetter<K$1>) => boolean;
  current: () => ComputedRef<K$1[]>;
  active: () => ComputedRef<K$1 | ''>;
};
/**
 * Reactively viewport breakpoints
 *
 * @see https://vueuse.org/useBreakpoints
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useBreakpoints<K$1 extends string>(breakpoints: Breakpoints<K$1>, options?: UseBreakpointsOptions): UseBreakpointReturn<K$1>;
//#endregion
//#region useBroadcastChannel/index.d.ts
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
declare function useBroadcastChannel<D, P$1>(options: UseBroadcastChannelOptions): UseBroadcastChannelReturn<D, P$1>;
interface UseBroadcastChannelReturn<D, P$1> extends Supportable {
  channel: Ref<BroadcastChannel | undefined>;
  data: Ref<D>;
  post: (data: P$1) => void;
  close: () => void;
  error: ShallowRef<Event | null>;
  isClosed: ShallowRef<boolean>;
}
//#endregion
//#region useBrowserLocation/index.d.ts
interface UseBrowserLocationOptions extends ConfigurableWindow {}
interface BrowserLocationState {
  readonly trigger: string;
  readonly state?: any;
  readonly length?: number;
  readonly origin?: string;
  hash?: string;
  host?: string;
  hostname?: string;
  href?: string;
  pathname?: string;
  port?: string;
  protocol?: string;
  search?: string;
}
type UseBrowserLocationReturn = Ref<BrowserLocationState>;
/**
 * Reactive browser location.
 *
 * @see https://vueuse.org/useBrowserLocation
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useBrowserLocation(options?: UseBrowserLocationOptions): UseBrowserLocationReturn;
//#endregion
//#region useCached/index.d.ts
interface UseCachedOptions<D extends boolean = true> extends ConfigurableDeepRefs<D>, WatchOptions {}
declare function useCached<T, D extends boolean = true>(refValue: Ref<T>, comparator?: (a: T, b: T) => boolean, options?: UseCachedOptions<D>): UseCachedReturn<T, D>;
type UseCachedReturn<T = any, D extends boolean = true> = ShallowOrDeepRef<T, D>;
//#endregion
//#region useClipboard/index.d.ts
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
interface UseClipboardReturn<Optional> extends Supportable {
  text: Readonly<ShallowRef<string>>;
  copied: Readonly<ShallowRef<boolean>>;
  copy: Optional extends true ? (text?: string) => Promise<void> : (text: string) => Promise<void>;
}
/**
 * Reactive Clipboard API.
 *
 * @see https://vueuse.org/useClipboard
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useClipboard(options?: UseClipboardOptions<undefined>): UseClipboardReturn<false>;
declare function useClipboard(options: UseClipboardOptions<MaybeRefOrGetter<string>>): UseClipboardReturn<true>;
//#endregion
//#region useClipboardItems/index.d.ts
interface UseClipboardItemsOptions<Source> extends ConfigurableNavigator {
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
}
interface UseClipboardItemsReturn<Optional> extends Supportable {
  content: Readonly<Ref<ClipboardItems>>;
  copied: Readonly<ShallowRef<boolean>>;
  copy: Optional extends true ? (content?: ClipboardItems) => Promise<void> : (text: ClipboardItems) => Promise<void>;
  read: () => void;
}
/**
 * Reactive Clipboard API.
 *
 * @see https://vueuse.org/useClipboardItems
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useClipboardItems(options?: UseClipboardItemsOptions<undefined>): UseClipboardItemsReturn<false>;
declare function useClipboardItems(options: UseClipboardItemsOptions<MaybeRefOrGetter<ClipboardItems>>): UseClipboardItemsReturn<true>;
//#endregion
//#region useCloned/index.d.ts
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
  cloned: Ref<T>;
  /**
   * Ref indicates whether the cloned data is modified
   */
  isModified: Ref<boolean>;
  /**
   * Sync cloned data with source manually
   */
  sync: () => void;
}
type CloneFn<F, T = F> = (x: F) => T;
declare function cloneFnJSON<T>(source: T): T;
declare function useCloned<T>(source: MaybeRefOrGetter<T>, options?: UseClonedOptions): UseClonedReturn<T>;
//#endregion
//#region ssr-handlers.d.ts
interface StorageLikeAsync {
  getItem: (key: string) => Awaitable<string | null>;
  setItem: (key: string, value: string) => Awaitable<void>;
  removeItem: (key: string) => Awaitable<void>;
}
interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}
/**
 * @experimental The API is not finalized yet. It might not follow semver.
 */
interface SSRHandlersMap {
  getDefaultStorage: () => StorageLike | undefined;
  getDefaultStorageAsync: () => StorageLikeAsync | undefined;
  updateHTMLAttrs: (selector: string | MaybeElementRef, attribute: string, value: string) => void;
}
declare function getSSRHandler<T extends keyof SSRHandlersMap>(key: T, fallback: SSRHandlersMap[T]): SSRHandlersMap[T];
declare function getSSRHandler<T extends keyof SSRHandlersMap>(key: T, fallback: SSRHandlersMap[T] | undefined): SSRHandlersMap[T] | undefined;
declare function setSSRHandler<T extends keyof SSRHandlersMap>(key: T, fn: SSRHandlersMap[T]): void;
//#endregion
//#region useStorage/index.d.ts
interface Serializer<T> {
  read: (raw: string) => T;
  write: (value: T) => string;
}
interface SerializerAsync<T> {
  read: (raw: string) => Awaitable<T>;
  write: (value: T) => Awaitable<string>;
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
  /**
   * Wait for the component to be mounted before reading the storage.
   *
   * @default false
   */
  initOnMounted?: boolean;
}
declare function useStorage(key: MaybeRefOrGetter<string>, defaults: MaybeRefOrGetter<string>, storage?: StorageLike, options?: UseStorageOptions<string>): RemovableRef<string>;
declare function useStorage(key: MaybeRefOrGetter<string>, defaults: MaybeRefOrGetter<boolean>, storage?: StorageLike, options?: UseStorageOptions<boolean>): RemovableRef<boolean>;
declare function useStorage(key: MaybeRefOrGetter<string>, defaults: MaybeRefOrGetter<number>, storage?: StorageLike, options?: UseStorageOptions<number>): RemovableRef<number>;
declare function useStorage<T>(key: MaybeRefOrGetter<string>, defaults: MaybeRefOrGetter<T>, storage?: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
declare function useStorage<T = unknown>(key: MaybeRefOrGetter<string>, defaults: MaybeRefOrGetter<null>, storage?: StorageLike, options?: UseStorageOptions<T>): RemovableRef<T>;
//#endregion
//#region useColorMode/index.d.ts
type BasicColorMode = 'light' | 'dark';
type BasicColorSchema = BasicColorMode | 'auto';
interface UseColorModeOptions<T extends string = BasicColorMode> extends UseStorageOptions<T | BasicColorMode> {
  /**
   * CSS Selector for the target element applying to
   *
   * @default 'html'
   */
  selector?: string | MaybeElementRef;
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
  initialValue?: MaybeRefOrGetter<T | BasicColorSchema>;
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
  onChanged?: (mode: T | BasicColorMode, defaultHandler: ((mode: T | BasicColorMode) => void)) => void;
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
   * @deprecated use `store.value` when `auto` mode needs to be known
   * @see https://vueuse.org/core/useColorMode/#advanced-usage
   */
  emitAuto?: boolean;
  /**
   * Disable transition on switch
   *
   * @see https://paco.me/writing/disable-theme-transitions
   * @default true
   */
  disableTransition?: boolean;
}
type UseColorModeReturn<T extends string = BasicColorMode> = Ref<T | BasicColorSchema> & {
  store: Ref<T | BasicColorSchema>;
  system: ComputedRef<BasicColorMode>;
  state: ComputedRef<T | BasicColorMode>;
};
/**
 * Reactive color mode with auto data persistence.
 *
 * @see https://vueuse.org/useColorMode
 * @param options
 */
declare function useColorMode<T extends string = BasicColorMode>(options?: UseColorModeOptions<T>): UseColorModeReturn<T>;
//#endregion
//#region useConfirmDialog/index.d.ts
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useConfirmDialog<RevealData = any, ConfirmData = any, CancelData = any>(revealed?: ShallowRef<boolean>): UseConfirmDialogReturn<RevealData, ConfirmData, CancelData>;
//#endregion
//#region useCountdown/index.d.ts
interface UseCountdownOptions extends ConfigurableScheduler {
  /**
   *  Interval for the countdown in milliseconds. Default is 1000ms.
   *
   * @deprecated Please use `scheduler` option instead
   */
  interval?: MaybeRefOrGetter<number>;
  /**
   * Callback function called when the countdown reaches 0.
   */
  onComplete?: () => void;
  /**
   * Callback function called on each tick of the countdown.
   */
  onTick?: () => void;
  /**
   * Start the countdown immediately
   *
   * @deprecated Please use `scheduler` option instead
   * @default false
   */
  immediate?: boolean;
}
interface UseCountdownReturn extends Pausable {
  /**
   * Current countdown value.
   */
  remaining: ShallowRef<number>;
  /**
   * Resets the countdown and repeatsLeft to their initial values.
   */
  reset: (countdown?: MaybeRefOrGetter<number>) => void;
  /**
   * Stops the countdown and resets its state.
   */
  stop: () => void;
  /**
   * Reset the countdown and start it again.
   */
  start: (countdown?: MaybeRefOrGetter<number>) => void;
}
/**
 * Reactive countdown timer in seconds.
 *
 * @param initialCountdown
 * @param options
 *
 * @see https://vueuse.org/useCountdown
 */
declare function useCountdown(initialCountdown: MaybeRefOrGetter<number>, options?: UseCountdownOptions): UseCountdownReturn;
//#endregion
//#region useCssSupports/index.d.ts
interface UseCssSupportsOptions extends ConfigurableWindow {
  ssrValue?: boolean;
}
interface UseCssSupportsReturn extends Supportable {}
declare function useCssSupports(property: MaybeRefOrGetter<string>, value: MaybeRefOrGetter<string>, options?: UseCssSupportsOptions): UseCssSupportsReturn;
declare function useCssSupports(conditionText: MaybeRefOrGetter<string>, options?: UseCssSupportsOptions): UseCssSupportsReturn;
//#endregion
//#region useCssVar/index.d.ts
interface UseCssVarOptions extends ConfigurableWindow {
  initialValue?: string;
  /**
   * Use MutationObserver to monitor variable changes
   * @default false
   */
  observe?: boolean;
}
/**
 * Manipulate CSS variables.
 *
 * @see https://vueuse.org/useCssVar
 * @param prop
 * @param target
 * @param options
 */
declare function useCssVar(prop: MaybeRefOrGetter<string | null | undefined>, target?: MaybeElementRef, options?: UseCssVarOptions): vue0.ShallowRef<string | undefined, string | undefined>;
//#endregion
//#region useCurrentElement/index.d.ts
declare function useCurrentElement<T extends MaybeElement = MaybeElement, R$1 extends VueInstance = VueInstance, E extends MaybeElement = (MaybeElement extends T ? IsAny<R$1['$el']> extends false ? R$1['$el'] : T : T)>(rootComponent?: MaybeElementRef<R$1>): _vueuse_shared0.ComputedRefWithControl<E>;
//#endregion
//#region useCycleList/index.d.ts
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
declare function useCycleList<T>(list: MaybeRefOrGetter<T[]>, options?: UseCycleListOptions<T>): UseCycleListReturn<T>;
interface UseCycleListReturn<T> {
  state: ShallowRef<T>;
  index: WritableComputedRef<number>;
  next: (n?: number) => T;
  prev: (n?: number) => T;
  /**
   * Go to a specific index
   */
  go: (i: number) => T;
}
//#endregion
//#region useDark/index.d.ts
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
  onChanged?: (isDark: boolean, defaultHandler: ((mode: BasicColorSchema) => void), mode: BasicColorSchema) => void;
}
type UseDarkReturn = WritableComputedRef<boolean>;
/**
 * Reactive dark mode with auto data persistence.
 *
 * @see https://vueuse.org/useDark
 * @param options
 */
declare function useDark(options?: UseDarkOptions): UseDarkReturn;
//#endregion
//#region useManualRefHistory/index.d.ts
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
   * set data source
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
  canUndo: ComputedRef<boolean>;
  /**
   * A ref representing if redo is possible (non empty redoStack)
   */
  canRedo: ComputedRef<boolean>;
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
   * Create a new history record
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
//#endregion
//#region useRefHistory/index.d.ts
interface UseRefHistoryOptions<Raw, Serialized = Raw> extends ConfigurableEventFilter, ConfigurableFlush {
  /**
   * Watch for deep changes, default to false
   *
   * When set to true, it will also create clones for values store in the history
   *
   * @default false
   */
  deep?: boolean;
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
   * Function to determine if the commit should proceed
   * @param oldValue Previous value
   * @param newValue New value
   * @returns boolean indicating if commit should proceed
   */
  shouldCommit?: (oldValue: Raw | undefined, newValue: Raw) => boolean;
}
interface UseRefHistoryReturn<Raw, Serialized> extends UseManualRefHistoryReturn<Raw, Serialized> {
  /**
   * A ref representing if the tracking is enabled
   */
  isTracking: Ref<boolean>;
  /**
   * Pause change tracking
   */
  pause: () => void;
  /**
   * Resume change tracking
   *
   * @param [commit] if true, a history record will be create after resuming
   */
  resume: (commit?: boolean) => void;
  /**
   * A sugar for auto pause and auto resuming within a function scope
   *
   * @param fn
   */
  batch: (fn: (cancel: Fn) => void) => void;
  /**
   * Clear the data and stop the watch
   */
  dispose: () => void;
}
/**
 * Track the change history of a ref, also provides undo and redo functionality.
 *
 * @see https://vueuse.org/useRefHistory
 * @param source
 * @param options
 */
declare function useRefHistory<Raw, Serialized = Raw>(source: Ref<Raw>, options?: UseRefHistoryOptions<Raw, Serialized>): UseRefHistoryReturn<Raw, Serialized>;
//#endregion
//#region useDebouncedRefHistory/index.d.ts
/**
 * Shorthand for [useRefHistory](https://vueuse.org/useRefHistory) with debounce filter.
 *
 * @see https://vueuse.org/useDebouncedRefHistory
 * @param source
 * @param options
 */
declare function useDebouncedRefHistory<Raw, Serialized = Raw>(source: Ref<Raw>, options?: Omit<UseRefHistoryOptions<Raw, Serialized>, 'eventFilter'> & {
  debounce?: MaybeRefOrGetter<number>;
}): UseRefHistoryReturn<Raw, Serialized>;
//#endregion
//#region useDeviceMotion/index.d.ts
interface UseDeviceMotionOptions extends ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Request for permissions immediately if it's not granted,
   * otherwise label and deviceIds could be empty
   *
   * @default false
   */
  requestPermissions?: boolean;
}
/** @deprecated use {@link UseDeviceMotionOptions} instead */
type DeviceMotionOptions = UseDeviceMotionOptions;
interface UseDeviceMotionReturn extends Supportable {
  acceleration: Ref<DeviceMotionEventAcceleration | null>;
  accelerationIncludingGravity: Ref<DeviceMotionEventAcceleration | null>;
  rotationRate: Ref<DeviceMotionEventRotationRate | null>;
  interval: ShallowRef<number>;
  requirePermissions: ComputedRef<boolean>;
  ensurePermissions: () => Promise<void>;
  permissionGranted: ShallowRef<boolean>;
}
/**
 * Reactive DeviceMotionEvent.
 *
 * @see https://vueuse.org/useDeviceMotion
 * @param options
 */
declare function useDeviceMotion(options?: UseDeviceMotionOptions): UseDeviceMotionReturn;
//#endregion
//#region useDeviceOrientation/index.d.ts
interface UseDeviceOrientationOptions extends ConfigurableWindow {}
interface UseDeviceOrientationReturn extends Supportable {
  isAbsolute: ShallowRef<boolean, boolean>;
  alpha: Ref<number | null, number | null>;
  beta: Ref<number | null, number | null>;
  gamma: Ref<number | null, number | null>;
}
/**
 * Reactive DeviceOrientationEvent.
 *
 * @see https://vueuse.org/useDeviceOrientation
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useDeviceOrientation(options?: UseDeviceOrientationOptions): UseDeviceOrientationReturn;
//#endregion
//#region useDevicePixelRatio/index.d.ts
interface UseDevicePixelRatioOptions extends ConfigurableWindow {}
interface UseDevicePixelRatioReturn {
  pixelRatio: ShallowRef<number>;
  stop: WatchStopHandle;
}
/**
 * Reactively track `window.devicePixelRatio`.
 *
 * @see https://vueuse.org/useDevicePixelRatio
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useDevicePixelRatio(options?: UseDevicePixelRatioOptions): UseDevicePixelRatioReturn;
//#endregion
//#region useDevicesList/index.d.ts
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
interface UseDevicesListReturn extends Supportable {
  /**
   * All devices
   */
  devices: Ref<MediaDeviceInfo[]>;
  videoInputs: ComputedRef<MediaDeviceInfo[]>;
  audioInputs: ComputedRef<MediaDeviceInfo[]>;
  audioOutputs: ComputedRef<MediaDeviceInfo[]>;
  permissionGranted: ShallowRef<boolean>;
  ensurePermissions: () => Promise<boolean>;
}
/**
 * Reactive `enumerateDevices` listing available input/output devices
 *
 * @see https://vueuse.org/useDevicesList
 * @param options
 */
declare function useDevicesList(options?: UseDevicesListOptions): UseDevicesListReturn;
//#endregion
//#region useDisplayMedia/index.d.ts
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
interface UseDisplayMediaReturn extends Supportable {
  stream: ShallowRef<MediaStream | undefined>;
  start: () => Promise<MediaStream | undefined>;
  stop: () => void;
  enabled: ShallowRef<boolean>;
}
/**
 * Reactive `mediaDevices.getDisplayMedia` streaming
 *
 * @see https://vueuse.org/useDisplayMedia
 * @param options
 */
declare function useDisplayMedia(options?: UseDisplayMediaOptions): UseDisplayMediaReturn;
//#endregion
//#region useDocumentVisibility/index.d.ts
interface UseDocumentVisibilityOptions extends ConfigurableDocument {}
type UseDocumentVisibilityReturn = ShallowRef<DocumentVisibilityState>;
/**
 * Reactively track `document.visibilityState`.
 *
 * @see https://vueuse.org/useDocumentVisibility
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useDocumentVisibility(options?: UseDocumentVisibilityOptions): UseDocumentVisibilityReturn;
//#endregion
//#region useDraggable/index.d.ts
interface UseDraggableOptions {
  /**
   * Only start the dragging when click on the element directly
   *
   * @default false
   */
  exact?: MaybeRefOrGetter<boolean>;
  /**
   * Prevent events defaults
   *
   * @default false
   */
  preventDefault?: MaybeRefOrGetter<boolean>;
  /**
   * Prevent events propagation
   *
   * @default false
   */
  stopPropagation?: MaybeRefOrGetter<boolean>;
  /**
   * Whether dispatch events in capturing phase
   *
   * @default true
   */
  capture?: boolean;
  /**
   * Element to attach `pointermove` and `pointerup` events to.
   *
   * @default window
   */
  draggingElement?: MaybeRefOrGetter<HTMLElement | SVGElement | Window | Document | null | undefined>;
  /**
   * Element for calculating bounds (If not set, it will use the event's target).
   *
   * @default undefined
   */
  containerElement?: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>;
  /**
   * Handle that triggers the drag event
   *
   * @default target
   */
  handle?: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>;
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
  initialValue?: MaybeRefOrGetter<Position>;
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
  /**
   * Axis to drag on.
   *
   * @default 'both'
   */
  axis?: 'x' | 'y' | 'both';
  /**
   * Disabled drag and drop.
   *
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean>;
  /**
   * Mouse buttons that are allowed to trigger drag events.
   *
   * - `0`: Main button, usually the left button or the un-initialized state
   * - `1`: Auxiliary button, usually the wheel button or the middle button (if present)
   * - `2`: Secondary button, usually the right button
   * - `3`: Fourth button, typically the Browser Back button
   * - `4`: Fifth button, typically the Browser Forward button
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value
   * @default [0]
   */
  buttons?: MaybeRefOrGetter<number[]>;
  /**
   * Whether to restrict dragging within the visible area of the container.
   *
   * If enabled, the draggable element will not leave the visible area of its container,
   * ensuring it remains within the viewport of the container during the drag.
   *
   * @default false
   */
  restrictInView?: MaybeRefOrGetter<boolean>;
  /**
   * Whether to enable auto-scroll when dragging near the edges.
   *
   * @default false
   */
  autoScroll?: MaybeRefOrGetter<boolean | {
    /**
     * Speed of auto-scroll.
     *
     * @default 2
     */
    speed?: MaybeRefOrGetter<number | Position>;
    /**
     * Margin from the edge to trigger auto-scroll.
     *
     * @default 30
     */
    margin?: MaybeRefOrGetter<number | Position>;
    /**
     * Direction of auto-scroll.
     *
     * @default 'both'
     */
    direction?: 'x' | 'y' | 'both';
  }>;
}
interface UseDraggableReturn {
  x: Ref<number>;
  y: Ref<number>;
  position: Ref<Position>;
  isDragging: ComputedRef<boolean>;
  style: ComputedRef<string>;
}
/**
 * Make elements draggable.
 *
 * @see https://vueuse.org/useDraggable
 * @param target
 * @param options
 */
declare function useDraggable(target: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>, options?: UseDraggableOptions): UseDraggableReturn;
//#endregion
//#region useDropZone/index.d.ts
interface UseDropZoneReturn {
  files: ShallowRef<File[] | null>;
  isOverDropZone: ShallowRef<boolean>;
}
interface UseDropZoneOptions {
  /**
   * Allowed data types, if not set, all data types are allowed.
   * Also can be a function to check the data types.
   */
  dataTypes?: MaybeRef<readonly string[]> | ((types: readonly string[]) => boolean);
  /**
   * Similar to dataTypes, but exposes the DataTransferItemList for custom validation.
   * If provided, this function takes precedence over dataTypes.
   */
  checkValidity?: (items: DataTransferItemList) => boolean;
  onDrop?: (files: File[] | null, event: DragEvent) => void;
  onEnter?: (files: File[] | null, event: DragEvent) => void;
  onLeave?: (files: File[] | null, event: DragEvent) => void;
  onOver?: (files: File[] | null, event: DragEvent) => void;
  /**
   * Allow multiple files to be dropped. Defaults to true.
   */
  multiple?: boolean;
  /**
   * Prevent default behavior for unhandled events. Defaults to false.
   */
  preventDefaultForUnhandled?: boolean;
}
declare function useDropZone(target: MaybeRefOrGetter<HTMLElement | Document | null | undefined>, options?: UseDropZoneOptions | UseDropZoneOptions['onDrop']): UseDropZoneReturn;
//#endregion
//#region useElementBounding/index.d.ts
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
  /**
   * Timing to recalculate the bounding box
   *
   * Setting to `next-frame` can be useful when using this together with something like {@link useBreakpoints}
   * and therefore the layout (which influences the bounding box of the observed element) is not updated on the current tick.
   *
   * @default 'sync'
   */
  updateTiming?: 'sync' | 'next-frame';
}
interface UseElementBoundingReturn {
  height: ShallowRef<number>;
  bottom: ShallowRef<number>;
  left: ShallowRef<number>;
  right: ShallowRef<number>;
  top: ShallowRef<number>;
  width: ShallowRef<number>;
  x: ShallowRef<number>;
  y: ShallowRef<number>;
  update: () => void;
}
/**
 * Reactive bounding box of an HTML element.
 *
 * @see https://vueuse.org/useElementBounding
 * @param target
 */
declare function useElementBounding(target: MaybeComputedElementRef, options?: UseElementBoundingOptions): UseElementBoundingReturn;
//#endregion
//#region useElementByPoint/index.d.ts
interface UseElementByPointOptions<Multiple extends boolean = false> extends ConfigurableDocument, ConfigurableScheduler {
  x: MaybeRefOrGetter<number>;
  y: MaybeRefOrGetter<number>;
  multiple?: MaybeRefOrGetter<Multiple>;
  /** @deprecated Please use `scheduler` option instead */
  immediate?: boolean;
  /** @deprecated Please use `scheduler` option instead */
  interval?: 'requestAnimationFrame' | number;
}
interface UseElementByPointReturn<Multiple extends boolean = false> extends Supportable, Pausable {
  element: ShallowRef<Multiple extends true ? HTMLElement[] : HTMLElement | null>;
}
/**
 * Reactive element by point.
 *
 * @see https://vueuse.org/useElementByPoint
 * @param options - UseElementByPointOptions
 */
declare function useElementByPoint<M extends boolean = false>(options: UseElementByPointOptions<M>): UseElementByPointReturn<M>;
//#endregion
//#region useElementHover/index.d.ts
interface UseElementHoverOptions extends ConfigurableWindow {
  delayEnter?: number;
  delayLeave?: number;
  triggerOnRemoval?: boolean;
}
declare function useElementHover(el: MaybeRefOrGetter<EventTarget | null | undefined>, options?: UseElementHoverOptions): ShallowRef<boolean>;
//#endregion
//#region useResizeObserver/index.d.ts
/**
 * @deprecated This interface is now available in the DOM lib.
 * Use the global {@link globalThis.ResizeObserverSize} instead.
 */
interface ResizeObserverSize {
  readonly inlineSize: number;
  readonly blockSize: number;
}
/**
 * @deprecated This interface is now available in the DOM lib.
 * Use the global {@link globalThis.ResizeObserverEntry} instead.
 */
interface ResizeObserverEntry {
  readonly target: Element;
  readonly contentRect: DOMRectReadOnly;
  readonly borderBoxSize: ReadonlyArray<ResizeObserverSize>;
  readonly contentBoxSize: ReadonlyArray<ResizeObserverSize>;
  readonly devicePixelContentBoxSize: ReadonlyArray<ResizeObserverSize>;
}
/**
 * @deprecated This interface is now available in the DOM lib.
 * Use the global {@link globalThis.ResizeObserverCallback} instead.
 */
type ResizeObserverCallback = (entries: ReadonlyArray<ResizeObserverEntry>, observer: ResizeObserver) => void;
interface UseResizeObserverOptions extends ResizeObserverOptions, ConfigurableWindow {}
interface UseResizeObserverReturn extends Supportable {
  stop: () => void;
}
/**
 * Reports changes to the dimensions of an Element's content or the border-box
 *
 * @see https://vueuse.org/useResizeObserver
 * @param target
 * @param callback
 * @param options
 */
declare function useResizeObserver(target: MaybeComputedElementRef | MaybeComputedElementRef[] | MaybeRefOrGetter<MaybeElement[]>, callback: globalThis.ResizeObserverCallback, options?: UseResizeObserverOptions): UseResizeObserverReturn;
//#endregion
//#region useElementSize/index.d.ts
interface ElementSize {
  width: number;
  height: number;
}
interface UseElementSizeOptions extends UseResizeObserverOptions {}
interface UseElementSizeReturn {
  width: ShallowRef<number>;
  height: ShallowRef<number>;
  stop: () => void;
}
/**
 * Reactive size of an HTML element.
 *
 * @see https://vueuse.org/useElementSize
 */
declare function useElementSize(target: MaybeComputedElementRef, initialSize?: ElementSize, options?: UseElementSizeOptions): UseElementSizeReturn;
//#endregion
//#region useIntersectionObserver/index.d.ts
interface UseIntersectionObserverOptions extends ConfigurableWindow {
  /**
   * Start the IntersectionObserver immediately on creation
   *
   * @default true
   */
  immediate?: boolean;
  /**
   * The Element or Document whose bounds are used as the bounding box when testing for intersection.
   */
  root?: MaybeComputedElementRef | Document;
  /**
   * A string which specifies a set of offsets to add to the root's bounding_box when calculating intersections.
   */
  rootMargin?: MaybeRefOrGetter<string>;
  /**
   * Either a single number or an array of numbers between 0.0 and 1.
   * @default 0
   */
  threshold?: number | number[];
}
interface UseIntersectionObserverReturn extends Supportable, Pausable {
  stop: () => void;
}
/**
 * Detects that a target element's visibility.
 *
 * @see https://vueuse.org/useIntersectionObserver
 * @param target
 * @param callback
 * @param options
 */
declare function useIntersectionObserver(target: MaybeComputedElementRef | MaybeRefOrGetter<MaybeElement[]> | MaybeComputedElementRef[], callback: IntersectionObserverCallback, options?: UseIntersectionObserverOptions): UseIntersectionObserverReturn;
//#endregion
//#region useElementVisibility/index.d.ts
interface UseElementVisibilityOptions extends ConfigurableWindow, Pick<UseIntersectionObserverOptions, 'rootMargin' | 'threshold'> {
  /**
   * Initial value.
   *
   * @default false
   */
  initialValue?: boolean;
  /**
   * The element that is used as the viewport for checking visibility of the target.
   */
  scrollTarget?: UseIntersectionObserverOptions['root'];
  /**
   * Stop tracking when element visibility changes for the first time
   *
   * @default false
   */
  once?: boolean;
}
type UseElementVisibilityReturn = ShallowRef<boolean>;
/**
 * Tracks the visibility of an element within the viewport.
 *
 * @see https://vueuse.org/useElementVisibility
 */
declare function useElementVisibility(element: MaybeComputedElementRef, options?: UseElementVisibilityOptions): UseElementVisibilityReturn;
//#endregion
//#region useEventBus/index.d.ts
type EventBusListener<T = unknown, P$1 = any> = (event: T, payload?: P$1) => void;
type EventBusEvents<T, P$1 = any> = Set<EventBusListener<T, P$1>>;
interface EventBusKey<T> extends Symbol {}
type EventBusIdentifier<T = unknown> = EventBusKey<T> | string | number;
interface UseEventBusReturn<T, P$1> {
  /**
   * Subscribe to an event. When calling emit, the listeners will execute.
   * @param listener watch listener.
   * @returns a stop function to remove the current callback.
   */
  on: (listener: EventBusListener<T, P$1>) => Fn;
  /**
   * Similar to `on`, but only fires once
   * @param listener watch listener.
   * @returns a stop function to remove the current callback.
   */
  once: (listener: EventBusListener<T, P$1>) => Fn;
  /**
   * Emit an event, the corresponding event listeners will execute.
   * @param event data sent.
   */
  emit: (event?: T, payload?: P$1) => void;
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
declare function useEventBus<T = unknown, P$1 = any>(key: EventBusIdentifier<T>): UseEventBusReturn<T, P$1>;
//#endregion
//#region useEventListener/index.d.ts
interface InferEventTarget<Events> {
  addEventListener: (event: Events, fn?: any, options?: any) => any;
  removeEventListener: (event: Events, fn?: any, options?: any) => any;
}
type WindowEventName = keyof WindowEventMap;
type DocumentEventName = keyof DocumentEventMap;
type ShadowRootEventName = keyof ShadowRootEventMap;
interface GeneralEventListener<E = Event> {
  (evt: E): void;
}
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 1: Omitted Window target
 *
 * @see https://vueuse.org/useEventListener
 */
declare function useEventListener<E extends keyof WindowEventMap>(event: MaybeRefOrGetter<Arrayable<E>>, listener: MaybeRef<Arrayable<(this: Window, ev: WindowEventMap[E]) => any>>, options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>): Fn;
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
declare function useEventListener<E extends keyof WindowEventMap>(target: Window, event: MaybeRefOrGetter<Arrayable<E>>, listener: MaybeRef<Arrayable<(this: Window, ev: WindowEventMap[E]) => any>>, options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 3: Explicitly Document target
 *
 * @see https://vueuse.org/useEventListener
 */
declare function useEventListener<E extends keyof DocumentEventMap>(target: Document, event: MaybeRefOrGetter<Arrayable<E>>, listener: MaybeRef<Arrayable<(this: Document, ev: DocumentEventMap[E]) => any>>, options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 4: Explicitly ShadowRoot target
 *
 * @see https://vueuse.org/useEventListener
 */
declare function useEventListener<E extends keyof ShadowRootEventMap>(target: MaybeRefOrGetter<Arrayable<ShadowRoot> | null | undefined>, event: MaybeRefOrGetter<Arrayable<E>>, listener: MaybeRef<Arrayable<(this: ShadowRoot, ev: ShadowRootEventMap[E]) => any>>, options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 5: Explicitly HTMLElement target
 *
 * @see https://vueuse.org/useEventListener
 */
declare function useEventListener<E extends keyof HTMLElementEventMap>(target: MaybeRefOrGetter<Arrayable<HTMLElement> | null | undefined>, event: MaybeRefOrGetter<Arrayable<E>>, listener: MaybeRef<(this: HTMLElement, ev: HTMLElementEventMap[E]) => any>, options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 6: Custom event target with event type infer
 *
 * @see https://vueuse.org/useEventListener
 */
declare function useEventListener<Names extends string, EventType = Event>(target: MaybeRefOrGetter<Arrayable<InferEventTarget<Names>> | null | undefined>, event: MaybeRefOrGetter<Arrayable<Names>>, listener: MaybeRef<Arrayable<GeneralEventListener<EventType>>>, options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>): Fn;
/**
 * Register using addEventListener on mounted, and removeEventListener automatically on unmounted.
 *
 * Overload 7: Custom event target fallback
 *
 * @see https://vueuse.org/useEventListener
 */
declare function useEventListener<EventType = Event>(target: MaybeRefOrGetter<Arrayable<EventTarget> | null | undefined>, event: MaybeRefOrGetter<Arrayable<string>>, listener: MaybeRef<Arrayable<GeneralEventListener<EventType>>>, options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>): Fn;
//#endregion
//#region useEventSource/index.d.ts
type EventSourceStatus = 'CONNECTING' | 'OPEN' | 'CLOSED';
interface UseEventSourceOptions<Data> extends EventSourceInit {
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
   * Immediately open the connection when calling this composable
   *
   * @default true
   */
  immediate?: boolean;
  /**
   * Automatically connect to the websocket when URL changes
   *
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Custom data serialization
   */
  serializer?: {
    read: (v?: string) => Data;
  };
}
interface UseEventSourceReturn<Events extends string[], Data = any> {
  /**
   * Reference to the latest data received via the EventSource,
   * can be watched to respond to incoming messages
   */
  data: ShallowRef<Data | null>;
  /**
   * The current state of the connection, can be only one of:
   * 'CONNECTING', 'OPEN' 'CLOSED'
   */
  status: ShallowRef<EventSourceStatus>;
  /**
   * The latest named event
   */
  event: ShallowRef<Events[number] | null>;
  /**
   * The current error
   */
  error: ShallowRef<Event | null>;
  /**
   * Closes the EventSource connection gracefully.
   */
  close: EventSource['close'];
  /**
   * Reopen the EventSource connection.
   * If there the current one is active, will close it before opening a new one.
   */
  open: Fn;
  /**
   * Reference to the current EventSource instance.
   */
  eventSource: Ref<EventSource | null>;
  /**
   * The last event ID string, for server-sent events.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/lastEventId
   */
  lastEventId: ShallowRef<string | null>;
}
/**
 * Reactive wrapper for EventSource.
 *
 * @see https://vueuse.org/useEventSource
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventSource/EventSource EventSource
 * @param url
 * @param events
 * @param options
 */
declare function useEventSource<Events extends string[], Data = any>(url: MaybeRefOrGetter<string | URL | undefined>, events?: Events, options?: UseEventSourceOptions<Data>): UseEventSourceReturn<Events, Data>;
//#endregion
//#region useEyeDropper/index.d.ts
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
interface UseEyeDropperReturn extends Supportable {
  sRGBHex: ShallowRef<string>;
  open: (openOptions?: EyeDropperOpenOptions) => Promise<{
    sRGBHex: string;
  } | undefined>;
}
/**
 * Reactive [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API)
 *
 * @see https://vueuse.org/useEyeDropper
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useEyeDropper(options?: UseEyeDropperOptions): UseEyeDropperReturn;
//#endregion
//#region useFavicon/index.d.ts
interface UseFaviconOptions extends ConfigurableDocument {
  baseUrl?: string;
  rel?: string;
}
type UseFaviconReturn = ComputedRef<string | null | undefined> | Ref<string | null | undefined>;
/**
 * Reactive favicon.
 *
 * @see https://vueuse.org/useFavicon
 * @param newIcon
 * @param options
 */
declare function useFavicon(newIcon: ReadonlyRefOrGetter<string | null | undefined>, options?: UseFaviconOptions): ComputedRef<string | null | undefined>;
declare function useFavicon(newIcon?: MaybeRef<string | null | undefined>, options?: UseFaviconOptions): Ref<string | null | undefined>;
//#endregion
//#region useFetch/index.d.ts
interface UseFetchReturn<T> {
  /**
   * Indicates if the fetch request has finished
   */
  isFinished: Readonly<ShallowRef<boolean>>;
  /**
   * The statusCode of the HTTP fetch response
   */
  statusCode: ShallowRef<number | null>;
  /**
   * The raw response of the fetch response
   */
  response: ShallowRef<Response | null>;
  /**
   * Any fetch errors that may have occurred
   */
  error: ShallowRef<any>;
  /**
   * The fetch response body on success, may either be JSON or text
   */
  data: ShallowRef<T | null>;
  /**
   * Indicates if the request is currently being fetched.
   */
  isFetching: Readonly<ShallowRef<boolean>>;
  /**
   * Indicates if the fetch request is able to be aborted
   */
  canAbort: ComputedRef<boolean>;
  /**
   * Indicates if the fetch request was aborted
   */
  aborted: ShallowRef<boolean>;
  /**
   * Abort the fetch request
   */
  abort: (reason?: any) => void;
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
  get: () => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
  post: (payload?: MaybeRefOrGetter<unknown>, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
  put: (payload?: MaybeRefOrGetter<unknown>, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
  delete: (payload?: MaybeRefOrGetter<unknown>, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
  patch: (payload?: MaybeRefOrGetter<unknown>, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
  head: (payload?: MaybeRefOrGetter<unknown>, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
  options: (payload?: MaybeRefOrGetter<unknown>, type?: string) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
  json: <JSON = any>() => UseFetchReturn<JSON> & PromiseLike<UseFetchReturn<JSON>>;
  text: () => UseFetchReturn<string> & PromiseLike<UseFetchReturn<string>>;
  blob: () => UseFetchReturn<Blob> & PromiseLike<UseFetchReturn<Blob>>;
  arrayBuffer: () => UseFetchReturn<ArrayBuffer> & PromiseLike<UseFetchReturn<ArrayBuffer>>;
  formData: () => UseFetchReturn<FormData> & PromiseLike<UseFetchReturn<FormData>>;
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
  context: BeforeFetchContext;
  execute: (throwOnFailed?: boolean) => Promise<any>;
}
interface OnFetchErrorContext<T = any, E = any> {
  error: E;
  data: T | null;
  response: Response | null;
  context: BeforeFetchContext;
  execute: (throwOnFailed?: boolean) => Promise<any>;
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
  refetch?: MaybeRefOrGetter<boolean>;
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
   * Allow update the `data` ref when fetch error whenever provided, or mutated in the `onFetchError` callback
   *
   * @default false
   */
  updateDataOnError?: boolean;
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
  onFetchError?: (ctx: OnFetchErrorContext) => Promise<Partial<OnFetchErrorContext>> | Partial<OnFetchErrorContext>;
}
interface CreateFetchOptions {
  /**
   * The base URL that will be prefixed to all urls unless urls are absolute
   */
  baseUrl?: MaybeRefOrGetter<string>;
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
declare function useFetch<T>(url: MaybeRefOrGetter<string>): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
declare function useFetch<T>(url: MaybeRefOrGetter<string>, useFetchOptions: UseFetchOptions): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
declare function useFetch<T>(url: MaybeRefOrGetter<string>, options: RequestInit, useFetchOptions?: UseFetchOptions): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>;
//#endregion
//#region useFileDialog/index.d.ts
interface UseFileDialogOptions extends ConfigurableDocument {
  /**
   * @default true
   */
  multiple?: MaybeRef<boolean>;
  /**
   * @default '*'
   */
  accept?: MaybeRef<string>;
  /**
   * Select the input source for the capture file.
   * @see [HTMLInputElement Capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture)
   */
  capture?: MaybeRef<string>;
  /**
   * Reset when open file dialog.
   * @default false
   */
  reset?: MaybeRef<boolean>;
  /**
   * Select directories instead of files.
   * @see [HTMLInputElement webkitdirectory](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory)
   * @default false
   */
  directory?: MaybeRef<boolean>;
  /**
   * Initial files to set.
   * @default null
   */
  initialFiles?: Array<File> | FileList;
  /**
   * The input element to use for file dialog.
   * @default document.createElement('input')
   */
  input?: MaybeElementRef<HTMLInputElement>;
}
interface UseFileDialogReturn {
  files: Ref<FileList | null>;
  open: (localOptions?: Partial<UseFileDialogOptions>) => void;
  reset: () => void;
  onChange: EventHookOn<FileList | null>;
  onCancel: EventHookOn;
}
/**
 * Open file dialog with ease.
 *
 * @see https://vueuse.org/useFileDialog
 * @param options
 */
declare function useFileDialog(options?: UseFileDialogOptions): UseFileDialogReturn;
//#endregion
//#region useFileSystemAccess/index.d.ts
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
  dataType?: MaybeRefOrGetter<'Text' | 'ArrayBuffer' | 'Blob'>;
};
/**
 * Create and read and write local files.
 * @see https://vueuse.org/useFileSystemAccess
 */
declare function useFileSystemAccess(): UseFileSystemAccessReturn<string | ArrayBuffer | Blob>;
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
interface UseFileSystemAccessReturn<T = string> extends Supportable {
  data: ShallowRef<T | undefined>;
  file: ShallowRef<File | undefined>;
  fileName: ComputedRef<string>;
  fileMIME: ComputedRef<string>;
  fileSize: ComputedRef<number>;
  fileLastModified: ComputedRef<number>;
  open: (_options?: UseFileSystemAccessCommonOptions) => Awaitable<void>;
  create: (_options?: UseFileSystemAccessShowSaveFileOptions) => Awaitable<void>;
  save: (_options?: UseFileSystemAccessShowSaveFileOptions) => Awaitable<void>;
  saveAs: (_options?: UseFileSystemAccessShowSaveFileOptions) => Awaitable<void>;
  updateData: () => Awaitable<void>;
}
//#endregion
//#region useFocus/index.d.ts
interface UseFocusOptions extends ConfigurableWindow {
  /**
   * Initial value. If set true, then focus will be set on the target
   *
   * @default false
   */
  initialValue?: boolean;
  /**
   * Replicate the :focus-visible behavior of CSS
   *
   * @default false
   */
  focusVisible?: boolean;
  /**
   * Prevent scrolling to the element when it is focused.
   *
   * @default false
   */
  preventScroll?: boolean;
}
interface UseFocusReturn {
  /**
   * If read as true, then the element has focus. If read as false, then the element does not have focus
   * If set to true, then the element will be focused. If set to false, the element will be blurred.
   */
  focused: WritableComputedRef<boolean>;
}
/**
 * Track or set the focus state of a DOM element.
 *
 * @see https://vueuse.org/useFocus
 * @param target The target element for the focus and blur events.
 * @param options
 */
declare function useFocus(target: MaybeElementRef, options?: UseFocusOptions): UseFocusReturn;
//#endregion
//#region useFocusWithin/index.d.ts
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
//#endregion
//#region useFps/index.d.ts
interface UseFpsOptions {
  /**
   * Calculate the FPS on every x frames.
   * @default 10
   */
  every?: number;
}
declare function useFps(options?: UseFpsOptions): ShallowRef<number>;
//#endregion
//#region useFullscreen/index.d.ts
interface UseFullscreenOptions extends ConfigurableDocument {
  /**
   * Automatically exit fullscreen when component is unmounted
   *
   * @default false
   */
  autoExit?: boolean;
}
interface UseFullscreenReturn extends Supportable {
  isFullscreen: ShallowRef<boolean>;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => Promise<void>;
}
/**
 * Reactive Fullscreen API.
 *
 * @see https://vueuse.org/useFullscreen
 * @param target
 * @param options
 */
declare function useFullscreen(target?: MaybeElementRef, options?: UseFullscreenOptions): UseFullscreenReturn;
//#endregion
//#region useGamepad/index.d.ts
interface UseGamepadOptions extends ConfigurableWindow, ConfigurableNavigator {}
interface UseGamepadReturn extends Supportable, Pausable {
  onConnected: EventHookOn<number>;
  onDisconnected: EventHookOn<number>;
  gamepads: Ref<Gamepad[]>;
}
/**
 * Maps a standard standard gamepad to an Xbox 360 Controller.
 */
declare function mapGamepadToXbox360Controller(gamepad: Ref<Gamepad | undefined>): vue0.ComputedRef<{
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
declare function useGamepad(options?: UseGamepadOptions): UseGamepadReturn;
//#endregion
//#region useGeolocation/index.d.ts
interface UseGeolocationOptions extends Partial<PositionOptions>, ConfigurableNavigator {
  immediate?: boolean;
}
interface UseGeolocationReturn extends Supportable {
  coords: Ref<Omit<GeolocationPosition['coords'], 'toJSON'>>;
  locatedAt: ShallowRef<number | null>;
  error: ShallowRef<GeolocationPositionError | null>;
  resume: () => void;
  pause: () => void;
}
/**
 * Reactive Geolocation API.
 *
 * @see https://vueuse.org/useGeolocation
 * @param options
 */
declare function useGeolocation(options?: UseGeolocationOptions): UseGeolocationReturn;
//#endregion
//#region useIdle/index.d.ts
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
interface UseIdleReturn extends Stoppable {
  idle: ShallowRef<boolean>;
  lastActive: ShallowRef<number>;
  reset: () => void;
}
/**
 * Tracks whether the user is being inactive.
 *
 * @see https://vueuse.org/useIdle
 * @param timeout default to 1 minute
 * @param options IdleOptions
 */
declare function useIdle(timeout?: number, options?: UseIdleOptions): UseIdleReturn;
//#endregion
//#region useImage/index.d.ts
interface UseImageOptions {
  /** Address of the resource */
  src: string;
  /** Images to use in different situations, e.g., high-resolution displays, small monitors, etc. */
  srcset?: string;
  /** Image sizes for different page layouts */
  sizes?: string;
  /** Image alternative information */
  alt?: string;
  /** Image classes */
  class?: string;
  /** Image loading */
  loading?: HTMLImageElement['loading'];
  /** Image CORS settings */
  crossorigin?: string;
  /** Referrer policy for fetch https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy */
  referrerPolicy?: HTMLImageElement['referrerPolicy'];
  /** Image width */
  width?: HTMLImageElement['width'];
  /** Image height */
  height?: HTMLImageElement['height'];
  /** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#decoding */
  decoding?: HTMLImageElement['decoding'];
  /** Provides a hint of the relative priority to use when fetching the image */
  fetchPriority?: HTMLImageElement['fetchPriority'];
  /** Provides a hint of the importance of the image */
  ismap?: HTMLImageElement['isMap'];
  /** The partial URL (starting with #) of an image map associated with the element */
  usemap?: HTMLImageElement['useMap'];
}
type UseImageReturn = UseAsyncStateReturn<HTMLImageElement | undefined, any[], true>;
/**
 * Reactive load an image in the browser, you can wait the result to display it or show a fallback.
 *
 * @see https://vueuse.org/useImage
 * @param options Image attributes, as used in the <img> tag
 * @param asyncStateOptions
 */
declare function useImage<Shallow extends true>(options: MaybeRefOrGetter<UseImageOptions>, asyncStateOptions?: UseAsyncStateOptions<Shallow>): UseImageReturn;
//#endregion
//#region useScroll/index.d.ts
interface UseScrollOptions extends ConfigurableWindow {
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
   * Use MutationObserver to monitor specific DOM changes,
   * such as attribute modifications, child node additions or removals, or subtree changes.
   * @default { mutation: boolean }
   */
  observe?: boolean | {
    mutation?: boolean;
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
  behavior?: MaybeRefOrGetter<ScrollBehavior>;
  /**
   * On error callback
   *
   * Default log error to `console.error`
   */
  onError?: (error: unknown) => void;
}
interface UseScrollReturn {
  x: WritableComputedRef<number>;
  y: WritableComputedRef<number>;
  isScrolling: ShallowRef<boolean>;
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
  measure: () => void;
}
/**
 * Reactive scroll.
 *
 * @see https://vueuse.org/useScroll
 * @param element
 * @param options
 */
declare function useScroll(element: MaybeRefOrGetter<HTMLElement | SVGElement | Window | Document | null | undefined>, options?: UseScrollOptions): UseScrollReturn;
//#endregion
//#region useInfiniteScroll/index.d.ts
type InfiniteScrollElement = HTMLElement | SVGElement | Window | Document | null | undefined;
interface UseInfiniteScrollOptions<T extends InfiniteScrollElement = InfiniteScrollElement> extends UseScrollOptions {
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
   * The interval time between two load more (to avoid too many invokes).
   *
   * @default 100
   */
  interval?: number;
  /**
   * A function that determines whether more content can be loaded for a specific element.
   * Should return `true` if loading more content is allowed for the given element,
   * and `false` otherwise.
   */
  canLoadMore?: (el: T) => boolean;
}
interface UseInfiniteScrollReturn {
  isLoading: ComputedRef<boolean>;
  reset: () => void;
}
/**
 * Reactive infinite scroll.
 *
 * @see https://vueuse.org/useInfiniteScroll
 */
declare function useInfiniteScroll<T extends InfiniteScrollElement>(element: MaybeRefOrGetter<T>, onLoadMore: (state: UnwrapNestedRefs<UseScrollReturn>) => Awaitable<void>, options?: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn;
//#endregion
//#region useKeyModifier/index.d.ts
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
type UseKeyModifierReturn<Initial> = ShallowRef<Initial extends boolean ? boolean : boolean | null>;
declare function useKeyModifier<Initial extends boolean | null>(modifier: KeyModifier, options?: UseModifierOptions<Initial>): UseKeyModifierReturn<Initial>;
//#endregion
//#region useLocalStorage/index.d.ts
declare function useLocalStorage(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<string>, options?: UseStorageOptions<string>): RemovableRef<string>;
declare function useLocalStorage(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<boolean>, options?: UseStorageOptions<boolean>): RemovableRef<boolean>;
declare function useLocalStorage(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<number>, options?: UseStorageOptions<number>): RemovableRef<number>;
declare function useLocalStorage<T>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
declare function useLocalStorage<T = unknown>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, options?: UseStorageOptions<T>): RemovableRef<T>;
//#endregion
//#region useMagicKeys/aliasMap.d.ts
declare const DefaultMagicKeysAliasMap: Readonly<Record<string, string>>;
//#endregion
//#region useMagicKeys/index.d.ts
interface UseMagicKeysOptions<Reactive extends boolean> {
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
  target?: MaybeRefOrGetter<EventTarget>;
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
type UseMagicKeysReturn<Reactive extends boolean> = Readonly<Record<string, Reactive extends true ? boolean : ComputedRef<boolean>> & MagicKeysInternal>;
/**
 * Reactive keys pressed state, with magical keys combination support.
 *
 * @see https://vueuse.org/useMagicKeys
 */
declare function useMagicKeys<T extends boolean = false>(options?: UseMagicKeysOptions<T>): UseMagicKeysReturn<T>;
//#endregion
//#region useMediaControls/index.d.ts
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
  /**
   * Specifies the media query for the resource's intended media.
   */
  media?: string;
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
  src?: MaybeRefOrGetter<string | UseMediaSource | UseMediaSource[]>;
  /**
   * A list of text tracks for the media
   */
  tracks?: MaybeRefOrGetter<UseMediaTextTrackSource[]>;
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
interface UseMediaControlsReturn {
  currentTime: ShallowRef<number>;
  duration: ShallowRef<number>;
  waiting: ShallowRef<boolean>;
  seeking: ShallowRef<boolean>;
  ended: ShallowRef<boolean>;
  stalled: ShallowRef<boolean>;
  buffered: Ref<[number, number][]>;
  playing: ShallowRef<boolean>;
  rate: ShallowRef<number>;
  volume: ShallowRef<number>;
  muted: ShallowRef<boolean>;
  tracks: Ref<UseMediaTextTrack[]>;
  selectedTrack: ShallowRef<number>;
  enableTrack: (track: number | UseMediaTextTrack, disableTracks?: boolean) => void;
  disableTrack: (track?: number | UseMediaTextTrack) => void;
  supportsPictureInPicture: boolean;
  togglePictureInPicture: () => Promise<PictureInPictureWindow | void>;
  isPictureInPicture: ShallowRef<boolean>;
  onSourceError: EventHookOn<Event>;
  onPlaybackError: EventHookOn<Event>;
}
declare function useMediaControls(target: MaybeRef<HTMLMediaElement | null | undefined>, options?: UseMediaControlsOptions): UseMediaControlsReturn;
//#endregion
//#region useMediaQuery/index.d.ts
/**
 * Reactive Media Query.
 *
 * @see https://vueuse.org/useMediaQuery
 * @param query
 * @param options
 */
declare function useMediaQuery(query: MaybeRefOrGetter<string>, options?: ConfigurableWindow & {
  ssrWidth?: number;
}): vue0.ComputedRef<boolean>;
//#endregion
//#region useMemoize/index.d.ts
type CacheKey = any;
/**
 * Custom memoize cache handler
 */
interface UseMemoizeCache<Key, Value> {
  /**
   * Get value for key
   */
  get: (key: Key) => Value | undefined;
  /**
   * Set value for key
   */
  set: (key: Key, value: Value) => void;
  /**
   * Return flag if key exists
   */
  has: (key: Key) => boolean;
  /**
   * Delete value for key
   */
  delete: (key: Key) => void;
  /**
   * Clear cache
   */
  clear: () => void;
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
  load: (...args: Args) => Result;
  /**
   * Delete cache of given arguments
   */
  delete: (...args: Args) => void;
  /**
   * Clear cache
   */
  clear: () => void;
  /**
   * Generate cache key for given arguments
   */
  generateKey: (...args: Args) => CacheKey;
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useMemoize<Result, Args extends unknown[]>(resolver: (...args: Args) => Result, options?: UseMemoizeOptions<Result, Args>): UseMemoizeReturn<Result, Args>;
//#endregion
//#region useMemory/index.d.ts
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
interface UseMemoryOptions extends ConfigurableScheduler {
  /**
   * Start the timer immediately
   *
   * @deprecated Please use `scheduler` option instead
   * @default true
   */
  immediate?: boolean;
  /**
   * Execute the callback immediately after calling `resume`
   *
   * @deprecated Please use `scheduler` option instead
   * @default false
   */
  immediateCallback?: boolean;
  /** @deprecated Please use `scheduler` option instead */
  interval?: number;
}
interface UseMemoryReturn extends Supportable {
  memory: Ref<MemoryInfo | undefined>;
}
/**
 * Reactive Memory Info.
 *
 * @see https://vueuse.org/useMemory
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useMemory(options?: UseMemoryOptions): UseMemoryReturn;
//#endregion
//#region useMounted/index.d.ts
/**
 * Mounted state in ref.
 *
 * @see https://vueuse.org/useMounted
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useMounted(): vue0.ShallowRef<boolean, boolean>;
//#endregion
//#region useMouse/index.d.ts
type UseMouseCoordType = 'page' | 'client' | 'screen' | 'movement';
type UseMouseSourceType = 'mouse' | 'touch' | null;
type UseMouseEventExtractor = (event: MouseEvent | Touch) => [x: number, y: number] | null | undefined;
interface UseMouseOptions extends ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Mouse position based by page, client, screen, or relative to previous position
   *
   * @default 'page'
   */
  type?: UseMouseCoordType | UseMouseEventExtractor;
  /**
   * Listen events on `target` element
   *
   * @default 'Window'
   */
  target?: MaybeRefOrGetter<Window | EventTarget | null | undefined>;
  /**
   * Listen to `touchmove` events
   *
   * @default true
   */
  touch?: boolean;
  /**
   * Listen to `scroll` events on window, only effective on type `page`
   *
   * @default true
   */
  scroll?: boolean;
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
interface UseMouseReturn {
  x: ShallowRef<number>;
  y: ShallowRef<number>;
  sourceType: ShallowRef<UseMouseSourceType>;
}
/**
 * Reactive mouse position.
 *
 * @see https://vueuse.org/useMouse
 * @param options
 */
declare function useMouse(options?: UseMouseOptions): UseMouseReturn;
//#endregion
//#region useMouseInElement/index.d.ts
interface MouseInElementOptions extends UseMouseOptions {
  /**
   * Whether to handle mouse events when the cursor is outside the target element.
   * When enabled, mouse position will continue to be tracked even when outside the element bounds.
   *
   * @default true
   */
  handleOutside?: boolean;
  /**
   * Listen to window resize event
   *
   * @default true
   */
  windowScroll?: boolean;
  /**
   * Listen to window scroll event
   *
   * @default true
   */
  windowResize?: boolean;
}
interface UseMouseInElementReturn extends UseMouseReturn {
  elementX: ShallowRef<number>;
  elementY: ShallowRef<number>;
  elementPositionX: ShallowRef<number>;
  elementPositionY: ShallowRef<number>;
  elementHeight: ShallowRef<number>;
  elementWidth: ShallowRef<number>;
  isOutside: ShallowRef<boolean>;
  stop: () => void;
}
/**
 * Reactive mouse position related to an element.
 *
 * @see https://vueuse.org/useMouseInElement
 * @param target
 * @param options
 */
declare function useMouseInElement(target?: MaybeElementRef, options?: MouseInElementOptions): {
  x: ShallowRef<number>;
  y: ShallowRef<number>;
  sourceType: ShallowRef<UseMouseSourceType>;
  elementX: ShallowRef<number, number>;
  elementY: ShallowRef<number, number>;
  elementPositionX: ShallowRef<number, number>;
  elementPositionY: ShallowRef<number, number>;
  elementHeight: ShallowRef<number, number>;
  elementWidth: ShallowRef<number, number>;
  isOutside: ShallowRef<boolean, boolean>;
  stop: () => void;
};
//#endregion
//#region useMousePressed/index.d.ts
interface UseMousePressedOptions extends ConfigurableWindow {
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
   * Add event listeners with the `capture` option set to `true`
   * (see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture))
   *
   * @default false
   */
  capture?: boolean;
  /**
   * Initial values
   *
   * @default false
   */
  initialValue?: boolean;
  /**
   * Element target to be capture the click
   */
  target?: MaybeComputedElementRef;
  /**
   * Callback to be called when the mouse is pressed
   *
   * @param event
   */
  onPressed?: (event: MouseEvent | TouchEvent | DragEvent) => void;
  /**
   * Callback to be called when the mouse is released
   *
   * @param event
   */
  onReleased?: (event: MouseEvent | TouchEvent | DragEvent) => void;
}
/** @deprecated use {@link UseMousePressedOptions} instead */
type MousePressedOptions = UseMousePressedOptions;
interface UseMousePressedReturn {
  pressed: ShallowRef<boolean>;
  sourceType: ShallowRef<UseMouseSourceType>;
}
/**
 * Reactive mouse pressing state.
 *
 * @see https://vueuse.org/useMousePressed
 * @param options
 */
declare function useMousePressed(options?: UseMousePressedOptions): UseMousePressedReturn;
//#endregion
//#region useMutationObserver/index.d.ts
interface UseMutationObserverOptions extends MutationObserverInit, ConfigurableWindow {}
interface UseMutationObserverReturn extends Supportable {
  stop: () => void;
  takeRecords: () => MutationRecord[] | undefined;
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
declare function useMutationObserver(target: MaybeComputedElementRef | MaybeComputedElementRef[] | MaybeRefOrGetter<MaybeElement[]>, callback: MutationCallback, options?: UseMutationObserverOptions): UseMutationObserverReturn;
//#endregion
//#region useNavigatorLanguage/index.d.ts
interface NavigatorLanguageState extends Supportable {
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
  language: ShallowRef<string | undefined>;
}
interface UseNavigatorLanguageOptions extends ConfigurableWindow {}
type UseNavigatorLanguageReturn = Readonly<NavigatorLanguageState>;
/**
 *
 * Reactive useNavigatorLanguage
 *
 * Detects the currently selected user language and returns a reactive language
 * @see https://vueuse.org/useNavigatorLanguage
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useNavigatorLanguage(options?: UseNavigatorLanguageOptions): UseNavigatorLanguageReturn;
//#endregion
//#region useNetwork/index.d.ts
interface UseNetworkOptions extends ConfigurableWindow {}
type NetworkType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | undefined;
interface NetworkState extends Supportable {
  /**
   * If the user is currently connected.
   */
  isOnline: Readonly<ShallowRef<boolean>>;
  /**
   * The time since the user was last connected.
   */
  offlineAt: Readonly<ShallowRef<number | undefined>>;
  /**
   * At this time, if the user is offline and reconnects
   */
  onlineAt: Readonly<ShallowRef<number | undefined>>;
  /**
   * The download speed in Mbps.
   */
  downlink: Readonly<ShallowRef<number | undefined>>;
  /**
   * The max reachable download speed in Mbps.
   */
  downlinkMax: Readonly<ShallowRef<number | undefined>>;
  /**
   * The detected effective speed type.
   */
  effectiveType: Readonly<ShallowRef<NetworkEffectiveType | undefined>>;
  /**
   * The estimated effective round-trip time of the current connection.
   */
  rtt: Readonly<ShallowRef<number | undefined>>;
  /**
   * If the user activated data saver mode.
   */
  saveData: Readonly<ShallowRef<boolean | undefined>>;
  /**
   * The detected connection/network type.
   */
  type: Readonly<ShallowRef<NetworkType>>;
}
type UseNetworkReturn = Readonly<NetworkState>;
/**
 * Reactive Network status.
 *
 * @see https://vueuse.org/useNetwork
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useNetwork(options?: UseNetworkOptions): UseNetworkReturn;
//#endregion
//#region useNow/index.d.ts
interface UseNowOptions<Controls extends boolean> extends ConfigurableScheduler {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls;
  /**
   * Start the clock immediately
   *
   * @deprecated Please use `scheduler` option instead
   * @default true
   */
  immediate?: boolean;
  /**
   * Update interval in milliseconds, or use requestAnimationFrame
   *
   * @deprecated Please use `scheduler` option instead
   * @default requestAnimationFrame
   */
  interval?: 'requestAnimationFrame' | number;
}
type UseNowReturn<Controls extends boolean> = Controls extends true ? ({
  now: Ref<Date>;
} & Pausable) : Ref<Date>;
/**
 * Reactive current Date instance.
 *
 * @see https://vueuse.org/useNow
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useNow(options?: UseNowOptions<false>): Ref<Date>;
declare function useNow(options: UseNowOptions<true>): {
  now: Ref<Date>;
} & Pausable;
//#endregion
//#region useObjectUrl/index.d.ts
/**
 * Reactive URL representing an object.
 *
 * @see https://vueuse.org/useObjectUrl
 * @param object
 */
declare function useObjectUrl(object: MaybeRefOrGetter<Blob | MediaSource | null | undefined>): Readonly<vue0.Ref<string | undefined, string | undefined>>;
//#endregion
//#region useOffsetPagination/index.d.ts
interface UseOffsetPaginationOptions {
  /**
   * Total number of items.
   */
  total?: MaybeRefOrGetter<number>;
  /**
   * The number of items to display per page.
   * @default 10
   */
  pageSize?: MaybeRefOrGetter<number>;
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
//#endregion
//#region useOnline/index.d.ts
/**
 * Reactive online state.
 *
 * @see https://vueuse.org/useOnline
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useOnline(options?: ConfigurableWindow): Readonly<vue0.ShallowRef<boolean>>;
//#endregion
//#region usePageLeave/index.d.ts
interface UsePageLeaveOptions extends ConfigurableWindow {}
type UsePageLeaveReturn = ShallowRef<boolean>;
/**
 * Reactive state to show whether mouse leaves the page.
 *
 * @see https://vueuse.org/usePageLeave
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePageLeave(options?: UsePageLeaveOptions): UsePageLeaveReturn;
//#endregion
//#region useParallax/index.d.ts
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
//#endregion
//#region useParentElement/index.d.ts
declare function useParentElement(element?: MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>): Readonly<ShallowRef<HTMLElement | SVGElement | null | undefined>>;
//#endregion
//#region usePerformanceObserver/index.d.ts
type UsePerformanceObserverOptions = PerformanceObserverInit & ConfigurableWindow & {
  /**
   * Start the observer immediate.
   *
   * @default true
   */
  immediate?: boolean;
};
/**
 * Observe performance metrics.
 *
 * @see https://vueuse.org/usePerformanceObserver
 * @param options
 */
declare function usePerformanceObserver(options: UsePerformanceObserverOptions, callback: PerformanceObserverCallback): {
  isSupported: UseSupportedReturn;
  start: () => void;
  stop: () => void;
};
//#endregion
//#region usePermission/index.d.ts
type DescriptorNamePolyfill = 'accelerometer' | 'accessibility-events' | 'ambient-light-sensor' | 'background-sync' | 'camera' | 'clipboard-read' | 'clipboard-write' | 'gyroscope' | 'magnetometer' | 'microphone' | 'notifications' | 'payment-handler' | 'persistent-storage' | 'push' | 'speaker' | 'local-fonts';
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
type UsePermissionReturn = Readonly<ShallowRef<PermissionState | undefined>>;
interface UsePermissionReturnWithControls extends Supportable {
  state: UsePermissionReturn;
  query: () => Promise<PermissionStatus | undefined>;
}
/**
 * Reactive Permissions API.
 *
 * @see https://vueuse.org/usePermission
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePermission(permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'], options?: UsePermissionOptions<false>): UsePermissionReturn;
declare function usePermission(permissionDesc: GeneralPermissionDescriptor | GeneralPermissionDescriptor['name'], options: UsePermissionOptions<true>): UsePermissionReturnWithControls;
//#endregion
//#region usePointer/index.d.ts
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
interface UsePointerReturn {
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
  isInside: ShallowRef<boolean>;
}
/**
 * Reactive pointer state.
 *
 * @see https://vueuse.org/usePointer
 * @param options
 */
declare function usePointer(options?: UsePointerOptions): UsePointerReturn;
//#endregion
//#region usePointerLock/index.d.ts
interface UsePointerLockOptions extends ConfigurableDocument {}
interface UsePointerLockReturn extends Supportable {
  element: ShallowRef<MaybeElement>;
  triggerElement: ShallowRef<MaybeElement>;
  lock: (e: MaybeElementRef | Event) => Promise<MaybeElement>;
  unlock: () => Promise<boolean>;
}
/**
 * Reactive pointer lock.
 *
 * @see https://vueuse.org/usePointerLock
 * @param target
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePointerLock(target?: MaybeElementRef, options?: UsePointerLockOptions): UsePointerLockReturn;
//#endregion
//#region useSwipe/index.d.ts
type UseSwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none';
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
  onSwipeEnd?: (e: TouchEvent, direction: UseSwipeDirection) => void;
}
interface UseSwipeReturn {
  isSwiping: ShallowRef<boolean>;
  direction: ComputedRef<UseSwipeDirection>;
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
declare function useSwipe(target: MaybeRefOrGetter<EventTarget | null | undefined>, options?: UseSwipeOptions): UseSwipeReturn;
//#endregion
//#region usePointerSwipe/index.d.ts
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
  onSwipeEnd?: (e: PointerEvent, direction: UseSwipeDirection) => void;
  /**
   * Pointer types to listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[];
  /**
   * Disable text selection on swipe.
   *
   * @default false
   */
  disableTextSelect?: boolean;
}
interface UsePointerSwipeReturn {
  readonly isSwiping: ShallowRef<boolean>;
  direction: Readonly<ShallowRef<UseSwipeDirection>>;
  readonly posStart: Position;
  readonly posEnd: Position;
  distanceX: Readonly<ComputedRef<number>>;
  distanceY: Readonly<ComputedRef<number>>;
  stop: () => void;
}
/**
 * Reactive swipe detection based on PointerEvents.
 *
 * @see https://vueuse.org/usePointerSwipe
 * @param target
 * @param options
 */
declare function usePointerSwipe(target: MaybeRefOrGetter<HTMLElement | null | undefined>, options?: UsePointerSwipeOptions): UsePointerSwipeReturn;
//#endregion
//#region usePreferredColorScheme/index.d.ts
type ColorSchemeType = 'dark' | 'light' | 'no-preference';
/**
 * Reactive prefers-color-scheme media query.
 *
 * @see https://vueuse.org/usePreferredColorScheme
 * @param [options]
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePreferredColorScheme(options?: ConfigurableWindow): vue0.ComputedRef<ColorSchemeType>;
//#endregion
//#region usePreferredContrast/index.d.ts
type ContrastType = 'more' | 'less' | 'custom' | 'no-preference';
/**
 * Reactive prefers-contrast media query.
 *
 * @see https://vueuse.org/usePreferredContrast
 * @param [options]
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePreferredContrast(options?: ConfigurableWindow): vue0.ComputedRef<ContrastType>;
//#endregion
//#region usePreferredDark/index.d.ts
/**
 * Reactive dark theme preference.
 *
 * @see https://vueuse.org/usePreferredDark
 * @param [options]
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePreferredDark(options?: ConfigurableWindow): vue0.ComputedRef<boolean>;
//#endregion
//#region usePreferredLanguages/index.d.ts
/**
 * Reactive Navigator Languages.
 *
 * @see https://vueuse.org/usePreferredLanguages
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePreferredLanguages(options?: ConfigurableWindow): ShallowRef<readonly string[]>;
//#endregion
//#region usePreferredReducedMotion/index.d.ts
type ReducedMotionType = 'reduce' | 'no-preference';
/**
 * Reactive prefers-reduced-motion media query.
 *
 * @see https://vueuse.org/usePreferredReducedMotion
 * @param [options]
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePreferredReducedMotion(options?: ConfigurableWindow): vue0.ComputedRef<ReducedMotionType>;
//#endregion
//#region usePreferredReducedTransparency/index.d.ts
type ReducedTransparencyType = 'reduce' | 'no-preference';
/**
 * Reactive prefers-reduced-transparency media query.
 *
 * @see https://vueuse.org/usePreferredReducedTransparency
 * @param [options]
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function usePreferredReducedTransparency(options?: ConfigurableWindow): vue0.ComputedRef<ReducedTransparencyType>;
//#endregion
//#region usePrevious/index.d.ts
/**
 * Holds the previous value of a ref.
 *
 * @see   {@link https://vueuse.org/usePrevious}
 */
declare function usePrevious<T>(value: MaybeRefOrGetter<T>): Readonly<ShallowRef<T | undefined>>;
declare function usePrevious<T>(value: MaybeRefOrGetter<T>, initialValue: T): Readonly<ShallowRef<T>>;
//#endregion
//#region useRafFn/index.d.ts
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
  /**
   * The maximum frame per second to execute the function.
   * Set to `null` to disable the limit.
   *
   * @default null
   */
  fpsLimit?: MaybeRefOrGetter<number | null>;
  /**
   * After the requestAnimationFrame loop executed once, it will be automatically stopped.
   *
   * @default false
   */
  once?: boolean;
}
/**
 * Call function on every `requestAnimationFrame`. With controls of pausing and resuming.
 *
 * @see https://vueuse.org/useRafFn
 * @param fn
 * @param options
 */
declare function useRafFn(fn: (args: UseRafFnCallbackArguments) => void, options?: UseRafFnOptions): Pausable;
//#endregion
//#region useSSRWidth/index.d.ts
declare function useSSRWidth(): number | undefined;
declare function provideSSRWidth(width: number | null, app?: App<unknown>): void;
//#endregion
//#region useScreenOrientation/index.d.ts
type OrientationType = 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary';
type OrientationLockType = 'any' | 'natural' | 'landscape' | 'portrait' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary';
interface ScreenOrientation extends EventTarget {
  lock: (orientation: OrientationLockType) => Promise<void>;
  unlock: () => void;
  readonly type: OrientationType;
  readonly angle: number;
  addEventListener: (type: 'change', listener: (this: this, ev: Event) => any, useCapture?: boolean) => void;
}
interface UseScreenOrientationOptions extends ConfigurableWindow {}
interface UseScreenOrientationReturn extends Supportable {
  orientation: Ref<OrientationType | undefined>;
  angle: ShallowRef<number>;
  lockOrientation: (type: OrientationLockType) => Promise<void>;
  unlockOrientation: () => void;
}
/**
 * Reactive screen orientation
 *
 * @see https://vueuse.org/useScreenOrientation
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useScreenOrientation(options?: UseScreenOrientationOptions): UseScreenOrientationReturn;
//#endregion
//#region useScreenSafeArea/index.d.ts
interface UseScreenSafeAreaReturn {
  top: ShallowRef<string>;
  right: ShallowRef<string>;
  bottom: ShallowRef<string>;
  left: ShallowRef<string>;
  update: () => void;
}
/**
 * Reactive `env(safe-area-inset-*)`
 *
 * @see https://vueuse.org/useScreenSafeArea
 */
declare function useScreenSafeArea(): UseScreenSafeAreaReturn;
//#endregion
//#region useScriptTag/index.d.ts
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
  /**
   * Nonce value for CSP (Content Security Policy)
   * @default undefined
   */
  nonce?: string;
}
interface UseScriptTagReturn {
  scriptTag: ShallowRef<HTMLScriptElement | null>;
  load: (waitForScriptLoad?: boolean) => Promise<HTMLScriptElement | boolean>;
  unload: () => void;
}
/**
 * Async script tag loading.
 *
 * @see https://vueuse.org/useScriptTag
 * @param src
 * @param onLoaded
 * @param options
 */
declare function useScriptTag(src: MaybeRefOrGetter<string>, onLoaded?: (el: HTMLScriptElement) => void, options?: UseScriptTagOptions): UseScriptTagReturn;
//#endregion
//#region useScrollLock/index.d.ts
/**
 * Lock scrolling of the element.
 *
 * @see https://vueuse.org/useScrollLock
 * @param element
 */
declare function useScrollLock(element: MaybeRefOrGetter<HTMLElement | SVGElement | Window | Document | null | undefined>, initialState?: boolean): vue0.WritableComputedRef<boolean, boolean>;
//#endregion
//#region useSessionStorage/index.d.ts
declare function useSessionStorage(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<string>, options?: UseStorageOptions<string>): RemovableRef<string>;
declare function useSessionStorage(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<boolean>, options?: UseStorageOptions<boolean>): RemovableRef<boolean>;
declare function useSessionStorage(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<number>, options?: UseStorageOptions<number>): RemovableRef<number>;
declare function useSessionStorage<T>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseStorageOptions<T>): RemovableRef<T>;
declare function useSessionStorage<T = unknown>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, options?: UseStorageOptions<T>): RemovableRef<T>;
//#endregion
//#region useShare/index.d.ts
interface UseShareOptions {
  title?: string;
  files?: File[];
  text?: string;
  url?: string;
}
interface UseShareReturn extends Supportable {
  share: (overrideOptions?: MaybeRefOrGetter<UseShareOptions>) => Promise<void>;
}
/**
 * Reactive Web Share API.
 *
 * @see https://vueuse.org/useShare
 * @param shareOptions
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useShare(shareOptions?: MaybeRefOrGetter<UseShareOptions>, options?: ConfigurableNavigator): UseShareReturn;
//#endregion
//#region useSorted/index.d.ts
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
/**
 * reactive sort array
 *
 * @see https://vueuse.org/useSorted
 */
declare function useSorted<T = any>(source: MaybeRefOrGetter<T[]>, compareFn?: UseSortedCompareFn<T>): Ref<T[]>;
declare function useSorted<T = any>(source: MaybeRefOrGetter<T[]>, options?: UseSortedOptions<T>): Ref<T[]>;
declare function useSorted<T = any>(source: MaybeRefOrGetter<T[]>, compareFn?: UseSortedCompareFn<T>, options?: Omit<UseSortedOptions<T>, 'compareFn'>): Ref<T[]>;
//#endregion
//#region useSpeechRecognition/types.d.ts
type SpeechRecognitionErrorCode = 'aborted' | 'audio-capture' | 'bad-grammar' | 'language-not-supported' | 'network' | 'no-speech' | 'not-allowed' | 'service-not-allowed';
interface SpeechGrammar {
  src: string;
  weight: number;
}
interface SpeechGrammarList {
  readonly length: number;
  addFromString: (string: string, weight?: number) => void;
  addFromURI: (src: string, weight?: number) => void;
  item: (index: number) => SpeechGrammar;
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
  audioend: Event;
  audiostart: Event;
  end: Event;
  error: SpeechRecognitionErrorEvent;
  nomatch: SpeechRecognitionEvent;
  result: SpeechRecognitionEvent;
  soundend: Event;
  soundstart: Event;
  speechend: Event;
  speechstart: Event;
  start: Event;
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
  abort: () => void;
  start: () => void;
  stop: () => void;
  addEventListener: (<K$1 extends keyof SpeechRecognitionEventMap>(type: K$1, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K$1]) => any, options?: boolean | AddEventListenerOptions) => void) & ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void);
  removeEventListener: (<K$1 extends keyof SpeechRecognitionEventMap>(type: K$1, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K$1]) => any, options?: boolean | EventListenerOptions) => void) & ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => void);
}
//#endregion
//#region useSpeechRecognition/index.d.ts
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
  lang?: MaybeRefOrGetter<string>;
  /**
   * A number representing the maximum returned alternatives for each result.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/maxAlternatives
   * @default 1
   */
  maxAlternatives?: number;
}
interface UseSpeechRecognitionReturn extends Supportable {
  isListening: ShallowRef<boolean>;
  isFinal: ShallowRef<boolean>;
  recognition: SpeechRecognition | undefined;
  result: ShallowRef<string>;
  error: ShallowRef<SpeechRecognitionErrorEvent | Error | undefined>;
  toggle: (value?: boolean) => void;
  start: () => void;
  stop: () => void;
}
/**
 * Reactive SpeechRecognition.
 *
 * @see https://vueuse.org/useSpeechRecognition
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition SpeechRecognition
 * @param options
 */
declare function useSpeechRecognition(options?: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn;
//#endregion
//#region useSpeechSynthesis/index.d.ts
type UseSpeechSynthesisStatus = 'init' | 'play' | 'pause' | 'end';
interface UseSpeechSynthesisOptions extends ConfigurableWindow {
  /**
   * Language for SpeechSynthesis
   *
   * @default 'en-US'
   */
  lang?: MaybeRefOrGetter<string>;
  /**
   * Gets and sets the pitch at which the utterance will be spoken at.
   *
   * @default 1
   */
  pitch?: MaybeRefOrGetter<SpeechSynthesisUtterance['pitch']>;
  /**
   * Gets and sets the speed at which the utterance will be spoken at.
   *
   * @default 1
   */
  rate?: MaybeRefOrGetter<SpeechSynthesisUtterance['rate']>;
  /**
   * Gets and sets the voice that will be used to speak the utterance.
   */
  voice?: MaybeRef<SpeechSynthesisVoice>;
  /**
   * Gets and sets the volume that the utterance will be spoken at.
   *
   * @default 1
   */
  volume?: MaybeRefOrGetter<SpeechSynthesisUtterance['volume']>;
  /**
   * Callback function that is called when the boundary event is triggered.
   */
  onBoundary?: (event: SpeechSynthesisEvent) => void;
}
interface UseSpeechSynthesisReturn extends Supportable {
  isPlaying: ShallowRef<boolean>;
  status: ShallowRef<UseSpeechSynthesisStatus>;
  utterance: ComputedRef<SpeechSynthesisUtterance>;
  error: ShallowRef<SpeechSynthesisErrorEvent | undefined>;
  stop: () => void;
  toggle: (value?: boolean) => void;
  speak: () => void;
}
/**
 * Reactive SpeechSynthesis.
 *
 * @see https://vueuse.org/useSpeechSynthesis
 * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis SpeechSynthesis
 */
declare function useSpeechSynthesis(text: MaybeRefOrGetter<string>, options?: UseSpeechSynthesisOptions): UseSpeechSynthesisReturn;
//#endregion
//#region useStepper/index.d.ts
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
//#endregion
//#region useStorageAsync/index.d.ts
interface UseStorageAsyncOptions<T> extends Omit<UseStorageOptions<T>, 'serializer'> {
  /**
   * Custom data serialization
   */
  serializer?: SerializerAsync<T>;
  /**
   * On first value loaded hook.
   */
  onReady?: (value: T) => void;
}
declare function useStorageAsync(key: string, initialValue: MaybeRefOrGetter<string>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<string>): RemovableRef<string> & Promise<RemovableRef<string>>;
declare function useStorageAsync(key: string, initialValue: MaybeRefOrGetter<boolean>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<boolean>): RemovableRef<boolean> & Promise<RemovableRef<boolean>>;
declare function useStorageAsync(key: string, initialValue: MaybeRefOrGetter<number>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<number>): RemovableRef<number> & Promise<RemovableRef<number>>;
declare function useStorageAsync<T>(key: string, initialValue: MaybeRefOrGetter<T>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<T>): RemovableRef<T> & Promise<RemovableRef<T>>;
declare function useStorageAsync<T = unknown>(key: string, initialValue: MaybeRefOrGetter<null>, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<T>): RemovableRef<T> & Promise<RemovableRef<T>>;
//#endregion
//#region useStyleTag/index.d.ts
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
  /**
   * Nonce value for CSP (Content Security Policy)
   *
   * @default undefined
   */
  nonce?: string;
}
interface UseStyleTagReturn {
  id: string;
  css: ShallowRef<string>;
  load: () => void;
  unload: () => void;
  isLoaded: Readonly<ShallowRef<boolean>>;
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
//#endregion
//#region useSupported/index.d.ts
type UseSupportedReturn = ComputedRef<boolean>;
declare function useSupported(callback: () => unknown): UseSupportedReturn;
//#endregion
//#region useTemplateRefsList/index.d.ts
type TemplateRefsList<T> = T[] & {
  set: (el: object | null) => void;
};
declare function useTemplateRefsList<T = Element>(): Readonly<Ref<Readonly<TemplateRefsList<T>>>>;
//#endregion
//#region useTextDirection/index.d.ts
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useTextDirection(options?: UseTextDirectionOptions): vue0.WritableComputedRef<UseTextDirectionValue, UseTextDirectionValue>;
//#endregion
//#region useTextSelection/index.d.ts
interface UseTextSelectionOptions extends ConfigurableWindow {}
interface UseTextSelectionReturn {
  text: ComputedRef<string>;
  rects: ComputedRef<DOMRect[]>;
  ranges: ComputedRef<Range[]>;
  selection: ShallowRef<Selection | null>;
}
/**
 * Reactively track user text selection based on [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection).
 *
 * @see https://vueuse.org/useTextSelection
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useTextSelection(options?: UseTextSelectionOptions): UseTextSelectionReturn;
//#endregion
//#region useTextareaAutosize/index.d.ts
interface UseTextareaAutosizeOptions extends ConfigurableWindow {
  /** Textarea element to autosize. */
  element?: MaybeRef<HTMLTextAreaElement | undefined | null>;
  /** Textarea content. */
  input?: MaybeRef<string>;
  /** Watch sources that should trigger a textarea resize. */
  watch?: WatchSource | MultiWatchSources;
  /** Function called when the textarea size changes. */
  onResize?: () => void;
  /** Specify style target to apply the height based on textarea content. If not provided it will use textarea it self.  */
  styleTarget?: MaybeRef<HTMLElement | undefined>;
  /** Specify the style property that will be used to manipulate height. Can be `height | minHeight`. Default value is `height`. */
  styleProp?: 'height' | 'minHeight';
}
interface UseTextareaAutosizeReturn {
  textarea: Ref<HTMLTextAreaElement | undefined | null>;
  input: Ref<string>;
  triggerResize: () => void;
}
declare function useTextareaAutosize(options?: UseTextareaAutosizeOptions): UseTextareaAutosizeReturn;
//#endregion
//#region useThrottledRefHistory/index.d.ts
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
//#endregion
//#region useTimeAgo/index.d.ts
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
  units?: UseTimeAgoUnit<UnitNames>[];
}
interface UseTimeAgoOptions<Controls extends boolean, UnitNames extends string = UseTimeAgoUnitNamesDefault> extends FormatTimeAgoOptions<UnitNames>, ConfigurableScheduler {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls;
  /**
   * Intervals to update, set 0 to disable auto update
   *
   * @deprecated Please use `scheduler` option instead
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
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(time: MaybeRefOrGetter<Date | number | string>, options?: UseTimeAgoOptions<false, UnitNames>): UseTimeAgoReturn<false>;
declare function useTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(time: MaybeRefOrGetter<Date | number | string>, options: UseTimeAgoOptions<true, UnitNames>): UseTimeAgoReturn<true>;
declare function formatTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(from: Date, options?: FormatTimeAgoOptions<UnitNames>, now?: Date | number): string;
//#endregion
//#region useTimeAgoIntl/index.d.ts
type Locale = Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale;
interface FormatTimeAgoIntlOptions {
  /**
   * The locale to format with
   *
   * @default undefined
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat/RelativeTimeFormat#locales
   */
  locale?: Locale;
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat/RelativeTimeFormat#options
   */
  relativeTimeFormatOptions?: Intl.RelativeTimeFormatOptions;
  /**
   * Whether to insert spaces between parts.
   *
   * Ignored if `joinParts` is provided.
   *
   * @default true
   */
  insertSpace?: boolean;
  /**
   * Custom function to join the parts returned by `Intl.RelativeTimeFormat.formatToParts`.
   *
   * If provided, it will be used instead of the default join logic.
   */
  joinParts?: (parts: Intl.RelativeTimeFormatPart[], locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale) => string;
  /**
   * Custom units
   */
  units?: TimeAgoUnit[];
}
interface UseTimeAgoIntlOptions<Controls extends boolean> extends FormatTimeAgoIntlOptions, ConfigurableScheduler {
  /**
   * Expose more controls and the raw `parts` result.
   *
   * @default false
   */
  controls?: Controls;
  /**
   * Update interval in milliseconds, set 0 to disable auto update
   *
   * @deprecated Please use `scheduler` option instead
   * @default 30_000
   */
  updateInterval?: number;
}
type UseTimeAgoReturn$1<Controls extends boolean = false> = Controls extends true ? {
  timeAgoIntl: ComputedRef<string>;
  parts: ComputedRef<Intl.RelativeTimeFormatPart[]>;
} & Pausable : ComputedRef<string>;
interface TimeAgoUnit {
  name: Intl.RelativeTimeFormatUnit;
  ms: number;
}
/**
 * A reactive wrapper for `Intl.RelativeTimeFormat`.
 */
declare function useTimeAgoIntl(time: MaybeRefOrGetter<Date | number | string>, options?: UseTimeAgoIntlOptions<false>): UseTimeAgoReturn$1<false>;
declare function useTimeAgoIntl(time: MaybeRefOrGetter<Date | number | string>, options: UseTimeAgoIntlOptions<true>): UseTimeAgoReturn$1<true>;
/**
 * Non-reactive version of useTimeAgoIntl
 */
declare function formatTimeAgoIntl(from: Date, options?: FormatTimeAgoIntlOptions, now?: Date | number): string;
/**
 * Format parts into a string
 */
declare function formatTimeAgoIntlParts(parts: Intl.RelativeTimeFormatPart[], options?: FormatTimeAgoIntlOptions): string;
//#endregion
//#region useTimeoutPoll/index.d.ts
interface UseTimeoutPollOptions {
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
declare function useTimeoutPoll(fn: () => Awaitable<void>, interval: MaybeRefOrGetter<number>, options?: UseTimeoutFnOptions): Pausable;
//#endregion
//#region useTimestamp/index.d.ts
interface UseTimestampOptions<Controls extends boolean> extends ConfigurableScheduler {
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
   * @deprecated Please use `scheduler` option instead
   * @default true
   */
  immediate?: boolean;
  /**
   * Update interval, or use requestAnimationFrame
   *
   * @deprecated Please use `scheduler` option instead
   * @default requestAnimationFrame
   */
  interval?: 'requestAnimationFrame' | number;
  /**
   * Callback on each update
   */
  callback?: (timestamp: number) => void;
}
type UseTimestampReturn<Controls extends boolean> = Controls extends true ? ({
  timestamp: ShallowRef<number>;
} & Pausable) : ShallowRef<number>;
/**
 * Reactive current timestamp.
 *
 * @see https://vueuse.org/useTimestamp
 * @param options
 */
declare function useTimestamp(options?: UseTimestampOptions<false>): ShallowRef<number>;
declare function useTimestamp(options: UseTimestampOptions<true>): {
  timestamp: ShallowRef<number>;
} & Pausable;
//#endregion
//#region useTitle/index.d.ts
type UseTitleOptionsBase = {
  /**
   * Restore the original title when unmounted
   * @param originTitle original title
   * @returns restored title
   */
  restoreOnUnmount?: false | ((originalTitle: string, currentTitle: string) => string | null | undefined);
} & ({
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
});
type UseTitleOptions = ConfigurableDocument & UseTitleOptionsBase;
type UseTitleReturn = ComputedRef<string | null | undefined> | Ref<string | null | undefined>;
/**
 * Reactive document title.
 *
 * @see https://vueuse.org/useTitle
 * @param newTitle
 * @param options
 * @description It's not SSR compatible. Your value will be applied only on client-side.
 */
declare function useTitle(newTitle: ReadonlyRefOrGetter<string | null | undefined>, options?: UseTitleOptions): ComputedRef<string | null | undefined>;
declare function useTitle(newTitle?: MaybeRef<string | null | undefined>, options?: UseTitleOptions): Ref<string | null | undefined>;
//#endregion
//#region useTransition/index.d.ts
/**
 * Cubic bezier points
 */
type CubicBezierPoints = [number, number, number, number];
/**
 * Easing function
 */
type EasingFunction = (n: number) => number;
/**
 * Interpolation function
 */
type InterpolationFunction<T> = (from: T, to: T, t: number) => T;
/**
 * Transition options
 */
interface TransitionOptions<T> extends ConfigurableWindow {
  /**
   * Manually abort a transition
   */
  abort?: () => any;
  /**
   * Transition duration in milliseconds
   */
  duration?: MaybeRef<number>;
  /**
   * Easing function or cubic bezier points to calculate transition progress
   */
  easing?: MaybeRef<EasingFunction | CubicBezierPoints>;
  /**
   * Custom interpolation function
   */
  interpolation?: InterpolationFunction<T>;
  /**
   * Easing function or cubic bezier points to calculate transition progress
   * @deprecated The `transition` option is deprecated, use `easing` instead.
   */
  transition?: MaybeRef<EasingFunction | CubicBezierPoints>;
}
interface UseTransitionOptions<T> extends TransitionOptions<T> {
  /**
   * Milliseconds to wait before starting transition
   */
  delay?: MaybeRef<number>;
  /**
   * Disables the transition
   */
  disabled?: MaybeRef<boolean>;
  /**
   * Callback to execute after transition finishes
   */
  onFinished?: () => void;
  /**
   * Callback to execute after transition starts
   */
  onStarted?: () => void;
}
declare const _TransitionPresets: {
  readonly easeInSine: readonly [0.12, 0, 0.39, 0];
  readonly easeOutSine: readonly [0.61, 1, 0.88, 1];
  readonly easeInOutSine: readonly [0.37, 0, 0.63, 1];
  readonly easeInQuad: readonly [0.11, 0, 0.5, 0];
  readonly easeOutQuad: readonly [0.5, 1, 0.89, 1];
  readonly easeInOutQuad: readonly [0.45, 0, 0.55, 1];
  readonly easeInCubic: readonly [0.32, 0, 0.67, 0];
  readonly easeOutCubic: readonly [0.33, 1, 0.68, 1];
  readonly easeInOutCubic: readonly [0.65, 0, 0.35, 1];
  readonly easeInQuart: readonly [0.5, 0, 0.75, 0];
  readonly easeOutQuart: readonly [0.25, 1, 0.5, 1];
  readonly easeInOutQuart: readonly [0.76, 0, 0.24, 1];
  readonly easeInQuint: readonly [0.64, 0, 0.78, 0];
  readonly easeOutQuint: readonly [0.22, 1, 0.36, 1];
  readonly easeInOutQuint: readonly [0.83, 0, 0.17, 1];
  readonly easeInExpo: readonly [0.7, 0, 0.84, 0];
  readonly easeOutExpo: readonly [0.16, 1, 0.3, 1];
  readonly easeInOutExpo: readonly [0.87, 0, 0.13, 1];
  readonly easeInCirc: readonly [0.55, 0, 1, 0.45];
  readonly easeOutCirc: readonly [0, 0.55, 0.45, 1];
  readonly easeInOutCirc: readonly [0.85, 0, 0.15, 1];
  readonly easeInBack: readonly [0.36, 0, 0.66, -0.56];
  readonly easeOutBack: readonly [0.34, 1.56, 0.64, 1];
  readonly easeInOutBack: readonly [0.68, -0.6, 0.32, 1.6];
};
/**
 * Common transitions
 *
 * @see https://easings.net
 */
declare const TransitionPresets: Record<keyof typeof _TransitionPresets, CubicBezierPoints> & {
  linear: EasingFunction;
};
/**
 * Transition from one value to another.
 *
 * @param source
 * @param from
 * @param to
 * @param options
 */
declare function transition<T>(source: Ref<T>, from: MaybeRefOrGetter<T>, to: MaybeRefOrGetter<T>, options?: TransitionOptions<T>): PromiseLike<void>;
/**
 * Transition from one value to another.
 * @deprecated The `executeTransition` function is deprecated, use `transition` instead.
 *
 * @param source
 * @param from
 * @param to
 * @param options
 */
declare function executeTransition<T>(source: Ref<T>, from: MaybeRefOrGetter<T>, to: MaybeRefOrGetter<T>, options?: TransitionOptions<T>): PromiseLike<void>;
declare function useTransition<T extends MaybeRefOrGetter<number>[]>(source: [...T], options?: UseTransitionOptions<T>): ComputedRef<{ [K in keyof T]: number }>;
declare function useTransition<T extends MaybeRefOrGetter<number[]>>(source: T, options?: UseTransitionOptions<T>): ComputedRef<number[]>;
declare function useTransition<T>(source: MaybeRefOrGetter<T>, options?: UseTransitionOptions<T>): ComputedRef<T>;
//#endregion
//#region useUrlSearchParams/index.d.ts
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
  /**
   * Write mode for `window.history` when `write` is enabled
   * - `replace`: replace the current history entry
   * - `push`: push a new history entry
   * @default 'replace'
   */
  writeMode?: 'replace' | 'push';
  /**
   * Custom function to serialize URL parameters
   * When provided, this function will be used instead of the default URLSearchParams.toString()
   * @param params The URLSearchParams object to serialize
   * @returns The serialized query string (should not include the leading '?' or '#')
   */
  stringify?: (params: URLSearchParams) => string;
}
/**
 * Reactive URLSearchParams
 *
 * @see https://vueuse.org/useUrlSearchParams
 * @param mode
 * @param options
 */
declare function useUrlSearchParams<T extends Record<string, any> = UrlParams>(mode?: 'history' | 'hash' | 'hash-params', options?: UseUrlSearchParamsOptions<T>): T;
//#endregion
//#region useUserMedia/index.d.ts
interface UseUserMediaOptions extends ConfigurableNavigator {
  /**
   * If the stream is enabled
   * @default false
   */
  enabled?: MaybeRef<boolean>;
  /**
   * Recreate stream when deviceIds or constraints changed
   *
   * @default true
   */
  autoSwitch?: MaybeRef<boolean>;
  /**
   * MediaStreamConstraints to be applied to the requested MediaStream
   * If provided, the constraints will override videoDeviceId and audioDeviceId
   *
   * @default {}
   */
  constraints?: MaybeRef<MediaStreamConstraints>;
}
interface UseUserMediaReturn extends Supportable {
  stream: Ref<MediaStream | undefined>;
  start: () => Promise<MediaStream | undefined>;
  stop: () => void;
  restart: () => Promise<MediaStream | undefined>;
  constraints: Ref<MediaStreamConstraints | undefined>;
  enabled: ShallowRef<boolean>;
  autoSwitch: ShallowRef<boolean>;
}
/**
 * Reactive `mediaDevices.getUserMedia` streaming
 *
 * @see https://vueuse.org/useUserMedia
 * @param options
 */
declare function useUserMedia(options?: UseUserMediaOptions): UseUserMediaReturn;
//#endregion
//#region useVModel/index.d.ts
interface UseVModelOptions<T, Passive extends boolean = false> {
  /**
   * When passive is set to `true`, it will use `watch` to sync with props and ref.
   * Instead of relying on the `v-model` or `.sync` to work.
   *
   * @default false
   */
  passive?: Passive;
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
  /**
   * The hook before triggering the emit event can be used for form validation.
   * if false is returned, the emit event will not be triggered.
   *
   * @default undefined
   */
  shouldEmit?: (v: T) => boolean;
}
/**
 * Shorthand for v-model binding, props + emit -> ref
 *
 * @see https://vueuse.org/useVModel
 * @param props
 * @param key (default 'modelValue')
 * @param emit
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useVModel<P$1 extends object, K$1 extends keyof P$1, Name extends string>(props: P$1, key?: K$1, emit?: (name: Name, ...args: any[]) => void, options?: UseVModelOptions<P$1[K$1], false>): WritableComputedRef<P$1[K$1]>;
declare function useVModel<P$1 extends object, K$1 extends keyof P$1, Name extends string>(props: P$1, key?: K$1, emit?: (name: Name, ...args: any[]) => void, options?: UseVModelOptions<P$1[K$1], true>): Ref<UnwrapRef<P$1[K$1]>>;
//#endregion
//#region useVModels/index.d.ts
/**
 * Shorthand for props v-model binding. Think like `toRefs(props)` but changes will also emit out.
 *
 * @see https://vueuse.org/useVModels
 * @param props
 * @param emit
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useVModels<P$1 extends object, Name extends string>(props: P$1, emit?: (name: Name, ...args: any[]) => void, options?: UseVModelOptions<any, true>): ToRefs<P$1>;
declare function useVModels<P$1 extends object, Name extends string>(props: P$1, emit?: (name: Name, ...args: any[]) => void, options?: UseVModelOptions<any, false>): ToRefs<P$1>;
//#endregion
//#region useVibrate/index.d.ts
interface UseVibrateOptions extends ConfigurableNavigator, ConfigurableScheduler {
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
  pattern?: MaybeRefOrGetter<Arrayable<number>>;
  /**
   * Interval to run a persistent vibration, in ms
   *
   * Pass `0` to disable
   *
   * @deprecated Please use `scheduler` option instead
   * @default 0
   *
   */
  interval: number;
}
interface UseVibrateReturn extends Supportable {
  pattern: MaybeRefOrGetter<Arrayable<number>>;
  intervalControls?: Pausable;
  vibrate: (pattern?: Arrayable<number>) => void;
  stop: () => void;
}
/**
 * Reactive vibrate
 *
 * @see https://vueuse.org/useVibrate
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useVibrate(options?: UseVibrateOptions): UseVibrateReturn;
//#endregion
//#region useVirtualList/index.d.ts
type UseVirtualListItemSize = number | ((index: number) => number);
interface UseHorizontalVirtualListOptions extends UseVirtualListOptionsBase {
  /**
   * item width, accept a pixel value or a function that returns the width
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
declare function useVirtualList<T = any>(list: MaybeRef<readonly T[]>, options: UseVirtualListOptions): UseVirtualListReturn<T>;
//#endregion
//#region useWakeLock/index.d.ts
type WakeLockType = 'screen';
interface WakeLockSentinel extends EventTarget {
  type: WakeLockType;
  released: boolean;
  release: () => Promise<void>;
}
type UseWakeLockOptions = ConfigurableNavigator & ConfigurableDocument;
interface UseWakeLockReturn extends Supportable {
  sentinel: ShallowRef<WakeLockSentinel | null>;
  isActive: ComputedRef<boolean>;
  request: (type: WakeLockType) => Promise<void>;
  forceRequest: (type: WakeLockType) => Promise<void>;
  release: () => Promise<void>;
}
/**
 * Reactive Screen Wake Lock API.
 *
 * @see https://vueuse.org/useWakeLock
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useWakeLock(options?: UseWakeLockOptions): UseWakeLockReturn;
//#endregion
//#region useWebNotification/index.d.ts
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
interface UseWebNotificationOptions extends ConfigurableWindow, WebNotificationOptions {
  /**
   * Request for permissions onMounted if it's not granted.
   *
   * Can be disabled and calling `ensurePermissions` to grant afterwords.
   *
   * @default true
   */
  requestPermissions?: boolean;
}
interface UseWebNotificationReturn extends Supportable {
  notification: Ref<Notification | null>;
  ensurePermissions: () => Promise<boolean | undefined>;
  permissionGranted: ShallowRef<boolean>;
  show: (overrides?: WebNotificationOptions) => Promise<Notification | undefined>;
  close: () => void;
  onClick: EventHookOn<Event>;
  onShow: EventHookOn<Event>;
  onError: EventHookOn<Event>;
  onClose: EventHookOn<Event>;
}
/**
 * Reactive useWebNotification
 *
 * @see https://vueuse.org/useWebNotification
 * @see https://developer.mozilla.org/en-US/docs/Web/API/notification
 */
declare function useWebNotification(options?: UseWebNotificationOptions): UseWebNotificationReturn;
//#endregion
//#region useWebSocket/index.d.ts
type WebSocketStatus = 'OPEN' | 'CONNECTING' | 'CLOSED';
type WebSocketHeartbeatMessage = string | ArrayBuffer | Blob;
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
  heartbeat?: boolean | ConfigurableScheduler & {
    /**
     * Message for the heartbeat
     *
     * @default 'ping'
     */
    message?: MaybeRefOrGetter<WebSocketHeartbeatMessage>;
    /**
     * Response message for the heartbeat, if undefined the message will be used
     */
    responseMessage?: MaybeRefOrGetter<WebSocketHeartbeatMessage>;
    /**
     * Interval, in milliseconds
     *
     * @deprecated Please use `scheduler` option instead
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
    retries?: number | ((retried: number) => boolean);
    /**
     * Delay for reconnect, in milliseconds
     *
     * Or you can pass a function to calculate the delay based on the number of retries.
     *
     * @default 1000
     */
    delay?: number | ((retries: number) => number);
    /**
     * On maximum retry times reached.
     */
    onFailed?: Fn;
  };
  /**
   * Immediately open the connection when calling this composable
   *
   * @default true
   */
  immediate?: boolean;
  /**
   * Automatically connect to the websocket when URL changes
   *
   * @default true
   */
  autoConnect?: boolean;
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
  status: ShallowRef<WebSocketStatus>;
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
declare function useWebSocket<Data = any>(url: MaybeRefOrGetter<string | URL | undefined>, options?: UseWebSocketOptions): UseWebSocketReturn<Data>;
//#endregion
//#region useWebWorker/index.d.ts
type PostMessage = typeof Worker.prototype['postMessage'];
interface UseWebWorkerReturn<Data = any> {
  data: Ref<Data>;
  post: PostMessage;
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
 */
declare function useWebWorker<T = any>(worker: Worker | WorkerFn): UseWebWorkerReturn<T>;
//#endregion
//#region useWebWorkerFn/index.d.ts
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
  /**
   * An array that contains the local dependencies needed to run the worker
   */
  localDependencies?: Function[];
}
interface UseWebWorkerFnReturn<T extends (...fnArgs: any[]) => any> {
  workerFn: (...fnArgs: Parameters<T>) => Promise<ReturnType<T>>;
  workerStatus: ShallowRef<WebWorkerStatus>;
  workerTerminate: (status?: WebWorkerStatus) => void;
}
/**
 * Run expensive function without blocking the UI, using a simple syntax that makes use of Promise.
 *
 * @see https://vueuse.org/useWebWorkerFn
 * @param fn
 * @param options
 */
declare function useWebWorkerFn<T extends (...fnArgs: any[]) => any>(fn: T, options?: UseWebWorkerOptions): UseWebWorkerFnReturn<T>;
//#endregion
//#region useWindowFocus/index.d.ts
/**
 * Reactively track window focus with `window.onfocus` and `window.onblur`.
 *
 * @see https://vueuse.org/useWindowFocus
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useWindowFocus(options?: ConfigurableWindow): ShallowRef<boolean>;
//#endregion
//#region useWindowScroll/index.d.ts
interface UseWindowScrollOptions extends ConfigurableWindow, UseScrollOptions {}
interface UseWindowScrollReturn extends UseScrollReturn {}
/**
 * Reactive window scroll.
 *
 * @see https://vueuse.org/useWindowScroll
 * @param options
 */
declare function useWindowScroll(options?: UseWindowScrollOptions): UseWindowScrollReturn;
//#endregion
//#region useWindowSize/index.d.ts
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
   * Only effective when `type` is `'inner'`
   *
   * @default true
   */
  includeScrollbar?: boolean;
  /**
   * Use `window.innerWidth` or `window.outerWidth` or `window.visualViewport`
   * visualViewport documentation from MDN(https://developer.mozilla.org/zh-CN/docs/Web/API/VisualViewport)
   * @default 'inner'
   */
  type?: 'inner' | 'outer' | 'visual';
}
interface UseWindowSizeReturn {
  width: ShallowRef<number>;
  height: ShallowRef<number>;
}
/**
 * Reactive window size.
 *
 * @see https://vueuse.org/useWindowSize
 * @param options
 *
 * @__NO_SIDE_EFFECTS__
 */
declare function useWindowSize(options?: UseWindowSizeOptions): UseWindowSizeReturn;
//#endregion
export { AfterFetchContext, AsyncComputedOnCancel, AsyncComputedOptions, BasicColorMode, BasicColorSchema, BatteryManager, BeforeFetchContext, Breakpoints, BrowserLocationState, CloneFn, ColorSchemeType, ComputedInjectGetter, ComputedInjectGetterWithDefault, ComputedInjectSetter, ConfigurableDeepRefs, ConfigurableDocument, ConfigurableDocumentOrShadowRoot, ConfigurableLocation, ConfigurableNavigator, ConfigurableScheduler, ConfigurableWindow, ContrastType, CreateFetchOptions, CreateReusableTemplateOptions, CubicBezierPoints, DefaultMagicKeysAliasMap, DefineTemplateComponent, DeviceMotionOptions, DocumentEventName, EasingFunction, ElementSize, EventBusEvents, EventBusIdentifier, EventBusKey, EventBusListener, EventSourceStatus, EyeDropper, EyeDropperOpenOptions, FileSystemAccessShowOpenFileOptions, FileSystemAccessShowSaveFileOptions, FileSystemAccessWindow, FileSystemFileHandle, FormatTimeAgoIntlOptions, FormatTimeAgoOptions, GeneralEventListener, GeneralPermissionDescriptor, InterpolationFunction, KeyFilter, KeyModifier, KeyPredicate, KeyStrokeEventName, MagicKeysInternal, MaybeComputedElementRef, MaybeElement, MaybeElementRef, MemoryInfo, MouseInElementOptions, MousePressedOptions, NavigatorLanguageState, NetworkEffectiveType, NetworkState, NetworkType, OnClickOutsideHandler, OnClickOutsideOptions, OnClickOutsideReturn, OnElementRemovalOptions, OnFetchErrorContext, OnKeyStrokeOptions, OnLongPressModifiers, OnLongPressOptions, OnLongPressReturn, OrientationLockType, OrientationType, PointerType, Position, ReducedMotionType, ReducedTransparencyType, RenderableComponent, ResizeObserverCallback, ResizeObserverEntry, ResizeObserverSize, ReusableTemplatePair, ReuseTemplateComponent, SSRHandlersMap, ScreenOrientation, Serializer, SerializerAsync, ShadowRootEventName, StorageEventLike, StorageLike, StorageLikeAsync, StorageSerializers, Supportable, TemplatePromise, TemplatePromiseOptions, TemplatePromiseProps, TemplateRefsList, TimeAgoUnit, ToDataURLOptions, TransitionOptions, TransitionPresets, UnRefElementReturn, UnrefFn, UrlParams, UseActiveElementOptions, UseActiveElementReturn, UseAnimateKeyframes, UseAnimateOptions, UseAnimateReturn, UseAsyncQueueOptions, UseAsyncQueueResult, UseAsyncQueueReturn, UseAsyncQueueTask, UseAsyncStateOptions, UseAsyncStateReturn, UseAsyncStateReturnBase, UseBase64ObjectOptions, UseBase64Options, UseBase64Return, UseBatteryOptions, UseBatteryReturn, UseBluetoothOptions, UseBluetoothRequestDeviceOptions, UseBluetoothReturn, UseBreakpointReturn, UseBreakpointsOptions, UseBroadcastChannelOptions, UseBroadcastChannelReturn, UseBrowserLocationOptions, UseBrowserLocationReturn, UseCachedOptions, UseCachedReturn, UseClipboardItemsOptions, UseClipboardItemsReturn, UseClipboardOptions, UseClipboardReturn, UseClonedOptions, UseClonedReturn, UseColorModeOptions, UseColorModeReturn, UseConfirmDialogReturn, UseConfirmDialogRevealResult, UseCountdownOptions, UseCountdownReturn, UseCssSupportsOptions, UseCssSupportsReturn, UseCssVarOptions, UseCycleListOptions, UseCycleListReturn, UseDarkOptions, UseDarkReturn, UseDeviceMotionOptions, UseDeviceMotionReturn, UseDeviceOrientationOptions, UseDeviceOrientationReturn, UseDevicePixelRatioOptions, UseDevicePixelRatioReturn, UseDevicesListOptions, UseDevicesListReturn, UseDisplayMediaOptions, UseDisplayMediaReturn, UseDocumentVisibilityOptions, UseDocumentVisibilityReturn, UseDraggableOptions, UseDraggableReturn, UseDropZoneOptions, UseDropZoneReturn, UseElementBoundingOptions, UseElementBoundingReturn, UseElementByPointOptions, UseElementByPointReturn, UseElementHoverOptions, UseElementSizeOptions, UseElementSizeReturn, UseElementVisibilityOptions, UseElementVisibilityReturn, UseEventBusReturn, UseEventSourceOptions, UseEventSourceReturn, UseEyeDropperOptions, UseEyeDropperReturn, UseFaviconOptions, UseFaviconReturn, UseFetchOptions, UseFetchReturn, UseFileDialogOptions, UseFileDialogReturn, UseFileSystemAccessCommonOptions, UseFileSystemAccessOptions, UseFileSystemAccessReturn, UseFileSystemAccessShowSaveFileOptions, UseFocusOptions, UseFocusReturn, UseFocusWithinReturn, UseFpsOptions, UseFullscreenOptions, UseFullscreenReturn, UseGamepadOptions, UseGamepadReturn, UseGeolocationOptions, UseGeolocationReturn, UseHorizontalVirtualListOptions, UseIdleOptions, UseIdleReturn, UseImageOptions, UseImageReturn, UseInfiniteScrollOptions, UseInfiniteScrollReturn, UseIntersectionObserverOptions, UseIntersectionObserverReturn, UseKeyModifierReturn, UseMagicKeysOptions, UseMagicKeysReturn, UseManualRefHistoryOptions, UseManualRefHistoryReturn, UseMediaControlsReturn, UseMediaSource, UseMediaTextTrack, UseMediaTextTrackSource, UseMemoizeCache, UseMemoizeOptions, UseMemoizeReturn, UseMemoryOptions, UseMemoryReturn, UseModifierOptions, UseMouseCoordType, UseMouseEventExtractor, UseMouseInElementReturn, UseMouseOptions, UseMousePressedOptions, UseMousePressedReturn, UseMouseReturn, UseMouseSourceType, UseMutationObserverOptions, UseMutationObserverReturn, UseNavigatorLanguageOptions, UseNavigatorLanguageReturn, UseNetworkOptions, UseNetworkReturn, UseNowOptions, UseNowReturn, UseOffsetPaginationInfinityPageReturn, UseOffsetPaginationOptions, UseOffsetPaginationReturn, UseOnLongPressReturn, UsePageLeaveOptions, UsePageLeaveReturn, UseParallaxOptions, UseParallaxReturn, UsePerformanceObserverOptions, UsePermissionOptions, UsePermissionReturn, UsePermissionReturnWithControls, UsePointerLockOptions, UsePointerLockReturn, UsePointerOptions, UsePointerReturn, UsePointerState, UsePointerSwipeOptions, UsePointerSwipeReturn, UseRafFnCallbackArguments, UseRafFnOptions, UseRefHistoryOptions, UseRefHistoryRecord, UseRefHistoryReturn, UseResizeObserverOptions, UseResizeObserverReturn, UseScreenOrientationOptions, UseScreenOrientationReturn, UseScreenSafeAreaReturn, UseScriptTagOptions, UseScriptTagReturn, UseScrollOptions, UseScrollReturn, UseShareOptions, UseShareReturn, UseSortedCompareFn, UseSortedFn, UseSortedOptions, UseSpeechRecognitionOptions, UseSpeechRecognitionReturn, UseSpeechSynthesisOptions, UseSpeechSynthesisReturn, UseSpeechSynthesisStatus, UseStepperReturn, UseStorageAsyncOptions, UseStorageOptions, UseStyleTagOptions, UseStyleTagReturn, UseSupportedReturn, UseSwipeDirection, UseSwipeOptions, UseSwipeReturn, UseTextDirectionOptions, UseTextDirectionValue, UseTextSelectionOptions, UseTextSelectionReturn, UseTextareaAutosizeOptions, UseTextareaAutosizeReturn, UseThrottledRefHistoryOptions, UseThrottledRefHistoryReturn, UseTimeAgoFormatter, UseTimeAgoIntlOptions, UseTimeAgoMessages, UseTimeAgoMessagesBuiltIn, UseTimeAgoOptions, UseTimeAgoReturn, UseTimeAgoUnit, UseTimeAgoUnitNamesDefault, UseTimeoutPollOptions, UseTimestampOptions, UseTimestampReturn, UseTitleOptions, UseTitleOptionsBase, UseTitleReturn, UseTransitionOptions, UseUrlSearchParamsOptions, UseUserMediaOptions, UseUserMediaReturn, UseVModelOptions, UseVerticalVirtualListOptions, UseVibrateOptions, UseVibrateReturn, UseVirtualListItem, UseVirtualListOptions, UseVirtualListOptionsBase, UseVirtualListReturn, UseWakeLockOptions, UseWakeLockReturn, UseWebNotificationOptions, UseWebNotificationReturn, UseWebSocketOptions, UseWebSocketReturn, UseWebWorkerFnReturn, UseWebWorkerOptions, UseWebWorkerReturn, UseWindowScrollOptions, UseWindowScrollReturn, UseWindowSizeOptions, UseWindowSizeReturn, VueInstance, WakeLockSentinel, WebNotificationOptions, WebSocketHeartbeatMessage, WebSocketStatus, WebWorkerStatus, WindowEventName, WritableComputedInjectOptions, WritableComputedInjectOptionsWithDefault, asyncComputed, breakpointsAntDesign, breakpointsBootstrapV5, breakpointsElement, breakpointsMasterCss, breakpointsPrimeFlex, breakpointsQuasar, breakpointsSematic, breakpointsTailwind, breakpointsVuetify, breakpointsVuetifyV2, breakpointsVuetifyV3, cloneFnJSON, computedAsync, computedInject, createFetch, createReusableTemplate, createTemplatePromise, createUnrefFn, customStorageEventName, defaultDocument, defaultLocation, defaultNavigator, defaultWindow, executeTransition, formatTimeAgo, formatTimeAgoIntl, formatTimeAgoIntlParts, getSSRHandler, mapGamepadToXbox360Controller, onClickOutside, onElementRemoval, onKeyDown, onKeyPressed, onKeyStroke, onKeyUp, onLongPress, onStartTyping, provideSSRWidth, setSSRHandler, templateRef, transition, unrefElement, useActiveElement, useAnimate, useAsyncQueue, useAsyncState, useBase64, useBattery, useBluetooth, useBreakpoints, useBroadcastChannel, useBrowserLocation, useCached, useClipboard, useClipboardItems, useCloned, useColorMode, useConfirmDialog, useCountdown, useCssSupports, useCssVar, useCurrentElement, useCycleList, useDark, useDebouncedRefHistory, useDeviceMotion, useDeviceOrientation, useDevicePixelRatio, useDevicesList, useDisplayMedia, useDocumentVisibility, useDraggable, useDropZone, useElementBounding, useElementByPoint, useElementHover, useElementSize, useElementVisibility, useEventBus, useEventListener, useEventSource, useEyeDropper, useFavicon, useFetch, useFileDialog, useFileSystemAccess, useFocus, useFocusWithin, useFps, useFullscreen, useGamepad, useGeolocation, useIdle, useImage, useInfiniteScroll, useIntersectionObserver, useKeyModifier, useLocalStorage, useMagicKeys, useManualRefHistory, useMediaControls, useMediaQuery, useMemoize, useMemory, useMounted, useMouse, useMouseInElement, useMousePressed, useMutationObserver, useNavigatorLanguage, useNetwork, useNow, useObjectUrl, useOffsetPagination, useOnline, usePageLeave, useParallax, useParentElement, usePerformanceObserver, usePermission, usePointer, usePointerLock, usePointerSwipe, usePreferredColorScheme, usePreferredContrast, usePreferredDark, usePreferredLanguages, usePreferredReducedMotion, usePreferredReducedTransparency, usePrevious, useRafFn, useRefHistory, useResizeObserver, useSSRWidth, useScreenOrientation, useScreenSafeArea, useScriptTag, useScroll, useScrollLock, useSessionStorage, useShare, useSorted, useSpeechRecognition, useSpeechSynthesis, useStepper, useStorage, useStorageAsync, useStyleTag, useSupported, useSwipe, useTemplateRefsList, useTextDirection, useTextSelection, useTextareaAutosize, useThrottledRefHistory, useTimeAgo, useTimeAgoIntl, useTimeoutPoll, useTimestamp, useTitle, useTransition, useUrlSearchParams, useUserMedia, useVModel, useVModels, useVibrate, useVirtualList, useWakeLock, useWebNotification, useWebSocket, useWebWorker, useWebWorkerFn, useWindowFocus, useWindowScroll, useWindowSize };