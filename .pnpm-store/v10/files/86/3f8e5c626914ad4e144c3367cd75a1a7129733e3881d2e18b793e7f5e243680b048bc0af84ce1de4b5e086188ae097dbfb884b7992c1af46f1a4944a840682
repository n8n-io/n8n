import { DateRange, DateStep, Granularity, Grid, HourCycle, Matcher, SegmentPart, SegmentValueObj, TimeRange, TimeValue, WeekDayFormat, WeekStartsOn } from "./index2.js";
import * as vue33 from "vue";
import { CSSProperties, Component, ComponentPublicInstance, ComputedRef, DefineComponent, HTMLAttributes, ImgHTMLAttributes, MaybeRef, MaybeRefOrGetter, PropType, Ref, SlotsType, UnwrapNestedRefs, VNode, VNodeProps, VNodeRef } from "vue";
import { EventHook, EventHookOn } from "@vueuse/core";
import * as _internationalized_date1728 from "@internationalized/date";
import { DateValue } from "@internationalized/date";
import { VirtualItem, Virtualizer } from "@tanstack/vue-virtual";
import { ReferenceElement, ReferenceElement as ReferenceElement$1 } from "@floating-ui/vue";
import { ComponentProps } from "vue-component-type-helpers";

//#region src/shared/createContext.d.ts
/**
 * @param providerComponentName - The name(s) of the component(s) providing the context.
 *
 * There are situations where context can come from multiple components. In such cases, you might need to give an array of component names to provide your context, instead of just a single string.
 *
 * @param contextName The description for injection key symbol.
 */
declare function createContext<ContextValue>(providerComponentName: string | string[], contextName?: string): readonly [<T extends ContextValue | null | undefined = ContextValue>(fallback?: T) => T extends null ? ContextValue | null : ContextValue, (contextValue: ContextValue) => ContextValue];
//# sourceMappingURL=createContext.d.ts.map
//#endregion
//#region src/shared/types.d.ts
type DataOrientation = 'vertical' | 'horizontal';
type Direction = 'ltr' | 'rtl';
type SingleOrMultipleType = 'single' | 'multiple';
interface SingleOrMultipleProps<T = AcceptableValue | AcceptableValue[]> {
  /**
   * Determines whether a "single" or "multiple" items can be selected at a time.
   *
   * This prop will overwrite the inferred type from `modelValue` and `defaultValue`.
   */
  type?: SingleOrMultipleType;
  /**
   * The controlled value of the active item(s).
   *
   * Use this when you need to control the state of the items. Can be binded with `v-model`
   */
  modelValue?: T;
  /**
   * The default active value of the item(s).
   *
   * Use when you do not need to control the state of the item(s).
   */
  defaultValue?: T;
}
/**
 * if padding or margin is number, it will be in px
 * if padding or margin is true, it will be var(--scrollbar-width)
 * otherwise, it will be passed string
 */
type ScrollBodyOption = {
  padding?: boolean | number | string;
  margin?: boolean | number | string;
};
type AcceptableValue = string | number | bigint | Record<string, any> | null;
type StringOrNumber = string | number;
type GenericComponentInstance<T> = T extends (new (...args: any[]) => infer R) ? R : T extends ((...args: any[]) => infer R) ? R extends {
  __ctx?: infer K;
} ? Exclude<K, void> extends {
  expose: (...args: infer Y) => void;
} ? Y[0] & InstanceType<DefineComponent> : any : any : any;
interface FormFieldProps {
  /** The name of the field. Submitted with its owning form as part of a name/value pair. */
  name?: string;
  /** When `true`, indicates that the user must set the value before the owning form can be submitted. */
  required?: boolean;
}
//#endregion
//#region src/shared/useBodyScrollLock.d.ts
declare function useBodyScrollLock(initialState?: boolean | undefined): vue33.WritableComputedRef<boolean, boolean>;
//# sourceMappingURL=useBodyScrollLock.d.ts.map
//#endregion
//#region src/shared/useDateFormatter.d.ts
interface DateFormatterOptions extends Intl.DateTimeFormatOptions {
  calendar?: string;
}
type Formatter = {
  getLocale: () => string;
  setLocale: (newLocale: string) => void;
  custom: (date: Date, options: DateFormatterOptions) => string;
  selectedDate: (date: DateValue, includeTime?: boolean) => string;
  dayOfWeek: (date: Date, length?: DateFormatterOptions['weekday']) => string;
  fullMonthAndYear: (date: Date, options?: DateFormatterOptions) => string;
  fullMonth: (date: Date, options?: DateFormatterOptions) => string;
  fullYear: (date: Date, options?: DateFormatterOptions) => string;
  dayPeriod: (date: Date) => string;
  part: (dateObj: DateValue, type: Intl.DateTimeFormatPartTypes, options?: DateFormatterOptions) => string;
  toParts: (date: DateValue, options?: DateFormatterOptions) => Intl.DateTimeFormatPart[];
  getMonths: () => {
    label: string;
    value: number;
  }[];
};
/**
 * Creates a wrapper around the `DateFormatter`, which is
 * an improved version of the {@link Intl.DateTimeFormat} API,
 * that is used internally by the various date builders to
 * easily format dates in a consistent way.
 *
 * @see [DateFormatter](https://react-spectrum.adobe.com/internationalized/date/DateFormatter.html)
 */
declare function useDateFormatter(initialLocale: string, opts?: DateFormatterOptions): Formatter;
//# sourceMappingURL=useDateFormatter.d.ts.map
//#endregion
//#region src/shared/useDirection.d.ts
/**
 * The `useDirection` function provides a way to access the current direction in your application.
 * @param {Ref<Direction | undefined>} [dir] - An optional ref containing the direction (ltr or rtl).
 * @returns  computed value that combines with the resolved direction.
 */
declare function useDirection(dir?: Ref<Direction | undefined>): vue33.ComputedRef<Direction>;
//# sourceMappingURL=useDirection.d.ts.map
//#endregion
//#region src/shared/useEmitAsProps.d.ts
/**
 * The `useEmitAsProps` function is a TypeScript utility that converts emitted events into props for a
 * Vue component.
 * @param emit - The `emit` parameter is a function that is used to emit events from a component. It
 * takes two parameters: `name` which is the name of the event to be emitted, and `...args` which are
 * the arguments to be passed along with the event.
 * @returns The function `useEmitAsProps` returns an object that maps event names to functions that
 * call the `emit` function with the corresponding event name and arguments.
 */
declare function useEmitAsProps<Name extends string>(emit: (name: Name, ...args: any[]) => void): Record<string, any>;
//# sourceMappingURL=useEmitAsProps.d.ts.map

//#endregion
//#region src/shared/useFilter.d.ts
/**
 * Provides locale-aware string filtering functions.
 * Uses `Intl.Collator` for comparison to ensure proper Unicode handling.
 *
 * @param options - Optional collator options to customize comparison behavior.
 *   See [Intl.CollatorOptions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator#options) for details.
 * @returns An object with methods to check if a string starts with, ends with, or contains a substring.
 *
 * @example
 * const { startsWith, endsWith, contains } = useFilter();
 *
 * startsWith('hello', 'he'); // true
 * endsWith('hello', 'lo'); // true
 * contains('hello', 'ell'); // true
 */
declare function useFilter(options?: MaybeRef<Intl.CollatorOptions>): {
  startsWith: (string: string, substring: string) => boolean;
  endsWith: (string: string, substring: string) => boolean;
  contains: (string: string, substring: string) => boolean;
};
//# sourceMappingURL=useFilter.d.ts.map
//#endregion
//#region src/shared/useForwardExpose.d.ts
declare function useForwardExpose<T extends ComponentPublicInstance>(): {
  forwardRef: (ref: Element | T | null) => void;
  currentRef: vue33.Ref<Element | T | null | undefined, Element | T | null | undefined>;
  currentElement: vue33.ComputedRef<HTMLElement>;
};
//# sourceMappingURL=useForwardExpose.d.ts.map

//#endregion
//#region src/shared/useForwardProps.d.ts
/**
 * The `useForwardProps` function in TypeScript takes in a set of props and returns a computed value
 * that combines default props with assigned props from the current instance.
 * @param {T} props - The `props` parameter is an object that represents the props passed to a
 * component.
 * @returns computed value that combines the default props, preserved props, and assigned props.
 */
declare function useForwardProps<T extends Record<string, any>>(props: MaybeRefOrGetter<T>): vue33.ComputedRef<T>;
//# sourceMappingURL=useForwardProps.d.ts.map

//#endregion
//#region src/shared/useForwardPropsEmits.d.ts
/**
 * The function `useForwardPropsEmits` takes in props and an optional emit function, and returns a
 * computed object that combines the parsed props and emits as props.
 * @param {T} props - The `props` parameter is of type `T`, which is a generic type that extends the
 * parameters of the `useForwardProps` function. It represents the props object that is passed to the
 * `useForwardProps` function.
 * @param [emit] - The `emit` parameter is a function that can be used to emit events. It takes two
 * arguments: `name`, which is the name of the event to be emitted, and `args`, which are the arguments
 * to be passed along with the event.
 * @returns a computed property that combines the parsed
 * props and emits as props.
 */
declare function useForwardPropsEmits<T extends Record<string, any>, Name extends string>(props: MaybeRefOrGetter<T>, emit?: (name: Name, ...args: any[]) => void): vue33.ComputedRef<T & Record<string, any>>;
//# sourceMappingURL=useForwardPropsEmits.d.ts.map
//#endregion
//#region src/shared/useId.d.ts
/**
 * The `useId` function generates a unique identifier using a provided deterministic ID or a default
 * one prefixed with "reka-", or the provided one via `useId` props from `<ConfigProvider>`.
 * @param {string | null | undefined} [deterministicId] - The `useId` function you provided takes an
 * optional parameter `deterministicId`, which can be a string, null, or undefined. If
 * `deterministicId` is provided, the function will return it. Otherwise, it will generate an id using
 * the `useId` function obtained
 */
declare function useId(deterministicId?: string | null | undefined, prefix?: string): string;
//# sourceMappingURL=useId.d.ts.map
//#endregion
//#region src/shared/useLocale.d.ts
/**
 * The `useLocale` function provides a way to access the current locale in your application.
 * @param {Ref<string | undefined>} [locale] - An optional ref containing the locale.
 * @returns A computed ref holding the resolved locale.
 */
declare function useLocale(locale?: Ref<string | undefined>): vue33.ComputedRef<string>;
//# sourceMappingURL=useLocale.d.ts.map
//#endregion
//#region src/shared/useSelectionBehavior.d.ts
declare function useSelectionBehavior<T>(modelValue: Ref<T | T[]>, props: UnwrapNestedRefs<{
  multiple?: boolean;
  selectionBehavior?: 'toggle' | 'replace';
}>): {
  firstValue: Ref<any, any>;
  onSelectItem: (val: T, condition: (existingValue: T) => boolean) => T | T[];
  handleMultipleReplace: (intent: "first" | "last" | "prev" | "next", currentElement: HTMLElement | Element | null, getItems: () => {
    ref: HTMLElement;
    value?: any;
  }[], options: any[]) => void;
};
//# sourceMappingURL=useSelectionBehavior.d.ts.map
//#endregion
//#region src/shared/useStateMachine.d.ts
interface Machine<S> {
  [k: string]: {
    [k: string]: S;
  };
}
type MachineState<T> = keyof T;
type MachineEvent<T> = keyof UnionToIntersection<T[keyof T]>;
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends ((x: infer R) => any) ? R : never;
/**
 * The `useStateMachine` function is a TypeScript function that creates a state machine and returns the
 * current state and a dispatch function to update the state based on events.
 * @param initialState - The `initialState` parameter is the initial state of the state machine. It
 * represents the starting point of the state machine's state.
 * @param machine - The `machine` parameter is an object that represents a state machine. It should
 * have keys that correspond to the possible states of the machine, and the values should be objects
 * that represent the possible events and their corresponding next states.
 * @returns The `useStateMachine` function returns an object with two properties: `state` and
 * `dispatch`.
 */
declare function useStateMachine<M>(initialState: MachineState<M>, machine: M & Machine<MachineState<M>>): {
  state: Ref<keyof M, keyof M>;
  dispatch: (event: MachineEvent<M>) => void;
};
//#endregion
//#region src/shared/withDefault.d.ts
type RawProps = VNodeProps & {
  __v_isVNode?: never;
  [Symbol.iterator]?: never;
} & Record<string, any>;
interface MountingOptions<Props> {
  /**
   * Default props for the component
   */
  props?: (RawProps & Props) | ({} extends Props ? null : never) | ((attrs: Record<string, any>) => (RawProps & Props));
  /**
   * Pass attributes into the component
   */
  attrs?: Record<string, unknown>;
}
declare function withDefault<T, C = (T extends ((...args: any) => any) | (new (...args: any) => any) ? T : T extends {
  props?: infer Props;
} ? DefineComponent<Props extends Readonly<(infer PropNames)[]> | (infer PropNames)[] ? { [key in PropNames extends string ? PropNames : string]?: any } : Props> : DefineComponent), P extends ComponentProps<C> = ComponentProps<C>>(originalComponent: T, options?: MountingOptions<P>): T;
//#endregion
//#region src/Primitive/Primitive.d.ts
type AsTag = 'a' | 'button' | 'div' | 'form' | 'h2' | 'h3' | 'img' | 'input' | 'label' | 'li' | 'nav' | 'ol' | 'p' | 'span' | 'svg' | 'ul' | 'template' | ({} & string);
interface PrimitiveProps {
  /**
   * Change the default rendered element for the one passed as a child, merging their props and behavior.
   *
   * Read our [Composition](https://www.reka-ui.com/docs/guides/composition) guide for more details.
   */
  asChild?: boolean;
  /**
   * The element or component this component should render as. Can be overwritten by `asChild`.
   * @defaultValue "div"
   */
  as?: AsTag | Component;
}
declare const Primitive: vue33.DefineComponent<vue33.ExtractPropTypes<{
  asChild: {
    type: BooleanConstructor;
    default: boolean;
  };
  as: {
    type: PropType<AsTag | Component>;
    default: string;
  };
}>, () => vue33.VNode<vue33.RendererNode, vue33.RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<vue33.ExtractPropTypes<{
  asChild: {
    type: BooleanConstructor;
    default: boolean;
  };
  as: {
    type: PropType<AsTag | Component>;
    default: string;
  };
}>> & Readonly<{}>, {
  asChild: boolean;
  as: AsTag | Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=Primitive.d.ts.map
//#endregion
//#region src/Primitive/Slot.d.ts
declare const Slot: vue33.DefineComponent<{}, () => vue33.VNode<vue33.RendererNode, vue33.RendererElement, {
  [key: string]: any;
}> | vue33.VNode<vue33.RendererNode, vue33.RendererElement, {
  [key: string]: any;
}>[] | null, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=Slot.d.ts.map
//#endregion
//#region src/Collapsible/CollapsibleContent.vue.d.ts
interface CollapsibleContentProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
type CollapsibleContentEmits = {
  contentFound: [void];
};
declare const _default$378: __VLS_WithSlots$359<vue33.DefineComponent<CollapsibleContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  contentFound: (args_0: void) => any;
}, string, vue33.PublicProps, Readonly<CollapsibleContentProps> & Readonly<{
  onContentFound?: ((args_0?: void | undefined) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$359<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CollapsibleContent.vue.d.ts.map
//#endregion
//#region src/Collapsible/CollapsibleRoot.vue.d.ts
interface CollapsibleRootProps extends PrimitiveProps {
  /** The open state of the collapsible when it is initially rendered. <br> Use when you do not need to control its open state. */
  defaultOpen?: boolean;
  /** The controlled open state of the collapsible. Can be binded with `v-model`. */
  open?: boolean;
  /** When `true`, prevents the user from interacting with the collapsible. */
  disabled?: boolean;
  /** When `true`, the element will be unmounted on closed state. */
  unmountOnHide?: boolean;
}
type CollapsibleRootEmits = {
  /** Event handler called when the open state of the collapsible changes. */
  'update:open': [value: boolean];
};
interface CollapsibleRootContext {
  contentId: string;
  disabled?: Ref<boolean>;
  open: Ref<boolean>;
  unmountOnHide: Ref<boolean>;
  onOpenToggle: () => void;
}
declare const injectCollapsibleRootContext: <T extends CollapsibleRootContext | null | undefined = CollapsibleRootContext>(fallback?: T | undefined) => T extends null ? CollapsibleRootContext | null : CollapsibleRootContext, provideCollapsibleRootContext: (contextValue: CollapsibleRootContext) => CollapsibleRootContext;
declare const _default$377: __VLS_WithSlots$358<vue33.DefineComponent<CollapsibleRootProps, {
  open: Ref<boolean, boolean>;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<CollapsibleRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  unmountOnHide: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$358<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CollapsibleRoot.vue.d.ts.map
//#endregion
//#region src/Collapsible/CollapsibleTrigger.vue.d.ts
interface CollapsibleTriggerProps extends PrimitiveProps {}
declare const _default$376: __VLS_WithSlots$357<vue33.DefineComponent<CollapsibleTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CollapsibleTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$357<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CollapsibleTrigger.vue.d.ts.map
//#endregion
//#region src/Accordion/AccordionContent.vue.d.ts
interface AccordionContentProps extends CollapsibleContentProps {}
declare const _default$375: __VLS_WithSlots$356<vue33.DefineComponent<AccordionContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AccordionContentProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$356<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AccordionContent.vue.d.ts.map
//#endregion
//#region src/Accordion/AccordionHeader.vue.d.ts
interface AccordionHeaderProps extends PrimitiveProps {}
declare const _default$374: __VLS_WithSlots$355<vue33.DefineComponent<AccordionHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AccordionHeaderProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$355<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AccordionHeader.vue.d.ts.map
//#endregion
//#region src/Accordion/AccordionItem.vue.d.ts
declare enum AccordionItemState {
  Open = "open",
  Closed = "closed",
}
interface AccordionItemProps extends Omit<CollapsibleRootProps, 'open' | 'defaultOpen' | 'onOpenChange'> {
  /**
   * Whether or not an accordion item is disabled from user interaction.
   * When `true`, prevents the user from interacting with the item.
   *
   * @defaultValue false
   */
  disabled?: boolean;
  /**
   * A string value for the accordion item. All items within an accordion should use a unique value.
   */
  value: string;
}
interface AccordionItemContext {
  open: ComputedRef<boolean>;
  dataState: ComputedRef<AccordionItemState>;
  disabled: ComputedRef<boolean>;
  dataDisabled: ComputedRef<'' | undefined>;
  triggerId: string;
  currentRef: VNodeRef;
  currentElement: ComputedRef<HTMLElement | undefined>;
  value: ComputedRef<string>;
}
declare const injectAccordionItemContext: <T extends AccordionItemContext | null | undefined = AccordionItemContext>(fallback?: T | undefined) => T extends null ? AccordionItemContext | null : AccordionItemContext, provideAccordionItemContext: (contextValue: AccordionItemContext) => AccordionItemContext;
declare const _default$373: __VLS_WithSlots$354<vue33.DefineComponent<AccordionItemProps, {
  open: ComputedRef<boolean>;
  dataDisabled: ComputedRef<"" | undefined>;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AccordionItemProps> & Readonly<{}>, {
  unmountOnHide: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$354<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AccordionItem.vue.d.ts.map
//#endregion
//#region src/Accordion/AccordionRoot.vue.d.ts
interface AccordionRootProps<T = string | string[]> extends PrimitiveProps, SingleOrMultipleProps<T> {
  /**
   * When type is "single", allows closing content when clicking trigger for an open item.
   * When type is "multiple", this prop has no effect.
   *
   * @defaultValue false
   */
  collapsible?: boolean;
  /**
   * When `true`, prevents the user from interacting with the accordion and all its items
   *
   * @defaultValue false
   */
  disabled?: boolean;
  /**
   * The reading direction of the accordion when applicable. If omitted, assumes LTR (left-to-right) reading mode.
   *
   * @defaultValue "ltr"
   */
  dir?: Direction;
  /**
   * The orientation of the accordion.
   *
   * @defaultValue "vertical"
   */
  orientation?: DataOrientation;
  /**
   * When `true`, the element will be unmounted on closed state.
   *
   * @defaultValue `true`
   */
  unmountOnHide?: boolean;
}
type AccordionRootEmits<T extends SingleOrMultipleType = SingleOrMultipleType> = {
  /**
   * Event handler called when the expanded state of an item changes
   */
  'update:modelValue': [value: (T extends 'single' ? string : string[]) | undefined];
};
type AccordionRootContext<P extends AccordionRootProps> = {
  disabled: Ref<P['disabled']>;
  direction: Ref<P['dir']>;
  orientation: P['orientation'];
  parentElement: Ref<HTMLElement | undefined>;
  changeModelValue: (value: string) => void;
  isSingle: ComputedRef<boolean>;
  modelValue: Ref<AcceptableValue | AcceptableValue[] | undefined>;
  collapsible: boolean;
  unmountOnHide: Ref<boolean>;
};
declare const injectAccordionRootContext: <T extends AccordionRootContext<AccordionRootProps<string | string[]>> | null | undefined = AccordionRootContext<AccordionRootProps<string | string[]>>>(fallback?: T | undefined) => T extends null ? AccordionRootContext<AccordionRootProps<string | string[]>> | null : AccordionRootContext<AccordionRootProps<string | string[]>>, provideAccordionRootContext: (contextValue: AccordionRootContext<AccordionRootProps<string | string[]>>) => AccordionRootContext<AccordionRootProps<string | string[]>>;
declare const _default$372: <T extends (string | string[]), ExplicitType extends SingleOrMultipleType>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$16<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$16<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: (ExplicitType extends "single" ? string : string[]) | undefined) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue"> & AccordionRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current active value */
      modelValue: AcceptableValue | AcceptableValue[] | undefined;
    }) => any;
  };
  emit: (evt: "update:modelValue", value: (ExplicitType extends "single" ? string : string[]) | undefined) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$16<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=AccordionRoot.vue.d.ts.map
//#endregion
//#region src/Accordion/AccordionTrigger.vue.d.ts
interface AccordionTriggerProps extends PrimitiveProps {}
declare const _default$371: __VLS_WithSlots$353<vue33.DefineComponent<AccordionTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AccordionTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$353<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AccordionTrigger.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogClose.vue.d.ts
interface DialogCloseProps extends PrimitiveProps {}
declare const _default$370: __VLS_WithSlots$352<vue33.DefineComponent<DialogCloseProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DialogCloseProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$352<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogClose.vue.d.ts.map
//#endregion
//#region src/DismissableLayer/utils.d.ts
type PointerDownOutsideEvent = CustomEvent<{
  originalEvent: PointerEvent;
}>;
type FocusOutsideEvent = CustomEvent<{
  originalEvent: FocusEvent;
}>;
//#endregion
//#region src/DismissableLayer/DismissableLayer.vue.d.ts
interface DismissableLayerProps extends PrimitiveProps {
  /**
   * When `true`, hover/focus/click interactions will be disabled on elements outside
   * the `DismissableLayer`. Users will need to click twice on outside elements to
   * interact with them: once to close the `DismissableLayer`, and again to trigger the element.
   */
  disableOutsidePointerEvents?: boolean;
}
type DismissableLayerEmits = {
  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  escapeKeyDown: [event: KeyboardEvent];
  /**
   * Event handler called when a `pointerdown` event happens outside of the `DismissableLayer`.
   * Can be prevented.
   */
  pointerDownOutside: [event: PointerDownOutsideEvent];
  /**
   * Event handler called when the focus moves outside of the `DismissableLayer`.
   * Can be prevented.
   */
  focusOutside: [event: FocusOutsideEvent];
  /**
   * Event handler called when an interaction happens outside the `DismissableLayer`.
   * Specifically, when a `pointerdown` event happens outside or focus moves outside of it.
   * Can be prevented.
   */
  interactOutside: [event: PointerDownOutsideEvent | FocusOutsideEvent];
};
//#endregion
//#region src/Dialog/DialogContentImpl.vue.d.ts
type DialogContentImplEmits = DismissableLayerEmits & {
  /**
   * Event handler called when auto-focusing on open.
   * Can be prevented.
   */
  openAutoFocus: [event: Event];
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  closeAutoFocus: [event: Event];
};
interface DialogContentImplProps extends DismissableLayerProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling transntion with Vue native transition or other animation libraries.
   */
  forceMount?: boolean;
  /**
   * When `true`, focus cannot escape the `Content` via keyboard,
   * pointer, or a programmatic focus.
   * @defaultValue false
   */
  trapFocus?: boolean;
}
//#endregion
//#region src/Dialog/DialogContent.vue.d.ts
type DialogContentEmits = DialogContentImplEmits;
interface DialogContentProps extends Omit<DialogContentImplProps, 'trapFocus'> {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$369: __VLS_WithSlots$351<vue33.DefineComponent<DialogContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<DialogContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$351<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogContent.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogDescription.vue.d.ts
interface DialogDescriptionProps extends PrimitiveProps {}
declare const _default$368: __VLS_WithSlots$350<vue33.DefineComponent<DialogDescriptionProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DialogDescriptionProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$350<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogDescription.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogOverlayImpl.vue.d.ts
interface DialogOverlayImplProps extends PrimitiveProps {}
//#endregion
//#region src/Dialog/DialogOverlay.vue.d.ts
interface DialogOverlayProps extends DialogOverlayImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$367: __VLS_WithSlots$349<vue33.DefineComponent<DialogOverlayProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DialogOverlayProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$349<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogOverlay.vue.d.ts.map
//#endregion
//#region src/Teleport/Teleport.vue.d.ts
interface TeleportProps {
  /**
   * Vue native teleport component prop `:to`
   *
   * {@link https://vuejs.org/guide/built-ins/teleport.html#basic-usage}
   */
  to?: string | HTMLElement;
  /**
   * Disable teleport and render the component inline
   *
   * {@link https://vuejs.org/guide/built-ins/teleport.html#disabling-teleport}
   */
  disabled?: boolean;
  /**
   * Defer the resolving of a Teleport target until other parts of the
   * application have mounted (requires Vue 3.5.0+)
   *
   * {@link https://vuejs.org/guide/built-ins/teleport.html#deferred-teleport}
   */
  defer?: boolean;
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
//#endregion
//#region src/Dialog/DialogPortal.vue.d.ts
interface DialogPortalProps extends TeleportProps {}
declare const _default$366: __VLS_WithSlots$348<vue33.DefineComponent<DialogPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DialogPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$348<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogPortal.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogRoot.vue.d.ts
interface DialogRootProps {
  /** The controlled open state of the dialog. Can be binded as `v-model:open`. */
  open?: boolean;
  /** The open state of the dialog when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
  /**
   * The modality of the dialog When set to `true`, <br>
   * interaction with outside elements will be disabled and only dialog content will be visible to screen readers.
   */
  modal?: boolean;
}
type DialogRootEmits = {
  /** Event handler called when the open state of the dialog changes. */
  'update:open': [value: boolean];
};
interface DialogRootContext {
  open: Readonly<Ref<boolean>>;
  modal: Ref<boolean>;
  openModal: () => void;
  onOpenChange: (value: boolean) => void;
  onOpenToggle: () => void;
  triggerElement: Ref<HTMLElement | undefined>;
  contentElement: Ref<HTMLElement | undefined>;
  contentId: string;
  titleId: string;
  descriptionId: string;
}
declare const injectDialogRootContext: <T extends DialogRootContext | null | undefined = DialogRootContext>(fallback?: T | undefined) => T extends null ? DialogRootContext | null : DialogRootContext, provideDialogRootContext: (contextValue: DialogRootContext) => DialogRootContext;
declare const _default$365: __VLS_WithSlots$347<vue33.DefineComponent<DialogRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<DialogRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  modal: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
    /** Close the dialog */
    close: () => void;
  }) => any;
}>;
type __VLS_WithSlots$347<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogRoot.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogTitle.vue.d.ts
interface DialogTitleProps extends PrimitiveProps {}
declare const _default$364: __VLS_WithSlots$346<vue33.DefineComponent<DialogTitleProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DialogTitleProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$346<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogTitle.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogTrigger.vue.d.ts
interface DialogTriggerProps extends PrimitiveProps {}
declare const _default$363: __VLS_WithSlots$345<vue33.DefineComponent<DialogTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DialogTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$345<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogTrigger.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogAction.vue.d.ts
interface AlertDialogActionProps extends DialogCloseProps {}
declare const _default$362: __VLS_WithSlots$344<vue33.DefineComponent<AlertDialogActionProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AlertDialogActionProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$344<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogAction.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogCancel.vue.d.ts
interface AlertDialogCancelProps extends DialogCloseProps {}
declare const _default$361: __VLS_WithSlots$343<vue33.DefineComponent<AlertDialogCancelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AlertDialogCancelProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$343<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogCancel.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogContent.vue.d.ts
interface AlertDialogContentContext {
  onCancelElementChange: (el: HTMLElement | undefined) => void;
}
declare const injectAlertDialogContentContext: <T extends AlertDialogContentContext | null | undefined = AlertDialogContentContext>(fallback?: T | undefined) => T extends null ? AlertDialogContentContext | null : AlertDialogContentContext, provideAlertDialogContentContext: (contextValue: AlertDialogContentContext) => AlertDialogContentContext;
type AlertDialogContentEmits = DialogContentEmits;
interface AlertDialogContentProps extends DialogContentProps {}
declare const _default$360: __VLS_WithSlots$342<vue33.DefineComponent<AlertDialogContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<AlertDialogContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$342<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogContent.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogDescription.vue.d.ts
interface AlertDialogDescriptionProps extends DialogDescriptionProps {}
declare const _default$359: __VLS_WithSlots$341<vue33.DefineComponent<AlertDialogDescriptionProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AlertDialogDescriptionProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$341<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogDescription.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogOverlay.vue.d.ts
interface AlertDialogOverlayProps extends DialogOverlayProps {}
declare const _default$358: __VLS_WithSlots$340<vue33.DefineComponent<AlertDialogOverlayProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AlertDialogOverlayProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$340<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogOverlay.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogPortal.vue.d.ts
interface AlertDialogPortalProps extends TeleportProps {}
declare const _default$357: __VLS_WithSlots$339<vue33.DefineComponent<AlertDialogPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AlertDialogPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$339<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogPortal.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogRoot.vue.d.ts
type AlertDialogEmits = DialogRootEmits;
interface AlertDialogProps extends Omit<DialogRootProps, 'modal'> {}
declare const _default$356: __VLS_WithSlots$338<vue33.DefineComponent<AlertDialogProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<AlertDialogProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    open: boolean;
    close: () => void;
  }) => any;
}>;
type __VLS_WithSlots$338<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogRoot.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogTitle.vue.d.ts
interface AlertDialogTitleProps extends DialogTitleProps {}
declare const _default$355: __VLS_WithSlots$337<vue33.DefineComponent<AlertDialogTitleProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AlertDialogTitleProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$337<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogTitle.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogTrigger.vue.d.ts
interface AlertDialogTriggerProps extends DialogTriggerProps {}
declare const _default$354: __VLS_WithSlots$336<vue33.DefineComponent<AlertDialogTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AlertDialogTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$336<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogTrigger.vue.d.ts.map
//#endregion
//#region src/AspectRatio/AspectRatio.vue.d.ts
interface AspectRatioProps extends PrimitiveProps {
  /**
   * The desired ratio. Eg: 16/9
   * @defaultValue 1
   */
  ratio?: number;
}
declare const _default$353: __VLS_WithSlots$335<vue33.DefineComponent<AspectRatioProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AspectRatioProps> & Readonly<{}>, {
  ratio: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current aspect ratio (in %) */
    aspect: number;
  }) => any;
}>;
type __VLS_WithSlots$335<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AspectRatio.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxContent.vue.d.ts
interface ListboxContentProps extends PrimitiveProps {}
declare const _default$352: __VLS_WithSlots$334<vue33.DefineComponent<ListboxContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ListboxContentProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$334<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ListboxContent.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxFilter.vue.d.ts
interface ListboxFilterProps extends PrimitiveProps {
  /** The controlled value of the filter. Can be binded with v-model. */
  modelValue?: string;
  /** Focus on element when mounted. */
  autoFocus?: boolean;
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
}
type ListboxFilterEmits = {
  'update:modelValue': [string];
};
declare const _default$351: __VLS_WithSlots$333<vue33.DefineComponent<ListboxFilterProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (args_0: string) => any;
}, string, vue33.PublicProps, Readonly<ListboxFilterProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: string) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string | undefined;
  }) => any;
}>;
type __VLS_WithSlots$333<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ListboxFilter.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxGroup.vue.d.ts
interface ListboxGroupProps extends PrimitiveProps {}
interface ListboxGroupContext {
  id: string;
}
declare const injectListboxGroupContext: <T extends ListboxGroupContext | null | undefined = ListboxGroupContext>(fallback?: T | undefined) => T extends null ? ListboxGroupContext | null : ListboxGroupContext, provideListboxGroupContext: (contextValue: ListboxGroupContext) => ListboxGroupContext;
declare const _default$350: __VLS_WithSlots$332<vue33.DefineComponent<ListboxGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ListboxGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$332<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ListboxGroup.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxGroupLabel.vue.d.ts
interface ListboxGroupLabelProps extends PrimitiveProps {
  for?: string;
}
declare const _default$349: __VLS_WithSlots$331<vue33.DefineComponent<ListboxGroupLabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ListboxGroupLabelProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$331<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ListboxGroupLabel.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxItem.vue.d.ts
interface ListboxItemProps<T = AcceptableValue> extends PrimitiveProps {
  /** The value given as data when submitted with a `name`. */
  value: T;
  /** When `true`, prevents the user from interacting with the item. */
  disabled?: boolean;
}
type SelectEvent$3<T> = CustomEvent<{
  originalEvent: PointerEvent;
  value?: T;
}>;
type ListboxItemEmits<T = AcceptableValue> = {
  /** Event handler called when the selecting item. <br> It can be prevented by calling `event.preventDefault`. */
  select: [event: SelectEvent$3<T>];
};
interface ListboxItemContext {
  isSelected: Ref<boolean>;
}
declare const injectListboxItemContext: <T extends ListboxItemContext | null | undefined = ListboxItemContext>(fallback?: T | undefined) => T extends null ? ListboxItemContext | null : ListboxItemContext, provideListboxItemContext: (contextValue: ListboxItemContext) => ListboxItemContext;
declare const _default$348: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$15<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$15<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent$3<T>) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onSelect"> & ListboxItemProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "select", event: SelectEvent$3<T>) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$15<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ListboxItem.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxItemIndicator.vue.d.ts
interface ListboxItemIndicatorProps extends PrimitiveProps {}
declare const _default$347: __VLS_WithSlots$330<vue33.DefineComponent<ListboxItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ListboxItemIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$330<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ListboxItemIndicator.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxRoot.vue.d.ts
type ListboxRootContext<T> = {
  modelValue: Ref<T | Array<T> | undefined>;
  onValueChange: (val: T) => void;
  multiple: Ref<boolean>;
  orientation: Ref<DataOrientation>;
  dir: Ref<Direction>;
  disabled: Ref<boolean>;
  highlightOnHover: Ref<boolean>;
  highlightedElement: Ref<HTMLElement | null>;
  isVirtual: Ref<boolean>;
  virtualFocusHook: EventHook<Event | null | undefined>;
  virtualKeydownHook: EventHook<KeyboardEvent>;
  virtualHighlightHook: EventHook<any>;
  by?: string | ((a: T, b: T) => boolean);
  firstValue?: Ref<T | undefined>;
  selectionBehavior?: Ref<'toggle' | 'replace'>;
  focusable: Ref<boolean>;
  onLeave: (event: Event) => void;
  onEnter: (event: Event) => void;
  changeHighlight: (el: HTMLElement, scrollIntoView?: boolean) => void;
  onKeydownNavigation: (event: KeyboardEvent) => void;
  onKeydownEnter: (event: KeyboardEvent) => void;
  onKeydownTypeAhead: (event: KeyboardEvent) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  highlightFirstItem: () => void;
};
declare const injectListboxRootContext: <T extends ListboxRootContext<AcceptableValue> | null | undefined = ListboxRootContext<AcceptableValue>>(fallback?: T | undefined) => T extends null ? ListboxRootContext<AcceptableValue> | null : ListboxRootContext<AcceptableValue>, provideListboxRootContext: (contextValue: ListboxRootContext<AcceptableValue>) => ListboxRootContext<AcceptableValue>;
interface ListboxRootProps<T = AcceptableValue> extends PrimitiveProps, FormFieldProps {
  /** The controlled value of the listbox. Can be binded with `v-model`. */
  modelValue?: T | Array<T>;
  /** The value of the listbox when initially rendered. Use when you do not need to control the state of the Listbox */
  defaultValue?: T | Array<T>;
  /** Whether multiple options can be selected or not. */
  multiple?: boolean;
  /** The orientation of the listbox. <br>Mainly so arrow navigation is done accordingly (left & right vs. up & down) */
  orientation?: DataOrientation;
  /** The reading direction of the listbox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** When `true`, prevents the user from interacting with listbox */
  disabled?: boolean;
  /**
   * How multiple selection should behave in the collection.
   * @defaultValue 'toggle'
   */
  selectionBehavior?: 'toggle' | 'replace';
  /** When `true`, hover over item will trigger highlight */
  highlightOnHover?: boolean;
  /** Use this to compare objects by a particular field, or pass your own comparison function for complete control over how objects are compared. */
  by?: string | ((a: T, b: T) => boolean);
}
type ListboxRootEmits<T = AcceptableValue> = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: T];
  /** Event handler when highlighted element changes. */
  'highlight': [payload: {
    ref: HTMLElement;
    value: T;
  } | undefined];
  /** Event handler called when container is being focused. Can be prevented. */
  'entryFocus': [event: CustomEvent];
  /** Event handler called when the mouse leave the container */
  'leave': [event: Event];
};
declare const _default$346: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$14<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$14<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: AcceptableValue) => any) | undefined;
    readonly onEntryFocus?: ((event: CustomEvent<any>) => any) | undefined;
    readonly onHighlight?: ((payload: {
      ref: HTMLElement;
      value: AcceptableValue;
    } | undefined) => any) | undefined;
    readonly onLeave?: ((event: Event) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue" | "onEntryFocus" | "onHighlight" | "onLeave"> & ListboxRootProps<AcceptableValue> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{
    highlightedElement: Ref<HTMLElement | null, HTMLElement | null>;
    highlightItem: (value: T) => void;
    highlightFirstItem: () => void;
    highlightSelected: (event?: Event) => Promise<void>;
    getItems: (includeDisabledItem?: boolean) => ({
      ref: HTMLElement;
      value?: any;
    } & {
      value: T;
    })[];
  }>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current active value */
      modelValue: T | T[] | undefined;
    }) => any;
  };
  emit: ((evt: "update:modelValue", value: AcceptableValue) => void) & ((evt: "entryFocus", event: CustomEvent<any>) => void) & ((evt: "highlight", payload: {
    ref: HTMLElement;
    value: AcceptableValue;
  } | undefined) => void) & ((evt: "leave", event: Event) => void);
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$14<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ListboxRoot.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxVirtualizer.vue.d.ts
interface ListboxVirtualizerProps<T extends AcceptableValue = AcceptableValue> {
  /** List of items */
  options: T[];
  /** Number of items rendered outside the visible area */
  overscan?: number;
  /** Estimated size (in px) of each item */
  estimateSize?: number | ((index: number) => number);
  /** Text content for each item to achieve type-ahead feature */
  textContent?: (option: T) => string;
}
declare const _default$345: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$13<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$13<Pick<Partial<{}> & Omit<{} & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, never> & ListboxVirtualizerProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      option: T;
      virtualizer: Virtualizer<HTMLElement, Element>;
      virtualItem: VirtualItem;
    }) => any;
  };
  emit: {};
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$13<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ListboxVirtualizer.vue.d.ts.map
//#endregion
//#region src/Autocomplete/AutocompleteInput.vue.d.ts
type AutocompleteInputEmits = ListboxFilterEmits;
interface AutocompleteInputProps extends ListboxFilterProps {}
declare const _default$344: __VLS_WithSlots$329<vue33.DefineComponent<AutocompleteInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (args_0: string) => any;
}, string, vue33.PublicProps, Readonly<AutocompleteInputProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: string) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$329<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AutocompleteInput.vue.d.ts.map
//#endregion
//#region src/Autocomplete/AutocompleteRoot.vue.d.ts
interface AutocompleteRootProps extends PrimitiveProps {
  /** The controlled value of the Autocomplete (the input text). Can be bound with `v-model`. */
  modelValue?: string;
  /** The value of the autocomplete when initially rendered. Use when you do not need to control the state. */
  defaultValue?: string;
  /** The controlled open state of the Autocomplete. Can be bound with `v-model:open`. */
  open?: boolean;
  /** The open state of the autocomplete when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
  /** When `true`, prevents the user from interacting with autocomplete */
  disabled?: boolean;
  /** The reading direction of the autocomplete when applicable. */
  dir?: Direction;
  /** The name of the field. Submitted with its owning form as part of a name/value pair. */
  name?: string;
  /** When `true`, indicates that the user must set the value before the owning form can be submitted. */
  required?: boolean;
  /**
   * Whether to reset the searchTerm when the Autocomplete input blurred
   * @defaultValue `false`
   */
  resetSearchTermOnBlur?: boolean;
  /**
   * Whether to open the autocomplete when the input is focused
   * @defaultValue `false`
   */
  openOnFocus?: boolean;
  /**
   * Whether to open the autocomplete when the input is clicked
   * @defaultValue `false`
   */
  openOnClick?: boolean;
  /**
   * When `true`, disable the default filters
   */
  ignoreFilter?: boolean;
  /** When `true`, hover over item will trigger highlight */
  highlightOnHover?: boolean;
}
type AutocompleteRootEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: string];
  /** Event handler when highlighted element changes. */
  'highlight': [payload: {
    ref: HTMLElement;
    value: string;
  } | undefined];
  /** Event handler called when the open state of the autocomplete changes. */
  'update:open': [value: boolean];
};
type AutocompleteRootContext = {
  modelValue: Ref<string>;
};
declare const injectAutocompleteRootContext: <T extends AutocompleteRootContext | null | undefined = AutocompleteRootContext>(fallback?: T | undefined) => T extends null ? AutocompleteRootContext | null : AutocompleteRootContext, provideAutocompleteRootContext: (contextValue: AutocompleteRootContext) => AutocompleteRootContext;
declare const _default$343: __VLS_WithSlots$328<vue33.DefineComponent<AutocompleteRootProps, {
  filtered: vue33.ComputedRef<{
    count: number;
    items: Map<string, number>;
    groups: Set<string>;
  }>;
  highlightedElement: vue33.ComputedRef<HTMLElement | undefined>;
  highlightItem: ((value: AcceptableValue) => void) | undefined;
  highlightFirstItem: (() => void) | undefined;
  highlightSelected: ((event?: Event) => Promise<void>) | undefined;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: string) => any;
  "update:open": (value: boolean) => any;
  highlight: (payload: {
    ref: HTMLElement;
    value: string;
  } | undefined) => any;
}, string, vue33.PublicProps, Readonly<AutocompleteRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
  onHighlight?: ((payload: {
    ref: HTMLElement;
    value: string;
  } | undefined) => any) | undefined;
}>, {
  open: boolean;
  highlightOnHover: boolean;
  resetSearchTermOnBlur: boolean;
  openOnFocus: boolean;
  openOnClick: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
    /** Current active value */
    modelValue: string;
  }) => any;
}>;
type __VLS_WithSlots$328<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AutocompleteRoot.vue.d.ts.map
//#endregion
//#region src/Popper/PopperAnchor.vue.d.ts
interface PopperAnchorProps extends PrimitiveProps {
  /**
   *  The reference (or anchor) element that is being referred to for positioning.
   *
   *  If not provided will use the current component as anchor.
   */
  reference?: ReferenceElement;
}
//#endregion
//#region src/shared/component/Arrow.vue.d.ts
interface ArrowProps extends PrimitiveProps {
  /**
   * The width of the arrow in pixels.
   *
   * @defaultValue 10
   */
  width?: number;
  /**
   * The height of the arrow in pixels.
   *
   * @defaultValue 5
   */
  height?: number;
  /**
   * When `true`, render the rounded version of arrow. Do not work with `as`/`asChild`
   *
   * @defaultValue false
   */
  rounded?: boolean;
}
//#endregion
//#region src/Popper/PopperArrow.vue.d.ts
interface PopperArrowProps extends ArrowProps, PrimitiveProps {}
//#endregion
//#region src/Popper/utils.d.ts
declare const SIDE_OPTIONS: readonly ["top", "right", "bottom", "left"];
declare const ALIGN_OPTIONS: readonly ["start", "center", "end"];
type Side = (typeof SIDE_OPTIONS)[number];
type Align = (typeof ALIGN_OPTIONS)[number];
//#endregion
//#region src/Popper/PopperContent.vue.d.ts
interface PopperContentProps extends PrimitiveProps {
  /**
   * The preferred side of the trigger to render against when open.
   * Will be reversed when collisions occur and avoidCollisions
   * is enabled.
   *
   * @defaultValue "bottom"
   */
  side?: Side;
  /**
   * The distance in pixels from the trigger.
   *
   * @defaultValue 0
   */
  sideOffset?: number;
  /**
   * Flip to the opposite side when colliding with boundary.
   *
   * @defaultValue true
   */
  sideFlip?: boolean;
  /**
   * The preferred alignment against the trigger.
   * May change when collisions occur.
   *
   * @defaultValue "center"
   */
  align?: Align;
  /**
   * An offset in pixels from the `start` or `end` alignment options.
   *
   * @defaultValue 0
   */
  alignOffset?: number;
  /**
   * Flip alignment when colliding with boundary.
   * May only occur when `prioritizePosition` is true.
   *
   * @defaultValue true
   */
  alignFlip?: boolean;
  /**
   * When `true`, overrides the side and align preferences
   * to prevent collisions with boundary edges.
   *
   * @defaultValue true
   */
  avoidCollisions?: boolean;
  /**
   * The element used as the collision boundary. By default
   * this is the viewport, though you can provide additional
   * element(s) to be included in this check.
   *
   * @defaultValue []
   */
  collisionBoundary?: Element | null | Array<Element | null>;
  /**
   * The distance in pixels from the boundary edges where collision
   * detection should occur. Accepts a number (same for all sides),
   * or a partial padding object, for example: { top: 20, left: 20 }.
   *
   * @defaultValue 0
   */
  collisionPadding?: number | Partial<Record<Side, number>>;
  /**
   * The padding between the arrow and the edges of the content.
   * If your content has border-radius, this will prevent it from
   * overflowing the corners.
   *
   * @defaultValue 0
   */
  arrowPadding?: number;
  /**
   * When `true`, hides the arrow when it cannot be centered
   * to the reference element.
   *
   * @defaultValue true
   */
  hideShiftedArrow?: boolean;
  /**
   * The sticky behavior on the align axis. `partial` will keep the
   * content in the boundary as long as the trigger is at least partially
   * in the boundary whilst "always" will keep the content in the boundary
   * regardless.
   *
   * @defaultValue "partial"
   */
  sticky?: 'partial' | 'always';
  /**
   * Whether to hide the content when the trigger becomes fully occluded.
   *
   * @defaultValue false
   */
  hideWhenDetached?: boolean;
  /**
   *  The type of CSS position property to use.
   */
  positionStrategy?: 'absolute' | 'fixed';
  /**
   * Strategy to update the position of the floating element on every animation frame.
   *
   * @defaultValue 'optimized'
   */
  updatePositionStrategy?: 'optimized' | 'always';
  /**
   * Whether to disable the update position for the content when the layout shifted.
   *
   * @defaultValue false
   */
  disableUpdateOnLayoutShift?: boolean;
  /**
   * Force content to be position within the viewport.
   *
   * Might overlap the reference element, which may not be desired.
   *
   * @defaultValue false
   */
  prioritizePosition?: boolean;
  /**
   *  The custom element or virtual element that will be set as the reference
   *  to position the floating element.
   *
   *  If provided, it will replace the default anchor element.
   */
  reference?: ReferenceElement;
}
//#endregion
//#region src/Combobox/ComboboxAnchor.vue.d.ts
interface ComboboxAnchorProps extends PopperAnchorProps {}
declare const _default$342: __VLS_WithSlots$327<vue33.DefineComponent<ComboboxAnchorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$327<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxAnchor.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxArrow.vue.d.ts
interface ComboboxArrowProps extends PopperArrowProps {}
declare const _default$341: __VLS_WithSlots$326<vue33.DefineComponent<ComboboxArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$326<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxArrow.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxCancel.vue.d.ts
interface ComboboxCancelProps extends PrimitiveProps {}
declare const _default$340: __VLS_WithSlots$325<vue33.DefineComponent<ComboboxCancelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxCancelProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$325<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxCancel.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxContentImpl.vue.d.ts
type ComboboxContentImplEmits = DismissableLayerEmits;
interface ComboboxContentImplProps extends PopperContentProps, DismissableLayerProps {
  /**
   * The positioning mode to use, <br>
   * `inline` is the default and you can control the position using CSS. <br>
   * `popper` positions content in the same way as our other primitives, for example `Popover` or `DropdownMenu`.
   */
  position?: 'inline' | 'popper';
  /** The document.body will be lock, and scrolling will be disabled. */
  bodyLock?: boolean;
  /**
   * When `true`, hides the content when there are no items matching the filter.
   * @defaultValue false
   */
  hideWhenEmpty?: boolean;
}
//#endregion
//#region src/Combobox/ComboboxContent.vue.d.ts
type ComboboxContentEmits = ComboboxContentImplEmits;
interface ComboboxContentProps extends ComboboxContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$339: __VLS_WithSlots$324<vue33.DefineComponent<ComboboxContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
}, string, vue33.PublicProps, Readonly<ComboboxContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$324<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxContent.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxEmpty.vue.d.ts
interface ComboboxEmptyProps extends PrimitiveProps {}
declare const _default$338: __VLS_WithSlots$323<vue33.DefineComponent<ComboboxEmptyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxEmptyProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$323<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxEmpty.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxGroup.vue.d.ts
interface ComboboxGroupProps extends ListboxGroupProps {}
type ComboboxGroupContext = {
  id: string;
  labelId: string;
};
declare const injectComboboxGroupContext: <T extends ComboboxGroupContext | null | undefined = ComboboxGroupContext>(fallback?: T | undefined) => T extends null ? ComboboxGroupContext | null : ComboboxGroupContext, provideComboboxGroupContext: (contextValue: ComboboxGroupContext) => ComboboxGroupContext;
declare const _default$337: __VLS_WithSlots$322<vue33.DefineComponent<ComboboxGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$322<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxGroup.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxInput.vue.d.ts
type ComboboxInputEmits = ListboxFilterEmits;
interface ComboboxInputProps extends ListboxFilterProps {
  /** The display value of input for selected item. Does not work with `multiple`. */
  displayValue?: (val: any) => string;
}
declare const _default$336: __VLS_WithSlots$321<vue33.DefineComponent<ComboboxInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (args_0: string) => any;
}, string, vue33.PublicProps, Readonly<ComboboxInputProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: string) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$321<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxInput.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxItem.vue.d.ts
type ComboboxItemEmits<T = AcceptableValue> = ListboxItemEmits<T>;
interface ComboboxItemProps<T = AcceptableValue> extends ListboxItemProps<T> {
  /**
   * A string representation of the item contents.
   *
   * If the children are not plain text, then the `textValue` prop must also be set to a plain text representation, which will be used for autocomplete in the ComboBox.
   */
  textValue?: string;
}
declare const _default$335: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$12<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$12<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent$3<T>) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onSelect"> & ComboboxItemProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "select", event: SelectEvent$3<T>) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$12<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ComboboxItem.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxItemIndicator.vue.d.ts
interface ComboboxItemIndicatorProps extends ListboxItemIndicatorProps {}
declare const _default$334: __VLS_WithSlots$320<vue33.DefineComponent<ComboboxItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxItemIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$320<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxItemIndicator.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxLabel.vue.d.ts
interface ComboboxLabelProps extends PrimitiveProps {
  for?: string;
}
declare const _default$333: __VLS_WithSlots$319<vue33.DefineComponent<ComboboxLabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxLabelProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$319<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxLabel.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxPortal.vue.d.ts
interface ComboboxPortalProps extends TeleportProps {}
declare const _default$332: __VLS_WithSlots$318<vue33.DefineComponent<ComboboxPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$318<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxPortal.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxRoot.vue.d.ts
type ComboboxRootContext<T> = {
  modelValue: Ref<T | Array<T>>;
  multiple: Ref<boolean>;
  disabled: Ref<boolean>;
  open: Ref<boolean>;
  onOpenChange: (value: boolean) => void;
  isUserInputted: Ref<boolean>;
  isVirtual: Ref<boolean>;
  contentId: string;
  inputElement: Ref<HTMLInputElement | undefined>;
  onInputElementChange: (el: HTMLInputElement) => void;
  triggerElement: Ref<HTMLElement | undefined>;
  onTriggerElementChange: (el: HTMLElement) => void;
  highlightedElement: Ref<HTMLElement | undefined>;
  parentElement: Ref<HTMLElement | undefined>;
  resetSearchTermOnSelect: Ref<boolean>;
  onResetSearchTerm: EventHookOn;
  allItems: Ref<Map<string, string>>;
  allGroups: Ref<Map<string, Set<string>>>;
  filterSearch: Ref<string>;
  filterState: ComputedRef<{
    count: number;
    items: Map<string, number>;
    groups: Set<string>;
  }>;
  ignoreFilter: Ref<boolean>;
  openOnFocus: Ref<boolean>;
  openOnClick: Ref<boolean>;
  resetModelValueOnClear: Ref<boolean>;
};
declare const injectComboboxRootContext: <T extends ComboboxRootContext<AcceptableValue> | null | undefined = ComboboxRootContext<AcceptableValue>>(fallback?: T | undefined) => T extends null ? ComboboxRootContext<AcceptableValue> | null : ComboboxRootContext<AcceptableValue>, provideComboboxRootContext: (contextValue: ComboboxRootContext<AcceptableValue>) => ComboboxRootContext<AcceptableValue>;
type ComboboxRootEmits<T = AcceptableValue> = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: T];
  /** Event handler when highlighted element changes. */
  'highlight': [payload: {
    ref: HTMLElement;
    value: T;
  } | undefined];
  /** Event handler called when the open state of the combobox changes. */
  'update:open': [value: boolean];
};
interface ComboboxRootProps<T = AcceptableValue> extends Omit<ListboxRootProps<T>, 'orientation' | 'selectionBehavior'> {
  /** The controlled open state of the Combobox. Can be binded with `v-model:open`. */
  open?: boolean;
  /** The open state of the combobox when it is initially rendered. <br> Use when you do not need to control its open state. */
  defaultOpen?: boolean;
  /**
   * Whether to reset the searchTerm when the Combobox input blurred
   * @defaultValue `true`
   */
  resetSearchTermOnBlur?: boolean;
  /**
   * Whether to reset the searchTerm when the Combobox value is selected
   * @defaultValue `true`
   */
  resetSearchTermOnSelect?: boolean;
  /**
   * Whether to open the combobox when the input is focused
   * @defaultValue `false`
   */
  openOnFocus?: boolean;
  /**
   * Whether to open the combobox when the input is clicked
   * @defaultValue `false`
   */
  openOnClick?: boolean;
  /**
   * When `true`, disable the default filters
   */
  ignoreFilter?: boolean;
  /**
   * When `true` the `modelValue` will be reset to `null` (or `[]` if `multiple`)
   */
  resetModelValueOnClear?: boolean;
}
declare const _default$331: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$11<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$11<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: T) => any) | undefined;
    readonly "onUpdate:open"?: ((value: boolean) => any) | undefined;
    readonly onHighlight?: ((payload: {
      ref: HTMLElement;
      value: T;
    } | undefined) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue" | "onUpdate:open" | "onHighlight"> & ComboboxRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{
    filtered: ComputedRef<{
      count: number;
      items: Map<string, number>;
      groups: Set<string>;
    }>;
    highlightedElement: ComputedRef<HTMLElement | undefined>;
    highlightItem: ((value: AcceptableValue) => void) | undefined;
    highlightFirstItem: (() => void) | undefined;
    highlightSelected: ((event?: Event) => Promise<void>) | undefined;
  }>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current open state */
      open: boolean;
      /** Current active value */
      modelValue: T | T[];
    }) => any;
  };
  emit: ((evt: "update:modelValue", value: T) => void) & ((evt: "update:open", value: boolean) => void) & ((evt: "highlight", payload: {
    ref: HTMLElement;
    value: T;
  } | undefined) => void);
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$11<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ComboboxRoot.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxSeparator.vue.d.ts
interface ComboboxSeparatorProps extends PrimitiveProps {}
declare const _default$330: __VLS_WithSlots$317<vue33.DefineComponent<ComboboxSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$317<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxSeparator.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxTrigger.vue.d.ts
interface ComboboxTriggerProps extends PrimitiveProps {
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
}
declare const _default$329: __VLS_WithSlots$316<vue33.DefineComponent<ComboboxTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$316<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxTrigger.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxViewport.vue.d.ts
interface ComboboxViewportProps extends PrimitiveProps {
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string;
}
declare const _default$328: __VLS_WithSlots$315<vue33.DefineComponent<ComboboxViewportProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ComboboxViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$315<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxViewport.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxVirtualizer.vue.d.ts
interface ComboboxVirtualizerProps<T extends AcceptableValue = AcceptableValue> extends ListboxVirtualizerProps<T> {}
declare const _default$327: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$10<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$10<Pick<Partial<{}> & Omit<{} & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, never> & ComboboxVirtualizerProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      option: T;
      virtualizer: Virtualizer<HTMLElement, Element>;
      virtualItem: VirtualItem;
    }) => any;
  };
  emit: {};
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$10<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ComboboxVirtualizer.vue.d.ts.map
//#endregion
//#region src/Avatar/AvatarFallback.vue.d.ts
interface AvatarFallbackProps extends PrimitiveProps {
  /** Useful for delaying rendering so it only appears for those with slower connections. */
  delayMs?: number;
}
declare const _default$326: __VLS_WithSlots$314<vue33.DefineComponent<AvatarFallbackProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AvatarFallbackProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$314<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AvatarFallback.vue.d.ts.map
//#endregion
//#region src/Avatar/utils.d.ts
type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';
//#endregion
//#region src/Avatar/AvatarImage.vue.d.ts
type AvatarImageEmits = {
  /**
   * A callback providing information about the loading status of the image. <br>
   * This is useful in case you want to control more precisely what to render as the image is loading.
   */
  loadingStatusChange: [value: ImageLoadingStatus];
};
interface AvatarImageProps extends PrimitiveProps {
  src: string;
  referrerPolicy?: ImgHTMLAttributes['referrerpolicy'];
  crossOrigin?: ImgHTMLAttributes['crossorigin'];
}
declare const _default$325: __VLS_WithSlots$313<vue33.DefineComponent<AvatarImageProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  loadingStatusChange: (value: ImageLoadingStatus) => any;
}, string, vue33.PublicProps, Readonly<AvatarImageProps> & Readonly<{
  onLoadingStatusChange?: ((value: ImageLoadingStatus) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$313<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AvatarImage.vue.d.ts.map
//#endregion
//#region src/Avatar/AvatarRoot.vue.d.ts
interface AvatarRootProps extends PrimitiveProps {}
type AvatarRootContext = {
  imageLoadingStatus: Ref<ImageLoadingStatus>;
};
declare const injectAvatarRootContext: <T extends AvatarRootContext | null | undefined = AvatarRootContext>(fallback?: T | undefined) => T extends null ? AvatarRootContext | null : AvatarRootContext, provideAvatarRootContext: (contextValue: AvatarRootContext) => AvatarRootContext;
declare const _default$324: __VLS_WithSlots$312<vue33.DefineComponent<AvatarRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<AvatarRootProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$312<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AvatarRoot.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarCell.vue.d.ts
interface CalendarCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue;
}
declare const _default$323: __VLS_WithSlots$311<vue33.DefineComponent<CalendarCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$311<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarCell.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarCellTrigger.vue.d.ts
interface CalendarCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  day: DateValue;
  /** The month in which the cell is rendered */
  month: DateValue;
}
interface CalendarCellTriggerSlot {
  default?: (props: {
    /** Current day */
    dayValue: string;
    /** Current disable state */
    disabled: boolean;
    /** Current selected state */
    selected: boolean;
    /** Current today state */
    today: boolean;
    /** Current outside view state */
    outsideView: boolean;
    /** Current outside visible view state */
    outsideVisibleView: boolean;
    /** Current unavailable state */
    unavailable: boolean;
  }) => any;
}
declare const _default$322: __VLS_WithSlots$310<vue33.DefineComponent<CalendarCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, CalendarCellTriggerSlot>;
type __VLS_WithSlots$310<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarCellTrigger.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGrid.vue.d.ts
interface CalendarGridProps extends PrimitiveProps {}
declare const _default$321: __VLS_WithSlots$309<vue33.DefineComponent<CalendarGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarGridProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$309<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGrid.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGridBody.vue.d.ts
interface CalendarGridBodyProps extends PrimitiveProps {}
declare const _default$320: __VLS_WithSlots$308<vue33.DefineComponent<CalendarGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$308<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGridBody.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGridHead.vue.d.ts
interface CalendarGridHeadProps extends PrimitiveProps {}
declare const _default$319: __VLS_WithSlots$307<vue33.DefineComponent<CalendarGridHeadProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarGridHeadProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$307<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGridHead.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGridRow.vue.d.ts
interface CalendarGridRowProps extends PrimitiveProps {}
declare const _default$318: __VLS_WithSlots$306<vue33.DefineComponent<CalendarGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarGridRowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$306<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGridRow.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarHeadCell.vue.d.ts
interface CalendarHeadCellProps extends PrimitiveProps {}
declare const _default$317: __VLS_WithSlots$305<vue33.DefineComponent<CalendarHeadCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarHeadCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$305<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarHeadCell.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarHeader.vue.d.ts
interface CalendarHeaderProps extends PrimitiveProps {}
declare const _default$316: __VLS_WithSlots$304<vue33.DefineComponent<CalendarHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarHeaderProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$304<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarHeader.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarHeading.vue.d.ts
interface CalendarHeadingProps extends PrimitiveProps {}
declare const _default$315: __VLS_WithSlots$303<vue33.DefineComponent<CalendarHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarHeadingProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$303<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarHeading.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarNext.vue.d.ts
interface CalendarNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the `CalendarRoot`. */
  nextPage?: (placeholder: DateValue) => DateValue;
}
interface CalendarNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$314: __VLS_WithSlots$302<vue33.DefineComponent<CalendarNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarNextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, CalendarNextSlot>;
type __VLS_WithSlots$302<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarNext.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarPrev.vue.d.ts
interface CalendarPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the `CalendarRoot`. */
  prevPage?: (placeholder: DateValue) => DateValue;
}
interface CalendarPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$313: __VLS_WithSlots$301<vue33.DefineComponent<CalendarPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CalendarPrevProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, CalendarPrevSlot>;
type __VLS_WithSlots$301<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarPrev.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarRoot.vue.d.ts
type CalendarRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue | DateValue[] | undefined>;
  placeholder: Ref<DateValue>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue>[]>;
  weekDays: Ref<string[]>;
  weekStartsOn: Ref<WeekStartsOn>;
  weekdayFormat: Ref<WeekDayFormat>;
  fixedWeeks: Ref<boolean>;
  multiple: Ref<boolean>;
  numberOfMonths: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onDateChange: (date: DateValue) => void;
  onPlaceholderChange: (date: DateValue) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  isInvalid: Ref<boolean>;
  isDateDisabled: Matcher;
  isDateSelected: Matcher;
  isDateUnavailable?: Matcher;
  isOutsideVisibleView: (date: DateValue) => boolean;
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void;
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  disableDaysOutsideCurrentView: Ref<boolean>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
  isPlaceholderFocusable: Ref<boolean>;
  firstFocusableDate: Ref<DateValue | undefined>;
  hasSelectedDate: Ref<boolean>;
  isSelectedDateDisabled: Ref<boolean>;
};
interface CalendarRootProps extends PrimitiveProps {
  /** The default value for the calendar */
  defaultValue?: DateValue;
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The placeholder date, which is used to determine what month to display when no date is selected */
  placeholder?: DateValue;
  /** This property causes the previous and next buttons to navigate by the number of months displayed at once, rather than one month */
  pagedNavigation?: boolean;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The day of the week to start the calendar on */
  weekStartsOn?: WeekStartsOn;
  /** The format to use for the weekday strings provided via the weekdays slot prop */
  weekdayFormat?: WeekDayFormat;
  /** The accessible label for the calendar */
  calendarLabel?: string;
  /** Whether or not to always display 6 weeks in the calendar */
  fixedWeeks?: boolean;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** The number of months to display at once */
  numberOfMonths?: number;
  /** Whether the calendar is disabled */
  disabled?: boolean;
  /** Whether the calendar is readonly */
  readonly?: boolean;
  /** If true, the calendar will focus the selected day, today, or the first day of the month depending on what is visible when the calendar is mounted */
  initialFocus?: boolean;
  /** A function that returns whether or not a date is disabled */
  isDateDisabled?: Matcher;
  /** A function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher;
  /** The reading direction of the calendar when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** A function that returns the next page of the calendar. It receives the current placeholder as an argument inside the component. */
  nextPage?: (placeholder: DateValue) => DateValue;
  /** A function that returns the previous page of the calendar. It receives the current placeholder as an argument inside the component. */
  prevPage?: (placeholder: DateValue) => DateValue;
  /** The controlled selected date value of the calendar. Can be bound as `v-model`. */
  modelValue?: DateValue | DateValue[] | undefined;
  /** Whether multiple dates can be selected */
  multiple?: boolean;
  /** Whether or not to disable days outside the current view. */
  disableDaysOutsideCurrentView?: boolean;
}
type CalendarRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
};
declare const injectCalendarRootContext: <T extends CalendarRootContext | null | undefined = CalendarRootContext>(fallback?: T | undefined) => T extends null ? CalendarRootContext | null : CalendarRootContext, provideCalendarRootContext: (contextValue: CalendarRootContext) => CalendarRootContext;
declare const _default$312: __VLS_WithSlots$300<vue33.DefineComponent<CalendarRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue | undefined) => any;
  "update:placeholder": (date: DateValue) => any;
}, string, vue33.PublicProps, Readonly<CalendarRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: DateValue;
  multiple: boolean;
  placeholder: DateValue;
  readonly: boolean;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  initialFocus: boolean;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  disableDaysOutsideCurrentView: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue;
    /** The grid of dates */
    grid: Grid<DateValue>[];
    /** The days of the week */
    weekDays: string[];
    /** The start of the week */
    weekStartsOn: WeekStartsOn;
    /** The calendar locale */
    locale: string;
    /** Whether or not to always display 6 weeks in the calendar */
    fixedWeeks: boolean;
    /** The current date of the calendar */
    modelValue: DateValue | DateValue[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$300<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarRoot.vue.d.ts.map
//#endregion
//#region src/RovingFocus/utils.d.ts
type Orientation$1 = 'horizontal' | 'vertical';
type Direction$5 = 'ltr' | 'rtl';
//#endregion
//#region src/RovingFocus/RovingFocusGroup.vue.d.ts
interface RovingFocusGroupProps extends PrimitiveProps {
  /**
   * The orientation of the group.
   * Mainly so arrow navigation is done accordingly (left & right vs. up & down)
   */
  orientation?: Orientation$1;
  /**
   * The direction of navigation between items.
   */
  dir?: Direction$5;
  /**
   * Whether keyboard navigation should loop around
   * @defaultValue false
   */
  loop?: boolean;
  /** The controlled value of the current stop item. Can be binded as `v-model`. */
  currentTabStopId?: string | null;
  /**
   * The value of the current stop item.
   *
   * Use when you do not need to control the state of the stop item.
   */
  defaultCurrentTabStopId?: string;
  /**
   * When `true`, will prevent scrolling to the focus item when focused.
   */
  preventScrollOnEntryFocus?: boolean;
}
type RovingFocusGroupEmits = {
  'entryFocus': [event: Event];
  'update:currentTabStopId': [value: string | null | undefined];
};
declare const _default$311: __VLS_WithSlots$299<vue33.DefineComponent<RovingFocusGroupProps, {
  getItems: (includeDisabledItem?: boolean) => {
    ref: HTMLElement;
    value?: any;
  }[];
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:currentTabStopId": (value: string | null | undefined) => any;
  entryFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<RovingFocusGroupProps> & Readonly<{
  "onUpdate:currentTabStopId"?: ((value: string | null | undefined) => any) | undefined;
  onEntryFocus?: ((event: Event) => any) | undefined;
}>, {
  orientation: Orientation$1;
  loop: boolean;
  preventScrollOnEntryFocus: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$299<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RovingFocusGroup.vue.d.ts.map
//#endregion
//#region src/RovingFocus/RovingFocusItem.vue.d.ts
interface RovingFocusItemProps extends PrimitiveProps {
  tabStopId?: string;
  /**
   * When `false`, item will not be focusable.
   * @defaultValue `true`
   */
  focusable?: boolean;
  /** When `true`, item will be initially focused. */
  active?: boolean;
  /** When `true`, shift + arrow key will allow focusing on next/previous item. */
  allowShiftKey?: boolean;
}
declare const _default$310: __VLS_WithSlots$298<vue33.DefineComponent<RovingFocusItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RovingFocusItemProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  focusable: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$298<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RovingFocusItem.vue.d.ts.map
//#endregion
//#region src/Checkbox/CheckboxGroupRoot.vue.d.ts
interface CheckboxGroupRootProps<T = AcceptableValue> extends Pick<RovingFocusGroupProps, 'as' | 'asChild' | 'dir' | 'orientation' | 'loop'>, FormFieldProps {
  /** The value of the checkbox when it is initially rendered. Use when you do not need to control its value. */
  defaultValue?: T[];
  /** The controlled value of the checkbox. Can be binded with v-model. */
  modelValue?: T[];
  /** When `false`, navigating through the items using arrow keys will be disabled. */
  rovingFocus?: boolean;
  /** When `true`, prevents the user from interacting with the checkboxes */
  disabled?: boolean;
}
type CheckboxGroupRootEmits<T = AcceptableValue> = {
  /** Event handler called when the value of the checkbox changes. */
  'update:modelValue': [value: T[]];
};
interface CheckboxGroupRootContext {
  modelValue: Ref<AcceptableValue[]>;
  rovingFocus: Ref<boolean>;
  disabled: Ref<boolean>;
}
declare const injectCheckboxGroupRootContext: <T extends CheckboxGroupRootContext | null | undefined = CheckboxGroupRootContext>(fallback?: T | undefined) => T extends null ? CheckboxGroupRootContext | null : CheckboxGroupRootContext, provideCheckboxGroupRootContext: (contextValue: CheckboxGroupRootContext) => CheckboxGroupRootContext;
declare const _default$309: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$9<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$9<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: T[]) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue"> & CheckboxGroupRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "update:modelValue", value: T[]) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$9<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=CheckboxGroupRoot.vue.d.ts.map
//#endregion
//#region src/Checkbox/CheckboxIndicator.vue.d.ts
interface CheckboxIndicatorProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$308: __VLS_WithSlots$297<vue33.DefineComponent<CheckboxIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<CheckboxIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$297<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CheckboxIndicator.vue.d.ts.map
//#endregion
//#region src/Checkbox/utils.d.ts
type CheckedState$1 = boolean | 'indeterminate';
//#endregion
//#region src/Checkbox/CheckboxRoot.vue.d.ts
interface CheckboxRootProps<T = boolean> extends PrimitiveProps, FormFieldProps {
  /** The value of the checkbox when it is initially rendered. Use when you do not need to control its value. */
  defaultValue?: T | 'indeterminate';
  /** The controlled value of the checkbox. Can be binded with v-model. */
  modelValue?: T | 'indeterminate' | null;
  /** When `true`, prevents the user from interacting with the checkbox */
  disabled?: boolean;
  /**
   * The value given as data when submitted with a `name`.
   *  @defaultValue "on"
   */
  value?: AcceptableValue;
  /** Id of the element */
  id?: string;
  /**
   * The value used when the checkbox is checked. Defaults to `true`.
   */
  trueValue?: T;
  /**
   * The value used when the checkbox is unchecked. Defaults to `false`.
   */
  falseValue?: T;
}
type CheckboxRootEmits<T = boolean> = {
  /** Event handler called when the value of the checkbox changes. */
  'update:modelValue': [value: T | 'indeterminate'];
};
interface CheckboxRootContext {
  disabled: Ref<boolean>;
  state: Ref<CheckedState$1>;
}
declare const injectCheckboxRootContext: <T extends CheckboxRootContext | null | undefined = CheckboxRootContext>(fallback?: T | undefined) => T extends null ? CheckboxRootContext | null : CheckboxRootContext, provideCheckboxRootContext: (contextValue: CheckboxRootContext) => CheckboxRootContext;
declare const _default$307: <T = boolean>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$8<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$8<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: "indeterminate" | T) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue"> & CheckboxRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current value */
      modelValue: "indeterminate" | T;
      /** Current state */
      state: CheckedState$1;
    }) => any;
  };
  emit: (evt: "update:modelValue", value: "indeterminate" | T) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$8<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=CheckboxRoot.vue.d.ts.map
//#endregion
//#region src/ColorArea/ColorAreaArea.vue.d.ts
interface ColorAreaAreaProps extends PrimitiveProps {}
declare const _default$306: __VLS_WithSlots$296<vue33.DefineComponent<ColorAreaAreaProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorAreaAreaProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$296<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorAreaArea.vue.d.ts.map
//#endregion
//#region src/shared/color/types.d.ts
type ColorSpace = 'rgb' | 'hsl' | 'hsb';
interface RGBColor {
  space: 'rgb';
  r: number;
  g: number;
  b: number;
  alpha: number;
}
interface HSLColor {
  space: 'hsl';
  h: number;
  s: number;
  l: number;
  alpha: number;
}
interface HSBColor {
  space: 'hsb';
  h: number;
  s: number;
  b: number;
  alpha: number;
}
type Color = RGBColor | HSLColor | HSBColor;
type RGBChannel = 'red' | 'green' | 'blue' | 'alpha';
type HSLChannel = 'hue' | 'saturation' | 'lightness' | 'alpha';
type HSBChannel = 'hue' | 'saturation' | 'brightness' | 'alpha';
type ColorChannel = RGBChannel | HSLChannel | HSBChannel;
interface ChannelRange {
  min: number;
  max: number;
  step: number;
}
type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsb';
//# sourceMappingURL=types.d.ts.map
//#endregion
//#region src/shared/color/channel.d.ts
/**
 * Gets the range (min, max, step) for a color channel.
 */
declare function getChannelRange(channel: ColorChannel): ChannelRange;
/**
 * Gets the display name for a channel.
 */
declare function getChannelName(channel: ColorChannel): string;
/**
 * Gets the value of a specific channel from a color.
 * Avoids conversion if the color is already in the target color space.
 */
declare function getChannelValue(color: Color, channel: ColorChannel): number;
/**
 * Sets a channel value on a color, returning a new color.
 * The returned color maintains the original color space.
 */
declare function setChannelValue(color: Color, channel: ColorChannel, value: number): Color;
/**
 * Sets multiple channel values at once, preserving exact values.
 * Useful when updating 2D color areas where both channels change simultaneously.
 */
declare function setChannelValues(color: Color, channels: Array<{
  channel: ColorChannel;
  value: number;
}>): Color;
//# sourceMappingURL=channel.d.ts.map
//#endregion
//#region src/shared/color/convert.d.ts
/**
 * Converts a Color object to a string representation.
 */
declare function colorToString(color: Color, format?: ColorFormat): string;
/**
 * Converts any color to hex string.
 */
declare function colorToHex(color: Color): string;
/**
 * Converts any color to rgb() string.
 */
declare function colorToRgb(color: Color): string;
/**
 * Converts any color to hsl() string.
 */
declare function colorToHsl(color: Color): string;
/**
 * Converts any color to hsb() string.
 */
declare function colorToHsb(color: Color): string;
/**
 * Converts any color to RGB color space.
 */
declare function convertToRgb(color: Color): RGBColor;
/**
 * Converts any color to HSL color space.
 */
declare function convertToHsl(color: Color): HSLColor;
/**
 * Converts any color to HSB color space.
 */
declare function convertToHsb(color: Color): HSBColor;
//# sourceMappingURL=convert.d.ts.map
//#endregion
//#region src/shared/color/gradient.d.ts
/**
 * Generates a CSS gradient for a color slider track.
 */
declare function getSliderGradient(color: Color, channel: ColorChannel, colorSpace?: ColorSpace): string;
/**
 * Generates a CSS gradient for a color area (2D picker).
 */
declare function getAreaGradient(color: Color, xChannel: ColorChannel, yChannel: ColorChannel, colorSpace?: ColorSpace): {
  background: string;
  gradientX: string;
  gradientY: string;
};
/**
 * Gets the CSS background style for a color area.
 */
declare function getAreaBackgroundStyle(color: Color, xChannel: ColorChannel, yChannel: ColorChannel, colorSpace?: ColorSpace): Record<string, string>;
/**
 * Gets the CSS background for a slider track.
 */
declare function getSliderBackgroundStyle(color: Color, channel: ColorChannel, colorSpace?: ColorSpace): Record<string, string>;
//# sourceMappingURL=gradient.d.ts.map
//#endregion
//#region src/shared/color/parse.d.ts
/**
 * Parses a color string into a Color object.
 * Supports hex (#rrggbb, #rgb), rgb(), hsl(), and hsb()/hsv() formats.
 */
declare function parseColor(value: string): Color;
/**
 * Normalizes a value to a Color object.
 * If already a Color, returns it. If a string, parses it.
 */
declare function normalizeColor(value: string | Color): Color;
/**
 * Checks if a string is a valid color.
 */
declare function isValidColor(value: string): boolean;
//# sourceMappingURL=parse.d.ts.map
//#endregion
//#region src/ColorArea/ColorAreaRoot.vue.d.ts
interface ColorAreaRootProps extends PrimitiveProps, FormFieldProps {
  /** The color value (controlled). Can be a hex string or Color object. */
  modelValue?: string | Color;
  /** The default color value (uncontrolled). */
  defaultValue?: string | Color;
  /** The color space to operate in. */
  colorSpace?: ColorSpace;
  /** Color channel for the horizontal (x) axis. */
  xChannel?: ColorChannel;
  /** Color channel for the vertical (y) axis. */
  yChannel?: ColorChannel;
  /** When `true`, prevents the user from interacting with the area. */
  disabled?: boolean;
  /** The name of the x channel input element for form submission. */
  xName?: string;
  /** The name of the y channel input element for form submission. */
  yName?: string;
}
type ColorAreaRootEmits = {
  'update:modelValue': [value: string];
  'update:color': [value: Color];
  'change': [value: string];
  'changeEnd': [value: string];
};
interface ColorAreaRootContext {
  color: Ref<Color>;
  xValue: Ref<number>;
  yValue: Ref<number>;
  xChannel: Ref<ColorChannel>;
  yChannel: Ref<ColorChannel>;
  colorSpace: Ref<ColorSpace>;
  disabled: Ref<boolean>;
  xRange: ComputedRef<{
    min: number;
    max: number;
    step: number;
  }>;
  yRange: ComputedRef<{
    min: number;
    max: number;
    step: number;
  }>;
  thumbRef: Ref<HTMLElement | undefined>;
  updateValues: (x: number, y: number) => void;
  commitValues: () => void;
}
declare const injectColorAreaRootContext: <T extends ColorAreaRootContext | null | undefined = ColorAreaRootContext>(fallback?: T | undefined) => T extends null ? ColorAreaRootContext | null : ColorAreaRootContext, provideColorAreaRootContext: (contextValue: ColorAreaRootContext) => ColorAreaRootContext;
declare const _default$305: __VLS_WithSlots$295<vue33.DefineComponent<ColorAreaRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  change: (value: string) => any;
  "update:modelValue": (value: string) => any;
  "update:color": (value: Color) => any;
  changeEnd: (value: string) => any;
}, string, vue33.PublicProps, Readonly<ColorAreaRootProps> & Readonly<{
  onChange?: ((value: string) => any) | undefined;
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
  "onUpdate:color"?: ((value: Color) => any) | undefined;
  onChangeEnd?: ((value: string) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: string | Color;
  colorSpace: ColorSpace;
  xChannel: ColorChannel;
  yChannel: ColorChannel;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** CSS styles for the color area background gradient */
    style: CSSProperties;
  }) => any;
}>;
type __VLS_WithSlots$295<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorAreaRoot.vue.d.ts.map
//#endregion
//#region src/ColorArea/ColorAreaThumb.vue.d.ts
interface ColorAreaThumbProps extends PrimitiveProps {}
declare const _default$304: __VLS_WithSlots$294<vue33.DefineComponent<ColorAreaThumbProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorAreaThumbProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$294<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorAreaThumb.vue.d.ts.map
//#endregion
//#region src/ColorField/ColorFieldInput.vue.d.ts
interface ColorFieldInputProps extends PrimitiveProps {}
declare const _default$303: __VLS_WithSlots$293<vue33.DefineComponent<ColorFieldInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorFieldInputProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$293<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorFieldInput.vue.d.ts.map
//#endregion
//#region src/ColorField/ColorFieldRoot.vue.d.ts
interface ColorFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The color value (controlled). Can be a hex string or Color object. */
  modelValue?: string | Color;
  /** The default color value (uncontrolled). */
  defaultValue?: string | Color;
  /** The color space to operate in when displaying a channel. */
  colorSpace?: ColorSpace;
  /** The color channel to display. If not provided, displays hex value. */
  channel?: ColorChannel;
  /** Placeholder text when the field is empty. */
  placeholder?: string;
  /** When `true`, prevents the user from interacting with the field. */
  disabled?: boolean;
  /** When `true`, the field is read-only. */
  readonly?: boolean;
  /** When `true`, prevents the value from changing on wheel scroll. */
  disableWheelChange?: boolean;
  /** The locale to use for number formatting. */
  locale?: string;
  /** Custom step value for increment/decrement. Defaults to channel step or 1 for hex. */
  step?: number;
}
type ColorFieldRootEmits = {
  'update:modelValue': [value: string];
  'update:color': [value: Color];
};
interface ColorFieldRootContext {
  color: Ref<Color>;
  inputValue: Ref<string>;
  channel: Ref<ColorChannel | undefined>;
  colorSpace: Ref<ColorSpace>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  disableWheelChange: Ref<boolean>;
  placeholder: Ref<string | undefined>;
  updateValue: (value: string) => void;
  commit: () => void;
  increment: () => void;
  decrement: () => void;
  incrementToMax: () => void;
  decrementToMin: () => void;
  incrementPage: () => void;
  decrementPage: () => void;
  handleWheel: (event: WheelEvent) => void;
}
declare const injectColorFieldRootContext: <T extends ColorFieldRootContext | null | undefined = ColorFieldRootContext>(fallback?: T | undefined) => T extends null ? ColorFieldRootContext | null : ColorFieldRootContext, provideColorFieldRootContext: (contextValue: ColorFieldRootContext) => ColorFieldRootContext;
declare const _default$302: __VLS_WithSlots$292<vue33.DefineComponent<ColorFieldRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: string) => any;
  "update:color": (value: Color) => any;
}, string, vue33.PublicProps, Readonly<ColorFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
  "onUpdate:color"?: ((value: Color) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: string | Color;
  colorSpace: ColorSpace;
  readonly: boolean;
  disableWheelChange: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$292<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorFieldRoot.vue.d.ts.map
//#endregion
//#region src/ColorSlider/ColorSliderRoot.vue.d.ts
interface ColorSliderRootProps extends PrimitiveProps, FormFieldProps {
  /** The color value (controlled). Can be a hex string or Color object. */
  modelValue?: string | Color;
  /** The default color value (uncontrolled). */
  defaultValue?: string | Color;
  /** The color space to operate in. */
  colorSpace?: ColorSpace;
  /** The color channel that this slider manipulates. */
  channel: ColorChannel;
  /** The orientation of the slider. */
  orientation?: DataOrientation;
  /** The reading direction of the slider. */
  dir?: Direction;
  /** Whether the slider is visually inverted. */
  inverted?: boolean;
  /** When `true`, prevents the user from interacting with the slider. */
  disabled?: boolean;
  /** Custom step value for increment/decrement. Defaults to the channel's natural step. */
  step?: number;
}
type ColorSliderRootEmits = {
  'update:modelValue': [value: string | Color];
  'update:color': [value: Color];
  'change': [value: string];
  'changeEnd': [value: string];
};
interface ColorSliderRootContext {
  color: Ref<Color>;
  channelValue: ComputedRef<number>;
  channel: Ref<ColorChannel>;
  colorSpace: Ref<ColorSpace>;
  orientation: Ref<DataOrientation>;
  disabled: Ref<boolean>;
  inverted: Ref<boolean>;
  min: ComputedRef<number>;
  max: ComputedRef<number>;
  step: ComputedRef<number>;
}
declare const injectColorSliderRootContext: <T extends ColorSliderRootContext | null | undefined = ColorSliderRootContext>(fallback?: T | undefined) => T extends null ? ColorSliderRootContext | null : ColorSliderRootContext, provideColorSliderRootContext: (contextValue: ColorSliderRootContext) => ColorSliderRootContext;
declare const _default$301: __VLS_WithSlots$291<vue33.DefineComponent<ColorSliderRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  change: (value: string) => any;
  "update:modelValue": (value: string | Color) => any;
  "update:color": (value: Color) => any;
  changeEnd: (value: string) => any;
}, string, vue33.PublicProps, Readonly<ColorSliderRootProps> & Readonly<{
  onChange?: ((value: string) => any) | undefined;
  "onUpdate:modelValue"?: ((value: string | Color) => any) | undefined;
  "onUpdate:color"?: ((value: Color) => any) | undefined;
  onChangeEnd?: ((value: string) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  orientation: DataOrientation;
  defaultValue: string | Color;
  colorSpace: ColorSpace;
  inverted: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$291<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorSliderRoot.vue.d.ts.map
//#endregion
//#region src/ColorSlider/ColorSliderThumb.vue.d.ts
interface ColorSliderThumbProps extends PrimitiveProps {}
declare const _default$300: __VLS_WithSlots$290<vue33.DefineComponent<ColorSliderThumbProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorSliderThumbProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The display name of the current channel */
    channelName: string;
    /** The current numeric value of the channel */
    channelValue: number;
  }) => any;
}>;
type __VLS_WithSlots$290<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorSliderThumb.vue.d.ts.map
//#endregion
//#region src/ColorSlider/ColorSliderTrack.vue.d.ts
interface ColorSliderTrackProps extends PrimitiveProps {}
declare const _default$299: __VLS_WithSlots$289<vue33.DefineComponent<ColorSliderTrackProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorSliderTrackProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$289<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorSliderTrack.vue.d.ts.map
//#endregion
//#region src/ColorSwatch/ColorSwatch.vue.d.ts
interface ColorSwatchProps extends PrimitiveProps {
  /**
   * The color to display in the swatch as a hex string or Color object.
   * Example: `#16a372`, `#ff5733`, or `{ space: 'hsl', h: 120, s: 100, l: 50, alpha: 1 }`.
   */
  color?: string | Color;
  /**
   * Optional accessible label for the color. If omitted, the color name will be derived from the color value.
   */
  label?: string;
}
declare const _default$298: __VLS_WithSlots$288<vue33.DefineComponent<ColorSwatchProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorSwatchProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  color: string | Color;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    color: string;
    alpha: number;
  }) => any;
}>;
type __VLS_WithSlots$288<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorSwatch.vue.d.ts.map
//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerItem.vue.d.ts
interface ColorSwatchPickerItemProps extends ListboxItemProps {
  /**
   * The color to display in the swatch as a hex string.
   * Example: `#16a372` or `#ff5733`.
   */
  value: string;
}
declare const _default$297: __VLS_WithSlots$287<vue33.DefineComponent<ColorSwatchPickerItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: SelectEvent$3<AcceptableValue>) => any;
}, string, vue33.PublicProps, Readonly<ColorSwatchPickerItemProps> & Readonly<{
  onSelect?: ((event: SelectEvent$3<AcceptableValue>) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$287<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorSwatchPickerItem.vue.d.ts.map
//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerItemIndicator.vue.d.ts
interface ColorSwatchPickerItemIndicatorProps extends ListboxItemIndicatorProps {}
declare const _default$296: __VLS_WithSlots$286<vue33.DefineComponent<ColorSwatchPickerItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorSwatchPickerItemIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$286<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorSwatchPickerItemIndicator.vue.d.ts.map
//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerItemSwatch.vue.d.ts
interface ColorSwatchPickerItemSwatchProps extends Omit<ColorSwatchProps, 'color'> {}
declare const _default$295: vue33.DefineComponent<ColorSwatchPickerItemSwatchProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ColorSwatchPickerItemSwatchProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>;
//#endregion
//#region src/ColorSwatchPicker/ColorSwatchPickerRoot.vue.d.ts
interface ColorSwatchPickerRootProps extends Omit<ListboxRootProps, 'by'> {
  defaultValue?: string | string[];
  modelValue?: string | string[];
}
type ColorSwatchPickerRootEmits = ListboxRootEmits;
declare const _default$294: __VLS_WithSlots$285<vue33.DefineComponent<ColorSwatchPickerRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: AcceptableValue) => any;
  entryFocus: (event: CustomEvent<any>) => any;
  highlight: (payload: {
    ref: HTMLElement;
    value: AcceptableValue;
  } | undefined) => any;
  leave: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<ColorSwatchPickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: AcceptableValue) => any) | undefined;
  onEntryFocus?: ((event: CustomEvent<any>) => any) | undefined;
  onHighlight?: ((payload: {
    ref: HTMLElement;
    value: AcceptableValue;
  } | undefined) => any) | undefined;
  onLeave?: ((event: Event) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  dir: Direction;
  orientation: DataOrientation;
  defaultValue: string | string[];
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: string | string[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$285<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ColorSwatchPickerRoot.vue.d.ts.map
//#endregion
//#region src/ConfigProvider/ConfigProvider.vue.d.ts
interface ConfigProviderContextValue {
  dir?: Ref<Direction>;
  locale?: Ref<string>;
  scrollBody?: Ref<boolean | ScrollBodyOption>;
  nonce?: Ref<string | undefined>;
  useId?: () => string;
}
declare const injectConfigProviderContext: <T extends ConfigProviderContextValue | null | undefined = ConfigProviderContextValue>(fallback?: T | undefined) => T extends null ? ConfigProviderContextValue | null : ConfigProviderContextValue, provideConfigProviderContext: (contextValue: ConfigProviderContextValue) => ConfigProviderContextValue;
interface ConfigProviderProps {
  /**
   * The global reading direction of your application. This will be inherited by all primitives.
   * @defaultValue 'ltr'
   */
  dir?: Direction;
  /**
   * The global locale of your application. This will be inherited by all primitives.
   * @defaultValue 'en'
   */
  locale?: string;
  /**
   * The global scroll body behavior of your application. This will be inherited by the related primitives.
   * @type boolean | ScrollBodyOption
   */
  scrollBody?: boolean | ScrollBodyOption;
  /**
   * The global `nonce` value of your application. This will be inherited by the related primitives.
   * @type string
   */
  nonce?: string;
  /**
   * The global `useId` injection as a workaround for preventing hydration issue.
   */
  useId?: () => string;
}
declare const _default$293: __VLS_WithSlots$284<vue33.DefineComponent<ConfigProviderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ConfigProviderProps> & Readonly<{}>, {
  useId: () => string;
  dir: Direction;
  nonce: string;
  locale: string;
  scrollBody: boolean | ScrollBodyOption;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$284<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ConfigProvider.vue.d.ts.map
//#endregion
//#region src/Menu/MenuArrow.vue.d.ts
interface MenuArrowProps extends PopperArrowProps {}
declare const _default$292: __VLS_WithSlots$283<vue33.DefineComponent<MenuArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenuArrowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$283<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuArrow.vue.d.ts.map
//#endregion
//#region src/Menu/MenuItemImpl.vue.d.ts
interface MenuItemImplProps extends PrimitiveProps {
  /** When `true`, prevents the user from interacting with the item. */
  disabled?: boolean;
  /**
   * Optional text used for typeahead purposes. By default the typeahead behavior will use the `.textContent` of the item. <br>
   *  Use this when the content is complex, or you have non-textual content inside.
   */
  textValue?: string;
}
//#endregion
//#region src/Menu/MenuItem.vue.d.ts
type MenuItemEmits = {
  /**
   * Event handler called when the user selects an item (via mouse or keyboard). <br>
   *  Calling `event.preventDefault` in this handler will prevent the menu from closing when selecting that item.
   */
  select: [event: Event];
};
interface MenuItemProps extends MenuItemImplProps {}
declare const _default$291: __VLS_WithSlots$282<vue33.DefineComponent<MenuItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenuItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$282<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuItem.vue.d.ts.map
//#endregion
//#region src/Menu/utils.d.ts
type CheckedState = boolean | 'indeterminate';
type Direction$4 = 'ltr' | 'rtl';
//#endregion
//#region src/Menu/MenuCheckboxItem.vue.d.ts
type MenuCheckboxItemEmits = MenuItemEmits & {
  /** Event handler called when the checked state changes. */
  'update:modelValue': [payload: boolean];
};
interface MenuCheckboxItemProps extends MenuItemProps {
  /** The controlled checked state of the item. Can be used as `v-model`. */
  modelValue?: CheckedState;
}
declare const _default$290: __VLS_WithSlots$281<vue33.DefineComponent<MenuCheckboxItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
  "update:modelValue": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<MenuCheckboxItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {
  modelValue: CheckedState;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current modelValue state */
    modelValue: CheckedState;
  }) => any;
}>;
type __VLS_WithSlots$281<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuCheckboxItem.vue.d.ts.map
//#endregion
//#region src/FocusScope/FocusScope.vue.d.ts
type FocusScopeEmits = {
  /**
   * Event handler called when auto-focusing on mount.
   * Can be prevented.
   */
  mountAutoFocus: [event: Event];
  /**
   * Event handler called when auto-focusing on unmount.
   * Can be prevented.
   */
  unmountAutoFocus: [event: Event];
};
interface FocusScopeProps extends PrimitiveProps {
  /**
   * When `true`, tabbing from last item will focus first tabbable
   * and shift+tab from first item will focus last tababble.
   * @defaultValue false
   */
  loop?: boolean;
  /**
   * When `true`, focus cannot escape the focus scope via keyboard,
   * pointer, or a programmatic focus.
   * @defaultValue false
   */
  trapped?: boolean;
}
declare const _default$289: __VLS_WithSlots$280<vue33.DefineComponent<FocusScopeProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  mountAutoFocus: (event: Event) => any;
  unmountAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<FocusScopeProps> & Readonly<{
  onMountAutoFocus?: ((event: Event) => any) | undefined;
  onUnmountAutoFocus?: ((event: Event) => any) | undefined;
}>, {
  loop: boolean;
  trapped: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$280<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=FocusScope.vue.d.ts.map
//#endregion
//#region src/Menu/MenuContentImpl.vue.d.ts
interface MenuContentImplPrivateProps {
  /**
   * When `true`, hover/focus/click interactions will be disabled on elements outside
   * the `DismissableLayer`. Users will need to click twice on outside elements to
   * interact with them: once to close the `DismissableLayer`, and again to trigger the element.
   */
  disableOutsidePointerEvents?: DismissableLayerProps['disableOutsidePointerEvents'];
  /**
   * Whether scrolling outside the `MenuContent` should be prevented
   * @defaultValue false
   */
  disableOutsideScroll?: boolean;
  /**
   * Whether focus should be trapped within the `MenuContent`
   * @defaultValue also
   */
  trapFocus?: FocusScopeProps['trapped'];
}
type MenuContentImplEmits = DismissableLayerEmits & Omit<RovingFocusGroupEmits, 'update:currentTabStopId'> & {
  openAutoFocus: [event: Event];
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  closeAutoFocus: [event: Event];
};
interface MenuContentImplProps extends MenuContentImplPrivateProps, Omit<PopperContentProps, 'dir'> {
  /**
   * When `true`, keyboard navigation will loop from last item to first, and vice versa.
   * @defaultValue false
   */
  loop?: boolean;
}
interface MenuRootContentTypeProps extends Omit<MenuContentImplProps, 'disableOutsidePointerEvents' | 'disableOutsideScroll' | 'trapFocus'> {}
//#endregion
//#region src/Menu/MenuContent.vue.d.ts
type MenuContentEmits = Omit<MenuContentImplEmits, 'entryFocus' | 'openAutoFocus'>;
interface MenuContentProps extends MenuRootContentTypeProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$288: __VLS_WithSlots$279<vue33.DefineComponent<MenuContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenuContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$279<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuContent.vue.d.ts.map
//#endregion
//#region src/Menu/MenuGroup.vue.d.ts
interface MenuGroupProps extends PrimitiveProps {}
declare const _default$287: __VLS_WithSlots$278<vue33.DefineComponent<MenuGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenuGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$278<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuGroup.vue.d.ts.map
//#endregion
//#region src/Menu/MenuItemIndicator.vue.d.ts
interface MenuItemIndicatorProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$286: __VLS_WithSlots$277<vue33.DefineComponent<MenuItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenuItemIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$277<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuItemIndicator.vue.d.ts.map
//#endregion
//#region src/Menu/MenuLabel.vue.d.ts
interface MenuLabelProps extends PrimitiveProps {}
declare const _default$285: __VLS_WithSlots$276<vue33.DefineComponent<MenuLabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenuLabelProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$276<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuLabel.vue.d.ts.map
//#endregion
//#region src/Menu/MenuPortal.vue.d.ts
interface MenuPortalProps extends TeleportProps {}
declare const _default$284: __VLS_WithSlots$275<vue33.DefineComponent<MenuPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenuPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$275<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuPortal.vue.d.ts.map
//#endregion
//#region src/Menu/MenuRadioGroup.vue.d.ts
interface MenuRadioGroupProps extends MenuGroupProps {
  /** The value of the selected item in the group. */
  modelValue?: AcceptableValue;
}
type MenuRadioGroupEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [payload: AcceptableValue];
};
declare const _default$283: __VLS_WithSlots$274<vue33.DefineComponent<MenuRadioGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue) => any;
}, string, vue33.PublicProps, Readonly<MenuRadioGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue) => any) | undefined;
}>, {
  modelValue: AcceptableValue;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: AcceptableValue;
  }) => any;
}>;
type __VLS_WithSlots$274<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuRadioGroup.vue.d.ts.map
//#endregion
//#region src/Menu/MenuRadioItem.vue.d.ts
type MenuRadioItemEmits = MenuItemEmits;
interface MenuRadioItemProps extends MenuItemProps {
  /** The unique value of the item. */
  value: AcceptableValue;
}
declare const _default$282: __VLS_WithSlots$273<vue33.DefineComponent<MenuRadioItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenuRadioItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$273<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuRadioItem.vue.d.ts.map
//#endregion
//#region src/Menu/MenuRoot.vue.d.ts
interface MenuContext {
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  content: Ref<HTMLElement | undefined>;
  onContentChange: (content: HTMLElement | undefined) => void;
}
interface MenuRootContext {
  onClose: () => void;
  dir: Ref<Direction$4>;
  isUsingKeyboardRef: Ref<boolean>;
  modal: Ref<boolean>;
}
interface MenuProps {
  /** The controlled open state of the menu. Can be used as `v-model:open`. */
  open?: boolean;
  /**
   * The reading direction of the combobox when applicable.
   *
   * If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction$4;
  /**
   * The modality of the dropdown menu.
   *
   * When set to `true`, interaction with outside elements will be disabled and only menu content will be visible to screen readers.
   */
  modal?: boolean;
}
type MenuEmits = {
  'update:open': [payload: boolean];
};
declare const injectMenuContext: <T extends MenuContext | null | undefined = MenuContext>(fallback?: T | undefined) => T extends null ? MenuContext | null : MenuContext, provideMenuContext: (contextValue: MenuContext) => MenuContext;
declare const injectMenuRootContext: <T extends MenuRootContext | null | undefined = MenuRootContext>(fallback?: T | undefined) => T extends null ? MenuRootContext | null : MenuRootContext, provideMenuRootContext: (contextValue: MenuRootContext) => MenuRootContext;
declare const _default$281: __VLS_WithSlots$272<vue33.DefineComponent<MenuProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<MenuProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
  modal: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$272<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuRoot.vue.d.ts.map
//#endregion
//#region src/Menu/MenuSeparator.vue.d.ts
interface MenuSeparatorProps extends PrimitiveProps {}
declare const _default$280: __VLS_WithSlots$271<vue33.DefineComponent<MenuSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenuSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$271<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuSeparator.vue.d.ts.map
//#endregion
//#region src/Menu/MenuSub.vue.d.ts
interface MenuSubProps {
  /** The controlled open state of the menu. Can be used as `v-model:open`. */
  open?: boolean;
}
type MenuSubEmits = {
  /** Event handler called when the open state of the submenu changes. */
  'update:open': [payload: boolean];
};
declare const _default$279: __VLS_WithSlots$270<vue33.DefineComponent<MenuSubProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<MenuSubProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$270<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuSub.vue.d.ts.map
//#endregion
//#region src/Menu/MenuSubContent.vue.d.ts
type MenuSubContentEmits = MenuContentImplEmits;
interface MenuSubContentProps extends Omit<MenuContentImplProps, 'disableOutsidePointerEvents' | 'disableOutsideScroll' | 'trapFocus' | 'side' | 'align'> {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$278: __VLS_WithSlots$269<vue33.DefineComponent<MenuSubContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenuSubContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {
  prioritizePosition: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$269<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuSubContent.vue.d.ts.map
//#endregion
//#region src/Menu/MenuSubTrigger.vue.d.ts
interface MenuSubTriggerProps extends MenuItemImplProps {}
declare const _default$277: __VLS_WithSlots$268<vue33.DefineComponent<MenuSubTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenuSubTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$268<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenuSubTrigger.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuArrow.vue.d.ts
interface ContextMenuArrowProps extends MenuArrowProps {}
declare const _default$276: __VLS_WithSlots$267<vue33.DefineComponent<ContextMenuArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$267<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuArrow.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuCheckboxItem.vue.d.ts
type ContextMenuCheckboxItemEmits = MenuCheckboxItemEmits;
interface ContextMenuCheckboxItemProps extends MenuCheckboxItemProps {}
declare const _default$275: __VLS_WithSlots$266<vue33.DefineComponent<ContextMenuCheckboxItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
  "update:modelValue": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<ContextMenuCheckboxItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$266<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuCheckboxItem.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuContent.vue.d.ts
type ContextMenuContentEmits = MenuContentEmits;
interface ContextMenuContentProps extends Omit<MenuContentProps, 'side' | 'sideOffset' | 'align' | 'arrowPadding' | 'updatePositionStrategy'> {}
declare const _default$274: __VLS_WithSlots$265<vue33.DefineComponent<ContextMenuContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<ContextMenuContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {
  alignOffset: number;
  avoidCollisions: boolean;
  collisionBoundary: Element | null | Array<Element | null>;
  collisionPadding: number | Partial<Record<Side, number>>;
  sticky: "partial" | "always";
  hideWhenDetached: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$265<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuContent.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuGroup.vue.d.ts
interface ContextMenuGroupProps extends MenuGroupProps {}
declare const _default$273: __VLS_WithSlots$264<vue33.DefineComponent<ContextMenuGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$264<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuGroup.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuItem.vue.d.ts
type ContextMenuItemEmits = MenuItemEmits;
interface ContextMenuItemProps extends MenuItemProps {}
declare const _default$272: __VLS_WithSlots$263<vue33.DefineComponent<MenuItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenuItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$263<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuItem.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuItemIndicator.vue.d.ts
interface ContextMenuItemIndicatorProps extends MenuItemIndicatorProps {}
declare const _default$271: __VLS_WithSlots$262<vue33.DefineComponent<ContextMenuItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuItemIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$262<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuItemIndicator.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuLabel.vue.d.ts
interface ContextMenuLabelProps extends MenuLabelProps {}
declare const _default$270: __VLS_WithSlots$261<vue33.DefineComponent<ContextMenuLabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuLabelProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$261<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuLabel.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuPortal.vue.d.ts
interface ContextMenuPortalProps extends MenuPortalProps {}
declare var __VLS_6: {};
type __VLS_Slots = {} & {
  default?: (props: typeof __VLS_6) => any;
};
declare const __VLS_component: vue33.DefineComponent<ContextMenuPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>;
declare const _default$269: __VLS_WithSlots$260<typeof __VLS_component, __VLS_Slots>;
type __VLS_WithSlots$260<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuPortal.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuRadioGroup.vue.d.ts
type ContextMenuRadioGroupEmits = MenuRadioGroupEmits;
interface ContextMenuRadioGroupProps extends MenuRadioGroupProps {}
declare const _default$268: __VLS_WithSlots$259<vue33.DefineComponent<ContextMenuRadioGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue) => any;
}, string, vue33.PublicProps, Readonly<ContextMenuRadioGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$259<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuRadioGroup.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuRadioItem.vue.d.ts
type ContextMenuRadioItemEmits = MenuItemEmits;
interface ContextMenuRadioItemProps extends MenuRadioItemProps {}
declare const _default$267: __VLS_WithSlots$258<vue33.DefineComponent<ContextMenuRadioItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<ContextMenuRadioItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$258<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuRadioItem.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuRoot.vue.d.ts
type ContextMenuRootContext = {
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  modal: Ref<boolean>;
  dir: Ref<Direction>;
  triggerElement: Ref<HTMLElement | undefined>;
  pressOpenDelay: Ref<number>;
};
interface ContextMenuRootProps extends Omit<MenuProps, 'open'> {
  /**
   * The duration from when the trigger is pressed until the menu opens.
   *
   * @defaultValue 700
   */
  pressOpenDelay?: number;
}
type ContextMenuRootEmits = MenuEmits;
declare const injectContextMenuRootContext: <T extends ContextMenuRootContext | null | undefined = ContextMenuRootContext>(fallback?: T | undefined) => T extends null ? ContextMenuRootContext | null : ContextMenuRootContext, provideContextMenuRootContext: (contextValue: ContextMenuRootContext) => ContextMenuRootContext;
declare const _default$266: __VLS_WithSlots$257<vue33.DefineComponent<ContextMenuRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<ContextMenuRootProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  modal: boolean;
  pressOpenDelay: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$257<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuRoot.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuSeparator.vue.d.ts
interface ContextMenuSeparatorProps extends MenuSeparatorProps {}
declare const _default$265: __VLS_WithSlots$256<vue33.DefineComponent<ContextMenuSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$256<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuSeparator.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuSub.vue.d.ts
type ContextMenuSubEmits = MenuSubEmits;
interface ContextMenuSubProps extends MenuSubProps {
  /** The open state of the submenu when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
}
declare const _default$264: __VLS_WithSlots$255<vue33.DefineComponent<ContextMenuSubProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<ContextMenuSubProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$255<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuSub.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuSubContent.vue.d.ts
type ContextMenuSubContentEmits = MenuSubContentEmits;
interface ContextMenuSubContentProps extends MenuSubContentProps {}
declare const _default$263: __VLS_WithSlots$254<vue33.DefineComponent<ContextMenuSubContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<ContextMenuSubContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$254<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuSubContent.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuSubTrigger.vue.d.ts
interface ContextMenuSubTriggerProps extends MenuSubTriggerProps {}
declare const _default$262: __VLS_WithSlots$253<vue33.DefineComponent<ContextMenuSubTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuSubTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$253<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuSubTrigger.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuTrigger.vue.d.ts
interface ContextMenuTriggerProps extends PrimitiveProps {
  /**
   * When `true`, the context menu would not open when right-clicking.
   *
   * Note that this will also restore the native context menu.
   */
  disabled?: boolean;
}
declare const _default$261: __VLS_WithSlots$252<vue33.DefineComponent<ContextMenuTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ContextMenuTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$252<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuTrigger.vue.d.ts.map
//#endregion
//#region src/DateField/DateFieldInput.vue.d.ts
interface DateFieldInputProps extends PrimitiveProps {
  /** The part of the date to render */
  part: SegmentPart;
}
declare const _default$260: __VLS_WithSlots$251<vue33.DefineComponent<DateFieldInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateFieldInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$251<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateFieldInput.vue.d.ts.map
//#endregion
//#region src/DateField/DateFieldRoot.vue.d.ts
type DateFieldRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue | undefined>;
  placeholder: Ref<DateValue>;
  isDateUnavailable?: Matcher;
  isInvalid: Ref<boolean>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  formatter: Formatter;
  hourCycle: HourCycle;
  step: Ref<DateStep>;
  segmentValues: Ref<SegmentValueObj>;
  segmentContents: Ref<{
    part: SegmentPart;
    value: string;
  }[]>;
  elements: Ref<Set<HTMLElement>>;
  focusNext: () => void;
  setFocusedElement: (el: HTMLElement) => void;
};
interface DateFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the calendar */
  defaultValue?: DateValue;
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue;
  /** The controlled value of the field. Can be bound as `v-model`. */
  modelValue?: DateValue | null;
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle;
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep;
  /** The granularity to use for formatting times. Defaults to day if a CalendarDate is provided, otherwise defaults to minute. The field will render segments for each part of the date up to and including the specified granularity */
  granularity?: Granularity;
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** Whether or not the date field is disabled */
  disabled?: boolean;
  /** Whether or not the date field is readonly */
  readonly?: boolean;
  /** A function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher;
  /** Id of the element */
  id?: string;
  /** The reading direction of the date field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
}
type DateFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
};
declare const injectDateFieldRootContext: <T extends DateFieldRootContext | null | undefined = DateFieldRootContext>(fallback?: T | undefined) => T extends null ? DateFieldRootContext | null : DateFieldRootContext, provideDateFieldRootContext: (contextValue: DateFieldRootContext) => DateFieldRootContext;
declare const _default$240: __VLS_WithSlots$250<vue33.DefineComponent<DateFieldRootProps, {
  /** Helper to set the focused element inside the DateField */
  setFocusedElement: (el: HTMLElement) => void;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue | undefined) => any;
  "update:placeholder": (date: DateValue) => any;
}, string, vue33.PublicProps, Readonly<DateFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
}>, {
  disabled: boolean;
  defaultValue: DateValue;
  placeholder: DateValue;
  readonly: boolean;
  isDateUnavailable: Matcher;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the field */
    modelValue: DateValue | undefined;
    /** The date field segment contents */
    segments: {
      part: SegmentPart;
      value: string;
    }[];
    /** Value if the input is invalid */
    isInvalid: boolean;
  }) => any;
}>;
type __VLS_WithSlots$250<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateFieldRoot.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerAnchor.vue.d.ts
interface DatePickerAnchorProps extends PopoverAnchorProps {}
declare const _default$259: __VLS_WithSlots$249<vue33.DefineComponent<DatePickerAnchorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$249<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerAnchor.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerArrow.vue.d.ts
interface DatePickerArrowProps extends PopoverArrowProps {}
declare const _default$258: __VLS_WithSlots$248<vue33.DefineComponent<DatePickerArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerArrowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$248<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerArrow.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerCalendar.vue.d.ts
declare const _default$257: __VLS_WithSlots$247<vue33.DefineComponent<{}, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, true, {}, any>, {
  default?: (props: {
    date: DateValue;
    grid: Grid<DateValue>[];
    weekDays: string[];
    weekStartsOn: WeekStartsOn;
    locale: string;
    fixedWeeks: boolean;
  }) => any;
}>;
type __VLS_WithSlots$247<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerCalendar.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerCell.vue.d.ts
interface DatePickerCellProps extends CalendarCellProps {}
declare const _default$256: __VLS_WithSlots$246<vue33.DefineComponent<DatePickerCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$246<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerCell.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerCellTrigger.vue.d.ts
interface DatePickerCellTriggerProps extends CalendarCellTriggerProps {}
declare const _default$255: __VLS_WithSlots$245<vue33.DefineComponent<DatePickerCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerCellTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, CalendarCellTriggerSlot>;
type __VLS_WithSlots$245<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerClose.vue.d.ts
interface DatePickerCloseProps extends PopoverCloseProps {}
declare const _default$254: __VLS_WithSlots$244<vue33.DefineComponent<DatePickerCloseProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerCloseProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$244<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerClose.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerContent.vue.d.ts
interface DatePickerContentProps extends PopoverContentProps {
  /**
   * Props to control the portal wrapped around the content.
   */
  portal?: PopoverPortalProps;
}
interface DatePickerContentEmits extends PopoverContentEmits {}
declare const _default$253: __VLS_WithSlots$243<vue33.DefineComponent<DatePickerContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<DatePickerContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$243<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerContent.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerField.vue.d.ts
declare const _default$252: __VLS_WithSlots$242<vue33.DefineComponent<{}, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, true, {}, any>, {
  default?: (props: {
    segments: {
      part: SegmentPart;
      value: string;
    }[];
    modelValue: DateValue | undefined;
  }) => any;
}>;
type __VLS_WithSlots$242<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerField.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGrid.vue.d.ts
interface DatePickerGridProps extends CalendarGridProps {}
declare const _default$251: __VLS_WithSlots$241<vue33.DefineComponent<DatePickerGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerGridProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$241<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGrid.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGridBody.vue.d.ts
interface DatePickerGridBodyProps extends CalendarGridBodyProps {}
declare const _default$250: __VLS_WithSlots$240<vue33.DefineComponent<DatePickerGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerGridBodyProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$240<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGridBody.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGridHead.vue.d.ts
interface DatePickerGridHeadProps extends CalendarGridHeadProps {}
declare const _default$249: __VLS_WithSlots$239<vue33.DefineComponent<DatePickerGridHeadProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerGridHeadProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$239<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGridHead.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGridRow.vue.d.ts
interface DatePickerGridRowProps extends CalendarGridRowProps {}
declare const _default$248: __VLS_WithSlots$238<vue33.DefineComponent<DatePickerGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerGridRowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$238<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGridRow.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerHeadCell.vue.d.ts
interface DatePickerHeadCellProps extends CalendarHeadCellProps {}
declare const _default$247: __VLS_WithSlots$237<vue33.DefineComponent<DatePickerHeadCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerHeadCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$237<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerHeadCell.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerHeader.vue.d.ts
interface DatePickerHeaderProps extends CalendarHeaderProps {}
declare const _default$246: __VLS_WithSlots$236<vue33.DefineComponent<DatePickerHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerHeaderProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$236<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerHeader.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerHeading.vue.d.ts
interface DatePickerHeadingProps extends CalendarHeadingProps {}
declare const _default$245: __VLS_WithSlots$235<vue33.DefineComponent<DatePickerHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerHeadingProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$235<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerHeading.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerInput.vue.d.ts
interface DatePickerInputProps extends DateFieldInputProps {}
declare const _default$244: __VLS_WithSlots$234<vue33.DefineComponent<DatePickerInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$234<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerInput.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerNext.vue.d.ts
interface DatePickerNextProps extends CalendarNextProps {}
declare const _default$243: __VLS_WithSlots$233<vue33.DefineComponent<DatePickerNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerNextProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, CalendarNextSlot>;
type __VLS_WithSlots$233<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerNext.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerPrev.vue.d.ts
interface DatePickerPrevProps extends CalendarPrevProps {}
declare const _default$242: __VLS_WithSlots$232<vue33.DefineComponent<DatePickerPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerPrevProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, CalendarPrevSlot>;
type __VLS_WithSlots$232<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerPrev.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerRoot.vue.d.ts
type DatePickerRootContext = {
  id: Ref<string | undefined>;
  name: Ref<string | undefined>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
  hourCycle: Ref<HourCycle | undefined>;
  granularity: Ref<Granularity | undefined>;
  hideTimeZone: Ref<boolean>;
  required: Ref<boolean>;
  locale: Ref<string>;
  dateFieldRef: Ref<InstanceType<typeof _default$240> | undefined>;
  modelValue: Ref<DateValue | undefined>;
  placeholder: Ref<DateValue>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  weekStartsOn: Ref<WeekStartsOn>;
  weekdayFormat: Ref<WeekDayFormat>;
  fixedWeeks: Ref<boolean>;
  numberOfMonths: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  isDateDisabled?: Matcher;
  isDateUnavailable?: Matcher;
  defaultOpen: Ref<boolean>;
  open: Ref<boolean>;
  modal: Ref<boolean>;
  onDateChange: (date: DateValue | undefined) => void;
  onPlaceholderChange: (date: DateValue) => void;
  dir: Ref<Direction>;
  step: Ref<DateStep | undefined>;
  closeOnSelect: Ref<boolean>;
};
type DatePickerRootProps = Omit<DateFieldRootProps, 'as' | 'asChild'> & PopoverRootProps & Pick<CalendarRootProps, 'isDateDisabled' | 'pagedNavigation' | 'weekStartsOn' | 'weekdayFormat' | 'fixedWeeks' | 'numberOfMonths' | 'preventDeselect'> & {
  /** Whether or not to close the popover on date select */
  closeOnSelect?: boolean;
};
type DatePickerRootEmits = PopoverRootEmits & {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
};
declare const injectDatePickerRootContext: <T extends DatePickerRootContext | null | undefined = DatePickerRootContext>(fallback?: T | undefined) => T extends null ? DatePickerRootContext | null : DatePickerRootContext, provideDatePickerRootContext: (contextValue: DatePickerRootContext) => DatePickerRootContext;
declare const _default$241: __VLS_WithSlots$231<vue33.DefineComponent<DatePickerRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue | undefined) => any;
  "update:open": (value: boolean) => any;
  "update:placeholder": (date: DateValue) => any;
}, string, vue33.PublicProps, Readonly<DatePickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue | undefined) => any) | undefined;
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  disabled: boolean;
  defaultValue: DateValue;
  modal: boolean;
  placeholder: DateValue;
  readonly: boolean;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  closeOnSelect: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$231<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerRoot.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerTrigger.vue.d.ts
interface DatePickerTriggerProps extends PopoverTriggerProps {}
declare const _default$239: __VLS_WithSlots$230<vue33.DefineComponent<DatePickerTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DatePickerTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$230<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerTrigger.vue.d.ts.map
//#endregion
//#region src/DateRangeField/DateRangeFieldRoot.vue.d.ts
type DateRangeType = 'start' | 'end';
type DateRangeFieldRootContext = {
  locale: Ref<string>;
  startValue: Ref<DateValue | undefined>;
  endValue: Ref<DateValue | undefined>;
  placeholder: Ref<DateValue>;
  isDateUnavailable?: Matcher;
  isInvalid: Ref<boolean>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  formatter: Formatter;
  hourCycle: HourCycle;
  step: Ref<DateStep>;
  segmentValues: Record<DateRangeType, Ref<SegmentValueObj>>;
  segmentContents: Ref<{
    start: {
      part: SegmentPart;
      value: string;
    }[];
    end: {
      part: SegmentPart;
      value: string;
    }[];
  }>;
  elements: Ref<Set<HTMLElement>>;
  focusNext: () => void;
  setFocusedElement: (el: HTMLElement) => void;
};
interface DateRangeFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the calendar */
  defaultValue?: DateRange;
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue;
  /** The controlled value of the field. Can be bound as `v-model`. */
  modelValue?: DateRange | null;
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle;
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep;
  /** The granularity to use for formatting times. Defaults to day if a CalendarDate is provided, otherwise defaults to minute. The field will render segments for each part of the date up to and including the specified granularity */
  granularity?: Granularity;
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** Whether or not the date field is disabled */
  disabled?: boolean;
  /** Whether or not the date field is readonly */
  readonly?: boolean;
  /** A function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher;
  /** Id of the element */
  id?: string;
  /** The reading direction of the date field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
}
type DateRangeFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [DateRange];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
};
declare const injectDateRangeFieldRootContext: <T extends DateRangeFieldRootContext | null | undefined = DateRangeFieldRootContext>(fallback?: T | undefined) => T extends null ? DateRangeFieldRootContext | null : DateRangeFieldRootContext, provideDateRangeFieldRootContext: (contextValue: DateRangeFieldRootContext) => DateRangeFieldRootContext;
declare const _default$215: __VLS_WithSlots$229<vue33.DefineComponent<DateRangeFieldRootProps, {
  setFocusedElement: (el: HTMLElement) => void;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (args_0: DateRange) => any;
  "update:placeholder": (date: DateValue) => any;
}, string, vue33.PublicProps, Readonly<DateRangeFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: DateRange) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
}>, {
  disabled: boolean;
  defaultValue: DateRange;
  placeholder: DateValue;
  readonly: boolean;
  isDateUnavailable: Matcher;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date range of the field */
    modelValue: DateRange | null;
    /** The date field segment contents */
    segments: {
      start: {
        part: SegmentPart;
        value: string;
      }[];
      end: {
        part: SegmentPart;
        value: string;
      }[];
    };
    /** Value if the input is invalid */
    isInvalid: boolean;
  }) => any;
}>;
type __VLS_WithSlots$229<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangeFieldRoot.vue.d.ts.map
//#endregion
//#region src/DateRangeField/DateRangeFieldInput.vue.d.ts
interface DateRangeFieldInputProps extends PrimitiveProps {
  /** The part of the date to render */
  part: SegmentPart;
  /** The type of field to render (start or end) */
  type: DateRangeType;
}
declare const _default$238: __VLS_WithSlots$228<vue33.DefineComponent<DateRangeFieldInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangeFieldInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$228<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangeFieldInput.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerAnchor.vue.d.ts
interface DateRangePickerAnchorProps extends PopoverAnchorProps {}
declare const _default$237: __VLS_WithSlots$227<vue33.DefineComponent<DateRangePickerAnchorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$227<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerAnchor.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerArrow.vue.d.ts
interface DateRangePickerArrowProps extends PopoverArrowProps {}
declare const _default$236: __VLS_WithSlots$226<vue33.DefineComponent<DateRangePickerArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerArrowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$226<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerArrow.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerCalendar.vue.d.ts
declare const _default$235: __VLS_WithSlots$225<vue33.DefineComponent<{}, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, true, {}, any>, {
  default?: (props: {
    date: _internationalized_date1728.DateValue;
    grid: Grid<_internationalized_date1728.DateValue>[];
    weekDays: string[];
    weekStartsOn: WeekStartsOn;
    locale: string;
    fixedWeeks: boolean;
  }) => any;
}>;
type __VLS_WithSlots$225<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerCalendar.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerCell.vue.d.ts
interface DateRangePickerCellProps extends RangeCalendarCellProps {}
declare const _default$234: __VLS_WithSlots$224<vue33.DefineComponent<DateRangePickerCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$224<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerCell.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarCellTrigger.vue.d.ts
interface RangeCalendarCellTriggerProps extends PrimitiveProps {
  day: DateValue;
  month: DateValue;
}
interface RangeCalendarCellTriggerSlot {
  default?: (props: {
    /** Current day */
    dayValue: string;
    /** Current disable state */
    disabled: boolean;
    /** Current selected state */
    selected: boolean;
    /** Current today state */
    today: boolean;
    /** Current outside view state */
    outsideView: boolean;
    /** Current outside visible view state */
    outsideVisibleView: boolean;
    /** Current unavailable state */
    unavailable: boolean;
    /** Current highlighted state */
    highlighted: boolean;
    /** Current highlighted start state */
    highlightedStart: boolean;
    /** Current highlighted end state */
    highlightedEnd: boolean;
    /** Current selection start state */
    selectionStart: boolean;
    /** Current selection end state */
    selectionEnd: boolean;
  }) => any;
}
declare const _default$233: __VLS_WithSlots$223<vue33.DefineComponent<RangeCalendarCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, RangeCalendarCellTriggerSlot>;
type __VLS_WithSlots$223<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarCellTrigger.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerCellTrigger.vue.d.ts
interface DateRangePickerCellTriggerProps extends RangeCalendarCellTriggerProps {}
declare const _default$232: __VLS_WithSlots$222<vue33.DefineComponent<DateRangePickerCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerCellTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, RangeCalendarCellTriggerSlot>;
type __VLS_WithSlots$222<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerClose.vue.d.ts
interface DateRangePickerCloseProps extends PopoverCloseProps {}
declare const _default$231: __VLS_WithSlots$221<vue33.DefineComponent<DateRangePickerCloseProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerCloseProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$221<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerClose.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerContent.vue.d.ts
interface DateRangePickerContentProps extends PopoverContentProps {
  /**
   * Props to control the portal wrapped around the content.
   */
  portal?: PopoverPortalProps;
}
interface DateRangePickerContentEmits extends PopoverContentEmits {}
declare const _default$230: __VLS_WithSlots$220<vue33.DefineComponent<DateRangePickerContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<DateRangePickerContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$220<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerContent.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerField.vue.d.ts
declare const _default$229: __VLS_WithSlots$219<vue33.DefineComponent<{}, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, true, {}, any>, {
  default?: (props: {
    segments: {
      start: {
        part: SegmentPart;
        value: string;
      }[];
      end: {
        part: SegmentPart;
        value: string;
      }[];
    };
    modelValue: DateRange | null;
  }) => any;
}>;
type __VLS_WithSlots$219<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerField.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGrid.vue.d.ts
interface DateRangePickerGridProps extends RangeCalendarGridProps {}
declare const _default$228: __VLS_WithSlots$218<vue33.DefineComponent<DateRangePickerGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerGridProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$218<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGrid.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGridBody.vue.d.ts
interface DateRangePickerGridBodyProps extends RangeCalendarGridBodyProps {}
declare const _default$227: __VLS_WithSlots$217<vue33.DefineComponent<DateRangePickerGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerGridBodyProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$217<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGridBody.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGridHead.vue.d.ts
interface DateRangePickerGridHeadProps extends RangeCalendarGridHeadProps {}
declare const _default$226: __VLS_WithSlots$216<vue33.DefineComponent<DateRangePickerGridHeadProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerGridHeadProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$216<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGridHead.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGridRow.vue.d.ts
interface DateRangePickerGridRowProps extends RangeCalendarGridRowProps {}
declare const _default$225: __VLS_WithSlots$215<vue33.DefineComponent<DateRangePickerGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerGridRowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$215<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGridRow.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerHeadCell.vue.d.ts
interface DateRangePickerHeadCellProps extends RangeCalendarHeadCellProps {}
declare const _default$224: __VLS_WithSlots$214<vue33.DefineComponent<DateRangePickerHeadCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerHeadCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$214<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerHeadCell.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerHeader.vue.d.ts
interface DateRangePickerHeaderProps extends RangeCalendarHeaderProps {}
declare const _default$223: __VLS_WithSlots$213<vue33.DefineComponent<DateRangePickerHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerHeaderProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$213<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerHeader.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerHeading.vue.d.ts
interface DateRangePickerHeadingProps extends RangeCalendarHeadingProps {}
declare const _default$222: __VLS_WithSlots$212<vue33.DefineComponent<DateRangePickerHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerHeadingProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$212<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerHeading.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerInput.vue.d.ts
interface DateRangePickerInputProps extends DateRangeFieldInputProps {}
declare const _default$221: __VLS_WithSlots$211<vue33.DefineComponent<DateRangePickerInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$211<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerInput.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarNext.vue.d.ts
interface RangeCalendarNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the `RangeCalendarRoot`. */
  nextPage?: (placeholder: DateValue) => DateValue;
}
interface RangeCalendarNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$220: __VLS_WithSlots$210<vue33.DefineComponent<RangeCalendarNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarNextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, RangeCalendarNextSlot>;
type __VLS_WithSlots$210<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarNext.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerNext.vue.d.ts
interface DateRangePickerNextProps extends RangeCalendarNextProps {}
declare const _default$219: __VLS_WithSlots$209<vue33.DefineComponent<DateRangePickerNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerNextProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, RangeCalendarNextSlot>;
type __VLS_WithSlots$209<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerNext.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarPrev.vue.d.ts
interface RangeCalendarPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the `RangeCalendarRoot`. */
  prevPage?: (placeholder: DateValue) => DateValue;
}
interface RangeCalendarPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$218: __VLS_WithSlots$208<vue33.DefineComponent<RangeCalendarPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarPrevProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, RangeCalendarPrevSlot>;
type __VLS_WithSlots$208<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarPrev.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerPrev.vue.d.ts
interface DateRangePickerPrevProps extends RangeCalendarPrevProps {}
declare const _default$217: __VLS_WithSlots$207<vue33.DefineComponent<DateRangePickerPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerPrevProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, RangeCalendarPrevSlot>;
type __VLS_WithSlots$207<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerPrev.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerRoot.vue.d.ts
type DateRangePickerRootContext = {
  id: Ref<string | undefined>;
  name: Ref<string | undefined>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
  hourCycle: Ref<HourCycle | undefined>;
  granularity: Ref<Granularity | undefined>;
  hideTimeZone: Ref<boolean>;
  required: Ref<boolean>;
  locale: Ref<string>;
  dateFieldRef: Ref<InstanceType<typeof _default$215> | undefined>;
  modelValue: Ref<{
    start: DateValue | undefined;
    end: DateValue | undefined;
  }>;
  placeholder: Ref<DateValue>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  weekStartsOn: Ref<WeekStartsOn>;
  weekdayFormat: Ref<WeekDayFormat>;
  fixedWeeks: Ref<boolean>;
  numberOfMonths: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  isDateDisabled?: Matcher;
  isDateUnavailable?: Matcher;
  isDateHighlightable?: Matcher;
  defaultOpen: Ref<boolean>;
  open: Ref<boolean>;
  modal: Ref<boolean>;
  onDateChange: (date: DateRange) => void;
  onPlaceholderChange: (date: DateValue) => void;
  onStartValueChange: (date: DateValue | undefined) => void;
  dir: Ref<Direction>;
  allowNonContiguousRanges: Ref<boolean>;
  fixedDate: Ref<'start' | 'end' | undefined>;
  maximumDays?: Ref<number | undefined>;
  step: Ref<DateStep | undefined>;
  closeOnSelect?: Ref<boolean>;
};
type DateRangePickerRootProps = Omit<DateRangeFieldRootProps, 'as' | 'asChild'> & PopoverRootProps & Pick<RangeCalendarRootProps, 'isDateDisabled' | 'pagedNavigation' | 'weekStartsOn' | 'weekdayFormat' | 'fixedWeeks' | 'numberOfMonths' | 'preventDeselect' | 'isDateUnavailable' | 'isDateHighlightable' | 'allowNonContiguousRanges' | 'fixedDate' | 'maximumDays'> & {
  /** Whether or not to close the popover on range select */
  closeOnSelect?: boolean;
};
type DateRangePickerRootEmits = PopoverRootEmits & {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateRange];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
  /** Event handler called whenever the start value changes */
  'update:startValue': [date: DateValue | undefined];
};
declare const injectDateRangePickerRootContext: <T extends DateRangePickerRootContext | null | undefined = DateRangePickerRootContext>(fallback?: T | undefined) => T extends null ? DateRangePickerRootContext | null : DateRangePickerRootContext, provideDateRangePickerRootContext: (contextValue: DateRangePickerRootContext) => DateRangePickerRootContext;
declare const _default$216: __VLS_WithSlots$206<vue33.DefineComponent<DateRangePickerRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateRange) => any;
  "update:open": (value: boolean) => any;
  "update:placeholder": (date: DateValue) => any;
  "update:startValue": (date: DateValue | undefined) => any;
}, string, vue33.PublicProps, Readonly<DateRangePickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
  "onUpdate:startValue"?: ((date: DateValue | undefined) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  disabled: boolean;
  defaultValue: DateRange;
  modal: boolean;
  placeholder: DateValue;
  readonly: boolean;
  allowNonContiguousRanges: boolean;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  maximumDays: number;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  isDateHighlightable: Matcher;
  closeOnSelect: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: DateRange;
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$206<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerRoot.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerTrigger.vue.d.ts
interface DateRangePickerTriggerProps extends PopoverTriggerProps {}
declare const _default$214: __VLS_WithSlots$205<vue33.DefineComponent<DateRangePickerTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DateRangePickerTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$205<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerTrigger.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuArrow.vue.d.ts
interface DropdownMenuArrowProps extends MenuArrowProps {}
declare const _default$213: __VLS_WithSlots$204<vue33.DefineComponent<DropdownMenuArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$204<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuArrow.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuCheckboxItem.vue.d.ts
type DropdownMenuCheckboxItemEmits = MenuCheckboxItemEmits;
interface DropdownMenuCheckboxItemProps extends MenuCheckboxItemProps {}
declare const _default$212: __VLS_WithSlots$203<vue33.DefineComponent<DropdownMenuCheckboxItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
  "update:modelValue": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuCheckboxItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$203<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuCheckboxItem.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuContent.vue.d.ts
type DropdownMenuContentEmits = MenuContentEmits;
interface DropdownMenuContentProps extends MenuContentProps {}
declare const _default$211: __VLS_WithSlots$202<vue33.DefineComponent<DropdownMenuContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$202<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuContent.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuFilter.vue.d.ts
interface DropdownMenuFilterProps extends PrimitiveProps {
  /** The controlled value of the filter. Can be binded with v-model. */
  modelValue?: string;
  /** Focus on element when mounted. */
  autoFocus?: boolean;
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
}
type DropdownMenuFilterEmits = {
  'update:modelValue': [string];
};
declare const _default$210: __VLS_WithSlots$201<vue33.DefineComponent<DropdownMenuFilterProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (args_0: string) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuFilterProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: string) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string | undefined;
  }) => any;
}>;
type __VLS_WithSlots$201<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuFilter.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuGroup.vue.d.ts
interface DropdownMenuGroupProps extends MenuGroupProps {}
declare const _default$209: __VLS_WithSlots$200<vue33.DefineComponent<DropdownMenuGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$200<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuGroup.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuItem.vue.d.ts
type DropdownMenuItemEmits = MenuItemEmits;
interface DropdownMenuItemProps extends MenuItemProps {}
declare const _default$208: __VLS_WithSlots$199<vue33.DefineComponent<DropdownMenuItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$199<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuItem.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuItemIndicator.vue.d.ts
interface DropdownMenuItemIndicatorProps extends MenuItemIndicatorProps {}
declare const _default$207: __VLS_WithSlots$198<vue33.DefineComponent<DropdownMenuItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuItemIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$198<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuItemIndicator.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuLabel.vue.d.ts
interface DropdownMenuLabelProps extends MenuLabelProps {}
declare const _default$206: __VLS_WithSlots$197<vue33.DefineComponent<DropdownMenuLabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuLabelProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$197<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuLabel.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuPortal.vue.d.ts
interface DropdownMenuPortalProps extends MenuPortalProps {}
declare const _default$205: __VLS_WithSlots$196<vue33.DefineComponent<DropdownMenuPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$196<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuPortal.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuRadioGroup.vue.d.ts
type DropdownMenuRadioGroupEmits = MenuRadioGroupEmits;
interface DropdownMenuRadioGroupProps extends MenuRadioGroupProps {}
declare const _default$204: __VLS_WithSlots$195<vue33.DefineComponent<MenuRadioGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue) => any;
}, string, vue33.PublicProps, Readonly<MenuRadioGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$195<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuRadioGroup.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuRadioItem.vue.d.ts
type DropdownMenuRadioItemEmits = MenuRadioItemEmits;
interface DropdownMenuRadioItemProps extends MenuRadioItemProps {}
declare const _default$203: __VLS_WithSlots$194<vue33.DefineComponent<DropdownMenuRadioItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuRadioItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$194<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuRadioItem.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuRoot.vue.d.ts
interface DropdownMenuRootProps extends MenuProps {
  /** The open state of the dropdown menu when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
}
type DropdownMenuRootEmits = MenuEmits;
interface DropdownMenuRootContext {
  open: Readonly<Ref<boolean>>;
  onOpenChange: (open: boolean) => void;
  onOpenToggle: () => void;
  triggerId: string;
  triggerElement: Ref<HTMLElement | undefined>;
  contentId: string;
  modal: Ref<boolean>;
  dir: Ref<Direction>;
}
declare const injectDropdownMenuRootContext: <T extends DropdownMenuRootContext | null | undefined = DropdownMenuRootContext>(fallback?: T | undefined) => T extends null ? DropdownMenuRootContext | null : DropdownMenuRootContext, provideDropdownMenuRootContext: (contextValue: DropdownMenuRootContext) => DropdownMenuRootContext;
declare const _default$202: __VLS_WithSlots$193<vue33.DefineComponent<DropdownMenuRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuRootProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
  modal: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$193<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuRoot.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuSeparator.vue.d.ts
interface DropdownMenuSeparatorProps extends MenuSeparatorProps {}
declare const _default$201: __VLS_WithSlots$192<vue33.DefineComponent<DropdownMenuSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$192<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuSeparator.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuSub.vue.d.ts
type DropdownMenuSubEmits = MenuSubEmits;
interface DropdownMenuSubProps extends MenuSubProps {
  /** The open state of the dropdown menu when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
}
declare const _default$200: __VLS_WithSlots$191<vue33.DefineComponent<DropdownMenuSubProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuSubProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$191<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuSub.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuSubContent.vue.d.ts
type DropdownMenuSubContentEmits = MenuSubContentEmits;
interface DropdownMenuSubContentProps extends MenuSubContentProps {}
declare const _default$199: __VLS_WithSlots$190<vue33.DefineComponent<DropdownMenuSubContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<DropdownMenuSubContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$190<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuSubContent.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuSubTrigger.vue.d.ts
interface DropdownMenuSubTriggerProps extends MenuSubTriggerProps {}
declare const _default$198: __VLS_WithSlots$189<vue33.DefineComponent<DropdownMenuSubTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuSubTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$189<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuSubTrigger.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuTrigger.vue.d.ts
interface DropdownMenuTriggerProps extends PrimitiveProps {
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
}
declare const _default$197: __VLS_WithSlots$188<vue33.DefineComponent<DropdownMenuTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<DropdownMenuTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$188<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuTrigger.vue.d.ts.map
//#endregion
//#region src/Editable/EditableArea.vue.d.ts
interface EditableAreaProps extends PrimitiveProps {}
declare const _default$196: __VLS_WithSlots$187<vue33.DefineComponent<EditableAreaProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<EditableAreaProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$187<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableArea.vue.d.ts.map
//#endregion
//#region src/Editable/EditableCancelTrigger.vue.d.ts
interface EditableCancelTriggerProps extends PrimitiveProps {}
declare const _default$195: __VLS_WithSlots$186<vue33.DefineComponent<EditableCancelTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<EditableCancelTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$186<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableCancelTrigger.vue.d.ts.map
//#endregion
//#region src/Editable/EditableEditTrigger.vue.d.ts
interface EditableEditTriggerProps extends PrimitiveProps {}
declare const _default$194: __VLS_WithSlots$185<vue33.DefineComponent<EditableEditTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<EditableEditTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$185<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableEditTrigger.vue.d.ts.map
//#endregion
//#region src/Editable/EditableInput.vue.d.ts
interface EditableInputProps extends PrimitiveProps {}
declare const _default$193: __VLS_WithSlots$184<vue33.DefineComponent<EditableInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<EditableInputProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$184<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableInput.vue.d.ts.map
//#endregion
//#region src/Editable/EditablePreview.vue.d.ts
interface EditablePreviewProps extends PrimitiveProps {}
declare const _default$192: __VLS_WithSlots$183<vue33.DefineComponent<EditablePreviewProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<EditablePreviewProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$183<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditablePreview.vue.d.ts.map
//#endregion
//#region src/Editable/EditableRoot.vue.d.ts
type ActivationMode = 'focus' | 'dblclick' | 'none';
type SubmitMode = 'blur' | 'enter' | 'none' | 'both';
type EditableRootContext = {
  id: Ref<string | undefined>;
  name: Ref<string | undefined>;
  maxLength: Ref<number | undefined>;
  disabled: Ref<boolean>;
  modelValue: Ref<string | null | undefined>;
  inputValue: Ref<string | null | undefined>;
  placeholder: Ref<{
    edit: string;
    preview: string;
  }>;
  isEditing: Ref<boolean>;
  submitMode: Ref<SubmitMode>;
  activationMode: Ref<ActivationMode>;
  selectOnFocus: Ref<boolean>;
  edit: () => void;
  cancel: () => void;
  submit: () => void;
  inputRef: Ref<HTMLInputElement | undefined>;
  startWithEditMode: Ref<boolean>;
  isEmpty: Ref<boolean>;
  readonly: Ref<boolean>;
  autoResize: Ref<boolean>;
};
interface EditableRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value of the editable field */
  defaultValue?: string;
  /** The value of the editable field */
  modelValue?: string | null;
  /** The placeholder for the editable field */
  placeholder?: string | {
    edit: string;
    preview: string;
  };
  /** The reading direction of the calendar when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** Whether the editable field is disabled */
  disabled?: boolean;
  /** Whether the editable field is read-only */
  readonly?: boolean;
  /** The activation event of the editable field */
  activationMode?: ActivationMode;
  /** Whether to select the text in the input when it is focused. */
  selectOnFocus?: boolean;
  /** The submit event of the editable field */
  submitMode?: SubmitMode;
  /** Whether to start with the edit mode active */
  startWithEditMode?: boolean;
  /** The maximum number of characters allowed */
  maxLength?: number;
  /** Whether the editable field should auto resize */
  autoResize?: boolean;
  /** The id of the field */
  id?: string;
}
type EditableRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [value: string];
  /** Event handler called when a value is submitted */
  'submit': [value: string | null | undefined];
  /** Event handler called when the editable field changes state */
  'update:state': [state: 'edit' | 'submit' | 'cancel'];
};
declare const injectEditableRootContext: <T extends EditableRootContext | null | undefined = EditableRootContext>(fallback?: T | undefined) => T extends null ? EditableRootContext | null : EditableRootContext, provideEditableRootContext: (contextValue: EditableRootContext) => EditableRootContext;
declare const _default$191: __VLS_WithSlots$182<vue33.DefineComponent<EditableRootProps, {
  /** Function to submit the value of the editable */
  submit: () => void;
  /** Function to cancel the value of the editable */
  cancel: () => void;
  /** Function to set the editable in edit mode */
  edit: () => void;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  submit: (value: string | null | undefined) => any;
  "update:modelValue": (value: string) => any;
  "update:state": (state: "cancel" | "submit" | "edit") => any;
}, string, vue33.PublicProps, Readonly<EditableRootProps> & Readonly<{
  onSubmit?: ((value: string | null | undefined) => any) | undefined;
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
  "onUpdate:state"?: ((state: "cancel" | "submit" | "edit") => any) | undefined;
}>, {
  required: boolean;
  as: AsTag | vue33.Component;
  disabled: boolean;
  placeholder: string | {
    edit: string;
    preview: string;
  };
  activationMode: ActivationMode;
  selectOnFocus: boolean;
  submitMode: SubmitMode;
  autoResize: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Whether the editable field is in edit mode */
    isEditing: boolean;
    /** The value of the editable field */
    modelValue: string | null | undefined;
    /** Whether the editable field is empty */
    isEmpty: boolean;
    /** Function to submit the value of the editable */
    submit: () => void;
    /** Function to cancel the value of the editable */
    cancel: () => void;
    /** Function to set the editable in edit mode */
    edit: () => void;
  }) => any;
}>;
type __VLS_WithSlots$182<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableRoot.vue.d.ts.map
//#endregion
//#region src/Editable/EditableSubmitTrigger.vue.d.ts
interface EditableSubmitTriggerProps extends PrimitiveProps {}
declare const _default$190: __VLS_WithSlots$181<vue33.DefineComponent<EditableSubmitTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<EditableSubmitTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$181<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableSubmitTrigger.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardArrow.vue.d.ts
interface HoverCardArrowProps extends PopperArrowProps {}
declare const _default$189: __VLS_WithSlots$180<vue33.DefineComponent<HoverCardArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<HoverCardArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$180<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=HoverCardArrow.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardContentImpl.vue.d.ts
interface HoverCardContentImplProps extends PopperContentProps {}
//#endregion
//#region src/HoverCard/HoverCardContent.vue.d.ts
interface HoverCardContentProps extends HoverCardContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$188: __VLS_WithSlots$179<vue33.DefineComponent<HoverCardContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
}, string, vue33.PublicProps, Readonly<HoverCardContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$179<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=HoverCardContent.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardPortal.vue.d.ts
interface HoverCardPortalProps extends TeleportProps {}
declare const _default$187: __VLS_WithSlots$178<vue33.DefineComponent<HoverCardPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<HoverCardPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$178<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=HoverCardPortal.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardRoot.vue.d.ts
interface HoverCardRootProps {
  /** The open state of the hover card when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
  /** The controlled open state of the hover card. Can be binded as `v-model:open`. */
  open?: boolean;
  /** The duration from when the mouse enters the trigger until the hover card opens. */
  openDelay?: number;
  /** The duration from when the mouse leaves the trigger or content until the hover card closes. */
  closeDelay?: number;
}
type HoverCardRootEmits = {
  /** Event handler called when the open state of the hover card changes. */
  'update:open': [value: boolean];
};
interface HoverCardRootContext {
  open: Ref<boolean>;
  onOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onClose: () => void;
  onDismiss: () => void;
  hasSelectionRef: Ref<boolean>;
  isPointerDownOnContentRef: Ref<boolean>;
  isPointerInTransitRef: Ref<boolean>;
  triggerElement: Ref<HTMLElement | undefined>;
}
declare const injectHoverCardRootContext: <T extends HoverCardRootContext | null | undefined = HoverCardRootContext>(fallback?: T | undefined) => T extends null ? HoverCardRootContext | null : HoverCardRootContext, provideHoverCardRootContext: (contextValue: HoverCardRootContext) => HoverCardRootContext;
declare const _default$186: __VLS_WithSlots$177<vue33.DefineComponent<HoverCardRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<HoverCardRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  openDelay: number;
  closeDelay: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$177<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=HoverCardRoot.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardTrigger.vue.d.ts
interface HoverCardTriggerProps extends PopperAnchorProps {}
declare const _default$185: __VLS_WithSlots$176<vue33.DefineComponent<HoverCardTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<HoverCardTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$176<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=HoverCardTrigger.vue.d.ts.map
//#endregion
//#region src/Label/Label.vue.d.ts
interface LabelProps extends PrimitiveProps {
  /** The id of the element the label is associated with. */
  for?: string;
}
declare const _default$184: __VLS_WithSlots$175<vue33.DefineComponent<LabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<LabelProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$175<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=Label.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarArrow.vue.d.ts
interface MenubarArrowProps extends MenuArrowProps {}
declare const _default$183: __VLS_WithSlots$174<vue33.DefineComponent<MenubarArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$174<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarArrow.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarCheckboxItem.vue.d.ts
type MenubarCheckboxItemEmits = MenuCheckboxItemEmits;
interface MenubarCheckboxItemProps extends MenuCheckboxItemProps {}
declare const _default$182: __VLS_WithSlots$173<vue33.DefineComponent<MenubarCheckboxItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
  "update:modelValue": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<MenubarCheckboxItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$173<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarCheckboxItem.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarContent.vue.d.ts
interface MenubarContentProps extends MenuContentProps {}
declare const _default$181: __VLS_WithSlots$172<vue33.DefineComponent<MenubarContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenubarContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {
  align: Align;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$172<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarContent.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarGroup.vue.d.ts
interface MenubarGroupProps extends MenuGroupProps {}
declare const _default$180: __VLS_WithSlots$171<vue33.DefineComponent<MenubarGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$171<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarGroup.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarItem.vue.d.ts
type MenubarItemEmits = MenuItemEmits;
interface MenubarItemProps extends MenuItemProps {}
declare const _default$179: __VLS_WithSlots$170<vue33.DefineComponent<MenubarItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenubarItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$170<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarItem.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarItemIndicator.vue.d.ts
interface MenubarItemIndicatorProps extends MenuItemIndicatorProps {}
declare const _default$178: __VLS_WithSlots$169<vue33.DefineComponent<MenubarItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarItemIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$169<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarItemIndicator.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarLabel.vue.d.ts
interface MenubarLabelProps extends MenuLabelProps {}
declare const _default$177: __VLS_WithSlots$168<vue33.DefineComponent<MenubarLabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarLabelProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$168<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarLabel.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarMenu.vue.d.ts
interface MenubarMenuProps {
  /**
   * A unique value that associates the item with an active value when the navigation menu is controlled.
   *
   * This prop is managed automatically when uncontrolled.
   */
  value?: string;
}
type MenubarMenuContext = {
  value: string;
  triggerId: string;
  triggerElement: Ref<HTMLElement | undefined>;
  contentId: string;
  wasKeyboardTriggerOpenRef: Ref<boolean>;
};
declare const injectMenubarMenuContext: <T extends MenubarMenuContext | null | undefined = MenubarMenuContext>(fallback?: T | undefined) => T extends null ? MenubarMenuContext | null : MenubarMenuContext, provideMenubarMenuContext: (contextValue: MenubarMenuContext) => MenubarMenuContext;
declare const _default$176: __VLS_WithSlots$167<vue33.DefineComponent<MenubarMenuProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarMenuProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$167<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarMenu.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarPortal.vue.d.ts
interface MenubarPortalProps extends MenuPortalProps {}
declare const _default$175: __VLS_WithSlots$166<vue33.DefineComponent<MenubarPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$166<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarPortal.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarRadioGroup.vue.d.ts
type MenubarRadioGroupEmits = MenuRadioGroupEmits;
interface MenubarRadioGroupProps extends MenuRadioGroupProps {}
declare const _default$174: __VLS_WithSlots$165<vue33.DefineComponent<MenubarRadioGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue) => any;
}, string, vue33.PublicProps, Readonly<MenubarRadioGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$165<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarRadioGroup.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarRadioItem.vue.d.ts
type MenubarRadioItemEmits = MenuRadioItemEmits;
interface MenubarRadioItemProps extends MenuRadioItemProps {}
declare const _default$173: __VLS_WithSlots$164<vue33.DefineComponent<MenuRadioItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenuRadioItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$164<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarRadioItem.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarRoot.vue.d.ts
interface MenubarRootProps {
  /** The controlled value of the menu to open. Can be used as `v-model`. */
  modelValue?: string;
  /** The value of the menu that should be open when initially rendered. Use when you do not need to control the value state. */
  defaultValue?: string;
  /**
   * The reading direction of the combobox when applicable.
   *
   *  If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction;
  /** When `true`, keyboard navigation will loop from last item to first, and vice versa. */
  loop?: boolean;
}
type MenubarRootEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: boolean];
};
interface MenubarRootContext {
  modelValue: Ref<string>;
  dir: Ref<Direction>;
  loop: Ref<boolean>;
  onMenuOpen: (value: string) => void;
  onMenuClose: () => void;
  onMenuToggle: (value: string) => void;
}
declare const injectMenubarRootContext: <T extends MenubarRootContext | null | undefined = MenubarRootContext>(fallback?: T | undefined) => T extends null ? MenubarRootContext | null : MenubarRootContext, provideMenubarRootContext: (contextValue: MenubarRootContext) => MenubarRootContext;
declare const _default$172: __VLS_WithSlots$163<vue33.DefineComponent<MenubarRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<MenubarRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
}>, {
  loop: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string;
  }) => any;
}>;
type __VLS_WithSlots$163<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarRoot.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarSeparator.vue.d.ts
interface MenubarSeparatorProps extends MenuSeparatorProps {}
declare const _default$171: __VLS_WithSlots$162<vue33.DefineComponent<MenubarSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$162<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarSeparator.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarSub.vue.d.ts
type MenubarSubEmits = MenuSubEmits;
interface MenubarSubProps extends MenuSubProps {
  /** The open state of the submenu when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
}
declare const _default$170: __VLS_WithSlots$161<vue33.DefineComponent<MenubarSubProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue33.PublicProps, Readonly<MenubarSubProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$161<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarSub.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarSubContent.vue.d.ts
type MenubarSubContentEmits = MenuSubContentEmits;
interface MenubarSubContentProps extends MenuSubContentProps {}
declare const _default$169: __VLS_WithSlots$160<vue33.DefineComponent<MenubarSubContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<MenubarSubContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$160<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarSubContent.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarSubTrigger.vue.d.ts
interface MenubarSubTriggerProps extends MenuSubTriggerProps {}
declare const _default$168: __VLS_WithSlots$159<vue33.DefineComponent<MenubarSubTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarSubTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$159<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarSubTrigger.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarTrigger.vue.d.ts
interface MenubarTriggerProps extends PrimitiveProps {
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
}
declare const _default$167: __VLS_WithSlots$158<vue33.DefineComponent<MenubarTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MenubarTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$158<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarTrigger.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerCell.vue.d.ts
interface MonthPickerCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue;
}
declare const _default$166: __VLS_WithSlots$157<vue33.DefineComponent<MonthPickerCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$157<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerCell.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerCellTrigger.vue.d.ts
interface MonthPickerCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  month: DateValue;
}
interface MonthPickerCellTriggerSlot {
  default?: (props: {
    /** Current month value (short name) */
    monthValue: string;
    /** Current disable state */
    disabled: boolean;
    /** Current selected state */
    selected: boolean;
    /** Current month/year is today state */
    today: boolean;
    /** Current unavailable state */
    unavailable: boolean;
  }) => any;
}
declare const _default$165: __VLS_WithSlots$156<vue33.DefineComponent<MonthPickerCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, MonthPickerCellTriggerSlot>;
type __VLS_WithSlots$156<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerGrid.vue.d.ts
interface MonthPickerGridProps extends PrimitiveProps {}
declare const _default$164: __VLS_WithSlots$155<vue33.DefineComponent<MonthPickerGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerGridProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$155<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerGrid.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerGridBody.vue.d.ts
interface MonthPickerGridBodyProps extends PrimitiveProps {}
declare const _default$163: __VLS_WithSlots$154<vue33.DefineComponent<MonthPickerGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$154<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerGridBody.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerGridRow.vue.d.ts
interface MonthPickerGridRowProps extends PrimitiveProps {}
declare const _default$162: __VLS_WithSlots$153<vue33.DefineComponent<MonthPickerGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerGridRowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$153<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerGridRow.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerHeader.vue.d.ts
interface MonthPickerHeaderProps extends PrimitiveProps {}
declare const _default$161: __VLS_WithSlots$152<vue33.DefineComponent<MonthPickerHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerHeaderProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$152<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerHeader.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerHeading.vue.d.ts
interface MonthPickerHeadingProps extends PrimitiveProps {}
declare const _default$160: __VLS_WithSlots$151<vue33.DefineComponent<MonthPickerHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerHeadingProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current year heading */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$151<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerHeading.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerNext.vue.d.ts
interface MonthPickerNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the `MonthPickerRoot`. */
  nextPage?: (placeholder: DateValue) => DateValue;
}
interface MonthPickerNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$159: __VLS_WithSlots$150<vue33.DefineComponent<MonthPickerNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerNextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, MonthPickerNextSlot>;
type __VLS_WithSlots$150<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerNext.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerPrev.vue.d.ts
interface MonthPickerPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the `MonthPickerRoot`. */
  prevPage?: (placeholder: DateValue) => DateValue;
}
interface MonthPickerPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$158: __VLS_WithSlots$149<vue33.DefineComponent<MonthPickerPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthPickerPrevProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, MonthPickerPrevSlot>;
type __VLS_WithSlots$149<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerPrev.vue.d.ts.map
//#endregion
//#region src/MonthPicker/MonthPickerRoot.vue.d.ts
type MonthPickerRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue | DateValue[] | undefined>;
  placeholder: Ref<DateValue>;
  multiple: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue>>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onMonthChange: (date: DateValue) => void;
  onPlaceholderChange: (date: DateValue) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  headingId: string;
  isInvalid: Ref<boolean>;
  isMonthDisabled: Matcher;
  isMonthSelected: Matcher;
  isMonthUnavailable?: Matcher;
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void;
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
};
interface MonthPickerRootProps extends PrimitiveProps {
  /** The default value for the month picker */
  defaultValue?: DateValue;
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The placeholder date, which is used to determine what year to display when no date is selected */
  placeholder?: DateValue;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The accessible label for the month picker */
  calendarLabel?: string;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** Whether the month picker is disabled */
  disabled?: boolean;
  /** Whether the month picker is readonly */
  readonly?: boolean;
  /** If true, the month picker will focus the selected month, today, or the first month of the year on mount */
  initialFocus?: boolean;
  /** A function that returns whether or not a month is disabled */
  isMonthDisabled?: Matcher;
  /** A function that returns whether or not a month is unavailable */
  isMonthUnavailable?: Matcher;
  /** The reading direction of the calendar when applicable. If omitted, inherits globally from `ConfigProvider` or assumes LTR. */
  dir?: Direction;
  /** A function that returns the next page of the month picker. Receives the current placeholder as an argument. */
  nextPage?: (placeholder: DateValue) => DateValue;
  /** A function that returns the previous page of the month picker. Receives the current placeholder as an argument. */
  prevPage?: (placeholder: DateValue) => DateValue;
  /** The controlled selected month value of the month picker. Can be bound as `v-model`. */
  modelValue?: DateValue | DateValue[] | undefined;
  /** Whether multiple months can be selected */
  multiple?: boolean;
}
type MonthPickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | DateValue[] | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
};
declare const injectMonthPickerRootContext: <T extends MonthPickerRootContext | null | undefined = MonthPickerRootContext>(fallback?: T | undefined) => T extends null ? MonthPickerRootContext | null : MonthPickerRootContext, provideMonthPickerRootContext: (contextValue: MonthPickerRootContext) => MonthPickerRootContext;
declare const _default$157: __VLS_WithSlots$148<vue33.DefineComponent<MonthPickerRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue | DateValue[] | undefined) => any;
  "update:placeholder": (date: DateValue) => any;
}, string, vue33.PublicProps, Readonly<MonthPickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue | DateValue[] | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: DateValue;
  multiple: boolean;
  placeholder: DateValue;
  readonly: boolean;
  preventDeselect: boolean;
  initialFocus: boolean;
  isMonthDisabled: Matcher;
  isMonthUnavailable: Matcher;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue;
    /** The grid of months */
    grid: Grid<DateValue>;
    /** The month picker locale */
    locale: string;
    /** The current selected value */
    modelValue: DateValue | DateValue[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$148<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthPickerRoot.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerCell.vue.d.ts
interface MonthRangePickerCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue;
}
declare const _default$156: __VLS_WithSlots$147<vue33.DefineComponent<MonthRangePickerCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$147<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerCell.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerCellTrigger.vue.d.ts
interface MonthRangePickerCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  month: DateValue;
}
interface MonthRangePickerCellTriggerSlot {
  default?: (props: {
    /** Current month value (short name) */
    monthValue: string;
    /** Current disable state */
    disabled: boolean;
    /** Current selected state */
    selected: boolean;
    /** Current month is today's month state */
    today: boolean;
    /** Current unavailable state */
    unavailable: boolean;
    /** Current highlighted state */
    highlighted: boolean;
    /** Current highlighted start state */
    highlightedStart: boolean;
    /** Current highlighted end state */
    highlightedEnd: boolean;
    /** Current selection start state */
    selectionStart: boolean;
    /** Current selection end state */
    selectionEnd: boolean;
  }) => any;
}
declare const _default$155: __VLS_WithSlots$146<vue33.DefineComponent<MonthRangePickerCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, MonthRangePickerCellTriggerSlot>;
type __VLS_WithSlots$146<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerGrid.vue.d.ts
interface MonthRangePickerGridProps extends PrimitiveProps {}
declare const _default$154: __VLS_WithSlots$145<vue33.DefineComponent<MonthRangePickerGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerGridProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$145<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerGrid.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerGridBody.vue.d.ts
interface MonthRangePickerGridBodyProps extends PrimitiveProps {}
declare const _default$153: __VLS_WithSlots$144<vue33.DefineComponent<MonthRangePickerGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$144<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerGridBody.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerGridRow.vue.d.ts
interface MonthRangePickerGridRowProps extends PrimitiveProps {}
declare const _default$152: __VLS_WithSlots$143<vue33.DefineComponent<MonthRangePickerGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerGridRowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$143<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerGridRow.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerHeader.vue.d.ts
interface MonthRangePickerHeaderProps extends PrimitiveProps {}
declare const _default$151: __VLS_WithSlots$142<vue33.DefineComponent<MonthRangePickerHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerHeaderProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$142<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerHeader.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerHeading.vue.d.ts
interface MonthRangePickerHeadingProps extends PrimitiveProps {}
declare const _default$150: __VLS_WithSlots$141<vue33.DefineComponent<MonthRangePickerHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerHeadingProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current year heading */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$141<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerHeading.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerNext.vue.d.ts
interface MonthRangePickerNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the Root. */
  nextPage?: (placeholder: DateValue) => DateValue;
}
interface MonthRangePickerNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$149: __VLS_WithSlots$140<vue33.DefineComponent<MonthRangePickerNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerNextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, MonthRangePickerNextSlot>;
type __VLS_WithSlots$140<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerNext.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerPrev.vue.d.ts
interface MonthRangePickerPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the Root. */
  prevPage?: (placeholder: DateValue) => DateValue;
}
interface MonthRangePickerPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$148: __VLS_WithSlots$139<vue33.DefineComponent<MonthRangePickerPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<MonthRangePickerPrevProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, MonthRangePickerPrevSlot>;
type __VLS_WithSlots$139<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerPrev.vue.d.ts.map
//#endregion
//#region src/MonthRangePicker/MonthRangePickerRoot.vue.d.ts
type MonthRangePickerRootContext = {
  modelValue: Ref<DateRange>;
  startValue: Ref<DateValue | undefined>;
  endValue: Ref<DateValue | undefined>;
  locale: Ref<string>;
  placeholder: Ref<DateValue>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue>>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onPlaceholderChange: (date: DateValue) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  headingId: string;
  isInvalid: Ref<boolean>;
  isMonthDisabled: Matcher;
  isMonthUnavailable?: Matcher;
  allowNonContiguousRanges: Ref<boolean>;
  highlightedRange: Ref<{
    start: DateValue;
    end: DateValue;
  } | null>;
  focusedValue: Ref<DateValue | undefined>;
  lastPressedDateValue: Ref<DateValue | undefined>;
  isSelected: (date: DateValue) => boolean;
  isSelectionEnd: (date: DateValue) => boolean;
  isSelectionStart: (date: DateValue) => boolean;
  isHighlightedStart: (date: DateValue) => boolean;
  isHighlightedEnd: (date: DateValue) => boolean;
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void;
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  fixedDate: Ref<'start' | 'end' | undefined>;
  maximumMonths: Ref<number | undefined>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
};
interface MonthRangePickerRootProps extends PrimitiveProps {
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The default value for the calendar */
  defaultValue?: DateRange;
  /** The controlled selected month range of the month range picker. Can be bound as `v-model`. */
  modelValue?: DateRange | null;
  /** The placeholder date, which is used to determine what year to display when no date is selected. */
  placeholder?: DateValue;
  /** When combined with `isMonthUnavailable`, determines whether non-contiguous ranges may be selected. */
  allowNonContiguousRanges?: boolean;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The maximum number of months that can be selected in a range */
  maximumMonths?: number;
  /** The accessible label for the calendar */
  calendarLabel?: string;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** Whether or not the calendar is disabled */
  disabled?: boolean;
  /** Whether or not the calendar is readonly */
  readonly?: boolean;
  /** If true, the calendar will focus the selected month on mount */
  initialFocus?: boolean;
  /** A function that returns whether or not a month is disabled */
  isMonthDisabled?: Matcher;
  /** A function that returns whether or not a month is unavailable */
  isMonthUnavailable?: Matcher;
  /** The reading direction of the calendar when applicable. */
  dir?: Direction;
  /** A function that returns the next page of the calendar. */
  nextPage?: (placeholder: DateValue) => DateValue;
  /** A function that returns the previous page of the calendar. */
  prevPage?: (placeholder: DateValue) => DateValue;
  /** Which part of the range should be fixed */
  fixedDate?: 'start' | 'end';
}
type MonthRangePickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateRange];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
  /** Event handler called whenever the start value changes */
  'update:startValue': [date: DateValue | undefined];
};
declare const injectMonthRangePickerRootContext: <T extends MonthRangePickerRootContext | null | undefined = MonthRangePickerRootContext>(fallback?: T | undefined) => T extends null ? MonthRangePickerRootContext | null : MonthRangePickerRootContext, provideMonthRangePickerRootContext: (contextValue: MonthRangePickerRootContext) => MonthRangePickerRootContext;
declare const _default$147: __VLS_WithSlots$138<vue33.DefineComponent<MonthRangePickerRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateRange) => any;
  "update:placeholder": (date: DateValue) => any;
  "update:startValue": (date: DateValue | undefined) => any;
}, string, vue33.PublicProps, Readonly<MonthRangePickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
  "onUpdate:startValue"?: ((date: DateValue | undefined) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: DateRange;
  placeholder: DateValue;
  readonly: boolean;
  allowNonContiguousRanges: boolean;
  preventDeselect: boolean;
  initialFocus: boolean;
  isMonthDisabled: Matcher;
  isMonthUnavailable: Matcher;
  maximumMonths: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue;
    /** The grid of months */
    grid: Grid<DateValue>;
    /** The calendar locale */
    locale: string;
    /** The current date range */
    modelValue: DateRange;
  }) => any;
}>;
type __VLS_WithSlots$138<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MonthRangePickerRoot.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuContentImpl.vue.d.ts
type NavigationMenuContentImplEmits = DismissableLayerEmits;
interface NavigationMenuContentImplProps extends DismissableLayerProps {}
//#endregion
//#region src/NavigationMenu/NavigationMenuContent.vue.d.ts
type NavigationMenuContentEmits = NavigationMenuContentImplEmits;
interface NavigationMenuContentProps extends NavigationMenuContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$146: __VLS_WithSlots$137<vue33.DefineComponent<NavigationMenuContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
}, string, vue33.PublicProps, Readonly<NavigationMenuContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$137<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuContent.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuIndicator.vue.d.ts
interface NavigationMenuIndicatorProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$145: __VLS_WithSlots$136<vue33.DefineComponent<NavigationMenuIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NavigationMenuIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$136<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuIndicator.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuItem.vue.d.ts
interface NavigationMenuItemProps extends PrimitiveProps {
  /**
   * A unique value that associates the item with an active value when the navigation menu is controlled.
   *
   *  This prop is managed automatically when uncontrolled.
   */
  value?: string;
}
type NavigationMenuItemContext = {
  value: string;
  contentId: string;
  triggerRef: Ref<HTMLElement | undefined>;
  focusProxyRef: Ref<HTMLElement | undefined>;
  wasEscapeCloseRef: Ref<boolean>;
  onEntryKeyDown: () => void;
  onFocusProxyEnter: (side: 'start' | 'end') => void;
  onContentFocusOutside: () => void;
  onRootContentClose: () => void;
};
declare const injectNavigationMenuItemContext: <T extends NavigationMenuItemContext | null | undefined = NavigationMenuItemContext>(fallback?: T | undefined) => T extends null ? NavigationMenuItemContext | null : NavigationMenuItemContext, provideNavigationMenuItemContext: (contextValue: NavigationMenuItemContext) => NavigationMenuItemContext;
declare const _default$144: __VLS_WithSlots$135<vue33.DefineComponent<NavigationMenuItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NavigationMenuItemProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$135<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuItem.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuLink.vue.d.ts
type NavigationMenuLinkEmits = {
  /**
   * Event handler called when the user selects a link (via mouse or keyboard).
   *
   * Calling `event.preventDefault` in this handler will prevent the navigation menu from closing when selecting that link.
   */
  select: [payload: CustomEvent<{
    originalEvent: Event;
  }>];
};
interface NavigationMenuLinkProps extends PrimitiveProps {
  /** Used to identify the link as the currently active page. */
  active?: boolean;
}
declare const _default$143: __VLS_WithSlots$134<vue33.DefineComponent<NavigationMenuLinkProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (payload: CustomEvent<{
    originalEvent: Event;
  }>) => any;
}, string, vue33.PublicProps, Readonly<NavigationMenuLinkProps> & Readonly<{
  onSelect?: ((payload: CustomEvent<{
    originalEvent: Event;
  }>) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$134<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuLink.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuList.vue.d.ts
interface NavigationMenuListProps extends PrimitiveProps {}
declare const _default$142: __VLS_WithSlots$133<vue33.DefineComponent<NavigationMenuListProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NavigationMenuListProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$133<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuList.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/utils.d.ts
type Orientation = 'vertical' | 'horizontal';
type Direction$3 = 'ltr' | 'rtl';
//#endregion
//#region src/NavigationMenu/NavigationMenuRoot.vue.d.ts
interface NavigationMenuRootProps extends PrimitiveProps {
  /** The controlled value of the menu item to activate. Can be used as `v-model`. */
  modelValue?: string;
  /**
   * The value of the menu item that should be active when initially rendered.
   *
   * Use when you do not need to control the value state.
   */
  defaultValue?: string;
  /**
   * The reading direction of the combobox when applicable.
   *
   *  If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction$3;
  /** The orientation of the menu. */
  orientation?: Orientation;
  /**
   * The duration from when the pointer enters the trigger until the tooltip gets opened.
   * @defaultValue 200
   */
  delayDuration?: number;
  /**
   * How much time a user has to enter another trigger without incurring a delay again.
   * @defaultValue 300
   */
  skipDelayDuration?: number;
  /**
   * If `true`, menu cannot be open by click on trigger
   * @defaultValue false
   */
  disableClickTrigger?: boolean;
  /**
   * If `true`, menu cannot be open by hover on trigger
   * @defaultValue false
   */
  disableHoverTrigger?: boolean;
  /**
   * If `true`, menu will not close during pointer leave event
   * @defaultValue false
   */
  disablePointerLeaveClose?: boolean;
  /**
   * When `true`, the element will be unmounted on closed state.
   *
   * @defaultValue `true`
   */
  unmountOnHide?: boolean;
}
type NavigationMenuRootEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: string];
};
interface NavigationMenuContext {
  isRootMenu: boolean;
  modelValue: Ref<string>;
  previousValue: Ref<string>;
  baseId: string;
  dir: Ref<Direction$3>;
  orientation: Orientation;
  disableClickTrigger: Ref<boolean>;
  disableHoverTrigger: Ref<boolean>;
  unmountOnHide: Ref<boolean>;
  rootNavigationMenu: Ref<HTMLElement | undefined>;
  activeTrigger: Ref<HTMLElement | undefined>;
  indicatorTrack: Ref<HTMLElement | undefined>;
  onIndicatorTrackChange: (indicatorTrack: HTMLElement | undefined) => void;
  viewport: Ref<HTMLElement | undefined>;
  onViewportChange: (viewport: HTMLElement | undefined) => void;
  onTriggerEnter: (itemValue: string) => void;
  onTriggerLeave: () => void;
  onContentEnter: (itemValue: string) => void;
  onContentLeave: () => void;
  onItemSelect: (itemValue: string) => void;
  onItemDismiss: () => void;
}
declare const injectNavigationMenuContext: <T extends NavigationMenuContext | null | undefined = NavigationMenuContext>(fallback?: T | undefined) => T extends null ? NavigationMenuContext | null : NavigationMenuContext, provideNavigationMenuContext: (contextValue: NavigationMenuContext) => NavigationMenuContext;
declare const _default$141: __VLS_WithSlots$132<vue33.DefineComponent<NavigationMenuRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: string) => any;
}, string, vue33.PublicProps, Readonly<NavigationMenuRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  unmountOnHide: boolean;
  orientation: Orientation;
  modelValue: string;
  delayDuration: number;
  skipDelayDuration: number;
  disableClickTrigger: boolean;
  disableHoverTrigger: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string;
  }) => any;
}>;
type __VLS_WithSlots$132<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuRoot.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuSub.vue.d.ts
type NavigationMenuSubEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: string];
};
interface NavigationMenuSubProps extends PrimitiveProps {
  /** The controlled value of the sub menu item to activate. Can be used as `v-model`. */
  modelValue?: string;
  /**
   * The value of the menu item that should be active when initially rendered.
   *
   * Use when you do not need to control the value state.
   */
  defaultValue?: string;
  /** The orientation of the menu. */
  orientation?: Orientation;
}
declare const _default$140: __VLS_WithSlots$131<vue33.DefineComponent<NavigationMenuSubProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: string) => any;
}, string, vue33.PublicProps, Readonly<NavigationMenuSubProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
}>, {
  orientation: Orientation;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string;
  }) => any;
}>;
type __VLS_WithSlots$131<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuSub.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuTrigger.vue.d.ts
interface NavigationMenuTriggerProps extends PrimitiveProps {
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
}
declare const _default$139: __VLS_WithSlots$130<vue33.DefineComponent<NavigationMenuTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NavigationMenuTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$130<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuTrigger.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuViewport.vue.d.ts
interface NavigationMenuViewportProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
  /**
   * Placement of the viewport for css variables `(--reka-navigation-menu-viewport-left, --reka-navigation-menu-viewport-top)`.
   * @defaultValue 'center'
   */
  align?: 'start' | 'center' | 'end';
}
declare const _default$138: __VLS_WithSlots$129<vue33.DefineComponent<NavigationMenuViewportProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NavigationMenuViewportProps> & Readonly<{}>, {
  align: "start" | "center" | "end";
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$129<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuViewport.vue.d.ts.map
//#endregion
//#region src/NumberField/NumberFieldDecrement.vue.d.ts
interface NumberFieldDecrementProps extends PrimitiveProps {
  disabled?: boolean;
}
declare const _default$137: __VLS_WithSlots$128<vue33.DefineComponent<NumberFieldDecrementProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NumberFieldDecrementProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$128<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NumberFieldDecrement.vue.d.ts.map
//#endregion
//#region src/NumberField/NumberFieldIncrement.vue.d.ts
interface NumberFieldIncrementProps extends PrimitiveProps {
  disabled?: boolean;
}
declare const _default$136: __VLS_WithSlots$127<vue33.DefineComponent<NumberFieldIncrementProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NumberFieldIncrementProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$127<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NumberFieldIncrement.vue.d.ts.map
//#endregion
//#region src/NumberField/NumberFieldInput.vue.d.ts
interface NumberFieldInputProps extends PrimitiveProps {}
declare const _default$135: __VLS_WithSlots$126<vue33.DefineComponent<NumberFieldInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<NumberFieldInputProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$126<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NumberFieldInput.vue.d.ts.map
//#endregion
//#region src/NumberField/NumberFieldRoot.vue.d.ts
interface NumberFieldRootProps extends PrimitiveProps, FormFieldProps {
  defaultValue?: number;
  modelValue?: number | null;
  /** The smallest value allowed for the input. */
  min?: number;
  /** The largest value allowed for the input. */
  max?: number;
  /** The amount that the input value changes with each increment or decrement "tick". */
  step?: number;
  /** When `false`, prevents the value from snapping to the nearest increment of the step value */
  stepSnapping?: boolean;
  /** When `true`, the input will be focused when the value changes. */
  focusOnChange?: boolean;
  /** Formatting options for the value displayed in the number field. This also affects what characters are allowed to be typed by the user. */
  formatOptions?: Intl.NumberFormatOptions;
  /** The locale to use for formatting and currencies */
  locale?: string;
  /** When `true`, prevents the user from interacting with the Number Field. */
  disabled?: boolean;
  /** When `true`, the Number Field is read-only. */
  readonly?: boolean;
  /** When `true`, prevents the value from changing on wheel scroll. */
  disableWheelChange?: boolean;
  /** When `true`, inverts the direction of the wheel change. */
  invertWheelChange?: boolean;
  /** Id of the element */
  id?: string;
}
type NumberFieldRootEmits = {
  'update:modelValue': [val: number];
};
interface NumberFieldRootContext {
  modelValue: Ref<number | undefined>;
  handleIncrease: (multiplier?: number) => void;
  handleDecrease: (multiplier?: number) => void;
  handleMinMaxValue: (type: 'min' | 'max') => void;
  inputEl: Ref<HTMLInputElement | undefined>;
  onInputElement: (el: HTMLInputElement) => void;
  inputMode: Ref<HTMLAttributes['inputmode']>;
  textValue: Ref<string>;
  validate: (val: string) => boolean;
  applyInputValue: (val: string) => void;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  disableWheelChange: Ref<boolean>;
  invertWheelChange: Ref<boolean>;
  max: Ref<number | undefined>;
  min: Ref<number | undefined>;
  isDecreaseDisabled: Ref<boolean>;
  isIncreaseDisabled: Ref<boolean>;
  id: Ref<string | undefined>;
}
declare const injectNumberFieldRootContext: <T extends NumberFieldRootContext | null | undefined = NumberFieldRootContext>(fallback?: T | undefined) => T extends null ? NumberFieldRootContext | null : NumberFieldRootContext, provideNumberFieldRootContext: (contextValue: NumberFieldRootContext) => NumberFieldRootContext;
declare const _default$134: __VLS_WithSlots$125<vue33.DefineComponent<NumberFieldRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (val: number) => any;
}, string, vue33.PublicProps, Readonly<NumberFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((val: number) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  defaultValue: number;
  step: number;
  stepSnapping: boolean;
  focusOnChange: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: number | undefined;
    textValue: string;
    readonly: boolean;
  }) => any;
}>;
type __VLS_WithSlots$125<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NumberFieldRoot.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationEllipsis.vue.d.ts
interface PaginationEllipsisProps extends PrimitiveProps {}
declare const _default$133: __VLS_WithSlots$124<vue33.DefineComponent<PaginationEllipsisProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PaginationEllipsisProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$124<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationEllipsis.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationFirst.vue.d.ts
interface PaginationFirstProps extends PrimitiveProps {}
declare const _default$132: __VLS_WithSlots$123<vue33.DefineComponent<PaginationFirstProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PaginationFirstProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$123<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationFirst.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationLast.vue.d.ts
interface PaginationLastProps extends PrimitiveProps {}
declare const _default$131: __VLS_WithSlots$122<vue33.DefineComponent<PaginationLastProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PaginationLastProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$122<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationLast.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationList.vue.d.ts
interface PaginationListProps extends PrimitiveProps {}
declare const _default$130: __VLS_WithSlots$121<vue33.DefineComponent<PaginationListProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PaginationListProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Pages item */
    items: ({
      type: "ellipsis";
    } | {
      type: "page";
      value: number;
    })[];
  }) => any;
}>;
type __VLS_WithSlots$121<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationList.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationListItem.vue.d.ts
interface PaginationListItemProps extends PrimitiveProps {
  /** Value for the page */
  value: number;
}
declare const _default$129: __VLS_WithSlots$120<vue33.DefineComponent<PaginationListItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PaginationListItemProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$120<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationListItem.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationNext.vue.d.ts
interface PaginationNextProps extends PrimitiveProps {}
declare const _default$128: __VLS_WithSlots$119<vue33.DefineComponent<PaginationNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PaginationNextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$119<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationNext.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationPrev.vue.d.ts
interface PaginationPrevProps extends PrimitiveProps {}
declare const _default$127: __VLS_WithSlots$118<vue33.DefineComponent<PaginationPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PaginationPrevProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$118<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationPrev.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationRoot.vue.d.ts
type PaginationRootContext = {
  page: Ref<number>;
  onPageChange: (value: number) => void;
  pageCount: Ref<number>;
  siblingCount: Ref<number>;
  disabled: Ref<boolean>;
  showEdges: Ref<boolean>;
};
interface PaginationRootProps extends PrimitiveProps {
  /** The controlled value of the current page. Can be binded as `v-model:page`. */
  page?: number;
  /**
   * The value of the page that should be active when initially rendered.
   *
   * Use when you do not need to control the value state.
   */
  defaultPage?: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Number of items in your list */
  total?: number;
  /** Number of sibling should be shown around the current page */
  siblingCount?: number;
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
  /** When `true`, always show first page, last page, and ellipsis */
  showEdges?: boolean;
}
type PaginationRootEmits = {
  /** Event handler called when the page value changes */
  'update:page': [value: number];
};
declare const injectPaginationRootContext: <T extends PaginationRootContext | null | undefined = PaginationRootContext>(fallback?: T | undefined) => T extends null ? PaginationRootContext | null : PaginationRootContext, providePaginationRootContext: (contextValue: PaginationRootContext) => PaginationRootContext;
declare const _default$126: __VLS_WithSlots$117<vue33.DefineComponent<PaginationRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:page": (value: number) => any;
}, string, vue33.PublicProps, Readonly<PaginationRootProps> & Readonly<{
  "onUpdate:page"?: ((value: number) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  defaultPage: number;
  total: number;
  siblingCount: number;
  showEdges: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current page state */
    page: number;
    /** Number of pages */
    pageCount: number;
  }) => any;
}>;
type __VLS_WithSlots$117<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationRoot.vue.d.ts.map
//#endregion
//#region src/PinInput/PinInputInput.vue.d.ts
interface PinInputInputProps extends PrimitiveProps {
  /** Position of the value this input binds to. */
  index: number;
  /** When `true`, prevents the user from interacting with the pin input */
  disabled?: boolean;
}
declare const _default$125: __VLS_WithSlots$116<vue33.DefineComponent<PinInputInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PinInputInputProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$116<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PinInputInput.vue.d.ts.map
//#endregion
//#region src/PinInput/PinInputRoot.vue.d.ts
type PinInputType = 'text' | 'number';
type PinInputValue<Type extends PinInputType> = [Type] extends ['number'] ? number[] : string[];
type PinInputContextValue<Type extends PinInputType = 'text'> = Type extends 'number' ? Type extends 'string' ? string[] | number[] : number[] : string[];
type PinInputRootEmits<Type extends PinInputType = 'text'> = {
  'update:modelValue': [value: PinInputValue<Type>];
  'complete': [value: PinInputValue<Type>];
};
interface PinInputRootProps<Type extends PinInputType = 'text'> extends PrimitiveProps, FormFieldProps {
  /** The controlled checked state of the pin input. Can be binded as `v-model`. */
  modelValue?: PinInputValue<Type> | null;
  /** The default value of the pin inputs when it is initially rendered. Use when you do not need to control its checked state. */
  defaultValue?: PinInputValue<Type>;
  /** The placeholder character to use for empty pin-inputs. */
  placeholder?: string;
  /** When `true`, pin inputs will be treated as password. */
  mask?: boolean;
  /** When `true`, mobile devices will autodetect the OTP from messages or clipboard, and enable the autocomplete field. */
  otp?: boolean;
  /** Input type for the inputs. */
  type?: Type;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** When `true`, prevents the user from interacting with the pin input */
  disabled?: boolean;
  /** Id of the element */
  id?: string;
}
interface PinInputRootContext<Type extends PinInputType = 'text'> {
  modelValue: Ref<PinInputContextValue<Type>>;
  currentModelValue: ComputedRef<PinInputContextValue<Type>>;
  mask: Ref<boolean>;
  otp: Ref<boolean>;
  placeholder: Ref<string>;
  type: Ref<PinInputType>;
  dir: Ref<Direction>;
  disabled: Ref<boolean>;
  isCompleted: ComputedRef<boolean>;
  inputElements?: Ref<Set<HTMLInputElement>>;
  onInputElementChange: (el: HTMLInputElement) => void;
  isNumericMode: ComputedRef<boolean>;
}
declare const injectPinInputRootContext: <T extends PinInputRootContext<PinInputType> | null | undefined = PinInputRootContext<PinInputType>>(fallback?: T | undefined) => T extends null ? PinInputRootContext<PinInputType> | null : PinInputRootContext<PinInputType>, providePinInputRootContext: (contextValue: PinInputRootContext<PinInputType>) => PinInputRootContext<PinInputType>;
declare const _default$124: <Type extends PinInputType>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$7<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$7<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: PinInputValue<Type>) => any) | undefined;
    readonly onComplete?: ((value: PinInputValue<Type>) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue" | "onComplete"> & PinInputRootProps<Type> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current input values */
      modelValue: PinInputValue<Type>;
    }) => any;
  };
  emit: ((evt: "update:modelValue", value: PinInputValue<Type>) => void) & ((evt: "complete", value: PinInputValue<Type>) => void);
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$7<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=PinInputRoot.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverAnchor.vue.d.ts
interface PopoverAnchorProps extends PopperAnchorProps {}
declare const _default$123: __VLS_WithSlots$115<vue33.DefineComponent<PopoverAnchorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PopoverAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$115<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverAnchor.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverArrow.vue.d.ts
interface PopoverArrowProps extends PopperArrowProps {}
declare const _default$122: __VLS_WithSlots$114<vue33.DefineComponent<PopoverArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PopoverArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$114<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverArrow.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverClose.vue.d.ts
interface PopoverCloseProps extends PrimitiveProps {}
declare const _default$121: __VLS_WithSlots$113<vue33.DefineComponent<PopoverCloseProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PopoverCloseProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$113<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverClose.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverContentImpl.vue.d.ts
type PopoverContentImplEmits = DismissableLayerEmits & {
  /**
   * Event handler called when auto-focusing on open.
   * Can be prevented.
   */
  openAutoFocus: [event: Event];
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  closeAutoFocus: [event: Event];
};
interface PopoverContentImplProps extends PopperContentProps, DismissableLayerProps {}
//#endregion
//#region src/Popover/PopoverContent.vue.d.ts
type PopoverContentEmits = PopoverContentImplEmits;
interface PopoverContentProps extends PopoverContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$120: __VLS_WithSlots$112<vue33.DefineComponent<PopoverContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<PopoverContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$112<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverContent.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverPortal.vue.d.ts
interface PopoverPortalProps extends TeleportProps {}
declare const _default$119: __VLS_WithSlots$111<vue33.DefineComponent<PopoverPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PopoverPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$111<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverPortal.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverRoot.vue.d.ts
interface PopoverRootProps {
  /**
   * The open state of the popover when it is initially rendered. Use when you do not need to control its open state.
   */
  defaultOpen?: boolean;
  /**
   * The controlled open state of the popover.
   */
  open?: boolean;
  /**
   * The modality of the popover. When set to true, interaction with outside elements will be disabled and only popover content will be visible to screen readers.
   *
   * @defaultValue false
   */
  modal?: boolean;
}
type PopoverRootEmits = {
  /**
   * Event handler called when the open state of the popover changes.
   */
  'update:open': [value: boolean];
};
interface PopoverRootContext {
  triggerElement: Ref<HTMLElement | undefined>;
  triggerId: string;
  contentId: string;
  open: Ref<boolean>;
  modal: Ref<boolean>;
  onOpenChange: (value: boolean) => void;
  onOpenToggle: () => void;
  hasCustomAnchor: Ref<boolean>;
}
declare const injectPopoverRootContext: <T extends PopoverRootContext | null | undefined = PopoverRootContext>(fallback?: T | undefined) => T extends null ? PopoverRootContext | null : PopoverRootContext, providePopoverRootContext: (contextValue: PopoverRootContext) => PopoverRootContext;
declare const _default$118: __VLS_WithSlots$110<vue33.DefineComponent<PopoverRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<PopoverRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  modal: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
    /** Close the popover */
    close: () => void;
  }) => any;
}>;
type __VLS_WithSlots$110<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverRoot.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverTrigger.vue.d.ts
interface PopoverTriggerProps extends PrimitiveProps {}
declare const _default$117: __VLS_WithSlots$109<vue33.DefineComponent<PopoverTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<PopoverTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$109<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverTrigger.vue.d.ts.map
//#endregion
//#region src/Presence/Presence.d.ts
interface PresenceProps {
  /**
   * Conditional to mount or unmount the child element. Similar to `v-if`
   *
   * @required true
   */
  present: boolean;
  /**
   * Force the element to render all the time.
   *
   * Useful for programmatically render grandchild component with the exposed `present`
   *
   * @defaultValue false
   */
  forceMount?: boolean;
}
declare const _default$116: vue33.DefineComponent<vue33.ExtractPropTypes<{
  present: {
    type: BooleanConstructor;
    required: true;
  };
  forceMount: {
    type: BooleanConstructor;
  };
}>, () => VNode<vue33.RendererNode, vue33.RendererElement, {
  [key: string]: any;
}> | null, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<vue33.ExtractPropTypes<{
  present: {
    type: BooleanConstructor;
    required: true;
  };
  forceMount: {
    type: BooleanConstructor;
  };
}>> & Readonly<{}>, {
  forceMount: boolean;
}, SlotsType<{
  default: (opts: {
    present: boolean;
  }) => any;
}>, {}, {}, string, vue33.ComponentProvideOptions, true, {}, any>;
//#endregion
//#region src/Progress/ProgressIndicator.vue.d.ts
interface ProgressIndicatorProps extends PrimitiveProps {}
declare const _default$115: __VLS_WithSlots$108<vue33.DefineComponent<ProgressIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ProgressIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$108<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ProgressIndicator.vue.d.ts.map
//#endregion
//#region src/Progress/ProgressRoot.vue.d.ts
type ProgressRootEmits = {
  /** Event handler called when the progress value changes */
  'update:modelValue': [value: string[] | undefined];
  /** Event handler called when the max value changes */
  'update:max': [value: number];
};
interface ProgressRootProps extends PrimitiveProps {
  /** The progress value. Can be bind as `v-model`. */
  modelValue?: number | null;
  /** The maximum progress value. */
  max?: number;
  /**
   * A function to get the accessible label text in a human-readable format.
   *
   *  If not provided, the value label will be read as the numeric value as a percentage of the max value.
   */
  getValueLabel?: (value: number | null | undefined, max: number) => string | undefined;
  /**
   * A function to get the accessible value text representing the current value in a human-readable format.
   */
  getValueText?: (value: number | null | undefined, max: number) => string | undefined;
}
interface ProgressRootContext {
  modelValue?: Readonly<Ref<ProgressRootProps['modelValue']>>;
  max: Readonly<Ref<number>>;
  progressState: ComputedRef<ProgressState>;
}
declare const injectProgressRootContext: <T extends ProgressRootContext | null | undefined = ProgressRootContext>(fallback?: T | undefined) => T extends null ? ProgressRootContext | null : ProgressRootContext, provideProgressRootContext: (contextValue: ProgressRootContext) => ProgressRootContext;
type ProgressState = 'indeterminate' | 'loading' | 'complete';
declare const _default$114: __VLS_WithSlots$107<vue33.DefineComponent<ProgressRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: string[] | undefined) => any;
  "update:max": (value: number) => any;
}, string, vue33.PublicProps, Readonly<ProgressRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string[] | undefined) => any) | undefined;
  "onUpdate:max"?: ((value: number) => any) | undefined;
}>, {
  max: number;
  getValueLabel: (value: number | null | undefined, max: number) => string | undefined;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: number | null | undefined;
  }) => any;
}>;
type __VLS_WithSlots$107<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ProgressRoot.vue.d.ts.map
//#endregion
//#region src/RadioGroup/RadioGroupIndicator.vue.d.ts
interface RadioGroupIndicatorProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$113: __VLS_WithSlots$106<vue33.DefineComponent<RadioGroupIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RadioGroupIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$106<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RadioGroupIndicator.vue.d.ts.map
//#endregion
//#region src/RadioGroup/utils.d.ts
type SelectEvent$2 = CustomEvent<{
  originalEvent: MouseEvent;
  value?: AcceptableValue;
}>;
//#endregion
//#region src/RadioGroup/Radio.vue.d.ts
interface RadioProps extends PrimitiveProps, FormFieldProps {
  id?: string;
  /** The value given as data when submitted with a `name`. */
  value?: AcceptableValue;
  /** When `true`, prevents the user from interacting with the radio item. */
  disabled?: boolean;
  checked?: boolean;
}
//#endregion
//#region src/RadioGroup/RadioGroupItem.vue.d.ts
interface RadioGroupItemProps extends Omit<RadioProps, 'checked'> {}
type RadioGroupItemEmits = {
  select: [event: SelectEvent$2];
};
interface RadioGroupItemContext {
  disabled: ComputedRef<boolean>;
  checked: ComputedRef<boolean>;
}
declare const injectRadioGroupItemContext: <T extends RadioGroupItemContext | null | undefined = RadioGroupItemContext>(fallback?: T | undefined) => T extends null ? RadioGroupItemContext | null : RadioGroupItemContext, provideRadiogroupItemContext: (contextValue: RadioGroupItemContext) => RadioGroupItemContext;
declare const _default$112: __VLS_WithSlots$105<vue33.DefineComponent<RadioGroupItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  select: (event: SelectEvent$2) => any;
}, string, vue33.PublicProps, Readonly<RadioGroupItemProps> & Readonly<{
  onSelect?: ((event: SelectEvent$2) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current checked state */
    checked: boolean;
    /** Required state */
    required: boolean;
    /** Disabled state */
    disabled: boolean;
  }) => any;
}>;
type __VLS_WithSlots$105<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RadioGroupItem.vue.d.ts.map
//#endregion
//#region src/RadioGroup/RadioGroupRoot.vue.d.ts
interface RadioGroupRootProps extends PrimitiveProps, FormFieldProps {
  /** The controlled value of the radio item to check. Can be binded as `v-model`. */
  modelValue?: AcceptableValue;
  /**
   * The value of the radio item that should be checked when initially rendered.
   *
   * Use when you do not need to control the state of the radio items.
   */
  defaultValue?: AcceptableValue;
  /** When `true`, prevents the user from interacting with radio items. */
  disabled?: boolean;
  /** The orientation of the component. */
  orientation?: DataOrientation;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** When `true`, keyboard navigation will loop from last item to first, and vice versa. */
  loop?: boolean;
}
type RadioGroupRootEmits = {
  /** Event handler called when the radio group value changes */
  'update:modelValue': [payload: AcceptableValue];
};
interface RadioGroupRootContext {
  modelValue?: Readonly<Ref<AcceptableValue | undefined>>;
  changeModelValue: (value?: AcceptableValue) => void;
  disabled: Ref<boolean>;
  loop: Ref<boolean>;
  orientation: Ref<DataOrientation | undefined>;
  name?: string;
  required: Ref<boolean>;
}
declare const injectRadioGroupRootContext: <T extends RadioGroupRootContext | null | undefined = RadioGroupRootContext>(fallback?: T | undefined) => T extends null ? RadioGroupRootContext | null : RadioGroupRootContext, provideRadioGroupRootContext: (contextValue: RadioGroupRootContext) => RadioGroupRootContext;
declare const _default$111: __VLS_WithSlots$104<vue33.DefineComponent<RadioGroupRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue) => any;
}, string, vue33.PublicProps, Readonly<RadioGroupRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue) => any) | undefined;
}>, {
  required: boolean;
  disabled: boolean;
  orientation: DataOrientation;
  loop: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: AcceptableValue | undefined;
  }) => any;
}>;
type __VLS_WithSlots$104<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RadioGroupRoot.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarCell.vue.d.ts
interface RangeCalendarCellProps extends PrimitiveProps {
  date: DateValue;
}
declare const _default$110: __VLS_WithSlots$103<vue33.DefineComponent<RangeCalendarCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$103<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarCell.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGrid.vue.d.ts
interface RangeCalendarGridProps extends PrimitiveProps {}
declare const _default$109: __VLS_WithSlots$102<vue33.DefineComponent<RangeCalendarGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarGridProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$102<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGrid.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGridBody.vue.d.ts
interface RangeCalendarGridBodyProps extends PrimitiveProps {}
declare const _default$108: __VLS_WithSlots$101<vue33.DefineComponent<RangeCalendarGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$101<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGridBody.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGridHead.vue.d.ts
interface RangeCalendarGridHeadProps extends PrimitiveProps {}
declare const _default$107: __VLS_WithSlots$100<vue33.DefineComponent<RangeCalendarGridHeadProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarGridHeadProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$100<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGridHead.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGridRow.vue.d.ts
interface RangeCalendarGridRowProps extends PrimitiveProps {}
declare const _default$106: __VLS_WithSlots$99<vue33.DefineComponent<RangeCalendarGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarGridRowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$99<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGridRow.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarHeadCell.vue.d.ts
interface RangeCalendarHeadCellProps extends PrimitiveProps {}
declare const _default$105: __VLS_WithSlots$98<vue33.DefineComponent<RangeCalendarHeadCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarHeadCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$98<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarHeadCell.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarHeader.vue.d.ts
interface RangeCalendarHeaderProps extends PrimitiveProps {}
declare const _default$104: __VLS_WithSlots$97<vue33.DefineComponent<RangeCalendarHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarHeaderProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$97<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarHeader.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarHeading.vue.d.ts
interface RangeCalendarHeadingProps extends PrimitiveProps {}
declare const _default$103: __VLS_WithSlots$96<vue33.DefineComponent<RangeCalendarHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<RangeCalendarHeadingProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$96<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarHeading.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarRoot.vue.d.ts
type RangeCalendarRootContext = {
  modelValue: Ref<DateRange>;
  startValue: Ref<DateValue | undefined>;
  endValue: Ref<DateValue | undefined>;
  locale: Ref<string>;
  placeholder: Ref<DateValue>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue>[]>;
  weekDays: Ref<string[]>;
  weekStartsOn: Ref<WeekStartsOn>;
  weekdayFormat: Ref<WeekDayFormat>;
  fixedWeeks: Ref<boolean>;
  numberOfMonths: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onPlaceholderChange: (date: DateValue) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  isInvalid: Ref<boolean>;
  isDateDisabled: Matcher;
  isDateUnavailable?: Matcher;
  isDateHighlightable?: Matcher;
  isOutsideVisibleView: (date: DateValue) => boolean;
  allowNonContiguousRanges: Ref<boolean>;
  highlightedRange: Ref<{
    start: DateValue;
    end: DateValue;
  } | null>;
  focusedValue: Ref<DateValue | undefined>;
  lastPressedDateValue: Ref<DateValue | undefined>;
  isSelected: (date: DateValue) => boolean;
  isSelectionEnd: (date: DateValue) => boolean;
  isSelectionStart: (date: DateValue) => boolean;
  isHighlightedStart: (date: DateValue) => boolean;
  isHighlightedEnd: (date: DateValue) => boolean;
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void;
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  disableDaysOutsideCurrentView: Ref<boolean>;
  fixedDate: Ref<'start' | 'end' | undefined>;
  maximumDays: Ref<number | undefined>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
  isPlaceholderFocusable: Ref<boolean>;
  firstFocusableDate: Ref<DateValue | undefined>;
  hasSelectedDate: Ref<boolean>;
  isSelectedDisabled: Ref<boolean>;
  selectedFocusableDate: Ref<DateValue | undefined>;
};
interface RangeCalendarRootProps extends PrimitiveProps {
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The default value for the calendar */
  defaultValue?: DateRange;
  /** The controlled selected date range of the calendar. Can be bound as `v-model`. */
  modelValue?: DateRange | null;
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue;
  /** When combined with `isDateUnavailable`, determines whether non-contiguous ranges, i.e. ranges containing unavailable dates, may be selected. */
  allowNonContiguousRanges?: boolean;
  /** This property causes the previous and next buttons to navigate by the number of months displayed at once, rather than one month */
  pagedNavigation?: boolean;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The maximum number of days that can be selected in a range */
  maximumDays?: number;
  /** The day of the week to start the calendar on */
  weekStartsOn?: WeekStartsOn;
  /** The format to use for the weekday strings provided via the weekdays slot prop */
  weekdayFormat?: WeekDayFormat;
  /** The accessible label for the calendar */
  calendarLabel?: string;
  /** Whether or not to always display 6 weeks in the calendar */
  fixedWeeks?: boolean;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** The number of months to display at once */
  numberOfMonths?: number;
  /** Whether or not the calendar is disabled */
  disabled?: boolean;
  /** Whether or not the calendar is readonly */
  readonly?: boolean;
  /** If true, the calendar will focus the selected day, today, or the first day of the month depending on what is visible when the calendar is mounted */
  initialFocus?: boolean;
  /** A function that returns whether or not a date is disabled */
  isDateDisabled?: Matcher;
  /** A function that returns whether or not a date is unavailable */
  isDateUnavailable?: Matcher;
  /** A function that returns whether or not a date is hightable */
  isDateHighlightable?: Matcher;
  /** The reading direction of the calendar when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** A function that returns the next page of the calendar. It receives the current placeholder as an argument inside the component. */
  nextPage?: (placeholder: DateValue) => DateValue;
  /** A function that returns the previous page of the calendar. It receives the current placeholder as an argument inside the component. */
  prevPage?: (placeholder: DateValue) => DateValue;
  /** Whether or not to disable days outside the current view. */
  disableDaysOutsideCurrentView?: boolean;
  /** Which part of the range should be fixed */
  fixedDate?: 'start' | 'end';
}
type RangeCalendarRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateRange];
  /** Event handler called whenever there is a new validModel */
  'update:validModelValue': [date: DateRange];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
  /** Event handler called whenever the start value changes */
  'update:startValue': [date: DateValue | undefined];
};
declare const injectRangeCalendarRootContext: <T extends RangeCalendarRootContext | null | undefined = RangeCalendarRootContext>(fallback?: T | undefined) => T extends null ? RangeCalendarRootContext | null : RangeCalendarRootContext, provideRangeCalendarRootContext: (contextValue: RangeCalendarRootContext) => RangeCalendarRootContext;
declare const _default$102: __VLS_WithSlots$95<vue33.DefineComponent<RangeCalendarRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateRange) => any;
  "update:validModelValue": (date: DateRange) => any;
  "update:placeholder": (date: DateValue) => any;
  "update:startValue": (date: DateValue | undefined) => any;
}, string, vue33.PublicProps, Readonly<RangeCalendarRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:validModelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
  "onUpdate:startValue"?: ((date: DateValue | undefined) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: DateRange;
  placeholder: DateValue;
  readonly: boolean;
  allowNonContiguousRanges: boolean;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  maximumDays: number;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  initialFocus: boolean;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  isDateHighlightable: Matcher;
  disableDaysOutsideCurrentView: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue;
    /** The grid of dates */
    grid: Grid<DateValue>[];
    /** The days of the week */
    weekDays: string[];
    /** The start of the week */
    weekStartsOn: WeekStartsOn;
    /** The calendar locale */
    locale: string;
    /** Whether or not to always display 6 weeks in the calendar */
    fixedWeeks: boolean;
    /** The current date range */
    modelValue: DateRange;
  }) => any;
}>;
type __VLS_WithSlots$95<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarRoot.vue.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaCorner.vue.d.ts
interface ScrollAreaCornerProps extends PrimitiveProps {}
declare const _default$101: __VLS_WithSlots$94<vue33.DefineComponent<ScrollAreaCornerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ScrollAreaCornerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$94<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaCorner.vue.d.ts.map
//#endregion
//#region src/ScrollArea/types.d.ts
type Direction$2 = 'ltr' | 'rtl';
type ScrollType = 'auto' | 'always' | 'scroll' | 'hover' | 'glimpse';
//# sourceMappingURL=types.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaRoot.vue.d.ts
interface ScrollAreaRootContext {
  type: Ref<ScrollType>;
  dir: Ref<Direction$2>;
  scrollHideDelay: Ref<number>;
  scrollArea: Ref<HTMLElement | undefined>;
  viewport: Ref<HTMLElement | undefined>;
  onViewportChange: (viewport: HTMLElement | null) => void;
  content: Ref<HTMLElement | undefined>;
  onContentChange: (content: HTMLElement) => void;
  scrollbarX: Ref<HTMLElement | undefined>;
  onScrollbarXChange: (scrollbar: HTMLElement | null) => void;
  scrollbarXEnabled: Ref<boolean>;
  onScrollbarXEnabledChange: (rendered: boolean) => void;
  scrollbarY: Ref<HTMLElement | undefined>;
  onScrollbarYChange: (scrollbar: HTMLElement | null) => void;
  scrollbarYEnabled: Ref<boolean>;
  onScrollbarYEnabledChange: (rendered: boolean) => void;
  onCornerWidthChange: (width: number) => void;
  onCornerHeightChange: (height: number) => void;
}
declare const injectScrollAreaRootContext: <T extends ScrollAreaRootContext | null | undefined = ScrollAreaRootContext>(fallback?: T | undefined) => T extends null ? ScrollAreaRootContext | null : ScrollAreaRootContext, provideScrollAreaRootContext: (contextValue: ScrollAreaRootContext) => ScrollAreaRootContext;
interface ScrollAreaRootProps extends PrimitiveProps {
  /**
   * Describes the nature of scrollbar visibility, similar to how the scrollbar preferences in MacOS control visibility of native scrollbars.
   *
   * `auto` - means that scrollbars are visible when content is overflowing on the corresponding orientation. <br>
   * `always` - means that scrollbars are always visible regardless of whether the content is overflowing.<br>
   * `scroll` - means that scrollbars are visible when the user is scrolling along its corresponding orientation.<br>
   * `hover` - when the user is scrolling along its corresponding orientation and when the user is hovering over the scroll area.<br>
   * `glimpse` - a hybrid approach that briefly shows scrollbars when the user enters the scroll area, then hides them until further interaction.
   */
  type?: ScrollType;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction$2;
  /** If type is set to either `scroll` or `hover`, this prop determines the length of time, in milliseconds, <br> before the scrollbars are hidden after the user stops interacting with scrollbars. */
  scrollHideDelay?: number;
}
declare const _default$100: __VLS_WithSlots$93<vue33.DefineComponent<ScrollAreaRootProps, {
  /** Viewport element within ScrollArea */
  viewport: Ref<HTMLElement | undefined, HTMLElement | undefined>;
  /** Scroll viewport to top */
  scrollTop: () => void;
  /** Scroll viewport to top-left */
  scrollTopLeft: () => void;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ScrollAreaRootProps> & Readonly<{}>, {
  type: ScrollType;
  scrollHideDelay: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$93<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaRoot.vue.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaScrollbar.vue.d.ts
interface ScrollAreaScrollbarProps extends PrimitiveProps {
  /** The orientation of the scrollbar */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
interface ScrollAreaScrollbarContext {
  as: Ref<PrimitiveProps['as']>;
  orientation: Ref<'vertical' | 'horizontal'>;
  forceMount?: Ref<boolean>;
  isHorizontal: Ref<boolean>;
  asChild: Ref<boolean>;
}
declare const injectScrollAreaScrollbarContext: <T extends ScrollAreaScrollbarContext | null | undefined = ScrollAreaScrollbarContext>(fallback?: T | undefined) => T extends null ? ScrollAreaScrollbarContext | null : ScrollAreaScrollbarContext, provideScrollAreaScrollbarContext: (contextValue: ScrollAreaScrollbarContext) => ScrollAreaScrollbarContext;
declare const _default$99: __VLS_WithSlots$92<vue33.DefineComponent<ScrollAreaScrollbarProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ScrollAreaScrollbarProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  orientation: "vertical" | "horizontal";
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$92<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaScrollbar.vue.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarAuto.vue.d.ts
interface ScrollAreaScrollbarAutoProps {
  forceMount?: boolean;
}
//#endregion
//#region src/ScrollArea/ScrollAreaScrollbarGlimpse.vue.d.ts
interface ScrollAreaScrollbarGlimpseProps extends ScrollAreaScrollbarAutoProps {}
declare const _default$98: __VLS_WithSlots$91<vue33.DefineComponent<ScrollAreaScrollbarGlimpseProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ScrollAreaScrollbarGlimpseProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$91<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaScrollbarGlimpse.vue.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaThumb.vue.d.ts
interface ScrollAreaThumbProps extends PrimitiveProps {}
declare const _default$97: __VLS_WithSlots$90<vue33.DefineComponent<ScrollAreaThumbProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ScrollAreaThumbProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$90<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaThumb.vue.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaViewport.vue.d.ts
interface ScrollAreaViewportProps extends PrimitiveProps {
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string;
}
declare const _default$96: __VLS_WithSlots$89<vue33.DefineComponent<ScrollAreaViewportProps, {
  viewportElement: vue33.Ref<HTMLElement | undefined, HTMLElement | undefined>;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ScrollAreaViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$89<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaViewport.vue.d.ts.map
//#endregion
//#region src/Select/SelectArrow.vue.d.ts
interface SelectArrowProps extends PopperArrowProps {}
declare const _default$95: __VLS_WithSlots$88<vue33.DefineComponent<SelectArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$88<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectArrow.vue.d.ts.map

//#endregion
//#region src/Select/SelectContentImpl.vue.d.ts
type SelectContentImplEmits = {
  closeAutoFocus: [event: Event];
  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  escapeKeyDown: [event: KeyboardEvent];
  /**
   * Event handler called when a `pointerdown` event happens outside of the `DismissableLayer`.
   * Can be prevented.
   */
  pointerDownOutside: [event: PointerDownOutsideEvent];
};
interface SelectContentImplProps extends PopperContentProps, DismissableLayerProps {
  /**
   *  The positioning mode to use
   *
   *  `item-aligned (default)` - behaves similarly to a native MacOS menu by positioning content relative to the active item. <br>
   *  `popper` - positions content in the same way as our other primitives, for example `Popover` or `DropdownMenu`.
   */
  position?: 'item-aligned' | 'popper';
  /**
   * The document.body will be lock, and scrolling will be disabled.
   *
   * @defaultValue true
   */
  bodyLock?: boolean;
}
//#endregion
//#region src/Select/SelectContent.vue.d.ts
type SelectContentEmits = SelectContentImplEmits;
interface SelectContentProps extends SelectContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$94: __VLS_WithSlots$87<vue33.DefineComponent<SelectContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<SelectContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$87<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectContent.vue.d.ts.map
//#endregion
//#region src/Select/SelectGroup.vue.d.ts
interface SelectGroupProps extends PrimitiveProps {}
interface SelectGroupContext {
  id: string;
}
declare const injectSelectGroupContext: <T extends SelectGroupContext | null | undefined = SelectGroupContext>(fallback?: T | undefined) => T extends null ? SelectGroupContext | null : SelectGroupContext, provideSelectGroupContext: (contextValue: SelectGroupContext) => SelectGroupContext;
declare const _default$93: __VLS_WithSlots$86<vue33.DefineComponent<SelectGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$86<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectGroup.vue.d.ts.map
//#endregion
//#region src/Select/SelectIcon.vue.d.ts
interface SelectIconProps extends PrimitiveProps {}
declare const _default$92: __VLS_WithSlots$85<vue33.DefineComponent<SelectIconProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectIconProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$85<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectIcon.vue.d.ts.map
//#endregion
//#region src/Select/SelectItem.vue.d.ts
interface SelectItemContext<T = AcceptableValue> {
  value: T;
  textId: string;
  disabled: Ref<boolean>;
  isSelected: Ref<boolean>;
  onItemTextChange: (node: HTMLElement | undefined) => void;
}
declare const injectSelectItemContext: <T extends SelectItemContext<AcceptableValue> | null | undefined = SelectItemContext<AcceptableValue>>(fallback?: T | undefined) => T extends null ? SelectItemContext<AcceptableValue> | null : SelectItemContext<AcceptableValue>, provideSelectItemContext: (contextValue: SelectItemContext<AcceptableValue>) => SelectItemContext<AcceptableValue>;
type SelectEvent$1<T> = CustomEvent<{
  originalEvent: PointerEvent | KeyboardEvent;
  value?: T;
}>;
interface SelectItemProps<T = AcceptableValue> extends PrimitiveProps {
  /** The value given as data when submitted with a `name`. */
  value: T;
  /** When `true`, prevents the user from interacting with the item. */
  disabled?: boolean;
  /**
   * Optional text used for typeahead purposes.
   *
   * By default the typeahead behavior will use the `.textContent` of the `SelectItemText` part.
   *
   * Use this when the content is complex, or you have non-textual content inside.
   */
  textValue?: string;
}
declare const _default$91: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$6<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$6<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent$1<T>) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onSelect"> & SelectItemProps<AcceptableValue> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "select", event: SelectEvent$1<T>) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$6<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=SelectItem.vue.d.ts.map
//#endregion
//#region src/Select/SelectItemIndicator.vue.d.ts
interface SelectItemIndicatorProps extends PrimitiveProps {}
declare const _default$90: __VLS_WithSlots$84<vue33.DefineComponent<SelectItemIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectItemIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$84<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectItemIndicator.vue.d.ts.map
//#endregion
//#region src/Select/SelectItemText.vue.d.ts
interface SelectItemTextProps extends PrimitiveProps {}
declare const _default$89: __VLS_WithSlots$83<vue33.DefineComponent<SelectItemTextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectItemTextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$83<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectItemText.vue.d.ts.map
//#endregion
//#region src/Select/SelectLabel.vue.d.ts
interface SelectLabelProps extends PrimitiveProps {
  for?: string;
}
declare const _default$88: __VLS_WithSlots$82<vue33.DefineComponent<SelectLabelProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectLabelProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$82<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectLabel.vue.d.ts.map
//#endregion
//#region src/Select/SelectPortal.vue.d.ts
interface SelectPortalProps extends TeleportProps {}
declare const _default$87: __VLS_WithSlots$81<vue33.DefineComponent<SelectPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$81<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectPortal.vue.d.ts.map
//#endregion
//#region src/Select/SelectRoot.vue.d.ts
interface SelectRootProps<T = AcceptableValue> extends FormFieldProps {
  /** The controlled open state of the Select. Can be bind as `v-model:open`. */
  open?: boolean;
  /** The open state of the select when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
  /** The value of the select when initially rendered. Use when you do not need to control the state of the Select */
  defaultValue?: T | Array<T>;
  /** The controlled value of the Select. Can be bind as `v-model`. */
  modelValue?: T | Array<T>;
  /** Use this to compare objects by a particular field, or pass your own comparison function for complete control over how objects are compared. */
  by?: string | ((a: T, b: T) => boolean);
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** Whether multiple options can be selected or not. */
  multiple?: boolean;
  /** Native html input `autocomplete` attribute. */
  autocomplete?: string;
  /** When `true`, prevents the user from interacting with Select */
  disabled?: boolean;
}
type SelectRootEmits<T = AcceptableValue> = {
  /** Event handler called when the value changes. */
  'update:modelValue': [value: T];
  /** Event handler called when the open state of the context menu changes. */
  'update:open': [value: boolean];
};
interface SelectRootContext<T> {
  triggerElement: Ref<HTMLElement | undefined>;
  onTriggerChange: (node: HTMLElement | undefined) => void;
  valueElement: Ref<HTMLElement | undefined>;
  onValueElementChange: (node: HTMLElement) => void;
  contentId: string;
  modelValue: Ref<T | Array<T> | undefined>;
  onValueChange: (value: T) => void;
  open: Ref<boolean>;
  multiple: Ref<boolean>;
  required?: Ref<boolean>;
  by?: string | ((a: T, b: T) => boolean);
  onOpenChange: (open: boolean) => void;
  dir: Ref<Direction>;
  triggerPointerDownPosRef: Ref<{
    x: number;
    y: number;
  } | null>;
  isEmptyModelValue: Ref<boolean>;
  disabled?: Ref<boolean>;
  optionsSet: Ref<Set<SelectOption>>;
  onOptionAdd: (option: SelectOption) => void;
  onOptionRemove: (option: SelectOption) => void;
}
declare const injectSelectRootContext: <T extends SelectRootContext<AcceptableValue> | null | undefined = SelectRootContext<AcceptableValue>>(fallback?: T | undefined) => T extends null ? SelectRootContext<AcceptableValue> | null : SelectRootContext<AcceptableValue>, provideSelectRootContext: (contextValue: SelectRootContext<AcceptableValue>) => SelectRootContext<AcceptableValue>;
interface SelectOption {
  value: any;
  disabled?: boolean;
  textContent: string;
}
declare const _default$86: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$5<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$5<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: T) => any) | undefined;
    readonly "onUpdate:open"?: ((value: boolean) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue" | "onUpdate:open"> & SelectRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current input values */
      modelValue: T | T[] | undefined;
      /** Current open state */
      open: boolean;
    }) => any;
  };
  emit: ((evt: "update:modelValue", value: T) => void) & ((evt: "update:open", value: boolean) => void);
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$5<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=SelectRoot.vue.d.ts.map
//#endregion
//#region src/Select/SelectScrollDownButton.vue.d.ts
interface SelectScrollDownButtonProps extends PrimitiveProps {}
declare const _default$85: __VLS_WithSlots$80<vue33.DefineComponent<SelectScrollDownButtonProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectScrollDownButtonProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$80<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectScrollDownButton.vue.d.ts.map
//#endregion
//#region src/Select/SelectScrollUpButton.vue.d.ts
interface SelectScrollUpButtonProps extends PrimitiveProps {}
declare const _default$84: __VLS_WithSlots$79<vue33.DefineComponent<SelectScrollUpButtonProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectScrollUpButtonProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$79<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectScrollUpButton.vue.d.ts.map
//#endregion
//#region src/Select/SelectSeparator.vue.d.ts
interface SelectSeparatorProps extends PrimitiveProps {}
declare const _default$83: __VLS_WithSlots$78<vue33.DefineComponent<SelectSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$78<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectSeparator.vue.d.ts.map
//#endregion
//#region src/Select/SelectTrigger.vue.d.ts
interface SelectTriggerProps extends PopperAnchorProps {
  disabled?: boolean;
}
declare const _default$82: __VLS_WithSlots$77<vue33.DefineComponent<SelectTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$77<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectTrigger.vue.d.ts.map
//#endregion
//#region src/Select/SelectValue.vue.d.ts
interface SelectValueProps extends PrimitiveProps {
  /** The content that will be rendered inside the `SelectValue` when no `value` or `defaultValue` is set. */
  placeholder?: string;
}
declare const _default$81: __VLS_WithSlots$76<vue33.DefineComponent<SelectValueProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectValueProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  placeholder: string;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    selectedLabel: string[];
    modelValue: AcceptableValue | AcceptableValue[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$76<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectValue.vue.d.ts.map
//#endregion
//#region src/Select/SelectViewport.vue.d.ts
interface SelectViewportProps extends PrimitiveProps {
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string;
}
declare const _default$80: __VLS_WithSlots$75<vue33.DefineComponent<SelectViewportProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SelectViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$75<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectViewport.vue.d.ts.map
//#endregion
//#region src/shared/component/BaseSeparator.vue.d.ts
interface BaseSeparatorProps extends PrimitiveProps {
  /**
   * Orientation of the component.
   *
   * Either `vertical` or `horizontal`. Defaults to `horizontal`.
   */
  orientation?: DataOrientation;
  /**
   * Whether or not the component is purely decorative. <br>When `true`, accessibility-related attributes
   * are updated so that that the rendered element is removed from the accessibility tree.
   */
  decorative?: boolean;
}
//#endregion
//#region src/Separator/Separator.vue.d.ts
interface SeparatorProps extends BaseSeparatorProps {}
declare const _default$79: __VLS_WithSlots$74<vue33.DefineComponent<SeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SeparatorProps> & Readonly<{}>, {
  orientation: DataOrientation;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$74<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=Separator.vue.d.ts.map
//#endregion
//#region src/Slider/SliderRange.vue.d.ts
interface SliderRangeProps extends PrimitiveProps {}
declare const _default$78: __VLS_WithSlots$73<vue33.DefineComponent<SliderRangeProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SliderRangeProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$73<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SliderRange.vue.d.ts.map
//#endregion
//#region src/Slider/SliderRoot.vue.d.ts
type ThumbAlignment = 'contain' | 'overflow';
interface SliderRootProps extends PrimitiveProps, FormFieldProps {
  /** The value of the slider when initially rendered. Use when you do not need to control the state of the slider. */
  defaultValue?: number[];
  /** The controlled value of the slider. Can be bind as `v-model`. */
  modelValue?: number[] | null;
  /** When `true`, prevents the user from interacting with the slider. */
  disabled?: boolean;
  /** The orientation of the slider. */
  orientation?: DataOrientation;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** Whether the slider is visually inverted. */
  inverted?: boolean;
  /** The minimum value for the range. */
  min?: number;
  /** The maximum value for the range. */
  max?: number;
  /** The stepping interval. */
  step?: number;
  /** The minimum permitted steps between multiple thumbs. */
  minStepsBetweenThumbs?: number;
  /**
   * The alignment of the slider thumb.
   * - `contain`: thumbs will be contained within the bounds of the track.
   * - `overflow`: thumbs will not be bound by the track. No extra offset will be added.
   * @defaultValue 'contain'
   */
  thumbAlignment?: ThumbAlignment;
}
type SliderRootEmits = {
  /**
   * Event handler called when the slider value changes
   */
  'update:modelValue': [payload: number[] | undefined];
  /**
   * Event handler called when the value changes at the end of an interaction.
   *
   * Useful when you only need to capture a final value e.g. to update a backend service.
   */
  'valueCommit': [payload: number[]];
};
interface SliderRootContext {
  orientation: Ref<DataOrientation>;
  disabled: Ref<boolean>;
  min: Ref<number>;
  max: Ref<number>;
  modelValue?: Readonly<Ref<number[] | null | undefined>>;
  currentModelValue: ComputedRef<number[]>;
  valueIndexToChangeRef: Ref<number>;
  thumbElements: Ref<HTMLElement[]>;
  thumbAlignment: Ref<ThumbAlignment>;
}
declare const injectSliderRootContext: <T extends SliderRootContext | null | undefined = SliderRootContext>(fallback?: T | undefined) => T extends null ? SliderRootContext | null : SliderRootContext, provideSliderRootContext: (contextValue: SliderRootContext) => SliderRootContext;
declare const _default$77: __VLS_WithSlots$72<vue33.DefineComponent<SliderRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: number[] | undefined) => any;
  valueCommit: (payload: number[]) => any;
}, string, vue33.PublicProps, Readonly<SliderRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: number[] | undefined) => any) | undefined;
  onValueCommit?: ((payload: number[]) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  orientation: DataOrientation;
  defaultValue: number[];
  step: number;
  inverted: boolean;
  max: number;
  min: number;
  minStepsBetweenThumbs: number;
  thumbAlignment: ThumbAlignment;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current slider values */
    modelValue: number[] | null;
  }) => any;
}>;
type __VLS_WithSlots$72<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SliderRoot.vue.d.ts.map
//#endregion
//#region src/Slider/SliderThumb.vue.d.ts
interface SliderThumbProps extends PrimitiveProps {}
declare const _default$76: __VLS_WithSlots$71<vue33.DefineComponent<SliderThumbProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SliderThumbProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$71<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SliderThumb.vue.d.ts.map
//#endregion
//#region src/Slider/SliderTrack.vue.d.ts
interface SliderTrackProps extends PrimitiveProps {}
declare const _default$75: __VLS_WithSlots$70<vue33.DefineComponent<SliderTrackProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SliderTrackProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$70<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SliderTrack.vue.d.ts.map
//#endregion
//#region src/Splitter/SplitterPanel.vue.d.ts
interface SplitterPanelProps extends PrimitiveProps {
  /** The size of panel when it is collapsed; interpreted using `sizeUnit`. */
  collapsedSize?: number;
  /** Should panel collapse when resized beyond its `minSize`. When `true`, it will be collapsed to `collapsedSize`. */
  collapsible?: boolean;
  /** Initial size of panel, interpreted using `sizeUnit` (percent by default). */
  defaultSize?: number;
  /** Panel id (unique within group); falls back to `useId` when not provided */
  id?: string;
  /** The maximum allowable size of panel, interpreted using `sizeUnit`; defaults to `100` (percent). */
  maxSize?: number;
  /** The minimum allowable size of panel, interpreted using `sizeUnit`; defaults to `10` (percent). */
  minSize?: number;
  /** The order of panel within group; required for groups with conditionally rendered panels */
  order?: number;
  /** Unit used for sizing values; `%` by default, or `px` for fixed sizing. */
  sizeUnit?: '%' | 'px';
}
type SplitterPanelEmits = {
  /** Event handler called when panel is collapsed. */
  collapse: [];
  /** Event handler called when panel is expanded. */
  expand: [];
  /** Event handler called when panel is resized; size parameter is a numeric value between 1-100.  */
  resize: [size: number, prevSize: number | undefined];
};
type PanelOnCollapse = () => void;
type PanelOnExpand = () => void;
type PanelOnResize = (size: number, prevSize: number | undefined) => void;
type PanelCallbacks = {
  onCollapse?: PanelOnCollapse;
  onExpand?: PanelOnExpand;
  onResize?: PanelOnResize;
};
type PanelConstraints = {
  collapsedSize?: number | undefined;
  collapsible?: boolean | undefined;
  defaultSize?: number | undefined;
  /** Panel id (unique within group); falls back to useId when not provided */
  maxSize?: number | undefined;
  minSize?: number | undefined;
  sizeUnit?: '%' | 'px' | undefined;
};
type PanelData = {
  callbacks: PanelCallbacks;
  constraints: PanelConstraints;
  id: string;
  idIsFromProps: boolean;
  order: number | undefined;
};
declare const _default$74: __VLS_WithSlots$69<vue33.DefineComponent<SplitterPanelProps, {
  /** If panel is `collapsible`, collapse it fully. */
  collapse: () => void;
  /** If panel is currently collapsed, expand it to its most recent size. */
  expand: () => void;
  /** Gets the current size of the panel (in the panel's sizeUnit: percentage for '%', pixels for 'px'). */
  getSize(): number;
  /** Resize panel to the specified size (in the panel's sizeUnit: percentage for '%', pixels for 'px'). */
  resize: (size: number) => void;
  /** Returns `true` if the panel is currently collapsed */
  isCollapsed: vue33.ComputedRef<boolean>;
  /** Returns `true` if the panel is currently not collapsed */
  isExpanded: vue33.ComputedRef<boolean>;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  resize: (size: number, prevSize: number | undefined) => any;
  collapse: () => any;
  expand: () => any;
}, string, vue33.PublicProps, Readonly<SplitterPanelProps> & Readonly<{
  onResize?: ((size: number, prevSize: number | undefined) => any) | undefined;
  onCollapse?: (() => any) | undefined;
  onExpand?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Is the panel collapsed */
    isCollapsed: boolean;
    /** Is the panel expanded */
    isExpanded: boolean;
    /** If panel is `collapsible`, collapse it fully. */
    collapse: () => void;
    /** If panel is currently collapsed, expand it to its most recent size. */
    expand: () => void;
    /** Resize panel to the specified percentage (1 - 100). */
    resize: (size: number) => void;
  }) => any;
}>;
type __VLS_WithSlots$69<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SplitterPanel.vue.d.ts.map
//#endregion
//#region src/Splitter/utils/types.d.ts
type Direction$1 = 'horizontal' | 'vertical';
type ResizeEvent = KeyboardEvent | MouseEvent | TouchEvent;
type ResizeHandler = (event: ResizeEvent) => void;
type DragState = {
  dragHandleId: string;
  dragHandleRect: DOMRect;
  initialCursorPosition: number;
  initialLayout: number[];
};
//# sourceMappingURL=types.d.ts.map
//#endregion
//#region src/Splitter/SplitterGroup.vue.d.ts
interface SplitterGroupProps extends PrimitiveProps {
  /** Group id; falls back to `useId` when not provided. */
  id?: string | null;
  /** Unique id used to auto-save group arrangement via `localStorage`. */
  autoSaveId?: string | null;
  /** The group orientation of splitter. */
  direction: Direction$1;
  /** Step size when arrow key was pressed. */
  keyboardResizeBy?: number | null;
  /** Custom storage API; defaults to localStorage */
  storage?: PanelGroupStorage;
}
type SplitterGroupEmits = {
  /** Event handler called when group layout changes */
  layout: [val: number[]];
};
type PanelGroupStorage = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
};
type PanelGroupContext = {
  direction: Ref<Direction$1>;
  dragState: DragState | null;
  groupId: string;
  reevaluatePanelConstraints: (panelData: PanelData, prevConstraints: PanelConstraints) => void;
  registerPanel: (panelData: PanelData) => void;
  registerResizeHandle: (dragHandleId: string) => ResizeHandler;
  resizePanel: (panelData: PanelData, size: number) => void;
  startDragging: (dragHandleId: string, event: ResizeEvent) => void;
  stopDragging: () => void;
  unregisterPanel: (panelData: PanelData) => void;
  panelGroupElement: Ref<ParentNode | null>;
  collapsePanel: (panelData: PanelData) => void;
  expandPanel: (panelData: PanelData) => void;
  isPanelCollapsed: (panelData: PanelData) => boolean;
  isPanelExpanded: (panelData: PanelData) => boolean;
  getPanelSize: (panelData: PanelData) => number;
  getPanelStyle: (panelData: PanelData, defaultSize: number | undefined) => CSSProperties;
};
declare const injectPanelGroupContext: <T extends PanelGroupContext | null | undefined = PanelGroupContext>(fallback?: T | undefined) => T extends null ? PanelGroupContext | null : PanelGroupContext, providePanelGroupContext: (contextValue: PanelGroupContext) => PanelGroupContext;
declare const _default$73: __VLS_WithSlots$68<vue33.DefineComponent<SplitterGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  layout: (val: number[]) => any;
}, string, vue33.PublicProps, Readonly<SplitterGroupProps> & Readonly<{
  onLayout?: ((val: number[]) => any) | undefined;
}>, {
  autoSaveId: string | null;
  keyboardResizeBy: number | null;
  storage: PanelGroupStorage;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current size of layout */
    layout: number[];
  }) => any;
}>;
type __VLS_WithSlots$68<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SplitterGroup.vue.d.ts.map
//#endregion
//#region src/Splitter/utils/registry.d.ts
type PointerHitAreaMargins = {
  coarse: number;
  fine: number;
};
//#endregion
//#region src/Splitter/SplitterResizeHandle.vue.d.ts
interface SplitterResizeHandleProps extends PrimitiveProps {
  /** Resize handle id (unique within group); falls back to `useId` when not provided */
  id?: string;
  /** Allow this much margin when determining resizable handle hit detection */
  hitAreaMargins?: PointerHitAreaMargins;
  /** Tabindex for the handle */
  tabindex?: number;
  /** Disable drag handle */
  disabled?: boolean;
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string;
}
type SplitterResizeHandleEmits = {
  /** Event handler called when dragging the handler. */
  dragging: [isDragging: boolean];
};
declare const _default$72: __VLS_WithSlots$67<vue33.DefineComponent<SplitterResizeHandleProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  dragging: (isDragging: boolean) => any;
}, string, vue33.PublicProps, Readonly<SplitterResizeHandleProps> & Readonly<{
  onDragging?: ((isDragging: boolean) => any) | undefined;
}>, {
  tabindex: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$67<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SplitterResizeHandle.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperDescription.vue.d.ts
interface StepperDescriptionProps extends PrimitiveProps {}
declare const _default$71: __VLS_WithSlots$66<vue33.DefineComponent<StepperDescriptionProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<StepperDescriptionProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$66<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperDescription.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperIndicator.vue.d.ts
interface StepperIndicatorProps extends PrimitiveProps {}
declare const _default$70: __VLS_WithSlots$65<vue33.DefineComponent<StepperIndicatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<StepperIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current step */
    step: number;
  }) => any;
}>;
type __VLS_WithSlots$65<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperIndicator.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperItem.vue.d.ts
declare const injectStepperItemContext: <T extends StepperItemContext | null | undefined = StepperItemContext>(fallback?: T | undefined) => T extends null ? StepperItemContext | null : StepperItemContext, provideStepperItemContext: (contextValue: StepperItemContext) => StepperItemContext;
type StepperState = 'completed' | 'active' | 'inactive';
interface StepperItemContext {
  titleId: string;
  descriptionId: string;
  step: Ref<number>;
  state: Ref<StepperState>;
  disabled: Ref<boolean>;
  isFocusable: Ref<boolean>;
}
interface StepperItemProps extends PrimitiveProps {
  /** A unique value that associates the stepper item with an index */
  step: number;
  /** When `true`, prevents the user from interacting with the step. */
  disabled?: boolean;
  /** Shows whether the step is completed. */
  completed?: boolean;
}
declare const _default$69: __VLS_WithSlots$64<vue33.DefineComponent<StepperItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<StepperItemProps> & Readonly<{}>, {
  disabled: boolean;
  completed: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current state of the stepper item */
    state: StepperState;
  }) => any;
}>;
type __VLS_WithSlots$64<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperItem.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperRoot.vue.d.ts
interface StepperRootContext {
  modelValue: Ref<number | undefined>;
  changeModelValue: (value: number) => void;
  orientation: Ref<DataOrientation>;
  dir: Ref<Direction>;
  linear: Ref<boolean>;
  totalStepperItems: Ref<Set<HTMLElement>>;
}
interface StepperRootProps extends PrimitiveProps {
  /**
   * The value of the step that should be active when initially rendered. Use when you do not need to control the state of the steps.
   */
  defaultValue?: number;
  /**
   * The orientation the steps are laid out.
   * Mainly so arrow navigation is done accordingly (left & right vs. up & down).
   * @defaultValue horizontal
   */
  orientation?: DataOrientation;
  /**
   * The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction;
  /** The controlled value of the step to activate. Can be bound as `v-model`. */
  modelValue?: number;
  /** Whether or not the steps must be completed in order. */
  linear?: boolean;
}
type StepperRootEmits = {
  /** Event handler called when the value changes */
  'update:modelValue': [payload: number | undefined];
};
declare const injectStepperRootContext: <T extends StepperRootContext | null | undefined = StepperRootContext>(fallback?: T | undefined) => T extends null ? StepperRootContext | null : StepperRootContext, provideStepperRootContext: (contextValue: StepperRootContext) => StepperRootContext;
declare const _default$68: __VLS_WithSlots$63<vue33.DefineComponent<StepperRootProps, {
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  modelValue: vue33.WritableComputedRef<number | undefined, number | undefined>;
  totalSteps: vue33.ComputedRef<number>;
  isNextDisabled: vue33.ComputedRef<boolean>;
  isPrevDisabled: vue33.ComputedRef<boolean>;
  isFirstStep: vue33.ComputedRef<boolean>;
  isLastStep: vue33.ComputedRef<boolean>;
  hasNext: () => boolean;
  hasPrev: () => boolean;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: number | undefined) => any;
}, string, vue33.PublicProps, Readonly<StepperRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: number | undefined) => any) | undefined;
}>, {
  orientation: DataOrientation;
  defaultValue: number;
  linear: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current step */
    modelValue: number | undefined;
    /** Total number of steps */
    totalSteps: number;
    /** Whether or not the next step is disabled */
    isNextDisabled: boolean;
    /** Whether or not the previous step is disabled */
    isPrevDisabled: boolean;
    /** Whether or not the first step is active */
    isFirstStep: boolean;
    /** Whether or not the last step is active */
    isLastStep: boolean;
    /** Go to a specific step */
    goToStep: (step: number) => void;
    /** Go to the next step */
    nextStep: () => void;
    /** Go to the previous step */
    prevStep: () => void;
    /** Whether or not there is a next step */
    hasNext: () => boolean;
    /** Whether or not there is a previous step */
    hasPrev: () => boolean;
  }) => any;
}>;
type __VLS_WithSlots$63<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperRoot.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperSeparator.vue.d.ts
interface StepperSeparatorProps extends SeparatorProps {}
declare const _default$67: __VLS_WithSlots$62<vue33.DefineComponent<StepperSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<StepperSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$62<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperSeparator.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperTitle.vue.d.ts
interface StepperTitleProps extends PrimitiveProps {}
declare const _default$66: __VLS_WithSlots$61<vue33.DefineComponent<StepperTitleProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<StepperTitleProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$61<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperTitle.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperTrigger.vue.d.ts
interface StepperTriggerProps extends PrimitiveProps {}
declare const _default$65: __VLS_WithSlots$60<vue33.DefineComponent<StepperTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<StepperTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$60<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperTrigger.vue.d.ts.map
//#endregion
//#region src/Switch/SwitchRoot.vue.d.ts
interface SwitchRootProps<T = boolean> extends PrimitiveProps, FormFieldProps {
  /** The state of the switch when it is initially rendered. Use when you do not need to control its state. */
  defaultValue?: T;
  /** The controlled state of the switch. Can be bind as `v-model`. */
  modelValue?: T | null;
  /** When `true`, prevents the user from interacting with the switch. */
  disabled?: boolean;
  id?: string;
  /** The value given as data when submitted with a `name`. */
  value?: string;
  /**
   * The value used when the switch is on. Defaults to `true`.
   */
  trueValue?: T;
  /**
   * The value used when the switch is off. Defaults to `false`.
   */
  falseValue?: T;
}
type SwitchRootEmits<T = boolean> = {
  /** Event handler called when the value of the switch changes. */
  'update:modelValue': [payload: T];
};
interface SwitchRootContext {
  checked: ComputedRef<boolean>;
  toggleCheck: () => void;
  disabled: Ref<boolean>;
}
declare const injectSwitchRootContext: <T extends SwitchRootContext | null | undefined = SwitchRootContext>(fallback?: T | undefined) => T extends null ? SwitchRootContext | null : SwitchRootContext, provideSwitchRootContext: (contextValue: SwitchRootContext) => SwitchRootContext;
declare const _default$64: <T = boolean>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$4<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$4<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((payload: T) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue"> & SwitchRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current value */
      modelValue: T;
      /** Whether the switch is checked */
      checked: boolean;
    }) => any;
  };
  emit: (evt: "update:modelValue", payload: T) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$4<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=SwitchRoot.vue.d.ts.map
//#endregion
//#region src/Switch/SwitchThumb.vue.d.ts
interface SwitchThumbProps extends PrimitiveProps {}
declare const _default$63: __VLS_WithSlots$59<vue33.DefineComponent<SwitchThumbProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<SwitchThumbProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$59<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SwitchThumb.vue.d.ts.map
//#endregion
//#region src/Tabs/TabsContent.vue.d.ts
interface TabsContentProps extends PrimitiveProps {
  /** A unique value that associates the content with a trigger. */
  value: StringOrNumber;
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$62: __VLS_WithSlots$58<vue33.DefineComponent<TabsContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TabsContentProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$58<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TabsContent.vue.d.ts.map
//#endregion
//#region src/Tabs/TabsIndicator.vue.d.ts
interface TabsIndicatorProps extends PrimitiveProps {}
declare const _default$61: __VLS_WithSlots$57<vue33.DefineComponent<TabsIndicatorProps, {
  updateIndicatorStyle: () => void;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TabsIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$57<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TabsIndicator.vue.d.ts.map
//#endregion
//#region src/Tabs/TabsList.vue.d.ts
interface TabsListProps extends PrimitiveProps {
  /** When `true`, keyboard navigation will loop from last tab to first, and vice versa. */
  loop?: boolean;
}
declare const _default$60: __VLS_WithSlots$56<vue33.DefineComponent<TabsListProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TabsListProps> & Readonly<{}>, {
  loop: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$56<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TabsList.vue.d.ts.map
//#endregion
//#region src/Tabs/TabsRoot.vue.d.ts
interface TabsRootContext {
  modelValue: Ref<StringOrNumber | undefined>;
  changeModelValue: (value: StringOrNumber) => void;
  orientation: Ref<DataOrientation>;
  dir: Ref<Direction>;
  unmountOnHide: Ref<boolean>;
  activationMode: 'automatic' | 'manual';
  baseId: string;
  tabsList: Ref<HTMLElement | undefined>;
  contentIds: Ref<Set<StringOrNumber>>;
  registerContent: (value: StringOrNumber) => void;
  unregisterContent: (value: StringOrNumber) => void;
}
interface TabsRootProps<T extends StringOrNumber = StringOrNumber> extends PrimitiveProps {
  /**
   * The value of the tab that should be active when initially rendered. Use when you do not need to control the state of the tabs
   */
  defaultValue?: T;
  /**
   * The orientation the tabs are laid out.
   * Mainly so arrow navigation is done accordingly (left & right vs. up & down)
   * @defaultValue horizontal
   */
  orientation?: DataOrientation;
  /**
   * The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction;
  /**
   * Whether a tab is activated automatically (on focus) or manually (on click).
   * @defaultValue automatic
   */
  activationMode?: 'automatic' | 'manual';
  /** The controlled value of the tab to activate. Can be bind as `v-model`. */
  modelValue?: T;
  /**
   * When `true`, the element will be unmounted on closed state.
   *
   * @defaultValue `true`
   */
  unmountOnHide?: boolean;
}
type TabsRootEmits<T extends StringOrNumber = StringOrNumber> = {
  /** Event handler called when the value changes */
  'update:modelValue': [payload: T];
};
declare const injectTabsRootContext: <T extends TabsRootContext | null | undefined = TabsRootContext>(fallback?: T | undefined) => T extends null ? TabsRootContext | null : TabsRootContext, provideTabsRootContext: (contextValue: TabsRootContext) => TabsRootContext;
declare const _default$59: <T extends StringOrNumber = StringOrNumber>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$3<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$3<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((payload: T) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue"> & TabsRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current input values */
      modelValue: T | undefined;
    }) => any;
  };
  emit: (evt: "update:modelValue", payload: T) => void;
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$3<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=TabsRoot.vue.d.ts.map
//#endregion
//#region src/Tabs/TabsTrigger.vue.d.ts
interface TabsTriggerProps extends PrimitiveProps {
  /** A unique value that associates the trigger with a content. */
  value: StringOrNumber;
  /** When `true`, prevents the user from interacting with the tab. */
  disabled?: boolean;
}
declare const _default$58: __VLS_WithSlots$55<vue33.DefineComponent<TabsTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TabsTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$55<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TabsTrigger.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputClear.vue.d.ts
interface TagsInputClearProps extends PrimitiveProps {}
declare const _default$57: __VLS_WithSlots$54<vue33.DefineComponent<TagsInputClearProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TagsInputClearProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$54<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputClear.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputInput.vue.d.ts
interface TagsInputInputProps extends PrimitiveProps {
  /** The placeholder character to use for empty tags input. */
  placeholder?: string;
  /** Focus on element when mounted. */
  autoFocus?: boolean;
  /** Maximum number of character allowed. */
  maxLength?: number;
}
declare const _default$56: __VLS_WithSlots$53<vue33.DefineComponent<TagsInputInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TagsInputInputProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$53<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputInput.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputRoot.vue.d.ts
type AcceptableInputValue = string | number | bigint | Record<string, any>;
interface TagsInputRootProps<T = AcceptableInputValue> extends PrimitiveProps, FormFieldProps {
  /** The controlled value of the tags input. Can be bind as `v-model`. */
  modelValue?: Array<T> | null;
  /** The value of the tags that should be added. Use when you do not need to control the state of the tags input */
  defaultValue?: Array<T>;
  /** When `true`, allow adding tags on paste. Work in conjunction with delimiter prop. */
  addOnPaste?: boolean;
  /** When `true` allow adding tags on tab keydown */
  addOnTab?: boolean;
  /** When `true` allow adding tags blur input */
  addOnBlur?: boolean;
  /** When `true`, allow duplicated tags. */
  duplicate?: boolean;
  /** When `true`, prevents the user from interacting with the tags input. */
  disabled?: boolean;
  /** The character or regular expression to trigger the addition of a new tag. Also used to split tags for `@paste` event */
  delimiter?: string | RegExp;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** Maximum number of tags. */
  max?: number;
  id?: string;
  /** Convert the input value to the desired type. Mandatory when using objects as values and using `TagsInputInput` */
  convertValue?: (value: string) => T;
  /** Display the value of the tag. Useful when you want to apply modifications to the value like adding a suffix or when using object as values */
  displayValue?: (value: T) => string;
}
type TagsInputRootEmits<T = AcceptableInputValue> = {
  /** Event handler called when the value changes */
  'update:modelValue': [payload: Array<T>];
  /** Event handler called when the value is invalid */
  'invalid': [payload: T];
  /** Event handler called when tag is added */
  'addTag': [payload: T];
  /** Event handler called when tag is removed */
  'removeTag': [payload: T];
};
interface TagsInputRootContext<T = AcceptableInputValue> {
  modelValue: Ref<Array<T>>;
  onAddValue: (payload: string) => boolean;
  onRemoveValue: (index: number) => void;
  onInputKeydown: (event: KeyboardEvent) => void;
  selectedElement: Ref<HTMLElement | undefined>;
  isInvalidInput: Ref<boolean>;
  addOnPaste: Ref<boolean>;
  addOnTab: Ref<boolean>;
  addOnBlur: Ref<boolean>;
  disabled: Ref<boolean>;
  delimiter: Ref<string | RegExp>;
  dir: Ref<Direction>;
  max: Ref<number>;
  id: Ref<string | undefined> | undefined;
  displayValue: (value: T) => string;
}
declare const injectTagsInputRootContext: <T extends TagsInputRootContext<AcceptableInputValue> | null | undefined = TagsInputRootContext<AcceptableInputValue>>(fallback?: T | undefined) => T extends null ? TagsInputRootContext<AcceptableInputValue> | null : TagsInputRootContext<AcceptableInputValue>, provideTagsInputRootContext: (contextValue: TagsInputRootContext<AcceptableInputValue>) => TagsInputRootContext<AcceptableInputValue>;
declare const _default$55: <T extends AcceptableInputValue = string>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$2<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$2<Pick<Partial<{}> & Omit<{
    readonly onInvalid?: ((payload: T) => any) | undefined;
    readonly "onUpdate:modelValue"?: ((payload: T[]) => any) | undefined;
    readonly onAddTag?: ((payload: T) => any) | undefined;
    readonly onRemoveTag?: ((payload: T) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onInvalid" | "onUpdate:modelValue" | "onAddTag" | "onRemoveTag"> & TagsInputRootProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current input values */
      modelValue: AcceptableInputValue[];
    }) => any;
  };
  emit: ((evt: "invalid", payload: T) => void) & ((evt: "update:modelValue", payload: T[]) => void) & ((evt: "addTag", payload: T) => void) & ((evt: "removeTag", payload: T) => void);
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$2<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=TagsInputRoot.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputItem.vue.d.ts
interface TagsInputItemProps extends PrimitiveProps {
  /** Value associated with the tags */
  value: AcceptableInputValue;
  /** When `true`, prevents the user from interacting with the tags input. */
  disabled?: boolean;
}
interface TagsInputItemContext {
  value: Ref<AcceptableInputValue>;
  displayValue: ComputedRef<string>;
  isSelected: Ref<boolean>;
  disabled?: Ref<boolean>;
  textId: string;
}
declare const injectTagsInputItemContext: <T extends TagsInputItemContext | null | undefined = TagsInputItemContext>(fallback?: T | undefined) => T extends null ? TagsInputItemContext | null : TagsInputItemContext, provideTagsInputItemContext: (contextValue: TagsInputItemContext) => TagsInputItemContext;
declare const _default$54: __VLS_WithSlots$52<vue33.DefineComponent<TagsInputItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TagsInputItemProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$52<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputItem.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputItemDelete.vue.d.ts
interface TagsInputItemDeleteProps extends PrimitiveProps {}
declare const _default$53: __VLS_WithSlots$51<vue33.DefineComponent<TagsInputItemDeleteProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TagsInputItemDeleteProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$51<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputItemDelete.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputItemText.vue.d.ts
interface TagsInputItemTextProps extends PrimitiveProps {}
declare const _default$52: __VLS_WithSlots$50<vue33.DefineComponent<TagsInputItemTextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TagsInputItemTextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$50<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputItemText.vue.d.ts.map
//#endregion
//#region src/TimeField/TimeFieldInput.vue.d.ts
interface TimeFieldInputProps extends PrimitiveProps {
  /** The part of the date to render */
  part: SegmentPart;
}
declare const _default$51: __VLS_WithSlots$49<vue33.DefineComponent<TimeFieldInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TimeFieldInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$49<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TimeFieldInput.vue.d.ts.map
//#endregion
//#region src/TimeField/TimeFieldRoot.vue.d.ts
type TimeFieldRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue | undefined>;
  placeholder: Ref<DateValue>;
  isInvalid: Ref<boolean>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  formatter: Formatter;
  hourCycle: HourCycle;
  step: Ref<DateStep>;
  stepSnapping: Ref<boolean>;
  segmentValues: Ref<SegmentValueObj>;
  segmentContents: Ref<{
    part: SegmentPart;
    value: string;
  }[]>;
  elements: Ref<Set<HTMLElement>>;
  focusNext: () => void;
  setFocusedElement: (el: HTMLElement) => void;
};
interface TimeFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the calendar */
  defaultValue?: TimeValue;
  /** The default placeholder date */
  defaultPlaceholder?: TimeValue;
  /** The placeholder date, which is used to determine what time to display when no time is selected. This updates as the user navigates the field */
  placeholder?: TimeValue;
  /** The controlled checked state of the field. Can be bound as `v-model`. */
  modelValue?: TimeValue | null;
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle;
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep;
  /** Whether to enforce snapping the value to the nearest step increment after input. Defaults to `false`. */
  stepSnapping?: boolean;
  /** The granularity to use for formatting times. Defaults to minute if a Time is provided, otherwise defaults to minute. The field will render segments for each part of the date up to and including the specified granularity */
  granularity?: 'hour' | 'minute' | 'second';
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean;
  /** The maximum date that can be selected */
  maxValue?: TimeValue;
  /** The minimum date that can be selected */
  minValue?: TimeValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** Whether or not the time field is disabled */
  disabled?: boolean;
  /** Whether or not the time field is readonly */
  readonly?: boolean;
  /** Id of the element */
  id?: string;
  /** The reading direction of the time field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
}
type TimeFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: TimeValue | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: TimeValue];
};
declare const injectTimeFieldRootContext: <T extends TimeFieldRootContext | null | undefined = TimeFieldRootContext>(fallback?: T | undefined) => T extends null ? TimeFieldRootContext | null : TimeFieldRootContext, provideTimeFieldRootContext: (contextValue: TimeFieldRootContext) => TimeFieldRootContext;
declare const _default$50: __VLS_WithSlots$48<vue33.DefineComponent<TimeFieldRootProps, {
  /** Helper to set the focused element inside the DateField */
  setFocusedElement: (el: HTMLElement) => void;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: TimeValue | undefined) => any;
  "update:placeholder": (date: TimeValue) => any;
}, string, vue33.PublicProps, Readonly<TimeFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: TimeValue | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: TimeValue) => any) | undefined;
}>, {
  disabled: boolean;
  defaultValue: TimeValue;
  placeholder: TimeValue;
  readonly: boolean;
  stepSnapping: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current time of the field */
    modelValue: TimeValue | undefined;
    /** The time field segment contents */
    segments: {
      part: SegmentPart;
      value: string;
    }[];
    /** Value if the input is invalid */
    isInvalid: boolean;
  }) => any;
}>;
type __VLS_WithSlots$48<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TimeFieldRoot.vue.d.ts.map
//#endregion
//#region src/TimeRangeField/TimeRangeFieldInput.vue.d.ts
interface TimeRangeFieldInputProps extends PrimitiveProps {
  /** The part of the date to render */
  part: SegmentPart;
  /** The type of field to render (start or end) */
  type: DateRangeType;
}
declare const _default$49: __VLS_WithSlots$47<vue33.DefineComponent<TimeRangeFieldInputProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TimeRangeFieldInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$47<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TimeRangeFieldInput.vue.d.ts.map
//#endregion
//#region src/TimeRangeField/TimeRangeFieldRoot.vue.d.ts
type TimeRangeFieldRootContext = {
  locale: Ref<string>;
  startValue: Ref<DateValue | undefined>;
  endValue: Ref<DateValue | undefined>;
  placeholder: Ref<DateValue>;
  isInvalid: Ref<boolean>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  formatter: Formatter;
  hourCycle: HourCycle;
  step: Ref<DateStep>;
  segmentValues: Record<DateRangeType, Ref<SegmentValueObj>>;
  segmentContents: Ref<{
    start: {
      part: SegmentPart;
      value: string;
    }[];
    end: {
      part: SegmentPart;
      value: string;
    }[];
  }>;
  elements: Ref<Set<HTMLElement>>;
  focusNext: () => void;
  setFocusedElement: (el: HTMLElement) => void;
};
interface TimeRangeFieldRootProps extends PrimitiveProps, FormFieldProps {
  /** The default value for the field */
  defaultValue?: TimeRange;
  /** The default placeholder time */
  defaultPlaceholder?: TimeValue;
  /** The placeholder time, which is used to determine what time to display when no time is selected. This updates as the user navigates the field */
  placeholder?: TimeValue;
  /** The controlled checked state of the field. Can be bound as `v-model`. */
  modelValue?: TimeRange | null;
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle;
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep;
  /** The granularity to use for formatting times. Defaults to minute. The field will render segments for each part of the time up to and including the specified granularity */
  granularity?: 'hour' | 'minute' | 'second';
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean;
  /** The maximum time that can be selected */
  maxValue?: TimeValue;
  /** The minimum time that can be selected */
  minValue?: TimeValue;
  /** The locale to use for formatting times */
  locale?: string;
  /** Whether or not the time field is disabled */
  disabled?: boolean;
  /** Whether or not the time field is readonly */
  readonly?: boolean;
  /** Id of the element */
  id?: string;
  /** The reading direction of the time field when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** A function that returns whether or not a time is unavailable */
  isTimeUnavailable?: Matcher;
}
type TimeRangeFieldRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: TimeRange];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: TimeValue];
};
declare const injectTimeRangeFieldRootContext: <T extends TimeRangeFieldRootContext | null | undefined = TimeRangeFieldRootContext>(fallback?: T | undefined) => T extends null ? TimeRangeFieldRootContext | null : TimeRangeFieldRootContext, provideTimeRangeFieldRootContext: (contextValue: TimeRangeFieldRootContext) => TimeRangeFieldRootContext;
declare const _default$48: __VLS_WithSlots$46<vue33.DefineComponent<TimeRangeFieldRootProps, {
  /** Helper to set the focused element inside the TimeRangeField */
  setFocusedElement: (el: HTMLElement) => void;
}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: TimeRange) => any;
  "update:placeholder": (date: TimeValue) => any;
}, string, vue33.PublicProps, Readonly<TimeRangeFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: TimeRange) => any) | undefined;
  "onUpdate:placeholder"?: ((date: TimeValue) => any) | undefined;
}>, {
  disabled: boolean;
  defaultValue: TimeRange;
  placeholder: TimeValue;
  readonly: boolean;
  isTimeUnavailable: Matcher;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current time of the field */
    modelValue: TimeRange | undefined;
    /** The time field segment contents */
    segments: {
      start: {
        part: SegmentPart;
        value: string;
      }[];
      end: {
        part: SegmentPart;
        value: string;
      }[];
    };
    /** Value if the input is invalid */
    isInvalid: boolean;
  }) => any;
}>;
type __VLS_WithSlots$46<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TimeRangeFieldRoot.vue.d.ts.map
//#endregion
//#region src/Toast/ToastClose.vue.d.ts
interface ToastCloseProps extends PrimitiveProps {}
declare const _default$47: __VLS_WithSlots$45<vue33.DefineComponent<ToastCloseProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToastCloseProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$45<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastClose.vue.d.ts.map
//#endregion
//#region src/Toast/ToastAction.vue.d.ts
interface ToastActionProps extends ToastCloseProps {
  /**
   * A short description for an alternate way to carry out the action. For screen reader users
   * who will not be able to navigate to the button easily/quickly.
   * @example <ToastAction altText="Goto account settings to upgrade">Upgrade</ToastAction>
   * @example <ToastAction altText="Undo (Alt+U)">Undo</ToastAction>
   */
  altText: string;
}
declare const _default$46: __VLS_WithSlots$44<vue33.DefineComponent<ToastActionProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToastActionProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$44<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastAction.vue.d.ts.map
//#endregion
//#region src/Toast/ToastDescription.vue.d.ts
interface ToastDescriptionProps extends PrimitiveProps {}
declare const _default$45: __VLS_WithSlots$43<vue33.DefineComponent<ToastDescriptionProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToastDescriptionProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$43<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastDescription.vue.d.ts.map
//#endregion
//#region src/Toast/ToastPortal.vue.d.ts
interface ToastPortalProps extends TeleportProps {}
declare const _default$44: __VLS_WithSlots$42<vue33.DefineComponent<ToastPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToastPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$42<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastPortal.vue.d.ts.map
//#endregion
//#region src/Toast/utils.d.ts
type SwipeDirection = 'up' | 'down' | 'left' | 'right';
type SwipeEvent = {
  currentTarget: EventTarget & HTMLElement;
} & Omit<CustomEvent<{
  originalEvent: PointerEvent;
  delta: {
    x: number;
    y: number;
  };
}>, 'currentTarget'>;
//#endregion
//#region src/Toast/ToastProvider.vue.d.ts
type ToastProviderContext = {
  label: Ref<string>;
  duration: Ref<number>;
  disableSwipe: Ref<boolean>;
  swipeDirection: Ref<SwipeDirection>;
  swipeThreshold: Ref<number>;
  toastCount: Ref<number>;
  viewport: Ref<HTMLElement | undefined>;
  onViewportChange: (viewport: HTMLElement) => void;
  onToastAdd: () => void;
  onToastRemove: () => void;
  isFocusedToastEscapeKeyDownRef: Ref<boolean>;
  isClosePausedRef: Ref<boolean>;
};
interface ToastProviderProps {
  /**
   * An author-localized label for each toast. Used to help screen reader users
   * associate the interruption with a toast.
   * @defaultValue 'Notification'
   */
  label?: string;
  /**
   * Time in milliseconds that each toast should remain visible for.
   * @defaultValue 5000
   */
  duration?: number;
  /**
   * Whether to disable the ability to swipe to close the toast.
   * @defaultValue false
   */
  disableSwipe?: boolean;
  /**
   * Direction of pointer swipe that should close the toast.
   * @defaultValue 'right'
   */
  swipeDirection?: SwipeDirection;
  /**
   * Distance in pixels that the swipe must pass before a close is triggered.
   * @defaultValue 50
   */
  swipeThreshold?: number;
}
declare const injectToastProviderContext: <T extends ToastProviderContext | null | undefined = ToastProviderContext>(fallback?: T | undefined) => T extends null ? ToastProviderContext | null : ToastProviderContext, provideToastProviderContext: (contextValue: ToastProviderContext) => ToastProviderContext;
declare const _default$43: __VLS_WithSlots$41<vue33.DefineComponent<ToastProviderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToastProviderProps> & Readonly<{}>, {
  label: string;
  duration: number;
  swipeDirection: SwipeDirection;
  swipeThreshold: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$41<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastProvider.vue.d.ts.map
//#endregion
//#region src/Toast/ToastRootImpl.vue.d.ts
type ToastRootImplEmits = {
  close: [];
  /** Event handler called when the escape key is down. It can be prevented by calling `event.preventDefault`. */
  escapeKeyDown: [event: KeyboardEvent];
  /** Event handler called when the dismiss timer is paused. This occurs when the pointer is moved over the viewport, the viewport is focused or when the window is blurred. */
  pause: [];
  /** Event handler called when the dismiss timer is resumed. This occurs when the pointer is moved away from the viewport, the viewport is blurred or when the window is focused. */
  resume: [];
  /** Event handler called when starting a swipe interaction. It can be prevented by calling `event.preventDefault`. */
  swipeStart: [event: SwipeEvent];
  /** Event handler called during a swipe interaction. It can be prevented by calling `event.preventDefault`. */
  swipeMove: [event: SwipeEvent];
  /** Event handler called when swipe interaction is cancelled. It can be prevented by calling `event.preventDefault`. */
  swipeCancel: [event: SwipeEvent];
  /** Event handler called at the end of a swipe interaction. It can be prevented by calling `event.preventDefault`. */
  swipeEnd: [event: SwipeEvent];
};
interface ToastRootImplProps extends PrimitiveProps {
  /**
   * Control the sensitivity of the toast for accessibility purposes.
   *
   * For toasts that are the result of a user action, choose `foreground`. Toasts generated from background tasks should use `background`.
   */
  type?: 'foreground' | 'background';
  /**
   * The controlled open state of the dialog. Can be bind as `v-model:open`.
   */
  open?: boolean;
  /**
   * Time in milliseconds that toast should remain visible for. Overrides value
   * given to `ToastProvider`.
   */
  duration?: number;
}
//#endregion
//#region src/Toast/ToastRoot.vue.d.ts
type ToastRootEmits = Omit<ToastRootImplEmits, 'close'> & {
  /** Event handler called when the open state changes */
  'update:open': [value: boolean];
};
interface ToastRootProps extends ToastRootImplProps {
  /** The open state of the dialog when it is initially rendered. Use when you do not need to control its open state. */
  defaultOpen?: boolean;
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$42: __VLS_WithSlots$40<vue33.DefineComponent<ToastRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  pause: () => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  "update:open": (value: boolean) => any;
  resume: () => any;
  swipeStart: (event: SwipeEvent) => any;
  swipeMove: (event: SwipeEvent) => any;
  swipeCancel: (event: SwipeEvent) => any;
  swipeEnd: (event: SwipeEvent) => any;
}, string, vue33.PublicProps, Readonly<ToastRootProps> & Readonly<{
  onPause?: (() => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
  onResume?: (() => any) | undefined;
  onSwipeStart?: ((event: SwipeEvent) => any) | undefined;
  onSwipeMove?: ((event: SwipeEvent) => any) | undefined;
  onSwipeCancel?: ((event: SwipeEvent) => any) | undefined;
  onSwipeEnd?: ((event: SwipeEvent) => any) | undefined;
}>, {
  type: "foreground" | "background";
  as: AsTag | vue33.Component;
  open: boolean;
  defaultOpen: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
    /** Remaining time (in ms) */
    remaining: number;
    /** Total time the toast will remain visible for (in ms) */
    duration: number;
  }) => any;
}>;
type __VLS_WithSlots$40<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastRoot.vue.d.ts.map
//#endregion
//#region src/Toast/ToastTitle.vue.d.ts
interface ToastTitleProps extends PrimitiveProps {}
declare const _default$41: __VLS_WithSlots$39<vue33.DefineComponent<ToastTitleProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToastTitleProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$39<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastTitle.vue.d.ts.map
//#endregion
//#region src/Toast/ToastViewport.vue.d.ts
interface ToastViewportProps extends PrimitiveProps {
  /**
   * The keys to use as the keyboard shortcut that will move focus to the toast viewport.
   * @defaultValue ['F8']
   */
  hotkey?: string[];
  /**
   * An author-localized label for the toast viewport to provide context for screen reader users
   * when navigating page landmarks. The available `{hotkey}` placeholder will be replaced for you.
   * Alternatively, you can pass in a custom function to generate the label.
   * @defaultValue 'Notifications ({hotkey})'
   */
  label?: string | ((hotkey: string) => string);
}
declare const _default$40: __VLS_WithSlots$38<vue33.DefineComponent<ToastViewportProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToastViewportProps> & Readonly<{}>, {
  label: string | ((hotkey: string) => string);
  as: AsTag | vue33.Component;
  hotkey: string[];
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$38<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastViewport.vue.d.ts.map
//#endregion
//#region src/Toggle/Toggle.vue.d.ts
type ToggleEmits = {
  /** Event handler called when the value of the toggle changes. */
  'update:modelValue': [value: boolean];
};
type DataState = 'on' | 'off';
interface ToggleProps extends PrimitiveProps, FormFieldProps {
  /**
   * The pressed state of the toggle when it is initially rendered. Use when you do not need to control its open state.
   */
  defaultValue?: boolean;
  /**
   * The controlled pressed state of the toggle. Can be bind as `v-model`.
   */
  modelValue?: boolean | null;
  /**
   * When `true`, prevents the user from interacting with the toggle.
   */
  disabled?: boolean;
}
declare const _default$39: __VLS_WithSlots$37<vue33.DefineComponent<ToggleProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<ToggleProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  modelValue: boolean | null;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current value */
    modelValue: boolean;
    /** Current state */
    state: DataState;
    /** Current pressed state */
    pressed: boolean;
    /** Current disabled state */
    disabled: boolean;
  }) => any;
}>;
type __VLS_WithSlots$37<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=Toggle.vue.d.ts.map
//#endregion
//#region src/ToggleGroup/ToggleGroupItem.vue.d.ts
interface ToggleGroupItemProps extends Omit<ToggleProps, 'name' | 'required' | 'modelValue' | 'defaultValue'> {
  /**
   * A string value for the toggle group item. All items within a toggle group should use a unique value.
   */
  value: AcceptableValue;
}
declare const _default$38: __VLS_WithSlots$36<vue33.DefineComponent<ToggleGroupItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToggleGroupItemProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: boolean;
    state: DataState;
    pressed: boolean;
    disabled: boolean;
  }) => any;
}>;
type __VLS_WithSlots$36<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToggleGroupItem.vue.d.ts.map
//#endregion
//#region src/ToggleGroup/ToggleGroupRoot.vue.d.ts
interface ToggleGroupRootProps<T = AcceptableValue | AcceptableValue[]> extends PrimitiveProps, FormFieldProps, SingleOrMultipleProps<T> {
  /** When `false`, navigating through the items using arrow keys will be disabled. */
  rovingFocus?: boolean;
  /** When `true`, prevents the user from interacting with the toggle group and all its items. */
  disabled?: boolean;
  /** The orientation of the component, which determines how focus moves: `horizontal` for left/right arrows and `vertical` for up/down arrows. */
  orientation?: DataOrientation;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** When `loop` and `rovingFocus` is `true`, keyboard navigation will loop from last item to first, and vice versa. */
  loop?: boolean;
}
type ToggleGroupRootEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [payload: AcceptableValue | AcceptableValue[]];
};
interface ToggleGroupRootContext {
  isSingle: ComputedRef<boolean>;
  modelValue: Ref<AcceptableValue | AcceptableValue[] | undefined>;
  changeModelValue: (value: AcceptableValue) => void;
  dir?: Ref<Direction>;
  orientation?: DataOrientation;
  loop: Ref<boolean>;
  rovingFocus: Ref<boolean>;
  disabled?: Ref<boolean>;
}
declare const injectToggleGroupRootContext: <T extends ToggleGroupRootContext | null | undefined = ToggleGroupRootContext>(fallback?: T | undefined) => T extends null ? ToggleGroupRootContext | null : ToggleGroupRootContext, provideToggleGroupRootContext: (contextValue: ToggleGroupRootContext) => ToggleGroupRootContext;
declare const _default$37: __VLS_WithSlots$35<vue33.DefineComponent<ToggleGroupRootProps<AcceptableValue | AcceptableValue[]>, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue | AcceptableValue[]) => any;
}, string, vue33.PublicProps, Readonly<ToggleGroupRootProps<AcceptableValue | AcceptableValue[]>> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue | AcceptableValue[]) => any) | undefined;
}>, {
  disabled: boolean;
  loop: boolean;
  rovingFocus: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current toggle values */
    modelValue: AcceptableValue | AcceptableValue[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$35<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToggleGroupRoot.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarButton.vue.d.ts
interface ToolbarButtonProps extends PrimitiveProps {
  disabled?: boolean;
}
declare const _default$36: __VLS_WithSlots$34<vue33.DefineComponent<ToolbarButtonProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToolbarButtonProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$34<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarButton.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarLink.vue.d.ts
interface ToolbarLinkProps extends PrimitiveProps {}
declare const _default$35: __VLS_WithSlots$33<vue33.DefineComponent<ToolbarLinkProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToolbarLinkProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$33<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarLink.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarRoot.vue.d.ts
interface ToolbarRootProps extends PrimitiveProps {
  /** The orientation of the toolbar */
  orientation?: DataOrientation;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** When `true`, keyboard navigation will loop from last tab to first, and vice versa. */
  loop?: boolean;
}
interface ToolbarRootContext {
  orientation: Ref<DataOrientation>;
  dir: Ref<Direction>;
}
declare const injectToolbarRootContext: <T extends ToolbarRootContext | null | undefined = ToolbarRootContext>(fallback?: T | undefined) => T extends null ? ToolbarRootContext | null : ToolbarRootContext, provideToolbarRootContext: (contextValue: ToolbarRootContext) => ToolbarRootContext;
declare const _default$34: __VLS_WithSlots$32<vue33.DefineComponent<ToolbarRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToolbarRootProps> & Readonly<{}>, {
  orientation: DataOrientation;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$32<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarRoot.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarSeparator.vue.d.ts
interface ToolbarSeparatorProps extends PrimitiveProps {}
declare const _default$33: __VLS_WithSlots$31<vue33.DefineComponent<ToolbarSeparatorProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToolbarSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$31<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarSeparator.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarToggleGroup.vue.d.ts
type ToolbarToggleGroupEmits = ToggleGroupRootEmits;
interface ToolbarToggleGroupProps extends ToggleGroupRootProps {}
declare const _default$32: __VLS_WithSlots$30<vue33.DefineComponent<ToolbarToggleGroupProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue | AcceptableValue[]) => any;
}, string, vue33.PublicProps, Readonly<ToolbarToggleGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue | AcceptableValue[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$30<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarToggleGroup.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarToggleItem.vue.d.ts
interface ToolbarToggleItemProps extends ToggleGroupItemProps {}
declare const _default$31: __VLS_WithSlots$29<vue33.DefineComponent<ToolbarToggleItemProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ToolbarToggleItemProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$29<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarToggleItem.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipArrow.vue.d.ts
interface TooltipArrowProps extends PrimitiveProps {
  /**
   * The width of the arrow in pixels.
   *
   * @defaultValue 10
   */
  width?: number;
  /**
   * The height of the arrow in pixels.
   *
   * @defaultValue 5
   */
  height?: number;
}
declare const _default$30: __VLS_WithSlots$28<vue33.DefineComponent<TooltipArrowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TooltipArrowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$28<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipArrow.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipContentImpl.vue.d.ts
type TooltipContentImplEmits = {
  /** Event handler called when focus moves to the destructive action after opening. It can be prevented by calling `event.preventDefault` */
  escapeKeyDown: [event: KeyboardEvent];
  /** Event handler called when a pointer event occurs outside the bounds of the component. It can be prevented by calling `event.preventDefault`. */
  pointerDownOutside: [event: Event];
};
interface TooltipContentImplProps extends PrimitiveProps, Pick<PopperContentProps, 'side' | 'sideOffset' | 'align' | 'alignOffset' | 'avoidCollisions' | 'collisionBoundary' | 'collisionPadding' | 'arrowPadding' | 'sticky' | 'hideWhenDetached' | 'positionStrategy' | 'updatePositionStrategy'> {
  /**
   * By default, screenreaders will announce the content inside
   * the component. If this is not descriptive enough, or you have
   * content that cannot be announced, use aria-label as a more
   * descriptive label.
   *
   * @defaultValue String
   */
  ariaLabel?: string;
}
//#endregion
//#region src/Tooltip/TooltipContent.vue.d.ts
type TooltipContentEmits = TooltipContentImplEmits;
interface TooltipContentProps extends TooltipContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
declare const _default$29: __VLS_WithSlots$27<vue33.DefineComponent<TooltipContentProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: Event) => any;
}, string, vue33.PublicProps, Readonly<TooltipContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$27<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipContent.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipPortal.vue.d.ts
interface TooltipPortalProps extends TeleportProps {}
declare const _default$28: __VLS_WithSlots$26<vue33.DefineComponent<TooltipPortalProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TooltipPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$26<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipPortal.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipProvider.vue.d.ts
interface TooltipProviderContext {
  isOpenDelayed: Ref<boolean>;
  delayDuration: Ref<number>;
  onOpen: () => void;
  onClose: () => void;
  isPointerInTransitRef: Ref<boolean>;
  disableHoverableContent: Ref<boolean>;
  disableClosingTrigger: Ref<boolean>;
  disabled: Ref<boolean>;
  ignoreNonKeyboardFocus: Ref<boolean>;
  content: Ref<TooltipContentProps | undefined>;
}
declare const injectTooltipProviderContext: <T extends TooltipProviderContext | null | undefined = TooltipProviderContext>(fallback?: T | undefined) => T extends null ? TooltipProviderContext | null : TooltipProviderContext, provideTooltipProviderContext: (contextValue: TooltipProviderContext) => TooltipProviderContext;
interface TooltipProviderProps {
  /**
   * The duration from when the pointer enters the trigger until the tooltip gets opened.
   * @defaultValue 700
   */
  delayDuration?: number;
  /**
   * How much time a user has to enter another trigger without incurring a delay again.
   * @defaultValue 300
   */
  skipDelayDuration?: number;
  /**
   * When `true`, trying to hover the content will result in the tooltip closing as the pointer leaves the trigger.
   * @defaultValue false
   */
  disableHoverableContent?: boolean;
  /**
   * When `true`, clicking on trigger will not close the content.
   * @defaultValue false
   */
  disableClosingTrigger?: boolean;
  /**
   * When `true`, disable tooltip
   * @defaultValue false
   */
  disabled?: boolean;
  /**
   * Prevent the tooltip from opening if the focus did not come from
   * the keyboard by matching against the `:focus-visible` selector.
   * This is useful if you want to avoid opening it when switching
   * browser tabs or closing a dialog.
   * @defaultValue false
   */
  ignoreNonKeyboardFocus?: boolean;
  /**
   * Default settings that will be used by all tooltip components.
   */
  content?: TooltipContentProps;
}
declare const _default$27: __VLS_WithSlots$25<vue33.DefineComponent<TooltipProviderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TooltipProviderProps> & Readonly<{}>, {
  delayDuration: number;
  skipDelayDuration: number;
  disableHoverableContent: boolean;
  ignoreNonKeyboardFocus: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$25<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipProvider.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipRoot.vue.d.ts
interface TooltipRootProps {
  /**
   * The open state of the tooltip when it is initially rendered.
   * Use when you do not need to control its open state.
   */
  defaultOpen?: boolean;
  /**
   * The controlled open state of the tooltip.
   */
  open?: boolean;
  /**
   * Override the duration given to the `Provider` to customise
   * the open delay for a specific tooltip.
   *
   * @defaultValue 700
   */
  delayDuration?: number;
  /**
   * Prevents Tooltip.Content from remaining open when hovering.
   * Disabling this has accessibility consequences. Inherits
   * from Tooltip.Provider.
   */
  disableHoverableContent?: boolean;
  /**
   * When `true`, clicking on trigger will not close the content.
   * @defaultValue false
   */
  disableClosingTrigger?: boolean;
  /**
   * When `true`, disable tooltip
   * @defaultValue false
   */
  disabled?: boolean;
  /**
   * Prevent the tooltip from opening if the focus did not come from
   * the keyboard by matching against the `:focus-visible` selector.
   * This is useful if you want to avoid opening it when switching
   * browser tabs or closing a dialog.
   * @defaultValue false
   */
  ignoreNonKeyboardFocus?: boolean;
}
type TooltipRootEmits = {
  /** Event handler called when the open state of the tooltip changes. */
  'update:open': [value: boolean];
};
interface TooltipContext {
  contentId: string;
  open: Ref<boolean>;
  stateAttribute: Ref<'closed' | 'delayed-open' | 'instant-open'>;
  trigger: Ref<HTMLElement | undefined>;
  onTriggerChange: (trigger: HTMLElement | undefined) => void;
  onTriggerEnter: () => void;
  onTriggerLeave: () => void;
  onOpen: () => void;
  onClose: () => void;
  disableHoverableContent: Ref<boolean>;
  disableClosingTrigger: Ref<boolean>;
  disabled: Ref<boolean>;
  ignoreNonKeyboardFocus: Ref<boolean>;
}
declare const injectTooltipRootContext: <T extends TooltipContext | null | undefined = TooltipContext>(fallback?: T | undefined) => T extends null ? TooltipContext | null : TooltipContext, provideTooltipRootContext: (contextValue: TooltipContext) => TooltipContext;
declare const _default$26: __VLS_WithSlots$24<vue33.DefineComponent<TooltipRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue33.PublicProps, Readonly<TooltipRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  disabled: boolean;
  delayDuration: number;
  disableHoverableContent: boolean;
  disableClosingTrigger: boolean;
  ignoreNonKeyboardFocus: boolean;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$24<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipRoot.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipTrigger.vue.d.ts
interface TooltipTriggerProps extends PopperAnchorProps {}
declare const _default$25: __VLS_WithSlots$23<vue33.DefineComponent<TooltipTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TooltipTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$23<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipTrigger.vue.d.ts.map
//#endregion
//#region src/Tree/TreeItem.vue.d.ts
interface TreeItemProps<T> extends PrimitiveProps {
  /** Value given to this item */
  value: T;
  /** Level of depth */
  level: number;
}
type SelectEvent<T> = CustomEvent<{
  originalEvent: PointerEvent | KeyboardEvent;
  value?: T;
  isExpanded: boolean;
  isSelected: boolean;
}>;
type ToggleEvent<T> = CustomEvent<{
  originalEvent: PointerEvent | KeyboardEvent;
  value?: T;
  isExpanded: boolean;
  isSelected: boolean;
}>;
type TreeItemEmits<T> = {
  /** Event handler called when the selecting item. <br> It can be prevented by calling `event.preventDefault`. */
  select: [event: SelectEvent<T>];
  /** Event handler called when the selecting item. <br> It can be prevented by calling `event.preventDefault`. */
  toggle: [event: ToggleEvent<T>];
};
declare const _default$24: <T extends Record<string, any>>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$1<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$1<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent<T>) => any) | undefined;
    readonly onToggle?: ((event: ToggleEvent<T>) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onToggle" | "onSelect"> & TreeItemProps<T> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{
    isExpanded: vue33.ComputedRef<boolean>;
    isSelected: vue33.ComputedRef<boolean>;
    isIndeterminate: vue33.ComputedRef<boolean | undefined>;
    handleToggle: () => void;
    handleSelect: () => void;
  }>): void;
  attrs: any;
  slots: {
    default?: (props: {
      isExpanded: boolean;
      isSelected: boolean;
      isIndeterminate: boolean | undefined;
      handleToggle: () => void;
      handleSelect: () => void;
    }) => any;
  };
  emit: ((evt: "select", event: SelectEvent<T>) => void) & ((evt: "toggle", event: ToggleEvent<T>) => void);
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$1<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=TreeItem.vue.d.ts.map
//#endregion
//#region src/Tree/TreeRoot.vue.d.ts
interface TreeRootProps<T = Record<string, any>, U extends Record<string, any> = Record<string, any>, M extends boolean = false> extends PrimitiveProps {
  /** The controlled value of the tree. Can be binded with `v-model`. */
  modelValue?: M extends true ? U[] : U;
  /** The value of the tree when initially rendered. Use when you do not need to control the state of the tree */
  defaultValue?: M extends true ? U[] : U;
  /** List of items */
  items?: T[];
  /** The controlled value of the expanded item. Can be binded with `v-model`. */
  expanded?: string[];
  /** The value of the expanded tree when initially rendered. Use when you do not need to control the state of the expanded tree */
  defaultExpanded?: string[];
  /** This function is passed the index of each item and should return a unique key for that item */
  getKey: (val: T) => string;
  /** This function is passed the index of each item and should return a list of children for that item */
  getChildren?: (val: T) => T[] | undefined;
  /** How multiple selection should behave in the collection. */
  selectionBehavior?: 'toggle' | 'replace';
  /** Whether multiple options can be selected or not.  */
  multiple?: M | boolean;
  /** The reading direction of the listbox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction;
  /** When `true`, prevents the user from interacting with tree  */
  disabled?: boolean;
  /** When `true`, selecting parent will select the descendants. */
  propagateSelect?: boolean;
  /** When `true`, selecting children will update the parent state. */
  bubbleSelect?: boolean;
}
type TreeRootEmits<T = Record<string, any>, M extends boolean = false> = {
  'update:modelValue': [val: M extends true ? T[] : T];
  'update:expanded': [val: string[]];
};
interface TreeRootContext<T = Record<string, any>> {
  modelValue: Ref<T | T[]>;
  selectedKeys: Ref<string[]>;
  onSelect: (val: T) => void;
  expanded: Ref<string[]>;
  onToggle: (val: T) => void;
  items: Ref<T[]>;
  expandedItems: Ref<T[]>;
  getKey: (val: T) => string;
  getChildren: (val: T) => T[] | undefined;
  multiple: Ref<boolean>;
  disabled: Ref<boolean>;
  dir: Ref<Direction>;
  propagateSelect: Ref<boolean>;
  bubbleSelect: Ref<boolean>;
  isVirtual: Ref<boolean>;
  virtualKeydownHook: EventHook<KeyboardEvent>;
  handleMultipleReplace: ReturnType<typeof useSelectionBehavior>['handleMultipleReplace'];
}
type FlattenedItem<T> = {
  _id: string;
  index: number;
  value: T;
  level: number;
  hasChildren: boolean;
  parentItem?: T;
  bind: {
    value: T;
    level: number;
    [key: string]: any;
  };
};
declare const injectTreeRootContext: <T extends TreeRootContext<any> | null | undefined = TreeRootContext<any>>(fallback?: T | undefined) => T extends null ? TreeRootContext<any> | null : TreeRootContext<any>, provideTreeRootContext: (contextValue: TreeRootContext<any>) => TreeRootContext<any>;
declare const _default$23: <T extends Record<string, any>, U extends Record<string, any>, M extends boolean = false>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((val: M extends true ? U[] : U) => any) | undefined;
    readonly "onUpdate:expanded"?: ((val: string[]) => any) | undefined;
  } & vue33.VNodeProps & vue33.AllowedComponentProps & vue33.ComponentCustomProps, never>, "onUpdate:modelValue" | "onUpdate:expanded"> & TreeRootProps<T, U, M> & Partial<{}>> & vue33.PublicProps;
  expose(exposed: vue33.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      flattenItems: FlattenedItem<T>[];
      modelValue: M extends true ? U[] : U;
      expanded: string[];
    }) => any;
  };
  emit: ((evt: "update:modelValue", val: M extends true ? U[] : U) => void) & ((evt: "update:expanded", val: string[]) => void);
}>) => vue33.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=TreeRoot.vue.d.ts.map
//#endregion
//#region src/Tree/TreeVirtualizer.vue.d.ts
interface TreeVirtualizerProps {
  /** Number of items rendered outside the visible area */
  overscan?: number;
  /** Estimated size (in px) of each item */
  estimateSize?: number | ((index: number) => number);
  /** Text content for each item to achieve type-ahead feature */
  textContent?: (item: Record<string, any>) => string;
}
declare const _default$22: __VLS_WithSlots$22<vue33.DefineComponent<TreeVirtualizerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<TreeVirtualizerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    item: FlattenedItem<Record<string, any>>;
    virtualizer: Virtualizer<Element | Window, Element>;
    virtualItem: VirtualItem;
  }) => any;
}>;
type __VLS_WithSlots$22<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TreeVirtualizer.vue.d.ts.map
//#endregion
//#region src/Viewport/Viewport.vue.d.ts
interface ViewportProps extends PrimitiveProps {
  /**
   * Will add `nonce` attribute to the style tag which can be used by Content Security Policy. <br> If omitted, inherits globally from `ConfigProvider`.
   */
  nonce?: string;
}
declare const _default$21: __VLS_WithSlots$21<vue33.DefineComponent<ViewportProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<ViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$21<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=Viewport.vue.d.ts.map
//#endregion
//#region src/VisuallyHidden/VisuallyHidden.vue.d.ts
interface VisuallyHiddenProps extends PrimitiveProps {
  feature?: 'focusable' | 'fully-hidden';
}
declare const _default: __VLS_WithSlots$20<vue33.DefineComponent<VisuallyHiddenProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<VisuallyHiddenProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
  feature: "focusable" | "fully-hidden";
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$20<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=VisuallyHidden.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerCell.vue.d.ts
interface YearPickerCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue;
}
declare const _default$20: __VLS_WithSlots$19<vue33.DefineComponent<YearPickerCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$19<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerCell.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerCellTrigger.vue.d.ts
interface YearPickerCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  year: DateValue;
}
interface YearPickerCellTriggerSlot {
  default?: (props: {
    /** Current year value */
    yearValue: string;
    /** Current disable state */
    disabled: boolean;
    /** Current selected state */
    selected: boolean;
    /** Current year is today state */
    today: boolean;
    /** Current unavailable state */
    unavailable: boolean;
  }) => any;
}
declare const _default$19: __VLS_WithSlots$18<vue33.DefineComponent<YearPickerCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, YearPickerCellTriggerSlot>;
type __VLS_WithSlots$18<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerGrid.vue.d.ts
interface YearPickerGridProps extends PrimitiveProps {}
declare const _default$18: __VLS_WithSlots$17<vue33.DefineComponent<YearPickerGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerGridProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$17<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerGrid.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerGridBody.vue.d.ts
interface YearPickerGridBodyProps extends PrimitiveProps {}
declare const _default$17: __VLS_WithSlots$16<vue33.DefineComponent<YearPickerGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$16<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerGridBody.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerGridRow.vue.d.ts
interface YearPickerGridRowProps extends PrimitiveProps {}
declare const _default$16: __VLS_WithSlots$15<vue33.DefineComponent<YearPickerGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerGridRowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$15<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerGridRow.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerHeader.vue.d.ts
interface YearPickerHeaderProps extends PrimitiveProps {}
declare const _default$15: __VLS_WithSlots$14<vue33.DefineComponent<YearPickerHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerHeaderProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$14<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerHeader.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerHeading.vue.d.ts
interface YearPickerHeadingProps extends PrimitiveProps {}
declare const _default$14: __VLS_WithSlots$13<vue33.DefineComponent<YearPickerHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerHeadingProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current year range heading */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$13<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerHeading.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerNext.vue.d.ts
interface YearPickerNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the `YearPickerRoot`. */
  nextPage?: (placeholder: DateValue) => DateValue;
}
interface YearPickerNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$13: __VLS_WithSlots$12<vue33.DefineComponent<YearPickerNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerNextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, YearPickerNextSlot>;
type __VLS_WithSlots$12<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerNext.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerPrev.vue.d.ts
interface YearPickerPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the `YearPickerRoot`. */
  prevPage?: (placeholder: DateValue) => DateValue;
}
interface YearPickerPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$12: __VLS_WithSlots$11<vue33.DefineComponent<YearPickerPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearPickerPrevProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, YearPickerPrevSlot>;
type __VLS_WithSlots$11<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerPrev.vue.d.ts.map
//#endregion
//#region src/YearPicker/YearPickerRoot.vue.d.ts
type YearPickerRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue | DateValue[] | undefined>;
  placeholder: Ref<DateValue>;
  multiple: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue>>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onYearChange: (date: DateValue) => void;
  onPlaceholderChange: (date: DateValue) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  headingId: string;
  isInvalid: Ref<boolean>;
  isYearDisabled: Matcher;
  isYearSelected: Matcher;
  isYearUnavailable?: Matcher;
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void;
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
  yearsPerPage: Ref<number>;
};
interface YearPickerRootProps extends PrimitiveProps {
  /** The default value for the year picker */
  defaultValue?: DateValue;
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The placeholder date, which is used to determine what year range to display when no date is selected */
  placeholder?: DateValue;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The accessible label for the year picker */
  calendarLabel?: string;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** Whether the year picker is disabled */
  disabled?: boolean;
  /** Whether the year picker is readonly */
  readonly?: boolean;
  /** If true, the year picker will focus the selected year, today, or the first year of the range on mount */
  initialFocus?: boolean;
  /** A function that returns whether or not a year is disabled */
  isYearDisabled?: Matcher;
  /** A function that returns whether or not a year is unavailable */
  isYearUnavailable?: Matcher;
  /** The reading direction of the calendar when applicable. If omitted, inherits globally from `ConfigProvider` or assumes LTR. */
  dir?: Direction;
  /** A function that returns the next page of the year picker. Receives the current placeholder as an argument. */
  nextPage?: (placeholder: DateValue) => DateValue;
  /** A function that returns the previous page of the year picker. Receives the current placeholder as an argument. */
  prevPage?: (placeholder: DateValue) => DateValue;
  /** The controlled selected year value of the year picker. Can be bound as `v-model`. */
  modelValue?: DateValue | DateValue[] | undefined;
  /** Whether multiple years can be selected */
  multiple?: boolean;
  /** Number of years to display per page */
  yearsPerPage?: number;
}
type YearPickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue | DateValue[] | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
};
declare const injectYearPickerRootContext: <T extends YearPickerRootContext | null | undefined = YearPickerRootContext>(fallback?: T | undefined) => T extends null ? YearPickerRootContext | null : YearPickerRootContext, provideYearPickerRootContext: (contextValue: YearPickerRootContext) => YearPickerRootContext;
declare const _default$11: __VLS_WithSlots$10<vue33.DefineComponent<YearPickerRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue | DateValue[] | undefined) => any;
  "update:placeholder": (date: DateValue) => any;
}, string, vue33.PublicProps, Readonly<YearPickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue | DateValue[] | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: DateValue;
  multiple: boolean;
  placeholder: DateValue;
  readonly: boolean;
  preventDeselect: boolean;
  initialFocus: boolean;
  isYearDisabled: Matcher;
  isYearUnavailable: Matcher;
  yearsPerPage: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue;
    /** The grid of years */
    grid: Grid<DateValue>;
    /** The year picker locale */
    locale: string;
    /** The current selected value */
    modelValue: DateValue | DateValue[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$10<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearPickerRoot.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerCell.vue.d.ts
interface YearRangePickerCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue;
}
declare const _default$10: __VLS_WithSlots$9<vue33.DefineComponent<YearRangePickerCellProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerCellProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$9<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerCell.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerCellTrigger.vue.d.ts
interface YearRangePickerCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  year: DateValue;
}
interface YearRangePickerCellTriggerSlot {
  default?: (props: {
    /** Current year value */
    yearValue: string;
    /** Current disable state */
    disabled: boolean;
    /** Current selected state */
    selected: boolean;
    /** Current year is today's year state */
    today: boolean;
    /** Current unavailable state */
    unavailable: boolean;
    /** Current highlighted state */
    highlighted: boolean;
    /** Current highlighted start state */
    highlightedStart: boolean;
    /** Current highlighted end state */
    highlightedEnd: boolean;
    /** Current selection start state */
    selectionStart: boolean;
    /** Current selection end state */
    selectionEnd: boolean;
  }) => any;
}
declare const _default$9: __VLS_WithSlots$8<vue33.DefineComponent<YearRangePickerCellTriggerProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, YearRangePickerCellTriggerSlot>;
type __VLS_WithSlots$8<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerGrid.vue.d.ts
interface YearRangePickerGridProps extends PrimitiveProps {}
declare const _default$8: __VLS_WithSlots$7<vue33.DefineComponent<YearRangePickerGridProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerGridProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$7<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerGrid.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerGridBody.vue.d.ts
interface YearRangePickerGridBodyProps extends PrimitiveProps {}
declare const _default$7: __VLS_WithSlots$6<vue33.DefineComponent<YearRangePickerGridBodyProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$6<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerGridBody.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerGridRow.vue.d.ts
interface YearRangePickerGridRowProps extends PrimitiveProps {}
declare const _default$6: __VLS_WithSlots$5<vue33.DefineComponent<YearRangePickerGridRowProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerGridRowProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$5<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerGridRow.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerHeader.vue.d.ts
interface YearRangePickerHeaderProps extends PrimitiveProps {}
declare const _default$5: __VLS_WithSlots$4<vue33.DefineComponent<YearRangePickerHeaderProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerHeaderProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$4<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerHeader.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerHeading.vue.d.ts
interface YearRangePickerHeadingProps extends PrimitiveProps {}
declare const _default$4: __VLS_WithSlots$3<vue33.DefineComponent<YearRangePickerHeadingProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerHeadingProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current year range heading */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$3<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerHeading.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerNext.vue.d.ts
interface YearRangePickerNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the Root. */
  nextPage?: (placeholder: DateValue) => DateValue;
}
interface YearRangePickerNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$3: __VLS_WithSlots$2<vue33.DefineComponent<YearRangePickerNextProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerNextProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, YearRangePickerNextSlot>;
type __VLS_WithSlots$2<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerNext.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerPrev.vue.d.ts
interface YearRangePickerPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the Root. */
  prevPage?: (placeholder: DateValue) => DateValue;
}
interface YearRangePickerPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$2: __VLS_WithSlots$1<vue33.DefineComponent<YearRangePickerPrevProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {}, string, vue33.PublicProps, Readonly<YearRangePickerPrevProps> & Readonly<{}>, {
  as: AsTag | vue33.Component;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, YearRangePickerPrevSlot>;
type __VLS_WithSlots$1<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerPrev.vue.d.ts.map
//#endregion
//#region src/YearRangePicker/YearRangePickerRoot.vue.d.ts
type YearRangePickerRootContext = {
  modelValue: Ref<DateRange>;
  startValue: Ref<DateValue | undefined>;
  endValue: Ref<DateValue | undefined>;
  locale: Ref<string>;
  placeholder: Ref<DateValue>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue>>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onPlaceholderChange: (date: DateValue) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  headingId: string;
  isInvalid: Ref<boolean>;
  isYearDisabled: Matcher;
  isYearUnavailable?: Matcher;
  allowNonContiguousRanges: Ref<boolean>;
  highlightedRange: Ref<{
    start: DateValue;
    end: DateValue;
  } | null>;
  focusedValue: Ref<DateValue | undefined>;
  lastPressedDateValue: Ref<DateValue | undefined>;
  isSelected: (date: DateValue) => boolean;
  isSelectionEnd: (date: DateValue) => boolean;
  isSelectionStart: (date: DateValue) => boolean;
  isHighlightedStart: (date: DateValue) => boolean;
  isHighlightedEnd: (date: DateValue) => boolean;
  prevPage: (prevPageFunc?: (date: DateValue) => DateValue) => void;
  nextPage: (nextPageFunc?: (date: DateValue) => DateValue) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue) => DateValue) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue) => DateValue) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  fixedDate: Ref<'start' | 'end' | undefined>;
  maximumYears: Ref<number | undefined>;
  minValue: Ref<DateValue | undefined>;
  maxValue: Ref<DateValue | undefined>;
  yearsPerPage: Ref<number>;
};
interface YearRangePickerRootProps extends PrimitiveProps {
  /** The default placeholder date */
  defaultPlaceholder?: DateValue;
  /** The default value for the calendar */
  defaultValue?: DateRange;
  /** The controlled selected year range of the year range picker. Can be bound as `v-model`. */
  modelValue?: DateRange | null;
  /** The placeholder date, which is used to determine what year range to display when no date is selected. */
  placeholder?: DateValue;
  /** When combined with `isYearUnavailable`, determines whether non-contiguous ranges may be selected. */
  allowNonContiguousRanges?: boolean;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The maximum number of years that can be selected in a range */
  maximumYears?: number;
  /** The accessible label for the calendar */
  calendarLabel?: string;
  /** The maximum date that can be selected */
  maxValue?: DateValue;
  /** The minimum date that can be selected */
  minValue?: DateValue;
  /** The locale to use for formatting dates */
  locale?: string;
  /** Whether or not the calendar is disabled */
  disabled?: boolean;
  /** Whether or not the calendar is readonly */
  readonly?: boolean;
  /** If true, the calendar will focus the selected year on mount */
  initialFocus?: boolean;
  /** A function that returns whether or not a year is disabled */
  isYearDisabled?: Matcher;
  /** A function that returns whether or not a year is unavailable */
  isYearUnavailable?: Matcher;
  /** The reading direction of the calendar when applicable. */
  dir?: Direction;
  /** A function that returns the next page of the calendar. */
  nextPage?: (placeholder: DateValue) => DateValue;
  /** A function that returns the previous page of the calendar. */
  prevPage?: (placeholder: DateValue) => DateValue;
  /** Which part of the range should be fixed */
  fixedDate?: 'start' | 'end';
  /** Number of years to display per page */
  yearsPerPage?: number;
}
type YearRangePickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateRange];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue];
  /** Event handler called whenever the start value changes */
  'update:startValue': [date: DateValue | undefined];
};
declare const injectYearRangePickerRootContext: <T extends YearRangePickerRootContext | null | undefined = YearRangePickerRootContext>(fallback?: T | undefined) => T extends null ? YearRangePickerRootContext | null : YearRangePickerRootContext, provideYearRangePickerRootContext: (contextValue: YearRangePickerRootContext) => YearRangePickerRootContext;
declare const _default$1: __VLS_WithSlots<vue33.DefineComponent<YearRangePickerRootProps, {}, {}, {}, {}, vue33.ComponentOptionsMixin, vue33.ComponentOptionsMixin, {
  "update:modelValue": (date: DateRange) => any;
  "update:placeholder": (date: DateValue) => any;
  "update:startValue": (date: DateValue | undefined) => any;
}, string, vue33.PublicProps, Readonly<YearRangePickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue) => any) | undefined;
  "onUpdate:startValue"?: ((date: DateValue | undefined) => any) | undefined;
}>, {
  as: AsTag | vue33.Component;
  disabled: boolean;
  defaultValue: DateRange;
  placeholder: DateValue;
  readonly: boolean;
  allowNonContiguousRanges: boolean;
  preventDeselect: boolean;
  initialFocus: boolean;
  maximumYears: number;
  isYearDisabled: Matcher;
  isYearUnavailable: Matcher;
  yearsPerPage: number;
}, {}, {}, {}, string, vue33.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue;
    /** The grid of years */
    grid: Grid<DateValue>;
    /** The calendar locale */
    locale: string;
    /** The current date range */
    modelValue: DateRange;
  }) => any;
}>;
type __VLS_WithSlots<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=YearRangePickerRoot.vue.d.ts.map

//#endregion
export { AcceptableInputValue, AcceptableValue, AccordionContentProps, AccordionHeaderProps, AccordionItemProps, AccordionRootEmits, AccordionRootProps, AccordionTriggerProps, AlertDialogActionProps, AlertDialogCancelProps, AlertDialogContentEmits, AlertDialogContentProps, AlertDialogDescriptionProps, AlertDialogEmits, AlertDialogOverlayProps, AlertDialogPortalProps, AlertDialogProps, AlertDialogTitleProps, AlertDialogTriggerProps, AsTag, AspectRatioProps, AutocompleteInputEmits, AutocompleteInputProps, AutocompleteRootEmits, AutocompleteRootProps, AvatarFallbackProps, AvatarImageEmits, AvatarImageProps, AvatarRootProps, CalendarCellProps, CalendarCellTriggerProps, CalendarGridBodyProps, CalendarGridHeadProps, CalendarGridProps, CalendarGridRowProps, CalendarHeadCellProps, CalendarHeaderProps, CalendarHeadingProps, CalendarNextProps, CalendarPrevProps, CalendarRootEmits, CalendarRootProps, CheckboxGroupRootEmits, CheckboxGroupRootProps, CheckboxIndicatorProps, CheckboxRootEmits, CheckboxRootProps, CheckedState$1 as CheckedState, CollapsibleContentEmits, CollapsibleContentProps, CollapsibleRootEmits, CollapsibleRootProps, CollapsibleTriggerProps, Color, ColorAreaAreaProps, ColorAreaRootEmits, ColorAreaRootProps, ColorAreaThumbProps, ColorChannel, ColorFieldInputProps, ColorFieldRootEmits, ColorFieldRootProps, ColorFormat, ColorSliderRootEmits, ColorSliderRootProps, ColorSliderThumbProps, ColorSliderTrackProps, ColorSpace, ColorSwatchPickerItemIndicatorProps, ColorSwatchPickerItemProps, ColorSwatchPickerItemSwatchProps, ColorSwatchPickerRootEmits, ColorSwatchPickerRootProps, ColorSwatchProps, ComboboxAnchorProps, ComboboxArrowProps, ComboboxCancelProps, ComboboxContentEmits, ComboboxContentProps, ComboboxEmptyProps, ComboboxGroupProps, ComboboxInputEmits, ComboboxInputProps, ComboboxItemEmits, ComboboxItemIndicatorProps, ComboboxItemProps, ComboboxLabelProps, ComboboxPortalProps, ComboboxRootEmits, ComboboxRootProps, ComboboxSeparatorProps, ComboboxTriggerProps, ComboboxViewportProps, ComboboxVirtualizerProps, ConfigProviderProps, ContextMenuArrowProps, ContextMenuCheckboxItemEmits, ContextMenuCheckboxItemProps, ContextMenuContentEmits, ContextMenuContentProps, ContextMenuGroupProps, ContextMenuItemEmits, ContextMenuItemIndicatorProps, ContextMenuItemProps, ContextMenuLabelProps, ContextMenuPortalProps, ContextMenuRadioGroupEmits, ContextMenuRadioGroupProps, ContextMenuRadioItemEmits, ContextMenuRadioItemProps, ContextMenuRootEmits, ContextMenuRootProps, ContextMenuSeparatorProps, ContextMenuSubContentEmits, ContextMenuSubContentProps, ContextMenuSubEmits, ContextMenuSubProps, ContextMenuSubTriggerProps, ContextMenuTriggerProps, DateFieldInputProps, DateFieldRootEmits, DateFieldRootProps, DatePickerAnchorProps, DatePickerArrowProps, DatePickerCellProps, DatePickerCellTriggerProps, DatePickerCloseProps, DatePickerContentEmits, DatePickerContentProps, DatePickerGridBodyProps, DatePickerGridHeadProps, DatePickerGridProps, DatePickerGridRowProps, DatePickerHeadCellProps, DatePickerHeaderProps, DatePickerHeadingProps, DatePickerInputProps, DatePickerNextProps, DatePickerPrevProps, DatePickerRootEmits, DatePickerRootProps, DatePickerTriggerProps, DateRangeFieldInputProps, DateRangeFieldRootEmits, DateRangeFieldRootProps, DateRangePickerAnchorProps, DateRangePickerArrowProps, DateRangePickerCellProps, DateRangePickerCellTriggerProps, DateRangePickerCloseProps, DateRangePickerContentEmits, DateRangePickerContentProps, DateRangePickerGridBodyProps, DateRangePickerGridHeadProps, DateRangePickerGridProps, DateRangePickerGridRowProps, DateRangePickerHeadCellProps, DateRangePickerHeaderProps, DateRangePickerHeadingProps, DateRangePickerInputProps, DateRangePickerNextProps, DateRangePickerPrevProps, DateRangePickerRootEmits, DateRangePickerRootProps, DateRangePickerTriggerProps, DialogCloseProps, DialogContentEmits, DialogContentProps, DialogDescriptionProps, DialogOverlayProps, DialogPortalProps, DialogRootEmits, DialogRootProps, DialogTitleProps, DialogTriggerProps, DropdownMenuArrowProps, DropdownMenuCheckboxItemEmits, DropdownMenuCheckboxItemProps, DropdownMenuContentEmits, DropdownMenuContentProps, DropdownMenuFilterEmits, DropdownMenuFilterProps, DropdownMenuGroupProps, DropdownMenuItemEmits, DropdownMenuItemIndicatorProps, DropdownMenuItemProps, DropdownMenuLabelProps, DropdownMenuPortalProps, DropdownMenuRadioGroupEmits, DropdownMenuRadioGroupProps, DropdownMenuRadioItemEmits, DropdownMenuRadioItemProps, DropdownMenuRootEmits, DropdownMenuRootProps, DropdownMenuSeparatorProps, DropdownMenuSubContentEmits, DropdownMenuSubContentProps, DropdownMenuSubEmits, DropdownMenuSubProps, DropdownMenuSubTriggerProps, DropdownMenuTriggerProps, EditableAreaProps, EditableCancelTriggerProps, EditableEditTriggerProps, EditableInputProps, EditablePreviewProps, EditableRootEmits, EditableRootProps, EditableSubmitTriggerProps, FlattenedItem, FocusOutsideEvent, FocusScopeEmits, FocusScopeProps, Formatter, GenericComponentInstance, HSBColor, HSLColor, HoverCardArrowProps, HoverCardContentProps, HoverCardPortalProps, HoverCardRootEmits, HoverCardRootProps, HoverCardTriggerProps, LabelProps, ListboxContentProps, ListboxFilterEmits, ListboxFilterProps, ListboxGroupLabelProps, ListboxGroupProps, ListboxItemEmits, ListboxItemIndicatorProps, ListboxItemProps, ListboxRootEmits, ListboxRootProps, ListboxVirtualizerProps, MenuArrowProps, MenuCheckboxItemEmits, MenuCheckboxItemProps, MenuContentEmits, MenuContentProps, MenuEmits, MenuGroupProps, MenuItemEmits, MenuItemIndicatorProps, MenuItemProps, MenuLabelProps, MenuPortalProps, MenuProps, MenuRadioGroupEmits, MenuRadioGroupProps, MenuRadioItemEmits, MenuRadioItemProps, MenuSeparatorProps, MenuSubContentEmits, MenuSubContentProps, MenuSubEmits, MenuSubProps, MenuSubTriggerProps, MenubarArrowProps, MenubarCheckboxItemEmits, MenubarCheckboxItemProps, MenubarContentProps, MenubarGroupProps, MenubarItemEmits, MenubarItemIndicatorProps, MenubarItemProps, MenubarLabelProps, MenubarMenuProps, MenubarPortalProps, MenubarRadioGroupEmits, MenubarRadioGroupProps, MenubarRadioItemEmits, MenubarRadioItemProps, MenubarRootEmits, MenubarRootProps, MenubarSeparatorProps, MenubarSubContentEmits, MenubarSubContentProps, MenubarSubEmits, MenubarSubProps, MenubarSubTriggerProps, MenubarTriggerProps, MonthPickerCellProps, MonthPickerCellTriggerProps, MonthPickerGridBodyProps, MonthPickerGridProps, MonthPickerGridRowProps, MonthPickerHeaderProps, MonthPickerHeadingProps, MonthPickerNextProps, MonthPickerPrevProps, MonthPickerRootEmits, MonthPickerRootProps, MonthRangePickerCellProps, MonthRangePickerCellTriggerProps, MonthRangePickerGridBodyProps, MonthRangePickerGridProps, MonthRangePickerGridRowProps, MonthRangePickerHeaderProps, MonthRangePickerHeadingProps, MonthRangePickerNextProps, MonthRangePickerPrevProps, MonthRangePickerRootEmits, MonthRangePickerRootProps, NavigationMenuContentEmits, NavigationMenuContentProps, NavigationMenuIndicatorProps, NavigationMenuItemProps, NavigationMenuLinkEmits, NavigationMenuLinkProps, NavigationMenuListProps, NavigationMenuRootEmits, NavigationMenuRootProps, NavigationMenuSubEmits, NavigationMenuSubProps, NavigationMenuTriggerProps, NavigationMenuViewportProps, NumberFieldDecrementProps, NumberFieldIncrementProps, NumberFieldInputProps, NumberFieldRootEmits, NumberFieldRootProps, PaginationEllipsisProps, PaginationFirstProps, PaginationLastProps, PaginationListItemProps, PaginationListProps, PaginationNextProps, PaginationPrevProps, PaginationRootEmits, PaginationRootProps, PinInputInputProps, PinInputRootEmits, PinInputRootProps, PointerDownOutsideEvent, PopoverAnchorProps, PopoverArrowProps, PopoverCloseProps, PopoverContentEmits, PopoverContentProps, PopoverPortalProps, PopoverRootEmits, PopoverRootProps, PopoverTriggerProps, PopperAnchorProps, PresenceProps, Primitive, PrimitiveProps, ProgressIndicatorProps, ProgressRootEmits, ProgressRootProps, RGBColor, RadioGroupIndicatorProps, RadioGroupItemEmits, RadioGroupItemProps, RadioGroupRootEmits, RadioGroupRootProps, RangeCalendarCellProps, RangeCalendarCellTriggerProps, RangeCalendarGridBodyProps, RangeCalendarGridHeadProps, RangeCalendarGridProps, RangeCalendarGridRowProps, RangeCalendarHeadCellProps, RangeCalendarHeaderProps, RangeCalendarHeadingProps, RangeCalendarNextProps, RangeCalendarPrevProps, RangeCalendarRootEmits, RangeCalendarRootProps, ReferenceElement$1 as ReferenceElement, RovingFocusGroupEmits, RovingFocusGroupProps, RovingFocusItemProps, ScrollAreaCornerProps, ScrollAreaRootProps, ScrollAreaScrollbarGlimpseProps, ScrollAreaScrollbarProps, ScrollAreaThumbProps, ScrollAreaViewportProps, SelectArrowProps, SelectContentEmits, SelectContentProps, SelectEvent, SelectEvent$1, SelectEvent$2, SelectEvent$3, SelectGroupProps, SelectIconProps, SelectItemIndicatorProps, SelectItemProps, SelectItemTextProps, SelectLabelProps, SelectPortalProps, SelectRootEmits, SelectRootProps, SelectScrollDownButtonProps, SelectScrollUpButtonProps, SelectSeparatorProps, SelectTriggerProps, SelectValueProps, SelectViewportProps, SeparatorProps, SliderRangeProps, SliderRootEmits, SliderRootProps, SliderThumbProps, SliderTrackProps, Slot, SplitterGroupEmits, SplitterGroupProps, SplitterPanelEmits, SplitterPanelProps, SplitterResizeHandleEmits, SplitterResizeHandleProps, StepperDescriptionProps, StepperIndicatorProps, StepperItemProps, StepperRootEmits, StepperRootProps, StepperSeparatorProps, StepperTitleProps, StepperTriggerProps, SwitchRootEmits, SwitchRootProps, SwitchThumbProps, TabsContentProps, TabsIndicatorProps, TabsListProps, TabsRootEmits, TabsRootProps, TabsTriggerProps, TagsInputClearProps, TagsInputInputProps, TagsInputItemDeleteProps, TagsInputItemProps, TagsInputItemTextProps, TagsInputRootEmits, TagsInputRootProps, TimeFieldInputProps, TimeFieldRootEmits, TimeFieldRootProps, TimeRangeFieldInputProps, TimeRangeFieldRootEmits, TimeRangeFieldRootProps, ToastActionProps, ToastCloseProps, ToastDescriptionProps, ToastPortalProps, ToastProviderProps, ToastRootEmits, ToastRootProps, ToastTitleProps, ToastViewportProps, ToggleEmits, ToggleEvent, ToggleGroupItemProps, ToggleGroupRootEmits, ToggleGroupRootProps, ToggleProps, ToolbarButtonProps, ToolbarLinkProps, ToolbarRootProps, ToolbarSeparatorProps, ToolbarToggleGroupEmits, ToolbarToggleGroupProps, ToolbarToggleItemProps, TooltipArrowProps, TooltipContentEmits, TooltipContentProps, TooltipPortalProps, TooltipProviderProps, TooltipRootEmits, TooltipRootProps, TooltipTriggerProps, TreeItemEmits, TreeItemProps, TreeRootEmits, TreeRootProps, TreeVirtualizerProps, ViewportProps, VisuallyHiddenProps, YearPickerCellProps, YearPickerCellTriggerProps, YearPickerGridBodyProps, YearPickerGridProps, YearPickerGridRowProps, YearPickerHeaderProps, YearPickerHeadingProps, YearPickerNextProps, YearPickerPrevProps, YearPickerRootEmits, YearPickerRootProps, YearRangePickerCellProps, YearRangePickerCellTriggerProps, YearRangePickerGridBodyProps, YearRangePickerGridProps, YearRangePickerGridRowProps, YearRangePickerHeaderProps, YearRangePickerHeadingProps, YearRangePickerNextProps, YearRangePickerPrevProps, YearRangePickerRootEmits, YearRangePickerRootProps, _default$1 as _default, _default$2 as _default$1, _default$11 as _default$10, _default$100, _default$101, _default$102, _default$103, _default$104, _default$105, _default$106, _default$107, _default$108, _default$109, _default$12 as _default$11, _default$110, _default$111, _default$112, _default$113, _default$114, _default$115, _default$116, _default$117, _default$118, _default$119, _default$13 as _default$12, _default$120, _default$121, _default$122, _default$123, _default$124, _default$125, _default$126, _default$127, _default$128, _default$129, _default$14 as _default$13, _default$130, _default$131, _default$132, _default$133, _default$134, _default$135, _default$136, _default$137, _default$138, _default$139, _default$15 as _default$14, _default$140, _default$141, _default$142, _default$143, _default$144, _default$145, _default$146, _default$147, _default$148, _default$149, _default$16 as _default$15, _default$150, _default$151, _default$152, _default$153, _default$154, _default$155, _default$156, _default$157, _default$158, _default$159, _default$17 as _default$16, _default$160, _default$161, _default$162, _default$163, _default$164, _default$165, _default$166, _default$167, _default$168, _default$169, _default$18 as _default$17, _default$170, _default$171, _default$172, _default$173, _default$174, _default$175, _default$176, _default$177, _default$178, _default$179, _default$19 as _default$18, _default$180, _default$181, _default$182, _default$183, _default$184, _default$185, _default$186, _default$187, _default$188, _default$189, _default$20 as _default$19, _default$190, _default$191, _default$192, _default$193, _default$194, _default$195, _default$196, _default$197, _default$198, _default$199, _default$3 as _default$2, _default as _default$20, _default$200, _default$201, _default$202, _default$203, _default$204, _default$205, _default$206, _default$207, _default$208, _default$209, _default$21, _default$210, _default$211, _default$212, _default$213, _default$214, _default$216 as _default$215, _default$217 as _default$216, _default$218 as _default$217, _default$219 as _default$218, _default$220 as _default$219, _default$22, _default$221 as _default$220, _default$222 as _default$221, _default$223 as _default$222, _default$224 as _default$223, _default$225 as _default$224, _default$226 as _default$225, _default$227 as _default$226, _default$228 as _default$227, _default$229 as _default$228, _default$230 as _default$229, _default$23, _default$231 as _default$230, _default$232 as _default$231, _default$233 as _default$232, _default$234 as _default$233, _default$235 as _default$234, _default$236 as _default$235, _default$237 as _default$236, _default$238 as _default$237, _default$215 as _default$238, _default$239, _default$24, _default$241 as _default$240, _default$242 as _default$241, _default$243 as _default$242, _default$244 as _default$243, _default$245 as _default$244, _default$246 as _default$245, _default$247 as _default$246, _default$248 as _default$247, _default$249 as _default$248, _default$250 as _default$249, _default$25, _default$251 as _default$250, _default$252 as _default$251, _default$253 as _default$252, _default$254 as _default$253, _default$255 as _default$254, _default$256 as _default$255, _default$257 as _default$256, _default$258 as _default$257, _default$259 as _default$258, _default$240 as _default$259, _default$26, _default$260, _default$261, _default$262, _default$263, _default$264, _default$265, _default$266, _default$267, _default$268, _default$269, _default$27, _default$270, _default$271, _default$272, _default$273, _default$274, _default$275, _default$276, _default$277, _default$278, _default$279, _default$28, _default$280, _default$281, _default$282, _default$283, _default$284, _default$285, _default$286, _default$287, _default$288, _default$289, _default$29, _default$290, _default$291, _default$292, _default$293, _default$294, _default$295, _default$296, _default$297, _default$298, _default$299, _default$4 as _default$3, _default$30, _default$300, _default$301, _default$302, _default$303, _default$304, _default$305, _default$306, _default$307, _default$308, _default$309, _default$31, _default$310, _default$311, _default$312, _default$313, _default$314, _default$315, _default$316, _default$317, _default$318, _default$319, _default$32, _default$320, _default$321, _default$322, _default$323, _default$324, _default$325, _default$326, _default$327, _default$328, _default$329, _default$33, _default$330, _default$331, _default$332, _default$333, _default$334, _default$335, _default$336, _default$337, _default$338, _default$339, _default$34, _default$340, _default$341, _default$342, _default$343, _default$344, _default$345, _default$346, _default$347, _default$348, _default$349, _default$35, _default$350, _default$351, _default$352, _default$353, _default$354, _default$355, _default$356, _default$357, _default$358, _default$359, _default$36, _default$360, _default$361, _default$362, _default$363, _default$364, _default$365, _default$366, _default$367, _default$368, _default$369, _default$37, _default$370, _default$371, _default$372, _default$373, _default$374, _default$375, _default$376, _default$377, _default$378, _default$38, _default$39, _default$5 as _default$4, _default$40, _default$41, _default$42, _default$43, _default$44, _default$45, _default$46, _default$47, _default$48, _default$49, _default$6 as _default$5, _default$50, _default$51, _default$52, _default$53, _default$54, _default$55, _default$56, _default$57, _default$58, _default$59, _default$7 as _default$6, _default$60, _default$61, _default$62, _default$63, _default$64, _default$65, _default$66, _default$67, _default$68, _default$69, _default$8 as _default$7, _default$70, _default$71, _default$72, _default$73, _default$74, _default$75, _default$76, _default$77, _default$78, _default$79, _default$9 as _default$8, _default$80, _default$81, _default$82, _default$83, _default$84, _default$85, _default$86, _default$87, _default$88, _default$89, _default$10 as _default$9, _default$90, _default$91, _default$92, _default$93, _default$94, _default$95, _default$96, _default$97, _default$98, _default$99, colorToHex, colorToHsb, colorToHsl, colorToRgb, colorToString, convertToHsb, convertToHsl, convertToRgb, createContext, getAreaBackgroundStyle, getAreaGradient, getChannelName, getChannelRange, getChannelValue, getSliderBackgroundStyle, getSliderGradient, injectAccordionItemContext, injectAccordionRootContext, injectAlertDialogContentContext, injectAutocompleteRootContext, injectAvatarRootContext, injectCalendarRootContext, injectCheckboxGroupRootContext, injectCheckboxRootContext, injectCollapsibleRootContext, injectColorAreaRootContext, injectColorFieldRootContext, injectColorSliderRootContext, injectComboboxGroupContext, injectComboboxRootContext, injectConfigProviderContext, injectContextMenuRootContext, injectDateFieldRootContext, injectDatePickerRootContext, injectDateRangeFieldRootContext, injectDateRangePickerRootContext, injectDialogRootContext, injectDropdownMenuRootContext, injectEditableRootContext, injectHoverCardRootContext, injectListboxGroupContext, injectListboxItemContext, injectListboxRootContext, injectMenuContext, injectMenuRootContext, injectMenubarMenuContext, injectMenubarRootContext, injectMonthPickerRootContext, injectMonthRangePickerRootContext, injectNavigationMenuContext, injectNavigationMenuItemContext, injectNumberFieldRootContext, injectPaginationRootContext, injectPanelGroupContext, injectPinInputRootContext, injectPopoverRootContext, injectProgressRootContext, injectRadioGroupItemContext, injectRadioGroupRootContext, injectRangeCalendarRootContext, injectScrollAreaRootContext, injectScrollAreaScrollbarContext, injectSelectGroupContext, injectSelectItemContext, injectSelectRootContext, injectSliderRootContext, injectStepperItemContext, injectStepperRootContext, injectSwitchRootContext, injectTabsRootContext, injectTagsInputItemContext, injectTagsInputRootContext, injectTimeFieldRootContext, injectTimeRangeFieldRootContext, injectToastProviderContext, injectToggleGroupRootContext, injectToolbarRootContext, injectTooltipProviderContext, injectTooltipRootContext, injectTreeRootContext, injectYearPickerRootContext, injectYearRangePickerRootContext, isValidColor, normalizeColor, parseColor, setChannelValue, setChannelValues, useBodyScrollLock, useDateFormatter, useDirection, useEmitAsProps, useFilter, useForwardExpose, useForwardProps, useForwardPropsEmits, useId, useLocale, useStateMachine, withDefault };
//# sourceMappingURL=index3.d.ts.map