export declare const ElCarousel: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
    readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly height: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly trigger: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "click" | "hover", unknown, "hover", boolean>;
    readonly autoplay: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly interval: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 3000, boolean>;
    readonly indicatorPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "none" | "outside", unknown, "", boolean>;
    readonly arrow: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "always" | "never" | "hover", unknown, "hover", boolean>;
    readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "card", unknown, "", boolean>;
    readonly loop: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly direction: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "horizontal" | "vertical", unknown, "horizontal", boolean>;
    readonly pauseOnHover: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
}, {
    COMPONENT_NAME: string;
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        readonly height: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly trigger: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "click" | "hover", unknown, "hover", boolean>;
        readonly autoplay: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly interval: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 3000, boolean>;
        readonly indicatorPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "none" | "outside", unknown, "", boolean>;
        readonly arrow: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "always" | "never" | "hover", unknown, "hover", boolean>;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "card", unknown, "", boolean>;
        readonly loop: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly direction: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "horizontal" | "vertical", unknown, "horizontal", boolean>;
        readonly pauseOnHover: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    }>> & {
        onChange?: ((current: number, prev: number) => any) | undefined;
    }>>;
    emit: (event: "change", current: number, prev: number) => void;
    root: import("vue").Ref<HTMLDivElement | undefined>;
    activeIndex: import("vue").Ref<number>;
    arrowDisplay: import("vue").ComputedRef<boolean>;
    hasLabel: import("vue").ComputedRef<boolean>;
    hover: import("vue").Ref<boolean>;
    isCardType: import("vue").ComputedRef<boolean>;
    items: import("vue").ShallowRef<import("./src/constants").CarouselItemContext[]>;
    isVertical: import("vue").ComputedRef<boolean>;
    containerStyle: import("vue").ComputedRef<{
        height: string;
        overflow?: undefined;
    } | {
        height: string;
        overflow: string;
    }>;
    handleButtonEnter: (arrow: "right" | "left") => void;
    handleButtonLeave: () => void;
    handleIndicatorClick: (index: number) => void;
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
    setActiveItem: (index: string | number) => void;
    prev: () => void;
    next: () => void;
    PlaceholderItem: () => ({
        [name: string]: unknown;
        $stable?: boolean | undefined;
    } | import("element-plus/es/utils").VNodeChildAtom)[] | null;
    isTwoLengthShow: (index: number) => boolean;
    throttledArrowClick: import("lodash").DebouncedFunc<(index: number) => void>;
    throttledIndicatorHover: import("lodash").DebouncedFunc<(index: number) => void>;
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
    carouselClasses: import("vue").ComputedRef<string[]>;
    indicatorsClasses: import("vue").ComputedRef<string[]>;
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
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    change: (current: number, prev: number) => boolean;
}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly initialIndex: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly height: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly trigger: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "click" | "hover", unknown, "hover", boolean>;
    readonly autoplay: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly interval: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 3000, boolean>;
    readonly indicatorPosition: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "none" | "outside", unknown, "", boolean>;
    readonly arrow: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "always" | "never" | "hover", unknown, "hover", boolean>;
    readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "card", unknown, "", boolean>;
    readonly loop: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly direction: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "horizontal" | "vertical", unknown, "horizontal", boolean>;
    readonly pauseOnHover: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
}>> & {
    onChange?: ((current: number, prev: number) => any) | undefined;
}, {
    readonly interval: number;
    readonly type: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "card", unknown>;
    readonly height: string;
    readonly direction: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>;
    readonly trigger: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "click" | "hover", unknown>;
    readonly arrow: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "always" | "never" | "hover", unknown>;
    readonly loop: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly initialIndex: number;
    readonly autoplay: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly indicatorPosition: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "none" | "outside", unknown>;
    readonly pauseOnHover: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
}>> & {
    CarouselItem: import("vue").DefineComponent<{
        readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly label: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
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
        COMPONENT_NAME: string;
        carouselItemRef: import("vue").Ref<HTMLElement | undefined>;
        active: import("vue").Ref<boolean>;
        animating: import("vue").Ref<boolean>;
        hover: import("vue").Ref<boolean>;
        inStage: import("vue").Ref<boolean>;
        isVertical: import("vue").Ref<boolean>;
        translate: import("vue").Ref<number>;
        isCardType: import("vue").Ref<boolean>;
        scale: import("vue").Ref<number>;
        ready: import("vue").Ref<boolean>;
        handleItemClick: () => void;
        itemStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
    }>>, {
        readonly label: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
        readonly name: string;
    }>;
};
export default ElCarousel;
export declare const ElCarouselItem: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
    readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly label: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
}, {
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
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
    COMPONENT_NAME: string;
    carouselItemRef: import("vue").Ref<HTMLElement | undefined>;
    active: import("vue").Ref<boolean>;
    animating: import("vue").Ref<boolean>;
    hover: import("vue").Ref<boolean>;
    inStage: import("vue").Ref<boolean>;
    isVertical: import("vue").Ref<boolean>;
    translate: import("vue").Ref<number>;
    isCardType: import("vue").Ref<boolean>;
    scale: import("vue").Ref<number>;
    ready: import("vue").Ref<boolean>;
    handleItemClick: () => void;
    itemStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    readonly name: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly label: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, "", boolean>;
}>>, {
    readonly label: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
    readonly name: string;
}>>;
export * from './src/carousel';
export * from './src/carousel-item';
export * from './src/constants';
export type { CarouselInstance, CarouselItemInstance } from './src/instance';
