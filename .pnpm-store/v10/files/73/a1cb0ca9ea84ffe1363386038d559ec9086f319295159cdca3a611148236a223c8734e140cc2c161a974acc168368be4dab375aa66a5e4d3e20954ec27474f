import { nextTick } from 'vue';
import type { Options } from 'element-plus/es/components/popper';
import type { ComputedRef, Ref, StyleValue } from 'vue';
import type { CascaderNode, CascaderValue, Tag } from 'element-plus/es/components/cascader-panel';
declare const _default: import("vue").DefineComponent<{
    size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    placeholder: StringConstructor;
    disabled: BooleanConstructor;
    clearable: BooleanConstructor;
    filterable: BooleanConstructor;
    filterMethod: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (node: CascaderNode, keyword: string) => boolean) | (() => (node: CascaderNode, keyword: string) => boolean) | {
        (): (node: CascaderNode, keyword: string) => boolean;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (node: CascaderNode, keyword: string) => boolean) | (() => (node: CascaderNode, keyword: string) => boolean) | {
        (): (node: CascaderNode, keyword: string) => boolean;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, (node: CascaderNode, keyword: string) => boolean, boolean>;
    separator: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, string, boolean>;
    showAllLevels: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
    collapseTags: BooleanConstructor;
    maxCollapseTags: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
    collapseTagsTooltip: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
    debounce: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
    beforeFilter: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (value: string) => boolean | Promise<any>) | (() => (value: string) => boolean | Promise<any>) | {
        (): (value: string) => boolean | Promise<any>;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (value: string) => boolean | Promise<any>) | (() => (value: string) => boolean | Promise<any>) | {
        (): (value: string) => boolean | Promise<any>;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => true, boolean>;
    popperClass: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, string, boolean>;
    teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    tagType: {
        default: string;
        type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown>>;
        required: false;
        validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
    modelValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
    props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
}, {
    popperOptions: Partial<Options>;
    COMPONENT_NAME: string;
    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
        size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        placeholder: StringConstructor;
        disabled: BooleanConstructor;
        clearable: BooleanConstructor;
        filterable: BooleanConstructor;
        filterMethod: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (node: CascaderNode, keyword: string) => boolean) | (() => (node: CascaderNode, keyword: string) => boolean) | {
            (): (node: CascaderNode, keyword: string) => boolean;
            new (): any;
            readonly prototype: any;
        } | ((new (...args: any[]) => (node: CascaderNode, keyword: string) => boolean) | (() => (node: CascaderNode, keyword: string) => boolean) | {
            (): (node: CascaderNode, keyword: string) => boolean;
            new (): any;
            readonly prototype: any;
        })[], unknown, unknown, (node: CascaderNode, keyword: string) => boolean, boolean>;
        separator: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, string, boolean>;
        showAllLevels: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
        collapseTags: BooleanConstructor;
        maxCollapseTags: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
        collapseTagsTooltip: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
        debounce: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
        beforeFilter: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (value: string) => boolean | Promise<any>) | (() => (value: string) => boolean | Promise<any>) | {
            (): (value: string) => boolean | Promise<any>;
            new (): any;
            readonly prototype: any;
        } | ((new (...args: any[]) => (value: string) => boolean | Promise<any>) | (() => (value: string) => boolean | Promise<any>) | {
            (): (value: string) => boolean | Promise<any>;
            new (): any;
            readonly prototype: any;
        })[], unknown, unknown, () => true, boolean>;
        popperClass: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, string, boolean>;
        teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        tagType: {
            default: string;
            type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown>>;
            required: false;
            validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
        modelValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
        props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
    }>> & {
        onChange?: ((val: CascaderValue) => any) | undefined;
        "onUpdate:modelValue"?: ((val: CascaderValue) => any) | undefined;
        onBlur?: ((evt: FocusEvent) => any) | undefined;
        onFocus?: ((evt: FocusEvent) => any) | undefined;
        onVisibleChange?: ((val: boolean) => any) | undefined;
        onExpandChange?: ((val: CascaderValue) => any) | undefined;
        onRemoveTag?: ((val: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodePathValue) => any) | undefined;
    }>>;
    emit: ((event: "update:modelValue", val: CascaderValue) => void) & ((event: "change", val: CascaderValue) => void) & ((event: "blur", evt: FocusEvent) => void) & ((event: "focus", evt: FocusEvent) => void) & ((event: "visibleChange", val: boolean) => void) & ((event: "expandChange", val: CascaderValue) => void) & ((event: "removeTag", val: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodePathValue) => void);
    attrs: {
        [x: string]: unknown;
    };
    inputInitialHeight: number;
    pressDeleteCount: number;
    nsCascader: {
        namespace: ComputedRef<string>;
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
    nsInput: {
        namespace: ComputedRef<string>;
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
    t: import("element-plus/es/hooks").Translator;
    form: import("element-plus/es/components/form").FormContext | undefined;
    formItem: import("element-plus/es/components/form").FormItemContext | undefined;
    tooltipRef: Ref<({
        $: import("vue").ComponentInternalInstance;
        $data: {};
        $props: Partial<{
            offset: number;
            effect: string;
            placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
            showAfter: number;
            hideAfter: number;
            autoClose: number;
            boundariesPadding: number;
            fallbackPlacements: import("element-plus/es/components/popper").Placement[];
            gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            popperOptions: Partial<Options>;
            strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
            enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            visible: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
            pure: boolean;
            virtualTriggering: boolean;
            content: string;
            rawContent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            teleported: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            persistent: boolean;
            disabled: boolean;
            open: boolean;
            role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            trigger: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
            triggerKeys: string[];
            arrowOffset: number;
            showArrow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
            showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
            arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            disabled: BooleanConstructor;
            trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            virtualTriggering: BooleanConstructor;
            onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            id: StringConstructor;
            open: BooleanConstructor;
            appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            persistent: BooleanConstructor;
            ariaLabel: StringConstructor;
            visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            transition: StringConstructor;
            teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            pure: BooleanConstructor;
            focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            zIndex: NumberConstructor;
            boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            "onUpdate:visible": {
                readonly type: import("vue").PropType<(val: boolean) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
        } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "offset" | "effect" | "placement" | "showAfter" | "hideAfter" | "autoClose" | "boundariesPadding" | "fallbackPlacements" | "gpuAcceleration" | "popperOptions" | "strategy" | "enterable" | "focusOnShow" | "trapping" | "stopPopperMouseEvent" | "visible" | "pure" | "virtualTriggering" | "content" | "rawContent" | "teleported" | "persistent" | "disabled" | "open" | "role" | "trigger" | "triggerKeys" | "arrowOffset" | "showArrow">;
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
            showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
            arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            disabled: BooleanConstructor;
            trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            virtualTriggering: BooleanConstructor;
            onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            id: StringConstructor;
            open: BooleanConstructor;
            appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            persistent: BooleanConstructor;
            ariaLabel: StringConstructor;
            visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            transition: StringConstructor;
            teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            pure: BooleanConstructor;
            focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            zIndex: NumberConstructor;
            boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            "onUpdate:visible": {
                readonly type: import("vue").PropType<(val: boolean) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
                arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
                disabled: BooleanConstructor;
                trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                virtualTriggering: BooleanConstructor;
                onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                id: StringConstructor;
                open: BooleanConstructor;
                appendTo: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                persistent: BooleanConstructor;
                ariaLabel: StringConstructor;
                visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                transition: StringConstructor;
                teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                pure: BooleanConstructor;
                focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                zIndex: NumberConstructor;
                boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                "onUpdate:visible": {
                    readonly type: import("vue").PropType<(val: boolean) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
            }>>;
            emit: (event: string, ...args: any[]) => void;
            id: Ref<string>;
            popperRef: Ref<({
                $: import("vue").ComponentInternalInstance;
                $data: {};
                $props: Partial<{
                    readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
                }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "role">;
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
                    readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>>, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    triggerRef: Ref<HTMLElement | undefined>;
                    popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
                    contentRef: Ref<HTMLElement | undefined>;
                    referenceRef: Ref<HTMLElement | undefined>;
                    role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                    popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                    readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
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
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & import("vue").ShallowUnwrapRef<{
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                triggerRef: Ref<HTMLElement | undefined>;
                popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
                contentRef: Ref<HTMLElement | undefined>;
                referenceRef: Ref<HTMLElement | undefined>;
                role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
            }> & {} & import("vue").ComponentCustomProperties) | undefined>;
            contentRef: Ref<any>;
            updatePopper: () => void;
            open: Ref<boolean>;
            toggleReason: Ref<Event | undefined>;
            show: (event?: Event | undefined) => void;
            hide: (event?: Event | undefined) => void;
            hasUpdateHandler: ComputedRef<boolean>;
            onOpen: (event?: Event | undefined) => void;
            onClose: (event?: Event | undefined) => void;
            controlled: ComputedRef<boolean>;
            isFocusInsideContent: (event?: FocusEvent | undefined) => boolean | undefined;
            ElPopper: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                triggerRef: Ref<HTMLElement | undefined>;
                popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
                contentRef: Ref<HTMLElement | undefined>;
                referenceRef: Ref<HTMLElement | undefined>;
                role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>>, {
                readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            }>> & Record<string, any>;
            ElPopperArrow: import("vue").DefineComponent<{
                readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                ns: {
                    namespace: ComputedRef<string>;
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
                arrowOffset: Ref<number | undefined>;
                arrowRef: Ref<HTMLElement | undefined>;
                arrowStyle: ComputedRef<import("vue").CSSProperties>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            }>>, {
                readonly arrowOffset: number;
            }>;
            ElTooltipTrigger: import("vue").DefineComponent<{
                readonly disabled: BooleanConstructor;
                readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly disabled: BooleanConstructor;
                    readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                    readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                    readonly virtualRef: {
                        readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly id: StringConstructor;
                    readonly open: BooleanConstructor;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                ns: {
                    namespace: ComputedRef<string>;
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
                controlled: Ref<boolean>;
                id: Ref<string>;
                open: Ref<boolean>;
                onOpen: (e?: Event | undefined) => void;
                onClose: (e?: Event | undefined) => void;
                onToggle: (e: Event) => void;
                triggerRef: Ref<{
                    forwardRef: HTMLElement;
                } | null>;
                stopWhenControlledOrDisabled: () => true | undefined;
                trigger: Ref<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>>;
                onMouseenter: (event: Event) => void;
                onMouseleave: (event: Event) => void;
                onClick: (event: Event) => void;
                onFocus: (event: Event) => void;
                onBlur: (event: Event) => void;
                onContextMenu: (event: Event) => void;
                onKeydown: (event: KeyboardEvent) => void;
                ElPopperTrigger: import("vue").DefineComponent<{
                    readonly virtualRef: {
                        readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly id: StringConstructor;
                    readonly open: BooleanConstructor;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly virtualRef: {
                            readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly virtualTriggering: BooleanConstructor;
                        readonly onMouseenter: {
                            readonly type: import("vue").PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onMouseleave: {
                            readonly type: import("vue").PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onClick: {
                            readonly type: import("vue").PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onKeydown: {
                            readonly type: import("vue").PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onFocus: {
                            readonly type: import("vue").PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onBlur: {
                            readonly type: import("vue").PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onContextmenu: {
                            readonly type: import("vue").PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly id: StringConstructor;
                        readonly open: BooleanConstructor;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    role: ComputedRef<string>;
                    triggerRef: Ref<import("element-plus/es/components/popper").Measurable | undefined>;
                    ariaControls: ComputedRef<string | undefined>;
                    ariaDescribedby: ComputedRef<string | undefined>;
                    ariaHaspopup: ComputedRef<string | undefined>;
                    ariaExpanded: ComputedRef<string | undefined>;
                    virtualTriggerAriaStopWatch: undefined;
                    ElOnlyChild: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                        [key: string]: any;
                    }> | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, import("vue").EmitsOptions, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly virtualRef: {
                        readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly id: StringConstructor;
                    readonly open: BooleanConstructor;
                }>>, {
                    readonly virtualTriggering: boolean;
                    readonly open: boolean;
                }>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly disabled: BooleanConstructor;
                readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }>>, {
                readonly virtualTriggering: boolean;
                readonly disabled: boolean;
                readonly open: boolean;
                readonly trigger: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
                readonly triggerKeys: string[];
            }>;
            ElTooltipContent: import("vue").DefineComponent<{
                readonly appendTo: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly persistent: BooleanConstructor;
                readonly ariaLabel: StringConstructor;
                readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                readonly transition: StringConstructor;
                readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly disabled: BooleanConstructor;
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly appendTo: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                    readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly persistent: BooleanConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                    readonly transition: StringConstructor;
                    readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly disabled: BooleanConstructor;
                    readonly id: StringConstructor;
                    readonly style: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly popperStyle: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                    readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                    readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                selector: ComputedRef<string>;
                ns: {
                    namespace: ComputedRef<string>;
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
                contentRef: any;
                destroyed: Ref<boolean>;
                controlled: Ref<boolean>;
                id: Ref<string>;
                open: Ref<boolean>;
                trigger: Ref<import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>>;
                onClose: (e?: Event | undefined) => void;
                onOpen: (e?: Event | undefined) => void;
                onShow: () => void;
                onHide: () => void;
                onBeforeShow: () => void;
                onBeforeHide: () => void;
                transitionClass: ComputedRef<string>;
                persistentRef: ComputedRef<boolean>;
                shouldRender: ComputedRef<boolean>;
                shouldShow: ComputedRef<boolean>;
                appendTo: ComputedRef<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                contentStyle: ComputedRef<any>;
                ariaHidden: ComputedRef<boolean>;
                onTransitionLeave: () => void;
                stopWhenControlled: () => true | undefined;
                onContentEnter: (event: unknown) => void;
                onContentLeave: (event: unknown) => void;
                onBeforeEnter: () => void;
                onBeforeLeave: () => void;
                onAfterShow: () => void;
                onBlur: () => void;
                stopHandle: (() => void) | undefined;
                ElPopperContent: import("vue").DefineComponent<{
                    readonly id: StringConstructor;
                    readonly style: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly visible: BooleanConstructor;
                    readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly popperStyle: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                }, {
                    emit: ((event: "blur") => void) & ((event: "close") => void) & ((event: "focus") => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void);
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly id: StringConstructor;
                        readonly style: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly className: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                        readonly visible: BooleanConstructor;
                        readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly pure: BooleanConstructor;
                        readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly popperClass: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly popperStyle: {
                            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly referenceEl: {
                            readonly type: import("vue").PropType<HTMLElement>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly triggerTargetEl: {
                            readonly type: import("vue").PropType<HTMLElement>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                        readonly virtualTriggering: BooleanConstructor;
                        readonly zIndex: NumberConstructor;
                        readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                        readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                        readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                        readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                        readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                        readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                    }>> & {
                        onClose?: (() => any) | undefined;
                        onBlur?: (() => any) | undefined;
                        onFocus?: (() => any) | undefined;
                        onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                        onMouseleave?: ((evt: MouseEvent) => any) | undefined;
                    }>>;
                    focusStartRef: Ref<HTMLElement | "first" | "container" | undefined>;
                    trapped: Ref<boolean>;
                    onFocusAfterReleased: (event: CustomEvent<any>) => void;
                    onFocusAfterTrapped: () => void;
                    onFocusInTrap: (event: FocusEvent) => void;
                    onFocusoutPrevented: (event: CustomEvent<any>) => void;
                    onReleaseRequested: () => void;
                    attributes: ComputedRef<{
                        [key: string]: {
                            [key: string]: string | boolean;
                        };
                    }>;
                    arrowRef: Ref<HTMLElement | undefined>;
                    contentRef: Ref<HTMLElement | undefined>;
                    styles: ComputedRef<{
                        [key: string]: Partial<CSSStyleDeclaration>;
                    }>;
                    instanceRef: ComputedRef<import("@popperjs/core").Instance | undefined>;
                    role: ComputedRef<string>;
                    update: () => Promise<Partial<import("@popperjs/core").State>> | undefined;
                    ariaModal: ComputedRef<string | undefined>;
                    arrowStyle: ComputedRef<import("vue").CSSProperties>;
                    contentAttrs: ComputedRef<{
                        [key: string]: string | boolean;
                    }>;
                    contentClass: ComputedRef<((string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | undefined)[]>;
                    contentStyle: ComputedRef<StyleValue[]>;
                    updateZIndex: () => void;
                    formItemContext: import("element-plus/es/components/form").FormItemContext | undefined;
                    arrowOffset: Ref<number | undefined>;
                    triggerTargetAriaStopWatch: undefined;
                    updatePopper: (shouldUpdateZIndex?: boolean) => void;
                    togglePopperAlive: () => void;
                    ElFocusTrap: import("vue").DefineComponent<{
                        loop: BooleanConstructor;
                        trapped: BooleanConstructor;
                        focusTrapEl: import("vue").PropType<HTMLElement>;
                        focusStartEl: {
                            type: import("vue").PropType<HTMLElement | "first" | "container">;
                            default: string;
                        };
                    }, {
                        onKeydown: (e: KeyboardEvent) => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested")[], "focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        loop: BooleanConstructor;
                        trapped: BooleanConstructor;
                        focusTrapEl: import("vue").PropType<HTMLElement>;
                        focusStartEl: {
                            type: import("vue").PropType<HTMLElement | "first" | "container">;
                            default: string;
                        };
                    }>> & {
                        onFocusAfterReleased?: ((...args: any[]) => any) | undefined;
                        onFocusAfterTrapped?: ((...args: any[]) => any) | undefined;
                        onFocusin?: ((...args: any[]) => any) | undefined;
                        onFocusout?: ((...args: any[]) => any) | undefined;
                        "onFocusout-prevented"?: ((...args: any[]) => any) | undefined;
                        "onRelease-requested"?: ((...args: any[]) => any) | undefined;
                    }, {
                        trapped: boolean;
                        loop: boolean;
                        focusStartEl: HTMLElement | "first" | "container";
                    }>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                    mouseenter: (evt: MouseEvent) => boolean;
                    mouseleave: (evt: MouseEvent) => boolean;
                    focus: () => boolean;
                    blur: () => boolean;
                    close: () => boolean;
                }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly id: StringConstructor;
                    readonly style: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly visible: BooleanConstructor;
                    readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly popperStyle: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                }>> & {
                    onClose?: (() => any) | undefined;
                    onBlur?: (() => any) | undefined;
                    onFocus?: (() => any) | undefined;
                    onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                    onMouseleave?: ((evt: MouseEvent) => any) | undefined;
                }, {
                    readonly offset: number;
                    readonly effect: string;
                    readonly placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
                    readonly boundariesPadding: number;
                    readonly fallbackPlacements: import("element-plus/es/components/popper").Placement[];
                    readonly gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly popperOptions: Partial<Options>;
                    readonly strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
                    readonly enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ariaLabel: string;
                    readonly visible: boolean;
                    readonly pure: boolean;
                    readonly virtualTriggering: boolean;
                }>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly appendTo: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly persistent: BooleanConstructor;
                readonly ariaLabel: StringConstructor;
                readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                readonly transition: StringConstructor;
                readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly disabled: BooleanConstructor;
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            }>>, {
                readonly offset: number;
                readonly effect: string;
                readonly placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
                readonly showAfter: number;
                readonly hideAfter: number;
                readonly autoClose: number;
                readonly boundariesPadding: number;
                readonly fallbackPlacements: import("element-plus/es/components/popper").Placement[];
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly popperOptions: Partial<Options>;
                readonly strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
                readonly enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly visible: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
                readonly pure: boolean;
                readonly virtualTriggering: boolean;
                readonly content: string;
                readonly rawContent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly teleported: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly persistent: boolean;
                readonly disabled: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, string[], string, {
            offset: number;
            effect: string;
            placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
            showAfter: number;
            hideAfter: number;
            autoClose: number;
            boundariesPadding: number;
            fallbackPlacements: import("element-plus/es/components/popper").Placement[];
            gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            popperOptions: Partial<Options>;
            strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
            enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            visible: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
            pure: boolean;
            virtualTriggering: boolean;
            content: string;
            rawContent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            teleported: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            persistent: boolean;
            disabled: boolean;
            open: boolean;
            role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            trigger: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
            triggerKeys: string[];
            arrowOffset: number;
            showArrow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
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
        showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
        arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        disabled: BooleanConstructor;
        trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
        triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
        virtualRef: {
            readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        virtualTriggering: BooleanConstructor;
        onMouseenter: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onMouseleave: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onClick: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onKeydown: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onFocus: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onBlur: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onContextmenu: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        id: StringConstructor;
        open: BooleanConstructor;
        appendTo: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        persistent: BooleanConstructor;
        ariaLabel: StringConstructor;
        visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
        transition: StringConstructor;
        teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        style: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        className: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
        enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        pure: BooleanConstructor;
        focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        popperClass: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        popperStyle: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        referenceEl: {
            readonly type: import("vue").PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        triggerTargetEl: {
            readonly type: import("vue").PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        zIndex: NumberConstructor;
        boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
        gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
        placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
        popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
        strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
        showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
        autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        "onUpdate:visible": {
            readonly type: import("vue").PropType<(val: boolean) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
    }>> & {
        [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
    } & import("vue").ShallowUnwrapRef<{
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
            arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            disabled: BooleanConstructor;
            trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            virtualTriggering: BooleanConstructor;
            onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            id: StringConstructor;
            open: BooleanConstructor;
            appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            persistent: BooleanConstructor;
            ariaLabel: StringConstructor;
            visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            transition: StringConstructor;
            teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            pure: BooleanConstructor;
            focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            zIndex: NumberConstructor;
            boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            "onUpdate:visible": {
                readonly type: import("vue").PropType<(val: boolean) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
        }>>;
        emit: (event: string, ...args: any[]) => void;
        id: Ref<string>;
        popperRef: Ref<({
            $: import("vue").ComponentInternalInstance;
            $data: {};
            $props: Partial<{
                readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "role">;
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
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>>, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                triggerRef: Ref<HTMLElement | undefined>;
                popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
                contentRef: Ref<HTMLElement | undefined>;
                referenceRef: Ref<HTMLElement | undefined>;
                role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
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
            readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & import("vue").ShallowUnwrapRef<{
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            triggerRef: Ref<HTMLElement | undefined>;
            popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
            contentRef: Ref<HTMLElement | undefined>;
            referenceRef: Ref<HTMLElement | undefined>;
            role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
            popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
        }> & {} & import("vue").ComponentCustomProperties) | undefined>;
        contentRef: Ref<any>;
        updatePopper: () => void;
        open: Ref<boolean>;
        toggleReason: Ref<Event | undefined>;
        show: (event?: Event | undefined) => void;
        hide: (event?: Event | undefined) => void;
        hasUpdateHandler: ComputedRef<boolean>;
        onOpen: (event?: Event | undefined) => void;
        onClose: (event?: Event | undefined) => void;
        controlled: ComputedRef<boolean>;
        isFocusInsideContent: (event?: FocusEvent | undefined) => boolean | undefined;
        ElPopper: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
            readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            triggerRef: Ref<HTMLElement | undefined>;
            popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
            contentRef: Ref<HTMLElement | undefined>;
            referenceRef: Ref<HTMLElement | undefined>;
            role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
            popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>>, {
            readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
        }>> & Record<string, any>;
        ElPopperArrow: import("vue").DefineComponent<{
            readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            ns: {
                namespace: ComputedRef<string>;
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
            arrowOffset: Ref<number | undefined>;
            arrowRef: Ref<HTMLElement | undefined>;
            arrowStyle: ComputedRef<import("vue").CSSProperties>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        }>>, {
            readonly arrowOffset: number;
        }>;
        ElTooltipTrigger: import("vue").DefineComponent<{
            readonly disabled: BooleanConstructor;
            readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            readonly virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly virtualTriggering: BooleanConstructor;
            readonly onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly id: StringConstructor;
            readonly open: BooleanConstructor;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly disabled: BooleanConstructor;
                readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            ns: {
                namespace: ComputedRef<string>;
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
            controlled: Ref<boolean>;
            id: Ref<string>;
            open: Ref<boolean>;
            onOpen: (e?: Event | undefined) => void;
            onClose: (e?: Event | undefined) => void;
            onToggle: (e: Event) => void;
            triggerRef: Ref<{
                forwardRef: HTMLElement;
            } | null>;
            stopWhenControlledOrDisabled: () => true | undefined;
            trigger: Ref<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>>;
            onMouseenter: (event: Event) => void;
            onMouseleave: (event: Event) => void;
            onClick: (event: Event) => void;
            onFocus: (event: Event) => void;
            onBlur: (event: Event) => void;
            onContextMenu: (event: Event) => void;
            onKeydown: (event: KeyboardEvent) => void;
            ElPopperTrigger: import("vue").DefineComponent<{
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly virtualRef: {
                        readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly id: StringConstructor;
                    readonly open: BooleanConstructor;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                role: ComputedRef<string>;
                triggerRef: Ref<import("element-plus/es/components/popper").Measurable | undefined>;
                ariaControls: ComputedRef<string | undefined>;
                ariaDescribedby: ComputedRef<string | undefined>;
                ariaHaspopup: ComputedRef<string | undefined>;
                ariaExpanded: ComputedRef<string | undefined>;
                virtualTriggerAriaStopWatch: undefined;
                ElOnlyChild: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }> | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, import("vue").EmitsOptions, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }>>, {
                readonly virtualTriggering: boolean;
                readonly open: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly disabled: BooleanConstructor;
            readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            readonly virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly virtualTriggering: BooleanConstructor;
            readonly onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly id: StringConstructor;
            readonly open: BooleanConstructor;
        }>>, {
            readonly virtualTriggering: boolean;
            readonly disabled: boolean;
            readonly open: boolean;
            readonly trigger: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
            readonly triggerKeys: string[];
        }>;
        ElTooltipContent: import("vue").DefineComponent<{
            readonly appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly persistent: BooleanConstructor;
            readonly ariaLabel: StringConstructor;
            readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            readonly transition: StringConstructor;
            readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly disabled: BooleanConstructor;
            readonly id: StringConstructor;
            readonly style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly pure: BooleanConstructor;
            readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly virtualTriggering: BooleanConstructor;
            readonly zIndex: NumberConstructor;
            readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly appendTo: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly persistent: BooleanConstructor;
                readonly ariaLabel: StringConstructor;
                readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                readonly transition: StringConstructor;
                readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly disabled: BooleanConstructor;
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            selector: ComputedRef<string>;
            ns: {
                namespace: ComputedRef<string>;
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
            contentRef: any;
            destroyed: Ref<boolean>;
            controlled: Ref<boolean>;
            id: Ref<string>;
            open: Ref<boolean>;
            trigger: Ref<import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>>;
            onClose: (e?: Event | undefined) => void;
            onOpen: (e?: Event | undefined) => void;
            onShow: () => void;
            onHide: () => void;
            onBeforeShow: () => void;
            onBeforeHide: () => void;
            transitionClass: ComputedRef<string>;
            persistentRef: ComputedRef<boolean>;
            shouldRender: ComputedRef<boolean>;
            shouldShow: ComputedRef<boolean>;
            appendTo: ComputedRef<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
            contentStyle: ComputedRef<any>;
            ariaHidden: ComputedRef<boolean>;
            onTransitionLeave: () => void;
            stopWhenControlled: () => true | undefined;
            onContentEnter: (event: unknown) => void;
            onContentLeave: (event: unknown) => void;
            onBeforeEnter: () => void;
            onBeforeLeave: () => void;
            onAfterShow: () => void;
            onBlur: () => void;
            stopHandle: (() => void) | undefined;
            ElPopperContent: import("vue").DefineComponent<{
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly visible: BooleanConstructor;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            }, {
                emit: ((event: "blur") => void) & ((event: "close") => void) & ((event: "focus") => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void);
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly id: StringConstructor;
                    readonly style: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly visible: BooleanConstructor;
                    readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly popperStyle: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                }>> & {
                    onClose?: (() => any) | undefined;
                    onBlur?: (() => any) | undefined;
                    onFocus?: (() => any) | undefined;
                    onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                    onMouseleave?: ((evt: MouseEvent) => any) | undefined;
                }>>;
                focusStartRef: Ref<HTMLElement | "first" | "container" | undefined>;
                trapped: Ref<boolean>;
                onFocusAfterReleased: (event: CustomEvent<any>) => void;
                onFocusAfterTrapped: () => void;
                onFocusInTrap: (event: FocusEvent) => void;
                onFocusoutPrevented: (event: CustomEvent<any>) => void;
                onReleaseRequested: () => void;
                attributes: ComputedRef<{
                    [key: string]: {
                        [key: string]: string | boolean;
                    };
                }>;
                arrowRef: Ref<HTMLElement | undefined>;
                contentRef: Ref<HTMLElement | undefined>;
                styles: ComputedRef<{
                    [key: string]: Partial<CSSStyleDeclaration>;
                }>;
                instanceRef: ComputedRef<import("@popperjs/core").Instance | undefined>;
                role: ComputedRef<string>;
                update: () => Promise<Partial<import("@popperjs/core").State>> | undefined;
                ariaModal: ComputedRef<string | undefined>;
                arrowStyle: ComputedRef<import("vue").CSSProperties>;
                contentAttrs: ComputedRef<{
                    [key: string]: string | boolean;
                }>;
                contentClass: ComputedRef<((string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | undefined)[]>;
                contentStyle: ComputedRef<StyleValue[]>;
                updateZIndex: () => void;
                formItemContext: import("element-plus/es/components/form").FormItemContext | undefined;
                arrowOffset: Ref<number | undefined>;
                triggerTargetAriaStopWatch: undefined;
                updatePopper: (shouldUpdateZIndex?: boolean) => void;
                togglePopperAlive: () => void;
                ElFocusTrap: import("vue").DefineComponent<{
                    loop: BooleanConstructor;
                    trapped: BooleanConstructor;
                    focusTrapEl: import("vue").PropType<HTMLElement>;
                    focusStartEl: {
                        type: import("vue").PropType<HTMLElement | "first" | "container">;
                        default: string;
                    };
                }, {
                    onKeydown: (e: KeyboardEvent) => void;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested")[], "focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    loop: BooleanConstructor;
                    trapped: BooleanConstructor;
                    focusTrapEl: import("vue").PropType<HTMLElement>;
                    focusStartEl: {
                        type: import("vue").PropType<HTMLElement | "first" | "container">;
                        default: string;
                    };
                }>> & {
                    onFocusAfterReleased?: ((...args: any[]) => any) | undefined;
                    onFocusAfterTrapped?: ((...args: any[]) => any) | undefined;
                    onFocusin?: ((...args: any[]) => any) | undefined;
                    onFocusout?: ((...args: any[]) => any) | undefined;
                    "onFocusout-prevented"?: ((...args: any[]) => any) | undefined;
                    "onRelease-requested"?: ((...args: any[]) => any) | undefined;
                }, {
                    trapped: boolean;
                    loop: boolean;
                    focusStartEl: HTMLElement | "first" | "container";
                }>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                mouseenter: (evt: MouseEvent) => boolean;
                mouseleave: (evt: MouseEvent) => boolean;
                focus: () => boolean;
                blur: () => boolean;
                close: () => boolean;
            }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly visible: BooleanConstructor;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            }>> & {
                onClose?: (() => any) | undefined;
                onBlur?: (() => any) | undefined;
                onFocus?: (() => any) | undefined;
                onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                onMouseleave?: ((evt: MouseEvent) => any) | undefined;
            }, {
                readonly offset: number;
                readonly effect: string;
                readonly placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
                readonly boundariesPadding: number;
                readonly fallbackPlacements: import("element-plus/es/components/popper").Placement[];
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly popperOptions: Partial<Options>;
                readonly strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
                readonly enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly ariaLabel: string;
                readonly visible: boolean;
                readonly pure: boolean;
                readonly virtualTriggering: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly persistent: BooleanConstructor;
            readonly ariaLabel: StringConstructor;
            readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            readonly transition: StringConstructor;
            readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly disabled: BooleanConstructor;
            readonly id: StringConstructor;
            readonly style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly pure: BooleanConstructor;
            readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly virtualTriggering: BooleanConstructor;
            readonly zIndex: NumberConstructor;
            readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        }>>, {
            readonly offset: number;
            readonly effect: string;
            readonly placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
            readonly showAfter: number;
            readonly hideAfter: number;
            readonly autoClose: number;
            readonly boundariesPadding: number;
            readonly fallbackPlacements: import("element-plus/es/components/popper").Placement[];
            readonly gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly popperOptions: Partial<Options>;
            readonly strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
            readonly enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly visible: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
            readonly pure: boolean;
            readonly virtualTriggering: boolean;
            readonly content: string;
            readonly rawContent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly teleported: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly persistent: boolean;
            readonly disabled: boolean;
        }>;
    }> & {} & import("vue").ComponentCustomProperties) | null>;
    input: Ref<({
        $: import("vue").ComponentInternalInstance;
        $data: {};
        $props: Partial<{
            readonly type: string;
            readonly modelValue: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown>;
            readonly label: string;
            readonly id: string;
            readonly disabled: boolean;
            readonly clearable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly autosize: import("element-plus/es/components/input").InputAutoSize;
            readonly autocomplete: string;
            readonly readonly: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly showPassword: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly showWordLimit: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly containerRole: string;
            readonly tabindex: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
            readonly validateEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly inputStyle: StyleValue;
            readonly autofocus: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
            readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabled: BooleanConstructor;
            readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
            readonly resize: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
            readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
            readonly formatter: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly parser: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly placeholder: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly form: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly suffixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly prefixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
            readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
            readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        }>> & {
            onChange?: ((value: string) => any) | undefined;
            "onUpdate:modelValue"?: ((value: string) => any) | undefined;
            onInput?: ((value: string) => any) | undefined;
            onBlur?: ((evt: FocusEvent) => any) | undefined;
            onFocus?: ((evt: FocusEvent) => any) | undefined;
            onClear?: (() => any) | undefined;
            onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
            onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
            onMouseenter?: ((evt: MouseEvent) => any) | undefined;
            onMouseleave?: ((evt: MouseEvent) => any) | undefined;
        } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "type" | "modelValue" | "label" | "id" | "disabled" | "clearable" | "autosize" | "autocomplete" | "readonly" | "showPassword" | "showWordLimit" | "containerRole" | "tabindex" | "validateEvent" | "inputStyle" | "autofocus">;
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
        $emit: ((event: "update:modelValue", value: string) => void) & ((event: "change", value: string) => void) & ((event: "input", value: string) => void) & ((event: "blur", evt: FocusEvent) => void) & ((event: "compositionend", evt: CompositionEvent) => void) & ((event: "compositionstart", evt: CompositionEvent) => void) & ((event: "compositionupdate", evt: CompositionEvent) => void) & ((event: "focus", evt: FocusEvent) => void) & ((event: "keydown", evt: Event | KeyboardEvent) => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void) & ((event: "clear") => void);
        $el: any;
        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
            readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabled: BooleanConstructor;
            readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
            readonly resize: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
            readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
            readonly formatter: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly parser: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly placeholder: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly form: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly suffixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly prefixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
            readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
            readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        }>> & {
            onChange?: ((value: string) => any) | undefined;
            "onUpdate:modelValue"?: ((value: string) => any) | undefined;
            onInput?: ((value: string) => any) | undefined;
            onBlur?: ((evt: FocusEvent) => any) | undefined;
            onFocus?: ((evt: FocusEvent) => any) | undefined;
            onClear?: (() => any) | undefined;
            onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
            onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
            onMouseenter?: ((evt: MouseEvent) => any) | undefined;
            onMouseleave?: ((evt: MouseEvent) => any) | undefined;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly size: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly disabled: BooleanConstructor;
                readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
                readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
                readonly resize: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
                readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
                readonly formatter: {
                    readonly type: import("vue").PropType<Function>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly parser: {
                    readonly type: import("vue").PropType<Function>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly placeholder: {
                    readonly type: import("vue").PropType<string>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly form: {
                    readonly type: import("vue").PropType<string>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly suffixIcon: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly prefixIcon: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
                readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
                readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            }>> & {
                onChange?: ((value: string) => any) | undefined;
                "onUpdate:modelValue"?: ((value: string) => any) | undefined;
                onInput?: ((value: string) => any) | undefined;
                onBlur?: ((evt: FocusEvent) => any) | undefined;
                onFocus?: ((evt: FocusEvent) => any) | undefined;
                onClear?: (() => any) | undefined;
                onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
                onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
                onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
                onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
                onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                onMouseleave?: ((evt: MouseEvent) => any) | undefined;
            }>>;
            emit: ((event: "update:modelValue", value: string) => void) & ((event: "change", value: string) => void) & ((event: "input", value: string) => void) & ((event: "blur", evt: FocusEvent) => void) & ((event: "compositionend", evt: CompositionEvent) => void) & ((event: "compositionstart", evt: CompositionEvent) => void) & ((event: "compositionupdate", evt: CompositionEvent) => void) & ((event: "focus", evt: FocusEvent) => void) & ((event: "keydown", evt: Event | KeyboardEvent) => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void) & ((event: "clear") => void);
            rawAttrs: {
                [x: string]: unknown;
            };
            slots: Readonly<{
                [name: string]: import("vue").Slot | undefined;
            }>;
            containerAttrs: ComputedRef<Record<string, unknown>>;
            containerKls: ComputedRef<unknown[]>;
            wrapperKls: ComputedRef<string[]>;
            attrs: ComputedRef<Record<string, unknown>>;
            form: import("element-plus/es/components/form").FormContext | undefined;
            formItem: import("element-plus/es/components/form").FormItemContext | undefined;
            inputId: Ref<string | undefined>;
            inputSize: ComputedRef<"" | "default" | "small" | "large">;
            inputDisabled: ComputedRef<boolean>;
            nsInput: {
                namespace: ComputedRef<string>;
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
            nsTextarea: {
                namespace: ComputedRef<string>;
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
            input: import("vue").ShallowRef<HTMLInputElement | undefined>;
            textarea: import("vue").ShallowRef<HTMLTextAreaElement | undefined>;
            hovering: Ref<boolean>;
            isComposing: Ref<boolean>;
            passwordVisible: Ref<boolean>;
            countStyle: Ref<StyleValue | undefined>;
            textareaCalcStyle: import("vue").ShallowRef<StyleValue>;
            _ref: ComputedRef<HTMLInputElement | HTMLTextAreaElement | undefined>;
            wrapperRef: import("vue").ShallowRef<HTMLElement | undefined>;
            isFocused: Ref<boolean>;
            handleFocus: (event: FocusEvent) => void;
            handleBlur: (event: FocusEvent) => void;
            needStatusIcon: ComputedRef<boolean>;
            validateState: ComputedRef<"" | "error" | "success" | "validating">;
            validateIcon: ComputedRef<any>;
            passwordIcon: ComputedRef<any>;
            containerStyle: ComputedRef<StyleValue>;
            textareaStyle: ComputedRef<StyleValue>;
            nativeInputValue: ComputedRef<string>;
            showClear: ComputedRef<boolean>;
            showPwdVisible: ComputedRef<boolean>;
            isWordLimitVisible: ComputedRef<boolean>;
            textLength: ComputedRef<number>;
            inputExceed: ComputedRef<boolean>;
            suffixVisible: ComputedRef<boolean>;
            recordCursor: () => void;
            setCursor: () => void;
            resizeTextarea: () => void;
            createOnceInitResize: (resizeTextarea: () => void) => () => void;
            onceInitSizeTextarea: () => void;
            setNativeInputValue: () => void;
            handleInput: (event: Event) => Promise<void>;
            handleChange: (event: Event) => void;
            handleCompositionStart: (event: CompositionEvent) => void;
            handleCompositionUpdate: (event: CompositionEvent) => void;
            handleCompositionEnd: (event: CompositionEvent) => void;
            handlePasswordVisible: () => void;
            focus: () => Promise<void>;
            blur: () => void | undefined;
            handleMouseLeave: (evt: MouseEvent) => void;
            handleMouseEnter: (evt: MouseEvent) => void;
            handleKeydown: (evt: KeyboardEvent) => void;
            select: () => void;
            clear: () => void;
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
                    namespace: ComputedRef<string>;
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
                style: ComputedRef<import("vue").CSSProperties>;
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
            CircleClose: any;
            NOOP: () => void;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
            "update:modelValue": (value: string) => boolean;
            input: (value: string) => boolean;
            change: (value: string) => boolean;
            focus: (evt: FocusEvent) => boolean;
            blur: (evt: FocusEvent) => boolean;
            clear: () => boolean;
            mouseleave: (evt: MouseEvent) => boolean;
            mouseenter: (evt: MouseEvent) => boolean;
            keydown: (evt: Event | KeyboardEvent) => boolean;
            compositionstart: (evt: CompositionEvent) => boolean;
            compositionupdate: (evt: CompositionEvent) => boolean;
            compositionend: (evt: CompositionEvent) => boolean;
        }, string, {
            readonly type: string;
            readonly modelValue: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown>;
            readonly label: string;
            readonly id: string;
            readonly disabled: boolean;
            readonly clearable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly autosize: import("element-plus/es/components/input").InputAutoSize;
            readonly autocomplete: string;
            readonly readonly: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly showPassword: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly showWordLimit: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly containerRole: string;
            readonly tabindex: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
            readonly validateEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly inputStyle: StyleValue;
            readonly autofocus: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
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
        readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
        readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
        readonly resize: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
        readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
        readonly formatter: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parser: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly placeholder: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly form: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly suffixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly prefixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
        readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
        readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    }>> & {
        onChange?: ((value: string) => any) | undefined;
        "onUpdate:modelValue"?: ((value: string) => any) | undefined;
        onInput?: ((value: string) => any) | undefined;
        onBlur?: ((evt: FocusEvent) => any) | undefined;
        onFocus?: ((evt: FocusEvent) => any) | undefined;
        onClear?: (() => any) | undefined;
        onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
        onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
        onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
        onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
        onMouseenter?: ((evt: MouseEvent) => any) | undefined;
        onMouseleave?: ((evt: MouseEvent) => any) | undefined;
    } & import("vue").ShallowUnwrapRef<{
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabled: BooleanConstructor;
            readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
            readonly resize: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
            readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
            readonly formatter: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly parser: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly placeholder: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly form: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly suffixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly prefixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
            readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
            readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        }>> & {
            onChange?: ((value: string) => any) | undefined;
            "onUpdate:modelValue"?: ((value: string) => any) | undefined;
            onInput?: ((value: string) => any) | undefined;
            onBlur?: ((evt: FocusEvent) => any) | undefined;
            onFocus?: ((evt: FocusEvent) => any) | undefined;
            onClear?: (() => any) | undefined;
            onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
            onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
            onMouseenter?: ((evt: MouseEvent) => any) | undefined;
            onMouseleave?: ((evt: MouseEvent) => any) | undefined;
        }>>;
        emit: ((event: "update:modelValue", value: string) => void) & ((event: "change", value: string) => void) & ((event: "input", value: string) => void) & ((event: "blur", evt: FocusEvent) => void) & ((event: "compositionend", evt: CompositionEvent) => void) & ((event: "compositionstart", evt: CompositionEvent) => void) & ((event: "compositionupdate", evt: CompositionEvent) => void) & ((event: "focus", evt: FocusEvent) => void) & ((event: "keydown", evt: Event | KeyboardEvent) => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void) & ((event: "clear") => void);
        rawAttrs: {
            [x: string]: unknown;
        };
        slots: Readonly<{
            [name: string]: import("vue").Slot | undefined;
        }>;
        containerAttrs: ComputedRef<Record<string, unknown>>;
        containerKls: ComputedRef<unknown[]>;
        wrapperKls: ComputedRef<string[]>;
        attrs: ComputedRef<Record<string, unknown>>;
        form: import("element-plus/es/components/form").FormContext | undefined;
        formItem: import("element-plus/es/components/form").FormItemContext | undefined;
        inputId: Ref<string | undefined>;
        inputSize: ComputedRef<"" | "default" | "small" | "large">;
        inputDisabled: ComputedRef<boolean>;
        nsInput: {
            namespace: ComputedRef<string>;
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
        nsTextarea: {
            namespace: ComputedRef<string>;
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
        input: import("vue").ShallowRef<HTMLInputElement | undefined>;
        textarea: import("vue").ShallowRef<HTMLTextAreaElement | undefined>;
        hovering: Ref<boolean>;
        isComposing: Ref<boolean>;
        passwordVisible: Ref<boolean>;
        countStyle: Ref<StyleValue | undefined>;
        textareaCalcStyle: import("vue").ShallowRef<StyleValue>;
        _ref: ComputedRef<HTMLInputElement | HTMLTextAreaElement | undefined>;
        wrapperRef: import("vue").ShallowRef<HTMLElement | undefined>;
        isFocused: Ref<boolean>;
        handleFocus: (event: FocusEvent) => void;
        handleBlur: (event: FocusEvent) => void;
        needStatusIcon: ComputedRef<boolean>;
        validateState: ComputedRef<"" | "error" | "success" | "validating">;
        validateIcon: ComputedRef<any>;
        passwordIcon: ComputedRef<any>;
        containerStyle: ComputedRef<StyleValue>;
        textareaStyle: ComputedRef<StyleValue>;
        nativeInputValue: ComputedRef<string>;
        showClear: ComputedRef<boolean>;
        showPwdVisible: ComputedRef<boolean>;
        isWordLimitVisible: ComputedRef<boolean>;
        textLength: ComputedRef<number>;
        inputExceed: ComputedRef<boolean>;
        suffixVisible: ComputedRef<boolean>;
        recordCursor: () => void;
        setCursor: () => void;
        resizeTextarea: () => void;
        createOnceInitResize: (resizeTextarea: () => void) => () => void;
        onceInitSizeTextarea: () => void;
        setNativeInputValue: () => void;
        handleInput: (event: Event) => Promise<void>;
        handleChange: (event: Event) => void;
        handleCompositionStart: (event: CompositionEvent) => void;
        handleCompositionUpdate: (event: CompositionEvent) => void;
        handleCompositionEnd: (event: CompositionEvent) => void;
        handlePasswordVisible: () => void;
        focus: () => Promise<void>;
        blur: () => void | undefined;
        handleMouseLeave: (evt: MouseEvent) => void;
        handleMouseEnter: (evt: MouseEvent) => void;
        handleKeydown: (evt: KeyboardEvent) => void;
        select: () => void;
        clear: () => void;
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
                namespace: ComputedRef<string>;
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
            style: ComputedRef<import("vue").CSSProperties>;
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
        CircleClose: any;
        NOOP: () => void;
    }> & {} & import("vue").ComponentCustomProperties) | null>;
    tagWrapper: Ref<null>;
    cascaderPanelRef: Ref<({
        $: import("vue").ComponentInternalInstance;
        $data: {};
        $props: Partial<{
            props: import("element-plus/es/components/cascader-panel").CascaderProps;
            border: boolean;
            options: import("element-plus/es/components/cascader-panel").CascaderOption[];
        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
            border: {
                type: BooleanConstructor;
                default: boolean;
            };
            renderLabel: import("vue").PropType<import("../../cascader-panel/src/node").RenderLabel>;
            modelValue: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
            props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
        }>> & {
            onChange?: ((...args: any[]) => any) | undefined;
            onClose?: ((...args: any[]) => any) | undefined;
            "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
            "onExpand-change"?: ((...args: any[]) => any) | undefined;
        } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "props" | "border" | "options">;
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
        $emit: (event: "update:modelValue" | "change" | "close" | "expand-change", ...args: any[]) => void;
        $el: any;
        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
            border: {
                type: BooleanConstructor;
                default: boolean;
            };
            renderLabel: import("vue").PropType<import("../../cascader-panel/src/node").RenderLabel>;
            modelValue: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
            props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
        }>> & {
            onChange?: ((...args: any[]) => any) | undefined;
            onClose?: ((...args: any[]) => any) | undefined;
            "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
            "onExpand-change"?: ((...args: any[]) => any) | undefined;
        }, {
            ns: {
                namespace: ComputedRef<string>;
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
            menuList: Ref<any[]>;
            menus: Ref<{
                readonly uid: number;
                readonly level: number;
                readonly value: import("../../cascader-panel/src/node").CascaderNodeValue;
                readonly label: string;
                readonly pathNodes: any[];
                readonly pathValues: import("../../cascader-panel/src/node").CascaderNodeValue[];
                readonly pathLabels: string[];
                childrenData: {
                    [x: string]: unknown;
                    label?: string | undefined;
                    value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                    children?: any[] | undefined;
                    disabled?: boolean | undefined;
                    leaf?: boolean | undefined;
                }[] | undefined;
                children: any[];
                text: string;
                loaded: boolean;
                checked: boolean;
                indeterminate: boolean;
                loading: boolean;
                readonly data: {
                    [x: string]: unknown;
                    label?: string | undefined;
                    value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                    children?: any[] | undefined;
                    disabled?: boolean | undefined;
                    leaf?: boolean | undefined;
                } | null;
                readonly config: {
                    expandTrigger: import("element-plus/es/components/cascader-panel").ExpandTrigger;
                    multiple: boolean;
                    checkStrictly: boolean;
                    emitPath: boolean;
                    lazy: boolean;
                    lazyLoad: import("../../cascader-panel/src/node").LazyLoad;
                    value: string;
                    label: string;
                    children: string;
                    disabled: string | import("../../cascader-panel/src/node").isDisabled;
                    leaf: string | import("../../cascader-panel/src/node").isLeaf;
                    hoverThreshold: number;
                };
                readonly parent?: any | undefined;
                readonly root: boolean;
                readonly isDisabled: boolean;
                readonly isLeaf: boolean;
                readonly valueByOption: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodeValue[];
                appendChild: (childData: import("element-plus/es/components/cascader-panel").CascaderOption) => CascaderNode;
                calcText: (allLevels: boolean, separator: string) => string;
                broadcast: (event: string, ...args: unknown[]) => void;
                emit: (event: string, ...args: unknown[]) => void;
                onParentCheck: (checked: boolean) => void;
                onChildCheck: () => void;
                setCheckState: (checked: boolean) => void;
                doCheck: (checked: boolean) => void;
            }[][]>;
            checkedNodes: Ref<{
                readonly uid: number;
                readonly level: number;
                readonly value: import("../../cascader-panel/src/node").CascaderNodeValue;
                readonly label: string;
                readonly pathNodes: any[];
                readonly pathValues: import("../../cascader-panel/src/node").CascaderNodeValue[];
                readonly pathLabels: string[];
                childrenData: {
                    [x: string]: unknown;
                    label?: string | undefined;
                    value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                    children?: any[] | undefined;
                    disabled?: boolean | undefined;
                    leaf?: boolean | undefined;
                }[] | undefined;
                children: any[];
                text: string;
                loaded: boolean;
                checked: boolean;
                indeterminate: boolean;
                loading: boolean;
                readonly data: {
                    [x: string]: unknown;
                    label?: string | undefined;
                    value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                    children?: any[] | undefined;
                    disabled?: boolean | undefined;
                    leaf?: boolean | undefined;
                } | null;
                readonly config: {
                    expandTrigger: import("element-plus/es/components/cascader-panel").ExpandTrigger;
                    multiple: boolean;
                    checkStrictly: boolean;
                    emitPath: boolean;
                    lazy: boolean;
                    lazyLoad: import("../../cascader-panel/src/node").LazyLoad;
                    value: string;
                    label: string;
                    children: string;
                    disabled: string | import("../../cascader-panel/src/node").isDisabled;
                    leaf: string | import("../../cascader-panel/src/node").isLeaf;
                    hoverThreshold: number;
                };
                readonly parent?: any | undefined;
                readonly root: boolean;
                readonly isDisabled: boolean;
                readonly isLeaf: boolean;
                readonly valueByOption: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodeValue[];
                appendChild: (childData: import("element-plus/es/components/cascader-panel").CascaderOption) => CascaderNode;
                calcText: (allLevels: boolean, separator: string) => string;
                broadcast: (event: string, ...args: unknown[]) => void;
                emit: (event: string, ...args: unknown[]) => void;
                onParentCheck: (checked: boolean) => void;
                onChildCheck: () => void;
                setCheckState: (checked: boolean) => void;
                doCheck: (checked: boolean) => void;
            }[]>;
            handleKeyDown: (e: KeyboardEvent) => void;
            handleCheckChange: (node: CascaderNode, checked: boolean, emitClose?: boolean | undefined) => void;
            getFlattedNodes: (leafOnly: boolean) => CascaderNode[] | undefined;
            getCheckedNodes: (leafOnly: boolean) => CascaderNode[] | undefined;
            clearCheckedNodes: () => void;
            calculateCheckedValue: () => void;
            scrollToExpandingNode: () => void;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "change" | "close" | "expand-change")[], string, {
            props: import("element-plus/es/components/cascader-panel").CascaderProps;
            border: boolean;
            options: import("element-plus/es/components/cascader-panel").CascaderOption[];
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
        border: {
            type: BooleanConstructor;
            default: boolean;
        };
        renderLabel: import("vue").PropType<import("../../cascader-panel/src/node").RenderLabel>;
        modelValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
        props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
    }>> & {
        onChange?: ((...args: any[]) => any) | undefined;
        onClose?: ((...args: any[]) => any) | undefined;
        "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
        "onExpand-change"?: ((...args: any[]) => any) | undefined;
    } & import("vue").ShallowUnwrapRef<{
        ns: {
            namespace: ComputedRef<string>;
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
        menuList: Ref<any[]>;
        menus: Ref<{
            readonly uid: number;
            readonly level: number;
            readonly value: import("../../cascader-panel/src/node").CascaderNodeValue;
            readonly label: string;
            readonly pathNodes: any[];
            readonly pathValues: import("../../cascader-panel/src/node").CascaderNodeValue[];
            readonly pathLabels: string[];
            childrenData: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            }[] | undefined;
            children: any[];
            text: string;
            loaded: boolean;
            checked: boolean;
            indeterminate: boolean;
            loading: boolean;
            readonly data: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            } | null;
            readonly config: {
                expandTrigger: import("element-plus/es/components/cascader-panel").ExpandTrigger;
                multiple: boolean;
                checkStrictly: boolean;
                emitPath: boolean;
                lazy: boolean;
                lazyLoad: import("../../cascader-panel/src/node").LazyLoad;
                value: string;
                label: string;
                children: string;
                disabled: string | import("../../cascader-panel/src/node").isDisabled;
                leaf: string | import("../../cascader-panel/src/node").isLeaf;
                hoverThreshold: number;
            };
            readonly parent?: any | undefined;
            readonly root: boolean;
            readonly isDisabled: boolean;
            readonly isLeaf: boolean;
            readonly valueByOption: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodeValue[];
            appendChild: (childData: import("element-plus/es/components/cascader-panel").CascaderOption) => CascaderNode;
            calcText: (allLevels: boolean, separator: string) => string;
            broadcast: (event: string, ...args: unknown[]) => void;
            emit: (event: string, ...args: unknown[]) => void;
            onParentCheck: (checked: boolean) => void;
            onChildCheck: () => void;
            setCheckState: (checked: boolean) => void;
            doCheck: (checked: boolean) => void;
        }[][]>;
        checkedNodes: Ref<{
            readonly uid: number;
            readonly level: number;
            readonly value: import("../../cascader-panel/src/node").CascaderNodeValue;
            readonly label: string;
            readonly pathNodes: any[];
            readonly pathValues: import("../../cascader-panel/src/node").CascaderNodeValue[];
            readonly pathLabels: string[];
            childrenData: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            }[] | undefined;
            children: any[];
            text: string;
            loaded: boolean;
            checked: boolean;
            indeterminate: boolean;
            loading: boolean;
            readonly data: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            } | null;
            readonly config: {
                expandTrigger: import("element-plus/es/components/cascader-panel").ExpandTrigger;
                multiple: boolean;
                checkStrictly: boolean;
                emitPath: boolean;
                lazy: boolean;
                lazyLoad: import("../../cascader-panel/src/node").LazyLoad;
                value: string;
                label: string;
                children: string;
                disabled: string | import("../../cascader-panel/src/node").isDisabled;
                leaf: string | import("../../cascader-panel/src/node").isLeaf;
                hoverThreshold: number;
            };
            readonly parent?: any | undefined;
            readonly root: boolean;
            readonly isDisabled: boolean;
            readonly isLeaf: boolean;
            readonly valueByOption: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodeValue[];
            appendChild: (childData: import("element-plus/es/components/cascader-panel").CascaderOption) => CascaderNode;
            calcText: (allLevels: boolean, separator: string) => string;
            broadcast: (event: string, ...args: unknown[]) => void;
            emit: (event: string, ...args: unknown[]) => void;
            onParentCheck: (checked: boolean) => void;
            onChildCheck: () => void;
            setCheckState: (checked: boolean) => void;
            doCheck: (checked: boolean) => void;
        }[]>;
        handleKeyDown: (e: KeyboardEvent) => void;
        handleCheckChange: (node: CascaderNode, checked: boolean, emitClose?: boolean | undefined) => void;
        getFlattedNodes: (leafOnly: boolean) => CascaderNode[] | undefined;
        getCheckedNodes: (leafOnly: boolean) => CascaderNode[] | undefined;
        clearCheckedNodes: () => void;
        calculateCheckedValue: () => void;
        scrollToExpandingNode: () => void;
    }> & {} & import("vue").ComponentCustomProperties) | null>;
    suggestionPanel: Ref<({
        $: import("vue").ComponentInternalInstance;
        $data: {};
        $props: Partial<{
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
        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
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
        } & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "height" | "always" | "maxHeight" | "native" | "wrapStyle" | "wrapClass" | "viewClass" | "viewStyle" | "tag" | "minSize" | "noresize">;
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
        $emit: (event: "scroll", args_0: {
            scrollTop: number;
            scrollLeft: number;
        }) => void;
        $el: any;
        $options: import("vue").ComponentOptionsBase<Readonly<import("vue").ExtractPropTypes<{
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
                namespace: ComputedRef<string>;
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
            scrollbarRef: Ref<HTMLDivElement | undefined>;
            wrapRef: Ref<HTMLDivElement | undefined>;
            resizeRef: Ref<HTMLElement | undefined>;
            sizeWidth: Ref<string>;
            sizeHeight: Ref<string>;
            barRef: Ref<({
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
                    moveX: Ref<number>;
                    moveY: Ref<number>;
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
                        scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                        ns: {
                            namespace: ComputedRef<string>;
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
                        instance: Ref<HTMLDivElement | undefined>;
                        thumb: Ref<HTMLDivElement | undefined>;
                        thumbState: Ref<{
                            X?: number | undefined;
                            Y?: number | undefined;
                        }>;
                        visible: Ref<boolean>;
                        cursorDown: boolean;
                        cursorLeave: boolean;
                        originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                        bar: ComputedRef<{
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
                        thumbStyle: ComputedRef<import("vue").CSSProperties>;
                        offsetRatio: ComputedRef<number>;
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
                moveX: Ref<number>;
                moveY: Ref<number>;
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
                    scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                    ns: {
                        namespace: ComputedRef<string>;
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
                    instance: Ref<HTMLDivElement | undefined>;
                    thumb: Ref<HTMLDivElement | undefined>;
                    thumbState: Ref<{
                        X?: number | undefined;
                        Y?: number | undefined;
                    }>;
                    visible: Ref<boolean>;
                    cursorDown: boolean;
                    cursorLeave: boolean;
                    originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                    bar: ComputedRef<{
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
                    thumbStyle: ComputedRef<import("vue").CSSProperties>;
                    offsetRatio: ComputedRef<number>;
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
            ratioY: Ref<number>;
            ratioX: Ref<number>;
            wrapStyle: ComputedRef<StyleValue>;
            wrapKls: ComputedRef<(string | unknown[] | {
                [x: string]: boolean;
            })[]>;
            resizeKls: ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
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
                moveX: Ref<number>;
                moveY: Ref<number>;
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
                    scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                    ns: {
                        namespace: ComputedRef<string>;
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
                    instance: Ref<HTMLDivElement | undefined>;
                    thumb: Ref<HTMLDivElement | undefined>;
                    thumbState: Ref<{
                        X?: number | undefined;
                        Y?: number | undefined;
                    }>;
                    visible: Ref<boolean>;
                    cursorDown: boolean;
                    cursorLeave: boolean;
                    originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                    bar: ComputedRef<{
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
                    thumbStyle: ComputedRef<import("vue").CSSProperties>;
                    offsetRatio: ComputedRef<number>;
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
        }, string, {
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
    } & import("vue").ShallowUnwrapRef<{
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
            namespace: ComputedRef<string>;
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
        scrollbarRef: Ref<HTMLDivElement | undefined>;
        wrapRef: Ref<HTMLDivElement | undefined>;
        resizeRef: Ref<HTMLElement | undefined>;
        sizeWidth: Ref<string>;
        sizeHeight: Ref<string>;
        barRef: Ref<({
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
                moveX: Ref<number>;
                moveY: Ref<number>;
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
                    scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                    ns: {
                        namespace: ComputedRef<string>;
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
                    instance: Ref<HTMLDivElement | undefined>;
                    thumb: Ref<HTMLDivElement | undefined>;
                    thumbState: Ref<{
                        X?: number | undefined;
                        Y?: number | undefined;
                    }>;
                    visible: Ref<boolean>;
                    cursorDown: boolean;
                    cursorLeave: boolean;
                    originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                    bar: ComputedRef<{
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
                    thumbStyle: ComputedRef<import("vue").CSSProperties>;
                    offsetRatio: ComputedRef<number>;
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
            moveX: Ref<number>;
            moveY: Ref<number>;
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
                scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                ns: {
                    namespace: ComputedRef<string>;
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
                instance: Ref<HTMLDivElement | undefined>;
                thumb: Ref<HTMLDivElement | undefined>;
                thumbState: Ref<{
                    X?: number | undefined;
                    Y?: number | undefined;
                }>;
                visible: Ref<boolean>;
                cursorDown: boolean;
                cursorLeave: boolean;
                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                bar: ComputedRef<{
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
                thumbStyle: ComputedRef<import("vue").CSSProperties>;
                offsetRatio: ComputedRef<number>;
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
        ratioY: Ref<number>;
        ratioX: Ref<number>;
        wrapStyle: ComputedRef<StyleValue>;
        wrapKls: ComputedRef<(string | unknown[] | {
            [x: string]: boolean;
        })[]>;
        resizeKls: ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
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
            moveX: Ref<number>;
            moveY: Ref<number>;
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
                scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                ns: {
                    namespace: ComputedRef<string>;
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
                instance: Ref<HTMLDivElement | undefined>;
                thumb: Ref<HTMLDivElement | undefined>;
                thumbState: Ref<{
                    X?: number | undefined;
                    Y?: number | undefined;
                }>;
                visible: Ref<boolean>;
                cursorDown: boolean;
                cursorLeave: boolean;
                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                bar: ComputedRef<{
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
                thumbStyle: ComputedRef<import("vue").CSSProperties>;
                offsetRatio: ComputedRef<number>;
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
    }> & {} & import("vue").ComponentCustomProperties) | null>;
    popperVisible: Ref<boolean>;
    inputHover: Ref<boolean>;
    filtering: Ref<boolean>;
    filterFocus: Ref<boolean>;
    inputValue: Ref<string>;
    searchInputValue: Ref<string>;
    presentTags: Ref<Tag[]>;
    allPresentTags: Ref<Tag[]>;
    suggestions: Ref<CascaderNode[]>;
    isOnComposition: Ref<boolean>;
    cascaderStyle: ComputedRef<StyleValue>;
    isDisabled: ComputedRef<boolean | undefined>;
    inputPlaceholder: ComputedRef<string>;
    currentPlaceholder: ComputedRef<string>;
    realSize: ComputedRef<"" | "default" | "small" | "large">;
    tagSize: ComputedRef<"default" | "small">;
    multiple: ComputedRef<boolean>;
    readonly: ComputedRef<boolean>;
    searchKeyword: ComputedRef<string>;
    checkedNodes: ComputedRef<CascaderNode[]>;
    clearBtnVisible: ComputedRef<boolean>;
    presentText: ComputedRef<string>;
    checkedValue: import("vue").WritableComputedRef<CascaderValue>;
    cascaderKls: ComputedRef<unknown[]>;
    cascaderIconKls: ComputedRef<string[]>;
    inputClass: ComputedRef<string>;
    contentRef: ComputedRef<HTMLElement | undefined>;
    togglePopperVisible: (visible?: boolean | undefined) => void;
    updatePopperPosition: () => void;
    hideSuggestionPanel: () => void;
    genTag: (node: CascaderNode) => Tag;
    deleteTag: (tag: Tag) => void;
    calculatePresentTags: () => void;
    calculateSuggestions: () => void;
    focusFirstNode: () => void;
    updateStyle: () => void;
    getCheckedNodes: (leafOnly: boolean) => CascaderNode[] | undefined;
    handleExpandChange: (value: CascaderValue) => void;
    handleComposition: (event: CompositionEvent) => void;
    handleKeyDown: (e: KeyboardEvent) => void;
    handleClear: () => void;
    syncPresentTextValue: () => void;
    handleSuggestionClick: (node: CascaderNode) => void;
    handleSuggestionKeyDown: (e: KeyboardEvent) => void;
    handleDelete: () => void;
    handleFocus: (e: FocusEvent) => void;
    handleBlur: (e: FocusEvent) => void;
    handleFilter: import("lodash").DebouncedFunc<() => void>;
    handleInput: (val: string, e?: KeyboardEvent | undefined) => void;
    getInputInnerHeight: (inputInner: HTMLElement) => number;
    ElCascaderPanel: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        border: {
            type: BooleanConstructor;
            default: boolean;
        };
        renderLabel: import("vue").PropType<import("../../cascader-panel/src/node").RenderLabel>;
        modelValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
        props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
    }, {
        ns: {
            namespace: ComputedRef<string>;
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
        menuList: Ref<any[]>;
        menus: Ref<{
            readonly uid: number;
            readonly level: number;
            readonly value: import("../../cascader-panel/src/node").CascaderNodeValue;
            readonly label: string;
            readonly pathNodes: any[];
            readonly pathValues: import("../../cascader-panel/src/node").CascaderNodeValue[];
            readonly pathLabels: string[];
            childrenData: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            }[] | undefined;
            children: any[];
            text: string;
            loaded: boolean;
            checked: boolean;
            indeterminate: boolean;
            loading: boolean;
            readonly data: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            } | null;
            readonly config: {
                expandTrigger: import("element-plus/es/components/cascader-panel").ExpandTrigger;
                multiple: boolean;
                checkStrictly: boolean;
                emitPath: boolean;
                lazy: boolean;
                lazyLoad: import("../../cascader-panel/src/node").LazyLoad;
                value: string;
                label: string;
                children: string;
                disabled: string | import("../../cascader-panel/src/node").isDisabled;
                leaf: string | import("../../cascader-panel/src/node").isLeaf;
                hoverThreshold: number;
            };
            readonly parent?: any | undefined;
            readonly root: boolean;
            readonly isDisabled: boolean;
            readonly isLeaf: boolean;
            readonly valueByOption: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodeValue[];
            appendChild: (childData: import("element-plus/es/components/cascader-panel").CascaderOption) => CascaderNode;
            calcText: (allLevels: boolean, separator: string) => string;
            broadcast: (event: string, ...args: unknown[]) => void;
            emit: (event: string, ...args: unknown[]) => void;
            onParentCheck: (checked: boolean) => void;
            onChildCheck: () => void;
            setCheckState: (checked: boolean) => void;
            doCheck: (checked: boolean) => void;
        }[][]>;
        checkedNodes: Ref<{
            readonly uid: number;
            readonly level: number;
            readonly value: import("../../cascader-panel/src/node").CascaderNodeValue;
            readonly label: string;
            readonly pathNodes: any[];
            readonly pathValues: import("../../cascader-panel/src/node").CascaderNodeValue[];
            readonly pathLabels: string[];
            childrenData: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            }[] | undefined;
            children: any[];
            text: string;
            loaded: boolean;
            checked: boolean;
            indeterminate: boolean;
            loading: boolean;
            readonly data: {
                [x: string]: unknown;
                label?: string | undefined;
                value?: import("../../cascader-panel/src/node").CascaderNodeValue | undefined;
                children?: any[] | undefined;
                disabled?: boolean | undefined;
                leaf?: boolean | undefined;
            } | null;
            readonly config: {
                expandTrigger: import("element-plus/es/components/cascader-panel").ExpandTrigger;
                multiple: boolean;
                checkStrictly: boolean;
                emitPath: boolean;
                lazy: boolean;
                lazyLoad: import("../../cascader-panel/src/node").LazyLoad;
                value: string;
                label: string;
                children: string;
                disabled: string | import("../../cascader-panel/src/node").isDisabled;
                leaf: string | import("../../cascader-panel/src/node").isLeaf;
                hoverThreshold: number;
            };
            readonly parent?: any | undefined;
            readonly root: boolean;
            readonly isDisabled: boolean;
            readonly isLeaf: boolean;
            readonly valueByOption: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodeValue[];
            appendChild: (childData: import("element-plus/es/components/cascader-panel").CascaderOption) => CascaderNode;
            calcText: (allLevels: boolean, separator: string) => string;
            broadcast: (event: string, ...args: unknown[]) => void;
            emit: (event: string, ...args: unknown[]) => void;
            onParentCheck: (checked: boolean) => void;
            onChildCheck: () => void;
            setCheckState: (checked: boolean) => void;
            doCheck: (checked: boolean) => void;
        }[]>;
        handleKeyDown: (e: KeyboardEvent) => void;
        handleCheckChange: (node: CascaderNode, checked: boolean, emitClose?: boolean | undefined) => void;
        getFlattedNodes: (leafOnly: boolean) => CascaderNode[] | undefined;
        getCheckedNodes: (leafOnly: boolean) => CascaderNode[] | undefined;
        clearCheckedNodes: () => void;
        calculateCheckedValue: () => void;
        scrollToExpandingNode: () => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("update:modelValue" | "change" | "close" | "expand-change")[], "update:modelValue" | "change" | "close" | "expand-change", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        border: {
            type: BooleanConstructor;
            default: boolean;
        };
        renderLabel: import("vue").PropType<import("../../cascader-panel/src/node").RenderLabel>;
        modelValue: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
        props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
    }>> & {
        onChange?: ((...args: any[]) => any) | undefined;
        onClose?: ((...args: any[]) => any) | undefined;
        "onUpdate:modelValue"?: ((...args: any[]) => any) | undefined;
        "onExpand-change"?: ((...args: any[]) => any) | undefined;
    }, {
        props: import("element-plus/es/components/cascader-panel").CascaderProps;
        border: boolean;
        options: import("element-plus/es/components/cascader-panel").CascaderOption[];
    }>>;
    ElInput: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
        readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
        readonly resize: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
        readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
        readonly formatter: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parser: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly placeholder: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly form: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly suffixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly prefixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
        readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
        readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly size: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly disabled: BooleanConstructor;
            readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
            readonly resize: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
            readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
            readonly formatter: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly parser: {
                readonly type: import("vue").PropType<Function>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly placeholder: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly form: {
                readonly type: import("vue").PropType<string>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly suffixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly prefixIcon: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
            readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
            readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
            readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        }>> & {
            onChange?: ((value: string) => any) | undefined;
            "onUpdate:modelValue"?: ((value: string) => any) | undefined;
            onInput?: ((value: string) => any) | undefined;
            onBlur?: ((evt: FocusEvent) => any) | undefined;
            onFocus?: ((evt: FocusEvent) => any) | undefined;
            onClear?: (() => any) | undefined;
            onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
            onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
            onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
            onMouseenter?: ((evt: MouseEvent) => any) | undefined;
            onMouseleave?: ((evt: MouseEvent) => any) | undefined;
        }>>;
        emit: ((event: "update:modelValue", value: string) => void) & ((event: "change", value: string) => void) & ((event: "input", value: string) => void) & ((event: "blur", evt: FocusEvent) => void) & ((event: "compositionend", evt: CompositionEvent) => void) & ((event: "compositionstart", evt: CompositionEvent) => void) & ((event: "compositionupdate", evt: CompositionEvent) => void) & ((event: "focus", evt: FocusEvent) => void) & ((event: "keydown", evt: Event | KeyboardEvent) => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void) & ((event: "clear") => void);
        rawAttrs: {
            [x: string]: unknown;
        };
        slots: Readonly<{
            [name: string]: import("vue").Slot | undefined;
        }>;
        containerAttrs: ComputedRef<Record<string, unknown>>;
        containerKls: ComputedRef<unknown[]>;
        wrapperKls: ComputedRef<string[]>;
        attrs: ComputedRef<Record<string, unknown>>;
        form: import("element-plus/es/components/form").FormContext | undefined;
        formItem: import("element-plus/es/components/form").FormItemContext | undefined;
        inputId: Ref<string | undefined>;
        inputSize: ComputedRef<"" | "default" | "small" | "large">;
        inputDisabled: ComputedRef<boolean>;
        nsInput: {
            namespace: ComputedRef<string>;
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
        nsTextarea: {
            namespace: ComputedRef<string>;
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
        input: import("vue").ShallowRef<HTMLInputElement | undefined>;
        textarea: import("vue").ShallowRef<HTMLTextAreaElement | undefined>;
        hovering: Ref<boolean>;
        isComposing: Ref<boolean>;
        passwordVisible: Ref<boolean>;
        countStyle: Ref<StyleValue | undefined>;
        textareaCalcStyle: import("vue").ShallowRef<StyleValue>;
        _ref: ComputedRef<HTMLInputElement | HTMLTextAreaElement | undefined>;
        wrapperRef: import("vue").ShallowRef<HTMLElement | undefined>;
        isFocused: Ref<boolean>;
        handleFocus: (event: FocusEvent) => void;
        handleBlur: (event: FocusEvent) => void;
        needStatusIcon: ComputedRef<boolean>;
        validateState: ComputedRef<"" | "error" | "success" | "validating">;
        validateIcon: ComputedRef<any>;
        passwordIcon: ComputedRef<any>;
        containerStyle: ComputedRef<StyleValue>;
        textareaStyle: ComputedRef<StyleValue>;
        nativeInputValue: ComputedRef<string>;
        showClear: ComputedRef<boolean>;
        showPwdVisible: ComputedRef<boolean>;
        isWordLimitVisible: ComputedRef<boolean>;
        textLength: ComputedRef<number>;
        inputExceed: ComputedRef<boolean>;
        suffixVisible: ComputedRef<boolean>;
        recordCursor: () => void;
        setCursor: () => void;
        resizeTextarea: () => void;
        createOnceInitResize: (resizeTextarea: () => void) => () => void;
        onceInitSizeTextarea: () => void;
        setNativeInputValue: () => void;
        handleInput: (event: Event) => Promise<void>;
        handleChange: (event: Event) => void;
        handleCompositionStart: (event: CompositionEvent) => void;
        handleCompositionUpdate: (event: CompositionEvent) => void;
        handleCompositionEnd: (event: CompositionEvent) => void;
        handlePasswordVisible: () => void;
        focus: () => Promise<void>;
        blur: () => void | undefined;
        handleMouseLeave: (evt: MouseEvent) => void;
        handleMouseEnter: (evt: MouseEvent) => void;
        handleKeydown: (evt: KeyboardEvent) => void;
        select: () => void;
        clear: () => void;
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
                namespace: ComputedRef<string>;
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
            style: ComputedRef<import("vue").CSSProperties>;
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
        CircleClose: any;
        NOOP: () => void;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
        "update:modelValue": (value: string) => boolean;
        input: (value: string) => boolean;
        change: (value: string) => boolean;
        focus: (evt: FocusEvent) => boolean;
        blur: (evt: FocusEvent) => boolean;
        clear: () => boolean;
        mouseleave: (evt: MouseEvent) => boolean;
        mouseenter: (evt: MouseEvent) => boolean;
        keydown: (evt: Event | KeyboardEvent) => boolean;
        compositionstart: (evt: CompositionEvent) => boolean;
        compositionupdate: (evt: CompositionEvent) => boolean;
        compositionend: (evt: CompositionEvent) => boolean;
    }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly size: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly disabled: BooleanConstructor;
        readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown, "", boolean>;
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "text", boolean>;
        readonly resize: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "none" | "both" | "horizontal" | "vertical", unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly autosize: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize) | ((new (...args: any[]) => import("element-plus/es/components/input").InputAutoSize & {}) | (() => import("element-plus/es/components/input").InputAutoSize))[], unknown, unknown, false, boolean>;
        readonly autocomplete: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "off", boolean>;
        readonly formatter: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly parser: {
            readonly type: import("vue").PropType<Function>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly placeholder: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly form: {
            readonly type: import("vue").PropType<string>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly readonly: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly clearable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showPassword: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly showWordLimit: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        readonly suffixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly prefixIcon: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) | ((new (...args: any[]) => (string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>) & {}) | (() => string | import("vue").Component<any, any, any, import("vue").ComputedOptions, import("vue").MethodOptions>))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        readonly containerRole: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
        readonly tabindex: import("element-plus/es/utils").EpPropFinalized<readonly [StringConstructor, NumberConstructor], unknown, unknown, 0, boolean>;
        readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        readonly inputStyle: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{}>, boolean>;
        readonly autofocus: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
    }>> & {
        onChange?: ((value: string) => any) | undefined;
        "onUpdate:modelValue"?: ((value: string) => any) | undefined;
        onInput?: ((value: string) => any) | undefined;
        onBlur?: ((evt: FocusEvent) => any) | undefined;
        onFocus?: ((evt: FocusEvent) => any) | undefined;
        onClear?: (() => any) | undefined;
        onCompositionend?: ((evt: CompositionEvent) => any) | undefined;
        onCompositionstart?: ((evt: CompositionEvent) => any) | undefined;
        onCompositionupdate?: ((evt: CompositionEvent) => any) | undefined;
        onKeydown?: ((evt: Event | KeyboardEvent) => any) | undefined;
        onMouseenter?: ((evt: MouseEvent) => any) | undefined;
        onMouseleave?: ((evt: MouseEvent) => any) | undefined;
    }, {
        readonly type: string;
        readonly modelValue: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined) | ((new (...args: any[]) => (string | number | null | undefined) & {}) | (() => string | number | null | undefined))[], unknown, unknown>;
        readonly label: string;
        readonly id: string;
        readonly disabled: boolean;
        readonly clearable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly autosize: import("element-plus/es/components/input").InputAutoSize;
        readonly autocomplete: string;
        readonly readonly: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly showPassword: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly showWordLimit: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly containerRole: string;
        readonly tabindex: import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, NumberConstructor], unknown, unknown>;
        readonly validateEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        readonly inputStyle: StyleValue;
        readonly autofocus: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    }>> & Record<string, any>;
    ElTooltip: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
        arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        disabled: BooleanConstructor;
        trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
        triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
        virtualRef: {
            readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        virtualTriggering: BooleanConstructor;
        onMouseenter: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onMouseleave: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onClick: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onKeydown: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onFocus: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onBlur: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onContextmenu: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        id: StringConstructor;
        open: BooleanConstructor;
        appendTo: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        persistent: BooleanConstructor;
        ariaLabel: StringConstructor;
        visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
        transition: StringConstructor;
        teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        style: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        className: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
        enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        pure: BooleanConstructor;
        focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        popperClass: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        popperStyle: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        referenceEl: {
            readonly type: import("vue").PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        triggerTargetEl: {
            readonly type: import("vue").PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        zIndex: NumberConstructor;
        boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
        gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
        placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
        popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
        strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
        showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
        autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        "onUpdate:visible": {
            readonly type: import("vue").PropType<(val: boolean) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
            arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            disabled: BooleanConstructor;
            trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            virtualTriggering: BooleanConstructor;
            onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            id: StringConstructor;
            open: BooleanConstructor;
            appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            persistent: BooleanConstructor;
            ariaLabel: StringConstructor;
            visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            transition: StringConstructor;
            teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            pure: BooleanConstructor;
            focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            zIndex: NumberConstructor;
            boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            "onUpdate:visible": {
                readonly type: import("vue").PropType<(val: boolean) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
        }>>;
        emit: (event: string, ...args: any[]) => void;
        id: Ref<string>;
        popperRef: Ref<({
            $: import("vue").ComponentInternalInstance;
            $data: {};
            $props: Partial<{
                readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, "role">;
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
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>>, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                triggerRef: Ref<HTMLElement | undefined>;
                popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
                contentRef: Ref<HTMLElement | undefined>;
                referenceRef: Ref<HTMLElement | undefined>;
                role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
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
            readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & import("vue").ShallowUnwrapRef<{
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            triggerRef: Ref<HTMLElement | undefined>;
            popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
            contentRef: Ref<HTMLElement | undefined>;
            referenceRef: Ref<HTMLElement | undefined>;
            role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
            popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
        }> & {} & import("vue").ComponentCustomProperties) | undefined>;
        contentRef: Ref<any>;
        updatePopper: () => void;
        open: Ref<boolean>;
        toggleReason: Ref<Event | undefined>;
        show: (event?: Event | undefined) => void;
        hide: (event?: Event | undefined) => void;
        hasUpdateHandler: ComputedRef<boolean>;
        onOpen: (event?: Event | undefined) => void;
        onClose: (event?: Event | undefined) => void;
        controlled: ComputedRef<boolean>;
        isFocusInsideContent: (event?: FocusEvent | undefined) => boolean | undefined;
        ElPopper: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
            readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            triggerRef: Ref<HTMLElement | undefined>;
            popperInstanceRef: Ref<import("@popperjs/core").Instance | undefined>;
            contentRef: Ref<HTMLElement | undefined>;
            referenceRef: Ref<HTMLElement | undefined>;
            role: ComputedRef<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
            popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>>, {
            readonly role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
        }>> & Record<string, any>;
        ElPopperArrow: import("vue").DefineComponent<{
            readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            ns: {
                namespace: ComputedRef<string>;
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
            arrowOffset: Ref<number | undefined>;
            arrowRef: Ref<HTMLElement | undefined>;
            arrowStyle: ComputedRef<import("vue").CSSProperties>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        }>>, {
            readonly arrowOffset: number;
        }>;
        ElTooltipTrigger: import("vue").DefineComponent<{
            readonly disabled: BooleanConstructor;
            readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            readonly virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly virtualTriggering: BooleanConstructor;
            readonly onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly id: StringConstructor;
            readonly open: BooleanConstructor;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly disabled: BooleanConstructor;
                readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            ns: {
                namespace: ComputedRef<string>;
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
            controlled: Ref<boolean>;
            id: Ref<string>;
            open: Ref<boolean>;
            onOpen: (e?: Event | undefined) => void;
            onClose: (e?: Event | undefined) => void;
            onToggle: (e: Event) => void;
            triggerRef: Ref<{
                forwardRef: HTMLElement;
            } | null>;
            stopWhenControlledOrDisabled: () => true | undefined;
            trigger: Ref<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>>;
            onMouseenter: (event: Event) => void;
            onMouseleave: (event: Event) => void;
            onClick: (event: Event) => void;
            onFocus: (event: Event) => void;
            onBlur: (event: Event) => void;
            onContextMenu: (event: Event) => void;
            onKeydown: (event: KeyboardEvent) => void;
            ElPopperTrigger: import("vue").DefineComponent<{
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly virtualRef: {
                        readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: import("vue").PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly id: StringConstructor;
                    readonly open: BooleanConstructor;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                role: ComputedRef<string>;
                triggerRef: Ref<import("element-plus/es/components/popper").Measurable | undefined>;
                ariaControls: ComputedRef<string | undefined>;
                ariaDescribedby: ComputedRef<string | undefined>;
                ariaHaspopup: ComputedRef<string | undefined>;
                ariaExpanded: ComputedRef<string | undefined>;
                virtualTriggerAriaStopWatch: undefined;
                ElOnlyChild: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }> | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, import("vue").EmitsOptions, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly virtualRef: {
                    readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: import("vue").PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }>>, {
                readonly virtualTriggering: boolean;
                readonly open: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly disabled: BooleanConstructor;
            readonly trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            readonly triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            readonly virtualRef: {
                readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly virtualTriggering: BooleanConstructor;
            readonly onMouseenter: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onMouseleave: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onClick: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onKeydown: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onFocus: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onBlur: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onContextmenu: {
                readonly type: import("vue").PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly id: StringConstructor;
            readonly open: BooleanConstructor;
        }>>, {
            readonly virtualTriggering: boolean;
            readonly disabled: boolean;
            readonly open: boolean;
            readonly trigger: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
            readonly triggerKeys: string[];
        }>;
        ElTooltipContent: import("vue").DefineComponent<{
            readonly appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly persistent: BooleanConstructor;
            readonly ariaLabel: StringConstructor;
            readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            readonly transition: StringConstructor;
            readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly disabled: BooleanConstructor;
            readonly id: StringConstructor;
            readonly style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly pure: BooleanConstructor;
            readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly virtualTriggering: BooleanConstructor;
            readonly zIndex: NumberConstructor;
            readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly appendTo: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly persistent: BooleanConstructor;
                readonly ariaLabel: StringConstructor;
                readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                readonly transition: StringConstructor;
                readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly disabled: BooleanConstructor;
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            selector: ComputedRef<string>;
            ns: {
                namespace: ComputedRef<string>;
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
            contentRef: any;
            destroyed: Ref<boolean>;
            controlled: Ref<boolean>;
            id: Ref<string>;
            open: Ref<boolean>;
            trigger: Ref<import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>>;
            onClose: (e?: Event | undefined) => void;
            onOpen: (e?: Event | undefined) => void;
            onShow: () => void;
            onHide: () => void;
            onBeforeShow: () => void;
            onBeforeHide: () => void;
            transitionClass: ComputedRef<string>;
            persistentRef: ComputedRef<boolean>;
            shouldRender: ComputedRef<boolean>;
            shouldShow: ComputedRef<boolean>;
            appendTo: ComputedRef<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
            contentStyle: ComputedRef<any>;
            ariaHidden: ComputedRef<boolean>;
            onTransitionLeave: () => void;
            stopWhenControlled: () => true | undefined;
            onContentEnter: (event: unknown) => void;
            onContentLeave: (event: unknown) => void;
            onBeforeEnter: () => void;
            onBeforeLeave: () => void;
            onAfterShow: () => void;
            onBlur: () => void;
            stopHandle: (() => void) | undefined;
            ElPopperContent: import("vue").DefineComponent<{
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly visible: BooleanConstructor;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            }, {
                emit: ((event: "blur") => void) & ((event: "close") => void) & ((event: "focus") => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void);
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly id: StringConstructor;
                    readonly style: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly visible: BooleanConstructor;
                    readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly popperStyle: {
                        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: import("vue").PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                }>> & {
                    onClose?: (() => any) | undefined;
                    onBlur?: (() => any) | undefined;
                    onFocus?: (() => any) | undefined;
                    onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                    onMouseleave?: ((evt: MouseEvent) => any) | undefined;
                }>>;
                focusStartRef: Ref<HTMLElement | "first" | "container" | undefined>;
                trapped: Ref<boolean>;
                onFocusAfterReleased: (event: CustomEvent<any>) => void;
                onFocusAfterTrapped: () => void;
                onFocusInTrap: (event: FocusEvent) => void;
                onFocusoutPrevented: (event: CustomEvent<any>) => void;
                onReleaseRequested: () => void;
                attributes: ComputedRef<{
                    [key: string]: {
                        [key: string]: string | boolean;
                    };
                }>;
                arrowRef: Ref<HTMLElement | undefined>;
                contentRef: Ref<HTMLElement | undefined>;
                styles: ComputedRef<{
                    [key: string]: Partial<CSSStyleDeclaration>;
                }>;
                instanceRef: ComputedRef<import("@popperjs/core").Instance | undefined>;
                role: ComputedRef<string>;
                update: () => Promise<Partial<import("@popperjs/core").State>> | undefined;
                ariaModal: ComputedRef<string | undefined>;
                arrowStyle: ComputedRef<import("vue").CSSProperties>;
                contentAttrs: ComputedRef<{
                    [key: string]: string | boolean;
                }>;
                contentClass: ComputedRef<((string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | undefined)[]>;
                contentStyle: ComputedRef<StyleValue[]>;
                updateZIndex: () => void;
                formItemContext: import("element-plus/es/components/form").FormItemContext | undefined;
                arrowOffset: Ref<number | undefined>;
                triggerTargetAriaStopWatch: undefined;
                updatePopper: (shouldUpdateZIndex?: boolean) => void;
                togglePopperAlive: () => void;
                ElFocusTrap: import("vue").DefineComponent<{
                    loop: BooleanConstructor;
                    trapped: BooleanConstructor;
                    focusTrapEl: import("vue").PropType<HTMLElement>;
                    focusStartEl: {
                        type: import("vue").PropType<HTMLElement | "first" | "container">;
                        default: string;
                    };
                }, {
                    onKeydown: (e: KeyboardEvent) => void;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested")[], "focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    loop: BooleanConstructor;
                    trapped: BooleanConstructor;
                    focusTrapEl: import("vue").PropType<HTMLElement>;
                    focusStartEl: {
                        type: import("vue").PropType<HTMLElement | "first" | "container">;
                        default: string;
                    };
                }>> & {
                    onFocusAfterReleased?: ((...args: any[]) => any) | undefined;
                    onFocusAfterTrapped?: ((...args: any[]) => any) | undefined;
                    onFocusin?: ((...args: any[]) => any) | undefined;
                    onFocusout?: ((...args: any[]) => any) | undefined;
                    "onFocusout-prevented"?: ((...args: any[]) => any) | undefined;
                    "onRelease-requested"?: ((...args: any[]) => any) | undefined;
                }, {
                    trapped: boolean;
                    loop: boolean;
                    focusStartEl: HTMLElement | "first" | "container";
                }>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
                mouseenter: (evt: MouseEvent) => boolean;
                mouseleave: (evt: MouseEvent) => boolean;
                focus: () => boolean;
                blur: () => boolean;
                close: () => boolean;
            }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly visible: BooleanConstructor;
                readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly popperStyle: {
                    readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: import("vue").PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly ariaLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            }>> & {
                onClose?: (() => any) | undefined;
                onBlur?: (() => any) | undefined;
                onFocus?: (() => any) | undefined;
                onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                onMouseleave?: ((evt: MouseEvent) => any) | undefined;
            }, {
                readonly offset: number;
                readonly effect: string;
                readonly placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
                readonly boundariesPadding: number;
                readonly fallbackPlacements: import("element-plus/es/components/popper").Placement[];
                readonly gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly popperOptions: Partial<Options>;
                readonly strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
                readonly enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly ariaLabel: string;
                readonly visible: boolean;
                readonly pure: boolean;
                readonly virtualTriggering: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly appendTo: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly persistent: BooleanConstructor;
            readonly ariaLabel: StringConstructor;
            readonly visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            readonly transition: StringConstructor;
            readonly teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly disabled: BooleanConstructor;
            readonly id: StringConstructor;
            readonly style: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly className: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            readonly enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly pure: BooleanConstructor;
            readonly focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly popperClass: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly popperStyle: {
                readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly referenceEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly triggerTargetEl: {
                readonly type: import("vue").PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly virtualTriggering: BooleanConstructor;
            readonly zIndex: NumberConstructor;
            readonly boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
            readonly gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
            readonly popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
            readonly strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            readonly showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            readonly autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        }>>, {
            readonly offset: number;
            readonly effect: string;
            readonly placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
            readonly showAfter: number;
            readonly hideAfter: number;
            readonly autoClose: number;
            readonly boundariesPadding: number;
            readonly fallbackPlacements: import("element-plus/es/components/popper").Placement[];
            readonly gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly popperOptions: Partial<Options>;
            readonly strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
            readonly enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly visible: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
            readonly pure: boolean;
            readonly virtualTriggering: boolean;
            readonly content: string;
            readonly rawContent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly teleported: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly persistent: boolean;
            readonly disabled: boolean;
        }>;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, string[], string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        showArrow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
        arrowOffset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        disabled: BooleanConstructor;
        trigger: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
        triggerKeys: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
        virtualRef: {
            readonly type: import("vue").PropType<import("element-plus/es/components/popper").Measurable>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        virtualTriggering: BooleanConstructor;
        onMouseenter: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onMouseleave: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onClick: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onKeydown: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onFocus: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onBlur: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onContextmenu: {
            readonly type: import("vue").PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        id: StringConstructor;
        open: BooleanConstructor;
        appendTo: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        content: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        rawContent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        persistent: BooleanConstructor;
        ariaLabel: StringConstructor;
        visible: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
        transition: StringConstructor;
        teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        style: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        className: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
        enterable: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        pure: BooleanConstructor;
        focusOnShow: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        trapping: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        popperClass: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) | ((new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]) & {}) | (() => string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | any)[])[])[])[])[])[])[])[])[])[])[]))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        popperStyle: {
            readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => StyleValue & {}) | (() => StyleValue) | ((new (...args: any[]) => StyleValue & {}) | (() => StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        referenceEl: {
            readonly type: import("vue").PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        triggerTargetEl: {
            readonly type: import("vue").PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        stopPopperMouseEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        zIndex: NumberConstructor;
        boundariesPadding: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        fallbackPlacements: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]) | ((new (...args: any[]) => import("element-plus/es/components/popper").Placement[]) | (() => import("element-plus/es/components/popper").Placement[]))[], unknown, unknown, undefined, boolean>;
        gpuAcceleration: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        offset: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
        placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("element-plus/es/components/popper").Placement, unknown, "bottom", boolean>;
        popperOptions: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Partial<Options>) | (() => Partial<Options>) | ((new (...args: any[]) => Partial<Options>) | (() => Partial<Options>))[], unknown, unknown, () => {}, boolean>;
        strategy: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
        showAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        hideAfter: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
        autoClose: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        "onUpdate:visible": {
            readonly type: import("vue").PropType<(val: boolean) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        role: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
    }>> & {
        [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
    }, {
        offset: number;
        effect: string;
        placement: import("element-plus/es/utils").EpPropMergeType<StringConstructor, import("element-plus/es/components/popper").Placement, unknown>;
        showAfter: number;
        hideAfter: number;
        autoClose: number;
        boundariesPadding: number;
        fallbackPlacements: import("element-plus/es/components/popper").Placement[];
        gpuAcceleration: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        popperOptions: Partial<Options>;
        strategy: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
        enterable: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        focusOnShow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        trapping: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        stopPopperMouseEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        visible: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
        pure: boolean;
        virtualTriggering: boolean;
        content: string;
        rawContent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        teleported: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        persistent: boolean;
        disabled: boolean;
        open: boolean;
        role: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
        trigger: import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("element-plus/es/utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
        triggerKeys: string[];
        arrowOffset: number;
        showArrow: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    }>> & Record<string, any>;
    ElScrollbar: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
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
            namespace: ComputedRef<string>;
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
        scrollbarRef: Ref<HTMLDivElement | undefined>;
        wrapRef: Ref<HTMLDivElement | undefined>;
        resizeRef: Ref<HTMLElement | undefined>;
        sizeWidth: Ref<string>;
        sizeHeight: Ref<string>;
        barRef: Ref<({
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
                moveX: Ref<number>;
                moveY: Ref<number>;
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
                    scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                    ns: {
                        namespace: ComputedRef<string>;
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
                    instance: Ref<HTMLDivElement | undefined>;
                    thumb: Ref<HTMLDivElement | undefined>;
                    thumbState: Ref<{
                        X?: number | undefined;
                        Y?: number | undefined;
                    }>;
                    visible: Ref<boolean>;
                    cursorDown: boolean;
                    cursorLeave: boolean;
                    originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                    bar: ComputedRef<{
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
                    thumbStyle: ComputedRef<import("vue").CSSProperties>;
                    offsetRatio: ComputedRef<number>;
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
            moveX: Ref<number>;
            moveY: Ref<number>;
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
                scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                ns: {
                    namespace: ComputedRef<string>;
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
                instance: Ref<HTMLDivElement | undefined>;
                thumb: Ref<HTMLDivElement | undefined>;
                thumbState: Ref<{
                    X?: number | undefined;
                    Y?: number | undefined;
                }>;
                visible: Ref<boolean>;
                cursorDown: boolean;
                cursorLeave: boolean;
                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                bar: ComputedRef<{
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
                thumbStyle: ComputedRef<import("vue").CSSProperties>;
                offsetRatio: ComputedRef<number>;
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
        ratioY: Ref<number>;
        ratioX: Ref<number>;
        wrapStyle: ComputedRef<StyleValue>;
        wrapKls: ComputedRef<(string | unknown[] | {
            [x: string]: boolean;
        })[]>;
        resizeKls: ComputedRef<import("element-plus/es/utils").EpPropMergeType<readonly [StringConstructor, ArrayConstructor], unknown, unknown>[]>;
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
            moveX: Ref<number>;
            moveY: Ref<number>;
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
                scrollbar: import("element-plus/es/components/scrollbar").ScrollbarContext;
                ns: {
                    namespace: ComputedRef<string>;
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
                instance: Ref<HTMLDivElement | undefined>;
                thumb: Ref<HTMLDivElement | undefined>;
                thumbState: Ref<{
                    X?: number | undefined;
                    Y?: number | undefined;
                }>;
                visible: Ref<boolean>;
                cursorDown: boolean;
                cursorLeave: boolean;
                originalOnSelectStart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
                bar: ComputedRef<{
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
                thumbStyle: ComputedRef<import("vue").CSSProperties>;
                offsetRatio: ComputedRef<number>;
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
    }>> & Record<string, any>;
    ElTag: import("element-plus/es/utils").SFCWithInstall<import("vue").DefineComponent<{
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown, "", boolean>;
        readonly closable: BooleanConstructor;
        readonly disableTransitions: BooleanConstructor;
        readonly hit: BooleanConstructor;
        readonly color: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly size: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "small" | "large", unknown, "", boolean>;
        readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "light" | "dark" | "plain", unknown, "light", boolean>;
        readonly round: BooleanConstructor;
    }, {
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown, "", boolean>;
            readonly closable: BooleanConstructor;
            readonly disableTransitions: BooleanConstructor;
            readonly hit: BooleanConstructor;
            readonly color: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly size: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "small" | "large", unknown, "", boolean>;
            readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "light" | "dark" | "plain", unknown, "light", boolean>;
            readonly round: BooleanConstructor;
        }>> & {
            onClose?: ((evt: MouseEvent) => any) | undefined;
            onClick?: ((evt: MouseEvent) => any) | undefined;
        }>>;
        emit: ((event: "click", evt: MouseEvent) => void) & ((event: "close", evt: MouseEvent) => void);
        tagSize: ComputedRef<"" | "default" | "small" | "large">;
        ns: {
            namespace: ComputedRef<string>;
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
        containerKls: ComputedRef<string[]>;
        handleClose: (event: MouseEvent) => void;
        handleClick: (event: MouseEvent) => void;
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
                namespace: ComputedRef<string>;
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
            style: ComputedRef<import("vue").CSSProperties>;
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
        Close: any;
    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
        close: (evt: MouseEvent) => boolean;
        click: (evt: MouseEvent) => boolean;
    }, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
        readonly type: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown, "", boolean>;
        readonly closable: BooleanConstructor;
        readonly disableTransitions: BooleanConstructor;
        readonly hit: BooleanConstructor;
        readonly color: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        readonly size: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "" | "default" | "small" | "large", unknown, "", boolean>;
        readonly effect: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "light" | "dark" | "plain", unknown, "light", boolean>;
        readonly round: BooleanConstructor;
    }>> & {
        onClose?: ((evt: MouseEvent) => any) | undefined;
        onClick?: ((evt: MouseEvent) => any) | undefined;
    }, {
        readonly type: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown>;
        readonly closable: boolean;
        readonly effect: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "light" | "dark" | "plain", unknown>;
        readonly size: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", unknown>;
        readonly color: string;
        readonly round: boolean;
        readonly disableTransitions: boolean;
        readonly hit: boolean;
    }>> & Record<string, any>;
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
            namespace: ComputedRef<string>;
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
        style: ComputedRef<import("vue").CSSProperties>;
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
    vClickoutside: import("vue").ObjectDirective<any, any>;
    ArrowDown: any;
    Check: any;
    CircleClose: any;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    "update:modelValue": (val: CascaderValue) => boolean;
    change: (val: CascaderValue) => boolean;
    focus: (evt: FocusEvent) => boolean;
    blur: (evt: FocusEvent) => boolean;
    visibleChange: (val: boolean) => boolean;
    expandChange: (val: CascaderValue) => boolean;
    removeTag: (val: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodePathValue) => boolean;
}, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    placeholder: StringConstructor;
    disabled: BooleanConstructor;
    clearable: BooleanConstructor;
    filterable: BooleanConstructor;
    filterMethod: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (node: CascaderNode, keyword: string) => boolean) | (() => (node: CascaderNode, keyword: string) => boolean) | {
        (): (node: CascaderNode, keyword: string) => boolean;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (node: CascaderNode, keyword: string) => boolean) | (() => (node: CascaderNode, keyword: string) => boolean) | {
        (): (node: CascaderNode, keyword: string) => boolean;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, (node: CascaderNode, keyword: string) => boolean, boolean>;
    separator: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, string, boolean>;
    showAllLevels: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
    collapseTags: BooleanConstructor;
    maxCollapseTags: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
    collapseTagsTooltip: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
    debounce: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, number, boolean>;
    beforeFilter: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (value: string) => boolean | Promise<any>) | (() => (value: string) => boolean | Promise<any>) | {
        (): (value: string) => boolean | Promise<any>;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (value: string) => boolean | Promise<any>) | (() => (value: string) => boolean | Promise<any>) | {
        (): (value: string) => boolean | Promise<any>;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, () => true, boolean>;
    popperClass: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, string, boolean>;
    teleported: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    tagType: {
        default: string;
        type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown>>;
        required: false;
        validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
    modelValue: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<(new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue) | ((new (...args: any[]) => import("../../cascader-panel/src/node").CascaderValue & {}) | (() => import("../../cascader-panel/src/node").CascaderValue))[], unknown, unknown>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    options: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderOption[]) | (() => import("element-plus/es/components/cascader-panel").CascaderOption[]))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderOption[], boolean>;
    props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps) | ((new (...args: any[]) => import("element-plus/es/components/cascader-panel").CascaderProps) | (() => import("element-plus/es/components/cascader-panel").CascaderProps))[], unknown, unknown, () => import("element-plus/es/components/cascader-panel").CascaderProps, boolean>;
}>> & {
    onChange?: ((val: CascaderValue) => any) | undefined;
    "onUpdate:modelValue"?: ((val: CascaderValue) => any) | undefined;
    onBlur?: ((evt: FocusEvent) => any) | undefined;
    onFocus?: ((evt: FocusEvent) => any) | undefined;
    onVisibleChange?: ((val: boolean) => any) | undefined;
    onExpandChange?: ((val: CascaderValue) => any) | undefined;
    onRemoveTag?: ((val: import("../../cascader-panel/src/node").CascaderNodeValue | import("../../cascader-panel/src/node").CascaderNodePathValue) => any) | undefined;
}, {
    props: import("element-plus/es/components/cascader-panel").CascaderProps;
    debounce: number;
    popperClass: string;
    teleported: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    disabled: boolean;
    clearable: boolean;
    validateEvent: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    separator: string;
    options: import("element-plus/es/components/cascader-panel").CascaderOption[];
    filterable: boolean;
    filterMethod: (node: CascaderNode, keyword: string) => boolean;
    showAllLevels: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    collapseTags: boolean;
    maxCollapseTags: number;
    collapseTagsTooltip: import("element-plus/es/utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
    beforeFilter: (value: string) => boolean | Promise<any>;
    tagType: import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "success" | "warning" | "info" | "danger", unknown>;
}>;
export default _default;
