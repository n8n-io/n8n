import type { CSSProperties } from 'vue';
import type { ImageViewerAction, ImageViewerMode } from './image-viewer';
declare const _default: import("vue").DefineComponent<{
    readonly urlList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => [], boolean>;
    readonly zIndex: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly infinite: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly hideOnClickModal: BooleanConstructor;
    readonly teleported: BooleanConstructor;
    readonly closeOnPressEscape: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly zoomRate: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1.2, boolean>;
    readonly minScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0.2, boolean>;
    readonly maxScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 7, boolean>;
}, {
    modes: Record<"CONTAIN" | "ORIGINAL", ImageViewerMode>;
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly urlList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => [], boolean>;
        readonly zIndex: {
            readonly type: import("vue").PropType<number>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        readonly infinite: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly hideOnClickModal: BooleanConstructor;
        readonly teleported: BooleanConstructor;
        readonly closeOnPressEscape: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly zoomRate: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1.2, boolean>;
        readonly minScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0.2, boolean>;
        readonly maxScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 7, boolean>;
    }>> & {
        onClose?: (() => any) | undefined;
        onSwitch?: ((index: number) => any) | undefined;
        onRotate?: ((deg: number) => any) | undefined;
    }>>;
    emit: ((event: "close") => void) & ((event: "rotate", deg: number) => void) & ((event: "switch", index: number) => void);
    t: import("element-plus/es/hooks").Translator;
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
    nextZIndex: () => number;
    wrapper: import("vue").Ref<HTMLDivElement | undefined>;
    imgRefs: import("vue").Ref<HTMLImageElement[]>;
    scopeEventListener: import("vue").EffectScope;
    loading: import("vue").Ref<boolean>;
    activeIndex: import("vue").Ref<number>;
    mode: import("vue").ShallowRef<ImageViewerMode>;
    transform: import("vue").Ref<{
        scale: number;
        deg: number;
        offsetX: number;
        offsetY: number;
        enableTransition: boolean;
    }>;
    isSingle: import("vue").ComputedRef<boolean>;
    isFirst: import("vue").ComputedRef<boolean>;
    isLast: import("vue").ComputedRef<boolean>;
    currentImg: import("vue").ComputedRef<string>;
    arrowPrevKls: import("vue").ComputedRef<string[]>;
    arrowNextKls: import("vue").ComputedRef<string[]>;
    imgStyle: import("vue").ComputedRef<CSSProperties>;
    computedZIndex: import("vue").ComputedRef<number>;
    hide: () => void;
    registerEventListener: () => void;
    unregisterEventListener: () => void;
    handleImgLoad: () => void;
    handleImgError: (e: Event) => void;
    handleMouseDown: (e: MouseEvent) => void;
    reset: () => void;
    toggleMode: () => void;
    setActiveItem: (index: number) => void;
    prev: () => void;
    next: () => void;
    handleActions: (action: ImageViewerAction, options?: {}) => void;
    ElIcon: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly color: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly color: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
        }>>;
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
        style: import("vue").ComputedRef<CSSProperties>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly color: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
    }>>, {}>> & Record<string, any>;
    ArrowLeft: any;
    ArrowRight: any;
    Close: any;
    RefreshLeft: any;
    RefreshRight: any;
    ZoomIn: any;
    ZoomOut: any;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    close: () => boolean;
    switch: (index: number) => boolean;
    rotate: (deg: number) => boolean;
}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly urlList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => [], boolean>;
    readonly zIndex: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly infinite: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly hideOnClickModal: BooleanConstructor;
    readonly teleported: BooleanConstructor;
    readonly closeOnPressEscape: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly zoomRate: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1.2, boolean>;
    readonly minScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0.2, boolean>;
    readonly maxScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 7, boolean>;
}>> & {
    onClose?: (() => any) | undefined;
    onSwitch?: ((index: number) => any) | undefined;
    onRotate?: ((deg: number) => any) | undefined;
}, {
    readonly teleported: boolean;
    readonly infinite: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly initialIndex: number;
    readonly closeOnPressEscape: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly zoomRate: number;
    readonly minScale: number;
    readonly maxScale: number;
    readonly hideOnClickModal: boolean;
    readonly urlList: string[];
}>;
export default _default;
