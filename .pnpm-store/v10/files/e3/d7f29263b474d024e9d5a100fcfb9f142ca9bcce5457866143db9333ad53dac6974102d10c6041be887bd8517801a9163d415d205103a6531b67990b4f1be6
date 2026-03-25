import type { ExtractPropType } from 'element-plus/es/utils';
import type { ExtractPropTypes, Ref } from 'vue';
declare const _prop: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null) | ((new (...args: any[]) => (boolean | null) & {}) | (() => boolean | null))[], never, never, null, false>;
declare const _event: {
    readonly type: import("vue").PropType<(val: boolean) => void>;
    readonly required: false;
    readonly validator: ((val: unknown) => boolean) | undefined;
    __epPropKey: true;
};
export declare type UseModelTogglePropsRaw<T extends string> = {
    [K in T]: typeof _prop;
} & {
    [K in `onUpdate:${T}`]: typeof _event;
};
export declare type UseModelTogglePropsGeneric<T extends string> = {
    [K in T]: ExtractPropType<typeof _prop>;
} & {
    [K in `onUpdate:${T}`]: ExtractPropType<typeof _event>;
};
export declare const createModelToggleComposable: <T extends string>(name: T) => {
    useModelToggle: ({ indicator, toggleReason, shouldHideWhenRouteChanges, shouldProceed, onShow, onHide, }: ModelToggleParams) => {
        hide: (event?: Event | undefined) => void;
        show: (event?: Event | undefined) => void;
        toggle: () => void;
        hasUpdateHandler: import("vue").ComputedRef<boolean>;
    };
    useModelToggleProps: UseModelTogglePropsRaw<T>;
    useModelToggleEmits: `update:${T}`[];
};
declare const useModelToggle: ({ indicator, toggleReason, shouldHideWhenRouteChanges, shouldProceed, onShow, onHide, }: ModelToggleParams) => {
    hide: (event?: Event | undefined) => void;
    show: (event?: Event | undefined) => void;
    toggle: () => void;
    hasUpdateHandler: import("vue").ComputedRef<boolean>;
}, useModelToggleProps: UseModelTogglePropsRaw<"modelValue">, useModelToggleEmits: "update:modelValue"[];
export { useModelToggle, useModelToggleEmits, useModelToggleProps };
export declare type UseModelToggleProps = ExtractPropTypes<typeof useModelToggleProps>;
export declare type ModelToggleParams = {
    indicator: Ref<boolean>;
    toggleReason?: Ref<Event | undefined>;
    shouldHideWhenRouteChanges?: Ref<boolean>;
    shouldProceed?: () => boolean;
    onShow?: (event?: Event) => void;
    onHide?: (event?: Event) => void;
};
