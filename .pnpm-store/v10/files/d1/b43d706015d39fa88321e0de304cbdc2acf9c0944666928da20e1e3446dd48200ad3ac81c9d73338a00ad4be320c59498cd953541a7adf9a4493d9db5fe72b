import { RendererOptions, BaseTransitionProps, FunctionalComponent, ObjectDirective, Directive, SetupContext, RenderFunction, ComponentOptions, App, ComponentCustomElementInterface, ConcreteComponent, CreateAppFunction, ComponentObjectPropsOptions, EmitsOptions, ComputedOptions, MethodOptions, ComponentOptionsMixin, ComponentInjectOptions, SlotsType, Component, ComponentProvideOptions, ExtractPropTypes, EmitsToProps, ComponentOptionsBase, CreateComponentPublicInstanceWithMixins, ComponentPublicInstance, DefineComponent, VNodeRef, RootRenderFunction, RootHydrateFunction } from '@vue/runtime-core';
export * from '@vue/runtime-core';
import * as CSS from 'csstype';

export declare const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'>;

type DOMRendererOptions = RendererOptions<Node, Element>;
export declare const patchProp: DOMRendererOptions['patchProp'];

declare const TRANSITION = "transition";
declare const ANIMATION = "animation";
type AnimationTypes = typeof TRANSITION | typeof ANIMATION;
export interface TransitionProps extends BaseTransitionProps<Element> {
    name?: string;
    type?: AnimationTypes;
    css?: boolean;
    duration?: number | {
        enter: number;
        leave: number;
    };
    enterFromClass?: string;
    enterActiveClass?: string;
    enterToClass?: string;
    appearFromClass?: string;
    appearActiveClass?: string;
    appearToClass?: string;
    leaveFromClass?: string;
    leaveActiveClass?: string;
    leaveToClass?: string;
}
/**
 * DOM Transition is a higher-order-component based on the platform-agnostic
 * base Transition component, with DOM-specific logic.
 */
export declare const Transition: FunctionalComponent<TransitionProps>;

export type TransitionGroupProps = Omit<TransitionProps, 'mode'> & {
    tag?: string;
    moveClass?: string;
};
export declare const TransitionGroup: {
    new (): {
        $props: TransitionGroupProps;
    };
};

declare const vShowOriginalDisplay: unique symbol;
declare const vShowHidden: unique symbol;
interface VShowElement extends HTMLElement {
    [vShowOriginalDisplay]: string;
    [vShowHidden]: boolean;
}
export declare const vShow: ObjectDirective<VShowElement> & {
    name: 'show';
};

declare const systemModifiers: readonly ["ctrl", "shift", "alt", "meta"];
type SystemModifiers = (typeof systemModifiers)[number];
type CompatModifiers = keyof typeof keyNames;
type VOnModifiers = SystemModifiers | ModifierGuards | CompatModifiers;
type ModifierGuards = 'shift' | 'ctrl' | 'alt' | 'meta' | 'left' | 'right' | 'stop' | 'prevent' | 'self' | 'middle' | 'exact';
/**
 * @private
 */
export declare const withModifiers: <T extends (event: Event, ...args: unknown[]) => any>(fn: T & {
    _withMods?: {
        [key: string]: T;
    };
}, modifiers: VOnModifiers[]) => T;
declare const keyNames: Record<'esc' | 'space' | 'up' | 'left' | 'right' | 'down' | 'delete', string>;
/**
 * @private
 */
export declare const withKeys: <T extends (event: KeyboardEvent) => any>(fn: T & {
    _withKeys?: {
        [k: string]: T;
    };
}, modifiers: string[]) => T;
type VOnDirective = Directive<any, any, VOnModifiers>;

type AssignerFn = (value: any) => void;
declare const assignKey: unique symbol;
type ModelDirective<T, Modifiers extends string = string> = ObjectDirective<T & {
    [assignKey]: AssignerFn;
    _assigning?: boolean;
}, any, Modifiers>;
export declare const vModelText: ModelDirective<HTMLInputElement | HTMLTextAreaElement, 'trim' | 'number' | 'lazy'>;
export declare const vModelCheckbox: ModelDirective<HTMLInputElement>;
export declare const vModelRadio: ModelDirective<HTMLInputElement>;
export declare const vModelSelect: ModelDirective<HTMLSelectElement, 'number'>;
export declare const vModelDynamic: ObjectDirective<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
type VModelDirective = typeof vModelText | typeof vModelCheckbox | typeof vModelSelect | typeof vModelRadio | typeof vModelDynamic;

export type VueElementConstructor<P = {}> = {
    new (initialProps?: Record<string, any>): VueElement & P;
};
export interface CustomElementOptions {
    styles?: string[];
    shadowRoot?: boolean;
    shadowRootOptions?: Omit<ShadowRootInit, 'mode'>;
    nonce?: string;
    configureApp?: (app: App) => void;
}
export declare function defineCustomElement<Props, RawBindings = object>(setup: (props: Props, ctx: SetupContext) => RawBindings | RenderFunction, options?: Pick<ComponentOptions, 'name' | 'inheritAttrs' | 'emits'> & CustomElementOptions & {
    props?: (keyof Props)[];
}): VueElementConstructor<Props>;
export declare function defineCustomElement<Props, RawBindings = object>(setup: (props: Props, ctx: SetupContext) => RawBindings | RenderFunction, options?: Pick<ComponentOptions, 'name' | 'inheritAttrs' | 'emits'> & CustomElementOptions & {
    props?: ComponentObjectPropsOptions<Props>;
}): VueElementConstructor<Props>;
export declare function defineCustomElement<RuntimePropsOptions extends ComponentObjectPropsOptions = ComponentObjectPropsOptions, PropsKeys extends string = string, RuntimeEmitsOptions extends EmitsOptions = {}, EmitsKeys extends string = string, Data = {}, SetupBindings = {}, Computed extends ComputedOptions = {}, Methods extends MethodOptions = {}, Mixin extends ComponentOptionsMixin = ComponentOptionsMixin, Extends extends ComponentOptionsMixin = ComponentOptionsMixin, InjectOptions extends ComponentInjectOptions = {}, InjectKeys extends string = string, Slots extends SlotsType = {}, LocalComponents extends Record<string, Component> = {}, Directives extends Record<string, Directive> = {}, Exposed extends string = string, Provide extends ComponentProvideOptions = ComponentProvideOptions, InferredProps = string extends PropsKeys ? ComponentObjectPropsOptions extends RuntimePropsOptions ? {} : ExtractPropTypes<RuntimePropsOptions> : {
    [key in PropsKeys]?: any;
}, ResolvedProps = InferredProps & EmitsToProps<RuntimeEmitsOptions>>(options: CustomElementOptions & {
    props?: (RuntimePropsOptions & ThisType<void>) | PropsKeys[];
} & ComponentOptionsBase<ResolvedProps, SetupBindings, Data, Computed, Methods, Mixin, Extends, RuntimeEmitsOptions, EmitsKeys, {}, // Defaults
InjectOptions, InjectKeys, Slots, LocalComponents, Directives, Exposed, Provide> & ThisType<CreateComponentPublicInstanceWithMixins<Readonly<ResolvedProps>, SetupBindings, Data, Computed, Methods, Mixin, Extends, RuntimeEmitsOptions, EmitsKeys, {}, false, InjectOptions, Slots, LocalComponents, Directives, Exposed>>, extraOptions?: CustomElementOptions): VueElementConstructor<ResolvedProps>;
export declare function defineCustomElement<T extends {
    new (...args: any[]): ComponentPublicInstance<any>;
}>(options: T, extraOptions?: CustomElementOptions): VueElementConstructor<T extends DefineComponent<infer P, any, any, any> ? P : unknown>;
export declare const defineSSRCustomElement: typeof defineCustomElement;
declare const BaseClass: typeof HTMLElement;
type InnerComponentDef = ConcreteComponent & CustomElementOptions;
export declare class VueElement extends BaseClass implements ComponentCustomElementInterface {
    /**
     * Component def - note this may be an AsyncWrapper, and this._def will
     * be overwritten by the inner component when resolved.
     */
    private _def;
    private _props;
    private _createApp;
    _isVueCE: boolean;
    private _connected;
    private _resolved;
    private _patching;
    private _dirty;
    private _numberProps;
    private _styleChildren;
    private _pendingResolve;
    private _parent;
    /**
     * dev only
     */
    private _styles?;
    /**
     * dev only
     */
    private _childStyles?;
    private _ob?;
    private _slots?;
    constructor(
    /**
     * Component def - note this may be an AsyncWrapper, and this._def will
     * be overwritten by the inner component when resolved.
     */
    _def: InnerComponentDef, _props?: Record<string, any>, _createApp?: CreateAppFunction<Element>);
    connectedCallback(): void;
    private _setParent;
    private _inheritParentContext;
    disconnectedCallback(): void;
    private _processMutations;
    /**
     * resolve inner component definition (handle possible async component)
     */
    private _resolveDef;
    private _mount;
    private _resolveProps;
    protected _setAttr(key: string): void;
    private _update;
    private _createVNode;
    private _applyStyles;
    /**
     * Only called when shadowRoot is false
     */
    private _parseSlots;
    /**
     * Only called when shadowRoot is false
     */
    private _renderSlots;
}
export declare function useHost(caller?: string): VueElement | null;
/**
 * Retrieve the shadowRoot of the current custom element. Only usable in setup()
 * of a `defineCustomElement` component.
 */
export declare function useShadowRoot(): ShadowRoot | null;

export declare function useCssModule(name?: string): Record<string, string>;

/**
 * Runtime helper for SFC's CSS variable injection feature.
 * @private
 */
export declare function useCssVars(getter: (ctx: any) => Record<string, unknown>): void;

export interface CSSProperties extends CSS.Properties<string | number>, CSS.PropertiesHyphen<string | number> {
    /**
     * The index signature was removed to enable closed typing for style
     * using CSSType. You're able to use type assertion or module augmentation
     * to add properties or an index signature of your own.
     *
     * For examples and more information, visit:
     * https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
     */
    [v: `--${string}`]: string | number | undefined;
}
type Booleanish = boolean | 'true' | 'false';
type Numberish = number | string;
export interface AriaAttributes {
    /** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
    'aria-activedescendant'?: string | undefined;
    /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
    'aria-atomic'?: Booleanish | undefined;
    /**
     * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
     * presented if they are made.
     */
    'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both' | undefined;
    /** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
    'aria-busy'?: Booleanish | undefined;
    /**
     * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
     * @see aria-pressed @see aria-selected.
     */
    'aria-checked'?: Booleanish | 'mixed' | undefined;
    /**
     * Defines the total number of columns in a table, grid, or treegrid.
     * @see aria-colindex.
     */
    'aria-colcount'?: Numberish | undefined;
    /**
     * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
     * @see aria-colcount @see aria-colspan.
     */
    'aria-colindex'?: Numberish | undefined;
    /**
     * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
     * @see aria-colindex @see aria-rowspan.
     */
    'aria-colspan'?: Numberish | undefined;
    /**
     * Identifies the element (or elements) whose contents or presence are controlled by the current element.
     * @see aria-owns.
     */
    'aria-controls'?: string | undefined;
    /** Indicates the element that represents the current item within a container or set of related elements. */
    'aria-current'?: Booleanish | 'page' | 'step' | 'location' | 'date' | 'time' | undefined;
    /**
     * Identifies the element (or elements) that describes the object.
     * @see aria-labelledby
     */
    'aria-describedby'?: string | undefined;
    /**
     * Identifies the element that provides a detailed, extended description for the object.
     * @see aria-describedby.
     */
    'aria-details'?: string | undefined;
    /**
     * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
     * @see aria-hidden @see aria-readonly.
     */
    'aria-disabled'?: Booleanish | undefined;
    /**
     * Indicates what functions can be performed when a dragged object is released on the drop target.
     * @deprecated in ARIA 1.1
     */
    'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup' | undefined;
    /**
     * Identifies the element that provides an error message for the object.
     * @see aria-invalid @see aria-describedby.
     */
    'aria-errormessage'?: string | undefined;
    /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
    'aria-expanded'?: Booleanish | undefined;
    /**
     * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
     * allows assistive technology to override the general default of reading in document source order.
     */
    'aria-flowto'?: string | undefined;
    /**
     * Indicates an element's "grabbed" state in a drag-and-drop operation.
     * @deprecated in ARIA 1.1
     */
    'aria-grabbed'?: Booleanish | undefined;
    /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
    'aria-haspopup'?: Booleanish | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | undefined;
    /**
     * Indicates whether the element is exposed to an accessibility API.
     * @see aria-disabled.
     */
    'aria-hidden'?: Booleanish | undefined;
    /**
     * Indicates the entered value does not conform to the format expected by the application.
     * @see aria-errormessage.
     */
    'aria-invalid'?: Booleanish | 'grammar' | 'spelling' | undefined;
    /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
    'aria-keyshortcuts'?: string | undefined;
    /**
     * Defines a string value that labels the current element.
     * @see aria-labelledby.
     */
    'aria-label'?: string | undefined;
    /**
     * Identifies the element (or elements) that labels the current element.
     * @see aria-describedby.
     */
    'aria-labelledby'?: string | undefined;
    /** Defines the hierarchical level of an element within a structure. */
    'aria-level'?: Numberish | undefined;
    /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
    'aria-live'?: 'off' | 'assertive' | 'polite' | undefined;
    /** Indicates whether an element is modal when displayed. */
    'aria-modal'?: Booleanish | undefined;
    /** Indicates whether a text box accepts multiple lines of input or only a single line. */
    'aria-multiline'?: Booleanish | undefined;
    /** Indicates that the user may select more than one item from the current selectable descendants. */
    'aria-multiselectable'?: Booleanish | undefined;
    /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
    'aria-orientation'?: 'horizontal' | 'vertical' | undefined;
    /**
     * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
     * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
     * @see aria-controls.
     */
    'aria-owns'?: string | undefined;
    /**
     * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
     * A hint could be a sample value or a brief description of the expected format.
     */
    'aria-placeholder'?: string | undefined;
    /**
     * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
     * @see aria-setsize.
     */
    'aria-posinset'?: Numberish | undefined;
    /**
     * Indicates the current "pressed" state of toggle buttons.
     * @see aria-checked @see aria-selected.
     */
    'aria-pressed'?: Booleanish | 'mixed' | undefined;
    /**
     * Indicates that the element is not editable, but is otherwise operable.
     * @see aria-disabled.
     */
    'aria-readonly'?: Booleanish | undefined;
    /**
     * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
     * @see aria-atomic.
     */
    'aria-relevant'?: 'additions' | 'additions removals' | 'additions text' | 'all' | 'removals' | 'removals additions' | 'removals text' | 'text' | 'text additions' | 'text removals' | undefined;
    /** Indicates that user input is required on the element before a form may be submitted. */
    'aria-required'?: Booleanish | undefined;
    /** Defines a human-readable, author-localized description for the role of an element. */
    'aria-roledescription'?: string | undefined;
    /**
     * Defines the total number of rows in a table, grid, or treegrid.
     * @see aria-rowindex.
     */
    'aria-rowcount'?: Numberish | undefined;
    /**
     * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
     * @see aria-rowcount @see aria-rowspan.
     */
    'aria-rowindex'?: Numberish | undefined;
    /**
     * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
     * @see aria-rowindex @see aria-colspan.
     */
    'aria-rowspan'?: Numberish | undefined;
    /**
     * Indicates the current "selected" state of various widgets.
     * @see aria-checked @see aria-pressed.
     */
    'aria-selected'?: Booleanish | undefined;
    /**
     * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
     * @see aria-posinset.
     */
    'aria-setsize'?: Numberish | undefined;
    /** Indicates if items in a table or grid are sorted in ascending or descending order. */
    'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other' | undefined;
    /** Defines the maximum allowed value for a range widget. */
    'aria-valuemax'?: Numberish | undefined;
    /** Defines the minimum allowed value for a range widget. */
    'aria-valuemin'?: Numberish | undefined;
    /**
     * Defines the current value for a range widget.
     * @see aria-valuetext.
     */
    'aria-valuenow'?: Numberish | undefined;
    /** Defines the human readable text alternative of aria-valuenow for a range widget. */
    'aria-valuetext'?: string | undefined;
}
export type StyleValue = false | null | undefined | string | CSSProperties | Array<StyleValue>;
export interface HTMLAttributes extends AriaAttributes, EventHandlers<Events> {
    innerHTML?: string | undefined;
    class?: any;
    style?: StyleValue | undefined;
    accesskey?: string | undefined;
    contenteditable?: Booleanish | 'inherit' | 'plaintext-only' | undefined;
    contextmenu?: string | undefined;
    dir?: string | undefined;
    draggable?: Booleanish | undefined;
    enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | undefined;
    /**
     * @deprecated Use `enterkeyhint` instead.
     */
    enterKeyHint?: HTMLAttributes['enterkeyhint'];
    hidden?: Booleanish | '' | 'hidden' | 'until-found' | undefined;
    id?: string | undefined;
    inert?: Booleanish | undefined;
    lang?: string | undefined;
    placeholder?: string | undefined;
    spellcheck?: Booleanish | undefined;
    tabindex?: Numberish | undefined;
    title?: string | undefined;
    translate?: 'yes' | 'no' | undefined;
    radiogroup?: string | undefined;
    role?: string | undefined;
    about?: string | undefined;
    datatype?: string | undefined;
    inlist?: any;
    prefix?: string | undefined;
    property?: string | undefined;
    resource?: string | undefined;
    typeof?: string | undefined;
    vocab?: string | undefined;
    autocapitalize?: string | undefined;
    autocorrect?: string | undefined;
    autosave?: string | undefined;
    color?: string | undefined;
    itemprop?: string | undefined;
    itemscope?: Booleanish | undefined;
    itemtype?: string | undefined;
    itemid?: string | undefined;
    itemref?: string | undefined;
    results?: Numberish | undefined;
    security?: string | undefined;
    unselectable?: 'on' | 'off' | undefined;
    /**
     * Hints at the type of data that might be entered by the user while editing the element or its contents
     * @see https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute
     */
    inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | undefined;
    /**
     * Specify that a standard HTML element should behave like a defined custom built-in element
     * @see https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is
     */
    is?: string | undefined;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts
     */
    exportparts?: string;
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part
     */
    part?: string;
}
type HTMLAttributeReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
export interface AnchorHTMLAttributes extends HTMLAttributes {
    download?: any;
    href?: string | undefined;
    hreflang?: string | undefined;
    media?: string | undefined;
    ping?: string | undefined;
    rel?: string | undefined;
    target?: string | undefined;
    type?: string | undefined;
    referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
}
export interface AreaHTMLAttributes extends HTMLAttributes {
    alt?: string | undefined;
    coords?: string | undefined;
    download?: any;
    href?: string | undefined;
    hreflang?: string | undefined;
    media?: string | undefined;
    referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
    rel?: string | undefined;
    shape?: string | undefined;
    target?: string | undefined;
}
export interface AudioHTMLAttributes extends MediaHTMLAttributes {
}
export interface BaseHTMLAttributes extends HTMLAttributes {
    href?: string | undefined;
    target?: string | undefined;
}
export interface BlockquoteHTMLAttributes extends HTMLAttributes {
    cite?: string | undefined;
}
export interface ButtonHTMLAttributes extends HTMLAttributes {
    autofocus?: Booleanish | undefined;
    disabled?: Booleanish | undefined;
    form?: string | undefined;
    formaction?: string | undefined;
    formenctype?: string | undefined;
    formmethod?: string | undefined;
    formnovalidate?: Booleanish | undefined;
    formtarget?: string | undefined;
    name?: string | undefined;
    type?: 'submit' | 'reset' | 'button' | undefined;
    value?: string | ReadonlyArray<string> | number | undefined;
}
export interface CanvasHTMLAttributes extends HTMLAttributes {
    height?: Numberish | undefined;
    width?: Numberish | undefined;
}
export interface ColHTMLAttributes extends HTMLAttributes {
    span?: Numberish | undefined;
    width?: Numberish | undefined;
}
export interface ColgroupHTMLAttributes extends HTMLAttributes {
    span?: Numberish | undefined;
}
export interface DataHTMLAttributes extends HTMLAttributes {
    value?: string | ReadonlyArray<string> | number | undefined;
}
export interface DetailsHTMLAttributes extends HTMLAttributes {
    name?: string | undefined;
    open?: Booleanish | undefined;
}
export interface DelHTMLAttributes extends HTMLAttributes {
    cite?: string | undefined;
    datetime?: string | undefined;
}
export interface DialogHTMLAttributes extends HTMLAttributes {
    open?: Booleanish | undefined;
    onClose?: ((payload: Event) => void) | undefined;
    onCancel?: ((payload: Event) => void) | undefined;
}
export interface EmbedHTMLAttributes extends HTMLAttributes {
    height?: Numberish | undefined;
    src?: string | undefined;
    type?: string | undefined;
    width?: Numberish | undefined;
}
export interface FieldsetHTMLAttributes extends HTMLAttributes {
    disabled?: Booleanish | undefined;
    form?: string | undefined;
    name?: string | undefined;
}
export interface FormHTMLAttributes extends HTMLAttributes {
    acceptcharset?: string | undefined;
    action?: string | undefined;
    autocomplete?: string | undefined;
    enctype?: string | undefined;
    method?: string | undefined;
    name?: string | undefined;
    novalidate?: Booleanish | undefined;
    target?: string | undefined;
}
export interface HtmlHTMLAttributes extends HTMLAttributes {
    manifest?: string | undefined;
}
export interface IframeHTMLAttributes extends HTMLAttributes {
    allow?: string | undefined;
    allowfullscreen?: Booleanish | undefined;
    allowtransparency?: Booleanish | undefined;
    /** @deprecated */
    frameborder?: Numberish | undefined;
    height?: Numberish | undefined;
    loading?: 'eager' | 'lazy' | undefined;
    /** @deprecated */
    marginheight?: Numberish | undefined;
    /** @deprecated */
    marginwidth?: Numberish | undefined;
    name?: string | undefined;
    referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
    sandbox?: string | undefined;
    /** @deprecated */
    scrolling?: string | undefined;
    seamless?: Booleanish | undefined;
    src?: string | undefined;
    srcdoc?: string | undefined;
    width?: Numberish | undefined;
}
export interface ImgHTMLAttributes extends HTMLAttributes {
    alt?: string | undefined;
    crossorigin?: 'anonymous' | 'use-credentials' | '' | undefined;
    decoding?: 'async' | 'auto' | 'sync' | undefined;
    fetchpriority?: 'high' | 'low' | 'auto' | undefined;
    height?: Numberish | undefined;
    loading?: 'eager' | 'lazy' | undefined;
    referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
    sizes?: string | undefined;
    src?: string | undefined;
    srcset?: string | undefined;
    usemap?: string | undefined;
    width?: Numberish | undefined;
}
export interface InsHTMLAttributes extends HTMLAttributes {
    cite?: string | undefined;
    datetime?: string | undefined;
}
export type InputTypeHTMLAttribute = 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week' | (string & {});
export interface InputHTMLAttributes extends HTMLAttributes {
    accept?: string | undefined;
    alt?: string | undefined;
    autocomplete?: string | undefined;
    autofocus?: Booleanish | undefined;
    capture?: boolean | 'user' | 'environment' | undefined;
    checked?: Booleanish | any[] | Set<any> | undefined;
    crossorigin?: string | undefined;
    disabled?: Booleanish | undefined;
    form?: string | undefined;
    formaction?: string | undefined;
    formenctype?: string | undefined;
    formmethod?: string | undefined;
    formnovalidate?: Booleanish | undefined;
    formtarget?: string | undefined;
    height?: Numberish | undefined;
    indeterminate?: boolean | undefined;
    list?: string | undefined;
    max?: Numberish | undefined;
    maxlength?: Numberish | undefined;
    min?: Numberish | undefined;
    minlength?: Numberish | undefined;
    multiple?: Booleanish | undefined;
    name?: string | undefined;
    pattern?: string | undefined;
    placeholder?: string | undefined;
    readonly?: Booleanish | undefined;
    required?: Booleanish | undefined;
    size?: Numberish | undefined;
    src?: string | undefined;
    step?: Numberish | undefined;
    type?: InputTypeHTMLAttribute | undefined;
    value?: any;
    width?: Numberish | undefined;
    onCancel?: ((payload: Event) => void) | undefined;
}
export interface KeygenHTMLAttributes extends HTMLAttributes {
    autofocus?: Booleanish | undefined;
    challenge?: string | undefined;
    disabled?: Booleanish | undefined;
    form?: string | undefined;
    keytype?: string | undefined;
    keyparams?: string | undefined;
    name?: string | undefined;
}
export interface LabelHTMLAttributes extends HTMLAttributes {
    for?: string | undefined;
    form?: string | undefined;
}
export interface LiHTMLAttributes extends HTMLAttributes {
    value?: string | ReadonlyArray<string> | number | undefined;
}
export interface LinkHTMLAttributes extends HTMLAttributes {
    as?: string | undefined;
    crossorigin?: string | undefined;
    href?: string | undefined;
    hreflang?: string | undefined;
    integrity?: string | undefined;
    media?: string | undefined;
    referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
    rel?: string | undefined;
    sizes?: string | undefined;
    type?: string | undefined;
    charset?: string | undefined;
}
export interface MapHTMLAttributes extends HTMLAttributes {
    name?: string | undefined;
}
export interface MenuHTMLAttributes extends HTMLAttributes {
    type?: string | undefined;
}
export interface MediaHTMLAttributes extends HTMLAttributes {
    autoplay?: Booleanish | undefined;
    controls?: Booleanish | undefined;
    controlslist?: string | undefined;
    crossorigin?: string | undefined;
    loop?: Booleanish | undefined;
    mediagroup?: string | undefined;
    muted?: Booleanish | undefined;
    playsinline?: Booleanish | undefined;
    preload?: string | undefined;
    src?: string | undefined;
}
export interface MetaHTMLAttributes extends HTMLAttributes {
    charset?: string | undefined;
    content?: string | undefined;
    httpequiv?: string | undefined;
    name?: string | undefined;
}
export interface MeterHTMLAttributes extends HTMLAttributes {
    form?: string | undefined;
    high?: Numberish | undefined;
    low?: Numberish | undefined;
    max?: Numberish | undefined;
    min?: Numberish | undefined;
    optimum?: Numberish | undefined;
    value?: string | ReadonlyArray<string> | number | undefined;
}
export interface QuoteHTMLAttributes extends HTMLAttributes {
    cite?: string | undefined;
}
export interface ObjectHTMLAttributes extends HTMLAttributes {
    classid?: string | undefined;
    data?: string | undefined;
    form?: string | undefined;
    height?: Numberish | undefined;
    name?: string | undefined;
    type?: string | undefined;
    usemap?: string | undefined;
    width?: Numberish | undefined;
    wmode?: string | undefined;
}
export interface OlHTMLAttributes extends HTMLAttributes {
    reversed?: Booleanish | undefined;
    start?: Numberish | undefined;
    type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined;
}
export interface OptgroupHTMLAttributes extends HTMLAttributes {
    disabled?: Booleanish | undefined;
    label?: string | undefined;
}
export interface OptionHTMLAttributes extends HTMLAttributes {
    disabled?: Booleanish | undefined;
    label?: string | undefined;
    selected?: Booleanish | undefined;
    value?: any;
}
export interface OutputHTMLAttributes extends HTMLAttributes {
    for?: string | undefined;
    form?: string | undefined;
    name?: string | undefined;
}
export interface ParamHTMLAttributes extends HTMLAttributes {
    name?: string | undefined;
    value?: string | ReadonlyArray<string> | number | undefined;
}
export interface ProgressHTMLAttributes extends HTMLAttributes {
    max?: Numberish | undefined;
    value?: string | ReadonlyArray<string> | number | undefined;
}
export interface ScriptHTMLAttributes extends HTMLAttributes {
    async?: Booleanish | undefined;
    /** @deprecated */
    charset?: string | undefined;
    crossorigin?: string | undefined;
    defer?: Booleanish | undefined;
    integrity?: string | undefined;
    nomodule?: Booleanish | undefined;
    referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
    nonce?: string | undefined;
    src?: string | undefined;
    type?: string | undefined;
}
export interface SelectHTMLAttributes extends HTMLAttributes {
    autocomplete?: string | undefined;
    autofocus?: Booleanish | undefined;
    disabled?: Booleanish | undefined;
    form?: string | undefined;
    multiple?: Booleanish | undefined;
    name?: string | undefined;
    required?: Booleanish | undefined;
    size?: Numberish | undefined;
    value?: any;
}
export interface SourceHTMLAttributes extends HTMLAttributes {
    media?: string | undefined;
    sizes?: string | undefined;
    src?: string | undefined;
    srcset?: string | undefined;
    type?: string | undefined;
}
export interface StyleHTMLAttributes extends HTMLAttributes {
    media?: string | undefined;
    nonce?: string | undefined;
    scoped?: Booleanish | undefined;
    type?: string | undefined;
}
export interface TableHTMLAttributes extends HTMLAttributes {
    cellpadding?: Numberish | undefined;
    cellspacing?: Numberish | undefined;
    summary?: string | undefined;
    width?: Numberish | undefined;
}
export interface TextareaHTMLAttributes extends HTMLAttributes {
    autocomplete?: string | undefined;
    autofocus?: Booleanish | undefined;
    cols?: Numberish | undefined;
    dirname?: string | undefined;
    disabled?: Booleanish | undefined;
    form?: string | undefined;
    maxlength?: Numberish | undefined;
    minlength?: Numberish | undefined;
    name?: string | undefined;
    placeholder?: string | undefined;
    readonly?: Booleanish | undefined;
    required?: Booleanish | undefined;
    rows?: Numberish | undefined;
    value?: string | ReadonlyArray<string> | number | null | undefined;
    wrap?: string | undefined;
}
export interface TdHTMLAttributes extends HTMLAttributes {
    align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
    colspan?: Numberish | undefined;
    headers?: string | undefined;
    rowspan?: Numberish | undefined;
    scope?: string | undefined;
    abbr?: string | undefined;
    height?: Numberish | undefined;
    width?: Numberish | undefined;
    valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined;
}
export interface ThHTMLAttributes extends HTMLAttributes {
    align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
    colspan?: Numberish | undefined;
    headers?: string | undefined;
    rowspan?: Numberish | undefined;
    scope?: string | undefined;
    abbr?: string | undefined;
}
export interface TimeHTMLAttributes extends HTMLAttributes {
    datetime?: string | undefined;
}
export interface TrackHTMLAttributes extends HTMLAttributes {
    default?: Booleanish | undefined;
    kind?: string | undefined;
    label?: string | undefined;
    src?: string | undefined;
    srclang?: string | undefined;
}
export interface VideoHTMLAttributes extends MediaHTMLAttributes {
    height?: Numberish | undefined;
    playsinline?: Booleanish | undefined;
    poster?: string | undefined;
    width?: Numberish | undefined;
    disablePictureInPicture?: Booleanish | undefined;
    disableRemotePlayback?: Booleanish | undefined;
}
export interface WebViewHTMLAttributes extends HTMLAttributes {
    allowfullscreen?: Booleanish | undefined;
    allowpopups?: Booleanish | undefined;
    autoFocus?: Booleanish | undefined;
    autosize?: Booleanish | undefined;
    blinkfeatures?: string | undefined;
    disableblinkfeatures?: string | undefined;
    disableguestresize?: Booleanish | undefined;
    disablewebsecurity?: Booleanish | undefined;
    guestinstance?: string | undefined;
    httpreferrer?: string | undefined;
    nodeintegration?: Booleanish | undefined;
    partition?: string | undefined;
    plugins?: Booleanish | undefined;
    preload?: string | undefined;
    src?: string | undefined;
    useragent?: string | undefined;
    webpreferences?: string | undefined;
}
export interface SVGAttributes extends AriaAttributes, EventHandlers<Events> {
    innerHTML?: string | undefined;
    /**
     * SVG Styling Attributes
     * @see https://www.w3.org/TR/SVG/styling.html#ElementSpecificStyling
     */
    class?: any;
    style?: StyleValue | undefined;
    color?: string | undefined;
    height?: Numberish | undefined;
    id?: string | undefined;
    lang?: string | undefined;
    max?: Numberish | undefined;
    media?: string | undefined;
    method?: string | undefined;
    min?: Numberish | undefined;
    name?: string | undefined;
    target?: string | undefined;
    type?: string | undefined;
    width?: Numberish | undefined;
    role?: string | undefined;
    tabindex?: Numberish | undefined;
    crossOrigin?: 'anonymous' | 'use-credentials' | '' | undefined;
    'accent-height'?: Numberish | undefined;
    accumulate?: 'none' | 'sum' | undefined;
    additive?: 'replace' | 'sum' | undefined;
    'alignment-baseline'?: 'auto' | 'baseline' | 'before-edge' | 'text-before-edge' | 'middle' | 'central' | 'after-edge' | 'text-after-edge' | 'ideographic' | 'alphabetic' | 'hanging' | 'mathematical' | 'inherit' | undefined;
    allowReorder?: 'no' | 'yes' | undefined;
    alphabetic?: Numberish | undefined;
    amplitude?: Numberish | undefined;
    'arabic-form'?: 'initial' | 'medial' | 'terminal' | 'isolated' | undefined;
    ascent?: Numberish | undefined;
    attributeName?: string | undefined;
    attributeType?: string | undefined;
    autoReverse?: Numberish | undefined;
    azimuth?: Numberish | undefined;
    baseFrequency?: Numberish | undefined;
    'baseline-shift'?: Numberish | undefined;
    baseProfile?: Numberish | undefined;
    bbox?: Numberish | undefined;
    begin?: Numberish | undefined;
    bias?: Numberish | undefined;
    by?: Numberish | undefined;
    calcMode?: Numberish | undefined;
    'cap-height'?: Numberish | undefined;
    clip?: Numberish | undefined;
    'clip-path'?: string | undefined;
    clipPathUnits?: Numberish | undefined;
    'clip-rule'?: Numberish | undefined;
    'color-interpolation'?: Numberish | undefined;
    'color-interpolation-filters'?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit' | undefined;
    'color-profile'?: Numberish | undefined;
    'color-rendering'?: Numberish | undefined;
    contentScriptType?: Numberish | undefined;
    contentStyleType?: Numberish | undefined;
    cursor?: Numberish | undefined;
    cx?: Numberish | undefined;
    cy?: Numberish | undefined;
    d?: string | undefined;
    decelerate?: Numberish | undefined;
    descent?: Numberish | undefined;
    diffuseConstant?: Numberish | undefined;
    direction?: Numberish | undefined;
    display?: Numberish | undefined;
    divisor?: Numberish | undefined;
    'dominant-baseline'?: Numberish | undefined;
    dur?: Numberish | undefined;
    dx?: Numberish | undefined;
    dy?: Numberish | undefined;
    edgeMode?: Numberish | undefined;
    elevation?: Numberish | undefined;
    'enable-background'?: Numberish | undefined;
    end?: Numberish | undefined;
    exponent?: Numberish | undefined;
    externalResourcesRequired?: Numberish | undefined;
    fill?: string | undefined;
    'fill-opacity'?: Numberish | undefined;
    'fill-rule'?: 'nonzero' | 'evenodd' | 'inherit' | undefined;
    filter?: string | undefined;
    filterRes?: Numberish | undefined;
    filterUnits?: Numberish | undefined;
    'flood-color'?: Numberish | undefined;
    'flood-opacity'?: Numberish | undefined;
    focusable?: Numberish | undefined;
    'font-family'?: string | undefined;
    'font-size'?: Numberish | undefined;
    'font-size-adjust'?: Numberish | undefined;
    'font-stretch'?: Numberish | undefined;
    'font-style'?: Numberish | undefined;
    'font-variant'?: Numberish | undefined;
    'font-weight'?: Numberish | undefined;
    format?: Numberish | undefined;
    from?: Numberish | undefined;
    fx?: Numberish | undefined;
    fy?: Numberish | undefined;
    g1?: Numberish | undefined;
    g2?: Numberish | undefined;
    'glyph-name'?: Numberish | undefined;
    'glyph-orientation-horizontal'?: Numberish | undefined;
    'glyph-orientation-vertical'?: Numberish | undefined;
    glyphRef?: Numberish | undefined;
    gradientTransform?: string | undefined;
    gradientUnits?: string | undefined;
    hanging?: Numberish | undefined;
    'horiz-adv-x'?: Numberish | undefined;
    'horiz-origin-x'?: Numberish | undefined;
    href?: string | undefined;
    ideographic?: Numberish | undefined;
    'image-rendering'?: Numberish | undefined;
    in2?: Numberish | undefined;
    in?: string | undefined;
    intercept?: Numberish | undefined;
    k1?: Numberish | undefined;
    k2?: Numberish | undefined;
    k3?: Numberish | undefined;
    k4?: Numberish | undefined;
    k?: Numberish | undefined;
    kernelMatrix?: Numberish | undefined;
    kernelUnitLength?: Numberish | undefined;
    kerning?: Numberish | undefined;
    keyPoints?: Numberish | undefined;
    keySplines?: Numberish | undefined;
    keyTimes?: Numberish | undefined;
    lengthAdjust?: Numberish | undefined;
    'letter-spacing'?: Numberish | undefined;
    'lighting-color'?: Numberish | undefined;
    limitingConeAngle?: Numberish | undefined;
    local?: Numberish | undefined;
    'marker-end'?: string | undefined;
    markerHeight?: Numberish | undefined;
    'marker-mid'?: string | undefined;
    'marker-start'?: string | undefined;
    markerUnits?: Numberish | undefined;
    markerWidth?: Numberish | undefined;
    mask?: string | undefined;
    maskContentUnits?: Numberish | undefined;
    maskUnits?: Numberish | undefined;
    mathematical?: Numberish | undefined;
    mode?: Numberish | undefined;
    numOctaves?: Numberish | undefined;
    offset?: Numberish | undefined;
    opacity?: Numberish | undefined;
    operator?: Numberish | undefined;
    order?: Numberish | undefined;
    orient?: Numberish | undefined;
    orientation?: Numberish | undefined;
    origin?: Numberish | undefined;
    overflow?: Numberish | undefined;
    'overline-position'?: Numberish | undefined;
    'overline-thickness'?: Numberish | undefined;
    'paint-order'?: Numberish | undefined;
    'panose-1'?: Numberish | undefined;
    pathLength?: Numberish | undefined;
    patternContentUnits?: string | undefined;
    patternTransform?: Numberish | undefined;
    patternUnits?: string | undefined;
    'pointer-events'?: Numberish | undefined;
    points?: string | undefined;
    pointsAtX?: Numberish | undefined;
    pointsAtY?: Numberish | undefined;
    pointsAtZ?: Numberish | undefined;
    preserveAlpha?: Numberish | undefined;
    preserveAspectRatio?: string | undefined;
    primitiveUnits?: Numberish | undefined;
    r?: Numberish | undefined;
    radius?: Numberish | undefined;
    refX?: Numberish | undefined;
    refY?: Numberish | undefined;
    renderingIntent?: Numberish | undefined;
    repeatCount?: Numberish | undefined;
    repeatDur?: Numberish | undefined;
    requiredExtensions?: Numberish | undefined;
    requiredFeatures?: Numberish | undefined;
    restart?: Numberish | undefined;
    result?: string | undefined;
    rotate?: Numberish | undefined;
    rx?: Numberish | undefined;
    ry?: Numberish | undefined;
    scale?: Numberish | undefined;
    seed?: Numberish | undefined;
    'shape-rendering'?: Numberish | undefined;
    slope?: Numberish | undefined;
    spacing?: Numberish | undefined;
    specularConstant?: Numberish | undefined;
    specularExponent?: Numberish | undefined;
    speed?: Numberish | undefined;
    spreadMethod?: string | undefined;
    startOffset?: Numberish | undefined;
    stdDeviation?: Numberish | undefined;
    stemh?: Numberish | undefined;
    stemv?: Numberish | undefined;
    stitchTiles?: Numberish | undefined;
    'stop-color'?: string | undefined;
    'stop-opacity'?: Numberish | undefined;
    'strikethrough-position'?: Numberish | undefined;
    'strikethrough-thickness'?: Numberish | undefined;
    string?: Numberish | undefined;
    stroke?: string | undefined;
    'stroke-dasharray'?: Numberish | undefined;
    'stroke-dashoffset'?: Numberish | undefined;
    'stroke-linecap'?: 'butt' | 'round' | 'square' | 'inherit' | undefined;
    'stroke-linejoin'?: 'miter' | 'round' | 'bevel' | 'inherit' | undefined;
    'stroke-miterlimit'?: Numberish | undefined;
    'stroke-opacity'?: Numberish | undefined;
    'stroke-width'?: Numberish | undefined;
    surfaceScale?: Numberish | undefined;
    systemLanguage?: Numberish | undefined;
    tableValues?: Numberish | undefined;
    targetX?: Numberish | undefined;
    targetY?: Numberish | undefined;
    'text-anchor'?: string | undefined;
    'text-decoration'?: Numberish | undefined;
    textLength?: Numberish | undefined;
    'text-rendering'?: Numberish | undefined;
    to?: Numberish | undefined;
    transform?: string | undefined;
    u1?: Numberish | undefined;
    u2?: Numberish | undefined;
    'underline-position'?: Numberish | undefined;
    'underline-thickness'?: Numberish | undefined;
    unicode?: Numberish | undefined;
    'unicode-bidi'?: Numberish | undefined;
    'unicode-range'?: Numberish | undefined;
    'unitsPer-em'?: Numberish | undefined;
    'v-alphabetic'?: Numberish | undefined;
    values?: string | undefined;
    'vector-effect'?: Numberish | undefined;
    version?: string | undefined;
    'vert-adv-y'?: Numberish | undefined;
    'vert-origin-x'?: Numberish | undefined;
    'vert-origin-y'?: Numberish | undefined;
    'v-hanging'?: Numberish | undefined;
    'v-ideographic'?: Numberish | undefined;
    viewBox?: string | undefined;
    viewTarget?: Numberish | undefined;
    visibility?: Numberish | undefined;
    'v-mathematical'?: Numberish | undefined;
    widths?: Numberish | undefined;
    'word-spacing'?: Numberish | undefined;
    'writing-mode'?: Numberish | undefined;
    x1?: Numberish | undefined;
    x2?: Numberish | undefined;
    x?: Numberish | undefined;
    xChannelSelector?: string | undefined;
    'x-height'?: Numberish | undefined;
    xlinkActuate?: string | undefined;
    xlinkArcrole?: string | undefined;
    xlinkHref?: string | undefined;
    xlinkRole?: string | undefined;
    xlinkShow?: string | undefined;
    xlinkTitle?: string | undefined;
    xlinkType?: string | undefined;
    xmlns?: string | undefined;
    xmlnsXlink?: string | undefined;
    y1?: Numberish | undefined;
    y2?: Numberish | undefined;
    y?: Numberish | undefined;
    yChannelSelector?: string | undefined;
    z?: Numberish | undefined;
    zoomAndPan?: string | undefined;
}
export interface IntrinsicElementAttributes {
    a: AnchorHTMLAttributes;
    abbr: HTMLAttributes;
    address: HTMLAttributes;
    area: AreaHTMLAttributes;
    article: HTMLAttributes;
    aside: HTMLAttributes;
    audio: AudioHTMLAttributes;
    b: HTMLAttributes;
    base: BaseHTMLAttributes;
    bdi: HTMLAttributes;
    bdo: HTMLAttributes;
    blockquote: BlockquoteHTMLAttributes;
    body: HTMLAttributes;
    br: HTMLAttributes;
    button: ButtonHTMLAttributes;
    canvas: CanvasHTMLAttributes;
    caption: HTMLAttributes;
    cite: HTMLAttributes;
    code: HTMLAttributes;
    col: ColHTMLAttributes;
    colgroup: ColgroupHTMLAttributes;
    data: DataHTMLAttributes;
    datalist: HTMLAttributes;
    dd: HTMLAttributes;
    del: DelHTMLAttributes;
    details: DetailsHTMLAttributes;
    dfn: HTMLAttributes;
    dialog: DialogHTMLAttributes;
    div: HTMLAttributes;
    dl: HTMLAttributes;
    dt: HTMLAttributes;
    em: HTMLAttributes;
    embed: EmbedHTMLAttributes;
    fieldset: FieldsetHTMLAttributes;
    figcaption: HTMLAttributes;
    figure: HTMLAttributes;
    footer: HTMLAttributes;
    form: FormHTMLAttributes;
    h1: HTMLAttributes;
    h2: HTMLAttributes;
    h3: HTMLAttributes;
    h4: HTMLAttributes;
    h5: HTMLAttributes;
    h6: HTMLAttributes;
    head: HTMLAttributes;
    header: HTMLAttributes;
    hgroup: HTMLAttributes;
    hr: HTMLAttributes;
    html: HtmlHTMLAttributes;
    i: HTMLAttributes;
    iframe: IframeHTMLAttributes;
    img: ImgHTMLAttributes;
    input: InputHTMLAttributes;
    ins: InsHTMLAttributes;
    kbd: HTMLAttributes;
    keygen: KeygenHTMLAttributes;
    label: LabelHTMLAttributes;
    legend: HTMLAttributes;
    li: LiHTMLAttributes;
    link: LinkHTMLAttributes;
    main: HTMLAttributes;
    map: MapHTMLAttributes;
    mark: HTMLAttributes;
    menu: MenuHTMLAttributes;
    meta: MetaHTMLAttributes;
    meter: MeterHTMLAttributes;
    nav: HTMLAttributes;
    noindex: HTMLAttributes;
    noscript: HTMLAttributes;
    object: ObjectHTMLAttributes;
    ol: OlHTMLAttributes;
    optgroup: OptgroupHTMLAttributes;
    option: OptionHTMLAttributes;
    output: OutputHTMLAttributes;
    p: HTMLAttributes;
    param: ParamHTMLAttributes;
    picture: HTMLAttributes;
    pre: HTMLAttributes;
    progress: ProgressHTMLAttributes;
    q: QuoteHTMLAttributes;
    rp: HTMLAttributes;
    rt: HTMLAttributes;
    ruby: HTMLAttributes;
    s: HTMLAttributes;
    samp: HTMLAttributes;
    script: ScriptHTMLAttributes;
    section: HTMLAttributes;
    select: SelectHTMLAttributes;
    small: HTMLAttributes;
    source: SourceHTMLAttributes;
    span: HTMLAttributes;
    strong: HTMLAttributes;
    style: StyleHTMLAttributes;
    sub: HTMLAttributes;
    summary: HTMLAttributes;
    sup: HTMLAttributes;
    table: TableHTMLAttributes;
    template: HTMLAttributes;
    tbody: HTMLAttributes;
    td: TdHTMLAttributes;
    textarea: TextareaHTMLAttributes;
    tfoot: HTMLAttributes;
    th: ThHTMLAttributes;
    thead: HTMLAttributes;
    time: TimeHTMLAttributes;
    title: HTMLAttributes;
    tr: HTMLAttributes;
    track: TrackHTMLAttributes;
    u: HTMLAttributes;
    ul: HTMLAttributes;
    var: HTMLAttributes;
    video: VideoHTMLAttributes;
    wbr: HTMLAttributes;
    webview: WebViewHTMLAttributes;
    svg: SVGAttributes;
    animate: SVGAttributes;
    animateMotion: SVGAttributes;
    animateTransform: SVGAttributes;
    circle: SVGAttributes;
    clipPath: SVGAttributes;
    defs: SVGAttributes;
    desc: SVGAttributes;
    ellipse: SVGAttributes;
    feBlend: SVGAttributes;
    feColorMatrix: SVGAttributes;
    feComponentTransfer: SVGAttributes;
    feComposite: SVGAttributes;
    feConvolveMatrix: SVGAttributes;
    feDiffuseLighting: SVGAttributes;
    feDisplacementMap: SVGAttributes;
    feDistantLight: SVGAttributes;
    feDropShadow: SVGAttributes;
    feFlood: SVGAttributes;
    feFuncA: SVGAttributes;
    feFuncB: SVGAttributes;
    feFuncG: SVGAttributes;
    feFuncR: SVGAttributes;
    feGaussianBlur: SVGAttributes;
    feImage: SVGAttributes;
    feMerge: SVGAttributes;
    feMergeNode: SVGAttributes;
    feMorphology: SVGAttributes;
    feOffset: SVGAttributes;
    fePointLight: SVGAttributes;
    feSpecularLighting: SVGAttributes;
    feSpotLight: SVGAttributes;
    feTile: SVGAttributes;
    feTurbulence: SVGAttributes;
    filter: SVGAttributes;
    foreignObject: SVGAttributes;
    g: SVGAttributes;
    image: SVGAttributes;
    line: SVGAttributes;
    linearGradient: SVGAttributes;
    marker: SVGAttributes;
    mask: SVGAttributes;
    metadata: SVGAttributes;
    mpath: SVGAttributes;
    path: SVGAttributes;
    pattern: SVGAttributes;
    polygon: SVGAttributes;
    polyline: SVGAttributes;
    radialGradient: SVGAttributes;
    rect: SVGAttributes;
    set: SVGAttributes;
    stop: SVGAttributes;
    switch: SVGAttributes;
    symbol: SVGAttributes;
    text: SVGAttributes;
    textPath: SVGAttributes;
    tspan: SVGAttributes;
    use: SVGAttributes;
    view: SVGAttributes;
}
export interface Events {
    onCopy: ClipboardEvent;
    onCut: ClipboardEvent;
    onPaste: ClipboardEvent;
    onCompositionend: CompositionEvent;
    onCompositionstart: CompositionEvent;
    onCompositionupdate: CompositionEvent;
    onDrag: DragEvent;
    onDragend: DragEvent;
    onDragenter: DragEvent;
    onDragexit: DragEvent;
    onDragleave: DragEvent;
    onDragover: DragEvent;
    onDragstart: DragEvent;
    onDrop: DragEvent;
    onFocus: FocusEvent;
    onFocusin: FocusEvent;
    onFocusout: FocusEvent;
    onBlur: FocusEvent;
    onChange: Event;
    onBeforeinput: InputEvent;
    onFormdata: FormDataEvent;
    onInput: InputEvent;
    onReset: Event;
    onSubmit: SubmitEvent;
    onInvalid: Event;
    onFullscreenchange: Event;
    onFullscreenerror: Event;
    onLoad: Event;
    onError: Event;
    onKeydown: KeyboardEvent;
    onKeypress: KeyboardEvent;
    onKeyup: KeyboardEvent;
    onDblclick: MouseEvent;
    onMousedown: MouseEvent;
    onMouseenter: MouseEvent;
    onMouseleave: MouseEvent;
    onMousemove: MouseEvent;
    onMouseout: MouseEvent;
    onMouseover: MouseEvent;
    onMouseup: MouseEvent;
    onAbort: UIEvent;
    onCanplay: Event;
    onCanplaythrough: Event;
    onDurationchange: Event;
    onEmptied: Event;
    onEncrypted: MediaEncryptedEvent;
    onEnded: Event;
    onLoadeddata: Event;
    onLoadedmetadata: Event;
    onLoadstart: Event;
    onPause: Event;
    onPlay: Event;
    onPlaying: Event;
    onProgress: ProgressEvent;
    onRatechange: Event;
    onSeeked: Event;
    onSeeking: Event;
    onStalled: Event;
    onSuspend: Event;
    onTimeupdate: Event;
    onVolumechange: Event;
    onWaiting: Event;
    onSelect: Event;
    onScroll: Event;
    onScrollend: Event;
    onTouchcancel: TouchEvent;
    onTouchend: TouchEvent;
    onTouchmove: TouchEvent;
    onTouchstart: TouchEvent;
    onAuxclick: PointerEvent;
    onClick: PointerEvent;
    onContextmenu: PointerEvent;
    onGotpointercapture: PointerEvent;
    onLostpointercapture: PointerEvent;
    onPointerdown: PointerEvent;
    onPointermove: PointerEvent;
    onPointerup: PointerEvent;
    onPointercancel: PointerEvent;
    onPointerenter: PointerEvent;
    onPointerleave: PointerEvent;
    onPointerover: PointerEvent;
    onPointerout: PointerEvent;
    onBeforetoggle: ToggleEvent;
    onToggle: ToggleEvent;
    onWheel: WheelEvent;
    onAnimationcancel: AnimationEvent;
    onAnimationstart: AnimationEvent;
    onAnimationend: AnimationEvent;
    onAnimationiteration: AnimationEvent;
    onSecuritypolicyviolation: SecurityPolicyViolationEvent;
    onTransitioncancel: TransitionEvent;
    onTransitionend: TransitionEvent;
    onTransitionrun: TransitionEvent;
    onTransitionstart: TransitionEvent;
}
type EventHandlers<E> = {
    [K in keyof E]?: E[K] extends (...args: any) => any ? E[K] : (payload: E[K]) => void;
};

export interface ReservedProps {
    key?: PropertyKey | undefined;
    ref?: VNodeRef | undefined;
    ref_for?: boolean | undefined;
    ref_key?: string | undefined;
}
export type NativeElements = {
    [K in keyof IntrinsicElementAttributes]: IntrinsicElementAttributes[K] & ReservedProps;
};

/**
 * This is a stub implementation to prevent the need to use dom types.
 *
 * To enable proper types, add `"dom"` to `"lib"` in your `tsconfig.json`.
 */
type DomType<T> = typeof globalThis extends {
    window: unknown;
} ? T : never;
declare module '@vue/reactivity' {
    interface RefUnwrapBailTypes {
        runtimeDOMBailTypes: DomType<Node | Window>;
    }
}
declare module '@vue/runtime-core' {
    interface GlobalComponents {
        Transition: DefineComponent<TransitionProps>;
        TransitionGroup: DefineComponent<TransitionGroupProps>;
    }
    interface GlobalDirectives {
        vShow: typeof vShow;
        vOn: VOnDirective;
        vBind: VModelDirective;
        vIf: Directive<any, boolean>;
        vOnce: Directive;
        vSlot: Directive;
    }
}
export declare const render: RootRenderFunction<Element | ShadowRoot>;
export declare const hydrate: RootHydrateFunction;
export declare const createApp: CreateAppFunction<Element>;
export declare const createSSRApp: CreateAppFunction<Element>;


