import type { ExtractPropTypes } from 'vue';
import type { Dayjs } from 'dayjs';
export declare type GetDisabledHours = (role: string, comparingDate?: Dayjs) => number[];
export declare type GetDisabledMinutes = (hour: number, role: string, comparingDate?: Dayjs) => number[];
export declare type GetDisabledSeconds = (hour: number, minute: number, role: string, comparingDate?: Dayjs) => number[];
export declare const disabledTimeListsProps: {
    readonly disabledHours: {
        readonly type: import("vue").PropType<GetDisabledHours>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly disabledMinutes: {
        readonly type: import("vue").PropType<GetDisabledMinutes>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly disabledSeconds: {
        readonly type: import("vue").PropType<GetDisabledSeconds>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
};
export declare type DisabledTimeListsProps = ExtractPropTypes<typeof disabledTimeListsProps>;
export declare const timePanelSharedProps: {
    readonly visible: BooleanConstructor;
    readonly actualVisible: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, undefined, boolean>;
    readonly format: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, "", boolean>;
};
export declare type TimePanelSharedProps = ExtractPropTypes<typeof timePanelSharedProps>;
