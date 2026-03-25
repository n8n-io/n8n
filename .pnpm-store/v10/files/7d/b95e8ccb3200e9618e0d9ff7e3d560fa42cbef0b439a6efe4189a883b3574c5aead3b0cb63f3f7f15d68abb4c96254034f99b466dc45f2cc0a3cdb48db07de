import type { Placement } from 'element-plus/es/components/popper';
import type { PropType, WritableComputedRef } from 'vue';
import type { TableColumnCtx } from './table-column/defaults';
declare const _default: import("vue").DefineComponent<{
    placement: {
        type: PropType<Placement>;
        default: string;
    };
    store: {
        type: PropType<any>;
    };
    column: {
        type: PropType<TableColumnCtx<unknown>>;
    };
    upDataColumn: {
        type: FunctionConstructor;
    };
}, {
    tooltipVisible: import("vue").Ref<boolean>;
    multiple: import("vue").ComputedRef<boolean>;
    filteredValue: WritableComputedRef<unknown[]>;
    filterValue: WritableComputedRef<string>;
    filters: import("vue").ComputedRef<import("./table-column/defaults").Filters | undefined>;
    handleConfirm: () => void;
    handleReset: () => void;
    handleSelect: (_filterValue?: string | undefined) => void;
    isActive: (filter: any) => boolean;
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
    showFilterPanel: (e: MouseEvent) => void;
    hideFilterPanel: () => void;
    popperPaneRef: import("vue").ComputedRef<HTMLElement | undefined>;
    tooltip: import("vue").Ref<({
        $: import("vue").ComponentInternalInstance;
        $data: {};
        $props: Partial<{
            offset: number;
            effect: string;
            placement: import("../../../utils").EpPropMergeType<StringConstructor, Placement, unknown>;
            showAfter: number;
            hideAfter: number;
            autoClose: number;
            boundariesPadding: number;
            fallbackPlacements: Placement[];
            gpuAcceleration: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            popperOptions: Partial<import("element-plus/es/components/popper").Options>;
            strategy: import("../../../utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
            enterable: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            focusOnShow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            trapping: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            stopPopperMouseEvent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            visible: import("../../../utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
            pure: boolean;
            virtualTriggering: boolean;
            content: string;
            rawContent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            teleported: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            persistent: boolean;
            disabled: boolean;
            open: boolean;
            role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            trigger: import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
            triggerKeys: string[];
            arrowOffset: number;
            showArrow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
        }> & Omit<Readonly<import("vue").ExtractPropTypes<{
            showArrow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
            arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            disabled: BooleanConstructor;
            trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            virtualRef: {
                readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            virtualTriggering: BooleanConstructor;
            onMouseenter: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onMouseleave: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onClick: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onKeydown: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onFocus: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onBlur: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onContextmenu: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            id: StringConstructor;
            open: BooleanConstructor;
            appendTo: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            persistent: BooleanConstructor;
            ariaLabel: StringConstructor;
            visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            transition: StringConstructor;
            teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            style: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            className: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
            effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            pure: BooleanConstructor;
            focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            popperClass: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            referenceEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            triggerTargetEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            zIndex: NumberConstructor;
            boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
            gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
            popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
            strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            "onUpdate:visible": {
                readonly type: PropType<(val: boolean) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
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
            showArrow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
            arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            disabled: BooleanConstructor;
            trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            virtualRef: {
                readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            virtualTriggering: BooleanConstructor;
            onMouseenter: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onMouseleave: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onClick: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onKeydown: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onFocus: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onBlur: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onContextmenu: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            id: StringConstructor;
            open: BooleanConstructor;
            appendTo: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            persistent: BooleanConstructor;
            ariaLabel: StringConstructor;
            visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            transition: StringConstructor;
            teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            style: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            className: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
            effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            pure: BooleanConstructor;
            focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            popperClass: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            referenceEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            triggerTargetEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            zIndex: NumberConstructor;
            boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
            gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
            popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
            strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            "onUpdate:visible": {
                readonly type: PropType<(val: boolean) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                showArrow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
                arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
                disabled: BooleanConstructor;
                trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                virtualRef: {
                    readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                virtualTriggering: BooleanConstructor;
                onMouseenter: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onMouseleave: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onClick: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onKeydown: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onFocus: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onBlur: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                onContextmenu: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                id: StringConstructor;
                open: BooleanConstructor;
                appendTo: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                persistent: BooleanConstructor;
                ariaLabel: StringConstructor;
                visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                transition: StringConstructor;
                teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                style: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                className: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                pure: BooleanConstructor;
                focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                popperClass: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                referenceEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                triggerTargetEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                zIndex: NumberConstructor;
                boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                "onUpdate:visible": {
                    readonly type: PropType<(val: boolean) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
            }>>;
            emit: (event: string, ...args: any[]) => void;
            id: import("vue").Ref<string>;
            popperRef: import("vue").Ref<({
                $: import("vue").ComponentInternalInstance;
                $data: {};
                $props: Partial<{
                    readonly role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
                }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
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
                    readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>>, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    triggerRef: import("vue").Ref<HTMLElement | undefined>;
                    popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
                    contentRef: import("vue").Ref<HTMLElement | undefined>;
                    referenceRef: import("vue").Ref<HTMLElement | undefined>;
                    role: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                    popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                    readonly role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
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
                $nextTick: typeof import("vue").nextTick;
                $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
            } & Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & import("vue").ShallowUnwrapRef<{
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                triggerRef: import("vue").Ref<HTMLElement | undefined>;
                popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
                contentRef: import("vue").Ref<HTMLElement | undefined>;
                referenceRef: import("vue").Ref<HTMLElement | undefined>;
                role: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
            }> & {} & import("vue").ComponentCustomProperties) | undefined>;
            contentRef: import("vue").Ref<any>;
            updatePopper: () => void;
            open: import("vue").Ref<boolean>;
            toggleReason: import("vue").Ref<Event | undefined>;
            show: (event?: Event | undefined) => void;
            hide: (event?: Event | undefined) => void;
            hasUpdateHandler: import("vue").ComputedRef<boolean>;
            onOpen: (event?: Event | undefined) => void;
            onClose: (event?: Event | undefined) => void;
            controlled: import("vue").ComputedRef<boolean>;
            isFocusInsideContent: (event?: FocusEvent | undefined) => boolean | undefined;
            ElPopper: import("../../../utils").SFCWithInstall<import("vue").DefineComponent<{
                readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                triggerRef: import("vue").Ref<HTMLElement | undefined>;
                popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
                contentRef: import("vue").Ref<HTMLElement | undefined>;
                referenceRef: import("vue").Ref<HTMLElement | undefined>;
                role: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>>, {
                readonly role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            }>> & Record<string, any>;
            ElPopperArrow: import("vue").DefineComponent<{
                readonly arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
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
                arrowOffset: import("vue").Ref<number | undefined>;
                arrowRef: import("vue").Ref<HTMLElement | undefined>;
                arrowStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            }>>, {
                readonly arrowOffset: number;
            }>;
            ElTooltipTrigger: import("vue").DefineComponent<{
                readonly disabled: BooleanConstructor;
                readonly trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                readonly triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                readonly virtualRef: {
                    readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly disabled: BooleanConstructor;
                    readonly trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                    readonly triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                    readonly virtualRef: {
                        readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: PropType<(e: Event) => void>;
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
                controlled: import("vue").Ref<boolean>;
                id: import("vue").Ref<string>;
                open: import("vue").Ref<boolean>;
                onOpen: (e?: Event | undefined) => void;
                onClose: (e?: Event | undefined) => void;
                onToggle: (e: Event) => void;
                triggerRef: import("vue").Ref<{
                    forwardRef: HTMLElement;
                } | null>;
                stopWhenControlledOrDisabled: () => true | undefined;
                trigger: import("vue").Ref<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>>;
                onMouseenter: (event: Event) => void;
                onMouseleave: (event: Event) => void;
                onClick: (event: Event) => void;
                onFocus: (event: Event) => void;
                onBlur: (event: Event) => void;
                onContextMenu: (event: Event) => void;
                onKeydown: (event: KeyboardEvent) => void;
                ElPopperTrigger: import("vue").DefineComponent<{
                    readonly virtualRef: {
                        readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly id: StringConstructor;
                    readonly open: BooleanConstructor;
                }, {
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly virtualRef: {
                            readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly virtualTriggering: BooleanConstructor;
                        readonly onMouseenter: {
                            readonly type: PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onMouseleave: {
                            readonly type: PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onClick: {
                            readonly type: PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onKeydown: {
                            readonly type: PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onFocus: {
                            readonly type: PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onBlur: {
                            readonly type: PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly onContextmenu: {
                            readonly type: PropType<(e: Event) => void>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly id: StringConstructor;
                        readonly open: BooleanConstructor;
                    }>> & {
                        [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                    }>>;
                    role: import("vue").ComputedRef<string>;
                    triggerRef: import("vue").Ref<import("element-plus/es/components/popper").Measurable | undefined>;
                    ariaControls: import("vue").ComputedRef<string | undefined>;
                    ariaDescribedby: import("vue").ComputedRef<string | undefined>;
                    ariaHaspopup: import("vue").ComputedRef<string | undefined>;
                    ariaExpanded: import("vue").ComputedRef<string | undefined>;
                    virtualTriggerAriaStopWatch: undefined;
                    ElOnlyChild: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                        [key: string]: any;
                    }> | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, import("vue").EmitsOptions, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}>;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    readonly virtualRef: {
                        readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: PropType<(e: Event) => void>;
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
                readonly trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                readonly triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                readonly virtualRef: {
                    readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: PropType<(e: Event) => void>;
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
                readonly trigger: import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
                readonly triggerKeys: string[];
            }>;
            ElTooltipContent: import("vue").DefineComponent<{
                readonly appendTo: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                readonly rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly persistent: BooleanConstructor;
                readonly ariaLabel: StringConstructor;
                readonly visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                readonly transition: StringConstructor;
                readonly teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly disabled: BooleanConstructor;
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                readonly showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                readonly autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly appendTo: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                    readonly rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly persistent: BooleanConstructor;
                    readonly ariaLabel: StringConstructor;
                    readonly visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                    readonly transition: StringConstructor;
                    readonly teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly disabled: BooleanConstructor;
                    readonly id: StringConstructor;
                    readonly style: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                    readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                    readonly showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                    readonly autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                selector: import("vue").ComputedRef<string>;
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
                contentRef: any;
                destroyed: import("vue").Ref<boolean>;
                controlled: import("vue").Ref<boolean>;
                id: import("vue").Ref<string>;
                open: import("vue").Ref<boolean>;
                trigger: import("vue").Ref<import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>>;
                onClose: (e?: Event | undefined) => void;
                onOpen: (e?: Event | undefined) => void;
                onShow: () => void;
                onHide: () => void;
                onBeforeShow: () => void;
                onBeforeHide: () => void;
                transitionClass: import("vue").ComputedRef<string>;
                persistentRef: import("vue").ComputedRef<boolean>;
                shouldRender: import("vue").ComputedRef<boolean>;
                shouldShow: import("vue").ComputedRef<boolean>;
                appendTo: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                contentStyle: import("vue").ComputedRef<any>;
                ariaHidden: import("vue").ComputedRef<boolean>;
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
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                    readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly visible: BooleanConstructor;
                    readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly ariaLabel: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                }, {
                    emit: ((event: "blur") => void) & ((event: "close") => void) & ((event: "focus") => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void);
                    props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                        readonly id: StringConstructor;
                        readonly style: {
                            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly className: {
                            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
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
                        readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                        readonly visible: BooleanConstructor;
                        readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly pure: BooleanConstructor;
                        readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                        readonly popperClass: {
                            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
                                [x: string]: boolean;
                            } | (string | {
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
                            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly referenceEl: {
                            readonly type: PropType<HTMLElement>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly triggerTargetEl: {
                            readonly type: PropType<HTMLElement>;
                            readonly required: false;
                            readonly validator: ((val: unknown) => boolean) | undefined;
                            __epPropKey: true;
                        };
                        readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly ariaLabel: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                        readonly virtualTriggering: BooleanConstructor;
                        readonly zIndex: NumberConstructor;
                        readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                        readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                        readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                        readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                        readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                        readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                        readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                    }>> & {
                        onClose?: (() => any) | undefined;
                        onBlur?: (() => any) | undefined;
                        onFocus?: (() => any) | undefined;
                        onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                        onMouseleave?: ((evt: MouseEvent) => any) | undefined;
                    }>>;
                    focusStartRef: import("vue").Ref<HTMLElement | "first" | "container" | undefined>;
                    trapped: import("vue").Ref<boolean>;
                    onFocusAfterReleased: (event: CustomEvent<any>) => void;
                    onFocusAfterTrapped: () => void;
                    onFocusInTrap: (event: FocusEvent) => void;
                    onFocusoutPrevented: (event: CustomEvent<any>) => void;
                    onReleaseRequested: () => void;
                    attributes: import("vue").ComputedRef<{
                        [key: string]: {
                            [key: string]: string | boolean;
                        };
                    }>;
                    arrowRef: import("vue").Ref<HTMLElement | undefined>;
                    contentRef: import("vue").Ref<HTMLElement | undefined>;
                    styles: import("vue").ComputedRef<{
                        [key: string]: Partial<CSSStyleDeclaration>;
                    }>;
                    instanceRef: import("vue").ComputedRef<import("@popperjs/core").Instance | undefined>;
                    role: import("vue").ComputedRef<string>;
                    update: () => Promise<Partial<import("@popperjs/core").State>> | undefined;
                    ariaModal: import("vue").ComputedRef<string | undefined>;
                    arrowStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                    contentAttrs: import("vue").ComputedRef<{
                        [key: string]: string | boolean;
                    }>;
                    contentClass: import("vue").ComputedRef<((string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                    contentStyle: import("vue").ComputedRef<import("vue").StyleValue[]>;
                    updateZIndex: () => void;
                    formItemContext: import("../..").FormItemContext | undefined;
                    arrowOffset: import("vue").Ref<number | undefined>;
                    triggerTargetAriaStopWatch: undefined;
                    updatePopper: (shouldUpdateZIndex?: boolean) => void;
                    togglePopperAlive: () => void;
                    ElFocusTrap: import("vue").DefineComponent<{
                        loop: BooleanConstructor;
                        trapped: BooleanConstructor;
                        focusTrapEl: PropType<HTMLElement>;
                        focusStartEl: {
                            type: PropType<HTMLElement | "first" | "container">;
                            default: string;
                        };
                    }, {
                        onKeydown: (e: KeyboardEvent) => void;
                    }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested")[], "focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                        loop: BooleanConstructor;
                        trapped: BooleanConstructor;
                        focusTrapEl: PropType<HTMLElement>;
                        focusStartEl: {
                            type: PropType<HTMLElement | "first" | "container">;
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
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                    readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly visible: BooleanConstructor;
                    readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly ariaLabel: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                }>> & {
                    onClose?: (() => any) | undefined;
                    onBlur?: (() => any) | undefined;
                    onFocus?: (() => any) | undefined;
                    onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                    onMouseleave?: ((evt: MouseEvent) => any) | undefined;
                }, {
                    readonly offset: number;
                    readonly effect: string;
                    readonly placement: import("../../../utils").EpPropMergeType<StringConstructor, Placement, unknown>;
                    readonly boundariesPadding: number;
                    readonly fallbackPlacements: Placement[];
                    readonly gpuAcceleration: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly popperOptions: Partial<import("element-plus/es/components/popper").Options>;
                    readonly strategy: import("../../../utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
                    readonly enterable: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly focusOnShow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly trapping: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly stopPopperMouseEvent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                    readonly ariaLabel: string;
                    readonly visible: boolean;
                    readonly pure: boolean;
                    readonly virtualTriggering: boolean;
                }>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly appendTo: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                readonly rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly persistent: BooleanConstructor;
                readonly ariaLabel: StringConstructor;
                readonly visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                readonly transition: StringConstructor;
                readonly teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly disabled: BooleanConstructor;
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                readonly showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                readonly autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            }>>, {
                readonly offset: number;
                readonly effect: string;
                readonly placement: import("../../../utils").EpPropMergeType<StringConstructor, Placement, unknown>;
                readonly showAfter: number;
                readonly hideAfter: number;
                readonly autoClose: number;
                readonly boundariesPadding: number;
                readonly fallbackPlacements: Placement[];
                readonly gpuAcceleration: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly popperOptions: Partial<import("element-plus/es/components/popper").Options>;
                readonly strategy: import("../../../utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
                readonly enterable: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly focusOnShow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly trapping: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly stopPopperMouseEvent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly visible: import("../../../utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
                readonly pure: boolean;
                readonly virtualTriggering: boolean;
                readonly content: string;
                readonly rawContent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly teleported: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly persistent: boolean;
                readonly disabled: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, string[], string, {
            offset: number;
            effect: string;
            placement: import("../../../utils").EpPropMergeType<StringConstructor, Placement, unknown>;
            showAfter: number;
            hideAfter: number;
            autoClose: number;
            boundariesPadding: number;
            fallbackPlacements: Placement[];
            gpuAcceleration: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            popperOptions: Partial<import("element-plus/es/components/popper").Options>;
            strategy: import("../../../utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
            enterable: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            focusOnShow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            trapping: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            stopPopperMouseEvent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            visible: import("../../../utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
            pure: boolean;
            virtualTriggering: boolean;
            content: string;
            rawContent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            teleported: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            persistent: boolean;
            disabled: boolean;
            open: boolean;
            role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            trigger: import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
            triggerKeys: string[];
            arrowOffset: number;
            showArrow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
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
        $nextTick: typeof import("vue").nextTick;
        $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
    } & Readonly<import("vue").ExtractPropTypes<{
        showArrow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
        arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        disabled: BooleanConstructor;
        trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
        triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
        virtualRef: {
            readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        virtualTriggering: BooleanConstructor;
        onMouseenter: {
            readonly type: PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onMouseleave: {
            readonly type: PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onClick: {
            readonly type: PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onKeydown: {
            readonly type: PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onFocus: {
            readonly type: PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onBlur: {
            readonly type: PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        onContextmenu: {
            readonly type: PropType<(e: Event) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        id: StringConstructor;
        open: BooleanConstructor;
        appendTo: {
            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
        rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        persistent: BooleanConstructor;
        ariaLabel: StringConstructor;
        visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
        transition: StringConstructor;
        teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        style: {
            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        className: {
            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
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
        effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
        enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        pure: BooleanConstructor;
        focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
        popperClass: {
            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
                [x: string]: boolean;
            } | (string | {
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
            readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        referenceEl: {
            readonly type: PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        triggerTargetEl: {
            readonly type: PropType<HTMLElement>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        zIndex: NumberConstructor;
        boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
        gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
        offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
        placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
        popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
        strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
        showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
        autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        "onUpdate:visible": {
            readonly type: PropType<(val: boolean) => void>;
            readonly required: false;
            readonly validator: ((val: unknown) => boolean) | undefined;
            __epPropKey: true;
        };
        role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
    }>> & {
        [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
    } & import("vue").ShallowUnwrapRef<{
        props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
            showArrow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, boolean, boolean>;
            arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
            disabled: BooleanConstructor;
            trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            virtualRef: {
                readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            virtualTriggering: BooleanConstructor;
            onMouseenter: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onMouseleave: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onClick: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onKeydown: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onFocus: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onBlur: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            onContextmenu: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            id: StringConstructor;
            open: BooleanConstructor;
            appendTo: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            persistent: BooleanConstructor;
            ariaLabel: StringConstructor;
            visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            transition: StringConstructor;
            teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            style: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            className: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
            effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            pure: BooleanConstructor;
            focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            popperClass: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            referenceEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            triggerTargetEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            zIndex: NumberConstructor;
            boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
            gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
            popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
            strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            "onUpdate:visible": {
                readonly type: PropType<(val: boolean) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & {
            [x: string & `on${string}`]: ((...args: any[]) => any) | undefined;
        }>>;
        emit: (event: string, ...args: any[]) => void;
        id: import("vue").Ref<string>;
        popperRef: import("vue").Ref<({
            $: import("vue").ComponentInternalInstance;
            $data: {};
            $props: Partial<{
                readonly role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
            }> & Omit<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
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
                readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>>, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                triggerRef: import("vue").Ref<HTMLElement | undefined>;
                popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
                contentRef: import("vue").Ref<HTMLElement | undefined>;
                referenceRef: import("vue").Ref<HTMLElement | undefined>;
                role: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
                popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, {
                readonly role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
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
            $nextTick: typeof import("vue").nextTick;
            $watch(source: string | Function, cb: Function, options?: import("vue").WatchOptions<boolean> | undefined): import("vue").WatchStopHandle;
        } & Readonly<import("vue").ExtractPropTypes<{
            readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>> & import("vue").ShallowUnwrapRef<{
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            triggerRef: import("vue").Ref<HTMLElement | undefined>;
            popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
            contentRef: import("vue").Ref<HTMLElement | undefined>;
            referenceRef: import("vue").Ref<HTMLElement | undefined>;
            role: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
            popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
        }> & {} & import("vue").ComponentCustomProperties) | undefined>;
        contentRef: import("vue").Ref<any>;
        updatePopper: () => void;
        open: import("vue").Ref<boolean>;
        toggleReason: import("vue").Ref<Event | undefined>;
        show: (event?: Event | undefined) => void;
        hide: (event?: Event | undefined) => void;
        hasUpdateHandler: import("vue").ComputedRef<boolean>;
        onOpen: (event?: Event | undefined) => void;
        onClose: (event?: Event | undefined) => void;
        controlled: import("vue").ComputedRef<boolean>;
        isFocusInsideContent: (event?: FocusEvent | undefined) => boolean | undefined;
        ElPopper: import("../../../utils").SFCWithInstall<import("vue").DefineComponent<{
            readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            triggerRef: import("vue").Ref<HTMLElement | undefined>;
            popperInstanceRef: import("vue").Ref<import("@popperjs/core").Instance | undefined>;
            contentRef: import("vue").Ref<HTMLElement | undefined>;
            referenceRef: import("vue").Ref<HTMLElement | undefined>;
            role: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>>;
            popperProvides: import("element-plus/es/components/popper").ElPopperInjectionContext;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly role: import("../../../utils").EpPropFinalized<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown, "tooltip", boolean>;
        }>>, {
            readonly role: import("../../../utils").EpPropMergeType<StringConstructor, "group" | "listbox" | "grid" | "menu" | "tooltip" | "dialog" | "navigation" | "tree", unknown>;
        }>> & Record<string, any>;
        ElPopperArrow: import("vue").DefineComponent<{
            readonly arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
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
            arrowOffset: import("vue").Ref<number | undefined>;
            arrowRef: import("vue").Ref<HTMLElement | undefined>;
            arrowStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly arrowOffset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 5, boolean>;
        }>>, {
            readonly arrowOffset: number;
        }>;
        ElTooltipTrigger: import("vue").DefineComponent<{
            readonly disabled: BooleanConstructor;
            readonly trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            readonly triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            readonly virtualRef: {
                readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly virtualTriggering: BooleanConstructor;
            readonly onMouseenter: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onMouseleave: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onClick: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onKeydown: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onFocus: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onBlur: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onContextmenu: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly id: StringConstructor;
            readonly open: BooleanConstructor;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly disabled: BooleanConstructor;
                readonly trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
                readonly triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
                readonly virtualRef: {
                    readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: PropType<(e: Event) => void>;
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
            controlled: import("vue").Ref<boolean>;
            id: import("vue").Ref<string>;
            open: import("vue").Ref<boolean>;
            onOpen: (e?: Event | undefined) => void;
            onClose: (e?: Event | undefined) => void;
            onToggle: (e: Event) => void;
            triggerRef: import("vue").Ref<{
                forwardRef: HTMLElement;
            } | null>;
            stopWhenControlledOrDisabled: () => true | undefined;
            trigger: import("vue").Ref<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>>;
            onMouseenter: (event: Event) => void;
            onMouseleave: (event: Event) => void;
            onClick: (event: Event) => void;
            onFocus: (event: Event) => void;
            onBlur: (event: Event) => void;
            onContextMenu: (event: Event) => void;
            onKeydown: (event: KeyboardEvent) => void;
            ElPopperTrigger: import("vue").DefineComponent<{
                readonly virtualRef: {
                    readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly id: StringConstructor;
                readonly open: BooleanConstructor;
            }, {
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly virtualRef: {
                        readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly virtualTriggering: BooleanConstructor;
                    readonly onMouseenter: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onMouseleave: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onClick: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onKeydown: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onFocus: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onBlur: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly onContextmenu: {
                        readonly type: PropType<(e: Event) => void>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly id: StringConstructor;
                    readonly open: BooleanConstructor;
                }>> & {
                    [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
                }>>;
                role: import("vue").ComputedRef<string>;
                triggerRef: import("vue").Ref<import("element-plus/es/components/popper").Measurable | undefined>;
                ariaControls: import("vue").ComputedRef<string | undefined>;
                ariaDescribedby: import("vue").ComputedRef<string | undefined>;
                ariaHaspopup: import("vue").ComputedRef<string | undefined>;
                ariaExpanded: import("vue").ComputedRef<string | undefined>;
                virtualTriggerAriaStopWatch: undefined;
                ElOnlyChild: import("vue").DefineComponent<{}, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
                    [key: string]: any;
                }> | null, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, import("vue").EmitsOptions, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{}>>, {}>;
            }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                readonly virtualRef: {
                    readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly virtualTriggering: BooleanConstructor;
                readonly onMouseenter: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onMouseleave: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onClick: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onKeydown: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onFocus: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onBlur: {
                    readonly type: PropType<(e: Event) => void>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly onContextmenu: {
                    readonly type: PropType<(e: Event) => void>;
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
            readonly trigger: import("../../../utils").EpPropFinalized<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown, "hover", boolean>;
            readonly triggerKeys: import("../../../utils").EpPropFinalized<(new (...args: any[]) => string[]) | (() => string[]) | ((new (...args: any[]) => string[]) | (() => string[]))[], unknown, unknown, () => string[], boolean>;
            readonly virtualRef: {
                readonly type: PropType<import("element-plus/es/components/popper").Measurable>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly virtualTriggering: BooleanConstructor;
            readonly onMouseenter: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onMouseleave: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onClick: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onKeydown: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onFocus: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onBlur: {
                readonly type: PropType<(e: Event) => void>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly onContextmenu: {
                readonly type: PropType<(e: Event) => void>;
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
            readonly trigger: import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>) | ((new (...args: any[]) => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType> & {}) | (() => import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>))[], unknown, unknown>;
            readonly triggerKeys: string[];
        }>;
        ElTooltipContent: import("vue").DefineComponent<{
            readonly appendTo: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly persistent: BooleanConstructor;
            readonly ariaLabel: StringConstructor;
            readonly visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            readonly transition: StringConstructor;
            readonly teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly disabled: BooleanConstructor;
            readonly id: StringConstructor;
            readonly style: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly className: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
            readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly pure: BooleanConstructor;
            readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly popperClass: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly referenceEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly triggerTargetEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly virtualTriggering: BooleanConstructor;
            readonly zIndex: NumberConstructor;
            readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
            readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
            readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
            readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            readonly showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            readonly autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        }, {
            props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                readonly appendTo: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
                readonly rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly persistent: BooleanConstructor;
                readonly ariaLabel: StringConstructor;
                readonly visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
                readonly transition: StringConstructor;
                readonly teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly disabled: BooleanConstructor;
                readonly id: StringConstructor;
                readonly style: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                readonly showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
                readonly autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            }>> & {
                [x: string & `on${string}`]: ((...args: any[]) => any) | ((...args: unknown[]) => any) | undefined;
            }>>;
            selector: import("vue").ComputedRef<string>;
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
            contentRef: any;
            destroyed: import("vue").Ref<boolean>;
            controlled: import("vue").Ref<boolean>;
            id: import("vue").Ref<string>;
            open: import("vue").Ref<boolean>;
            trigger: import("vue").Ref<import("../../../utils").Arrayable<import("element-plus/es/components/tooltip").TooltipTriggerType>>;
            onClose: (e?: Event | undefined) => void;
            onOpen: (e?: Event | undefined) => void;
            onShow: () => void;
            onHide: () => void;
            onBeforeShow: () => void;
            onBeforeHide: () => void;
            transitionClass: import("vue").ComputedRef<string>;
            persistentRef: import("vue").ComputedRef<boolean>;
            shouldRender: import("vue").ComputedRef<boolean>;
            shouldShow: import("vue").ComputedRef<boolean>;
            appendTo: import("vue").ComputedRef<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
            contentStyle: import("vue").ComputedRef<any>;
            ariaHidden: import("vue").ComputedRef<boolean>;
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly visible: BooleanConstructor;
                readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly ariaLabel: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            }, {
                emit: ((event: "blur") => void) & ((event: "close") => void) & ((event: "focus") => void) & ((event: "mouseenter", evt: MouseEvent) => void) & ((event: "mouseleave", evt: MouseEvent) => void);
                props: Readonly<import("@vue/shared").LooseRequired<Readonly<import("vue").ExtractPropTypes<{
                    readonly id: StringConstructor;
                    readonly style: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly className: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                    readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                    readonly visible: BooleanConstructor;
                    readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly pure: BooleanConstructor;
                    readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                    readonly popperClass: {
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
                            [x: string]: boolean;
                        } | (string | {
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
                        readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly referenceEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly triggerTargetEl: {
                        readonly type: PropType<HTMLElement>;
                        readonly required: false;
                        readonly validator: ((val: unknown) => boolean) | undefined;
                        __epPropKey: true;
                    };
                    readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly ariaLabel: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                    readonly virtualTriggering: BooleanConstructor;
                    readonly zIndex: NumberConstructor;
                    readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                    readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                    readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                    readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                    readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                    readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                    readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
                }>> & {
                    onClose?: (() => any) | undefined;
                    onBlur?: (() => any) | undefined;
                    onFocus?: (() => any) | undefined;
                    onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                    onMouseleave?: ((evt: MouseEvent) => any) | undefined;
                }>>;
                focusStartRef: import("vue").Ref<HTMLElement | "first" | "container" | undefined>;
                trapped: import("vue").Ref<boolean>;
                onFocusAfterReleased: (event: CustomEvent<any>) => void;
                onFocusAfterTrapped: () => void;
                onFocusInTrap: (event: FocusEvent) => void;
                onFocusoutPrevented: (event: CustomEvent<any>) => void;
                onReleaseRequested: () => void;
                attributes: import("vue").ComputedRef<{
                    [key: string]: {
                        [key: string]: string | boolean;
                    };
                }>;
                arrowRef: import("vue").Ref<HTMLElement | undefined>;
                contentRef: import("vue").Ref<HTMLElement | undefined>;
                styles: import("vue").ComputedRef<{
                    [key: string]: Partial<CSSStyleDeclaration>;
                }>;
                instanceRef: import("vue").ComputedRef<import("@popperjs/core").Instance | undefined>;
                role: import("vue").ComputedRef<string>;
                update: () => Promise<Partial<import("@popperjs/core").State>> | undefined;
                ariaModal: import("vue").ComputedRef<string | undefined>;
                arrowStyle: import("vue").ComputedRef<import("vue").CSSProperties>;
                contentAttrs: import("vue").ComputedRef<{
                    [key: string]: string | boolean;
                }>;
                contentClass: import("vue").ComputedRef<((string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
                contentStyle: import("vue").ComputedRef<import("vue").StyleValue[]>;
                updateZIndex: () => void;
                formItemContext: import("../..").FormItemContext | undefined;
                arrowOffset: import("vue").Ref<number | undefined>;
                triggerTargetAriaStopWatch: undefined;
                updatePopper: (shouldUpdateZIndex?: boolean) => void;
                togglePopperAlive: () => void;
                ElFocusTrap: import("vue").DefineComponent<{
                    loop: BooleanConstructor;
                    trapped: BooleanConstructor;
                    focusTrapEl: PropType<HTMLElement>;
                    focusStartEl: {
                        type: PropType<HTMLElement | "first" | "container">;
                        default: string;
                    };
                }, {
                    onKeydown: (e: KeyboardEvent) => void;
                }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested")[], "focusin" | "focusout" | "focusAfterTrapped" | "focusAfterReleased" | "focusout-prevented" | "release-requested", import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
                    loop: BooleanConstructor;
                    trapped: BooleanConstructor;
                    focusTrapEl: PropType<HTMLElement>;
                    focusStartEl: {
                        type: PropType<HTMLElement | "first" | "container">;
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly className: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
                readonly visible: BooleanConstructor;
                readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly pure: BooleanConstructor;
                readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
                readonly popperClass: {
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
                        [x: string]: boolean;
                    } | (string | {
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
                    readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly referenceEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly triggerTargetEl: {
                    readonly type: PropType<HTMLElement>;
                    readonly required: false;
                    readonly validator: ((val: unknown) => boolean) | undefined;
                    __epPropKey: true;
                };
                readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly ariaLabel: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
                readonly virtualTriggering: BooleanConstructor;
                readonly zIndex: NumberConstructor;
                readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
                readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
                readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
                readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
                readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
                readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
                readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            }>> & {
                onClose?: (() => any) | undefined;
                onBlur?: (() => any) | undefined;
                onFocus?: (() => any) | undefined;
                onMouseenter?: ((evt: MouseEvent) => any) | undefined;
                onMouseleave?: ((evt: MouseEvent) => any) | undefined;
            }, {
                readonly offset: number;
                readonly effect: string;
                readonly placement: import("../../../utils").EpPropMergeType<StringConstructor, Placement, unknown>;
                readonly boundariesPadding: number;
                readonly fallbackPlacements: Placement[];
                readonly gpuAcceleration: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly popperOptions: Partial<import("element-plus/es/components/popper").Options>;
                readonly strategy: import("../../../utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
                readonly enterable: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly focusOnShow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly trapping: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly stopPopperMouseEvent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
                readonly ariaLabel: string;
                readonly visible: boolean;
                readonly pure: boolean;
                readonly virtualTriggering: boolean;
            }>;
        }, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
            readonly appendTo: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement) | ((new (...args: any[]) => (string | HTMLElement) & {}) | (() => string | HTMLElement))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly content: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
            readonly rawContent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly persistent: BooleanConstructor;
            readonly ariaLabel: StringConstructor;
            readonly visible: import("../../../utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown, null, boolean>;
            readonly transition: StringConstructor;
            readonly teleported: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly disabled: BooleanConstructor;
            readonly id: StringConstructor;
            readonly style: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly className: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
            readonly effect: import("../../../utils").EpPropFinalized<StringConstructor, unknown, unknown, "dark", boolean>;
            readonly enterable: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly pure: BooleanConstructor;
            readonly focusOnShow: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly trapping: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, false, boolean>;
            readonly popperClass: {
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
                    [x: string]: boolean;
                } | (string | {
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
                readonly type: PropType<import("../../../utils").EpPropMergeType<(new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue) | ((new (...args: any[]) => import("vue").StyleValue & {}) | (() => import("vue").StyleValue))[], unknown, unknown>>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly referenceEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly triggerTargetEl: {
                readonly type: PropType<HTMLElement>;
                readonly required: false;
                readonly validator: ((val: unknown) => boolean) | undefined;
                __epPropKey: true;
            };
            readonly stopPopperMouseEvent: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly virtualTriggering: BooleanConstructor;
            readonly zIndex: NumberConstructor;
            readonly boundariesPadding: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly fallbackPlacements: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Placement[]) | (() => Placement[]) | ((new (...args: any[]) => Placement[]) | (() => Placement[]))[], unknown, unknown, undefined, boolean>;
            readonly gpuAcceleration: import("../../../utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
            readonly offset: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 12, boolean>;
            readonly placement: import("../../../utils").EpPropFinalized<StringConstructor, Placement, unknown, "bottom", boolean>;
            readonly popperOptions: import("../../../utils").EpPropFinalized<(new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>) | ((new (...args: any[]) => Partial<import("element-plus/es/components/popper").Options>) | (() => Partial<import("element-plus/es/components/popper").Options>))[], unknown, unknown, () => {}, boolean>;
            readonly strategy: import("../../../utils").EpPropFinalized<StringConstructor, "fixed" | "absolute", unknown, "absolute", boolean>;
            readonly showAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
            readonly hideAfter: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 200, boolean>;
            readonly autoClose: import("../../../utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
        }>>, {
            readonly offset: number;
            readonly effect: string;
            readonly placement: import("../../../utils").EpPropMergeType<StringConstructor, Placement, unknown>;
            readonly showAfter: number;
            readonly hideAfter: number;
            readonly autoClose: number;
            readonly boundariesPadding: number;
            readonly fallbackPlacements: Placement[];
            readonly gpuAcceleration: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly popperOptions: Partial<import("element-plus/es/components/popper").Options>;
            readonly strategy: import("../../../utils").EpPropMergeType<StringConstructor, "fixed" | "absolute", unknown>;
            readonly enterable: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly focusOnShow: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly trapping: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly stopPopperMouseEvent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly visible: import("../../../utils").EpPropMergeType<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], unknown, unknown>;
            readonly pure: boolean;
            readonly virtualTriggering: boolean;
            readonly content: string;
            readonly rawContent: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly teleported: import("../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>;
            readonly persistent: boolean;
            readonly disabled: boolean;
        }>;
    }> & {} & import("vue").ComponentCustomProperties) | null>;
}, unknown, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, Record<string, any>, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<import("vue").ExtractPropTypes<{
    placement: {
        type: PropType<Placement>;
        default: string;
    };
    store: {
        type: PropType<any>;
    };
    column: {
        type: PropType<TableColumnCtx<unknown>>;
    };
    upDataColumn: {
        type: FunctionConstructor;
    };
}>>, {
    placement: Placement;
}>;
export default _default;
