export declare const ElImage: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
    readonly hideOnClickModal: BooleanConstructor;
    readonly src: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly fit: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "fill" | "none" | "contain" | "cover" | "scale-down", unknown, "", boolean>;
    readonly loading: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "lazy" | "eager", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly lazy: BooleanConstructor;
    readonly scrollContainer: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement | undefined) & {}) | (() => string | HTMLElement | undefined) | ((new (...args: any[]) => (string | HTMLElement | undefined) & {}) | (() => string | HTMLElement | undefined))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly previewSrcList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => [], boolean>;
    readonly previewTeleported: BooleanConstructor;
    readonly zIndex: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly infinite: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly closeOnPressEscape: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly zoomRate: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1.2, boolean>;
    readonly minScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0.2, boolean>;
    readonly maxScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 7, boolean>;
}, {
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly hideOnClickModal: BooleanConstructor;
        readonly src: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly fit: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "fill" | "none" | "contain" | "cover" | "scale-down", unknown, "", boolean>;
        readonly loading: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "lazy" | "eager", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly lazy: BooleanConstructor;
        readonly scrollContainer: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement | undefined) & {}) | (() => string | HTMLElement | undefined) | ((new (...args: any[]) => (string | HTMLElement | undefined) & {}) | (() => string | HTMLElement | undefined))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly previewSrcList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => [], boolean>;
        readonly previewTeleported: BooleanConstructor;
        readonly zIndex: {
            readonly type: import("vue").PropType<number>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        readonly infinite: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly closeOnPressEscape: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly zoomRate: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1.2, boolean>;
        readonly minScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0.2, boolean>;
        readonly maxScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 7, boolean>;
    }>> & {
        onClose?: (() => any) | undefined;
        onShow?: (() => any) | undefined;
        onError?: ((evt: Event) => any) | undefined;
        onLoad?: ((evt: Event) => any) | undefined;
        onSwitch?: ((val: number) => any) | undefined;
    }>>;
    emit: ((event: "close") => void) & ((event: "error", evt: Event) => void) & ((event: "load", evt: Event) => void) & ((event: "show") => void) & ((event: "switch", val: number) => void);
    prevOverflow: string;
    t: import("../..").Translator;
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
    rawAttrs: {
        [x: string]: unknown;
    };
    attrs: import("vue").ComputedRef<Record<string, unknown>>;
    imageSrc: import("vue").Ref<string | undefined>;
    hasLoadError: import("vue").Ref<boolean>;
    isLoading: import("vue").Ref<boolean>;
    showViewer: import("vue").Ref<boolean>;
    container: import("vue").Ref<HTMLElement | undefined>;
    _scrollContainer: import("vue").Ref<Window | HTMLElement | undefined>;
    supportLoading: boolean;
    stopScrollListener: (() => void) | undefined;
    stopWheelListener: (() => void) | undefined;
    imageKls: import("vue").ComputedRef<(string | false)[]>;
    containerStyle: import("vue").ComputedRef<import("vue").StyleValue>;
    imageStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
    preview: import("vue").ComputedRef<boolean>;
    imageIndex: import("vue").ComputedRef<number>;
    isManual: import("vue").ComputedRef<boolean>;
    loadImage: () => void;
    handleLoad: (event: Event) => void;
    handleError: (event: Event) => void;
    handleLazyLoad: () => void;
    lazyLoadHandler: () => void;
    addLazyLoadListener: () => Promise<void>;
    removeLazyLoadListener: () => void;
    wheelHandler: (e: WheelEvent) => false | undefined;
    clickHandler: () => void;
    closeViewer: () => void;
    switchViewer: (val: number) => void;
    ImageViewer: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
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
        modes: Record<"CONTAIN" | "ORIGINAL", import("..").ImageViewerMode>;
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
        t: import("../..").Translator;
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
        mode: import("vue").ShallowRef<import("..").ImageViewerMode>;
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
        imgStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
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
        handleActions: (action: import("..").ImageViewerAction, options?: {}) => void;
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
            style: import("vue").ComputedRef<import("vue").CSSProperties>;
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
    }>> & Record<string, any>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    load: (evt: Event) => boolean;
    error: (evt: Event) => boolean;
    switch: (val: number) => boolean;
    close: () => boolean;
    show: () => boolean;
}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly hideOnClickModal: BooleanConstructor;
    readonly src: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly fit: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "fill" | "none" | "contain" | "cover" | "scale-down", unknown, "", boolean>;
    readonly loading: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "lazy" | "eager", unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly lazy: BooleanConstructor;
    readonly scrollContainer: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement | undefined) & {}) | (() => string | HTMLElement | undefined) | ((new (...args: any[]) => (string | HTMLElement | undefined) & {}) | (() => string | HTMLElement | undefined))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly previewSrcList: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => [], boolean>;
    readonly previewTeleported: BooleanConstructor;
    readonly zIndex: {
        readonly type: import("vue").PropType<number>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly infinite: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly closeOnPressEscape: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly zoomRate: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1.2, boolean>;
    readonly minScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0.2, boolean>;
    readonly maxScale: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 7, boolean>;
}>> & {
    onClose?: (() => any) | undefined;
    onShow?: (() => any) | undefined;
    onError?: ((evt: Event) => any) | undefined;
    onLoad?: ((evt: Event) => any) | undefined;
    onSwitch?: ((val: number) => any) | undefined;
}, {
    readonly infinite: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly src: string;
    readonly fit: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "fill" | "none" | "contain" | "cover" | "scale-down", unknown>;
    readonly initialIndex: number;
    readonly lazy: boolean;
    readonly closeOnPressEscape: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly previewSrcList: string[];
    readonly zoomRate: number;
    readonly minScale: number;
    readonly maxScale: number;
    readonly hideOnClickModal: boolean;
    readonly previewTeleported: boolean;
}>> & Record<string, any>;
export default ElImage;
export * from './src/image';
