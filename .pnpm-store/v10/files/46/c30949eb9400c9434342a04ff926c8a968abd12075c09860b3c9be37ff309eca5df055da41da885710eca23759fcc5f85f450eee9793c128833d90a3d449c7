import { computed as computed$1, Ref, OnCleanup, WatchStopHandle, ShallowUnwrapRef, UnwrapNestedRefs, DebuggerEvent, ComputedGetter, WritableComputedOptions, WatchCallback, ReactiveEffect, DebuggerOptions, WatchSource, WatchHandle, ReactiveMarker, WatchEffect, ShallowRef, WatchErrorCodes, reactive } from '@vue/reactivity';
export { ComputedGetter, ComputedRef, ComputedSetter, CustomRefFactory, DebuggerEvent, DebuggerEventExtraInfo, DebuggerOptions, DeepReadonly, EffectScheduler, EffectScope, MaybeRef, MaybeRefOrGetter, Raw, Reactive, ReactiveEffect, ReactiveEffectOptions, ReactiveEffectRunner, ReactiveFlags, Ref, ShallowReactive, ShallowRef, ShallowUnwrapRef, ToRef, ToRefs, TrackOpTypes, TriggerOpTypes, UnwrapNestedRefs, UnwrapRef, WatchCallback, WatchEffect, WatchHandle, WatchSource, WatchStopHandle, WritableComputedOptions, WritableComputedRef, customRef, effect, effectScope, getCurrentScope, getCurrentWatcher, isProxy, isReactive, isReadonly, isRef, isShallow, markRaw, onScopeDispose, onWatcherCleanup, proxyRefs, reactive, readonly, ref, shallowReactive, shallowReadonly, shallowRef, stop, toRaw, toRef, toRefs, toValue, triggerRef, unref } from '@vue/reactivity';
import { IfAny, Prettify, LooseRequired, UnionToIntersection, OverloadParameters, IsKeyValues } from '@vue/shared';
export { camelize, capitalize, normalizeClass, normalizeProps, normalizeStyle, toDisplayString, toHandlerKey } from '@vue/shared';

export declare const computed: typeof computed$1;

export type Slot<T extends any = any> = (...args: IfAny<T, any[], [T] | (T extends undefined ? [] : never)>) => VNode[];
type InternalSlots = {
    [name: string]: Slot | undefined;
};
export type Slots = Readonly<InternalSlots>;
declare const SlotSymbol: unique symbol;
export type SlotsType<T extends Record<string, any> = Record<string, any>> = {
    [SlotSymbol]?: T;
};
type StrictUnwrapSlotsType<S extends SlotsType, T = NonNullable<S[typeof SlotSymbol]>> = [keyof S] extends [never] ? Slots : Readonly<T> & T;
type UnwrapSlotsType<S extends SlotsType, T = NonNullable<S[typeof SlotSymbol]>> = [keyof S] extends [never] ? Slots : Readonly<Prettify<{
    [K in keyof T]: NonNullable<T[K]> extends (...args: any[]) => any ? T[K] : Slot<T[K]>;
}>>;
type RawSlots = {
    [name: string]: unknown;
    $stable?: boolean;
};

declare enum SchedulerJobFlags {
    QUEUED = 1,
    PRE = 2,
    /**
     * Indicates whether the effect is allowed to recursively trigger itself
     * when managed by the scheduler.
     *
     * By default, a job cannot trigger itself because some built-in method calls,
     * e.g. Array.prototype.push actually performs reads as well (#1740) which
     * can lead to confusing infinite loops.
     * The allowed cases are component update functions and watch callbacks.
     * Component update functions may update child component props, which in turn
     * trigger flush: "pre" watch callbacks that mutates state that the parent
     * relies on (#1801). Watch callbacks doesn't track its dependencies so if it
     * triggers itself again, it's likely intentional and it is the user's
     * responsibility to perform recursive state mutation that eventually
     * stabilizes (#1727).
     */
    ALLOW_RECURSE = 4,
    DISPOSED = 8
}
interface SchedulerJob extends Function {
    id?: number;
    /**
     * flags can technically be undefined, but it can still be used in bitwise
     * operations just like 0.
     */
    flags?: SchedulerJobFlags;
    /**
     * Attached by renderer.ts when setting up a component's render effect
     * Used to obtain component information when reporting max recursive updates.
     */
    i?: ComponentInternalInstance;
}
type SchedulerJobs = SchedulerJob | SchedulerJob[];
export declare function nextTick(): Promise<void>;
export declare function nextTick<T, R>(this: T, fn: (this: T) => R | Promise<R>): Promise<R>;
export declare function queuePostFlushCb(cb: SchedulerJobs): void;

export type ComponentPropsOptions<P = Data> = ComponentObjectPropsOptions<P> | string[];
export type ComponentObjectPropsOptions<P = Data> = {
    [K in keyof P]: Prop<P[K]> | null;
};
export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;
type DefaultFactory<T> = (props: Data) => T | null | undefined;
interface PropOptions<T = any, D = T> {
    type?: PropType<T> | true | null;
    required?: boolean;
    default?: D | DefaultFactory<D> | null | undefined | object;
    validator?(value: unknown, props: Data): boolean;
}
export type PropType<T> = PropConstructor<T> | (PropConstructor<T> | null)[];
type PropConstructor<T = any> = {
    new (...args: any[]): T & {};
} | {
    (): T;
} | PropMethod<T>;
type PropMethod<T, TConstructor = any> = [T] extends [
    ((...args: any) => any) | undefined
] ? {
    new (): TConstructor;
    (): T;
    readonly prototype: TConstructor;
} : never;
type RequiredKeys<T> = {
    [K in keyof T]: T[K] extends {
        required: true;
    } | {
        default: any;
    } | BooleanConstructor | {
        type: BooleanConstructor;
    } ? T[K] extends {
        default: undefined | (() => undefined);
    } ? never : K : never;
}[keyof T];
type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;
type DefaultKeys<T> = {
    [K in keyof T]: T[K] extends {
        default: any;
    } | BooleanConstructor | {
        type: BooleanConstructor;
    } ? T[K] extends {
        type: BooleanConstructor;
        required: true;
    } ? never : K : never;
}[keyof T];
type InferPropType<T, NullAsAny = true> = [T] extends [null] ? NullAsAny extends true ? any : null : [T] extends [{
    type: null | true;
}] ? any : [T] extends [ObjectConstructor | {
    type: ObjectConstructor;
}] ? Record<string, any> : [T] extends [BooleanConstructor | {
    type: BooleanConstructor;
}] ? boolean : [T] extends [DateConstructor | {
    type: DateConstructor;
}] ? Date : [T] extends [(infer U)[] | {
    type: (infer U)[];
}] ? U extends DateConstructor ? Date | InferPropType<U, false> : InferPropType<U, false> : [T] extends [Prop<infer V, infer D>] ? unknown extends V ? keyof V extends never ? IfAny<V, V, D> : V : V : T;
/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **internal** - i.e. the resolved props received by
 * the component.
 * - Boolean props are always present
 * - Props with default values are always present
 *
 * To extract accepted props from the parent, use {@link ExtractPublicPropTypes}.
 */
export type ExtractPropTypes<O> = {
    [K in keyof Pick<O, RequiredKeys<O>>]: O[K] extends {
        default: any;
    } ? Exclude<InferPropType<O[K]>, undefined> : InferPropType<O[K]>;
} & {
    [K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]>;
};
type PublicRequiredKeys<T> = {
    [K in keyof T]: T[K] extends {
        required: true;
    } ? K : never;
}[keyof T];
type PublicOptionalKeys<T> = Exclude<keyof T, PublicRequiredKeys<T>>;
/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **public** - i.e. the expected props that can be
 * passed to component.
 */
export type ExtractPublicPropTypes<O> = {
    [K in keyof Pick<O, PublicRequiredKeys<O>>]: InferPropType<O[K]>;
} & {
    [K in keyof Pick<O, PublicOptionalKeys<O>>]?: InferPropType<O[K]>;
};
export type ExtractDefaultPropTypes<O> = O extends object ? {
    [K in keyof Pick<O, DefaultKeys<O>>]: InferPropType<O[K]>;
} : {};

/**
 * Vue `<script setup>` compiler macro for declaring component props. The
 * expected argument is the same as the component `props` option.
 *
 * Example runtime declaration:
 * ```js
 * // using Array syntax
 * const props = defineProps(['foo', 'bar'])
 * // using Object syntax
 * const props = defineProps({
 *   foo: String,
 *   bar: {
 *     type: Number,
 *     required: true
 *   }
 * })
 * ```
 *
 * Equivalent type-based declaration:
 * ```ts
 * // will be compiled into equivalent runtime declarations
 * const props = defineProps<{
 *   foo?: string
 *   bar: number
 * }>()
 * ```
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits}
 *
 * This is only usable inside `<script setup>`, is compiled away in the
 * output and should **not** be actually called at runtime.
 */
export declare function defineProps<PropNames extends string = string>(props: PropNames[]): Prettify<Readonly<{
    [key in PropNames]?: any;
}>>;
export declare function defineProps<PP extends ComponentObjectPropsOptions = ComponentObjectPropsOptions>(props: PP): Prettify<Readonly<ExtractPropTypes<PP>>>;
export declare function defineProps<TypeProps>(): DefineProps<LooseRequired<TypeProps>, BooleanKey<TypeProps>>;
export type DefineProps<T, BKeys extends keyof T> = Readonly<T> & {
    readonly [K in BKeys]-?: boolean;
};
type BooleanKey<T, K extends keyof T = keyof T> = K extends any ? T[K] extends boolean | undefined ? T[K] extends never | undefined ? never : K : never : never;
/**
 * Vue `<script setup>` compiler macro for declaring a component's emitted
 * events. The expected argument is the same as the component `emits` option.
 *
 * Example runtime declaration:
 * ```js
 * const emit = defineEmits(['change', 'update'])
 * ```
 *
 * Example type-based declaration:
 * ```ts
 * const emit = defineEmits<{
 *   // <eventName>: <expected arguments>
 *   change: []
 *   update: [value: number] // named tuple syntax
 * }>()
 *
 * emit('change')
 * emit('update', 1)
 * ```
 *
 * This is only usable inside `<script setup>`, is compiled away in the
 * output and should **not** be actually called at runtime.
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineprops-defineemits}
 */
export declare function defineEmits<EE extends string = string>(emitOptions: EE[]): EmitFn<EE[]>;
export declare function defineEmits<E extends EmitsOptions = EmitsOptions>(emitOptions: E): EmitFn<E>;
export declare function defineEmits<T extends ComponentTypeEmits>(): T extends (...args: any[]) => any ? T : ShortEmits<T>;
export type ComponentTypeEmits = ((...args: any[]) => any) | Record<string, any>;
type RecordToUnion<T extends Record<string, any>> = T[keyof T];
type ShortEmits<T extends Record<string, any>> = UnionToIntersection<RecordToUnion<{
    [K in keyof T]: (evt: K, ...args: T[K]) => void;
}>>;
/**
 * Vue `<script setup>` compiler macro for declaring a component's exposed
 * instance properties when it is accessed by a parent component via template
 * refs.
 *
 * `<script setup>` components are closed by default - i.e. variables inside
 * the `<script setup>` scope is not exposed to parent unless explicitly exposed
 * via `defineExpose`.
 *
 * This is only usable inside `<script setup>`, is compiled away in the
 * output and should **not** be actually called at runtime.
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineexpose}
 */
export declare function defineExpose<Exposed extends Record<string, any> = Record<string, any>>(exposed?: Exposed): void;
/**
 * Vue `<script setup>` compiler macro for declaring a component's additional
 * options. This should be used only for options that cannot be expressed via
 * Composition API - e.g. `inheritAttrs`.
 *
 * @see {@link https://vuejs.org/api/sfc-script-setup.html#defineoptions}
 */
export declare function defineOptions<RawBindings = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin>(options?: ComponentOptionsBase<{}, RawBindings, D, C, M, Mixin, Extends, {}> & {
    /**
     * props should be defined via defineProps().
     */
    props?: never;
    /**
     * emits should be defined via defineEmits().
     */
    emits?: never;
    /**
     * expose should be defined via defineExpose().
     */
    expose?: never;
    /**
     * slots should be defined via defineSlots().
     */
    slots?: never;
}): void;
export declare function defineSlots<S extends Record<string, any> = Record<string, any>>(): StrictUnwrapSlotsType<SlotsType<S>>;
export type ModelRef<T, M extends PropertyKey = string, G = T, S = T> = Ref<G, S> & [
    ModelRef<T, M, G, S>,
    Record<M, true | undefined>
];
type DefineModelOptions<T = any, G = T, S = T> = {
    get?: (v: T) => G;
    set?: (v: S) => any;
};
/**
 * Vue `<script setup>` compiler macro for declaring a
 * two-way binding prop that can be consumed via `v-model` from the parent
 * component. This will declare a prop with the same name and a corresponding
 * `update:propName` event.
 *
 * If the first argument is a string, it will be used as the prop name;
 * Otherwise the prop name will default to "modelValue". In both cases, you
 * can also pass an additional object which will be used as the prop's options.
 *
 * The returned ref behaves differently depending on whether the parent
 * provided the corresponding v-model props or not:
 * - If yes, the returned ref's value will always be in sync with the parent
 *   prop.
 * - If not, the returned ref will behave like a normal local ref.
 *
 * @example
 * ```ts
 * // default model (consumed via `v-model`)
 * const modelValue = defineModel<string>()
 * modelValue.value = "hello"
 *
 * // default model with options
 * const modelValue = defineModel<string>({ required: true })
 *
 * // with specified name (consumed via `v-model:count`)
 * const count = defineModel<number>('count')
 * count.value++
 *
 * // with specified name and default value
 * const count = defineModel<number>('count', { default: 0 })
 * ```
 */
export declare function defineModel<T, M extends PropertyKey = string, G = T, S = T>(options: ({
    default: any;
} | {
    required: true;
}) & PropOptions<T> & DefineModelOptions<T, G, S>): ModelRef<T, M, G, S>;
export declare function defineModel<T, M extends PropertyKey = string, G = T, S = T>(options?: PropOptions<T> & DefineModelOptions<T, G, S>): ModelRef<T | undefined, M, G | undefined, S | undefined>;
export declare function defineModel<T, M extends PropertyKey = string, G = T, S = T>(name: string, options: ({
    default: any;
} | {
    required: true;
}) & PropOptions<T> & DefineModelOptions<T, G, S>): ModelRef<T, M, G, S>;
export declare function defineModel<T, M extends PropertyKey = string, G = T, S = T>(name: string, options?: PropOptions<T> & DefineModelOptions<T, G, S>): ModelRef<T | undefined, M, G | undefined, S | undefined>;
type NotUndefined<T> = T extends undefined ? never : T;
type MappedOmit<T, K extends keyof any> = {
    [P in keyof T as P extends K ? never : P]: T[P];
};
type InferDefaults<T> = {
    [K in keyof T]?: InferDefault<T, T[K]>;
};
type NativeType = null | undefined | number | string | boolean | symbol | Function;
type InferDefault<P, T> = ((props: P) => T & {}) | (T extends NativeType ? T : never);
type PropsWithDefaults<T, Defaults extends InferDefaults<T>, BKeys extends keyof T> = T extends unknown ? Readonly<MappedOmit<T, keyof Defaults>> & {
    readonly [K in keyof Defaults as K extends keyof T ? K : never]-?: K extends keyof T ? Defaults[K] extends undefined ? IfAny<Defaults[K], NotUndefined<T[K]>, T[K]> : NotUndefined<T[K]> : never;
} & {
    readonly [K in BKeys]-?: K extends keyof Defaults ? Defaults[K] extends undefined ? boolean | undefined : boolean : boolean;
} : never;
/**
 * Vue `<script setup>` compiler macro for providing props default values when
 * using type-based `defineProps` declaration.
 *
 * Example usage:
 * ```ts
 * withDefaults(defineProps<{
 *   size?: number
 *   labels?: string[]
 * }>(), {
 *   size: 3,
 *   labels: () => ['default label']
 * })
 * ```
 *
 * This is only usable inside `<script setup>`, is compiled away in the output
 * and should **not** be actually called at runtime.
 *
 * @see {@link https://vuejs.org/guide/typescript/composition-api.html#typing-component-props}
 */
export declare function withDefaults<T, BKeys extends keyof T, Defaults extends InferDefaults<T>>(props: DefineProps<T, BKeys>, defaults: Defaults): PropsWithDefaults<T, Defaults, BKeys>;
export declare function useSlots(): SetupContext['slots'];
export declare function useAttrs(): SetupContext['attrs'];

export type ObjectEmitsOptions = Record<string, ((...args: any[]) => any) | null>;
export type EmitsOptions = ObjectEmitsOptions | string[];
export type EmitsToProps<T extends EmitsOptions | ComponentTypeEmits> = T extends string[] ? {
    [K in `on${Capitalize<T[number]>}`]?: (...args: any[]) => any;
} : T extends ObjectEmitsOptions ? {
    [K in string & keyof T as `on${Capitalize<K>}`]?: (...args: T[K] extends (...args: infer P) => any ? P : T[K] extends null ? any[] : never) => any;
} : {};
type TypeEmitsToOptions<T extends ComponentTypeEmits> = {
    [K in keyof T & string]: T[K] extends [...args: infer Args] ? (...args: Args) => any : () => any;
} & (T extends (...args: any[]) => any ? ParametersToFns<OverloadParameters<T>> : {});
type ParametersToFns<T extends any[]> = {
    [K in T[0]]: IsStringLiteral<K> extends true ? (...args: T extends [e: infer E, ...args: infer P] ? K extends E ? P : never : never) => any : never;
};
type IsStringLiteral<T> = T extends string ? string extends T ? false : true : false;
export type ShortEmitsToObject<E> = E extends Record<string, any[]> ? {
    [K in keyof E]: (...args: E[K]) => any;
} : E;
export type EmitFn<Options = ObjectEmitsOptions, Event extends keyof Options = keyof Options> = Options extends Array<infer V> ? (event: V, ...args: any[]) => void : {} extends Options ? (event: string, ...args: any[]) => void : UnionToIntersection<{
    [key in Event]: Options[key] extends (...args: infer Args) => any ? (event: key, ...args: Args) => void : Options[key] extends any[] ? (event: key, ...args: Options[key]) => void : (event: key, ...args: any[]) => void;
}[Event]>;

/**
Runtime helper for applying directives to a vnode. Example usage:

const comp = resolveComponent('comp')
const foo = resolveDirective('foo')
const bar = resolveDirective('bar')

return withDirectives(h(comp), [
  [foo, this.x],
  [bar, this.y]
])
*/

export interface DirectiveBinding<Value = any, Modifiers extends string = string, Arg = any> {
    instance: ComponentPublicInstance | Record<string, any> | null;
    value: Value;
    oldValue: Value | null;
    arg?: Arg;
    modifiers: DirectiveModifiers<Modifiers>;
    dir: ObjectDirective<any, Value, Modifiers, Arg>;
}
export type DirectiveHook<HostElement = any, Prev = VNode<any, HostElement> | null, Value = any, Modifiers extends string = string, Arg = any> = (el: HostElement, binding: DirectiveBinding<Value, Modifiers, Arg>, vnode: VNode<any, HostElement>, prevVNode: Prev) => void;
type SSRDirectiveHook<Value = any, Modifiers extends string = string, Arg = any> = (binding: DirectiveBinding<Value, Modifiers, Arg>, vnode: VNode) => Data | undefined;
export interface ObjectDirective<HostElement = any, Value = any, Modifiers extends string = string, Arg = any> {
    created?: DirectiveHook<HostElement, null, Value, Modifiers, Arg>;
    beforeMount?: DirectiveHook<HostElement, null, Value, Modifiers, Arg>;
    mounted?: DirectiveHook<HostElement, null, Value, Modifiers, Arg>;
    beforeUpdate?: DirectiveHook<HostElement, VNode<any, HostElement>, Value, Modifiers, Arg>;
    updated?: DirectiveHook<HostElement, VNode<any, HostElement>, Value, Modifiers, Arg>;
    beforeUnmount?: DirectiveHook<HostElement, null, Value, Modifiers, Arg>;
    unmounted?: DirectiveHook<HostElement, null, Value, Modifiers, Arg>;
    getSSRProps?: SSRDirectiveHook<Value, Modifiers, Arg>;
    deep?: boolean;
}
export type FunctionDirective<HostElement = any, V = any, Modifiers extends string = string, Arg = any> = DirectiveHook<HostElement, any, V, Modifiers, Arg>;
export type Directive<HostElement = any, Value = any, Modifiers extends string = string, Arg = any> = ObjectDirective<HostElement, Value, Modifiers, Arg> | FunctionDirective<HostElement, Value, Modifiers, Arg>;
export type DirectiveModifiers<K extends string = string> = Partial<Record<K, boolean>>;
export type DirectiveArguments = Array<[Directive | undefined] | [Directive | undefined, any] | [Directive | undefined, any, any] | [Directive | undefined, any, any, DirectiveModifiers]>;
/**
 * Adds directives to a VNode.
 */
export declare function withDirectives<T extends VNode>(vnode: T, directives: DirectiveArguments): T;

/**
 * Custom properties added to component instances in any way and can be accessed through `this`
 *
 * @example
 * Here is an example of adding a property `$router` to every component instance:
 * ```ts
 * import { createApp } from 'vue'
 * import { Router, createRouter } from 'vue-router'
 *
 * declare module 'vue' {
 *   interface ComponentCustomProperties {
 *     $router: Router
 *   }
 * }
 *
 * // effectively adding the router to every component instance
 * const app = createApp({})
 * const router = createRouter()
 * app.config.globalProperties.$router = router
 *
 * const vm = app.mount('#app')
 * // we can access the router from the instance
 * vm.$router.push('/')
 * ```
 */
export interface ComponentCustomProperties {
}
type IsDefaultMixinComponent<T> = T extends ComponentOptionsMixin ? ComponentOptionsMixin extends T ? true : false : false;
type MixinToOptionTypes<T> = T extends ComponentOptionsBase<infer P, infer B, infer D, infer C, infer M, infer Mixin, infer Extends, any, any, infer Defaults, any, any, any, any, any, any, any> ? OptionTypesType<P & {}, B & {}, D & {}, C & {}, M & {}, Defaults & {}> & IntersectionMixin<Mixin> & IntersectionMixin<Extends> : never;
type ExtractMixin<T> = {
    Mixin: MixinToOptionTypes<T>;
}[T extends ComponentOptionsMixin ? 'Mixin' : never];
type IntersectionMixin<T> = IsDefaultMixinComponent<T> extends true ? OptionTypesType : UnionToIntersection<ExtractMixin<T>>;
type UnwrapMixinsType<T, Type extends OptionTypesKeys> = T extends OptionTypesType ? T[Type] : never;
type EnsureNonVoid<T> = T extends void ? {} : T;
type ComponentPublicInstanceConstructor<T extends ComponentPublicInstance<Props, RawBindings, D, C, M> = ComponentPublicInstance<any>, Props = any, RawBindings = any, D = any, C extends ComputedOptions = ComputedOptions, M extends MethodOptions = MethodOptions> = {
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
    new (...args: any[]): T;
};
/**
 * @deprecated This is no longer used internally, but exported and relied on by
 * existing library types generated by vue-tsc.
 */
export type CreateComponentPublicInstance<P = {}, B = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, PublicProps = P, Defaults = {}, MakeDefaultsOptional extends boolean = false, I extends ComponentInjectOptions = {}, S extends SlotsType = {}, PublicMixin = IntersectionMixin<Mixin> & IntersectionMixin<Extends>, PublicP = UnwrapMixinsType<PublicMixin, 'P'> & EnsureNonVoid<P>, PublicB = UnwrapMixinsType<PublicMixin, 'B'> & EnsureNonVoid<B>, PublicD = UnwrapMixinsType<PublicMixin, 'D'> & EnsureNonVoid<D>, PublicC extends ComputedOptions = UnwrapMixinsType<PublicMixin, 'C'> & EnsureNonVoid<C>, PublicM extends MethodOptions = UnwrapMixinsType<PublicMixin, 'M'> & EnsureNonVoid<M>, PublicDefaults = UnwrapMixinsType<PublicMixin, 'Defaults'> & EnsureNonVoid<Defaults>> = ComponentPublicInstance<PublicP, PublicB, PublicD, PublicC, PublicM, E, PublicProps, PublicDefaults, MakeDefaultsOptional, ComponentOptionsBase<P, B, D, C, M, Mixin, Extends, E, string, Defaults, {}, string, S>, I, S>;
/**
 * This is the same as `CreateComponentPublicInstance` but adds local components,
 * global directives, exposed, and provide inference.
 * It changes the arguments order so that we don't need to repeat mixin
 * inference everywhere internally, but it has to be a new type to avoid
 * breaking types that relies on previous arguments order (#10842)
 */
export type CreateComponentPublicInstanceWithMixins<P = {}, B = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, PublicProps = P, Defaults = {}, MakeDefaultsOptional extends boolean = false, I extends ComponentInjectOptions = {}, S extends SlotsType = {}, LC extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, TypeRefs extends Data = {}, TypeEl extends Element = any, Provide extends ComponentProvideOptions = ComponentProvideOptions, PublicMixin = IntersectionMixin<Mixin> & IntersectionMixin<Extends>, PublicP = UnwrapMixinsType<PublicMixin, 'P'> & EnsureNonVoid<P>, PublicB = UnwrapMixinsType<PublicMixin, 'B'> & EnsureNonVoid<B>, PublicD = UnwrapMixinsType<PublicMixin, 'D'> & EnsureNonVoid<D>, PublicC extends ComputedOptions = UnwrapMixinsType<PublicMixin, 'C'> & EnsureNonVoid<C>, PublicM extends MethodOptions = UnwrapMixinsType<PublicMixin, 'M'> & EnsureNonVoid<M>, PublicDefaults = UnwrapMixinsType<PublicMixin, 'Defaults'> & EnsureNonVoid<Defaults>> = ComponentPublicInstance<PublicP, PublicB, PublicD, PublicC, PublicM, E, PublicProps, PublicDefaults, MakeDefaultsOptional, ComponentOptionsBase<P, B, D, C, M, Mixin, Extends, E, string, Defaults, {}, string, S, LC, Directives, Exposed, Provide>, I, S, Exposed, TypeRefs, TypeEl>;
type ExposedKeys<T, Exposed extends string & keyof T> = '' extends Exposed ? T : Pick<T, Exposed>;
export type ComponentPublicInstance<P = {}, // props type extracted from props option
B = {}, // raw bindings returned from setup()
D = {}, // return from data()
C extends ComputedOptions = {}, M extends MethodOptions = {}, E extends EmitsOptions = {}, PublicProps = {}, Defaults = {}, MakeDefaultsOptional extends boolean = false, Options = ComponentOptionsBase<any, any, any, any, any, any, any, any, any>, I extends ComponentInjectOptions = {}, S extends SlotsType = {}, Exposed extends string = '', TypeRefs extends Data = {}, TypeEl extends Element = any> = {
    $: ComponentInternalInstance;
    $data: D;
    $props: MakeDefaultsOptional extends true ? Partial<Defaults> & Omit<Prettify<P> & PublicProps, keyof Defaults> : Prettify<P> & PublicProps;
    $attrs: Data;
    $refs: Data & TypeRefs;
    $slots: UnwrapSlotsType<S>;
    $root: ComponentPublicInstance | null;
    $parent: ComponentPublicInstance | null;
    $host: Element | null;
    $emit: EmitFn<E>;
    $el: TypeEl;
    $options: Options & MergedComponentOptionsOverride;
    $forceUpdate: () => void;
    $nextTick: typeof nextTick;
    $watch<T extends string | ((...args: any) => any)>(source: T, cb: T extends (...args: any) => infer R ? (...args: [R, R, OnCleanup]) => any : (...args: [any, any, OnCleanup]) => any, options?: WatchOptions): WatchStopHandle;
} & ExposedKeys<IfAny<P, P, Readonly<Defaults> & Omit<P, keyof ShallowUnwrapRef<B> | keyof Defaults>> & ShallowUnwrapRef<B> & UnwrapNestedRefs<D> & ExtractComputedReturns<C> & M & ComponentCustomProperties & InjectToObject<I>, Exposed>;

declare enum LifecycleHooks {
    BEFORE_CREATE = "bc",
    CREATED = "c",
    BEFORE_MOUNT = "bm",
    MOUNTED = "m",
    BEFORE_UPDATE = "bu",
    UPDATED = "u",
    BEFORE_UNMOUNT = "bum",
    UNMOUNTED = "um",
    DEACTIVATED = "da",
    ACTIVATED = "a",
    RENDER_TRIGGERED = "rtg",
    RENDER_TRACKED = "rtc",
    ERROR_CAPTURED = "ec",
    SERVER_PREFETCH = "sp"
}

export interface SuspenseProps {
    onResolve?: () => void;
    onPending?: () => void;
    onFallback?: () => void;
    timeout?: string | number;
    /**
     * Allow suspense to be captured by parent suspense
     *
     * @default false
     */
    suspensible?: boolean;
}
declare const SuspenseImpl: {
    name: string;
    __isSuspense: boolean;
    process(n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, slotScopeIds: string[] | null, optimized: boolean, rendererInternals: RendererInternals): void;
    hydrate: typeof hydrateSuspense;
    normalize: typeof normalizeSuspenseChildren;
};
export declare const Suspense: {
    __isSuspense: true;
    new (): {
        $props: VNodeProps & SuspenseProps;
        $slots: {
            default(): VNode[];
            fallback(): VNode[];
        };
    };
};
export interface SuspenseBoundary {
    vnode: VNode<RendererNode, RendererElement, SuspenseProps>;
    parent: SuspenseBoundary | null;
    parentComponent: ComponentInternalInstance | null;
    namespace: ElementNamespace;
    container: RendererElement;
    hiddenContainer: RendererElement;
    activeBranch: VNode | null;
    pendingBranch: VNode | null;
    deps: number;
    pendingId: number;
    timeout: number;
    isInFallback: boolean;
    isHydrating: boolean;
    isUnmounted: boolean;
    effects: Function[];
    resolve(force?: boolean, sync?: boolean): void;
    fallback(fallbackVNode: VNode): void;
    move(container: RendererElement, anchor: RendererNode | null, type: MoveType): void;
    next(): RendererNode | null;
    registerDep(instance: ComponentInternalInstance, setupRenderEffect: SetupRenderEffectFn, optimized: boolean): void;
    unmount(parentSuspense: SuspenseBoundary | null, doRemove?: boolean): void;
}
declare function hydrateSuspense(node: Node, vnode: VNode, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, slotScopeIds: string[] | null, optimized: boolean, rendererInternals: RendererInternals, hydrateNode: (node: Node, vnode: VNode, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, slotScopeIds: string[] | null, optimized: boolean) => Node | null): Node | null;
declare function normalizeSuspenseChildren(vnode: VNode): void;

export type RootHydrateFunction = (vnode: VNode<Node, Element>, container: (Element | ShadowRoot) & {
    _vnode?: VNode;
}) => void;

type Hook<T = () => void> = T | T[];
export interface BaseTransitionProps<HostElement = RendererElement> {
    mode?: 'in-out' | 'out-in' | 'default';
    appear?: boolean;
    persisted?: boolean;
    onBeforeEnter?: Hook<(el: HostElement) => void>;
    onEnter?: Hook<(el: HostElement, done: () => void) => void>;
    onAfterEnter?: Hook<(el: HostElement) => void>;
    onEnterCancelled?: Hook<(el: HostElement) => void>;
    onBeforeLeave?: Hook<(el: HostElement) => void>;
    onLeave?: Hook<(el: HostElement, done: () => void) => void>;
    onAfterLeave?: Hook<(el: HostElement) => void>;
    onLeaveCancelled?: Hook<(el: HostElement) => void>;
    onBeforeAppear?: Hook<(el: HostElement) => void>;
    onAppear?: Hook<(el: HostElement, done: () => void) => void>;
    onAfterAppear?: Hook<(el: HostElement) => void>;
    onAppearCancelled?: Hook<(el: HostElement) => void>;
}
export interface TransitionHooks<HostElement = RendererElement> {
    mode: BaseTransitionProps['mode'];
    persisted: boolean;
    beforeEnter(el: HostElement): void;
    enter(el: HostElement): void;
    leave(el: HostElement, remove: () => void): void;
    clone(vnode: VNode): TransitionHooks<HostElement>;
    afterLeave?(): void;
    delayLeave?(el: HostElement, earlyRemove: () => void, delayedLeave: () => void): void;
    delayedLeave?(): void;
}
export interface TransitionState {
    isMounted: boolean;
    isLeaving: boolean;
    isUnmounting: boolean;
    leavingVNodes: Map<any, Record<string, VNode>>;
}
export declare function useTransitionState(): TransitionState;
export declare const BaseTransitionPropsValidators: Record<string, any>;
export declare const BaseTransition: {
    new (): {
        $props: BaseTransitionProps<any>;
        $slots: {
            default(): VNode[];
        };
    };
};
export declare function resolveTransitionHooks(vnode: VNode, props: BaseTransitionProps<any>, state: TransitionState, instance: ComponentInternalInstance, postClone?: (hooks: TransitionHooks) => void): TransitionHooks;
export declare function setTransitionHooks(vnode: VNode, hooks: TransitionHooks): void;
export declare function getTransitionRawChildren(children: VNode[], keepComment?: boolean, parentKey?: VNode['key']): VNode[];

export interface Renderer<HostElement = RendererElement> {
    render: RootRenderFunction<HostElement>;
    createApp: CreateAppFunction<HostElement>;
}
export interface HydrationRenderer extends Renderer<Element | ShadowRoot> {
    hydrate: RootHydrateFunction;
}
export type ElementNamespace = 'svg' | 'mathml' | undefined;
export type RootRenderFunction<HostElement = RendererElement> = (vnode: VNode | null, container: HostElement, namespace?: ElementNamespace) => void;
export interface RendererOptions<HostNode = RendererNode, HostElement = RendererElement> {
    patchProp(el: HostElement, key: string, prevValue: any, nextValue: any, namespace?: ElementNamespace, parentComponent?: ComponentInternalInstance | null): void;
    insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void;
    remove(el: HostNode): void;
    createElement(type: string, namespace?: ElementNamespace, isCustomizedBuiltIn?: string, vnodeProps?: (VNodeProps & {
        [key: string]: any;
    }) | null): HostElement;
    createText(text: string): HostNode;
    createComment(text: string): HostNode;
    setText(node: HostNode, text: string): void;
    setElementText(node: HostElement, text: string): void;
    parentNode(node: HostNode): HostElement | null;
    nextSibling(node: HostNode): HostNode | null;
    querySelector?(selector: string): HostElement | null;
    setScopeId?(el: HostElement, id: string): void;
    cloneNode?(node: HostNode): HostNode;
    insertStaticContent?(content: string, parent: HostElement, anchor: HostNode | null, namespace: ElementNamespace, start?: HostNode | null, end?: HostNode | null): [HostNode, HostNode];
}
export interface RendererNode {
    [key: string | symbol]: any;
}
export interface RendererElement extends RendererNode {
}
interface RendererInternals<HostNode = RendererNode, HostElement = RendererElement> {
    p: PatchFn;
    um: UnmountFn;
    r: RemoveFn;
    m: MoveFn;
    mt: MountComponentFn;
    mc: MountChildrenFn;
    pc: PatchChildrenFn;
    pbc: PatchBlockChildrenFn;
    n: NextFn;
    o: RendererOptions<HostNode, HostElement>;
}
type PatchFn = (n1: VNode | null, // null means this is a mount
n2: VNode, container: RendererElement, anchor?: RendererNode | null, parentComponent?: ComponentInternalInstance | null, parentSuspense?: SuspenseBoundary | null, namespace?: ElementNamespace, slotScopeIds?: string[] | null, optimized?: boolean) => void;
type MountChildrenFn = (children: VNodeArrayChildren, container: RendererElement, anchor: RendererNode | null, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, slotScopeIds: string[] | null, optimized: boolean, start?: number) => void;
type PatchChildrenFn = (n1: VNode | null, n2: VNode, container: RendererElement, anchor: RendererNode | null, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, slotScopeIds: string[] | null, optimized: boolean) => void;
type PatchBlockChildrenFn = (oldChildren: VNode[], newChildren: VNode[], fallbackContainer: RendererElement, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, slotScopeIds: string[] | null) => void;
type MoveFn = (vnode: VNode, container: RendererElement, anchor: RendererNode | null, type: MoveType, parentSuspense?: SuspenseBoundary | null) => void;
type NextFn = (vnode: VNode) => RendererNode | null;
type UnmountFn = (vnode: VNode, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, doRemove?: boolean, optimized?: boolean) => void;
type RemoveFn = (vnode: VNode) => void;
type MountComponentFn = (initialVNode: VNode, container: RendererElement, anchor: RendererNode | null, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, optimized: boolean) => void;
type SetupRenderEffectFn = (instance: ComponentInternalInstance, initialVNode: VNode, container: RendererElement, anchor: RendererNode | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, optimized: boolean) => void;
declare enum MoveType {
    ENTER = 0,
    LEAVE = 1,
    REORDER = 2
}
/**
 * The createRenderer function accepts two generic arguments:
 * HostNode and HostElement, corresponding to Node and Element types in the
 * host environment. For example, for runtime-dom, HostNode would be the DOM
 * `Node` interface and HostElement would be the DOM `Element` interface.
 *
 * Custom renderers can pass in the platform specific types like this:
 *
 * ``` js
 * const { render, createApp } = createRenderer<Node, Element>({
 *   patchProp,
 *   ...nodeOps
 * })
 * ```
 */
export declare function createRenderer<HostNode = RendererNode, HostElement = RendererElement>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>;
export declare function createHydrationRenderer(options: RendererOptions<Node, Element>): HydrationRenderer;

type MatchPattern = string | RegExp | (string | RegExp)[];
export interface KeepAliveProps {
    include?: MatchPattern;
    exclude?: MatchPattern;
    max?: number | string;
}
export declare const KeepAlive: {
    __isKeepAlive: true;
    new (): {
        $props: VNodeProps & KeepAliveProps;
        $slots: {
            default(): VNode[];
        };
    };
};
export declare function onActivated(hook: Function, target?: ComponentInternalInstance | null): void;
export declare function onDeactivated(hook: Function, target?: ComponentInternalInstance | null): void;

type CreateHook<T = any> = (hook: T, target?: ComponentInternalInstance | null) => void;
export declare const onBeforeMount: CreateHook;
export declare const onMounted: CreateHook;
export declare const onBeforeUpdate: CreateHook;
export declare const onUpdated: CreateHook;
export declare const onBeforeUnmount: CreateHook;
export declare const onUnmounted: CreateHook;
export declare const onServerPrefetch: CreateHook;
type DebuggerHook = (e: DebuggerEvent) => void;
export declare const onRenderTriggered: CreateHook<DebuggerHook>;
export declare const onRenderTracked: CreateHook<DebuggerHook>;
type ErrorCapturedHook<TError = unknown> = (err: TError, instance: ComponentPublicInstance | null, info: string) => boolean | void;
export declare function onErrorCaptured<TError = Error>(hook: ErrorCapturedHook<TError>, target?: ComponentInternalInstance | null): void;

declare enum DeprecationTypes$1 {
    GLOBAL_MOUNT = "GLOBAL_MOUNT",
    GLOBAL_MOUNT_CONTAINER = "GLOBAL_MOUNT_CONTAINER",
    GLOBAL_EXTEND = "GLOBAL_EXTEND",
    GLOBAL_PROTOTYPE = "GLOBAL_PROTOTYPE",
    GLOBAL_SET = "GLOBAL_SET",
    GLOBAL_DELETE = "GLOBAL_DELETE",
    GLOBAL_OBSERVABLE = "GLOBAL_OBSERVABLE",
    GLOBAL_PRIVATE_UTIL = "GLOBAL_PRIVATE_UTIL",
    CONFIG_SILENT = "CONFIG_SILENT",
    CONFIG_DEVTOOLS = "CONFIG_DEVTOOLS",
    CONFIG_KEY_CODES = "CONFIG_KEY_CODES",
    CONFIG_PRODUCTION_TIP = "CONFIG_PRODUCTION_TIP",
    CONFIG_IGNORED_ELEMENTS = "CONFIG_IGNORED_ELEMENTS",
    CONFIG_WHITESPACE = "CONFIG_WHITESPACE",
    CONFIG_OPTION_MERGE_STRATS = "CONFIG_OPTION_MERGE_STRATS",
    INSTANCE_SET = "INSTANCE_SET",
    INSTANCE_DELETE = "INSTANCE_DELETE",
    INSTANCE_DESTROY = "INSTANCE_DESTROY",
    INSTANCE_EVENT_EMITTER = "INSTANCE_EVENT_EMITTER",
    INSTANCE_EVENT_HOOKS = "INSTANCE_EVENT_HOOKS",
    INSTANCE_CHILDREN = "INSTANCE_CHILDREN",
    INSTANCE_LISTENERS = "INSTANCE_LISTENERS",
    INSTANCE_SCOPED_SLOTS = "INSTANCE_SCOPED_SLOTS",
    INSTANCE_ATTRS_CLASS_STYLE = "INSTANCE_ATTRS_CLASS_STYLE",
    OPTIONS_DATA_FN = "OPTIONS_DATA_FN",
    OPTIONS_DATA_MERGE = "OPTIONS_DATA_MERGE",
    OPTIONS_BEFORE_DESTROY = "OPTIONS_BEFORE_DESTROY",
    OPTIONS_DESTROYED = "OPTIONS_DESTROYED",
    WATCH_ARRAY = "WATCH_ARRAY",
    PROPS_DEFAULT_THIS = "PROPS_DEFAULT_THIS",
    V_ON_KEYCODE_MODIFIER = "V_ON_KEYCODE_MODIFIER",
    CUSTOM_DIR = "CUSTOM_DIR",
    ATTR_FALSE_VALUE = "ATTR_FALSE_VALUE",
    ATTR_ENUMERATED_COERCION = "ATTR_ENUMERATED_COERCION",
    TRANSITION_CLASSES = "TRANSITION_CLASSES",
    TRANSITION_GROUP_ROOT = "TRANSITION_GROUP_ROOT",
    COMPONENT_ASYNC = "COMPONENT_ASYNC",
    COMPONENT_FUNCTIONAL = "COMPONENT_FUNCTIONAL",
    COMPONENT_V_MODEL = "COMPONENT_V_MODEL",
    RENDER_FUNCTION = "RENDER_FUNCTION",
    FILTERS = "FILTERS",
    PRIVATE_APIS = "PRIVATE_APIS"
}
type CompatConfig = Partial<Record<DeprecationTypes$1, boolean | 'suppress-warning'>> & {
    MODE?: 2 | 3 | ((comp: Component | null) => 2 | 3);
};
declare function configureCompat(config: CompatConfig): void;

/**
 * Interface for declaring custom options.
 *
 * @example
 * ```ts
 * declare module 'vue' {
 *   interface ComponentCustomOptions {
 *     beforeRouteUpdate?(
 *       to: Route,
 *       from: Route,
 *       next: () => void
 *     ): void
 *   }
 * }
 * ```
 */
export interface ComponentCustomOptions {
}
export type RenderFunction = () => VNodeChild;
export interface ComponentOptionsBase<Props, RawBindings, D, C extends ComputedOptions, M extends MethodOptions, Mixin extends ComponentOptionsMixin, Extends extends ComponentOptionsMixin, E extends EmitsOptions, EE extends string = string, Defaults = {}, I extends ComponentInjectOptions = {}, II extends string = string, S extends SlotsType = {}, LC extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions> extends LegacyOptions<Props, D, C, M, Mixin, Extends, I, II, Provide>, ComponentInternalOptions, ComponentCustomOptions {
    setup?: (this: void, props: LooseRequired<Props & Prettify<UnwrapMixinsType<IntersectionMixin<Mixin> & IntersectionMixin<Extends>, 'P'>>>, ctx: SetupContext<E, S>) => Promise<RawBindings> | RawBindings | RenderFunction | void;
    name?: string;
    template?: string | object;
    render?: Function;
    components?: LC & Record<string, Component>;
    directives?: Directives & Record<string, Directive>;
    inheritAttrs?: boolean;
    emits?: (E | EE[]) & ThisType<void>;
    slots?: S;
    expose?: Exposed[];
    serverPrefetch?(): void | Promise<any>;
    compilerOptions?: RuntimeCompilerOptions;
    call?: (this: unknown, ...args: unknown[]) => never;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
    __defaults?: Defaults;
}
/**
 * Subset of compiler options that makes sense for the runtime.
 */
export interface RuntimeCompilerOptions {
    isCustomElement?: (tag: string) => boolean;
    whitespace?: 'preserve' | 'condense';
    comments?: boolean;
    delimiters?: [string, string];
}
export type ComponentOptions<Props = {}, RawBindings = any, D = any, C extends ComputedOptions = any, M extends MethodOptions = any, Mixin extends ComponentOptionsMixin = any, Extends extends ComponentOptionsMixin = any, E extends EmitsOptions = any, EE extends string = string, Defaults = {}, I extends ComponentInjectOptions = {}, II extends string = string, S extends SlotsType = {}, LC extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions> = ComponentOptionsBase<Props, RawBindings, D, C, M, Mixin, Extends, E, EE, Defaults, I, II, S, LC, Directives, Exposed, Provide> & ThisType<CreateComponentPublicInstanceWithMixins<{}, RawBindings, D, C, M, Mixin, Extends, E, Readonly<Props>, Defaults, false, I, S, LC, Directives>>;
export type ComponentOptionsMixin = ComponentOptionsBase<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;
export type ComputedOptions = Record<string, ComputedGetter<any> | WritableComputedOptions<any>>;
export interface MethodOptions {
    [key: string]: Function;
}
type ExtractComputedReturns<T extends any> = {
    [key in keyof T]: T[key] extends {
        get: (...args: any[]) => infer TReturn;
    } ? TReturn : T[key] extends (...args: any[]) => infer TReturn ? TReturn : never;
};
type ObjectWatchOptionItem = {
    handler: WatchCallback | string;
} & WatchOptions;
type WatchOptionItem = string | WatchCallback | ObjectWatchOptionItem;
type ComponentWatchOptionItem = WatchOptionItem | WatchOptionItem[];
type ComponentWatchOptions = Record<string, ComponentWatchOptionItem>;
export type ComponentProvideOptions = ObjectProvideOptions | Function;
type ObjectProvideOptions = Record<string | symbol, unknown>;
export type ComponentInjectOptions = string[] | ObjectInjectOptions;
type ObjectInjectOptions = Record<string | symbol, string | symbol | {
    from?: string | symbol;
    default?: unknown;
}>;
type InjectToObject<T extends ComponentInjectOptions> = T extends string[] ? {
    [K in T[number]]?: unknown;
} : T extends ObjectInjectOptions ? {
    [K in keyof T]?: unknown;
} : never;
interface LegacyOptions<Props, D, C extends ComputedOptions, M extends MethodOptions, Mixin extends ComponentOptionsMixin, Extends extends ComponentOptionsMixin, I extends ComponentInjectOptions, II extends string, Provide extends ComponentProvideOptions = ComponentProvideOptions> {
    compatConfig?: CompatConfig;
    [key: string]: any;
    data?: (this: CreateComponentPublicInstanceWithMixins<Props, {}, {}, {}, MethodOptions, Mixin, Extends>, vm: CreateComponentPublicInstanceWithMixins<Props, {}, {}, {}, MethodOptions, Mixin, Extends>) => D;
    computed?: C;
    methods?: M;
    watch?: ComponentWatchOptions;
    provide?: Provide;
    inject?: I | II[];
    filters?: Record<string, Function>;
    mixins?: Mixin[];
    extends?: Extends;
    beforeCreate?(): any;
    created?(): any;
    beforeMount?(): any;
    mounted?(): any;
    beforeUpdate?(): any;
    updated?(): any;
    activated?(): any;
    deactivated?(): any;
    /** @deprecated use `beforeUnmount` instead */
    beforeDestroy?(): any;
    beforeUnmount?(): any;
    /** @deprecated use `unmounted` instead */
    destroyed?(): any;
    unmounted?(): any;
    renderTracked?: DebuggerHook;
    renderTriggered?: DebuggerHook;
    errorCaptured?: ErrorCapturedHook;
    /**
     * runtime compile only
     * @deprecated use `compilerOptions.delimiters` instead.
     */
    delimiters?: [string, string];
    /**
     * #3468
     *
     * type-only, used to assist Mixin's type inference,
     * TypeScript will try to simplify the inferred `Mixin` type,
     * with the `__differentiator`, TypeScript won't be able to combine different mixins,
     * because the `__differentiator` will be different
     */
    __differentiator?: keyof D | keyof C | keyof M;
}
type MergedHook<T = () => void> = T | T[];
type MergedComponentOptionsOverride = {
    beforeCreate?: MergedHook;
    created?: MergedHook;
    beforeMount?: MergedHook;
    mounted?: MergedHook;
    beforeUpdate?: MergedHook;
    updated?: MergedHook;
    activated?: MergedHook;
    deactivated?: MergedHook;
    /** @deprecated use `beforeUnmount` instead */
    beforeDestroy?: MergedHook;
    beforeUnmount?: MergedHook;
    /** @deprecated use `unmounted` instead */
    destroyed?: MergedHook;
    unmounted?: MergedHook;
    renderTracked?: MergedHook<DebuggerHook>;
    renderTriggered?: MergedHook<DebuggerHook>;
    errorCaptured?: MergedHook<ErrorCapturedHook>;
};
type OptionTypesKeys = 'P' | 'B' | 'D' | 'C' | 'M' | 'Defaults';
type OptionTypesType<P = {}, B = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Defaults = {}> = {
    P: P;
    B: B;
    D: D;
    C: C;
    M: M;
    Defaults: Defaults;
};
/**
 * @deprecated
 */
export type ComponentOptionsWithoutProps<Props = {}, RawBindings = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, EE extends string = string, I extends ComponentInjectOptions = {}, II extends string = string, S extends SlotsType = {}, LC extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions, TE extends ComponentTypeEmits = {}, ResolvedEmits extends EmitsOptions = {} extends E ? TypeEmitsToOptions<TE> : E, PE = Props & EmitsToProps<ResolvedEmits>> = ComponentOptionsBase<PE, RawBindings, D, C, M, Mixin, Extends, E, EE, {}, I, II, S, LC, Directives, Exposed, Provide> & {
    props?: never;
    /**
     * @private for language-tools use only
     */
    __typeProps?: Props;
    /**
     * @private for language-tools use only
     */
    __typeEmits?: TE;
} & ThisType<CreateComponentPublicInstanceWithMixins<PE, RawBindings, D, C, M, Mixin, Extends, ResolvedEmits, EE, {}, false, I, S, LC, Directives, string>>;
/**
 * @deprecated
 */
export type ComponentOptionsWithArrayProps<PropNames extends string = string, RawBindings = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = EmitsOptions, EE extends string = string, I extends ComponentInjectOptions = {}, II extends string = string, S extends SlotsType = {}, LC extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions, Props = Prettify<Readonly<{
    [key in PropNames]?: any;
} & EmitsToProps<E>>>> = ComponentOptionsBase<Props, RawBindings, D, C, M, Mixin, Extends, E, EE, {}, I, II, S, LC, Directives, Exposed, Provide> & {
    props: PropNames[];
} & ThisType<CreateComponentPublicInstanceWithMixins<Props, RawBindings, D, C, M, Mixin, Extends, E, Props, {}, false, I, S, LC, Directives, string>>;
/**
 * @deprecated
 */
export type ComponentOptionsWithObjectProps<PropsOptions = ComponentObjectPropsOptions, RawBindings = {}, D = {}, C extends ComputedOptions = {}, M extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = EmitsOptions, EE extends string = string, I extends ComponentInjectOptions = {}, II extends string = string, S extends SlotsType = {}, LC extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions, Props = Prettify<Readonly<ExtractPropTypes<PropsOptions>> & Readonly<EmitsToProps<E>>>, Defaults = ExtractDefaultPropTypes<PropsOptions>> = ComponentOptionsBase<Props, RawBindings, D, C, M, Mixin, Extends, E, EE, Defaults, I, II, S, LC, Directives, Exposed, Provide> & {
    props: PropsOptions & ThisType<void>;
} & ThisType<CreateComponentPublicInstanceWithMixins<Props, RawBindings, D, C, M, Mixin, Extends, E, Props, Defaults, false, I, S, LC, Directives>>;

interface InjectionConstraint<T> {
}
export type InjectionKey<T> = symbol & InjectionConstraint<T>;
export declare function provide<T, K = InjectionKey<T> | string | number>(key: K, value: K extends InjectionKey<infer V> ? V : T): void;
export declare function inject<T>(key: InjectionKey<T> | string): T | undefined;
export declare function inject<T>(key: InjectionKey<T> | string, defaultValue: T, treatDefaultAsFactory?: false): T;
export declare function inject<T>(key: InjectionKey<T> | string, defaultValue: T | (() => T), treatDefaultAsFactory: true): T;
/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place (e.g. outside of
 * setup()). This is used by libraries that want to use `inject()` internally without triggering a warning to the end
 * user. One example is `useRoute()` in `vue-router`.
 */
export declare function hasInjectionContext(): boolean;

export type PublicProps = VNodeProps & AllowedComponentProps & ComponentCustomProps;
type ResolveProps<PropsOrPropOptions, E extends EmitsOptions> = Readonly<PropsOrPropOptions extends ComponentPropsOptions ? ExtractPropTypes<PropsOrPropOptions> : PropsOrPropOptions> & ({} extends E ? {} : EmitsToProps<E>);
export type DefineComponent<PropsOrPropOptions = {}, RawBindings = {}, D = {}, C extends ComputedOptions = ComputedOptions, M extends MethodOptions = MethodOptions, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, E extends EmitsOptions = {}, EE extends string = string, PP = PublicProps, Props = ResolveProps<PropsOrPropOptions, E>, Defaults = ExtractDefaultPropTypes<PropsOrPropOptions>, S extends SlotsType = {}, LC extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions, MakeDefaultsOptional extends boolean = true, TypeRefs extends Record<string, unknown> = {}, TypeEl extends Element = any> = ComponentPublicInstanceConstructor<CreateComponentPublicInstanceWithMixins<Props, RawBindings, D, C, M, Mixin, Extends, E, PP, Defaults, MakeDefaultsOptional, {}, S, LC & GlobalComponents, Directives & GlobalDirectives, Exposed, TypeRefs, TypeEl>> & ComponentOptionsBase<Props, RawBindings, D, C, M, Mixin, Extends, E, EE, Defaults, {}, string, S, LC & GlobalComponents, Directives & GlobalDirectives, Exposed, Provide> & PP;
export type DefineSetupFnComponent<P extends Record<string, any>, E extends EmitsOptions = {}, S extends SlotsType = SlotsType, Props = P & EmitsToProps<E>, PP = PublicProps> = new (props: Props & PP) => CreateComponentPublicInstanceWithMixins<Props, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, E, PP, {}, false, {}, S>;
type ToResolvedProps<Props, Emits extends EmitsOptions> = Readonly<Props> & Readonly<EmitsToProps<Emits>>;
export declare function defineComponent<Props extends Record<string, any>, E extends EmitsOptions = {}, EE extends string = string, S extends SlotsType = {}>(setup: (props: Props, ctx: SetupContext<E, S>) => RenderFunction | Promise<RenderFunction>, options?: Pick<ComponentOptions, 'name' | 'inheritAttrs'> & {
    props?: (keyof Props)[];
    emits?: E | EE[];
    slots?: S;
}): DefineSetupFnComponent<Props, E, S>;
export declare function defineComponent<Props extends Record<string, any>, E extends EmitsOptions = {}, EE extends string = string, S extends SlotsType = {}>(setup: (props: Props, ctx: SetupContext<E, S>) => RenderFunction | Promise<RenderFunction>, options?: Pick<ComponentOptions, 'name' | 'inheritAttrs'> & {
    props?: ComponentObjectPropsOptions<Props>;
    emits?: E | EE[];
    slots?: S;
}): DefineSetupFnComponent<Props, E, S>;
export declare function defineComponent<TypeProps, RuntimePropsOptions extends ComponentObjectPropsOptions = ComponentObjectPropsOptions, RuntimePropsKeys extends string = string, TypeEmits extends ComponentTypeEmits = {}, RuntimeEmitsOptions extends EmitsOptions = {}, RuntimeEmitsKeys extends string = string, Data = {}, SetupBindings = {}, Computed extends ComputedOptions = {}, Methods extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, InjectOptions extends ComponentInjectOptions = {}, InjectKeys extends string = string, Slots extends SlotsType = {}, LocalComponents extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions, ResolvedEmits extends EmitsOptions = {} extends RuntimeEmitsOptions ? TypeEmitsToOptions<TypeEmits> : RuntimeEmitsOptions, InferredProps = IsKeyValues<TypeProps> extends true ? TypeProps : string extends RuntimePropsKeys ? ComponentObjectPropsOptions extends RuntimePropsOptions ? {} : ExtractPropTypes<RuntimePropsOptions> : {
    [key in RuntimePropsKeys]?: any;
}, TypeRefs extends Record<string, unknown> = {}, TypeEl extends Element = any>(options: {
    props?: (RuntimePropsOptions & ThisType<void>) | RuntimePropsKeys[];
    /**
     * @private for language-tools use only
     */
    __typeProps?: TypeProps;
    /**
     * @private for language-tools use only
     */
    __typeEmits?: TypeEmits;
    /**
     * @private for language-tools use only
     */
    __typeRefs?: TypeRefs;
    /**
     * @private for language-tools use only
     */
    __typeEl?: TypeEl;
} & ComponentOptionsBase<ToResolvedProps<InferredProps, ResolvedEmits>, SetupBindings, Data, Computed, Methods, Mixin, Extends, RuntimeEmitsOptions, RuntimeEmitsKeys, {}, // Defaults
InjectOptions, InjectKeys, Slots, LocalComponents, Directives, Exposed, Provide> & ThisType<CreateComponentPublicInstanceWithMixins<ToResolvedProps<InferredProps, ResolvedEmits>, SetupBindings, Data, Computed, Methods, Mixin, Extends, ResolvedEmits, {}, {}, false, InjectOptions, Slots, LocalComponents, Directives, string>>): DefineComponent<InferredProps, SetupBindings, Data, Computed, Methods, Mixin, Extends, ResolvedEmits, RuntimeEmitsKeys, PublicProps, ToResolvedProps<InferredProps, ResolvedEmits>, ExtractDefaultPropTypes<RuntimePropsOptions>, Slots, LocalComponents, Directives, Exposed, Provide, unknown extends TypeProps ? true : false, TypeRefs, TypeEl>;

export interface App<HostElement = any> {
    version: string;
    config: AppConfig;
    use<Options extends unknown[]>(plugin: Plugin<Options>, ...options: NoInfer<Options>): this;
    use<Options>(plugin: Plugin<Options>, options: NoInfer<Options>): this;
    mixin(mixin: ComponentOptions): this;
    component(name: string): Component | undefined;
    component<T extends Component | DefineComponent>(name: string, component: T): this;
    directive<HostElement = any, Value = any, Modifiers extends string = string, Arg = any>(name: string): Directive<HostElement, Value, Modifiers, Arg> | undefined;
    directive<HostElement = any, Value = any, Modifiers extends string = string, Arg = any>(name: string, directive: Directive<HostElement, Value, Modifiers, Arg>): this;
    mount(rootContainer: HostElement | string, 
    /**
     * @internal
     */
    isHydrate?: boolean, 
    /**
     * @internal
     */
    namespace?: boolean | ElementNamespace, 
    /**
     * @internal
     */
    vnode?: VNode): ComponentPublicInstance;
    unmount(): void;
    onUnmount(cb: () => void): void;
    provide<T, K = InjectionKey<T> | string | number>(key: K, value: K extends InjectionKey<infer V> ? V : T): this;
    /**
     * Runs a function with the app as active instance. This allows using of `inject()` within the function to get access
     * to variables provided via `app.provide()`.
     *
     * @param fn - function to run with the app as active instance
     */
    runWithContext<T>(fn: () => T): T;
    _uid: number;
    _component: ConcreteComponent;
    _props: Data | null;
    _container: HostElement | null;
    _context: AppContext;
    _instance: ComponentInternalInstance | null;
    /**
     * v2 compat only
     */
    filter?(name: string): Function | undefined;
    filter?(name: string, filter: Function): this;
}
export type OptionMergeFunction = (to: unknown, from: unknown) => any;
export interface AppConfig {
    readonly isNativeTag: (tag: string) => boolean;
    performance: boolean;
    optionMergeStrategies: Record<string, OptionMergeFunction>;
    globalProperties: ComponentCustomProperties & Record<string, any>;
    errorHandler?: (err: unknown, instance: ComponentPublicInstance | null, info: string) => void;
    warnHandler?: (msg: string, instance: ComponentPublicInstance | null, trace: string) => void;
    /**
     * Options to pass to `@vue/compiler-dom`.
     * Only supported in runtime compiler build.
     */
    compilerOptions: RuntimeCompilerOptions;
    /**
     * @deprecated use config.compilerOptions.isCustomElement
     */
    isCustomElement?: (tag: string) => boolean;
    /**
     * TODO document for 3.5
     * Enable warnings for computed getters that recursively trigger itself.
     */
    warnRecursiveComputed?: boolean;
    /**
     * Whether to throw unhandled errors in production.
     * Default is `false` to avoid crashing on any error (and only logs it)
     * But in some cases, e.g. SSR, throwing might be more desirable.
     */
    throwUnhandledErrorInProduction?: boolean;
    /**
     * Prefix for all useId() calls within this app
     */
    idPrefix?: string;
}
export interface AppContext {
    app: App;
    config: AppConfig;
    mixins: ComponentOptions[];
    components: Record<string, Component>;
    directives: Record<string, Directive>;
    provides: Record<string | symbol, any>;
}
type PluginInstallFunction<Options = any[]> = Options extends unknown[] ? (app: App, ...options: Options) => any : (app: App, options: Options) => any;
export type ObjectPlugin<Options = any[]> = {
    install: PluginInstallFunction<Options>;
};
export type FunctionPlugin<Options = any[]> = PluginInstallFunction<Options> & Partial<ObjectPlugin<Options>>;
export type Plugin<Options = any[], P extends unknown[] = Options extends unknown[] ? Options : [Options]> = FunctionPlugin<P> | ObjectPlugin<P>;
export type CreateAppFunction<HostElement> = (rootComponent: Component, rootProps?: Data | null) => App<HostElement>;

type TeleportVNode = VNode<RendererNode, RendererElement, TeleportProps>;
export interface TeleportProps {
    to: string | RendererElement | null | undefined;
    disabled?: boolean;
    defer?: boolean;
}
declare const TeleportImpl: {
    name: string;
    __isTeleport: boolean;
    process(n1: TeleportVNode | null, n2: TeleportVNode, container: RendererElement, anchor: RendererNode | null, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, namespace: ElementNamespace, slotScopeIds: string[] | null, optimized: boolean, internals: RendererInternals): void;
    remove(vnode: VNode, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, { um: unmount, o: { remove: hostRemove } }: RendererInternals, doRemove: boolean): void;
    move: typeof moveTeleport;
    hydrate: typeof hydrateTeleport;
};
declare enum TeleportMoveTypes {
    TARGET_CHANGE = 0,
    TOGGLE = 1,// enable / disable
    REORDER = 2
}
declare function moveTeleport(vnode: VNode, container: RendererElement, parentAnchor: RendererNode | null, { o: { insert }, m: move }: RendererInternals, moveType?: TeleportMoveTypes): void;
declare function hydrateTeleport(node: Node, vnode: TeleportVNode, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, slotScopeIds: string[] | null, optimized: boolean, { o: { nextSibling, parentNode, querySelector, insert, createText }, }: RendererInternals<Node, Element>, hydrateChildren: (node: Node | null, vnode: VNode, container: Element, parentComponent: ComponentInternalInstance | null, parentSuspense: SuspenseBoundary | null, slotScopeIds: string[] | null, optimized: boolean) => Node | null): Node | null;
export declare const Teleport: {
    __isTeleport: true;
    new (): {
        $props: VNodeProps & TeleportProps;
        $slots: {
            default(): VNode[];
        };
    };
};

/**
 * @private
 */
export declare function resolveComponent(name: string, maybeSelfReference?: boolean): ConcreteComponent | string;
declare const NULL_DYNAMIC_COMPONENT: unique symbol;
/**
 * @private
 */
export declare function resolveDynamicComponent(component: unknown): VNodeTypes;
/**
 * @private
 */
export declare function resolveDirective(name: string): Directive | undefined;

export declare const Fragment: {
    __isFragment: true;
    new (): {
        $props: VNodeProps;
    };
};
export declare const Text: unique symbol;
export declare const Comment: unique symbol;
export declare const Static: unique symbol;
export type VNodeTypes = string | VNode | Component | typeof Text | typeof Static | typeof Comment | typeof Fragment | typeof Teleport | typeof TeleportImpl | typeof Suspense | typeof SuspenseImpl;
export type VNodeRef = string | Ref | ((ref: Element | ComponentPublicInstance | null, refs: Record<string, any>) => void);
type VNodeNormalizedRefAtom = {
    /**
     * component instance
     */
    i: ComponentInternalInstance;
    /**
     * Actual ref
     */
    r: VNodeRef;
    /**
     * setup ref key
     */
    k?: string;
    /**
     * refInFor marker
     */
    f?: boolean;
};
type VNodeNormalizedRef = VNodeNormalizedRefAtom | VNodeNormalizedRefAtom[];
type VNodeMountHook = (vnode: VNode) => void;
type VNodeUpdateHook = (vnode: VNode, oldVNode: VNode) => void;
export type VNodeProps = {
    key?: PropertyKey;
    ref?: VNodeRef;
    ref_for?: boolean;
    ref_key?: string;
    onVnodeBeforeMount?: VNodeMountHook | VNodeMountHook[];
    onVnodeMounted?: VNodeMountHook | VNodeMountHook[];
    onVnodeBeforeUpdate?: VNodeUpdateHook | VNodeUpdateHook[];
    onVnodeUpdated?: VNodeUpdateHook | VNodeUpdateHook[];
    onVnodeBeforeUnmount?: VNodeMountHook | VNodeMountHook[];
    onVnodeUnmounted?: VNodeMountHook | VNodeMountHook[];
};
type VNodeChildAtom = VNode | string | number | boolean | null | undefined | void;
export type VNodeArrayChildren = Array<VNodeArrayChildren | VNodeChildAtom>;
export type VNodeChild = VNodeChildAtom | VNodeArrayChildren;
export type VNodeNormalizedChildren = string | VNodeArrayChildren | RawSlots | null;
export interface VNode<HostNode = RendererNode, HostElement = RendererElement, ExtraProps = {
    [key: string]: any;
}> {
    type: VNodeTypes;
    props: (VNodeProps & ExtraProps) | null;
    key: PropertyKey | null;
    ref: VNodeNormalizedRef | null;
    /**
     * SFC only. This is assigned on vnode creation using currentScopeId
     * which is set alongside currentRenderingInstance.
     */
    scopeId: string | null;
    children: VNodeNormalizedChildren;
    component: ComponentInternalInstance | null;
    dirs: DirectiveBinding[] | null;
    transition: TransitionHooks<HostElement> | null;
    el: HostNode | null;
    placeholder: HostNode | null;
    anchor: HostNode | null;
    target: HostElement | null;
    targetStart: HostNode | null;
    targetAnchor: HostNode | null;
    suspense: SuspenseBoundary | null;
    shapeFlag: number;
    patchFlag: number;
    appContext: AppContext | null;
}
/**
 * Open a block.
 * This must be called before `createBlock`. It cannot be part of `createBlock`
 * because the children of the block are evaluated before `createBlock` itself
 * is called. The generated code typically looks like this:
 *
 * ```js
 * function render() {
 *   return (openBlock(),createBlock('div', null, [...]))
 * }
 * ```
 * disableTracking is true when creating a v-for fragment block, since a v-for
 * fragment always diffs its children.
 *
 * @private
 */
export declare function openBlock(disableTracking?: boolean): void;
/**
 * Block tracking sometimes needs to be disabled, for example during the
 * creation of a tree that needs to be cached by v-once. The compiler generates
 * code like this:
 *
 * ``` js
 * _cache[1] || (
 *   setBlockTracking(-1, true),
 *   _cache[1] = createVNode(...),
 *   setBlockTracking(1),
 *   _cache[1]
 * )
 * ```
 *
 * @private
 */
export declare function setBlockTracking(value: number, inVOnce?: boolean): void;
/**
 * @private
 */
export declare function createElementBlock(type: string | typeof Fragment, props?: Record<string, any> | null, children?: any, patchFlag?: number, dynamicProps?: string[], shapeFlag?: number): VNode;
/**
 * Create a block root vnode. Takes the same exact arguments as `createVNode`.
 * A block root keeps track of dynamic nodes within the block in the
 * `dynamicChildren` array.
 *
 * @private
 */
export declare function createBlock(type: VNodeTypes | ClassComponent, props?: Record<string, any> | null, children?: any, patchFlag?: number, dynamicProps?: string[]): VNode;
export declare function isVNode(value: any): value is VNode;
declare let vnodeArgsTransformer: ((args: Parameters<typeof _createVNode>, instance: ComponentInternalInstance | null) => Parameters<typeof _createVNode>) | undefined;
/**
 * Internal API for registering an arguments transform for createVNode
 * used for creating stubs in the test-utils
 * It is *internal* but needs to be exposed for test-utils to pick up proper
 * typings
 */
export declare function transformVNodeArgs(transformer?: typeof vnodeArgsTransformer): void;
export declare function createBaseVNode(type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT, props?: (Data & VNodeProps) | null, children?: unknown, patchFlag?: number, dynamicProps?: string[] | null, shapeFlag?: number, isBlockNode?: boolean, needFullChildrenNormalization?: boolean): VNode;

export declare const createVNode: typeof _createVNode;
declare function _createVNode(type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT, props?: (Data & VNodeProps) | null, children?: unknown, patchFlag?: number, dynamicProps?: string[] | null, isBlockNode?: boolean): VNode;
export declare function guardReactiveProps(props: (Data & VNodeProps) | null): (Data & VNodeProps) | null;
export declare function cloneVNode<T, U>(vnode: VNode<T, U>, extraProps?: (Data & VNodeProps) | null, mergeRef?: boolean, cloneTransition?: boolean): VNode<T, U>;
/**
 * @private
 */
export declare function createTextVNode(text?: string, flag?: number): VNode;
/**
 * @private
 */
export declare function createStaticVNode(content: string, numberOfNodes: number): VNode;
/**
 * @private
 */
export declare function createCommentVNode(text?: string, asBlock?: boolean): VNode;
export declare function mergeProps(...args: (Data & VNodeProps)[]): Data;

type Data = Record<string, unknown>;
/**
 * Public utility type for extracting the instance type of a component.
 * Works with all valid component definition types. This is intended to replace
 * the usage of `InstanceType<typeof Comp>` which only works for
 * constructor-based component definition types.
 *
 * @example
 * ```ts
 * const MyComp = { ... }
 * declare const instance: ComponentInstance<typeof MyComp>
 * ```
 */
export type ComponentInstance<T> = T extends {
    new (): ComponentPublicInstance;
} ? InstanceType<T> : T extends FunctionalComponent<infer Props, infer Emits> ? ComponentPublicInstance<Props, {}, {}, {}, {}, ShortEmitsToObject<Emits>> : T extends Component<infer PropsOrInstance, infer RawBindings, infer D, infer C, infer M> ? PropsOrInstance extends {
    $props: unknown;
} ? PropsOrInstance : ComponentPublicInstance<unknown extends PropsOrInstance ? {} : PropsOrInstance, unknown extends RawBindings ? {} : RawBindings, unknown extends D ? {} : D, C, M> : never;
/**
 * For extending allowed non-declared props on components in TSX
 */
export interface ComponentCustomProps {
}
/**
 * For globally defined Directives
 * Here is an example of adding a directive `VTooltip` as global directive:
 *
 * @example
 * ```ts
 * import VTooltip from 'v-tooltip'
 *
 * declare module '@vue/runtime-core' {
 *   interface GlobalDirectives {
 *     VTooltip
 *   }
 * }
 * ```
 */
export interface GlobalDirectives {
}
/**
 * For globally defined Components
 * Here is an example of adding a component `RouterView` as global component:
 *
 * @example
 * ```ts
 * import { RouterView } from 'vue-router'
 *
 * declare module '@vue/runtime-core' {
 *   interface GlobalComponents {
 *     RouterView
 *   }
 * }
 * ```
 */
export interface GlobalComponents {
    Teleport: DefineComponent<TeleportProps>;
    Suspense: DefineComponent<SuspenseProps>;
    KeepAlive: DefineComponent<KeepAliveProps>;
    BaseTransition: DefineComponent<BaseTransitionProps>;
}
/**
 * Default allowed non-declared props on component in TSX
 */
export interface AllowedComponentProps {
    class?: unknown;
    style?: unknown;
}
interface ComponentInternalOptions {
    /**
     * Compat build only, for bailing out of certain compatibility behavior
     */
    __isBuiltIn?: boolean;
    /**
     * This one should be exposed so that devtools can make use of it
     */
    __file?: string;
    /**
     * name inferred from filename
     */
    __name?: string;
}
export interface FunctionalComponent<P = {}, E extends EmitsOptions | Record<string, any[]> = {}, S extends Record<string, any> = any, EE extends EmitsOptions = ShortEmitsToObject<E>> extends ComponentInternalOptions {
    (props: P & EmitsToProps<EE>, ctx: Omit<SetupContext<EE, IfAny<S, {}, SlotsType<S>>>, 'expose'>): any;
    props?: ComponentPropsOptions<P>;
    emits?: EE | (keyof EE)[];
    slots?: IfAny<S, Slots, SlotsType<S>>;
    inheritAttrs?: boolean;
    displayName?: string;
    compatConfig?: CompatConfig;
}
interface ClassComponent {
    new (...args: any[]): ComponentPublicInstance<any, any, any, any, any>;
    __vccOpts: ComponentOptions;
}
/**
 * Concrete component type matches its actual value: it's either an options
 * object, or a function. Use this where the code expects to work with actual
 * values, e.g. checking if its a function or not. This is mostly for internal
 * implementation code.
 */
export type ConcreteComponent<Props = {}, RawBindings = any, D = any, C extends ComputedOptions = ComputedOptions, M extends MethodOptions = MethodOptions, E extends EmitsOptions | Record<string, any[]> = {}, S extends Record<string, any> = any> = ComponentOptions<Props, RawBindings, D, C, M> | FunctionalComponent<Props, E, S>;
/**
 * A type used in public APIs where a component type is expected.
 * The constructor type is an artificial type returned by defineComponent().
 */
export type Component<PropsOrInstance = any, RawBindings = any, D = any, C extends ComputedOptions = ComputedOptions, M extends MethodOptions = MethodOptions, E extends EmitsOptions | Record<string, any[]> = {}, S extends Record<string, any> = any> = ConcreteComponent<PropsOrInstance, RawBindings, D, C, M, E, S> | ComponentPublicInstanceConstructor<PropsOrInstance>;

export type SetupContext<E = EmitsOptions, S extends SlotsType = {}> = E extends any ? {
    attrs: Data;
    slots: UnwrapSlotsType<S>;
    emit: EmitFn<E>;
    expose: <Exposed extends Record<string, any> = Record<string, any>>(exposed?: Exposed) => void;
} : never;
/**
 * We expose a subset of properties on the internal instance as they are
 * useful for advanced external libraries and tools.
 */
export interface ComponentInternalInstance {
    uid: number;
    type: ConcreteComponent;
    parent: ComponentInternalInstance | null;
    root: ComponentInternalInstance;
    appContext: AppContext;
    /**
     * Vnode representing this component in its parent's vdom tree
     */
    vnode: VNode;
    /**
     * Root vnode of this component's own vdom tree
     */
    subTree: VNode;
    /**
     * Render effect instance
     */
    effect: ReactiveEffect;
    /**
     * Force update render effect
     */
    update: () => void;
    /**
     * Render effect job to be passed to scheduler (checks if dirty)
     */
    job: SchedulerJob;
    proxy: ComponentPublicInstance | null;
    exposed: Record<string, any> | null;
    exposeProxy: Record<string, any> | null;
    data: Data;
    props: Data;
    attrs: Data;
    slots: InternalSlots;
    refs: Data;
    emit: EmitFn;
    isMounted: boolean;
    isUnmounted: boolean;
    isDeactivated: boolean;
}
export declare const getCurrentInstance: () => ComponentInternalInstance | null;
/**
 * For runtime-dom to register the compiler.
 * Note the exported method uses any to avoid d.ts relying on the compiler types.
 */
export declare function registerRuntimeCompiler(_compile: any): void;
export declare const isRuntimeOnly: () => boolean;
export interface ComponentCustomElementInterface {
}

type MaybeUndefined<T, I> = I extends true ? T | undefined : T;
type MapSources<T, Immediate> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? MaybeUndefined<V, Immediate> : T[K] extends object ? MaybeUndefined<T[K], Immediate> : never;
};
export interface WatchEffectOptions extends DebuggerOptions {
    flush?: 'pre' | 'post' | 'sync';
}
export interface WatchOptions<Immediate = boolean> extends WatchEffectOptions {
    immediate?: Immediate;
    deep?: boolean | number;
    once?: boolean;
}
export declare function watchEffect(effect: WatchEffect, options?: WatchEffectOptions): WatchHandle;
export declare function watchPostEffect(effect: WatchEffect, options?: DebuggerOptions): WatchHandle;
export declare function watchSyncEffect(effect: WatchEffect, options?: DebuggerOptions): WatchHandle;
export type MultiWatchSources = (WatchSource<unknown> | object)[];
export declare function watch<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, MaybeUndefined<T, Immediate>>, options?: WatchOptions<Immediate>): WatchHandle;
export declare function watch<T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(sources: readonly [...T] | T, cb: [T] extends [ReactiveMarker] ? WatchCallback<T, MaybeUndefined<T, Immediate>> : WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>, options?: WatchOptions<Immediate>): WatchHandle;
export declare function watch<T extends MultiWatchSources, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>, options?: WatchOptions<Immediate>): WatchHandle;
export declare function watch<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, MaybeUndefined<T, Immediate>>, options?: WatchOptions<Immediate>): WatchHandle;

/**
 * A lazy hydration strategy for async components.
 * @param hydrate - call this to perform the actual hydration.
 * @param forEachElement - iterate through the root elements of the component's
 *                         non-hydrated DOM, accounting for possible fragments.
 * @returns a teardown function to be called if the async component is unmounted
 *          before it is hydrated. This can be used to e.g. remove DOM event
 *          listeners.
 */
export type HydrationStrategy = (hydrate: () => void, forEachElement: (cb: (el: Element) => any) => void) => (() => void) | void;
export type HydrationStrategyFactory<Options> = (options?: Options) => HydrationStrategy;
export declare const hydrateOnIdle: HydrationStrategyFactory<number>;
export declare const hydrateOnVisible: HydrationStrategyFactory<IntersectionObserverInit>;
export declare const hydrateOnMediaQuery: HydrationStrategyFactory<string>;
export declare const hydrateOnInteraction: HydrationStrategyFactory<keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap>>;

type AsyncComponentResolveResult<T = Component> = T | {
    default: T;
};
export type AsyncComponentLoader<T = any> = () => Promise<AsyncComponentResolveResult<T>>;
export interface AsyncComponentOptions<T = any> {
    loader: AsyncComponentLoader<T>;
    loadingComponent?: Component;
    errorComponent?: Component;
    delay?: number;
    timeout?: number;
    suspensible?: boolean;
    hydrate?: HydrationStrategy;
    onError?: (error: Error, retry: () => void, fail: () => void, attempts: number) => any;
}
export declare function defineAsyncComponent<T extends Component = {
    new (): ComponentPublicInstance;
}>(source: AsyncComponentLoader<T> | AsyncComponentOptions<T>): T;

export declare function useModel<M extends PropertyKey, T extends Record<string, any>, K extends keyof T, G = T[K], S = T[K]>(props: T, name: K, options?: DefineModelOptions<T[K], G, S>): ModelRef<T[K], M, G, S>;

export type TemplateRef<T = unknown> = Readonly<ShallowRef<T | null>>;
export declare function useTemplateRef<T = unknown, Keys extends string = string>(key: Keys): TemplateRef<T>;

export declare function useId(): string;

type RawProps = VNodeProps & {
    __v_isVNode?: never;
    [Symbol.iterator]?: never;
} & Record<string, any>;
type RawChildren = string | number | boolean | VNode | VNodeArrayChildren | (() => any);
interface Constructor<P = any> {
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
    new (...args: any[]): {
        $props: P;
    };
}
type HTMLElementEventHandler = {
    [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: (ev: HTMLElementEventMap[K]) => any;
};
export declare function h<K extends keyof HTMLElementTagNameMap>(type: K, children?: RawChildren): VNode;
export declare function h<K extends keyof HTMLElementTagNameMap>(type: K, props?: (RawProps & HTMLElementEventHandler) | null, children?: RawChildren | RawSlots): VNode;
export declare function h(type: string, children?: RawChildren): VNode;
export declare function h(type: string, props?: RawProps | null, children?: RawChildren | RawSlots): VNode;
export declare function h(type: typeof Text | typeof Comment, children?: string | number | boolean): VNode;
export declare function h(type: typeof Text | typeof Comment, props?: null, children?: string | number | boolean): VNode;
export declare function h(type: typeof Fragment, children?: VNodeArrayChildren): VNode;
export declare function h(type: typeof Fragment, props?: RawProps | null, children?: VNodeArrayChildren): VNode;
export declare function h(type: typeof Teleport, props: RawProps & TeleportProps, children: RawChildren | RawSlots): VNode;
export declare function h(type: typeof Suspense, children?: RawChildren): VNode;
export declare function h(type: typeof Suspense, props?: (RawProps & SuspenseProps) | null, children?: RawChildren | RawSlots): VNode;
export declare function h<P, E extends EmitsOptions = {}, S extends Record<string, any> = any>(type: FunctionalComponent<P, any, S, any>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | IfAny<S, RawSlots, S>): VNode;
export declare function h(type: Component, children?: RawChildren): VNode;
export declare function h<P>(type: ConcreteComponent | string, children?: RawChildren): VNode;
export declare function h<P>(type: ConcreteComponent<P> | string, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren): VNode;
export declare function h<P>(type: Component<P>, props?: (RawProps & P) | null, children?: RawChildren | RawSlots): VNode;
export declare function h<P>(type: ComponentOptions<P>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | RawSlots): VNode;
export declare function h(type: Constructor, children?: RawChildren): VNode;
export declare function h<P>(type: Constructor<P>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | RawSlots): VNode;
export declare function h(type: DefineComponent, children?: RawChildren): VNode;
export declare function h<P>(type: DefineComponent<P>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | RawSlots): VNode;
export declare function h(type: string | Component, children?: RawChildren): VNode;
export declare function h<P>(type: string | Component<P>, props?: (RawProps & P) | ({} extends P ? null : never), children?: RawChildren | RawSlots): VNode;

export declare const ssrContextKey: unique symbol;
export declare const useSSRContext: <T = Record<string, any>>() => T | undefined;

declare function warn$1(msg: string, ...args: any[]): void;

export declare enum ErrorCodes {
    SETUP_FUNCTION = 0,
    RENDER_FUNCTION = 1,
    NATIVE_EVENT_HANDLER = 5,
    COMPONENT_EVENT_HANDLER = 6,
    VNODE_HOOK = 7,
    DIRECTIVE_HOOK = 8,
    TRANSITION_HOOK = 9,
    APP_ERROR_HANDLER = 10,
    APP_WARN_HANDLER = 11,
    FUNCTION_REF = 12,
    ASYNC_COMPONENT_LOADER = 13,
    SCHEDULER = 14,
    COMPONENT_UPDATE = 15,
    APP_UNMOUNT_CLEANUP = 16
}
type ErrorTypes = LifecycleHooks | ErrorCodes | WatchErrorCodes;
export declare function callWithErrorHandling(fn: Function, instance: ComponentInternalInstance | null | undefined, type: ErrorTypes, args?: unknown[]): any;
export declare function callWithAsyncErrorHandling(fn: Function | Function[], instance: ComponentInternalInstance | null, type: ErrorTypes, args?: unknown[]): any;
export declare function handleError(err: unknown, instance: ComponentInternalInstance | null | undefined, type: ErrorTypes, throwInDev?: boolean): void;

export declare function initCustomFormatter(): void;

interface AppRecord {
    id: number;
    app: App;
    version: string;
    types: Record<string, string | Symbol>;
}
interface DevtoolsHook {
    enabled?: boolean;
    emit: (event: string, ...payload: any[]) => void;
    on: (event: string, handler: Function) => void;
    once: (event: string, handler: Function) => void;
    off: (event: string, handler: Function) => void;
    appRecords: AppRecord[];
    /**
     * Added at https://github.com/vuejs/devtools/commit/f2ad51eea789006ab66942e5a27c0f0986a257f9
     * Returns whether the arg was buffered or not
     */
    cleanupBuffer?: (matchArg: unknown) => boolean;
}
declare function setDevtoolsHook$1(hook: DevtoolsHook, target: any): void;

type HMRComponent = ComponentOptions | ClassComponent;
export interface HMRRuntime {
    createRecord: typeof createRecord;
    rerender: typeof rerender;
    reload: typeof reload;
}
declare function createRecord(id: string, initialDef: HMRComponent): boolean;
declare function rerender(id: string, newRender?: Function): void;
declare function reload(id: string, newComp: HMRComponent): void;

/**
 * Set scope id when creating hoisted vnodes.
 * @private compiler helper
 */
export declare function pushScopeId(id: string | null): void;
/**
 * Technically we no longer need this after 3.0.8 but we need to keep the same
 * API for backwards compat w/ code generated by compilers.
 * @private
 */
export declare function popScopeId(): void;
/**
 * Only for backwards compat
 * @private
 */
export declare const withScopeId: (_id: string) => typeof withCtx;
/**
 * Wrap a slot function to memoize current rendering instance
 * @private compiler helper
 */
export declare function withCtx(fn: Function, ctx?: ComponentInternalInstance | null, isNonScopedSlot?: boolean): Function;

/**
 * v-for string
 * @private
 */
export declare function renderList(source: string, renderItem: (value: string, index: number) => VNodeChild): VNodeChild[];
/**
 * v-for number
 */
export declare function renderList(source: number, renderItem: (value: number, index: number) => VNodeChild): VNodeChild[];
/**
 * v-for array
 */
export declare function renderList<T>(source: T[], renderItem: (value: T, index: number) => VNodeChild): VNodeChild[];
/**
 * v-for iterable
 */
export declare function renderList<T>(source: Iterable<T>, renderItem: (value: T, index: number) => VNodeChild): VNodeChild[];
/**
 * v-for object
 */
export declare function renderList<T>(source: T, renderItem: <K extends keyof T>(value: T[K], key: string, index: number) => VNodeChild): VNodeChild[];

/**
 * For prefixing keys in v-on="obj" with "on"
 * @private
 */
export declare function toHandlers(obj: Record<string, any>, preserveCaseIfNecessary?: boolean): Record<string, any>;

/**
 * Compiler runtime helper for rendering `<slot/>`
 * @private
 */
export declare function renderSlot(slots: Slots, name: string, props?: Data, fallback?: () => VNodeArrayChildren, noSlotted?: boolean): VNode;

type SSRSlot = (...args: any[]) => VNode[] | undefined;
interface CompiledSlotDescriptor {
    name: string;
    fn: SSRSlot;
    key?: string;
}
/**
 * Compiler runtime helper for creating dynamic slots object
 * @private
 */
export declare function createSlots(slots: Record<string, SSRSlot>, dynamicSlots: (CompiledSlotDescriptor | CompiledSlotDescriptor[] | undefined)[]): Record<string, SSRSlot>;

export declare function withMemo(memo: any[], render: () => VNode<any, any>, cache: any[], index: number): VNode<any, any>;
export declare function isMemoSame(cached: VNode, memo: any[]): boolean;

export type LegacyConfig = {
    /**
     * @deprecated `config.silent` option has been removed
     */
    silent?: boolean;
    /**
     * @deprecated use __VUE_PROD_DEVTOOLS__ compile-time feature flag instead
     * https://github.com/vuejs/core/tree/main/packages/vue#bundler-build-feature-flags
     */
    devtools?: boolean;
    /**
     * @deprecated use `config.isCustomElement` instead
     * https://v3-migration.vuejs.org/breaking-changes/global-api.html#config-ignoredelements-is-now-config-iscustomelement
     */
    ignoredElements?: (string | RegExp)[];
    /**
     * @deprecated
     * https://v3-migration.vuejs.org/breaking-changes/keycode-modifiers.html
     */
    keyCodes?: Record<string, number | number[]>;
    /**
     * @deprecated
     * https://v3-migration.vuejs.org/breaking-changes/global-api.html#config-productiontip-removed
     */
    productionTip?: boolean;
};

type LegacyPublicInstance = ComponentPublicInstance & LegacyPublicProperties;
interface LegacyPublicProperties {
    $set<T extends Record<keyof any, any>, K extends keyof T>(target: T, key: K, value: T[K]): void;
    $delete<T extends Record<keyof any, any>, K extends keyof T>(target: T, key: K): void;
    $mount(el?: string | Element): this;
    $destroy(): void;
    $scopedSlots: Slots;
    $on(event: string | string[], fn: Function): this;
    $once(event: string, fn: Function): this;
    $off(event?: string | string[], fn?: Function): this;
    $children: LegacyPublicProperties[];
    $listeners: Record<string, Function | Function[]>;
}

/**
 * @deprecated the default `Vue` export has been removed in Vue 3. The type for
 * the default export is provided only for migration purposes. Please use
 * named imports instead - e.g. `import { createApp } from 'vue'`.
 */
export type CompatVue = Pick<App, 'version' | 'component' | 'directive'> & {
    configureCompat: typeof configureCompat;
    new (options?: ComponentOptions): LegacyPublicInstance;
    version: string;
    config: AppConfig & LegacyConfig;
    nextTick: typeof nextTick;
    use<Options extends unknown[]>(plugin: Plugin<Options>, ...options: Options): CompatVue;
    use<Options>(plugin: Plugin<Options>, options: Options): CompatVue;
    mixin(mixin: ComponentOptions): CompatVue;
    component(name: string): Component | undefined;
    component(name: string, component: Component): CompatVue;
    directive<T = any, V = any>(name: string): Directive<T, V> | undefined;
    directive<T = any, V = any>(name: string, directive: Directive<T, V>): CompatVue;
    compile(template: string): RenderFunction;
    /**
     * @deprecated Vue 3 no longer supports extending constructors.
     */
    extend: (options?: ComponentOptions) => CompatVue;
    /**
     * @deprecated Vue 3 no longer needs set() for adding new properties.
     */
    set(target: any, key: PropertyKey, value: any): void;
    /**
     * @deprecated Vue 3 no longer needs delete() for property deletions.
     */
    delete(target: any, key: PropertyKey): void;
    /**
     * @deprecated use `reactive` instead.
     */
    observable: typeof reactive;
    /**
     * @deprecated filters have been removed from Vue 3.
     */
    filter(name: string, arg?: any): null;
};

export declare const version: string;

export declare const warn: typeof warn$1;

export declare const devtools: DevtoolsHook;
export declare const setDevtoolsHook: typeof setDevtoolsHook$1;

declare module '@vue/reactivity' {
    interface RefUnwrapBailTypes {
        runtimeCoreBailTypes: VNode | {
            $: ComponentInternalInstance;
        };
    }
}

export declare const DeprecationTypes: typeof DeprecationTypes$1;

export { createBaseVNode as createElementVNode,  };
export type { WatchEffectOptions as WatchOptionsBase };
// Note: this file is auto concatenated to the end of the bundled d.ts during
// build.

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    Teleport: DefineComponent<TeleportProps>
    Suspense: DefineComponent<SuspenseProps>
    KeepAlive: DefineComponent<KeepAliveProps>
    BaseTransition: DefineComponent<BaseTransitionProps>
  }
}

// Note: this file is auto concatenated to the end of the bundled d.ts during
// build.
type _defineProps = typeof defineProps
type _defineEmits = typeof defineEmits
type _defineExpose = typeof defineExpose
type _defineOptions = typeof defineOptions
type _defineSlots = typeof defineSlots
type _defineModel = typeof defineModel
type _withDefaults = typeof withDefaults

declare global {
  const defineProps: _defineProps
  const defineEmits: _defineEmits
  const defineExpose: _defineExpose
  const defineOptions: _defineOptions
  const defineSlots: _defineSlots
  const defineModel: _defineModel
  const withDefaults: _withDefaults
}
