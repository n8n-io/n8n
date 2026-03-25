import type { ExtractPropTypes, VNode } from 'vue';
import type { TransferDataItem, TransferKey } from './transfer';
import type TransferPanel from './transfer-panel.vue';
export interface TransferPanelState {
    checked: TransferKey[];
    allChecked: boolean;
    query: string;
    checkChangeByUser: boolean;
}
export declare const CHECKED_CHANGE_EVENT = "checked-change";
export declare const transferPanelProps: {
    readonly data: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferDataItem[]) | (() => TransferDataItem[]) | ((new (...args: any[]) => TransferDataItem[]) | (() => TransferDataItem[]))[], unknown, unknown, () => never[], boolean>;
    readonly optionRender: {
        readonly type: import("vue").PropType<(option: TransferDataItem) => VNode | VNode[]>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly placeholder: StringConstructor;
    readonly title: StringConstructor;
    readonly filterable: BooleanConstructor;
    readonly format: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("./transfer").TransferFormat) | (() => import("./transfer").TransferFormat) | ((new (...args: any[]) => import("./transfer").TransferFormat) | (() => import("./transfer").TransferFormat))[], unknown, unknown, () => {}, boolean>;
    readonly filterMethod: {
        readonly type: import("vue").PropType<(query: string, item: TransferDataItem) => boolean>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly defaultChecked: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => TransferKey[]) | (() => TransferKey[]) | ((new (...args: any[]) => TransferKey[]) | (() => TransferKey[]))[], unknown, unknown, () => never[], boolean>;
    readonly props: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => import("./transfer").TransferPropsAlias) | (() => import("./transfer").TransferPropsAlias) | ((new (...args: any[]) => import("./transfer").TransferPropsAlias) | (() => import("./transfer").TransferPropsAlias))[], unknown, unknown, () => import("element-plus/es/utils").Mutable<{
        readonly label: "label";
        readonly key: "key";
        readonly disabled: "disabled";
    }>, boolean>;
};
export declare type TransferPanelProps = ExtractPropTypes<typeof transferPanelProps>;
export declare const transferPanelEmits: {
    "checked-change": (value: TransferKey[], movedKeys?: TransferKey[] | undefined) => boolean;
};
export declare type TransferPanelEmits = typeof transferPanelEmits;
export declare type TransferPanelInstance = InstanceType<typeof TransferPanel>;
