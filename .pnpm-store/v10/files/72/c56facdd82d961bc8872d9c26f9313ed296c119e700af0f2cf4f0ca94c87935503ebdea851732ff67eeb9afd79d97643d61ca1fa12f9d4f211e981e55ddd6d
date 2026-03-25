import type { Arrayable } from 'element-plus/es/utils';
import type { ExtractPropTypes } from 'vue';
import type { SliderMarkerProps } from './marker';
import type Slider from './slider.vue';
declare type SliderMarks = Record<number, string | SliderMarkerProps['mark']>;
export interface SliderInitData {
    firstValue: number;
    secondValue: number;
    oldValue?: Arrayable<number>;
    dragging: boolean;
    sliderSize: number;
}
export declare const sliderProps: {
    readonly modelValue: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => Arrayable<number> & {}) | (() => Arrayable<number>) | ((new (...args: any[]) => Arrayable<number> & {}) | (() => Arrayable<number>))[], unknown, unknown, 0, boolean>;
    readonly id: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
    readonly min: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 0, boolean>;
    readonly max: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 100, boolean>;
    readonly step: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 1, boolean>;
    readonly showInput: BooleanConstructor;
    readonly showInputControls: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly size: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly inputSize: {
        readonly type: import("vue").PropType<import("element-plus/es/utils").EpPropMergeType<StringConstructor, "" | "default" | "small" | "large", never>>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly showStops: BooleanConstructor;
    readonly showTooltip: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
    readonly formatTooltip: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (val: number) => number | string) | (() => (val: number) => number | string) | {
        (): (val: number) => number | string;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (val: number) => number | string) | (() => (val: number) => number | string) | {
        (): (val: number) => number | string;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, undefined, boolean>;
    readonly disabled: BooleanConstructor;
    readonly range: BooleanConstructor;
    readonly vertical: BooleanConstructor;
    readonly height: StringConstructor;
    readonly debounce: import("element-plus/es/utils").EpPropFinalized<NumberConstructor, unknown, unknown, 300, boolean>;
    readonly label: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
    readonly rangeStartLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
    readonly rangeEndLabel: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
    readonly formatValueText: import("element-plus/es/utils").EpPropFinalized<(new (...args: any[]) => (val: number) => string) | (() => (val: number) => string) | {
        (): (val: number) => string;
        new (): any;
        readonly prototype: any;
    } | ((new (...args: any[]) => (val: number) => string) | (() => (val: number) => string) | {
        (): (val: number) => string;
        new (): any;
        readonly prototype: any;
    })[], unknown, unknown, undefined, boolean>;
    readonly tooltipClass: import("element-plus/es/utils").EpPropFinalized<StringConstructor, unknown, unknown, undefined, boolean>;
    readonly placement: import("element-plus/es/utils").EpPropFinalized<StringConstructor, import("@popperjs/core").Placement, unknown, "top", boolean>;
    readonly marks: {
        readonly type: import("vue").PropType<SliderMarks>;
        readonly required: false;
        readonly validator: ((val: unknown) => boolean) | undefined;
        __epPropKey: true;
    };
    readonly validateEvent: import("element-plus/es/utils").EpPropFinalized<BooleanConstructor, unknown, unknown, true, boolean>;
};
export declare type SliderProps = ExtractPropTypes<typeof sliderProps>;
export declare const sliderEmits: {
    "update:modelValue": (value: Arrayable<number>) => boolean;
    input: (value: Arrayable<number>) => boolean;
    change: (value: Arrayable<number>) => boolean;
};
export declare type SliderEmits = typeof sliderEmits;
export declare type SliderInstance = InstanceType<typeof Slider>;
export {};
