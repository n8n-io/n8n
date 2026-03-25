import { nextTick } from 'vue';
import type { CSSProperties, StyleValue } from 'vue';
declare const _default: import("vue").DefineComponent<{
    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, "", boolean>;
    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
    readonly noresize: BooleanConstructor;
    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
    readonly always: BooleanConstructor;
    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
    readonly id: StringConstructor;
    readonly role: StringConstructor;
    readonly ariaLabel: StringConstructor;
    readonly ariaOrientation: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}, {
    COMPONENT_NAME: string;
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
        readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
        readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, "", boolean>;
        readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
        readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
        readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
        readonly noresize: BooleanConstructor;
        readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
        readonly always: BooleanConstructor;
        readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
        readonly id: StringConstructor;
        readonly role: StringConstructor;
        readonly ariaLabel: StringConstructor;
        readonly ariaOrientation: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>> & {
        onScroll?: ((args_0: {
            scrollTop: number;
            scrollLeft: number;
        }) => any) | undefined;
    }>>;
    emit: (event: "scroll", args_0: {
        scrollTop: number;
        scrollLeft: number;
    }) => void;
    ns: {
        namespace: import("vue").ComputedRef<string>;
        b: (blockSuffix?: string) => string;
        e: (element?: string | undefined) => string;
        m: (modifier?: string | undefined) => string;
        be: (blockSuffix?: string | undefined, element?: string | undefined) => string;
        em: (element?: string | undefined, modifier?: string | undefined) => string;
        bm: (blockSuffix?: string | undefined, modifier?: string | undefined) => string;
        bem: (blockSuffix?: string | undefined, element?: string | undefined, modifier?: string | undefined) => string;
        is: {
            (name: string, state: boolean | undefined): string;
            (name: string): string;
        };
        cssVar: (object: Record<string, string>) => Record<string, string>;
        cssVarName: (name: string) => string;
        cssVarBlock: (object: Record<string, string>) => Record<string, string>;
        cssVarBlockName: (name: string) => string;
    };
    stopResizeObserver: undefined;
    stopResizeListener: undefined;
    scrollbarRef: import("vue").Ref<HTMLDivElement | undefined>;
    wrapRef: import("vue").Ref<HTMLDivElement | undefined>;
    resizeRef: import("vue").Ref<HTMLElement | undefined>;
    sizeWidth: import("vue").Ref<string>;
    sizeHeight: import("vue").Ref<string>;
    barRef: import("vue").Ref<({
        $: import("vue").ComponentInternalInstance;
        $data: {};
        $props: Partial<{
            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly ratioX: number;
            readonly ratioY: number;
        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly width: StringConstructor;
            readonly height: StringConstructor;
            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
        }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "always" | "ratioX" | "ratioY">;
        $attrs: {
            [x: string]: unknown;
        };
        $refs: {
            [x: string]: unknown;
        };
        $slots: Readonly<{
            [name: string]: import("vue").Slot | undefined;
        }>;
        $root: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
        $parent: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null;
        $emit: (event: string, ...args: any[]) => void;
        $el: any;
        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly width: StringConstructor;
            readonly height: StringConstructor;
            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
        }>>, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly width: StringConstructor;
                readonly height: StringConstructor;
                readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
                readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            moveX: import("vue").Ref<number>;
            moveY: import("vue").Ref<number>;
            handleScroll: (wrap: HTMLDivElement) => void;
            Thumb: import("vue").DefineComponent<{
                readonly vertical: BooleanConstructor;
                readonly size: StringConstructor;
                readonly move: NumberConstructor;
                readonly ratio: {
                    readonly type: import("vue").PropType<number>;
                    readonly required: true;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly always: BooleanConstructor;
            }, {
                COMPONENT_NAME: string;
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly vertical: BooleanConstructor;
                    readonly size: StringConstructor;
                    readonly move: NumberConstructor;
                    readonly ratio: {
                        readonly type: import("vue").PropType<number>;
                        readonly required: true;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly always: BooleanConstructor;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                scrollbar: import("./constants").ScrollbarContext;
                ns: {
                    namespace: import("vue").ComputedRef<string>;
                    b: (blockSuffix?: string) => string;
                    e: (element?: string | undefined) => string;
                    m: (modifier?: string | undefined) => string;
                    be: (blockSuffix?: string | undefined, element?: string | undefined) => string;
                    em: (element?: string | undefined, modifier?: string | undefined) => string;
                    bm: (blockSuffix?: string | undefined, modifier?: string | undefined) => string;
                    bem: (blockSuffix?: string | undefined, element?: string | undefined, modifier?: string | undefined) => string;
                    is: {
                        (name: string, state: boolean | undefined): string;
                        (name: string): string;
                    };
                    cssVar: (object: Record<string, string>) => Record<string, string>;
                    cssVarName: (name: string) => string;
                    cssVarBlock: (object: Record<string, string>) => Record<string, string>;
                    cssVarBlockName: (name: string) => string;
                };
                instance: import("vue").Ref<HTMLDivElement | undefined>;
                thumb: import("vue").Ref<HTMLDivElement | undefined>;
                thumbState: import("vue").Ref<{
                    X?: number | undefined;
                    Y?: number | undefined;
                }>;
                visible: import("vue").Ref<boolean>;
                cursorDown: boolean;
                cursorLeave: boolean;
                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                bar: import("vue").ComputedRef<{
                    readonly offset: "offsetHeight";
                    readonly scroll: "scrollTop";
                    readonly scrollSize: "scrollHeight";
                    readonly size: "height";
                    readonly key: "vertical";
                    readonly axis: "Y";
                    readonly client: "clientY";
                    readonly direction: "top";
                } | {
                    readonly offset: "offsetWidth";
                    readonly scroll: "scrollLeft";
                    readonly scrollSize: "scrollWidth";
                    readonly size: "width";
                    readonly key: "horizontal";
                    readonly axis: "X";
                    readonly client: "clientX";
                    readonly direction: "left";
                }>;
                thumbStyle: import("vue").ComputedRef<CSSProperties>;
                offsetRatio: import("vue").ComputedRef<number>;
                clickThumbHandler: (e: MouseEvent) => void;
                clickTrackHandler: (e: MouseEvent) => void;
                startDrag: (e: MouseEvent) => void;
                mouseMoveDocumentHandler: (e: MouseEvent) => void;
                mouseUpDocumentHandler: () => void;
                mouseMoveScrollbarHandler: () => void;
                mouseLeaveScrollbarHandler: () => void;
                restoreOnselectstart: () => void;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly vertical: BooleanConstructor;
                readonly size: StringConstructor;
                readonly move: NumberConstructor;
                readonly ratio: {
                    readonly type: import("vue").PropType<number>;
                    readonly required: true;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly always: BooleanConstructor;
            }>>, {
                readonly vertical: boolean;
                readonly always: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
            readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly ratioX: number;
            readonly ratioY: number;
        }> & {
            beforeCreate?: ((() => void) | (() => void)[]) | undefined;
            created?: ((() => void) | (() => void)[]) | undefined;
            beforeMount?: ((() => void) | (() => void)[]) | undefined;
            mounted?: ((() => void) | (() => void)[]) | undefined;
            beforeUpdate?: ((() => void) | (() => void)[]) | undefined;
            updated?: ((() => void) | (() => void)[]) | undefined;
            activated?: ((() => void) | (() => void)[]) | undefined;
            deactivated?: ((() => void) | (() => void)[]) | undefined;
            beforeDestroy?: ((() => void) | (() => void)[]) | undefined;
            beforeUnmount?: ((() => void) | (() => void)[]) | undefined;
            destroyed?: ((() => void) | (() => void)[]) | undefined;
            unmounted?: ((() => void) | (() => void)[]) | undefined;
            renderTracked?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
            renderTriggered?: (((e: import("vue").DebuggerEvent) => void) | ((e: import("vue").DebuggerEvent) => void)[]) | undefined;
            errorCaptured?: (((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void) | ((err: unknown, instance: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>> | null, info: string) => boolean | void)[]) | undefined;
        };
        $forceUpdate: () => void;
        $nextTick: typeof nextTick;
        $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
    } & Readonly<import("vue").ExtractPropTypes<{
        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly width: StringConstructor;
        readonly height: StringConstructor;
        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
    }>> & import("vue").ShallowUnwrapRef<{
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly width: StringConstructor;
            readonly height: StringConstructor;
            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
        }>>;
        moveX: import("vue").Ref<number>;
        moveY: import("vue").Ref<number>;
        handleScroll: (wrap: HTMLDivElement) => void;
        Thumb: import("vue").DefineComponent<{
            readonly vertical: BooleanConstructor;
            readonly size: StringConstructor;
            readonly move: NumberConstructor;
            readonly ratio: {
                readonly type: import("vue").PropType<number>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly always: BooleanConstructor;
        }, {
            COMPONENT_NAME: string;
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly vertical: BooleanConstructor;
                readonly size: StringConstructor;
                readonly move: NumberConstructor;
                readonly ratio: {
                    readonly type: import("vue").PropType<number>;
                    readonly required: true;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly always: BooleanConstructor;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            scrollbar: import("./constants").ScrollbarContext;
            ns: {
                namespace: import("vue").ComputedRef<string>;
                b: (blockSuffix?: string) => string;
                e: (element?: string | undefined) => string;
                m: (modifier?: string | undefined) => string;
                be: (blockSuffix?: string | undefined, element?: string | undefined) => string;
                em: (element?: string | undefined, modifier?: string | undefined) => string;
                bm: (blockSuffix?: string | undefined, modifier?: string | undefined) => string;
                bem: (blockSuffix?: string | undefined, element?: string | undefined, modifier?: string | undefined) => string;
                is: {
                    (name: string, state: boolean | undefined): string;
                    (name: string): string;
                };
                cssVar: (object: Record<string, string>) => Record<string, string>;
                cssVarName: (name: string) => string;
                cssVarBlock: (object: Record<string, string>) => Record<string, string>;
                cssVarBlockName: (name: string) => string;
            };
            instance: import("vue").Ref<HTMLDivElement | undefined>;
            thumb: import("vue").Ref<HTMLDivElement | undefined>;
            thumbState: import("vue").Ref<{
                X?: number | undefined;
                Y?: number | undefined;
            }>;
            visible: import("vue").Ref<boolean>;
            cursorDown: boolean;
            cursorLeave: boolean;
            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            bar: import("vue").ComputedRef<{
                readonly offset: "offsetHeight";
                readonly scroll: "scrollTop";
                readonly scrollSize: "scrollHeight";
                readonly size: "height";
                readonly key: "vertical";
                readonly axis: "Y";
                readonly client: "clientY";
                readonly direction: "top";
            } | {
                readonly offset: "offsetWidth";
                readonly scroll: "scrollLeft";
                readonly scrollSize: "scrollWidth";
                readonly size: "width";
                readonly key: "horizontal";
                readonly axis: "X";
                readonly client: "clientX";
                readonly direction: "left";
            }>;
            thumbStyle: import("vue").ComputedRef<CSSProperties>;
            offsetRatio: import("vue").ComputedRef<number>;
            clickThumbHandler: (e: MouseEvent) => void;
            clickTrackHandler: (e: MouseEvent) => void;
            startDrag: (e: MouseEvent) => void;
            mouseMoveDocumentHandler: (e: MouseEvent) => void;
            mouseUpDocumentHandler: () => void;
            mouseMoveScrollbarHandler: () => void;
            mouseLeaveScrollbarHandler: () => void;
            restoreOnselectstart: () => void;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly vertical: BooleanConstructor;
            readonly size: StringConstructor;
            readonly move: NumberConstructor;
            readonly ratio: {
                readonly type: import("vue").PropType<number>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly always: BooleanConstructor;
        }>>, {
            readonly vertical: boolean;
            readonly always: boolean;
        }>;
    }> & {} & import("vue").ComponentCustomProperties) | undefined>;
    ratioY: import("vue").Ref<number>;
    ratioX: import("vue").Ref<number>;
    wrapStyle: import("vue").ComputedRef<StyleValue>;
    wrapKls: import("vue").ComputedRef<(string | unknown[] | {
        [x: string]: boolean;
    })[]>;
    resizeKls: import("vue").ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
    handleScroll: () => void;
    scrollTo: (arg1: unknown, arg2?: number | undefined) => void;
    setScrollTop: (value: number) => void;
    setScrollLeft: (value: number) => void;
    update: () => void;
    Bar: import("vue").DefineComponent<{
        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly width: StringConstructor;
        readonly height: StringConstructor;
        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly width: StringConstructor;
            readonly height: StringConstructor;
            readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
            readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
        }>>;
        moveX: import("vue").Ref<number>;
        moveY: import("vue").Ref<number>;
        handleScroll: (wrap: HTMLDivElement) => void;
        Thumb: import("vue").DefineComponent<{
            readonly vertical: BooleanConstructor;
            readonly size: StringConstructor;
            readonly move: NumberConstructor;
            readonly ratio: {
                readonly type: import("vue").PropType<number>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly always: BooleanConstructor;
        }, {
            COMPONENT_NAME: string;
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly vertical: BooleanConstructor;
                readonly size: StringConstructor;
                readonly move: NumberConstructor;
                readonly ratio: {
                    readonly type: import("vue").PropType<number>;
                    readonly required: true;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly always: BooleanConstructor;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            scrollbar: import("./constants").ScrollbarContext;
            ns: {
                namespace: import("vue").ComputedRef<string>;
                b: (blockSuffix?: string) => string;
                e: (element?: string | undefined) => string;
                m: (modifier?: string | undefined) => string;
                be: (blockSuffix?: string | undefined, element?: string | undefined) => string;
                em: (element?: string | undefined, modifier?: string | undefined) => string;
                bm: (blockSuffix?: string | undefined, modifier?: string | undefined) => string;
                bem: (blockSuffix?: string | undefined, element?: string | undefined, modifier?: string | undefined) => string;
                is: {
                    (name: string, state: boolean | undefined): string;
                    (name: string): string;
                };
                cssVar: (object: Record<string, string>) => Record<string, string>;
                cssVarName: (name: string) => string;
                cssVarBlock: (object: Record<string, string>) => Record<string, string>;
                cssVarBlockName: (name: string) => string;
            };
            instance: import("vue").Ref<HTMLDivElement | undefined>;
            thumb: import("vue").Ref<HTMLDivElement | undefined>;
            thumbState: import("vue").Ref<{
                X?: number | undefined;
                Y?: number | undefined;
            }>;
            visible: import("vue").Ref<boolean>;
            cursorDown: boolean;
            cursorLeave: boolean;
            originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            bar: import("vue").ComputedRef<{
                readonly offset: "offsetHeight";
                readonly scroll: "scrollTop";
                readonly scrollSize: "scrollHeight";
                readonly size: "height";
                readonly key: "vertical";
                readonly axis: "Y";
                readonly client: "clientY";
                readonly direction: "top";
            } | {
                readonly offset: "offsetWidth";
                readonly scroll: "scrollLeft";
                readonly scrollSize: "scrollWidth";
                readonly size: "width";
                readonly key: "horizontal";
                readonly axis: "X";
                readonly client: "clientX";
                readonly direction: "left";
            }>;
            thumbStyle: import("vue").ComputedRef<CSSProperties>;
            offsetRatio: import("vue").ComputedRef<number>;
            clickThumbHandler: (e: MouseEvent) => void;
            clickTrackHandler: (e: MouseEvent) => void;
            startDrag: (e: MouseEvent) => void;
            mouseMoveDocumentHandler: (e: MouseEvent) => void;
            mouseUpDocumentHandler: () => void;
            mouseMoveScrollbarHandler: () => void;
            mouseLeaveScrollbarHandler: () => void;
            restoreOnselectstart: () => void;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly vertical: BooleanConstructor;
            readonly size: StringConstructor;
            readonly move: NumberConstructor;
            readonly ratio: {
                readonly type: import("vue").PropType<number>;
                readonly required: true;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly always: BooleanConstructor;
        }>>, {
            readonly vertical: boolean;
            readonly always: boolean;
        }>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly always: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly width: StringConstructor;
        readonly height: StringConstructor;
        readonly ratioX: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
        readonly ratioY: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
    }>>, {
        readonly always: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly ratioX: number;
        readonly ratioY: number;
    }>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    scroll: ({ scrollTop, scrollLeft, }: {
        scrollTop: number;
        scrollLeft: number;
    }) => boolean;
}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly height: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly maxHeight: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    readonly native: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    readonly wrapStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, "", boolean>;
    readonly wrapClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
    readonly viewClass: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor], unknown, unknown, "", boolean>;
    readonly viewStyle: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown, "", boolean>;
    readonly noresize: BooleanConstructor;
    readonly tag: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "div", boolean>;
    readonly always: BooleanConstructor;
    readonly minSize: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 20, boolean>;
    readonly id: StringConstructor;
    readonly role: StringConstructor;
    readonly ariaLabel: StringConstructor;
    readonly ariaOrientation: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
}>> & {
    onScroll?: ((args_0: {
        scrollTop: number;
        scrollLeft: number;
    }) => any) | undefined;
}, {
    readonly height: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
    readonly always: boolean;
    readonly maxHeight: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
    readonly native: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly wrapStyle: StyleValue;
    readonly wrapClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
    readonly viewClass: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>;
    readonly viewStyle: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor, ObjectConstructor], unknown, unknown>;
    readonly tag: string;
    readonly minSize: number;
    readonly noresize: boolean;
}>;
export default _default;
