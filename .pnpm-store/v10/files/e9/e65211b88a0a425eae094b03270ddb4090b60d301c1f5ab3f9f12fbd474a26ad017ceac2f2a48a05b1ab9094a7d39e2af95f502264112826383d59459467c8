declare const _default: import("vue").DefineComponent<{
    readonly initialIndex: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly height: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly trigger: import("../../../utils").EpPropFinalized<StringConstructor, "click" | "hover", unknown, "hover", boolean>;
    readonly autoplay: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly interval: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 3000, boolean>;
    readonly indicatorPosition: import("../../../utils").EpPropFinalized<StringConstructor, "" | "none" | "outside", unknown, "", boolean>;
    readonly arrow: import("../../../utils").EpPropFinalized<StringConstructor, "always" | "never" | "hover", unknown, "hover", boolean>;
    readonly type: import("../../../utils").EpPropFinalized<StringConstructor, "" | "card", unknown, "", boolean>;
    readonly loop: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly direction: import("../../../utils").EpPropFinalized<StringConstructor, "horizontal" | "vertical", unknown, "horizontal", boolean>;
    readonly pauseOnHover: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
}, {
    COMPONENT_NAME: string;
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        readonly initialIndex: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        readonly height: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly trigger: import("../../../utils").EpPropFinalized<StringConstructor, "click" | "hover", unknown, "hover", boolean>;
        readonly autoplay: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly interval: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 3000, boolean>;
        readonly indicatorPosition: import("../../../utils").EpPropFinalized<StringConstructor, "" | "none" | "outside", unknown, "", boolean>;
        readonly arrow: import("../../../utils").EpPropFinalized<StringConstructor, "always" | "never" | "hover", unknown, "hover", boolean>;
        readonly type: import("../../../utils").EpPropFinalized<StringConstructor, "" | "card", unknown, "", boolean>;
        readonly loop: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly direction: import("../../../utils").EpPropFinalized<StringConstructor, "horizontal" | "vertical", unknown, "horizontal", boolean>;
        readonly pauseOnHover: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
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
    items: import("vue").ShallowRef<import("./constants").CarouselItemContext[]>;
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
    } | import("../../../utils").VNodeChildAtom)[] | null;
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
    ElIcon: import("../../../utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly size: {
            readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
                readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
            readonly type: import("vue").PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | number) & {}) | (() => string | number) | ((new (...args: any[]) => (string | number) & {}) | (() => string | number))[], unknown, unknown>>;
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
    readonly initialIndex: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly height: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
    readonly trigger: import("../../../utils").EpPropFinalized<StringConstructor, "click" | "hover", unknown, "hover", boolean>;
    readonly autoplay: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly interval: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 3000, boolean>;
    readonly indicatorPosition: import("../../../utils").EpPropFinalized<StringConstructor, "" | "none" | "outside", unknown, "", boolean>;
    readonly arrow: import("../../../utils").EpPropFinalized<StringConstructor, "always" | "never" | "hover", unknown, "hover", boolean>;
    readonly type: import("../../../utils").EpPropFinalized<StringConstructor, "" | "card", unknown, "", boolean>;
    readonly loop: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly direction: import("../../../utils").EpPropFinalized<StringConstructor, "horizontal" | "vertical", unknown, "horizontal", boolean>;
    readonly pauseOnHover: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
}>> & {
    onChange?: ((current: number, prev: number) => any) | undefined;
}, {
    readonly interval: number;
    readonly type: import("../../../utils").EpPropMergeType<StringConstructor, "" | "card", unknown>;
    readonly height: string;
    readonly direction: import("../../../utils").EpPropMergeType<StringConstructor, "horizontal" | "vertical", unknown>;
    readonly trigger: import("../../../utils").EpPropMergeType<StringConstructor, "click" | "hover", unknown>;
    readonly arrow: import("../../../utils").EpPropMergeType<StringConstructor, "always" | "never" | "hover", unknown>;
    readonly loop: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly initialIndex: number;
    readonly autoplay: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    readonly indicatorPosition: import("../../../utils").EpPropMergeType<StringConstructor, "" | "none" | "outside", unknown>;
    readonly pauseOnHover: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
}>;
export default _default;
