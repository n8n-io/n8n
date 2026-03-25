import type { BaseMime } from '../utils/mime';
import type { StringLiteralUnion } from '../utils/types';
/**
 * This code is based on React.
 * https://github.com/facebook/react
 * MIT License
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */
export declare namespace JSX {
    export type CrossOrigin = 'anonymous' | 'use-credentials' | '' | undefined;
    export interface CSSProperties {
        [propertyKey: string]: unknown;
    }
    type AnyAttributes = {
        [attributeName: string]: any;
    };
    interface JSXAttributes {
        dangerouslySetInnerHTML?: {
            __html: string;
        };
    }
    interface EventAttributes {
        onScroll?: (event: Event) => void;
        onScrollCapture?: (event: Event) => void;
        onScrollEnd?: (event: Event) => void;
        onScrollEndCapture?: (event: Event) => void;
        onWheel?: (event: WheelEvent) => void;
        onWheelCapture?: (event: WheelEvent) => void;
        onAnimationCancel?: (event: AnimationEvent) => void;
        onAnimationCancelCapture?: (event: AnimationEvent) => void;
        onAnimationEnd?: (event: AnimationEvent) => void;
        onAnimationEndCapture?: (event: AnimationEvent) => void;
        onAnimationIteration?: (event: AnimationEvent) => void;
        onAnimationIterationCapture?: (event: AnimationEvent) => void;
        onAnimationStart?: (event: AnimationEvent) => void;
        onAnimationStartCapture?: (event: AnimationEvent) => void;
        onCopy?: (event: ClipboardEvent) => void;
        onCopyCapture?: (event: ClipboardEvent) => void;
        onCut?: (event: ClipboardEvent) => void;
        onCutCapture?: (event: ClipboardEvent) => void;
        onPaste?: (event: ClipboardEvent) => void;
        onPasteCapture?: (event: ClipboardEvent) => void;
        onCompositionEnd?: (event: CompositionEvent) => void;
        onCompositionEndCapture?: (event: CompositionEvent) => void;
        onCompositionStart?: (event: CompositionEvent) => void;
        onCompositionStartCapture?: (event: CompositionEvent) => void;
        onCompositionUpdate?: (event: CompositionEvent) => void;
        onCompositionUpdateCapture?: (event: CompositionEvent) => void;
        onBlur?: (event: FocusEvent) => void;
        onBlurCapture?: (event: FocusEvent) => void;
        onFocus?: (event: FocusEvent) => void;
        onFocusCapture?: (event: FocusEvent) => void;
        onFocusIn?: (event: FocusEvent) => void;
        onFocusInCapture?: (event: FocusEvent) => void;
        onFocusOut?: (event: FocusEvent) => void;
        onFocusOutCapture?: (event: FocusEvent) => void;
        onFullscreenChange?: (event: Event) => void;
        onFullscreenChangeCapture?: (event: Event) => void;
        onFullscreenError?: (event: Event) => void;
        onFullscreenErrorCapture?: (event: Event) => void;
        onKeyDown?: (event: KeyboardEvent) => void;
        onKeyDownCapture?: (event: KeyboardEvent) => void;
        onKeyPress?: (event: KeyboardEvent) => void;
        onKeyPressCapture?: (event: KeyboardEvent) => void;
        onKeyUp?: (event: KeyboardEvent) => void;
        onKeyUpCapture?: (event: KeyboardEvent) => void;
        onAuxClick?: (event: MouseEvent) => void;
        onAuxClickCapture?: (event: MouseEvent) => void;
        onClick?: (event: MouseEvent) => void;
        onClickCapture?: (event: MouseEvent) => void;
        onContextMenu?: (event: MouseEvent) => void;
        onContextMenuCapture?: (event: MouseEvent) => void;
        onDoubleClick?: (event: MouseEvent) => void;
        onDoubleClickCapture?: (event: MouseEvent) => void;
        onMouseDown?: (event: MouseEvent) => void;
        onMouseDownCapture?: (event: MouseEvent) => void;
        onMouseEnter?: (event: MouseEvent) => void;
        onMouseEnterCapture?: (event: MouseEvent) => void;
        onMouseLeave?: (event: MouseEvent) => void;
        onMouseLeaveCapture?: (event: MouseEvent) => void;
        onMouseMove?: (event: MouseEvent) => void;
        onMouseMoveCapture?: (event: MouseEvent) => void;
        onMouseOut?: (event: MouseEvent) => void;
        onMouseOutCapture?: (event: MouseEvent) => void;
        onMouseOver?: (event: MouseEvent) => void;
        onMouseOverCapture?: (event: MouseEvent) => void;
        onMouseUp?: (event: MouseEvent) => void;
        onMouseUpCapture?: (event: MouseEvent) => void;
        onMouseWheel?: (event: WheelEvent) => void;
        onMouseWheelCapture?: (event: WheelEvent) => void;
        onGotPointerCapture?: (event: PointerEvent) => void;
        onGotPointerCaptureCapture?: (event: PointerEvent) => void;
        onLostPointerCapture?: (event: PointerEvent) => void;
        onLostPointerCaptureCapture?: (event: PointerEvent) => void;
        onPointerCancel?: (event: PointerEvent) => void;
        onPointerCancelCapture?: (event: PointerEvent) => void;
        onPointerDown?: (event: PointerEvent) => void;
        onPointerDownCapture?: (event: PointerEvent) => void;
        onPointerEnter?: (event: PointerEvent) => void;
        onPointerEnterCapture?: (event: PointerEvent) => void;
        onPointerLeave?: (event: PointerEvent) => void;
        onPointerLeaveCapture?: (event: PointerEvent) => void;
        onPointerMove?: (event: PointerEvent) => void;
        onPointerMoveCapture?: (event: PointerEvent) => void;
        onPointerOut?: (event: PointerEvent) => void;
        onPointerOutCapture?: (event: PointerEvent) => void;
        onPointerOver?: (event: PointerEvent) => void;
        onPointerOverCapture?: (event: PointerEvent) => void;
        onPointerUp?: (event: PointerEvent) => void;
        onPointerUpCapture?: (event: PointerEvent) => void;
        onTouchCancel?: (event: TouchEvent) => void;
        onTouchCancelCapture?: (event: TouchEvent) => void;
        onTouchEnd?: (event: TouchEvent) => void;
        onTouchEndCapture?: (event: TouchEvent) => void;
        onTouchMove?: (event: TouchEvent) => void;
        onTouchMoveCapture?: (event: TouchEvent) => void;
        onTouchStart?: (event: TouchEvent) => void;
        onTouchStartCapture?: (event: TouchEvent) => void;
        onTransitionCancel?: (event: TransitionEvent) => void;
        onTransitionCancelCapture?: (event: TransitionEvent) => void;
        onTransitionEnd?: (event: TransitionEvent) => void;
        onTransitionEndCapture?: (event: TransitionEvent) => void;
        onTransitionRun?: (event: TransitionEvent) => void;
        onTransitionRunCapture?: (event: TransitionEvent) => void;
        onTransitionStart?: (event: TransitionEvent) => void;
        onTransitionStartCapture?: (event: TransitionEvent) => void;
        onFormData?: (event: FormDataEvent) => void;
        onFormDataCapture?: (event: FormDataEvent) => void;
        onReset?: (event: Event) => void;
        onResetCapture?: (event: Event) => void;
        onSubmit?: (event: Event) => void;
        onSubmitCapture?: (event: Event) => void;
        onInvalid?: (event: Event) => void;
        onInvalidCapture?: (event: Event) => void;
        onSelect?: (event: Event) => void;
        onSelectCapture?: (event: Event) => void;
        onSelectChange?: (event: Event) => void;
        onSelectChangeCapture?: (event: Event) => void;
        onInput?: (event: InputEvent) => void;
        onInputCapture?: (event: InputEvent) => void;
        onBeforeInput?: (event: InputEvent) => void;
        onBeforeInputCapture?: (event: InputEvent) => void;
        onChange?: (event: Event) => void;
        onChangeCapture?: (event: Event) => void;
    }
    export interface HTMLAttributes extends JSXAttributes, EventAttributes, AnyAttributes {
        accesskey?: string | undefined;
        autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters' | undefined;
        autofocus?: boolean | undefined;
        class?: string | Promise<string> | undefined;
        contenteditable?: boolean | 'inherit' | 'plaintext-only' | undefined;
        contextmenu?: string | undefined;
        dir?: string | undefined;
        draggable?: 'true' | 'false' | boolean | undefined;
        enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send' | undefined;
        hidden?: boolean | undefined;
        id?: string | undefined;
        inert?: boolean | undefined;
        inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' | undefined;
        is?: string | undefined;
        itemid?: string | undefined;
        itemprop?: string | undefined;
        itemref?: string | undefined;
        itemscope?: boolean | undefined;
        itemtype?: string | undefined;
        lang?: string | undefined;
        nonce?: string | undefined;
        placeholder?: string | undefined;
        /** @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API */
        popover?: boolean | 'auto' | 'manual' | undefined;
        slot?: string | undefined;
        spellcheck?: boolean | undefined;
        style?: CSSProperties | string | undefined;
        tabindex?: number | undefined;
        title?: string | undefined;
        translate?: 'yes' | 'no' | undefined;
        itemProp?: string | undefined;
    }
    type HTMLAttributeReferrerPolicy = '' | 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
    type HTMLAttributeAnchorTarget = StringLiteralUnion<'_self' | '_blank' | '_parent' | '_top'>;
    interface AnchorHTMLAttributes extends HTMLAttributes {
        download?: string | boolean | undefined;
        href?: string | undefined;
        hreflang?: string | undefined;
        media?: string | undefined;
        ping?: string | undefined;
        target?: HTMLAttributeAnchorTarget | undefined;
        type?: StringLiteralUnion<BaseMime> | undefined;
        referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
    }
    interface AudioHTMLAttributes extends MediaHTMLAttributes {
    }
    interface AreaHTMLAttributes extends HTMLAttributes {
        alt?: string | undefined;
        coords?: string | undefined;
        download?: string | boolean | undefined;
        href?: string | undefined;
        hreflang?: string | undefined;
        media?: string | undefined;
        referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
        shape?: string | undefined;
        target?: HTMLAttributeAnchorTarget | undefined;
    }
    interface BaseHTMLAttributes extends HTMLAttributes {
        href?: string | undefined;
        target?: HTMLAttributeAnchorTarget | undefined;
    }
    interface BlockquoteHTMLAttributes extends HTMLAttributes {
        cite?: string | undefined;
    }
    /** @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API */
    type HTMLAttributePopoverTargetAction = 'show' | 'hide' | 'toggle';
    interface ButtonHTMLAttributes extends HTMLAttributes {
        disabled?: boolean | undefined;
        form?: string | undefined;
        formenctype?: HTMLAttributeFormEnctype | undefined;
        formmethod?: HTMLAttributeFormMethod | undefined;
        formnovalidate?: boolean | undefined;
        formtarget?: HTMLAttributeAnchorTarget | undefined;
        name?: string | undefined;
        type?: 'submit' | 'reset' | 'button' | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
        popovertarget?: string | undefined;
        popovertargetaction?: HTMLAttributePopoverTargetAction | undefined;
        formAction?: string | Function | undefined;
    }
    interface CanvasHTMLAttributes extends HTMLAttributes {
        height?: number | string | undefined;
        width?: number | string | undefined;
    }
    interface ColHTMLAttributes extends HTMLAttributes {
        span?: number | undefined;
        width?: number | string | undefined;
    }
    interface ColgroupHTMLAttributes extends HTMLAttributes {
        span?: number | undefined;
    }
    interface DataHTMLAttributes extends HTMLAttributes {
        value?: string | ReadonlyArray<string> | number | undefined;
    }
    interface DetailsHTMLAttributes extends HTMLAttributes {
        open?: boolean | undefined;
    }
    interface DelHTMLAttributes extends HTMLAttributes {
        cite?: string | undefined;
        dateTime?: string | undefined;
    }
    interface DialogHTMLAttributes extends HTMLAttributes {
        open?: boolean | undefined;
    }
    interface EmbedHTMLAttributes extends HTMLAttributes {
        height?: number | string | undefined;
        src?: string | undefined;
        type?: StringLiteralUnion<BaseMime> | undefined;
        width?: number | string | undefined;
    }
    interface FieldsetHTMLAttributes extends HTMLAttributes {
        disabled?: boolean | undefined;
        form?: string | undefined;
        name?: string | undefined;
    }
    /** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#method */
    type HTMLAttributeFormMethod = 'get' | 'post' | 'dialog';
    /** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#enctype */
    type HTMLAttributeFormEnctype = 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
    /** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#autocomplete */
    type HTMLAttributeFormAutocomplete = 'on' | 'off';
    interface FormHTMLAttributes extends HTMLAttributes {
        'accept-charset'?: StringLiteralUnion<'utf-8'> | undefined;
        autocomplete?: HTMLAttributeFormAutocomplete | undefined;
        enctype?: HTMLAttributeFormEnctype | undefined;
        method?: HTMLAttributeFormMethod | undefined;
        name?: string | undefined;
        novalidate?: boolean | undefined;
        target?: HTMLAttributeAnchorTarget | undefined;
        action?: string | Function | undefined;
    }
    interface HtmlHTMLAttributes extends HTMLAttributes {
        manifest?: string | undefined;
    }
    interface IframeHTMLAttributes extends HTMLAttributes {
        allow?: string | undefined;
        allowfullscreen?: boolean | undefined;
        height?: number | string | undefined;
        loading?: 'eager' | 'lazy' | undefined;
        name?: string | undefined;
        referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
        sandbox?: string | undefined;
        seamless?: boolean | undefined;
        src?: string | undefined;
        srcdoc?: string | undefined;
        width?: number | string | undefined;
    }
    interface ImgHTMLAttributes extends HTMLAttributes {
        alt?: string | undefined;
        crossorigin?: CrossOrigin;
        decoding?: 'async' | 'auto' | 'sync' | undefined;
        height?: number | string | undefined;
        loading?: 'eager' | 'lazy' | undefined;
        referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
        sizes?: string | undefined;
        src?: string | undefined;
        srcset?: string | undefined;
        usemap?: string | undefined;
        width?: number | string | undefined;
    }
    interface InsHTMLAttributes extends HTMLAttributes {
        cite?: string | undefined;
        datetime?: string | undefined;
    }
    type HTMLInputTypeAttribute = StringLiteralUnion<'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week'>;
    type AutoFillAddressKind = 'billing' | 'shipping';
    type AutoFillBase = '' | 'off' | 'on';
    type AutoFillContactField = 'email' | 'tel' | 'tel-area-code' | 'tel-country-code' | 'tel-extension' | 'tel-local' | 'tel-local-prefix' | 'tel-local-suffix' | 'tel-national';
    type AutoFillContactKind = 'home' | 'mobile' | 'work';
    type AutoFillCredentialField = 'webauthn';
    type AutoFillNormalField = 'additional-name' | 'address-level1' | 'address-level2' | 'address-level3' | 'address-level4' | 'address-line1' | 'address-line2' | 'address-line3' | 'bday-day' | 'bday-month' | 'bday-year' | 'cc-csc' | 'cc-exp' | 'cc-exp-month' | 'cc-exp-year' | 'cc-family-name' | 'cc-given-name' | 'cc-name' | 'cc-number' | 'cc-type' | 'country' | 'country-name' | 'current-password' | 'family-name' | 'given-name' | 'honorific-prefix' | 'honorific-suffix' | 'name' | 'new-password' | 'one-time-code' | 'organization' | 'postal-code' | 'street-address' | 'transaction-amount' | 'transaction-currency' | 'username';
    type OptionalPrefixToken<T extends string> = `${T} ` | '';
    type OptionalPostfixToken<T extends string> = ` ${T}` | '';
    type AutoFillField = AutoFillNormalField | `${OptionalPrefixToken<AutoFillContactKind>}${AutoFillContactField}`;
    type AutoFillSection = `section-${string}`;
    type AutoFill = AutoFillBase | `${OptionalPrefixToken<AutoFillSection>}${OptionalPrefixToken<AutoFillAddressKind>}${AutoFillField}${OptionalPostfixToken<AutoFillCredentialField>}`;
    interface InputHTMLAttributes extends HTMLAttributes {
        accept?: string | undefined;
        alt?: string | undefined;
        autocomplete?: StringLiteralUnion<AutoFill> | undefined;
        capture?: boolean | 'user' | 'environment' | undefined;
        checked?: boolean | undefined;
        disabled?: boolean | undefined;
        form?: string | undefined;
        formenctype?: HTMLAttributeFormEnctype | undefined;
        formmethod?: HTMLAttributeFormMethod | undefined;
        formnovalidate?: boolean | undefined;
        formtarget?: HTMLAttributeAnchorTarget | undefined;
        height?: number | string | undefined;
        list?: string | undefined;
        max?: number | string | undefined;
        maxlength?: number | undefined;
        min?: number | string | undefined;
        minlength?: number | undefined;
        multiple?: boolean | undefined;
        name?: string | undefined;
        pattern?: string | undefined;
        placeholder?: string | undefined;
        readonly?: boolean | undefined;
        required?: boolean | undefined;
        size?: number | undefined;
        src?: string | undefined;
        step?: number | string | undefined;
        type?: HTMLInputTypeAttribute | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
        width?: number | string | undefined;
        popovertarget?: string | undefined;
        popovertargetaction?: HTMLAttributePopoverTargetAction | undefined;
        formAction?: string | Function | undefined;
    }
    interface KeygenHTMLAttributes extends HTMLAttributes {
        challenge?: string | undefined;
        disabled?: boolean | undefined;
        form?: string | undefined;
        keytype?: string | undefined;
        name?: string | undefined;
    }
    interface LabelHTMLAttributes extends HTMLAttributes {
        form?: string | undefined;
        for?: string | undefined;
    }
    interface LiHTMLAttributes extends HTMLAttributes {
        value?: string | ReadonlyArray<string> | number | undefined;
    }
    interface LinkHTMLAttributes extends HTMLAttributes {
        as?: string | undefined;
        crossorigin?: CrossOrigin;
        href?: string | undefined;
        hreflang?: string | undefined;
        integrity?: string | undefined;
        media?: string | undefined;
        imagesrcset?: string | undefined;
        imagesizes?: string | undefined;
        referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
        sizes?: string | undefined;
        type?: StringLiteralUnion<BaseMime> | undefined;
        charSet?: string | undefined;
        rel?: string | undefined;
        precedence?: string | undefined;
        title?: string | undefined;
        disabled?: boolean | undefined;
        onError?: ((event: Event) => void) | undefined;
        onLoad?: ((event: Event) => void) | undefined;
        blocking?: 'render' | undefined;
    }
    interface MapHTMLAttributes extends HTMLAttributes {
        name?: string | undefined;
    }
    interface MenuHTMLAttributes extends HTMLAttributes {
        type?: string | undefined;
    }
    interface MediaHTMLAttributes extends HTMLAttributes {
        autoplay?: boolean | undefined;
        controls?: boolean | undefined;
        controlslist?: string | undefined;
        crossorigin?: CrossOrigin;
        loop?: boolean | undefined;
        mediagroup?: string | undefined;
        muted?: boolean | undefined;
        playsinline?: boolean | undefined;
        preload?: string | undefined;
        src?: string | undefined;
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#http-equiv
     */
    type MetaHttpEquiv = 'content-security-policy' | 'content-type' | 'default-style' | 'x-ua-compatible' | 'refresh';
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta/name
     */
    type MetaName = 'application-name' | 'author' | 'description' | 'generator' | 'keywords' | 'referrer' | 'theme-color' | 'color-scheme' | 'viewport' | 'creator' | 'googlebot' | 'publisher' | 'robots';
    /**
     * @see https://ogp.me/
     */
    type MetaProperty = 'og:title' | 'og:type' | 'og:image' | 'og:url' | 'og:audio' | 'og:description' | 'og:determiner' | 'og:locale' | 'og:locale:alternate' | 'og:site_name' | 'og:video' | 'og:image:url' | 'og:image:secure_url' | 'og:image:type' | 'og:image:width' | 'og:image:height' | 'og:image:alt';
    interface MetaHTMLAttributes extends HTMLAttributes {
        charset?: StringLiteralUnion<'utf-8'> | undefined;
        'http-equiv'?: StringLiteralUnion<MetaHttpEquiv> | undefined;
        name?: StringLiteralUnion<MetaName> | undefined;
        media?: string | undefined;
        content?: string | undefined;
        property?: StringLiteralUnion<MetaProperty> | undefined;
        httpEquiv?: StringLiteralUnion<MetaHttpEquiv> | undefined;
    }
    interface MeterHTMLAttributes extends HTMLAttributes {
        form?: string | undefined;
        high?: number | undefined;
        low?: number | undefined;
        max?: number | string | undefined;
        min?: number | string | undefined;
        optimum?: number | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
    }
    interface QuoteHTMLAttributes extends HTMLAttributes {
        cite?: string | undefined;
    }
    interface ObjectHTMLAttributes extends HTMLAttributes {
        data?: string | undefined;
        form?: string | undefined;
        height?: number | string | undefined;
        name?: string | undefined;
        type?: StringLiteralUnion<BaseMime> | undefined;
        usemap?: string | undefined;
        width?: number | string | undefined;
    }
    interface OlHTMLAttributes extends HTMLAttributes {
        reversed?: boolean | undefined;
        start?: number | undefined;
        type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined;
    }
    interface OptgroupHTMLAttributes extends HTMLAttributes {
        disabled?: boolean | undefined;
        label?: string | undefined;
    }
    interface OptionHTMLAttributes extends HTMLAttributes {
        disabled?: boolean | undefined;
        label?: string | undefined;
        selected?: boolean | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
    }
    interface OutputHTMLAttributes extends HTMLAttributes {
        form?: string | undefined;
        for?: string | undefined;
        name?: string | undefined;
    }
    interface ParamHTMLAttributes extends HTMLAttributes {
        name?: string | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
    }
    interface ProgressHTMLAttributes extends HTMLAttributes {
        max?: number | string | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
    }
    interface SlotHTMLAttributes extends HTMLAttributes {
        name?: string | undefined;
    }
    interface ScriptHTMLAttributes extends HTMLAttributes {
        async?: boolean | undefined;
        crossorigin?: CrossOrigin;
        defer?: boolean | undefined;
        integrity?: string | undefined;
        nomodule?: boolean | undefined;
        referrerpolicy?: HTMLAttributeReferrerPolicy | undefined;
        src?: string | undefined;
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type
         */
        type?: StringLiteralUnion<'' | 'text/javascript' | 'importmap' | 'module'> | undefined;
        crossOrigin?: CrossOrigin;
        fetchPriority?: string | undefined;
        noModule?: boolean | undefined;
        referrer?: HTMLAttributeReferrerPolicy | undefined;
        onError?: ((event: Event) => void) | undefined;
        onLoad?: ((event: Event) => void) | undefined;
        blocking?: 'render' | undefined;
    }
    interface SelectHTMLAttributes extends HTMLAttributes {
        autocomplete?: string | undefined;
        disabled?: boolean | undefined;
        form?: string | undefined;
        multiple?: boolean | undefined;
        name?: string | undefined;
        required?: boolean | undefined;
        size?: number | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
    }
    type MediaMime = BaseMime & (`image/${string}` | `audio/${string}` | `video/${string}`);
    interface SourceHTMLAttributes extends HTMLAttributes {
        height?: number | string | undefined;
        media?: string | undefined;
        sizes?: string | undefined;
        src?: string | undefined;
        srcset?: string | undefined;
        type?: StringLiteralUnion<MediaMime> | undefined;
        width?: number | string | undefined;
    }
    interface StyleHTMLAttributes extends HTMLAttributes {
        media?: string | undefined;
        scoped?: boolean | undefined;
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style#type
         */
        type?: '' | 'text/css' | undefined;
        href?: string | undefined;
        precedence?: string | undefined;
        title?: string | undefined;
        disabled?: boolean | undefined;
        blocking?: 'render' | undefined;
    }
    interface TableHTMLAttributes extends HTMLAttributes {
        align?: 'left' | 'center' | 'right' | undefined;
        bgcolor?: string | undefined;
        border?: number | undefined;
        cellpadding?: number | string | undefined;
        cellspacing?: number | string | undefined;
        frame?: boolean | undefined;
        rules?: 'none' | 'groups' | 'rows' | 'columns' | 'all' | undefined;
        summary?: string | undefined;
        width?: number | string | undefined;
    }
    interface TextareaHTMLAttributes extends HTMLAttributes {
        autocomplete?: string | undefined;
        cols?: number | undefined;
        dirname?: string | undefined;
        disabled?: boolean | undefined;
        form?: string | undefined;
        maxlength?: number | undefined;
        minlength?: number | undefined;
        name?: string | undefined;
        placeholder?: string | undefined;
        readonly?: boolean | undefined;
        required?: boolean | undefined;
        rows?: number | undefined;
        value?: string | ReadonlyArray<string> | number | undefined;
        wrap?: string | undefined;
    }
    interface TdHTMLAttributes extends HTMLAttributes {
        align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
        colspan?: number | undefined;
        headers?: string | undefined;
        rowspan?: number | undefined;
        scope?: string | undefined;
        abbr?: string | undefined;
        height?: number | string | undefined;
        width?: number | string | undefined;
        valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined;
    }
    interface ThHTMLAttributes extends HTMLAttributes {
        align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
        colspan?: number | undefined;
        headers?: string | undefined;
        rowspan?: number | undefined;
        scope?: 'row' | 'col' | 'rowgroup' | 'colgroup' | string | undefined;
        abbr?: string | undefined;
    }
    interface TimeHTMLAttributes extends HTMLAttributes {
        datetime?: string | undefined;
    }
    interface TrackHTMLAttributes extends HTMLAttributes {
        default?: boolean | undefined;
        kind?: string | undefined;
        label?: string | undefined;
        src?: string | undefined;
        srclang?: string | undefined;
    }
    interface VideoHTMLAttributes extends MediaHTMLAttributes {
        height?: number | string | undefined;
        playsinline?: boolean | undefined;
        poster?: string | undefined;
        width?: number | string | undefined;
        disablePictureInPicture?: boolean | undefined;
        disableRemotePlayback?: boolean | undefined;
    }
    export interface IntrinsicElements {
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
        big: HTMLAttributes;
        blockquote: BlockquoteHTMLAttributes;
        body: HTMLAttributes;
        br: HTMLAttributes;
        button: ButtonHTMLAttributes;
        canvas: CanvasHTMLAttributes;
        caption: HTMLAttributes;
        center: HTMLAttributes;
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
        menuitem: HTMLAttributes;
        meta: MetaHTMLAttributes;
        meter: MeterHTMLAttributes;
        nav: HTMLAttributes;
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
        search: HTMLAttributes;
        slot: SlotHTMLAttributes;
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
    }
    export {};
}
export interface IntrinsicElements extends JSX.IntrinsicElements {
}
