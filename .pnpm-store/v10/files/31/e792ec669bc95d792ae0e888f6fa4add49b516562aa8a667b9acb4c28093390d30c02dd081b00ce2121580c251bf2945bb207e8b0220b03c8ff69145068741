import type { ExtractPropTypes, h as H, VNode } from 'vue';
import type Transfer from './transfer.vue';
export declare type TransferKey = string | number;
export declare type TransferDirection = 'left' | 'right';
export declare type TransferDataItem = Record<string, any>;
export declare type renderContent = (h: typeof H, option: TransferDataItem) => VNode | VNode[];
export interface TransferFormat {
    noChecked?: string;
    hasChecked?: string;
}
export interface TransferPropsAlias {
    label?: string;
    key?: string;
    disabled?: string;
}
export interface TransferCheckedState {
    leftChecked: TransferKey[];
    rightChecked: TransferKey[];
}
export declare const LEFT_CHECK_CHANGE_EVENT = "left-check-change";
export declare const RIGHT_CHECK_CHANGE_EVENT = "right-check-change";
export declare const transferProps: {
    readonly data: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferDataItem[]) | (() => TransferDataItem[]) | ((new (...args: any[]) => TransferDataItem[]) | (() => TransferDataItem[]))[], unknown, unknown, () => never[], boolean>;
    readonly titles: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => [string, string]) | (() => [string, string]) | ((new (...args: any[]) => [string, string]) | (() => [string, string]))[], unknown, unknown, () => never[], boolean>;
    readonly buttonTexts: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => [string, string]) | (() => [string, string]) | ((new (...args: any[]) => [string, string]) | (() => [string, string]))[], unknown, unknown, () => never[], boolean>;
    readonly filterPlaceholder: StringConstructor;
    readonly filterMethod: {
        readonly type: import("vue").PropType<(query: string, item: TransferDataItem) => boolean>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly leftDefaultChecked: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferKey[]) | (() => TransferKey[]) | ((new (...args: any[]) => TransferKey[]) | (() => TransferKey[]))[], unknown, unknown, () => never[], boolean>;
    readonly rightDefaultChecked: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferKey[]) | (() => TransferKey[]) | ((new (...args: any[]) => TransferKey[]) | (() => TransferKey[]))[], unknown, unknown, () => never[], boolean>;
    readonly renderContent: {
        readonly type: import("vue").PropType<renderContent>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferKey[]) | (() => TransferKey[]) | ((new (...args: any[]) => TransferKey[]) | (() => TransferKey[]))[], unknown, unknown, () => never[], boolean>;
    readonly format: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferFormat) | (() => TransferFormat) | ((new (...args: any[]) => TransferFormat) | (() => TransferFormat))[], unknown, unknown, () => {}, boolean>;
    readonly filterable: BooleanConstructor;
    readonly props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferPropsAlias) | (() => TransferPropsAlias) | ((new (...args: any[]) => TransferPropsAlias) | (() => TransferPropsAlias))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{
        readonly label: "label";
        readonly key: "key";
        readonly disabled: "disabled";
    }>, boolean>;
    readonly targetOrder: import("element-plus/es/utils").EpPropFinalized<StringConstructor, "push" | "unshift" | "original", unknown, "original", boolean>;
    readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
};
export declare type TransferProps = ExtractPropTypes<typeof transferProps>;
export declare const transferCheckedChangeFn: (value: TransferKey[], movedKeys?: TransferKey[] | undefined) => boolean;
export declare const transferEmits: {
    change: (value: TransferKey[], direction: TransferDirection, movedKeys: TransferKey[]) => boolean;
    "update:modelValue": (value: TransferKey[]) => boolean;
    "left-check-change": (value: TransferKey[], movedKeys?: TransferKey[] | undefined) => boolean;
    "right-check-change": (value: TransferKey[], movedKeys?: TransferKey[] | undefined) => boolean;
};
export declare type TransferEmits = typeof transferEmits;
export declare type TransferInstance = InstanceType<typeof Transfer>;
