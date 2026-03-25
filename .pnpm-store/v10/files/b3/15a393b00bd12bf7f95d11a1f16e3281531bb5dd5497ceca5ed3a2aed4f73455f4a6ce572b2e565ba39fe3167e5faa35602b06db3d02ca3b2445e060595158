import { DateRange, DateStep, DateValue, Grid, HourCycle, Matcher, SegmentPart, SegmentValueObj, WeekDayFormat } from "./index2.js";
import * as vue37 from "vue";
import { CSSProperties, Component, ComponentPublicInstance, ComputedRef, DefineComponent, HTMLAttributes, ImgHTMLAttributes, MaybeRef, MaybeRefOrGetter, PropType, Ref, SlotsType, UnwrapNestedRefs, VNode, VNodeProps, VNodeRef } from "vue";
import { EventHook, EventHookOn } from "@vueuse/core";
import * as _internationalized_date982 from "@internationalized/date";
import { CalendarDateTime, DateValue as DateValue$1, Time, ZonedDateTime } from "@internationalized/date";
import { ReferenceElement, ReferenceElement as ReferenceElement$1 } from "@floating-ui/vue";
import { VirtualItem, Virtualizer } from "@tanstack/vue-virtual";
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
//#region src/shared/date/comparators.d.ts
type TimeValue = Time | CalendarDateTime | ZonedDateTime;
type Granularity = 'day' | 'hour' | 'minute' | 'second';
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
declare function useBodyScrollLock(initialState?: boolean | undefined): vue37.WritableComputedRef<boolean, boolean>;
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
  selectedDate: (date: DateValue$1, includeTime?: boolean) => string;
  dayOfWeek: (date: Date, length?: DateFormatterOptions['weekday']) => string;
  fullMonthAndYear: (date: Date, options?: DateFormatterOptions) => string;
  fullMonth: (date: Date, options?: DateFormatterOptions) => string;
  fullYear: (date: Date, options?: DateFormatterOptions) => string;
  dayPeriod: (date: Date) => string;
  part: (dateObj: DateValue$1, type: Intl.DateTimeFormatPartTypes, options?: DateFormatterOptions) => string;
  toParts: (date: DateValue$1, options?: DateFormatterOptions) => Intl.DateTimeFormatPart[];
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
  currentRef: vue37.Ref<Element | T | null | undefined, Element | T | null | undefined>;
  currentElement: vue37.ComputedRef<HTMLElement>;
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
declare function useForwardProps<T extends Record<string, any>>(props: MaybeRefOrGetter<T>): vue37.ComputedRef<T>;
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
declare function useForwardPropsEmits<T extends Record<string, any>, Name extends string>(props: MaybeRefOrGetter<T>, emit?: (name: Name, ...args: any[]) => void): vue37.ComputedRef<T & Record<string, any>>;
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
declare const Primitive: vue37.DefineComponent<vue37.ExtractPropTypes<{
  asChild: {
    type: BooleanConstructor;
    default: boolean;
  };
  as: {
    type: PropType<AsTag | Component>;
    default: string;
  };
}>, () => vue37.VNode<vue37.RendererNode, vue37.RendererElement, {
  [key: string]: any;
}>, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<vue37.ExtractPropTypes<{
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
}, {}, {}, {}, string, vue37.ComponentProvideOptions, true, {}, any>;
//# sourceMappingURL=Primitive.d.ts.map
//#endregion
//#region src/Primitive/Slot.d.ts
declare const Slot: vue37.DefineComponent<{}, () => vue37.VNode<vue37.RendererNode, vue37.RendererElement, {
  [key: string]: any;
}> | vue37.VNode<vue37.RendererNode, vue37.RendererElement, {
  [key: string]: any;
}>[] | null, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, true, {}, any>;
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
declare const _default$33: __VLS_WithSlots$288<vue37.DefineComponent<CollapsibleContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  contentFound: (args_0: void) => any;
}, string, vue37.PublicProps, Readonly<CollapsibleContentProps> & Readonly<{
  onContentFound?: ((args_0?: void | undefined) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$288<T, S> = T & {
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
declare const _default$34: __VLS_WithSlots$287<vue37.DefineComponent<CollapsibleRootProps, {
  open: Ref<boolean, boolean>;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<CollapsibleRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  unmountOnHide: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$287<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CollapsibleRoot.vue.d.ts.map
//#endregion
//#region src/Collapsible/CollapsibleTrigger.vue.d.ts
interface CollapsibleTriggerProps extends PrimitiveProps {}
declare const _default$35: __VLS_WithSlots$286<vue37.DefineComponent<CollapsibleTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CollapsibleTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$286<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CollapsibleTrigger.vue.d.ts.map
//#endregion
//#region src/Accordion/AccordionContent.vue.d.ts
interface AccordionContentProps extends CollapsibleContentProps {}
declare const _default: __VLS_WithSlots$285<vue37.DefineComponent<AccordionContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AccordionContentProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$285<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//#endregion
//#region src/Accordion/AccordionHeader.vue.d.ts
interface AccordionHeaderProps extends PrimitiveProps {}
declare const _default$1: __VLS_WithSlots$284<vue37.DefineComponent<AccordionHeaderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AccordionHeaderProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$284<T, S> = T & {
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
declare const _default$2: __VLS_WithSlots$283<vue37.DefineComponent<AccordionItemProps, {
  open: ComputedRef<boolean>;
  dataDisabled: ComputedRef<"" | undefined>;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AccordionItemProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$283<T, S> = T & {
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
declare const _default$3: <T extends (string | string[]), ExplicitType extends SingleOrMultipleType>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$14<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$14<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: (ExplicitType extends "single" ? string : string[]) | undefined) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onUpdate:modelValue"> & AccordionRootProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current active value */
      modelValue: AcceptableValue | AcceptableValue[] | undefined;
    }) => any;
  };
  emit: (evt: "update:modelValue", value: (ExplicitType extends "single" ? string : string[]) | undefined) => void;
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$14<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=AccordionRoot.vue.d.ts.map
//#endregion
//#region src/Accordion/AccordionTrigger.vue.d.ts
interface AccordionTriggerProps extends PrimitiveProps {}
declare const _default$4: __VLS_WithSlots$282<vue37.DefineComponent<AccordionTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AccordionTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$282<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AccordionTrigger.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogClose.vue.d.ts
interface DialogCloseProps extends PrimitiveProps {}
declare const _default$113: __VLS_WithSlots$281<vue37.DefineComponent<DialogCloseProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DialogCloseProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$281<T, S> = T & {
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
declare const _default$114: __VLS_WithSlots$280<vue37.DefineComponent<DialogContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<DialogContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$280<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogContent.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogDescription.vue.d.ts
interface DialogDescriptionProps extends PrimitiveProps {}
declare const _default$115: __VLS_WithSlots$279<vue37.DefineComponent<DialogDescriptionProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DialogDescriptionProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$279<T, S> = T & {
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
declare const _default$116: __VLS_WithSlots$278<vue37.DefineComponent<DialogOverlayProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DialogOverlayProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$278<T, S> = T & {
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
declare const _default$117: __VLS_WithSlots$277<vue37.DefineComponent<DialogPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DialogPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$277<T, S> = T & {
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
declare const _default$118: __VLS_WithSlots$276<vue37.DefineComponent<DialogRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<DialogRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  modal: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
    /** Close the dialog */
    close: () => void;
  }) => any;
}>;
type __VLS_WithSlots$276<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogRoot.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogTitle.vue.d.ts
interface DialogTitleProps extends PrimitiveProps {}
declare const _default$119: __VLS_WithSlots$275<vue37.DefineComponent<DialogTitleProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DialogTitleProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$275<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogTitle.vue.d.ts.map
//#endregion
//#region src/Dialog/DialogTrigger.vue.d.ts
interface DialogTriggerProps extends PrimitiveProps {}
declare const _default$120: __VLS_WithSlots$274<vue37.DefineComponent<DialogTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DialogTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$274<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DialogTrigger.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogAction.vue.d.ts
interface AlertDialogActionProps extends DialogCloseProps {}
declare const _default$5: __VLS_WithSlots$273<vue37.DefineComponent<AlertDialogActionProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AlertDialogActionProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$273<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogAction.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogCancel.vue.d.ts
interface AlertDialogCancelProps extends DialogCloseProps {}
declare const _default$6: __VLS_WithSlots$272<vue37.DefineComponent<AlertDialogCancelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AlertDialogCancelProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$272<T, S> = T & {
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
declare const _default$7: __VLS_WithSlots$271<vue37.DefineComponent<AlertDialogContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<AlertDialogContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$271<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogContent.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogDescription.vue.d.ts
interface AlertDialogDescriptionProps extends DialogDescriptionProps {}
declare const _default$8: __VLS_WithSlots$270<vue37.DefineComponent<AlertDialogDescriptionProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AlertDialogDescriptionProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$270<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogDescription.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogOverlay.vue.d.ts
interface AlertDialogOverlayProps extends DialogOverlayProps {}
declare const _default$9: __VLS_WithSlots$269<vue37.DefineComponent<AlertDialogOverlayProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AlertDialogOverlayProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$269<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogOverlay.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogPortal.vue.d.ts
interface AlertDialogPortalProps extends TeleportProps {}
declare const _default$10: __VLS_WithSlots$268<vue37.DefineComponent<AlertDialogPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AlertDialogPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$268<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogPortal.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogRoot.vue.d.ts
type AlertDialogEmits = DialogRootEmits;
interface AlertDialogProps extends Omit<DialogRootProps, 'modal'> {}
declare const _default$11: __VLS_WithSlots$267<vue37.DefineComponent<AlertDialogProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<AlertDialogProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    open: boolean;
    close: () => void;
  }) => any;
}>;
type __VLS_WithSlots$267<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogRoot.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogTitle.vue.d.ts
interface AlertDialogTitleProps extends DialogTitleProps {}
declare const _default$12: __VLS_WithSlots$266<vue37.DefineComponent<AlertDialogTitleProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AlertDialogTitleProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$266<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AlertDialogTitle.vue.d.ts.map
//#endregion
//#region src/AlertDialog/AlertDialogTrigger.vue.d.ts
interface AlertDialogTriggerProps extends DialogTriggerProps {}
declare const _default$13: __VLS_WithSlots$265<vue37.DefineComponent<AlertDialogTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AlertDialogTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$265<T, S> = T & {
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
declare const _default$14: __VLS_WithSlots$264<vue37.DefineComponent<AspectRatioProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AspectRatioProps> & Readonly<{}>, {
  ratio: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current aspect ratio (in %) */
    aspect: number;
  }) => any;
}>;
type __VLS_WithSlots$264<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AspectRatio.vue.d.ts.map
//#endregion
//#region src/Avatar/AvatarFallback.vue.d.ts
interface AvatarFallbackProps extends PrimitiveProps {
  /** Useful for delaying rendering so it only appears for those with slower connections. */
  delayMs?: number;
}
declare const _default$15: __VLS_WithSlots$263<vue37.DefineComponent<AvatarFallbackProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AvatarFallbackProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$263<T, S> = T & {
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
declare const _default$16: __VLS_WithSlots$262<vue37.DefineComponent<AvatarImageProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  loadingStatusChange: (value: ImageLoadingStatus) => any;
}, string, vue37.PublicProps, Readonly<AvatarImageProps> & Readonly<{
  onLoadingStatusChange?: ((value: ImageLoadingStatus) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$262<T, S> = T & {
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
declare const _default$17: __VLS_WithSlots$261<vue37.DefineComponent<AvatarRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<AvatarRootProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$261<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=AvatarRoot.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarCell.vue.d.ts
interface CalendarCellProps extends PrimitiveProps {
  /** The date value for the cell */
  date: DateValue$1;
}
declare const _default$18: __VLS_WithSlots$260<vue37.DefineComponent<CalendarCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarCellProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$260<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarCell.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarCellTrigger.vue.d.ts
interface CalendarCellTriggerProps extends PrimitiveProps {
  /** The date value provided to the cell trigger */
  day: DateValue$1;
  /** The month in which the cell is rendered */
  month: DateValue$1;
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
declare const _default$19: __VLS_WithSlots$259<vue37.DefineComponent<CalendarCellTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, CalendarCellTriggerSlot>;
type __VLS_WithSlots$259<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarCellTrigger.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGrid.vue.d.ts
interface CalendarGridProps extends PrimitiveProps {}
declare const _default$20: __VLS_WithSlots$258<vue37.DefineComponent<CalendarGridProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarGridProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$258<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGrid.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGridBody.vue.d.ts
interface CalendarGridBodyProps extends PrimitiveProps {}
declare const _default$21: __VLS_WithSlots$257<vue37.DefineComponent<CalendarGridBodyProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$257<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGridBody.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGridHead.vue.d.ts
interface CalendarGridHeadProps extends PrimitiveProps {}
declare const _default$22: __VLS_WithSlots$256<vue37.DefineComponent<CalendarGridHeadProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarGridHeadProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$256<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGridHead.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarGridRow.vue.d.ts
interface CalendarGridRowProps extends PrimitiveProps {}
declare const _default$23: __VLS_WithSlots$255<vue37.DefineComponent<CalendarGridRowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarGridRowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$255<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarGridRow.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarHeadCell.vue.d.ts
interface CalendarHeadCellProps extends PrimitiveProps {}
declare const _default$24: __VLS_WithSlots$254<vue37.DefineComponent<CalendarHeadCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarHeadCellProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$254<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarHeadCell.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarHeader.vue.d.ts
interface CalendarHeaderProps extends PrimitiveProps {}
declare const _default$25: __VLS_WithSlots$253<vue37.DefineComponent<CalendarHeaderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarHeaderProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$253<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarHeader.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarHeading.vue.d.ts
interface CalendarHeadingProps extends PrimitiveProps {}
declare const _default$26: __VLS_WithSlots$252<vue37.DefineComponent<CalendarHeadingProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarHeadingProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$252<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarHeading.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarNext.vue.d.ts
interface CalendarNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the `CalendarRoot`. */
  nextPage?: (placeholder: DateValue$1) => DateValue$1;
}
interface CalendarNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$27: __VLS_WithSlots$251<vue37.DefineComponent<CalendarNextProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarNextProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, CalendarNextSlot>;
type __VLS_WithSlots$251<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarNext.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarPrev.vue.d.ts
interface CalendarPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the `CalendarRoot`. */
  prevPage?: (placeholder: DateValue$1) => DateValue$1;
}
interface CalendarPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$28: __VLS_WithSlots$250<vue37.DefineComponent<CalendarPrevProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CalendarPrevProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, CalendarPrevSlot>;
type __VLS_WithSlots$250<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CalendarPrev.vue.d.ts.map
//#endregion
//#region src/Calendar/CalendarRoot.vue.d.ts
type CalendarRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue$1 | DateValue$1[] | undefined>;
  placeholder: Ref<DateValue$1>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue$1>[]>;
  weekDays: Ref<string[]>;
  weekStartsOn: Ref<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  weekdayFormat: Ref<WeekDayFormat>;
  fixedWeeks: Ref<boolean>;
  multiple: Ref<boolean>;
  numberOfMonths: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onDateChange: (date: DateValue$1) => void;
  onPlaceholderChange: (date: DateValue$1) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  isInvalid: Ref<boolean>;
  isDateDisabled: Matcher;
  isDateSelected: Matcher;
  isDateUnavailable?: Matcher;
  isOutsideVisibleView: (date: DateValue$1) => boolean;
  prevPage: (prevPageFunc?: (date: DateValue$1) => DateValue$1) => void;
  nextPage: (nextPageFunc?: (date: DateValue$1) => DateValue$1) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue$1) => DateValue$1) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue$1) => DateValue$1) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  disableDaysOutsideCurrentView: Ref<boolean>;
};
interface CalendarRootProps extends PrimitiveProps {
  /** The default value for the calendar */
  defaultValue?: DateValue$1;
  /** The default placeholder date */
  defaultPlaceholder?: DateValue$1;
  /** The placeholder date, which is used to determine what month to display when no date is selected */
  placeholder?: DateValue$1;
  /** This property causes the previous and next buttons to navigate by the number of months displayed at once, rather than one month */
  pagedNavigation?: boolean;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The day of the week to start the calendar on */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** The format to use for the weekday strings provided via the weekdays slot prop */
  weekdayFormat?: WeekDayFormat;
  /** The accessible label for the calendar */
  calendarLabel?: string;
  /** Whether or not to always display 6 weeks in the calendar */
  fixedWeeks?: boolean;
  /** The maximum date that can be selected */
  maxValue?: DateValue$1;
  /** The minimum date that can be selected */
  minValue?: DateValue$1;
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
  nextPage?: (placeholder: DateValue$1) => DateValue$1;
  /** A function that returns the previous page of the calendar. It receives the current placeholder as an argument inside the component. */
  prevPage?: (placeholder: DateValue$1) => DateValue$1;
  /** The controlled checked state of the calendar */
  modelValue?: DateValue$1 | DateValue$1[] | undefined;
  /** Whether multiple dates can be selected */
  multiple?: boolean;
  /** Whether or not to disable days outside the current view. */
  disableDaysOutsideCurrentView?: boolean;
}
type CalendarRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue$1 | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue$1];
};
declare const injectCalendarRootContext: <T extends CalendarRootContext | null | undefined = CalendarRootContext>(fallback?: T | undefined) => T extends null ? CalendarRootContext | null : CalendarRootContext, provideCalendarRootContext: (contextValue: CalendarRootContext) => CalendarRootContext;
declare const _default$29: __VLS_WithSlots$249<vue37.DefineComponent<CalendarRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue$1 | undefined) => any;
  "update:placeholder": (date: DateValue$1) => any;
}, string, vue37.PublicProps, Readonly<CalendarRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue$1 | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue$1) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  placeholder: DateValue$1;
  disabled: boolean;
  defaultValue: DateValue$1;
  multiple: boolean;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  readonly: boolean;
  initialFocus: boolean;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  disableDaysOutsideCurrentView: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue$1;
    /** The grid of dates */
    grid: Grid<DateValue$1>[];
    /** The days of the week */
    weekDays: string[];
    /** The start of the week */
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    /** The calendar locale */
    locale: string;
    /** Whether or not to always display 6 weeks in the calendar */
    fixedWeeks: boolean;
    /** The current date of the calendar */
    modelValue: DateValue$1 | DateValue$1[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$249<T, S> = T & {
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
declare const _default$224: __VLS_WithSlots$248<vue37.DefineComponent<RovingFocusGroupProps, {
  getItems: (includeDisabledItem?: boolean) => {
    ref: HTMLElement;
    value?: any;
  }[];
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  "update:currentTabStopId": (value: string | null | undefined) => any;
}, string, vue37.PublicProps, Readonly<RovingFocusGroupProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  "onUpdate:currentTabStopId"?: ((value: string | null | undefined) => any) | undefined;
}>, {
  orientation: Orientation$1;
  loop: boolean;
  preventScrollOnEntryFocus: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$248<T, S> = T & {
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
declare const _default$225: __VLS_WithSlots$247<vue37.DefineComponent<RovingFocusItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RovingFocusItemProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  focusable: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$247<T, S> = T & {
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
declare const _default$30: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$13<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$13<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: T[]) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onUpdate:modelValue"> & CheckboxGroupRootProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "update:modelValue", value: T[]) => void;
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$13<T> = { [K in keyof T]: T[K] } & {};
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
declare const _default$31: __VLS_WithSlots$246<vue37.DefineComponent<CheckboxIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<CheckboxIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$246<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CheckboxIndicator.vue.d.ts.map
//#endregion
//#region src/Checkbox/utils.d.ts
type CheckedState = boolean | 'indeterminate';
//#endregion
//#region src/Checkbox/CheckboxRoot.vue.d.ts
interface CheckboxRootProps extends PrimitiveProps, FormFieldProps {
  /** The value of the checkbox when it is initially rendered. Use when you do not need to control its value. */
  defaultValue?: boolean | 'indeterminate';
  /** The controlled value of the checkbox. Can be binded with v-model. */
  modelValue?: boolean | 'indeterminate' | null;
  /** When `true`, prevents the user from interacting with the checkbox */
  disabled?: boolean;
  /**
   * The value given as data when submitted with a `name`.
   *  @defaultValue "on"
   */
  value?: AcceptableValue;
  /** Id of the element */
  id?: string;
}
type CheckboxRootEmits = {
  /** Event handler called when the value of the checkbox changes. */
  'update:modelValue': [value: boolean | 'indeterminate'];
};
interface CheckboxRootContext {
  disabled: Ref<boolean>;
  state: Ref<CheckedState>;
}
declare const injectCheckboxRootContext: <T extends CheckboxRootContext | null | undefined = CheckboxRootContext>(fallback?: T | undefined) => T extends null ? CheckboxRootContext | null : CheckboxRootContext, provideCheckboxRootContext: (contextValue: CheckboxRootContext) => CheckboxRootContext;
declare const _default$32: __VLS_WithSlots$245<vue37.DefineComponent<CheckboxRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (value: boolean | "indeterminate") => any;
}, string, vue37.PublicProps, Readonly<CheckboxRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: boolean | "indeterminate") => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  value: AcceptableValue;
  modelValue: boolean | "indeterminate" | null;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current value */
    modelValue: CheckedState;
    /** Current state */
    state: CheckedState;
  }) => any;
}>;
type __VLS_WithSlots$245<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=CheckboxRoot.vue.d.ts.map
//#endregion
//#region src/Popper/PopperAnchor.vue.d.ts
interface PopperAnchorProps extends PrimitiveProps {
  /**
   *  The reference (or anchor) element that is being referred to for positioning.
   *
   *  If not provided will use the current component as anchor.
   */
  reference?: ReferenceElement$1;
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
   * @defaultValue "top"
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
  reference?: ReferenceElement$1;
}
//#endregion
//#region src/Combobox/ComboboxAnchor.vue.d.ts
interface ComboboxAnchorProps extends PopperAnchorProps {}
declare const _default$36: __VLS_WithSlots$244<vue37.DefineComponent<ComboboxAnchorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$244<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxAnchor.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxArrow.vue.d.ts
interface ComboboxArrowProps extends PopperArrowProps {}
declare const _default$37: __VLS_WithSlots$243<vue37.DefineComponent<ComboboxArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$243<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxArrow.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxCancel.vue.d.ts
interface ComboboxCancelProps extends PrimitiveProps {}
declare const _default$38: __VLS_WithSlots$242<vue37.DefineComponent<ComboboxCancelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxCancelProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$242<T, S> = T & {
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
declare const _default$39: __VLS_WithSlots$241<vue37.DefineComponent<ComboboxContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
}, string, vue37.PublicProps, Readonly<ComboboxContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$241<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxContent.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxEmpty.vue.d.ts
interface ComboboxEmptyProps extends PrimitiveProps {}
declare const _default$40: __VLS_WithSlots$240<vue37.DefineComponent<ComboboxEmptyProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxEmptyProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$240<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxEmpty.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxContent.vue.d.ts
interface ListboxContentProps extends PrimitiveProps {}
declare const _default$151: __VLS_WithSlots$239<vue37.DefineComponent<ListboxContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ListboxContentProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$239<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ListboxContent.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxFilter.vue.d.ts
interface ListboxFilterProps extends PrimitiveProps {
  /** The controlled value of the filter. Can be binded with with v-model. */
  modelValue?: string;
  /** Focus on element when mounted. */
  autoFocus?: boolean;
  /** When `true`, prevents the user from interacting with item */
  disabled?: boolean;
}
type ListboxFilterEmits = {
  'update:modelValue': [string];
};
declare const _default$152: __VLS_WithSlots$238<vue37.DefineComponent<ListboxFilterProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (args_0: string) => any;
}, string, vue37.PublicProps, Readonly<ListboxFilterProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: string) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string | undefined;
  }) => any;
}>;
type __VLS_WithSlots$238<T, S> = T & {
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
declare const _default$153: __VLS_WithSlots$237<vue37.DefineComponent<ListboxGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ListboxGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$237<T, S> = T & {
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
declare const _default$154: __VLS_WithSlots$236<vue37.DefineComponent<ListboxGroupLabelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ListboxGroupLabelProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$236<T, S> = T & {
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
type SelectEvent<T> = CustomEvent<{
  originalEvent: PointerEvent;
  value?: T;
}>;
type ListboxItemEmits<T = AcceptableValue> = {
  /** Event handler called when the selecting item. <br> It can be prevented by calling `event.preventDefault`. */
  select: [event: SelectEvent<T>];
};
interface ListboxItemContext {
  isSelected: Ref<boolean>;
}
declare const injectListboxItemContext: <T extends ListboxItemContext | null | undefined = ListboxItemContext>(fallback?: T | undefined) => T extends null ? ListboxItemContext | null : ListboxItemContext, provideListboxItemContext: (contextValue: ListboxItemContext) => ListboxItemContext;
declare const _default$155: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$12<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$12<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent<T>) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onSelect"> & ListboxItemProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "select", event: SelectEvent<T>) => void;
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$12<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ListboxItem.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxItemIndicator.vue.d.ts
interface ListboxItemIndicatorProps extends PrimitiveProps {}
declare const _default$156: __VLS_WithSlots$235<vue37.DefineComponent<ListboxItemIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ListboxItemIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$235<T, S> = T & {
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
  /** The controlled value of the listbox. Can be binded with with `v-model`. */
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
declare const _default$157: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$11<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$11<Pick<Partial<{}> & Omit<{
    readonly onEntryFocus?: ((event: CustomEvent<any>) => any) | undefined;
    readonly "onUpdate:modelValue"?: ((value: AcceptableValue) => any) | undefined;
    readonly onHighlight?: ((payload: {
      ref: HTMLElement;
      value: AcceptableValue;
    } | undefined) => any) | undefined;
    readonly onLeave?: ((event: Event) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onEntryFocus" | "onUpdate:modelValue" | "onHighlight" | "onLeave"> & ListboxRootProps<AcceptableValue> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{
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
  emit: ((evt: "entryFocus", event: CustomEvent<any>) => void) & ((evt: "update:modelValue", value: AcceptableValue) => void) & ((evt: "highlight", payload: {
    ref: HTMLElement;
    value: AcceptableValue;
  } | undefined) => void) & ((evt: "leave", event: Event) => void);
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$11<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ListboxRoot.vue.d.ts.map
//#endregion
//#region src/Listbox/ListboxVirtualizer.vue.d.ts
interface ListboxVirtualizerProps<T extends AcceptableValue = AcceptableValue> {
  /** List of items */
  options: T[];
  /** Number of items rendered outside the visible area */
  overscan?: number;
  /** Estimated size (in px) of each item */
  estimateSize?: number;
  /** Text content for each item to achieve type-ahead feature */
  textContent?: (option: T) => string;
}
declare const _default$158: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$10<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$10<Pick<Partial<{}> & Omit<{} & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, never> & ListboxVirtualizerProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      option: T;
      virtualizer: Virtualizer<HTMLElement, Element>;
      virtualItem: VirtualItem;
    }) => any;
  };
  emit: {};
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$10<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ListboxVirtualizer.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxGroup.vue.d.ts
interface ComboboxGroupProps extends ListboxGroupProps {}
type ComboboxGroupContext = {
  id: string;
  labelId: string;
};
declare const injectComboboxGroupContext: <T extends ComboboxGroupContext | null | undefined = ComboboxGroupContext>(fallback?: T | undefined) => T extends null ? ComboboxGroupContext | null : ComboboxGroupContext, provideComboboxGroupContext: (contextValue: ComboboxGroupContext) => ComboboxGroupContext;
declare const _default$41: __VLS_WithSlots$234<vue37.DefineComponent<ComboboxGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$234<T, S> = T & {
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
declare const _default$42: __VLS_WithSlots$233<vue37.DefineComponent<ComboboxInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (args_0: string) => any;
}, string, vue37.PublicProps, Readonly<ComboboxInputProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: string) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$233<T, S> = T & {
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
declare const _default$43: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$9<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$9<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent<T>) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onSelect"> & ComboboxItemProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "select", event: SelectEvent<T>) => void;
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$9<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ComboboxItem.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxItemIndicator.vue.d.ts
interface ComboboxItemIndicatorProps extends ListboxItemIndicatorProps {}
declare const _default$44: __VLS_WithSlots$232<vue37.DefineComponent<ComboboxItemIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxItemIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$232<T, S> = T & {
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
declare const _default$45: __VLS_WithSlots$231<vue37.DefineComponent<ComboboxLabelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxLabelProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$231<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxLabel.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxPortal.vue.d.ts
interface ComboboxPortalProps extends TeleportProps {}
declare const _default$46: __VLS_WithSlots$230<vue37.DefineComponent<ComboboxPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$230<T, S> = T & {
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
  /** The controlled open state of the Combobox. Can be binded with with `v-model:open`. */
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
}
declare const _default$47: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$8<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$8<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: T) => any) | undefined;
    readonly "onUpdate:open"?: ((value: boolean) => any) | undefined;
    readonly onHighlight?: ((payload: {
      ref: HTMLElement;
      value: T;
    } | undefined) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onUpdate:modelValue" | "onUpdate:open" | "onHighlight"> & ComboboxRootProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{
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
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$8<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ComboboxRoot.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxSeparator.vue.d.ts
interface ComboboxSeparatorProps extends PrimitiveProps {}
declare const _default$48: __VLS_WithSlots$229<vue37.DefineComponent<ComboboxSeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$229<T, S> = T & {
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
declare const _default$49: __VLS_WithSlots$228<vue37.DefineComponent<ComboboxTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$228<T, S> = T & {
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
declare const _default$50: __VLS_WithSlots$227<vue37.DefineComponent<ComboboxViewportProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ComboboxViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$227<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ComboboxViewport.vue.d.ts.map
//#endregion
//#region src/Combobox/ComboboxVirtualizer.vue.d.ts
interface ComboboxVirtualizerProps<T extends AcceptableValue = AcceptableValue> extends ListboxVirtualizerProps<T> {}
declare const _default$51: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$7<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$7<Pick<Partial<{}> & Omit<{} & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, never> & ComboboxVirtualizerProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      option: T;
      virtualizer: Virtualizer<HTMLElement, Element>;
      virtualItem: VirtualItem;
    }) => any;
  };
  emit: {};
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$7<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=ComboboxVirtualizer.vue.d.ts.map
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
declare const _default$52: __VLS_WithSlots$226<vue37.DefineComponent<ConfigProviderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ConfigProviderProps> & Readonly<{}>, {
  useId: () => string;
  dir: Direction;
  nonce: string;
  locale: string;
  scrollBody: boolean | ScrollBodyOption;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$226<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ConfigProvider.vue.d.ts.map
//#endregion
//#region src/Menu/MenuArrow.vue.d.ts
interface MenuArrowProps extends PopperArrowProps {}
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
//#endregion
//#region src/Menu/utils.d.ts
type CheckedState$1 = boolean | 'indeterminate';
type Direction$4 = 'ltr' | 'rtl';
//#endregion
//#region src/Menu/MenuCheckboxItem.vue.d.ts
type MenuCheckboxItemEmits = MenuItemEmits & {
  /** Event handler called when the checked state changes. */
  'update:modelValue': [payload: boolean];
};
interface MenuCheckboxItemProps extends MenuItemProps {
  /** The controlled checked state of the item. Can be used as `v-model`. */
  modelValue?: CheckedState$1;
}
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
declare const _default$144: __VLS_WithSlots$225<vue37.DefineComponent<FocusScopeProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  mountAutoFocus: (event: Event) => any;
  unmountAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<FocusScopeProps> & Readonly<{
  onMountAutoFocus?: ((event: Event) => any) | undefined;
  onUnmountAutoFocus?: ((event: Event) => any) | undefined;
}>, {
  loop: boolean;
  trapped: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$225<T, S> = T & {
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
//#endregion
//#region src/Menu/MenuGroup.vue.d.ts
interface MenuGroupProps extends PrimitiveProps {}
//#endregion
//#region src/Menu/MenuItemIndicator.vue.d.ts
interface MenuItemIndicatorProps extends PrimitiveProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with Vue animation libraries.
   */
  forceMount?: boolean;
}
//#endregion
//#region src/Menu/MenuLabel.vue.d.ts
interface MenuLabelProps extends PrimitiveProps {}
//#endregion
//#region src/Menu/MenuPortal.vue.d.ts
interface MenuPortalProps extends TeleportProps {}
//#endregion
//#region src/Menu/MenuRadioGroup.vue.d.ts
interface MenuRadioGroupProps extends MenuGroupProps {
  /** The value of the selected item in the group. */
  modelValue?: string;
}
type MenuRadioGroupEmits = {
  /** Event handler called when the value changes. */
  'update:modelValue': [payload: string];
};
//#endregion
//#region src/Menu/MenuRadioItem.vue.d.ts
type MenuRadioItemEmits = MenuItemEmits;
interface MenuRadioItemProps extends MenuItemProps {
  /** The unique value of the item. */
  value: string;
}
//#endregion
//#region src/Menu/MenuRoot.vue.d.ts
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
//#endregion
//#region src/Menu/MenuSeparator.vue.d.ts
interface MenuSeparatorProps extends PrimitiveProps {}
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
//#endregion
//#region src/Menu/MenuSubTrigger.vue.d.ts
interface MenuSubTriggerProps extends MenuItemImplProps {}
//#endregion
//#region src/ContextMenu/ContextMenuArrow.vue.d.ts
interface ContextMenuArrowProps extends MenuArrowProps {}
declare const _default$53: __VLS_WithSlots$224<vue37.DefineComponent<ContextMenuArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$224<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuArrow.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuCheckboxItem.vue.d.ts
type ContextMenuCheckboxItemEmits = MenuCheckboxItemEmits;
interface ContextMenuCheckboxItemProps extends MenuCheckboxItemProps {}
declare const _default$54: __VLS_WithSlots$223<vue37.DefineComponent<ContextMenuCheckboxItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
  "update:modelValue": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<ContextMenuCheckboxItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$223<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuCheckboxItem.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuContent.vue.d.ts
type ContextMenuContentEmits = MenuContentEmits;
interface ContextMenuContentProps extends Omit<MenuContentProps, 'side' | 'sideOffset' | 'align' | 'arrowPadding' | 'updatePositionStrategy'> {}
declare const _default$55: __VLS_WithSlots$222<vue37.DefineComponent<ContextMenuContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<ContextMenuContentProps> & Readonly<{
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
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$222<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuContent.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuGroup.vue.d.ts
interface ContextMenuGroupProps extends MenuGroupProps {}
declare const _default$56: __VLS_WithSlots$221<vue37.DefineComponent<ContextMenuGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$221<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuGroup.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuItem.vue.d.ts
type ContextMenuItemEmits = MenuItemEmits;
interface ContextMenuItemProps extends MenuItemProps {}
declare const _default$57: __VLS_WithSlots$220<vue37.DefineComponent<MenuItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<MenuItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$220<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuItem.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuItemIndicator.vue.d.ts
interface ContextMenuItemIndicatorProps extends MenuItemIndicatorProps {}
declare const _default$58: __VLS_WithSlots$219<vue37.DefineComponent<ContextMenuItemIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuItemIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$219<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuItemIndicator.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuLabel.vue.d.ts
interface ContextMenuLabelProps extends MenuLabelProps {}
declare const _default$59: __VLS_WithSlots$218<vue37.DefineComponent<ContextMenuLabelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuLabelProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$218<T, S> = T & {
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
declare const __VLS_component: vue37.DefineComponent<ContextMenuPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>;
declare const _default$60: __VLS_WithSlots$217<typeof __VLS_component, __VLS_Slots>;
type __VLS_WithSlots$217<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuPortal.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuRadioGroup.vue.d.ts
type ContextMenuRadioGroupEmits = MenuRadioGroupEmits;
interface ContextMenuRadioGroupProps extends MenuRadioGroupProps {}
declare const _default$61: __VLS_WithSlots$216<vue37.DefineComponent<ContextMenuRadioGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: string) => any;
}, string, vue37.PublicProps, Readonly<ContextMenuRadioGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: string) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$216<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuRadioGroup.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuRadioItem.vue.d.ts
type ContextMenuRadioItemEmits = MenuItemEmits;
interface ContextMenuRadioItemProps extends MenuRadioItemProps {}
declare const _default$62: __VLS_WithSlots$215<vue37.DefineComponent<ContextMenuRadioItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<ContextMenuRadioItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$215<T, S> = T & {
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
   * The duration from when the trigger is pressed until the menu openes.
   *
   * @defaultValue 700
   */
  pressOpenDelay?: number;
}
type ContextMenuRootEmits = MenuEmits;
declare const injectContextMenuRootContext: <T extends ContextMenuRootContext | null | undefined = ContextMenuRootContext>(fallback?: T | undefined) => T extends null ? ContextMenuRootContext | null : ContextMenuRootContext, provideContextMenuRootContext: (contextValue: ContextMenuRootContext) => ContextMenuRootContext;
declare const _default$63: __VLS_WithSlots$214<vue37.DefineComponent<ContextMenuRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<ContextMenuRootProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  modal: boolean;
  pressOpenDelay: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$214<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuRoot.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuSeparator.vue.d.ts
interface ContextMenuSeparatorProps extends MenuSeparatorProps {}
declare const _default$64: __VLS_WithSlots$213<vue37.DefineComponent<ContextMenuSeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$213<T, S> = T & {
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
declare const _default$65: __VLS_WithSlots$212<vue37.DefineComponent<ContextMenuSubProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<ContextMenuSubProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$212<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuSub.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuSubContent.vue.d.ts
type ContextMenuSubContentEmits = MenuSubContentEmits;
interface ContextMenuSubContentProps extends MenuSubContentProps {}
declare const _default$66: __VLS_WithSlots$211<vue37.DefineComponent<ContextMenuSubContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<ContextMenuSubContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$211<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ContextMenuSubContent.vue.d.ts.map
//#endregion
//#region src/ContextMenu/ContextMenuSubTrigger.vue.d.ts
interface ContextMenuSubTriggerProps extends MenuSubTriggerProps {}
declare const _default$67: __VLS_WithSlots$210<vue37.DefineComponent<ContextMenuSubTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuSubTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$210<T, S> = T & {
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
declare const _default$68: __VLS_WithSlots$209<vue37.DefineComponent<ContextMenuTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ContextMenuTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  disabled: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$209<T, S> = T & {
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
declare const _default$69: __VLS_WithSlots$208<vue37.DefineComponent<DateFieldInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateFieldInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$208<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateFieldInput.vue.d.ts.map
//#endregion
//#region src/DateField/DateFieldRoot.vue.d.ts
type DateFieldRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue$1 | undefined>;
  placeholder: Ref<DateValue$1>;
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
  defaultValue?: DateValue$1;
  /** The default placeholder date */
  defaultPlaceholder?: DateValue$1;
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue$1;
  /** The controlled checked state of the calendar. Can be bound as `v-model`. */
  modelValue?: DateValue$1 | null;
  /** The hour cycle used for formatting times. Defaults to the local preference */
  hourCycle?: HourCycle;
  /** The stepping interval for the time fields. Defaults to `1`. */
  step?: DateStep;
  /** The granularity to use for formatting times. Defaults to day if a CalendarDate is provided, otherwise defaults to minute. The field will render segments for each part of the date up to and including the specified granularity */
  granularity?: Granularity;
  /** Whether or not to hide the time zone segment of the field */
  hideTimeZone?: boolean;
  /** The maximum date that can be selected */
  maxValue?: DateValue$1;
  /** The minimum date that can be selected */
  minValue?: DateValue$1;
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
  'update:modelValue': [date: DateValue$1 | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue$1];
};
declare const injectDateFieldRootContext: <T extends DateFieldRootContext | null | undefined = DateFieldRootContext>(fallback?: T | undefined) => T extends null ? DateFieldRootContext | null : DateFieldRootContext, provideDateFieldRootContext: (contextValue: DateFieldRootContext) => DateFieldRootContext;
declare const _default$70: __VLS_WithSlots$207<vue37.DefineComponent<DateFieldRootProps, {
  /** Helper to set the focused element inside the DateField */
  setFocusedElement: (el: HTMLElement) => void;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue$1 | undefined) => any;
  "update:placeholder": (date: DateValue$1) => any;
}, string, vue37.PublicProps, Readonly<DateFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue$1 | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue$1) => any) | undefined;
}>, {
  placeholder: DateValue$1;
  disabled: boolean;
  defaultValue: DateValue$1;
  readonly: boolean;
  isDateUnavailable: Matcher;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the field */
    modelValue: DateValue$1 | undefined;
    /** The date field segment contents */
    segments: {
      part: SegmentPart;
      value: string;
    }[];
    /** Value if the input is invalid */
    isInvalid: boolean;
  }) => any;
}>;
type __VLS_WithSlots$207<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateFieldRoot.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerAnchor.vue.d.ts
interface DatePickerAnchorProps extends PopoverAnchorProps {}
declare const _default$71: __VLS_WithSlots$206<vue37.DefineComponent<DatePickerAnchorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$206<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerAnchor.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerArrow.vue.d.ts
interface DatePickerArrowProps extends PopoverArrowProps {}
declare const _default$72: __VLS_WithSlots$205<vue37.DefineComponent<DatePickerArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerArrowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$205<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerArrow.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerCalendar.vue.d.ts
declare const _default$73: __VLS_WithSlots$204<vue37.DefineComponent<{}, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, true, {}, any>, {
  default?: (props: {
    date: DateValue$1;
    grid: Grid<DateValue$1>[];
    weekDays: string[];
    weekStartsOn: 0 | 5 | 1 | 3 | 2 | 4 | 6;
    locale: string;
    fixedWeeks: boolean;
  }) => any;
}>;
type __VLS_WithSlots$204<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerCalendar.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerCell.vue.d.ts
interface DatePickerCellProps extends CalendarCellProps {}
declare const _default$74: __VLS_WithSlots$203<vue37.DefineComponent<DatePickerCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$203<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerCell.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerCellTrigger.vue.d.ts
interface DatePickerCellTriggerProps extends CalendarCellTriggerProps {}
declare const _default$75: __VLS_WithSlots$202<vue37.DefineComponent<DatePickerCellTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerCellTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, CalendarCellTriggerSlot>;
type __VLS_WithSlots$202<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerClose.vue.d.ts
interface DatePickerCloseProps extends PopoverCloseProps {}
declare const _default$76: __VLS_WithSlots$201<vue37.DefineComponent<DatePickerCloseProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerCloseProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$201<T, S> = T & {
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
declare const _default$77: __VLS_WithSlots$200<vue37.DefineComponent<DatePickerContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<DatePickerContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$200<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerContent.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerField.vue.d.ts
declare const _default$78: __VLS_WithSlots$199<vue37.DefineComponent<{}, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, true, {}, any>, {
  default?: (props: {
    segments: {
      part: SegmentPart;
      value: string;
    }[];
    modelValue: DateValue$1 | undefined;
  }) => any;
}>;
type __VLS_WithSlots$199<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerField.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGrid.vue.d.ts
interface DatePickerGridProps extends CalendarGridProps {}
declare const _default$79: __VLS_WithSlots$198<vue37.DefineComponent<DatePickerGridProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerGridProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$198<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGrid.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGridBody.vue.d.ts
interface DatePickerGridBodyProps extends CalendarGridBodyProps {}
declare const _default$80: __VLS_WithSlots$197<vue37.DefineComponent<DatePickerGridBodyProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerGridBodyProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$197<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGridBody.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGridHead.vue.d.ts
interface DatePickerGridHeadProps extends CalendarGridHeadProps {}
declare const _default$81: __VLS_WithSlots$196<vue37.DefineComponent<DatePickerGridHeadProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerGridHeadProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$196<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGridHead.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerGridRow.vue.d.ts
interface DatePickerGridRowProps extends CalendarGridRowProps {}
declare const _default$82: __VLS_WithSlots$195<vue37.DefineComponent<DatePickerGridRowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerGridRowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$195<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerGridRow.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerHeadCell.vue.d.ts
interface DatePickerHeadCellProps extends CalendarHeadCellProps {}
declare const _default$83: __VLS_WithSlots$194<vue37.DefineComponent<DatePickerHeadCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerHeadCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$194<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerHeadCell.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerHeader.vue.d.ts
interface DatePickerHeaderProps extends CalendarHeaderProps {}
declare const _default$84: __VLS_WithSlots$193<vue37.DefineComponent<DatePickerHeaderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerHeaderProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$193<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerHeader.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerHeading.vue.d.ts
interface DatePickerHeadingProps extends CalendarHeadingProps {}
declare const _default$85: __VLS_WithSlots$192<vue37.DefineComponent<DatePickerHeadingProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerHeadingProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$192<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerHeading.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerInput.vue.d.ts
interface DatePickerInputProps extends DateFieldInputProps {}
declare const _default$86: __VLS_WithSlots$191<vue37.DefineComponent<DatePickerInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$191<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerInput.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerNext.vue.d.ts
interface DatePickerNextProps extends CalendarNextProps {}
declare const _default$87: __VLS_WithSlots$190<vue37.DefineComponent<DatePickerNextProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerNextProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, CalendarNextSlot>;
type __VLS_WithSlots$190<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerNext.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerPrev.vue.d.ts
interface DatePickerPrevProps extends CalendarPrevProps {}
declare const _default$88: __VLS_WithSlots$189<vue37.DefineComponent<DatePickerPrevProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerPrevProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, CalendarPrevSlot>;
type __VLS_WithSlots$189<T, S> = T & {
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
  minValue: Ref<DateValue$1 | undefined>;
  maxValue: Ref<DateValue$1 | undefined>;
  hourCycle: Ref<HourCycle | undefined>;
  granularity: Ref<Granularity | undefined>;
  hideTimeZone: Ref<boolean>;
  required: Ref<boolean>;
  locale: Ref<string>;
  dateFieldRef: Ref<InstanceType<typeof _default$70> | undefined>;
  modelValue: Ref<DateValue$1 | undefined>;
  placeholder: Ref<DateValue$1>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  weekStartsOn: Ref<0 | 1 | 2 | 3 | 4 | 5 | 6>;
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
  onDateChange: (date: DateValue$1 | undefined) => void;
  onPlaceholderChange: (date: DateValue$1) => void;
  dir: Ref<Direction>;
  step: Ref<DateStep | undefined>;
  closeOnSelect: Ref<boolean>;
};
type DatePickerRootProps = DateFieldRootProps & PopoverRootProps & Pick<CalendarRootProps, 'isDateDisabled' | 'pagedNavigation' | 'weekStartsOn' | 'weekdayFormat' | 'fixedWeeks' | 'numberOfMonths' | 'preventDeselect'> & {
  /** Whether or not to close the popover on date select */
  closeOnSelect?: boolean;
};
type DatePickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateValue$1 | undefined];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue$1];
};
declare const injectDatePickerRootContext: <T extends DatePickerRootContext | null | undefined = DatePickerRootContext>(fallback?: T | undefined) => T extends null ? DatePickerRootContext | null : DatePickerRootContext, provideDatePickerRootContext: (contextValue: DatePickerRootContext) => DatePickerRootContext;
declare const _default$89: __VLS_WithSlots$188<vue37.DefineComponent<DatePickerRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (date: DateValue$1 | undefined) => any;
  "update:open": (value: boolean) => any;
  "update:placeholder": (date: DateValue$1) => any;
}, string, vue37.PublicProps, Readonly<DatePickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateValue$1 | undefined) => any) | undefined;
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue$1) => any) | undefined;
}>, {
  placeholder: DateValue$1;
  locale: string;
  disabled: boolean;
  defaultValue: DateValue$1;
  open: boolean;
  defaultOpen: boolean;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  readonly: boolean;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  modal: boolean;
  closeOnSelect: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$188<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DatePickerRoot.vue.d.ts.map
//#endregion
//#region src/DatePicker/DatePickerTrigger.vue.d.ts
interface DatePickerTriggerProps extends PopoverTriggerProps {}
declare const _default$90: __VLS_WithSlots$187<vue37.DefineComponent<DatePickerTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DatePickerTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$187<T, S> = T & {
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
  startValue: Ref<DateValue$1 | undefined>;
  endValue: Ref<DateValue$1 | undefined>;
  placeholder: Ref<DateValue$1>;
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
  defaultPlaceholder?: DateValue$1;
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue$1;
  /** The controlled checked state of the calendar. Can be bound as `v-model`. */
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
  maxValue?: DateValue$1;
  /** The minimum date that can be selected */
  minValue?: DateValue$1;
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
  'update:placeholder': [date: DateValue$1];
};
declare const injectDateRangeFieldRootContext: <T extends DateRangeFieldRootContext | null | undefined = DateRangeFieldRootContext>(fallback?: T | undefined) => T extends null ? DateRangeFieldRootContext | null : DateRangeFieldRootContext, provideDateRangeFieldRootContext: (contextValue: DateRangeFieldRootContext) => DateRangeFieldRootContext;
declare const _default$92: __VLS_WithSlots$186<vue37.DefineComponent<DateRangeFieldRootProps, {
  setFocusedElement: (el: HTMLElement) => void;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (args_0: DateRange) => any;
  "update:placeholder": (date: DateValue$1) => any;
}, string, vue37.PublicProps, Readonly<DateRangeFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((args_0: DateRange) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue$1) => any) | undefined;
}>, {
  placeholder: DateValue$1;
  disabled: boolean;
  defaultValue: DateRange;
  readonly: boolean;
  isDateUnavailable: Matcher;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: DateRange | null;
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
  }) => any;
}>;
type __VLS_WithSlots$186<T, S> = T & {
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
declare const _default$91: __VLS_WithSlots$185<vue37.DefineComponent<DateRangeFieldInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangeFieldInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$185<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangeFieldInput.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerAnchor.vue.d.ts
interface DateRangePickerAnchorProps extends PopoverAnchorProps {}
declare const _default$93: __VLS_WithSlots$184<vue37.DefineComponent<DateRangePickerAnchorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$184<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerAnchor.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerArrow.vue.d.ts
interface DateRangePickerArrowProps extends PopoverArrowProps {}
declare const _default$94: __VLS_WithSlots$183<vue37.DefineComponent<DateRangePickerArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerArrowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$183<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerArrow.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerCalendar.vue.d.ts
declare const _default$95: __VLS_WithSlots$182<vue37.DefineComponent<{}, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, true, {}, any>, {
  default?: (props: {
    date: _internationalized_date982.DateValue;
    grid: Grid<_internationalized_date982.DateValue>[];
    weekDays: string[];
    weekStartsOn: 0 | 5 | 1 | 3 | 2 | 4 | 6;
    locale: string;
    fixedWeeks: boolean;
  }) => any;
}>;
type __VLS_WithSlots$182<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerCalendar.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerCell.vue.d.ts
interface DateRangePickerCellProps extends RangeCalendarCellProps {}
declare const _default$96: __VLS_WithSlots$181<vue37.DefineComponent<DateRangePickerCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$181<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerCell.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarCellTrigger.vue.d.ts
interface RangeCalendarCellTriggerProps extends PrimitiveProps {
  day: DateValue$1;
  month: DateValue$1;
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
declare const _default$213: __VLS_WithSlots$180<vue37.DefineComponent<RangeCalendarCellTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarCellTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, RangeCalendarCellTriggerSlot>;
type __VLS_WithSlots$180<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarCellTrigger.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerCellTrigger.vue.d.ts
interface DateRangePickerCellTriggerProps extends RangeCalendarCellTriggerProps {}
declare const _default$97: __VLS_WithSlots$179<vue37.DefineComponent<DateRangePickerCellTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerCellTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, RangeCalendarCellTriggerSlot>;
type __VLS_WithSlots$179<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerCellTrigger.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerClose.vue.d.ts
interface DateRangePickerCloseProps extends PopoverCloseProps {}
declare const _default$98: __VLS_WithSlots$178<vue37.DefineComponent<DateRangePickerCloseProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerCloseProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$178<T, S> = T & {
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
declare const _default$99: __VLS_WithSlots$177<vue37.DefineComponent<DateRangePickerContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<DateRangePickerContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$177<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerContent.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerField.vue.d.ts
declare const _default$100: __VLS_WithSlots$176<vue37.DefineComponent<{}, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, true, {}, any>, {
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
type __VLS_WithSlots$176<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerField.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGrid.vue.d.ts
interface DateRangePickerGridProps extends RangeCalendarGridProps {}
declare const _default$101: __VLS_WithSlots$175<vue37.DefineComponent<DateRangePickerGridProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerGridProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$175<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGrid.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGridBody.vue.d.ts
interface DateRangePickerGridBodyProps extends RangeCalendarGridBodyProps {}
declare const _default$102: __VLS_WithSlots$174<vue37.DefineComponent<DateRangePickerGridBodyProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerGridBodyProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$174<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGridBody.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGridHead.vue.d.ts
interface DateRangePickerGridHeadProps extends RangeCalendarGridHeadProps {}
declare const _default$103: __VLS_WithSlots$173<vue37.DefineComponent<DateRangePickerGridHeadProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerGridHeadProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$173<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGridHead.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerGridRow.vue.d.ts
interface DateRangePickerGridRowProps extends RangeCalendarGridRowProps {}
declare const _default$104: __VLS_WithSlots$172<vue37.DefineComponent<DateRangePickerGridRowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerGridRowProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$172<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerGridRow.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerHeadCell.vue.d.ts
interface DateRangePickerHeadCellProps extends RangeCalendarHeadCellProps {}
declare const _default$105: __VLS_WithSlots$171<vue37.DefineComponent<DateRangePickerHeadCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerHeadCellProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$171<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerHeadCell.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerHeader.vue.d.ts
interface DateRangePickerHeaderProps extends RangeCalendarHeaderProps {}
declare const _default$106: __VLS_WithSlots$170<vue37.DefineComponent<DateRangePickerHeaderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerHeaderProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$170<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerHeader.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerHeading.vue.d.ts
interface DateRangePickerHeadingProps extends RangeCalendarHeadingProps {}
declare const _default$107: __VLS_WithSlots$169<vue37.DefineComponent<DateRangePickerHeadingProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerHeadingProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$169<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerHeading.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerInput.vue.d.ts
interface DateRangePickerInputProps extends DateRangeFieldInputProps {}
declare const _default$108: __VLS_WithSlots$168<vue37.DefineComponent<DateRangePickerInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$168<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerInput.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarNext.vue.d.ts
interface RangeCalendarNextProps extends PrimitiveProps {
  /** The function to be used for the next page. Overwrites the `nextPage` function set on the `RangeCalendarRoot`. */
  nextPage?: (placeholder: DateValue$1) => DateValue$1;
}
interface RangeCalendarNextSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$221: __VLS_WithSlots$167<vue37.DefineComponent<RangeCalendarNextProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarNextProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, RangeCalendarNextSlot>;
type __VLS_WithSlots$167<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarNext.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerNext.vue.d.ts
interface DateRangePickerNextProps extends RangeCalendarNextProps {}
declare const _default$109: __VLS_WithSlots$166<vue37.DefineComponent<DateRangePickerNextProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerNextProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, RangeCalendarNextSlot>;
type __VLS_WithSlots$166<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerNext.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarPrev.vue.d.ts
interface RangeCalendarPrevProps extends PrimitiveProps {
  /** The function to be used for the prev page. Overwrites the `prevPage` function set on the `RangeCalendarRoot`. */
  prevPage?: (placeholder: DateValue$1) => DateValue$1;
}
interface RangeCalendarPrevSlot {
  default?: (props: {
    /** Current disable state */
    disabled: boolean;
  }) => any;
}
declare const _default$222: __VLS_WithSlots$165<vue37.DefineComponent<RangeCalendarPrevProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarPrevProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, RangeCalendarPrevSlot>;
type __VLS_WithSlots$165<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarPrev.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerPrev.vue.d.ts
interface DateRangePickerPrevProps extends RangeCalendarPrevProps {}
declare const _default$110: __VLS_WithSlots$164<vue37.DefineComponent<DateRangePickerPrevProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerPrevProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, RangeCalendarPrevSlot>;
type __VLS_WithSlots$164<T, S> = T & {
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
  minValue: Ref<DateValue$1 | undefined>;
  maxValue: Ref<DateValue$1 | undefined>;
  hourCycle: Ref<HourCycle | undefined>;
  granularity: Ref<Granularity | undefined>;
  hideTimeZone: Ref<boolean>;
  required: Ref<boolean>;
  locale: Ref<string>;
  dateFieldRef: Ref<InstanceType<typeof _default$92> | undefined>;
  modelValue: Ref<{
    start: DateValue$1 | undefined;
    end: DateValue$1 | undefined;
  }>;
  placeholder: Ref<DateValue$1>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  weekStartsOn: Ref<0 | 1 | 2 | 3 | 4 | 5 | 6>;
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
  onPlaceholderChange: (date: DateValue$1) => void;
  onStartValueChange: (date: DateValue$1 | undefined) => void;
  dir: Ref<Direction>;
  allowNonContiguousRanges: Ref<boolean>;
  fixedDate: Ref<'start' | 'end' | undefined>;
  maximumDays?: Ref<number | undefined>;
  step: Ref<DateStep | undefined>;
  closeOnSelect?: Ref<boolean>;
};
type DateRangePickerRootProps = DateRangeFieldRootProps & PopoverRootProps & Pick<RangeCalendarRootProps, 'isDateDisabled' | 'pagedNavigation' | 'weekStartsOn' | 'weekdayFormat' | 'fixedWeeks' | 'numberOfMonths' | 'preventDeselect' | 'isDateUnavailable' | 'isDateHighlightable' | 'allowNonContiguousRanges' | 'fixedDate' | 'maximumDays'> & {
  /** Whether or not to close the popover on range select */
  closeOnSelect?: boolean;
};
type DateRangePickerRootEmits = {
  /** Event handler called whenever the model value changes */
  'update:modelValue': [date: DateRange];
  /** Event handler called whenever the placeholder value changes */
  'update:placeholder': [date: DateValue$1];
  /** Event handler called whenever the start value changes */
  'update:startValue': [date: DateValue$1 | undefined];
};
declare const injectDateRangePickerRootContext: <T extends DateRangePickerRootContext | null | undefined = DateRangePickerRootContext>(fallback?: T | undefined) => T extends null ? DateRangePickerRootContext | null : DateRangePickerRootContext, provideDateRangePickerRootContext: (contextValue: DateRangePickerRootContext) => DateRangePickerRootContext;
declare const _default$111: __VLS_WithSlots$163<vue37.DefineComponent<DateRangePickerRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (date: DateRange) => any;
  "update:open": (value: boolean) => any;
  "update:placeholder": (date: DateValue$1) => any;
  "update:startValue": (date: DateValue$1 | undefined) => any;
}, string, vue37.PublicProps, Readonly<DateRangePickerRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue$1) => any) | undefined;
  "onUpdate:startValue"?: ((date: DateValue$1 | undefined) => any) | undefined;
}>, {
  placeholder: DateValue$1;
  locale: string;
  disabled: boolean;
  defaultValue: DateRange;
  open: boolean;
  defaultOpen: boolean;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  readonly: boolean;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  allowNonContiguousRanges: boolean;
  maximumDays: number;
  isDateHighlightable: Matcher;
  modal: boolean;
  closeOnSelect: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: DateRange;
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$163<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerRoot.vue.d.ts.map
//#endregion
//#region src/DateRangePicker/DateRangePickerTrigger.vue.d.ts
interface DateRangePickerTriggerProps extends PopoverTriggerProps {}
declare const _default$112: __VLS_WithSlots$162<vue37.DefineComponent<DateRangePickerTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DateRangePickerTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$162<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DateRangePickerTrigger.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuArrow.vue.d.ts
interface DropdownMenuArrowProps extends MenuArrowProps {}
declare const _default$121: __VLS_WithSlots$161<vue37.DefineComponent<DropdownMenuArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$161<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuArrow.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuCheckboxItem.vue.d.ts
type DropdownMenuCheckboxItemEmits = MenuCheckboxItemEmits;
interface DropdownMenuCheckboxItemProps extends MenuCheckboxItemProps {}
declare const _default$122: __VLS_WithSlots$160<vue37.DefineComponent<DropdownMenuCheckboxItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
  "update:modelValue": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<DropdownMenuCheckboxItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$160<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuCheckboxItem.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuContent.vue.d.ts
type DropdownMenuContentEmits = MenuContentEmits;
interface DropdownMenuContentProps extends MenuContentProps {}
declare const _default$123: __VLS_WithSlots$159<vue37.DefineComponent<DropdownMenuContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<DropdownMenuContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$159<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuContent.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuGroup.vue.d.ts
interface DropdownMenuGroupProps extends MenuGroupProps {}
declare const _default$124: __VLS_WithSlots$158<vue37.DefineComponent<DropdownMenuGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$158<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuGroup.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuItem.vue.d.ts
type DropdownMenuItemEmits = MenuItemEmits;
interface DropdownMenuItemProps extends MenuItemProps {}
declare const _default$125: __VLS_WithSlots$157<vue37.DefineComponent<DropdownMenuItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<DropdownMenuItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$157<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuItem.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuItemIndicator.vue.d.ts
interface DropdownMenuItemIndicatorProps extends MenuItemIndicatorProps {}
declare const _default$126: __VLS_WithSlots$156<vue37.DefineComponent<DropdownMenuItemIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuItemIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$156<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuItemIndicator.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuLabel.vue.d.ts
interface DropdownMenuLabelProps extends MenuLabelProps {}
declare const _default$127: __VLS_WithSlots$155<vue37.DefineComponent<DropdownMenuLabelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuLabelProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$155<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuLabel.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuPortal.vue.d.ts
interface DropdownMenuPortalProps extends MenuPortalProps {}
declare const _default$128: __VLS_WithSlots$154<vue37.DefineComponent<DropdownMenuPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$154<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuPortal.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuRadioGroup.vue.d.ts
type DropdownMenuRadioGroupEmits = MenuRadioGroupEmits;
interface DropdownMenuRadioGroupProps extends MenuRadioGroupProps {}
declare const _default$129: __VLS_WithSlots$153<vue37.DefineComponent<MenuRadioGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: string) => any;
}, string, vue37.PublicProps, Readonly<MenuRadioGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: string) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$153<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuRadioGroup.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuRadioItem.vue.d.ts
type DropdownMenuRadioItemEmits = MenuRadioItemEmits;
interface DropdownMenuRadioItemProps extends MenuRadioItemProps {}
declare const _default$130: __VLS_WithSlots$152<vue37.DefineComponent<DropdownMenuRadioItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<DropdownMenuRadioItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$152<T, S> = T & {
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
declare const _default$131: __VLS_WithSlots$151<vue37.DefineComponent<DropdownMenuRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<DropdownMenuRootProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
  modal: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$151<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuRoot.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuSeparator.vue.d.ts
interface DropdownMenuSeparatorProps extends MenuSeparatorProps {}
declare const _default$132: __VLS_WithSlots$150<vue37.DefineComponent<DropdownMenuSeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$150<T, S> = T & {
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
declare const _default$133: __VLS_WithSlots$149<vue37.DefineComponent<DropdownMenuSubProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<DropdownMenuSubProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$149<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuSub.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuSubContent.vue.d.ts
type DropdownMenuSubContentEmits = MenuSubContentEmits;
interface DropdownMenuSubContentProps extends MenuSubContentProps {}
declare const _default$134: __VLS_WithSlots$148<vue37.DefineComponent<DropdownMenuSubContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<DropdownMenuSubContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$148<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuSubContent.vue.d.ts.map
//#endregion
//#region src/DropdownMenu/DropdownMenuSubTrigger.vue.d.ts
interface DropdownMenuSubTriggerProps extends MenuSubTriggerProps {}
declare const _default$135: __VLS_WithSlots$147<vue37.DefineComponent<DropdownMenuSubTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuSubTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$147<T, S> = T & {
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
declare const _default$136: __VLS_WithSlots$146<vue37.DefineComponent<DropdownMenuTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<DropdownMenuTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$146<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=DropdownMenuTrigger.vue.d.ts.map
//#endregion
//#region src/Editable/EditableArea.vue.d.ts
interface EditableAreaProps extends PrimitiveProps {}
declare const _default$137: __VLS_WithSlots$145<vue37.DefineComponent<EditableAreaProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<EditableAreaProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$145<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableArea.vue.d.ts.map
//#endregion
//#region src/Editable/EditableCancelTrigger.vue.d.ts
interface EditableCancelTriggerProps extends PrimitiveProps {}
declare const _default$138: __VLS_WithSlots$144<vue37.DefineComponent<EditableCancelTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<EditableCancelTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$144<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableCancelTrigger.vue.d.ts.map
//#endregion
//#region src/Editable/EditableEditTrigger.vue.d.ts
interface EditableEditTriggerProps extends PrimitiveProps {}
declare const _default$139: __VLS_WithSlots$143<vue37.DefineComponent<EditableEditTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<EditableEditTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$143<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableEditTrigger.vue.d.ts.map
//#endregion
//#region src/Editable/EditableInput.vue.d.ts
interface EditableInputProps extends PrimitiveProps {}
declare const _default$140: __VLS_WithSlots$142<vue37.DefineComponent<EditableInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<EditableInputProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$142<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableInput.vue.d.ts.map
//#endregion
//#region src/Editable/EditablePreview.vue.d.ts
interface EditablePreviewProps extends PrimitiveProps {}
declare const _default$141: __VLS_WithSlots$141<vue37.DefineComponent<EditablePreviewProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<EditablePreviewProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$141<T, S> = T & {
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
declare const _default$142: __VLS_WithSlots$140<vue37.DefineComponent<EditableRootProps, {
  /** Function to submit the value of the editable */
  submit: () => void;
  /** Function to cancel the value of the editable */
  cancel: () => void;
  /** Function to set the editable in edit mode */
  edit: () => void;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  submit: (value: string | null | undefined) => any;
  "update:modelValue": (value: string) => any;
  "update:state": (state: "cancel" | "submit" | "edit") => any;
}, string, vue37.PublicProps, Readonly<EditableRootProps> & Readonly<{
  onSubmit?: ((value: string | null | undefined) => any) | undefined;
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
  "onUpdate:state"?: ((state: "cancel" | "submit" | "edit") => any) | undefined;
}>, {
  required: boolean;
  as: AsTag | vue37.Component;
  placeholder: string | {
    edit: string;
    preview: string;
  };
  disabled: boolean;
  activationMode: ActivationMode;
  selectOnFocus: boolean;
  submitMode: SubmitMode;
  autoResize: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
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
type __VLS_WithSlots$140<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableRoot.vue.d.ts.map
//#endregion
//#region src/Editable/EditableSubmitTrigger.vue.d.ts
interface EditableSubmitTriggerProps extends PrimitiveProps {}
declare const _default$143: __VLS_WithSlots$139<vue37.DefineComponent<EditableSubmitTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<EditableSubmitTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$139<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=EditableSubmitTrigger.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardArrow.vue.d.ts
interface HoverCardArrowProps extends PopperArrowProps {}
declare const _default$145: __VLS_WithSlots$138<vue37.DefineComponent<HoverCardArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<HoverCardArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$138<T, S> = T & {
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
declare const _default$146: __VLS_WithSlots$137<vue37.DefineComponent<HoverCardContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
}, string, vue37.PublicProps, Readonly<HoverCardContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$137<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=HoverCardContent.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardPortal.vue.d.ts
interface HoverCardPortalProps extends TeleportProps {}
declare const _default$147: __VLS_WithSlots$136<vue37.DefineComponent<HoverCardPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<HoverCardPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$136<T, S> = T & {
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
declare const _default$148: __VLS_WithSlots$135<vue37.DefineComponent<HoverCardRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<HoverCardRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  openDelay: number;
  closeDelay: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$135<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=HoverCardRoot.vue.d.ts.map
//#endregion
//#region src/HoverCard/HoverCardTrigger.vue.d.ts
interface HoverCardTriggerProps extends PopperAnchorProps {}
declare const _default$149: __VLS_WithSlots$134<vue37.DefineComponent<HoverCardTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<HoverCardTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$134<T, S> = T & {
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
declare const _default$150: __VLS_WithSlots$133<vue37.DefineComponent<LabelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<LabelProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$133<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=Label.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarArrow.vue.d.ts
interface MenubarArrowProps extends MenuArrowProps {}
declare const _default$159: __VLS_WithSlots$132<vue37.DefineComponent<MenubarArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$132<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarArrow.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarCheckboxItem.vue.d.ts
type MenubarCheckboxItemEmits = MenuCheckboxItemEmits;
interface MenubarCheckboxItemProps extends MenuCheckboxItemProps {}
declare const _default$160: __VLS_WithSlots$131<vue37.DefineComponent<MenubarCheckboxItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
  "update:modelValue": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<MenubarCheckboxItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$131<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarCheckboxItem.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarContent.vue.d.ts
interface MenubarContentProps extends MenuContentProps {}
declare const _default$161: __VLS_WithSlots$130<vue37.DefineComponent<MenubarContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<MenubarContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {
  align: Align;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$130<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarContent.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarGroup.vue.d.ts
interface MenubarGroupProps extends MenuGroupProps {}
declare const _default$162: __VLS_WithSlots$129<vue37.DefineComponent<MenubarGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$129<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarGroup.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarItem.vue.d.ts
type MenubarItemEmits = MenuItemEmits;
interface MenubarItemProps extends MenuItemProps {}
declare const _default$163: __VLS_WithSlots$128<vue37.DefineComponent<MenubarItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<MenubarItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$128<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarItem.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarItemIndicator.vue.d.ts
interface MenubarItemIndicatorProps extends MenuItemIndicatorProps {}
declare const _default$164: __VLS_WithSlots$127<vue37.DefineComponent<MenubarItemIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarItemIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$127<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarItemIndicator.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarLabel.vue.d.ts
interface MenubarLabelProps extends MenuLabelProps {}
declare const _default$165: __VLS_WithSlots$126<vue37.DefineComponent<MenubarLabelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarLabelProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$126<T, S> = T & {
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
declare const _default$166: __VLS_WithSlots$125<vue37.DefineComponent<MenubarMenuProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarMenuProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$125<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarMenu.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarPortal.vue.d.ts
interface MenubarPortalProps extends MenuPortalProps {}
declare const _default$167: __VLS_WithSlots$124<vue37.DefineComponent<MenubarPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$124<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarPortal.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarRadioGroup.vue.d.ts
type MenubarRadioGroupEmits = MenuRadioGroupEmits;
interface MenubarRadioGroupProps extends MenuRadioGroupProps {}
declare const _default$168: __VLS_WithSlots$123<vue37.DefineComponent<MenubarRadioGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: string) => any;
}, string, vue37.PublicProps, Readonly<MenubarRadioGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: string) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$123<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarRadioGroup.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarRadioItem.vue.d.ts
type MenubarRadioItemEmits = MenuRadioItemEmits;
interface MenubarRadioItemProps extends MenuRadioItemProps {}
declare const _default$169: __VLS_WithSlots$122<vue37.DefineComponent<MenuRadioItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<MenuRadioItemProps> & Readonly<{
  onSelect?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$122<T, S> = T & {
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
declare const _default$170: __VLS_WithSlots$121<vue37.DefineComponent<MenubarRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<MenubarRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
}>, {
  loop: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string;
  }) => any;
}>;
type __VLS_WithSlots$121<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarRoot.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarSeparator.vue.d.ts
interface MenubarSeparatorProps extends MenuSeparatorProps {}
declare const _default$171: __VLS_WithSlots$120<vue37.DefineComponent<MenubarSeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$120<T, S> = T & {
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
declare const _default$172: __VLS_WithSlots$119<vue37.DefineComponent<MenubarSubProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<MenubarSubProps> & Readonly<{
  "onUpdate:open"?: ((payload: boolean) => any) | undefined;
}>, {
  open: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$119<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarSub.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarSubContent.vue.d.ts
type MenubarSubContentEmits = MenuSubContentEmits;
interface MenubarSubContentProps extends MenuSubContentProps {}
declare const _default$173: __VLS_WithSlots$118<vue37.DefineComponent<MenubarSubContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  entryFocus: (event: Event) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<MenubarSubContentProps> & Readonly<{
  onEntryFocus?: ((event: Event) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$118<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarSubContent.vue.d.ts.map
//#endregion
//#region src/Menubar/MenubarSubTrigger.vue.d.ts
interface MenubarSubTriggerProps extends MenuSubTriggerProps {}
declare const _default$174: __VLS_WithSlots$117<vue37.DefineComponent<MenubarSubTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarSubTriggerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$117<T, S> = T & {
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
declare const _default$175: __VLS_WithSlots$116<vue37.DefineComponent<MenubarTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<MenubarTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$116<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=MenubarTrigger.vue.d.ts.map
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
declare const _default$176: __VLS_WithSlots$115<vue37.DefineComponent<NavigationMenuContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
}, string, vue37.PublicProps, Readonly<NavigationMenuContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$115<T, S> = T & {
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
declare const _default$177: __VLS_WithSlots$114<vue37.DefineComponent<NavigationMenuIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NavigationMenuIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$114<T, S> = T & {
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
declare const _default$178: __VLS_WithSlots$113<vue37.DefineComponent<NavigationMenuItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NavigationMenuItemProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$113<T, S> = T & {
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
declare const _default$179: __VLS_WithSlots$112<vue37.DefineComponent<NavigationMenuLinkProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (payload: CustomEvent<{
    originalEvent: Event;
  }>) => any;
}, string, vue37.PublicProps, Readonly<NavigationMenuLinkProps> & Readonly<{
  onSelect?: ((payload: CustomEvent<{
    originalEvent: Event;
  }>) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$112<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NavigationMenuLink.vue.d.ts.map
//#endregion
//#region src/NavigationMenu/NavigationMenuList.vue.d.ts
interface NavigationMenuListProps extends PrimitiveProps {}
declare const _default$180: __VLS_WithSlots$111<vue37.DefineComponent<NavigationMenuListProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NavigationMenuListProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$111<T, S> = T & {
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
declare const _default$181: __VLS_WithSlots$110<vue37.DefineComponent<NavigationMenuRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (value: string) => any;
}, string, vue37.PublicProps, Readonly<NavigationMenuRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  orientation: Orientation;
  modelValue: string;
  unmountOnHide: boolean;
  delayDuration: number;
  skipDelayDuration: number;
  disableClickTrigger: boolean;
  disableHoverTrigger: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string;
  }) => any;
}>;
type __VLS_WithSlots$110<T, S> = T & {
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
declare const _default$182: __VLS_WithSlots$109<vue37.DefineComponent<NavigationMenuSubProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (value: string) => any;
}, string, vue37.PublicProps, Readonly<NavigationMenuSubProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string) => any) | undefined;
}>, {
  orientation: Orientation;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: string;
  }) => any;
}>;
type __VLS_WithSlots$109<T, S> = T & {
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
declare const _default$183: __VLS_WithSlots$108<vue37.DefineComponent<NavigationMenuTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NavigationMenuTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$108<T, S> = T & {
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
declare const _default$184: __VLS_WithSlots$107<vue37.DefineComponent<NavigationMenuViewportProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NavigationMenuViewportProps> & Readonly<{}>, {
  align: "start" | "center" | "end";
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$107<T, S> = T & {
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
declare const _default$185: __VLS_WithSlots$106<vue37.DefineComponent<NumberFieldDecrementProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NumberFieldDecrementProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$106<T, S> = T & {
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
declare const _default$186: __VLS_WithSlots$105<vue37.DefineComponent<NumberFieldIncrementProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NumberFieldIncrementProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$105<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NumberFieldIncrement.vue.d.ts.map
//#endregion
//#region src/NumberField/NumberFieldInput.vue.d.ts
interface NumberFieldInputProps extends PrimitiveProps {}
declare const _default$187: __VLS_WithSlots$104<vue37.DefineComponent<NumberFieldInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<NumberFieldInputProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$104<T, S> = T & {
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
  /** Formatting options for the value displayed in the number field. This also affects what characters are allowed to be typed by the user. */
  formatOptions?: Intl.NumberFormatOptions;
  /** The locale to use for formatting dates */
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
declare const _default$188: __VLS_WithSlots$103<vue37.DefineComponent<NumberFieldRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (val: number) => any;
}, string, vue37.PublicProps, Readonly<NumberFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((val: number) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  defaultValue: number;
  step: number;
  stepSnapping: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: number | undefined;
    textValue: string;
  }) => any;
}>;
type __VLS_WithSlots$103<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=NumberFieldRoot.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationEllipsis.vue.d.ts
interface PaginationEllipsisProps extends PrimitiveProps {}
declare const _default$189: __VLS_WithSlots$102<vue37.DefineComponent<PaginationEllipsisProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PaginationEllipsisProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$102<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationEllipsis.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationFirst.vue.d.ts
interface PaginationFirstProps extends PrimitiveProps {}
declare const _default$190: __VLS_WithSlots$101<vue37.DefineComponent<PaginationFirstProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PaginationFirstProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$101<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationFirst.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationLast.vue.d.ts
interface PaginationLastProps extends PrimitiveProps {}
declare const _default$191: __VLS_WithSlots$100<vue37.DefineComponent<PaginationLastProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PaginationLastProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$100<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationLast.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationList.vue.d.ts
interface PaginationListProps extends PrimitiveProps {}
declare const _default$192: __VLS_WithSlots$99<vue37.DefineComponent<PaginationListProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PaginationListProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
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
type __VLS_WithSlots$99<T, S> = T & {
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
declare const _default$193: __VLS_WithSlots$98<vue37.DefineComponent<PaginationListItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PaginationListItemProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$98<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationListItem.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationNext.vue.d.ts
interface PaginationNextProps extends PrimitiveProps {}
declare const _default$194: __VLS_WithSlots$97<vue37.DefineComponent<PaginationNextProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PaginationNextProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$97<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PaginationNext.vue.d.ts.map
//#endregion
//#region src/Pagination/PaginationPrev.vue.d.ts
interface PaginationPrevProps extends PrimitiveProps {}
declare const _default$195: __VLS_WithSlots$96<vue37.DefineComponent<PaginationPrevProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PaginationPrevProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$96<T, S> = T & {
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
declare const _default$196: __VLS_WithSlots$95<vue37.DefineComponent<PaginationRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:page": (value: number) => any;
}, string, vue37.PublicProps, Readonly<PaginationRootProps> & Readonly<{
  "onUpdate:page"?: ((value: number) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  defaultPage: number;
  total: number;
  siblingCount: number;
  showEdges: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current page state */
    page: number;
    /** Number of pages */
    pageCount: number;
  }) => any;
}>;
type __VLS_WithSlots$95<T, S> = T & {
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
declare const _default$197: __VLS_WithSlots$94<vue37.DefineComponent<PinInputInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PinInputInputProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$94<T, S> = T & {
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
  defaultValue?: PinInputValue<Type>[];
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
declare const _default$198: <Type extends PinInputType>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$6<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$6<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: PinInputValue<Type>) => any) | undefined;
    readonly onComplete?: ((value: PinInputValue<Type>) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onUpdate:modelValue" | "onComplete"> & PinInputRootProps<Type> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current input values */
      modelValue: PinInputValue<Type>;
    }) => any;
  };
  emit: ((evt: "update:modelValue", value: PinInputValue<Type>) => void) & ((evt: "complete", value: PinInputValue<Type>) => void);
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$6<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=PinInputRoot.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverAnchor.vue.d.ts
interface PopoverAnchorProps extends PopperAnchorProps {}
declare const _default$199: __VLS_WithSlots$93<vue37.DefineComponent<PopoverAnchorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PopoverAnchorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$93<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverAnchor.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverArrow.vue.d.ts
interface PopoverArrowProps extends PopperArrowProps {}
declare const _default$200: __VLS_WithSlots$92<vue37.DefineComponent<PopoverArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PopoverArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$92<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverArrow.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverClose.vue.d.ts
interface PopoverCloseProps extends PrimitiveProps {}
declare const _default$201: __VLS_WithSlots$91<vue37.DefineComponent<PopoverCloseProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PopoverCloseProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$91<T, S> = T & {
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
declare const _default$202: __VLS_WithSlots$90<vue37.DefineComponent<PopoverContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  focusOutside: (event: FocusOutsideEvent) => any;
  interactOutside: (event: PointerDownOutsideEvent | FocusOutsideEvent) => any;
  openAutoFocus: (event: Event) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<PopoverContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onFocusOutside?: ((event: FocusOutsideEvent) => any) | undefined;
  onInteractOutside?: ((event: PointerDownOutsideEvent | FocusOutsideEvent) => any) | undefined;
  onOpenAutoFocus?: ((event: Event) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$90<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverContent.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverPortal.vue.d.ts
interface PopoverPortalProps extends TeleportProps {}
declare const _default$203: __VLS_WithSlots$89<vue37.DefineComponent<PopoverPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PopoverPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$89<T, S> = T & {
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
declare const _default$204: __VLS_WithSlots$88<vue37.DefineComponent<PopoverRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<PopoverRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  open: boolean;
  defaultOpen: boolean;
  modal: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
    /** Close the popover */
    close: () => void;
  }) => any;
}>;
type __VLS_WithSlots$88<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=PopoverRoot.vue.d.ts.map
//#endregion
//#region src/Popover/PopoverTrigger.vue.d.ts
interface PopoverTriggerProps extends PrimitiveProps {}
declare const _default$205: __VLS_WithSlots$87<vue37.DefineComponent<PopoverTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<PopoverTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$87<T, S> = T & {
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
declare const _default$206: vue37.DefineComponent<vue37.ExtractPropTypes<{
  present: {
    type: BooleanConstructor;
    required: true;
  };
  forceMount: {
    type: BooleanConstructor;
  };
}>, () => VNode<vue37.RendererNode, vue37.RendererElement, {
  [key: string]: any;
}> | null, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<vue37.ExtractPropTypes<{
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
}>, {}, {}, string, vue37.ComponentProvideOptions, true, {}, any>;
//#endregion
//#region src/Progress/ProgressIndicator.vue.d.ts
interface ProgressIndicatorProps extends PrimitiveProps {}
declare const _default$207: __VLS_WithSlots$86<vue37.DefineComponent<ProgressIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ProgressIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$86<T, S> = T & {
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
declare const _default$208: __VLS_WithSlots$85<vue37.DefineComponent<ProgressRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (value: string[] | undefined) => any;
  "update:max": (value: number) => any;
}, string, vue37.PublicProps, Readonly<ProgressRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: string[] | undefined) => any) | undefined;
  "onUpdate:max"?: ((value: number) => any) | undefined;
}>, {
  max: number;
  getValueLabel: (value: number | null | undefined, max: number) => string | undefined;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: number | null | undefined;
  }) => any;
}>;
type __VLS_WithSlots$85<T, S> = T & {
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
declare const _default$209: __VLS_WithSlots$84<vue37.DefineComponent<RadioGroupIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RadioGroupIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$84<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RadioGroupIndicator.vue.d.ts.map
//#endregion
//#region src/RadioGroup/utils.d.ts
type SelectEvent$1 = CustomEvent<{
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
  select: [event: SelectEvent$1];
};
interface RadioGroupItemContext {
  disabled: ComputedRef<boolean>;
  checked: ComputedRef<boolean>;
}
declare const injectRadioGroupItemContext: <T extends RadioGroupItemContext | null | undefined = RadioGroupItemContext>(fallback?: T | undefined) => T extends null ? RadioGroupItemContext | null : RadioGroupItemContext, provideRadiogroupItemContext: (contextValue: RadioGroupItemContext) => RadioGroupItemContext;
declare const _default$210: __VLS_WithSlots$83<vue37.DefineComponent<RadioGroupItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  select: (event: SelectEvent$1) => any;
}, string, vue37.PublicProps, Readonly<RadioGroupItemProps> & Readonly<{
  onSelect?: ((event: SelectEvent$1) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  disabled: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current checked state */
    checked: boolean;
    /** Required state */
    required: boolean;
    /** Disabled state */
    disabled: boolean;
  }) => any;
}>;
type __VLS_WithSlots$83<T, S> = T & {
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
  'update:modelValue': [payload: string];
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
declare const _default$211: __VLS_WithSlots$82<vue37.DefineComponent<RadioGroupRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: string) => any;
}, string, vue37.PublicProps, Readonly<RadioGroupRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: string) => any) | undefined;
}>, {
  required: boolean;
  orientation: DataOrientation;
  loop: boolean;
  disabled: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current input values */
    modelValue: AcceptableValue | undefined;
  }) => any;
}>;
type __VLS_WithSlots$82<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RadioGroupRoot.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarCell.vue.d.ts
interface RangeCalendarCellProps extends PrimitiveProps {
  date: DateValue$1;
}
declare const _default$212: __VLS_WithSlots$81<vue37.DefineComponent<RangeCalendarCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarCellProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$81<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarCell.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGrid.vue.d.ts
interface RangeCalendarGridProps extends PrimitiveProps {}
declare const _default$214: __VLS_WithSlots$80<vue37.DefineComponent<RangeCalendarGridProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarGridProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$80<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGrid.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGridBody.vue.d.ts
interface RangeCalendarGridBodyProps extends PrimitiveProps {}
declare const _default$215: __VLS_WithSlots$79<vue37.DefineComponent<RangeCalendarGridBodyProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarGridBodyProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$79<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGridBody.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGridHead.vue.d.ts
interface RangeCalendarGridHeadProps extends PrimitiveProps {}
declare const _default$216: __VLS_WithSlots$78<vue37.DefineComponent<RangeCalendarGridHeadProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarGridHeadProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$78<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGridHead.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarGridRow.vue.d.ts
interface RangeCalendarGridRowProps extends PrimitiveProps {}
declare const _default$217: __VLS_WithSlots$77<vue37.DefineComponent<RangeCalendarGridRowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarGridRowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$77<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarGridRow.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarHeadCell.vue.d.ts
interface RangeCalendarHeadCellProps extends PrimitiveProps {}
declare const _default$218: __VLS_WithSlots$76<vue37.DefineComponent<RangeCalendarHeadCellProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarHeadCellProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$76<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarHeadCell.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarHeader.vue.d.ts
interface RangeCalendarHeaderProps extends PrimitiveProps {}
declare const _default$219: __VLS_WithSlots$75<vue37.DefineComponent<RangeCalendarHeaderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarHeaderProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$75<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarHeader.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarHeading.vue.d.ts
interface RangeCalendarHeadingProps extends PrimitiveProps {}
declare const _default$220: __VLS_WithSlots$74<vue37.DefineComponent<RangeCalendarHeadingProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<RangeCalendarHeadingProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current month and year */
    headingValue: string;
  }) => any;
}>;
type __VLS_WithSlots$74<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarHeading.vue.d.ts.map
//#endregion
//#region src/RangeCalendar/RangeCalendarRoot.vue.d.ts
type RangeCalendarRootContext = {
  modelValue: Ref<DateRange>;
  startValue: Ref<DateValue$1 | undefined>;
  endValue: Ref<DateValue$1 | undefined>;
  locale: Ref<string>;
  placeholder: Ref<DateValue$1>;
  pagedNavigation: Ref<boolean>;
  preventDeselect: Ref<boolean>;
  grid: Ref<Grid<DateValue$1>[]>;
  weekDays: Ref<string[]>;
  weekStartsOn: Ref<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  weekdayFormat: Ref<WeekDayFormat>;
  fixedWeeks: Ref<boolean>;
  numberOfMonths: Ref<number>;
  disabled: Ref<boolean>;
  readonly: Ref<boolean>;
  initialFocus: Ref<boolean>;
  onPlaceholderChange: (date: DateValue$1) => void;
  fullCalendarLabel: Ref<string>;
  parentElement: Ref<HTMLElement | undefined>;
  headingValue: Ref<string>;
  isInvalid: Ref<boolean>;
  isDateDisabled: Matcher;
  isDateUnavailable?: Matcher;
  isDateHighlightable?: Matcher;
  isOutsideVisibleView: (date: DateValue$1) => boolean;
  allowNonContiguousRanges: Ref<boolean>;
  highlightedRange: Ref<{
    start: DateValue$1;
    end: DateValue$1;
  } | null>;
  focusedValue: Ref<DateValue$1 | undefined>;
  lastPressedDateValue: Ref<DateValue$1 | undefined>;
  isSelected: (date: DateValue$1) => boolean;
  isSelectionEnd: (date: DateValue$1) => boolean;
  isSelectionStart: (date: DateValue$1) => boolean;
  isHighlightedStart: (date: DateValue$1) => boolean;
  isHighlightedEnd: (date: DateValue$1) => boolean;
  prevPage: (prevPageFunc?: (date: DateValue$1) => DateValue$1) => void;
  nextPage: (nextPageFunc?: (date: DateValue$1) => DateValue$1) => void;
  isNextButtonDisabled: (nextPageFunc?: (date: DateValue$1) => DateValue$1) => boolean;
  isPrevButtonDisabled: (prevPageFunc?: (date: DateValue$1) => DateValue$1) => boolean;
  formatter: Formatter;
  dir: Ref<Direction>;
  disableDaysOutsideCurrentView: Ref<boolean>;
  fixedDate: Ref<'start' | 'end' | undefined>;
  maximumDays: Ref<number | undefined>;
};
interface RangeCalendarRootProps extends PrimitiveProps {
  /** The default placeholder date */
  defaultPlaceholder?: DateValue$1;
  /** The default value for the calendar */
  defaultValue?: DateRange;
  /** The controlled checked state of the calendar. Can be bound as `v-model`. */
  modelValue?: DateRange | null;
  /** The placeholder date, which is used to determine what month to display when no date is selected. This updates as the user navigates the calendar and can be used to programmatically control the calendar view */
  placeholder?: DateValue$1;
  /** When combined with `isDateUnavailable`, determines whether non-contiguous ranges, i.e. ranges containing unavailable dates, may be selected. */
  allowNonContiguousRanges?: boolean;
  /** This property causes the previous and next buttons to navigate by the number of months displayed at once, rather than one month */
  pagedNavigation?: boolean;
  /** Whether or not to prevent the user from deselecting a date without selecting another date first */
  preventDeselect?: boolean;
  /** The maximum number of days that can be selected in a range */
  maximumDays?: number;
  /** The day of the week to start the calendar on */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** The format to use for the weekday strings provided via the weekdays slot prop */
  weekdayFormat?: WeekDayFormat;
  /** The accessible label for the calendar */
  calendarLabel?: string;
  /** Whether or not to always display 6 weeks in the calendar */
  fixedWeeks?: boolean;
  /** The maximum date that can be selected */
  maxValue?: DateValue$1;
  /** The minimum date that can be selected */
  minValue?: DateValue$1;
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
  nextPage?: (placeholder: DateValue$1) => DateValue$1;
  /** A function that returns the previous page of the calendar. It receives the current placeholder as an argument inside the component. */
  prevPage?: (placeholder: DateValue$1) => DateValue$1;
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
  'update:placeholder': [date: DateValue$1];
  /** Event handler called whenever the start value changes */
  'update:startValue': [date: DateValue$1 | undefined];
};
declare const injectRangeCalendarRootContext: <T extends RangeCalendarRootContext | null | undefined = RangeCalendarRootContext>(fallback?: T | undefined) => T extends null ? RangeCalendarRootContext | null : RangeCalendarRootContext, provideRangeCalendarRootContext: (contextValue: RangeCalendarRootContext) => RangeCalendarRootContext;
declare const _default$223: __VLS_WithSlots$73<vue37.DefineComponent<RangeCalendarRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (date: DateRange) => any;
  "update:placeholder": (date: DateValue$1) => any;
  "update:validModelValue": (date: DateRange) => any;
  "update:startValue": (date: DateValue$1 | undefined) => any;
}, string, vue37.PublicProps, Readonly<RangeCalendarRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:placeholder"?: ((date: DateValue$1) => any) | undefined;
  "onUpdate:validModelValue"?: ((date: DateRange) => any) | undefined;
  "onUpdate:startValue"?: ((date: DateValue$1 | undefined) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  placeholder: DateValue$1;
  disabled: boolean;
  defaultValue: DateRange;
  pagedNavigation: boolean;
  preventDeselect: boolean;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekdayFormat: WeekDayFormat;
  fixedWeeks: boolean;
  numberOfMonths: number;
  readonly: boolean;
  initialFocus: boolean;
  isDateDisabled: Matcher;
  isDateUnavailable: Matcher;
  disableDaysOutsideCurrentView: boolean;
  allowNonContiguousRanges: boolean;
  maximumDays: number;
  isDateHighlightable: Matcher;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current date of the placeholder */
    date: DateValue$1;
    /** The grid of dates */
    grid: Grid<DateValue$1>[];
    /** The days of the week */
    weekDays: string[];
    /** The start of the week */
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    /** The calendar locale */
    locale: string;
    /** Whether or not to always display 6 weeks in the calendar */
    fixedWeeks: boolean;
    /** The current date range */
    modelValue: DateRange;
  }) => any;
}>;
type __VLS_WithSlots$73<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=RangeCalendarRoot.vue.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaCorner.vue.d.ts
interface ScrollAreaCornerProps extends PrimitiveProps {}
declare const _default$226: __VLS_WithSlots$72<vue37.DefineComponent<ScrollAreaCornerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ScrollAreaCornerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$72<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaCorner.vue.d.ts.map
//#endregion
//#region src/ScrollArea/types.d.ts
type Direction$2 = 'ltr' | 'rtl';
type ScrollType = 'auto' | 'always' | 'scroll' | 'hover';
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
   * `hover` - when the user is scrolling along its corresponding orientation and when the user is hovering over the scroll area.
   */
  type?: ScrollType;
  /** The reading direction of the combobox when applicable. <br> If omitted, inherits globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode. */
  dir?: Direction$2;
  /** If type is set to either `scroll` or `hover`, this prop determines the length of time, in milliseconds, <br> before the scrollbars are hidden after the user stops interacting with scrollbars. */
  scrollHideDelay?: number;
}
declare const _default$227: __VLS_WithSlots$71<vue37.DefineComponent<ScrollAreaRootProps, {
  /** Viewport element within ScrollArea */
  viewport: Ref<HTMLElement | undefined, HTMLElement | undefined>;
  /** Scroll viewport to top */
  scrollTop: () => void;
  /** Scroll viewport to top-left */
  scrollTopLeft: () => void;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ScrollAreaRootProps> & Readonly<{}>, {
  type: ScrollType;
  scrollHideDelay: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$71<T, S> = T & {
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
interface ScrollAreaScollbarContext {
  as: Ref<PrimitiveProps['as']>;
  orientation: Ref<'vertical' | 'horizontal'>;
  forceMount?: Ref<boolean>;
  isHorizontal: Ref<boolean>;
  asChild: Ref<boolean>;
}
declare const injectScrollAreaScrollbarContext: <T extends ScrollAreaScollbarContext | null | undefined = ScrollAreaScollbarContext>(fallback?: T | undefined) => T extends null ? ScrollAreaScollbarContext | null : ScrollAreaScollbarContext, provideScrollAreaScrollbarContext: (contextValue: ScrollAreaScollbarContext) => ScrollAreaScollbarContext;
declare const _default$228: __VLS_WithSlots$70<vue37.DefineComponent<ScrollAreaScrollbarProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ScrollAreaScrollbarProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  orientation: "vertical" | "horizontal";
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$70<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaScrollbar.vue.d.ts.map
//#endregion
//#region src/ScrollArea/ScrollAreaThumb.vue.d.ts
interface ScrollAreaThumbProps extends PrimitiveProps {}
declare const _default$229: __VLS_WithSlots$69<vue37.DefineComponent<ScrollAreaThumbProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ScrollAreaThumbProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$69<T, S> = T & {
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
declare const _default$230: __VLS_WithSlots$68<vue37.DefineComponent<ScrollAreaViewportProps, {
  viewportElement: vue37.Ref<HTMLElement | undefined, HTMLElement | undefined>;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ScrollAreaViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$68<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ScrollAreaViewport.vue.d.ts.map
//#endregion
//#region src/Select/SelectArrow.vue.d.ts
interface SelectArrowProps extends PopperArrowProps {}
declare const _default$231: __VLS_WithSlots$67<vue37.DefineComponent<SelectArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$67<T, S> = T & {
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
interface SelectContentImplProps extends PopperContentProps {
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
declare const _default$232: __VLS_WithSlots$66<vue37.DefineComponent<SelectContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: PointerDownOutsideEvent) => any;
  closeAutoFocus: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<SelectContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: PointerDownOutsideEvent) => any) | undefined;
  onCloseAutoFocus?: ((event: Event) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
} & {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$66<T, S> = T & {
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
declare const _default$233: __VLS_WithSlots$65<vue37.DefineComponent<SelectGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectGroupProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$65<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectGroup.vue.d.ts.map
//#endregion
//#region src/Select/SelectIcon.vue.d.ts
interface SelectIconProps extends PrimitiveProps {}
declare const _default$234: __VLS_WithSlots$64<vue37.DefineComponent<SelectIconProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectIconProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$64<T, S> = T & {
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
type SelectEvent$2<T> = CustomEvent<{
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
declare const _default$235: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$5<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$5<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent$2<T>) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onSelect"> & SelectItemProps<AcceptableValue> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {}) => any;
  };
  emit: (evt: "select", event: SelectEvent$2<T>) => void;
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$5<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=SelectItem.vue.d.ts.map
//#endregion
//#region src/Select/SelectItemIndicator.vue.d.ts
interface SelectItemIndicatorProps extends PrimitiveProps {}
declare const _default$236: __VLS_WithSlots$63<vue37.DefineComponent<SelectItemIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectItemIndicatorProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$63<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectItemIndicator.vue.d.ts.map
//#endregion
//#region src/Select/SelectItemText.vue.d.ts
interface SelectItemTextProps extends PrimitiveProps {}
declare const _default$237: __VLS_WithSlots$62<vue37.DefineComponent<SelectItemTextProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectItemTextProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$62<T, S> = T & {
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
declare const _default$238: __VLS_WithSlots$61<vue37.DefineComponent<SelectLabelProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectLabelProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$61<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectLabel.vue.d.ts.map
//#endregion
//#region src/Select/SelectPortal.vue.d.ts
interface SelectPortalProps extends TeleportProps {}
declare const _default$239: __VLS_WithSlots$60<vue37.DefineComponent<SelectPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$60<T, S> = T & {
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
declare const _default$240: <T extends AcceptableValue = AcceptableValue>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$4<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$4<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((value: T) => any) | undefined;
    readonly "onUpdate:open"?: ((value: boolean) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onUpdate:modelValue" | "onUpdate:open"> & SelectRootProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
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
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$4<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=SelectRoot.vue.d.ts.map
//#endregion
//#region src/Select/SelectScrollDownButton.vue.d.ts
interface SelectScrollDownButtonProps extends PrimitiveProps {}
declare const _default$241: __VLS_WithSlots$59<vue37.DefineComponent<SelectScrollDownButtonProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectScrollDownButtonProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$59<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectScrollDownButton.vue.d.ts.map
//#endregion
//#region src/Select/SelectScrollUpButton.vue.d.ts
interface SelectScrollUpButtonProps extends PrimitiveProps {}
declare const _default$242: __VLS_WithSlots$58<vue37.DefineComponent<SelectScrollUpButtonProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectScrollUpButtonProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$58<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SelectScrollUpButton.vue.d.ts.map
//#endregion
//#region src/Select/SelectSeparator.vue.d.ts
interface SelectSeparatorProps extends PrimitiveProps {}
declare const _default$243: __VLS_WithSlots$57<vue37.DefineComponent<SelectSeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$57<T, S> = T & {
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
declare const _default$244: __VLS_WithSlots$56<vue37.DefineComponent<SelectTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$56<T, S> = T & {
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
declare const _default$245: __VLS_WithSlots$55<vue37.DefineComponent<SelectValueProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectValueProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  placeholder: string;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    selectedLabel: string[];
    modelValue: AcceptableValue | AcceptableValue[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$55<T, S> = T & {
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
declare const _default$246: __VLS_WithSlots$54<vue37.DefineComponent<SelectViewportProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SelectViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$54<T, S> = T & {
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
declare const _default$247: __VLS_WithSlots$53<vue37.DefineComponent<SeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SeparatorProps> & Readonly<{}>, {
  orientation: DataOrientation;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$53<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=Separator.vue.d.ts.map
//#endregion
//#region src/Slider/SliderRange.vue.d.ts
interface SliderRangeProps extends PrimitiveProps {}
declare const _default$248: __VLS_WithSlots$52<vue37.DefineComponent<SliderRangeProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SliderRangeProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$52<T, S> = T & {
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
declare const _default$249: __VLS_WithSlots$51<vue37.DefineComponent<SliderRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: number[] | undefined) => any;
  valueCommit: (payload: number[]) => any;
}, string, vue37.PublicProps, Readonly<SliderRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: number[] | undefined) => any) | undefined;
  onValueCommit?: ((payload: number[]) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  orientation: DataOrientation;
  disabled: boolean;
  defaultValue: number[];
  step: number;
  max: number;
  min: number;
  inverted: boolean;
  minStepsBetweenThumbs: number;
  thumbAlignment: ThumbAlignment;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current slider values */
    modelValue: number[] | null;
  }) => any;
}>;
type __VLS_WithSlots$51<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SliderRoot.vue.d.ts.map
//#endregion
//#region src/Slider/SliderThumb.vue.d.ts
interface SliderThumbProps extends PrimitiveProps {}
declare const _default$250: __VLS_WithSlots$50<vue37.DefineComponent<SliderThumbProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SliderThumbProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$50<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SliderThumb.vue.d.ts.map
//#endregion
//#region src/Slider/SliderTrack.vue.d.ts
interface SliderTrackProps extends PrimitiveProps {}
declare const _default$251: __VLS_WithSlots$49<vue37.DefineComponent<SliderTrackProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SliderTrackProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$49<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SliderTrack.vue.d.ts.map
//#endregion
//#region src/Splitter/SplitterPanel.vue.d.ts
interface SplitterPanelProps extends PrimitiveProps {
  /** The size of panel when it is collapsed. */
  collapsedSize?: number;
  /** Should panel collapse when resized beyond its `minSize`. When `true`, it will be collapsed to `collapsedSize`. */
  collapsible?: boolean;
  /** Initial size of panel (numeric value between 1-100) */
  defaultSize?: number;
  /** Panel id (unique within group); falls back to `useId` when not provided */
  id?: string;
  /** The maximum allowable size of panel (numeric value between 1-100); defaults to `100` */
  maxSize?: number;
  /** The minimum allowable size of panel (numeric value between 1-100); defaults to `10` */
  minSize?: number;
  /** The order of panel within group; required for groups with conditionally rendered panels */
  order?: number;
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
};
type PanelData = {
  callbacks: PanelCallbacks;
  constraints: PanelConstraints;
  id: string;
  idIsFromProps: boolean;
  order: number | undefined;
};
declare const _default$253: __VLS_WithSlots$48<vue37.DefineComponent<SplitterPanelProps, {
  /** If panel is `collapsible`, collapse it fully. */
  collapse: () => void;
  /** If panel is currently collapsed, expand it to its most recent size. */
  expand: () => void;
  /** Gets the current size of the panel as a percentage (1 - 100). */
  getSize(): number;
  /** Resize panel to the specified percentage (1 - 100). */
  resize: (size: number) => void;
  /** Returns `true` if the panel is currently collapsed */
  isCollapsed: vue37.ComputedRef<boolean>;
  /** Returns `true` if the panel is currently not collapsed */
  isExpanded: vue37.ComputedRef<boolean>;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  resize: (size: number, prevSize: number | undefined) => any;
  collapse: () => any;
  expand: () => any;
}, string, vue37.PublicProps, Readonly<SplitterPanelProps> & Readonly<{
  onResize?: ((size: number, prevSize: number | undefined) => any) | undefined;
  onCollapse?: (() => any) | undefined;
  onExpand?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
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
type __VLS_WithSlots$48<T, S> = T & {
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
declare const _default$252: __VLS_WithSlots$47<vue37.DefineComponent<SplitterGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  layout: (val: number[]) => any;
}, string, vue37.PublicProps, Readonly<SplitterGroupProps> & Readonly<{
  onLayout?: ((val: number[]) => any) | undefined;
}>, {
  autoSaveId: string | null;
  keyboardResizeBy: number | null;
  storage: PanelGroupStorage;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current size of layout */
    layout: number[];
  }) => any;
}>;
type __VLS_WithSlots$47<T, S> = T & {
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
declare const _default$254: __VLS_WithSlots$46<vue37.DefineComponent<SplitterResizeHandleProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  dragging: (isDragging: boolean) => any;
}, string, vue37.PublicProps, Readonly<SplitterResizeHandleProps> & Readonly<{
  onDragging?: ((isDragging: boolean) => any) | undefined;
}>, {
  tabindex: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$46<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SplitterResizeHandle.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperDescription.vue.d.ts
interface StepperDescriptionProps extends PrimitiveProps {}
declare const _default$255: __VLS_WithSlots$45<vue37.DefineComponent<StepperDescriptionProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<StepperDescriptionProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$45<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperDescription.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperIndicator.vue.d.ts
interface StepperIndicatorProps extends PrimitiveProps {}
declare const _default$256: __VLS_WithSlots$44<vue37.DefineComponent<StepperIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<StepperIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current step */
    step: number;
  }) => any;
}>;
type __VLS_WithSlots$44<T, S> = T & {
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
declare const _default$257: __VLS_WithSlots$43<vue37.DefineComponent<StepperItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<StepperItemProps> & Readonly<{}>, {
  disabled: boolean;
  completed: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** The current state of the stepper item */
    state: StepperState;
  }) => any;
}>;
type __VLS_WithSlots$43<T, S> = T & {
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
declare const _default$258: __VLS_WithSlots$42<vue37.DefineComponent<StepperRootProps, {
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  modelValue: vue37.WritableComputedRef<number | undefined, number | undefined>;
  totalSteps: vue37.ComputedRef<number>;
  isNextDisabled: vue37.ComputedRef<boolean>;
  isPrevDisabled: vue37.ComputedRef<boolean>;
  isFirstStep: vue37.ComputedRef<boolean>;
  isLastStep: vue37.ComputedRef<boolean>;
  hasNext: () => boolean;
  hasPrev: () => boolean;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: number | undefined) => any;
}, string, vue37.PublicProps, Readonly<StepperRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: number | undefined) => any) | undefined;
}>, {
  orientation: DataOrientation;
  defaultValue: number;
  linear: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
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
type __VLS_WithSlots$42<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperRoot.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperSeparator.vue.d.ts
interface StepperSeparatorProps extends SeparatorProps {}
declare const _default$259: __VLS_WithSlots$41<vue37.DefineComponent<StepperSeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<StepperSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$41<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperSeparator.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperTitle.vue.d.ts
interface StepperTitleProps extends PrimitiveProps {}
declare const _default$260: __VLS_WithSlots$40<vue37.DefineComponent<StepperTitleProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<StepperTitleProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$40<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperTitle.vue.d.ts.map
//#endregion
//#region src/Stepper/StepperTrigger.vue.d.ts
interface StepperTriggerProps extends PrimitiveProps {}
declare const _default$261: __VLS_WithSlots$39<vue37.DefineComponent<StepperTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<StepperTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$39<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=StepperTrigger.vue.d.ts.map
//#endregion
//#region src/Switch/SwitchRoot.vue.d.ts
interface SwitchRootProps extends PrimitiveProps, FormFieldProps {
  /** The state of the switch when it is initially rendered. Use when you do not need to control its state. */
  defaultValue?: boolean;
  /** The controlled state of the switch. Can be bind as `v-model`. */
  modelValue?: boolean | null;
  /** When `true`, prevents the user from interacting with the switch. */
  disabled?: boolean;
  id?: string;
  /** The value given as data when submitted with a `name`. */
  value?: string;
}
type SwitchRootEmits = {
  /** Event handler called when the value of the switch changes. */
  'update:modelValue': [payload: boolean];
};
interface SwitchRootContext {
  modelValue?: Ref<boolean>;
  toggleCheck: () => void;
  disabled: Ref<boolean>;
}
declare const injectSwitchRootContext: <T extends SwitchRootContext | null | undefined = SwitchRootContext>(fallback?: T | undefined) => T extends null ? SwitchRootContext | null : SwitchRootContext, provideSwitchRootContext: (contextValue: SwitchRootContext) => SwitchRootContext;
declare const _default$262: __VLS_WithSlots$38<vue37.DefineComponent<SwitchRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: boolean) => any;
}, string, vue37.PublicProps, Readonly<SwitchRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: boolean) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  value: string;
  modelValue: boolean | null;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current value */
    modelValue: boolean;
  }) => any;
}>;
type __VLS_WithSlots$38<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=SwitchRoot.vue.d.ts.map
//#endregion
//#region src/Switch/SwitchThumb.vue.d.ts
interface SwitchThumbProps extends PrimitiveProps {}
declare const _default$263: __VLS_WithSlots$37<vue37.DefineComponent<SwitchThumbProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<SwitchThumbProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$37<T, S> = T & {
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
declare const _default$264: __VLS_WithSlots$36<vue37.DefineComponent<TabsContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TabsContentProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$36<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TabsContent.vue.d.ts.map
//#endregion
//#region src/Tabs/TabsIndicator.vue.d.ts
interface TabsIndicatorProps extends PrimitiveProps {}
declare const _default$265: __VLS_WithSlots$35<vue37.DefineComponent<TabsIndicatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TabsIndicatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$35<T, S> = T & {
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
declare const _default$266: __VLS_WithSlots$34<vue37.DefineComponent<TabsListProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TabsListProps> & Readonly<{}>, {
  loop: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$34<T, S> = T & {
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
declare const _default$267: <T extends StringOrNumber = StringOrNumber>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$3<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$3<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((payload: T) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onUpdate:modelValue"> & TabsRootProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current input values */
      modelValue: T | undefined;
    }) => any;
  };
  emit: (evt: "update:modelValue", payload: T) => void;
}>) => vue37.VNode & {
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
declare const _default$268: __VLS_WithSlots$33<vue37.DefineComponent<TabsTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TabsTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  disabled: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$33<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TabsTrigger.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputClear.vue.d.ts
interface TagsInputClearProps extends PrimitiveProps {}
declare const _default$269: __VLS_WithSlots$32<vue37.DefineComponent<TagsInputClearProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TagsInputClearProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$32<T, S> = T & {
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
declare const _default$270: __VLS_WithSlots$31<vue37.DefineComponent<TagsInputInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TagsInputInputProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$31<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputInput.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputRoot.vue.d.ts
type AcceptableInputValue = string | Record<string, any>;
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
declare const _default$274: <T extends AcceptableInputValue = string>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$2<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$2<Pick<Partial<{}> & Omit<{
    readonly onInvalid?: ((payload: T) => any) | undefined;
    readonly "onUpdate:modelValue"?: ((payload: T[]) => any) | undefined;
    readonly onAddTag?: ((payload: T) => any) | undefined;
    readonly onRemoveTag?: ((payload: T) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onInvalid" | "onUpdate:modelValue" | "onAddTag" | "onRemoveTag"> & TagsInputRootProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      /** Current input values */
      modelValue: AcceptableInputValue[];
    }) => any;
  };
  emit: ((evt: "invalid", payload: T) => void) & ((evt: "update:modelValue", payload: T[]) => void) & ((evt: "addTag", payload: T) => void) & ((evt: "removeTag", payload: T) => void);
}>) => vue37.VNode & {
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
declare const _default$271: __VLS_WithSlots$30<vue37.DefineComponent<TagsInputItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TagsInputItemProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$30<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputItem.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputItemDelete.vue.d.ts
interface TagsInputItemDeleteProps extends PrimitiveProps {}
declare const _default$272: __VLS_WithSlots$29<vue37.DefineComponent<TagsInputItemDeleteProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TagsInputItemDeleteProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$29<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TagsInputItemDelete.vue.d.ts.map
//#endregion
//#region src/TagsInput/TagsInputItemText.vue.d.ts
interface TagsInputItemTextProps extends PrimitiveProps {}
declare const _default$273: __VLS_WithSlots$28<vue37.DefineComponent<TagsInputItemTextProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TagsInputItemTextProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$28<T, S> = T & {
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
declare const _default$275: __VLS_WithSlots$27<vue37.DefineComponent<TimeFieldInputProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TimeFieldInputProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$27<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TimeFieldInput.vue.d.ts.map
//#endregion
//#region src/TimeField/TimeFieldRoot.vue.d.ts
type TimeFieldRootContext = {
  locale: Ref<string>;
  modelValue: Ref<DateValue$1 | undefined>;
  placeholder: Ref<DateValue$1>;
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
declare const _default$276: __VLS_WithSlots$26<vue37.DefineComponent<TimeFieldRootProps, {
  /** Helper to set the focused element inside the DateField */
  setFocusedElement: (el: HTMLElement) => void;
}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (date: TimeValue | undefined) => any;
  "update:placeholder": (date: TimeValue) => any;
}, string, vue37.PublicProps, Readonly<TimeFieldRootProps> & Readonly<{
  "onUpdate:modelValue"?: ((date: TimeValue | undefined) => any) | undefined;
  "onUpdate:placeholder"?: ((date: TimeValue) => any) | undefined;
}>, {
  placeholder: TimeValue;
  disabled: boolean;
  defaultValue: TimeValue;
  readonly: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
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
type __VLS_WithSlots$26<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TimeFieldRoot.vue.d.ts.map
//#endregion
//#region src/Toast/ToastClose.vue.d.ts
interface ToastCloseProps extends PrimitiveProps {}
declare const _default$278: __VLS_WithSlots$25<vue37.DefineComponent<ToastCloseProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToastCloseProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$25<T, S> = T & {
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
declare const _default$277: __VLS_WithSlots$24<vue37.DefineComponent<ToastActionProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToastActionProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$24<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastAction.vue.d.ts.map
//#endregion
//#region src/Toast/ToastDescription.vue.d.ts
interface ToastDescriptionProps extends PrimitiveProps {}
declare const _default$279: __VLS_WithSlots$23<vue37.DefineComponent<ToastDescriptionProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToastDescriptionProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$23<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastDescription.vue.d.ts.map
//#endregion
//#region src/Toast/ToastPortal.vue.d.ts
interface ToastPortalProps extends TeleportProps {}
declare const _default$280: __VLS_WithSlots$22<vue37.DefineComponent<ToastPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToastPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$22<T, S> = T & {
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
declare const _default$281: __VLS_WithSlots$21<vue37.DefineComponent<ToastProviderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToastProviderProps> & Readonly<{}>, {
  label: string;
  duration: number;
  swipeDirection: SwipeDirection;
  swipeThreshold: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$21<T, S> = T & {
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
declare const _default$282: __VLS_WithSlots$20<vue37.DefineComponent<ToastRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  pause: () => any;
  "update:open": (value: boolean) => any;
  escapeKeyDown: (event: KeyboardEvent) => any;
  resume: () => any;
  swipeStart: (event: SwipeEvent) => any;
  swipeMove: (event: SwipeEvent) => any;
  swipeCancel: (event: SwipeEvent) => any;
  swipeEnd: (event: SwipeEvent) => any;
}, string, vue37.PublicProps, Readonly<ToastRootProps> & Readonly<{
  onPause?: (() => any) | undefined;
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onResume?: (() => any) | undefined;
  onSwipeStart?: ((event: SwipeEvent) => any) | undefined;
  onSwipeMove?: ((event: SwipeEvent) => any) | undefined;
  onSwipeCancel?: ((event: SwipeEvent) => any) | undefined;
  onSwipeEnd?: ((event: SwipeEvent) => any) | undefined;
}>, {
  type: "foreground" | "background";
  as: AsTag | vue37.Component;
  open: boolean;
  defaultOpen: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
    /** Remaining time (in ms) */
    remaining: number;
    /** Total time the toast will remain visible for (in ms) */
    duration: number;
  }) => any;
}>;
type __VLS_WithSlots$20<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToastRoot.vue.d.ts.map
//#endregion
//#region src/Toast/ToastTitle.vue.d.ts
interface ToastTitleProps extends PrimitiveProps {}
declare const _default$283: __VLS_WithSlots$19<vue37.DefineComponent<ToastTitleProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToastTitleProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$19<T, S> = T & {
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
declare const _default$284: __VLS_WithSlots$18<vue37.DefineComponent<ToastViewportProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToastViewportProps> & Readonly<{}>, {
  label: string | ((hotkey: string) => string);
  as: AsTag | vue37.Component;
  hotkey: string[];
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$18<T, S> = T & {
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
declare const _default$285: __VLS_WithSlots$17<vue37.DefineComponent<ToggleProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<ToggleProps> & Readonly<{
  "onUpdate:modelValue"?: ((value: boolean) => any) | undefined;
}>, {
  as: AsTag | vue37.Component;
  disabled: boolean;
  modelValue: boolean | null;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
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
type __VLS_WithSlots$17<T, S> = T & {
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
declare const _default$286: __VLS_WithSlots$16<vue37.DefineComponent<ToggleGroupItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToggleGroupItemProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    modelValue: boolean;
    state: DataState;
    pressed: boolean;
    disabled: boolean;
  }) => any;
}>;
type __VLS_WithSlots$16<T, S> = T & {
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
declare const _default$287: __VLS_WithSlots$15<vue37.DefineComponent<ToggleGroupRootProps<AcceptableValue | AcceptableValue[]>, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue | AcceptableValue[]) => any;
}, string, vue37.PublicProps, Readonly<ToggleGroupRootProps<AcceptableValue | AcceptableValue[]>> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue | AcceptableValue[]) => any) | undefined;
}>, {
  loop: boolean;
  disabled: boolean;
  rovingFocus: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current toggle values */
    modelValue: AcceptableValue | AcceptableValue[] | undefined;
  }) => any;
}>;
type __VLS_WithSlots$15<T, S> = T & {
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
declare const _default$288: __VLS_WithSlots$14<vue37.DefineComponent<ToolbarButtonProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToolbarButtonProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$14<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarButton.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarLink.vue.d.ts
interface ToolbarLinkProps extends PrimitiveProps {}
declare const _default$289: __VLS_WithSlots$13<vue37.DefineComponent<ToolbarLinkProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToolbarLinkProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$13<T, S> = T & {
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
declare const _default$290: __VLS_WithSlots$12<vue37.DefineComponent<ToolbarRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToolbarRootProps> & Readonly<{}>, {
  orientation: DataOrientation;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$12<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarRoot.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarSeparator.vue.d.ts
interface ToolbarSeparatorProps extends PrimitiveProps {}
declare const _default$291: __VLS_WithSlots$11<vue37.DefineComponent<ToolbarSeparatorProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToolbarSeparatorProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$11<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarSeparator.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarToggleGroup.vue.d.ts
type ToolbarToggleGroupEmits = ToggleGroupRootEmits;
interface ToolbarToggleGroupProps extends ToggleGroupRootProps {}
declare const _default$292: __VLS_WithSlots$10<vue37.DefineComponent<ToolbarToggleGroupProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:modelValue": (payload: AcceptableValue | AcceptableValue[]) => any;
}, string, vue37.PublicProps, Readonly<ToolbarToggleGroupProps> & Readonly<{
  "onUpdate:modelValue"?: ((payload: AcceptableValue | AcceptableValue[]) => any) | undefined;
}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$10<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=ToolbarToggleGroup.vue.d.ts.map
//#endregion
//#region src/Toolbar/ToolbarToggleItem.vue.d.ts
interface ToolbarToggleItemProps extends ToggleGroupItemProps {}
declare const _default$293: __VLS_WithSlots$9<vue37.DefineComponent<ToolbarToggleItemProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ToolbarToggleItemProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$9<T, S> = T & {
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
declare const _default$294: __VLS_WithSlots$8<vue37.DefineComponent<TooltipArrowProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TooltipArrowProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  width: number;
  height: number;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$8<T, S> = T & {
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
declare const _default$295: __VLS_WithSlots$7<vue37.DefineComponent<TooltipContentProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  escapeKeyDown: (event: KeyboardEvent) => any;
  pointerDownOutside: (event: Event) => any;
}, string, vue37.PublicProps, Readonly<TooltipContentProps> & Readonly<{
  onEscapeKeyDown?: ((event: KeyboardEvent) => any) | undefined;
  onPointerDownOutside?: ((event: Event) => any) | undefined;
}>, {
  side: Side;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$7<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipContent.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipPortal.vue.d.ts
interface TooltipPortalProps extends TeleportProps {}
declare const _default$296: __VLS_WithSlots$6<vue37.DefineComponent<TooltipPortalProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TooltipPortalProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$6<T, S> = T & {
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
}
declare const _default$297: __VLS_WithSlots$5<vue37.DefineComponent<TooltipProviderProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TooltipProviderProps> & Readonly<{}>, {
  delayDuration: number;
  skipDelayDuration: number;
  disableHoverableContent: boolean;
  ignoreNonKeyboardFocus: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$5<T, S> = T & {
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
declare const _default$298: __VLS_WithSlots$4<vue37.DefineComponent<TooltipRootProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {
  "update:open": (value: boolean) => any;
}, string, vue37.PublicProps, Readonly<TooltipRootProps> & Readonly<{
  "onUpdate:open"?: ((value: boolean) => any) | undefined;
}>, {
  disabled: boolean;
  open: boolean;
  defaultOpen: boolean;
  delayDuration: number;
  disableHoverableContent: boolean;
  disableClosingTrigger: boolean;
  ignoreNonKeyboardFocus: boolean;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    /** Current open state */
    open: boolean;
  }) => any;
}>;
type __VLS_WithSlots$4<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=TooltipRoot.vue.d.ts.map
//#endregion
//#region src/Tooltip/TooltipTrigger.vue.d.ts
interface TooltipTriggerProps extends PopperAnchorProps {}
declare const _default$299: __VLS_WithSlots$3<vue37.DefineComponent<TooltipTriggerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TooltipTriggerProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$3<T, S> = T & {
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
type SelectEvent$3<T> = CustomEvent<{
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
  select: [event: SelectEvent$3<T>];
  /** Event handler called when the selecting item. <br> It can be prevented by calling `event.preventDefault`. */
  toggle: [event: ToggleEvent<T>];
};
declare const _default$300: <T extends Record<string, any>>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal$1<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal$1<Pick<Partial<{}> & Omit<{
    readonly onSelect?: ((event: SelectEvent$3<T>) => any) | undefined;
    readonly onToggle?: ((event: ToggleEvent<T>) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onToggle" | "onSelect"> & TreeItemProps<T> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{
    isExpanded: vue37.ComputedRef<boolean>;
    isSelected: vue37.ComputedRef<boolean>;
    isIndeterminate: vue37.ComputedRef<boolean | undefined>;
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
  emit: ((evt: "select", event: SelectEvent$3<T>) => void) & ((evt: "toggle", event: ToggleEvent<T>) => void);
}>) => vue37.VNode & {
  __ctx?: Awaited<typeof __VLS_setup>;
};
type __VLS_PrettifyLocal$1<T> = { [K in keyof T]: T[K] } & {};
//# sourceMappingURL=TreeItem.vue.d.ts.map
//#endregion
//#region src/Tree/TreeRoot.vue.d.ts
interface TreeRootProps<T = Record<string, any>, U extends Record<string, any> = Record<string, any>, M extends boolean = false> extends PrimitiveProps {
  /** The controlled value of the tree. Can be binded with with `v-model`. */
  modelValue?: M extends true ? U[] : U;
  /** The value of the tree when initially rendered. Use when you do not need to control the state of the tree */
  defaultValue?: M extends true ? U[] : U;
  /** List of items */
  items?: T[];
  /** The controlled value of the expanded item. Can be binded with with `v-model`. */
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
declare const _default$301: <T extends Record<string, any>, U extends Record<string, any>, M extends boolean = false>(__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>["props"], __VLS_ctx?: __VLS_PrettifyLocal<Pick<NonNullable<Awaited<typeof __VLS_setup>>, "attrs" | "emit" | "slots">>, __VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>["expose"], __VLS_setup?: Promise<{
  props: __VLS_PrettifyLocal<Pick<Partial<{}> & Omit<{
    readonly "onUpdate:modelValue"?: ((val: M extends true ? U[] : U) => any) | undefined;
    readonly "onUpdate:expanded"?: ((val: string[]) => any) | undefined;
  } & vue37.VNodeProps & vue37.AllowedComponentProps & vue37.ComponentCustomProps, never>, "onUpdate:modelValue" | "onUpdate:expanded"> & TreeRootProps<T, U, M> & Partial<{}>> & vue37.PublicProps;
  expose(exposed: vue37.ShallowUnwrapRef<{}>): void;
  attrs: any;
  slots: {
    default?: (props: {
      flattenItems: FlattenedItem<T>[];
      modelValue: M extends true ? U[] : U;
      expanded: string[];
    }) => any;
  };
  emit: ((evt: "update:modelValue", val: M extends true ? U[] : U) => void) & ((evt: "update:expanded", val: string[]) => void);
}>) => vue37.VNode & {
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
  estimateSize?: number;
  /** Text content for each item to achieve type-ahead feature */
  textContent?: (item: Record<string, any>) => string;
}
declare const _default$302: __VLS_WithSlots$2<vue37.DefineComponent<TreeVirtualizerProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<TreeVirtualizerProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {
    item: FlattenedItem<Record<string, any>>;
    virtualizer: Virtualizer<Element | Window, Element>;
    virtualItem: VirtualItem;
  }) => any;
}>;
type __VLS_WithSlots$2<T, S> = T & {
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
declare const _default$303: __VLS_WithSlots$1<vue37.DefineComponent<ViewportProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<ViewportProps> & Readonly<{}>, {}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots$1<T, S> = T & {
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
declare const _default$304: __VLS_WithSlots<vue37.DefineComponent<VisuallyHiddenProps, {}, {}, {}, {}, vue37.ComponentOptionsMixin, vue37.ComponentOptionsMixin, {}, string, vue37.PublicProps, Readonly<VisuallyHiddenProps> & Readonly<{}>, {
  as: AsTag | vue37.Component;
  feature: "focusable" | "fully-hidden";
}, {}, {}, {}, string, vue37.ComponentProvideOptions, false, {}, any>, {
  default?: (props: {}) => any;
}>;
type __VLS_WithSlots<T, S> = T & {
  new (): {
    $slots: S;
  };
};
//# sourceMappingURL=VisuallyHidden.vue.d.ts.map

//#endregion
export { AcceptableInputValue, AcceptableValue, _default as AccordionContent, AccordionContentProps, _default$1 as AccordionHeader, AccordionHeaderProps, _default$2 as AccordionItem, AccordionItemProps, _default$3 as AccordionRoot, AccordionRootEmits, AccordionRootProps, _default$4 as AccordionTrigger, AccordionTriggerProps, _default$5 as AlertDialogAction, AlertDialogActionProps, _default$6 as AlertDialogCancel, AlertDialogCancelProps, _default$7 as AlertDialogContent, AlertDialogContentEmits, AlertDialogContentProps, _default$8 as AlertDialogDescription, AlertDialogDescriptionProps, AlertDialogEmits, _default$9 as AlertDialogOverlay, AlertDialogOverlayProps, _default$10 as AlertDialogPortal, AlertDialogPortalProps, AlertDialogProps, _default$11 as AlertDialogRoot, _default$12 as AlertDialogTitle, AlertDialogTitleProps, _default$13 as AlertDialogTrigger, AlertDialogTriggerProps, AsTag, _default$14 as AspectRatio, AspectRatioProps, _default$15 as AvatarFallback, AvatarFallbackProps, _default$16 as AvatarImage, AvatarImageEmits, AvatarImageProps, _default$17 as AvatarRoot, AvatarRootProps, _default$18 as CalendarCell, CalendarCellProps, _default$19 as CalendarCellTrigger, CalendarCellTriggerProps, _default$20 as CalendarGrid, _default$21 as CalendarGridBody, CalendarGridBodyProps, _default$22 as CalendarGridHead, CalendarGridHeadProps, CalendarGridProps, _default$23 as CalendarGridRow, CalendarGridRowProps, _default$24 as CalendarHeadCell, CalendarHeadCellProps, _default$25 as CalendarHeader, CalendarHeaderProps, _default$26 as CalendarHeading, CalendarHeadingProps, _default$27 as CalendarNext, CalendarNextProps, _default$28 as CalendarPrev, CalendarPrevProps, _default$29 as CalendarRoot, CalendarRootEmits, CalendarRootProps, CheckedState as CheckboxCheckedState, _default$30 as CheckboxGroupRoot, CheckboxGroupRootEmits, CheckboxGroupRootProps, _default$31 as CheckboxIndicator, CheckboxIndicatorProps, _default$32 as CheckboxRoot, CheckboxRootEmits, CheckboxRootProps, _default$33 as CollapsibleContent, CollapsibleContentEmits, CollapsibleContentProps, _default$34 as CollapsibleRoot, CollapsibleRootEmits, CollapsibleRootProps, _default$35 as CollapsibleTrigger, CollapsibleTriggerProps, _default$36 as ComboboxAnchor, ComboboxAnchorProps, _default$37 as ComboboxArrow, ComboboxArrowProps, _default$38 as ComboboxCancel, ComboboxCancelProps, _default$39 as ComboboxContent, ComboboxContentEmits, ComboboxContentProps, _default$40 as ComboboxEmpty, ComboboxEmptyProps, _default$41 as ComboboxGroup, ComboboxGroupProps, _default$42 as ComboboxInput, ComboboxInputEmits, ComboboxInputProps, _default$43 as ComboboxItem, ComboboxItemEmits, _default$44 as ComboboxItemIndicator, ComboboxItemIndicatorProps, ComboboxItemProps, _default$45 as ComboboxLabel, ComboboxLabelProps, _default$46 as ComboboxPortal, ComboboxPortalProps, _default$47 as ComboboxRoot, ComboboxRootEmits, ComboboxRootProps, _default$48 as ComboboxSeparator, ComboboxSeparatorProps, _default$49 as ComboboxTrigger, ComboboxTriggerProps, _default$50 as ComboboxViewport, ComboboxViewportProps, _default$51 as ComboboxVirtualizer, ComboboxVirtualizerProps, _default$52 as ConfigProvider, ConfigProviderProps, _default$53 as ContextMenuArrow, ContextMenuArrowProps, _default$54 as ContextMenuCheckboxItem, ContextMenuCheckboxItemEmits, ContextMenuCheckboxItemProps, _default$55 as ContextMenuContent, ContextMenuContentEmits, ContextMenuContentProps, _default$56 as ContextMenuGroup, ContextMenuGroupProps, _default$57 as ContextMenuItem, ContextMenuItemEmits, _default$58 as ContextMenuItemIndicator, ContextMenuItemIndicatorProps, ContextMenuItemProps, _default$59 as ContextMenuLabel, ContextMenuLabelProps, _default$60 as ContextMenuPortal, ContextMenuPortalProps, _default$61 as ContextMenuRadioGroup, ContextMenuRadioGroupEmits, ContextMenuRadioGroupProps, _default$62 as ContextMenuRadioItem, ContextMenuRadioItemEmits, ContextMenuRadioItemProps, _default$63 as ContextMenuRoot, ContextMenuRootEmits, ContextMenuRootProps, _default$64 as ContextMenuSeparator, ContextMenuSeparatorProps, _default$65 as ContextMenuSub, _default$66 as ContextMenuSubContent, ContextMenuSubContentEmits, ContextMenuSubContentProps, ContextMenuSubEmits, ContextMenuSubProps, _default$67 as ContextMenuSubTrigger, ContextMenuSubTriggerProps, _default$68 as ContextMenuTrigger, ContextMenuTriggerProps, _default$69 as DateFieldInput, DateFieldInputProps, _default$70 as DateFieldRoot, DateFieldRootEmits, DateFieldRootProps, _default$71 as DatePickerAnchor, _default$72 as DatePickerArrow, _default$73 as DatePickerCalendar, _default$74 as DatePickerCell, DatePickerCellProps, _default$75 as DatePickerCellTrigger, DatePickerCellTriggerProps, _default$76 as DatePickerClose, _default$77 as DatePickerContent, DatePickerContentProps, _default$78 as DatePickerField, _default$79 as DatePickerGrid, _default$80 as DatePickerGridBody, DatePickerGridBodyProps, _default$81 as DatePickerGridHead, DatePickerGridHeadProps, DatePickerGridProps, _default$82 as DatePickerGridRow, DatePickerGridRowProps, _default$83 as DatePickerHeadCell, DatePickerHeadCellProps, _default$84 as DatePickerHeader, DatePickerHeaderProps, _default$85 as DatePickerHeading, DatePickerHeadingProps, _default$86 as DatePickerInput, DatePickerInputProps, _default$87 as DatePickerNext, DatePickerNextProps, _default$88 as DatePickerPrev, DatePickerPrevProps, _default$89 as DatePickerRoot, DatePickerRootEmits, DatePickerRootProps, _default$90 as DatePickerTrigger, DatePickerTriggerProps, DateRange, _default$91 as DateRangeFieldInput, DateRangeFieldInputProps, _default$92 as DateRangeFieldRoot, DateRangeFieldRootEmits, DateRangeFieldRootProps, _default$93 as DateRangePickerAnchor, _default$94 as DateRangePickerArrow, _default$95 as DateRangePickerCalendar, _default$96 as DateRangePickerCell, DateRangePickerCellProps, _default$97 as DateRangePickerCellTrigger, DateRangePickerCellTriggerProps, _default$98 as DateRangePickerClose, _default$99 as DateRangePickerContent, DateRangePickerContentProps, _default$100 as DateRangePickerField, _default$101 as DateRangePickerGrid, _default$102 as DateRangePickerGridBody, DateRangePickerGridBodyProps, _default$103 as DateRangePickerGridHead, DateRangePickerGridHeadProps, DateRangePickerGridProps, _default$104 as DateRangePickerGridRow, DateRangePickerGridRowProps, _default$105 as DateRangePickerHeadCell, DateRangePickerHeadCellProps, _default$106 as DateRangePickerHeader, DateRangePickerHeaderProps, _default$107 as DateRangePickerHeading, DateRangePickerHeadingProps, _default$108 as DateRangePickerInput, DateRangePickerInputProps, _default$109 as DateRangePickerNext, DateRangePickerNextProps, _default$110 as DateRangePickerPrev, DateRangePickerPrevProps, _default$111 as DateRangePickerRoot, DateRangePickerRootEmits, DateRangePickerRootProps, _default$112 as DateRangePickerTrigger, DateRangePickerTriggerProps, DateValue, _default$113 as DialogClose, DialogCloseProps, _default$114 as DialogContent, DialogContentEmits, DialogContentProps, _default$115 as DialogDescription, DialogDescriptionProps, _default$116 as DialogOverlay, DialogOverlayProps, _default$117 as DialogPortal, DialogPortalProps, _default$118 as DialogRoot, DialogRootEmits, DialogRootProps, _default$119 as DialogTitle, DialogTitleProps, _default$120 as DialogTrigger, DialogTriggerProps, _default$121 as DropdownMenuArrow, DropdownMenuArrowProps, _default$122 as DropdownMenuCheckboxItem, DropdownMenuCheckboxItemEmits, DropdownMenuCheckboxItemProps, _default$123 as DropdownMenuContent, DropdownMenuContentEmits, DropdownMenuContentProps, _default$124 as DropdownMenuGroup, DropdownMenuGroupProps, _default$125 as DropdownMenuItem, DropdownMenuItemEmits, _default$126 as DropdownMenuItemIndicator, DropdownMenuItemIndicatorProps, DropdownMenuItemProps, _default$127 as DropdownMenuLabel, DropdownMenuLabelProps, _default$128 as DropdownMenuPortal, DropdownMenuPortalProps, _default$129 as DropdownMenuRadioGroup, DropdownMenuRadioGroupEmits, DropdownMenuRadioGroupProps, _default$130 as DropdownMenuRadioItem, DropdownMenuRadioItemEmits, DropdownMenuRadioItemProps, _default$131 as DropdownMenuRoot, DropdownMenuRootEmits, DropdownMenuRootProps, _default$132 as DropdownMenuSeparator, DropdownMenuSeparatorProps, _default$133 as DropdownMenuSub, _default$134 as DropdownMenuSubContent, DropdownMenuSubContentEmits, DropdownMenuSubContentProps, DropdownMenuSubEmits, DropdownMenuSubProps, _default$135 as DropdownMenuSubTrigger, DropdownMenuSubTriggerProps, _default$136 as DropdownMenuTrigger, DropdownMenuTriggerProps, _default$137 as EditableArea, EditableAreaProps, _default$138 as EditableCancelTrigger, EditableCancelTriggerProps, _default$139 as EditableEditTrigger, EditableEditTriggerProps, _default$140 as EditableInput, EditableInputProps, _default$141 as EditablePreview, EditablePreviewProps, _default$142 as EditableRoot, EditableRootEmits, EditableRootProps, _default$143 as EditableSubmitTrigger, EditableSubmitTriggerProps, FlattenedItem, FocusOutsideEvent, _default$144 as FocusScope, FocusScopeEmits, FocusScopeProps, Formatter, GenericComponentInstance, _default$145 as HoverCardArrow, HoverCardArrowProps, _default$146 as HoverCardContent, HoverCardContentProps, _default$147 as HoverCardPortal, HoverCardPortalProps, _default$148 as HoverCardRoot, HoverCardRootEmits, HoverCardRootProps, _default$149 as HoverCardTrigger, HoverCardTriggerProps, _default$150 as Label, LabelProps, _default$151 as ListboxContent, ListboxContentProps, _default$152 as ListboxFilter, ListboxFilterEmits, ListboxFilterProps, _default$153 as ListboxGroup, _default$154 as ListboxGroupLabel, ListboxGroupLabelProps, ListboxGroupProps, _default$155 as ListboxItem, ListboxItemEmits, _default$156 as ListboxItemIndicator, ListboxItemIndicatorProps, ListboxItemProps, SelectEvent as ListboxItemSelectEvent, _default$157 as ListboxRoot, ListboxRootEmits, ListboxRootProps, _default$158 as ListboxVirtualizer, ListboxVirtualizerProps, _default$159 as MenubarArrow, MenubarArrowProps, _default$160 as MenubarCheckboxItem, MenubarCheckboxItemEmits, MenubarCheckboxItemProps, _default$161 as MenubarContent, MenubarContentProps, _default$162 as MenubarGroup, MenubarGroupProps, _default$163 as MenubarItem, MenubarItemEmits, _default$164 as MenubarItemIndicator, MenubarItemIndicatorProps, MenubarItemProps, _default$165 as MenubarLabel, MenubarLabelProps, _default$166 as MenubarMenu, MenubarMenuProps, _default$167 as MenubarPortal, MenubarPortalProps, _default$168 as MenubarRadioGroup, MenubarRadioGroupEmits, MenubarRadioGroupProps, _default$169 as MenubarRadioItem, MenubarRadioItemEmits, MenubarRadioItemProps, _default$170 as MenubarRoot, MenubarRootEmits, MenubarRootProps, _default$171 as MenubarSeparator, MenubarSeparatorProps, _default$172 as MenubarSub, _default$173 as MenubarSubContent, MenubarSubContentEmits, MenubarSubContentProps, MenubarSubEmits, MenubarSubProps, _default$174 as MenubarSubTrigger, MenubarSubTriggerProps, _default$175 as MenubarTrigger, MenubarTriggerProps, _default$176 as NavigationMenuContent, NavigationMenuContentEmits, NavigationMenuContentProps, _default$177 as NavigationMenuIndicator, NavigationMenuIndicatorProps, _default$178 as NavigationMenuItem, NavigationMenuItemProps, _default$179 as NavigationMenuLink, NavigationMenuLinkEmits, NavigationMenuLinkProps, _default$180 as NavigationMenuList, NavigationMenuListProps, _default$181 as NavigationMenuRoot, NavigationMenuRootEmits, NavigationMenuRootProps, _default$182 as NavigationMenuSub, NavigationMenuSubEmits, NavigationMenuSubProps, _default$183 as NavigationMenuTrigger, NavigationMenuTriggerProps, _default$184 as NavigationMenuViewport, NavigationMenuViewportProps, _default$185 as NumberFieldDecrement, NumberFieldDecrementProps, _default$186 as NumberFieldIncrement, NumberFieldIncrementProps, _default$187 as NumberFieldInput, NumberFieldInputProps, _default$188 as NumberFieldRoot, NumberFieldRootEmits, NumberFieldRootProps, _default$189 as PaginationEllipsis, PaginationEllipsisProps, _default$190 as PaginationFirst, PaginationFirstProps, _default$191 as PaginationLast, PaginationLastProps, _default$192 as PaginationList, _default$193 as PaginationListItem, PaginationListItemProps, PaginationListProps, _default$194 as PaginationNext, PaginationNextProps, _default$195 as PaginationPrev, PaginationPrevProps, _default$196 as PaginationRoot, PaginationRootEmits, PaginationRootProps, _default$197 as PinInputInput, PinInputInputProps, _default$198 as PinInputRoot, PinInputRootEmits, PinInputRootProps, PointerDownOutsideEvent, _default$199 as PopoverAnchor, PopoverAnchorProps, _default$200 as PopoverArrow, PopoverArrowProps, _default$201 as PopoverClose, PopoverCloseProps, _default$202 as PopoverContent, PopoverContentEmits, PopoverContentProps, _default$203 as PopoverPortal, PopoverPortalProps, _default$204 as PopoverRoot, PopoverRootEmits, PopoverRootProps, _default$205 as PopoverTrigger, PopoverTriggerProps, _default$206 as Presence, PresenceProps, Primitive, PrimitiveProps, _default$207 as ProgressIndicator, ProgressIndicatorProps, _default$208 as ProgressRoot, ProgressRootEmits, ProgressRootProps, _default$209 as RadioGroupIndicator, RadioGroupIndicatorProps, _default$210 as RadioGroupItem, RadioGroupItemEmits, RadioGroupItemProps, SelectEvent$1 as RadioGroupItemSelectEvent, _default$211 as RadioGroupRoot, RadioGroupRootEmits, RadioGroupRootProps, _default$212 as RangeCalendarCell, RangeCalendarCellProps, _default$213 as RangeCalendarCellTrigger, RangeCalendarCellTriggerProps, _default$214 as RangeCalendarGrid, _default$215 as RangeCalendarGridBody, RangeCalendarGridBodyProps, _default$216 as RangeCalendarGridHead, RangeCalendarGridHeadProps, RangeCalendarGridProps, _default$217 as RangeCalendarGridRow, RangeCalendarGridRowProps, _default$218 as RangeCalendarHeadCell, RangeCalendarHeadCellProps, _default$219 as RangeCalendarHeader, RangeCalendarHeaderProps, _default$220 as RangeCalendarHeading, RangeCalendarHeadingProps, _default$221 as RangeCalendarNext, RangeCalendarNextProps, _default$222 as RangeCalendarPrev, RangeCalendarPrevProps, _default$223 as RangeCalendarRoot, RangeCalendarRootEmits, RangeCalendarRootProps, ReferenceElement, _default$224 as RovingFocusGroup, RovingFocusGroupEmits, RovingFocusGroupProps, _default$225 as RovingFocusItem, RovingFocusItemProps, _default$226 as ScrollAreaCorner, ScrollAreaCornerProps, _default$227 as ScrollAreaRoot, ScrollAreaRootProps, _default$228 as ScrollAreaScrollbar, ScrollAreaScrollbarProps, _default$229 as ScrollAreaThumb, ScrollAreaThumbProps, _default$230 as ScrollAreaViewport, ScrollAreaViewportProps, _default$231 as SelectArrow, SelectArrowProps, _default$232 as SelectContent, SelectContentEmits, SelectContentProps, _default$233 as SelectGroup, SelectGroupProps, _default$234 as SelectIcon, SelectIconProps, _default$235 as SelectItem, _default$236 as SelectItemIndicator, SelectItemIndicatorProps, SelectItemProps, SelectEvent$2 as SelectItemSelectEvent, _default$237 as SelectItemText, SelectItemTextProps, _default$238 as SelectLabel, SelectLabelProps, _default$239 as SelectPortal, SelectPortalProps, _default$240 as SelectRoot, SelectRootEmits, SelectRootProps, _default$241 as SelectScrollDownButton, SelectScrollDownButtonProps, _default$242 as SelectScrollUpButton, SelectScrollUpButtonProps, _default$243 as SelectSeparator, SelectSeparatorProps, _default$244 as SelectTrigger, SelectTriggerProps, _default$245 as SelectValue, SelectValueProps, _default$246 as SelectViewport, SelectViewportProps, _default$247 as Separator, SeparatorProps, _default$248 as SliderRange, SliderRangeProps, _default$249 as SliderRoot, SliderRootEmits, SliderRootProps, _default$250 as SliderThumb, SliderThumbProps, _default$251 as SliderTrack, SliderTrackProps, Slot, _default$252 as SplitterGroup, SplitterGroupEmits, SplitterGroupProps, _default$253 as SplitterPanel, SplitterPanelEmits, SplitterPanelProps, _default$254 as SplitterResizeHandle, SplitterResizeHandleEmits, SplitterResizeHandleProps, _default$255 as StepperDescription, StepperDescriptionProps, _default$256 as StepperIndicator, StepperIndicatorProps, _default$257 as StepperItem, StepperItemProps, _default$258 as StepperRoot, StepperRootEmits, StepperRootProps, _default$259 as StepperSeparator, StepperSeparatorProps, _default$260 as StepperTitle, StepperTitleProps, _default$261 as StepperTrigger, StepperTriggerProps, _default$262 as SwitchRoot, SwitchRootEmits, SwitchRootProps, _default$263 as SwitchThumb, SwitchThumbProps, _default$264 as TabsContent, TabsContentProps, _default$265 as TabsIndicator, TabsIndicatorProps, _default$266 as TabsList, TabsListProps, _default$267 as TabsRoot, TabsRootEmits, TabsRootProps, _default$268 as TabsTrigger, TabsTriggerProps, _default$269 as TagsInputClear, TagsInputClearProps, _default$270 as TagsInputInput, TagsInputInputProps, _default$271 as TagsInputItem, _default$272 as TagsInputItemDelete, TagsInputItemDeleteProps, TagsInputItemProps, _default$273 as TagsInputItemText, TagsInputItemTextProps, _default$274 as TagsInputRoot, TagsInputRootEmits, TagsInputRootProps, _default$275 as TimeFieldInput, TimeFieldInputProps, _default$276 as TimeFieldRoot, TimeFieldRootEmits, TimeFieldRootProps, _default$277 as ToastAction, ToastActionProps, _default$278 as ToastClose, ToastCloseProps, _default$279 as ToastDescription, ToastDescriptionProps, _default$280 as ToastPortal, ToastPortalProps, _default$281 as ToastProvider, ToastProviderProps, _default$282 as ToastRoot, ToastRootEmits, ToastRootProps, _default$283 as ToastTitle, ToastTitleProps, _default$284 as ToastViewport, ToastViewportProps, _default$285 as Toggle, ToggleEmits, _default$286 as ToggleGroupItem, ToggleGroupItemProps, _default$287 as ToggleGroupRoot, ToggleGroupRootEmits, ToggleGroupRootProps, ToggleProps, _default$288 as ToolbarButton, ToolbarButtonProps, _default$289 as ToolbarLink, ToolbarLinkProps, _default$290 as ToolbarRoot, ToolbarRootProps, _default$291 as ToolbarSeparator, ToolbarSeparatorProps, _default$292 as ToolbarToggleGroup, ToolbarToggleGroupEmits, ToolbarToggleGroupProps, _default$293 as ToolbarToggleItem, ToolbarToggleItemProps, _default$294 as TooltipArrow, TooltipArrowProps, _default$295 as TooltipContent, TooltipContentEmits, TooltipContentProps, _default$296 as TooltipPortal, TooltipPortalProps, _default$297 as TooltipProvider, TooltipProviderProps, _default$298 as TooltipRoot, TooltipRootEmits, TooltipRootProps, _default$299 as TooltipTrigger, TooltipTriggerProps, _default$300 as TreeItem, TreeItemEmits, TreeItemProps, SelectEvent$3 as TreeItemSelectEvent, ToggleEvent as TreeItemToggleEvent, _default$301 as TreeRoot, TreeRootEmits, TreeRootProps, _default$302 as TreeVirtualizer, TreeVirtualizerProps, _default$303 as Viewport, ViewportProps, _default$304 as VisuallyHidden, VisuallyHiddenProps, createContext, injectAccordionItemContext, injectAccordionRootContext, injectAlertDialogContentContext, injectAvatarRootContext, injectCalendarRootContext, injectCheckboxGroupRootContext, injectCheckboxRootContext, injectCollapsibleRootContext, injectComboboxGroupContext, injectListboxItemContext as injectComboboxItemContext, injectComboboxRootContext, injectConfigProviderContext, injectContextMenuRootContext, injectDateFieldRootContext, injectDatePickerRootContext, injectDateRangeFieldRootContext, injectDateRangePickerRootContext, injectDialogRootContext, injectDropdownMenuRootContext, injectEditableRootContext, injectHoverCardRootContext, injectListboxGroupContext, injectListboxItemContext, injectListboxRootContext, injectMenubarMenuContext, injectMenubarRootContext, injectNavigationMenuContext, injectNavigationMenuItemContext, injectNumberFieldRootContext, injectPaginationRootContext, injectPinInputRootContext, injectPopoverRootContext, injectProgressRootContext, injectRadioGroupItemContext, injectRadioGroupRootContext, injectRangeCalendarRootContext, injectScrollAreaRootContext, injectScrollAreaScrollbarContext, injectSelectGroupContext, injectSelectItemContext, injectSelectRootContext, injectSliderRootContext, injectPanelGroupContext as injectSplitterGroupContext, injectStepperItemContext, injectStepperRootContext, injectSwitchRootContext, injectTabsRootContext, injectTagsInputItemContext, injectTagsInputRootContext, injectTimeFieldRootContext, injectToastProviderContext, injectToggleGroupRootContext, injectToolbarRootContext, injectTooltipProviderContext, injectTooltipRootContext, injectTreeRootContext, useBodyScrollLock, useDateFormatter, useEmitAsProps, useFilter, useForwardExpose, useForwardProps, useForwardPropsEmits, useId, useStateMachine, withDefault };
//# sourceMappingURL=index.d.ts.map