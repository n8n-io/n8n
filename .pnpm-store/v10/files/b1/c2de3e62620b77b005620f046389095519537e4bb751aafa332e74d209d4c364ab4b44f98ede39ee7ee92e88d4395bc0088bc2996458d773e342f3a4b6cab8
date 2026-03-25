import type { Component, ExtractPropTypes } from 'vue';
import type ImageViewer from './image-viewer.vue';
export declare type ImageViewerAction = 'zoomIn' | 'zoomOut' | 'clockwise' | 'anticlockwise';
export declare const imageViewerProps: {
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
};
export declare type ImageViewerProps = ExtractPropTypes<typeof imageViewerProps>;
export declare const imageViewerEmits: {
    close: () => boolean;
    switch: (index: number) => boolean;
    rotate: (deg: number) => boolean;
};
export declare type ImageViewerEmits = typeof imageViewerEmits;
export interface ImageViewerMode {
    name: string;
    icon: Component;
}
export declare type ImageViewerInstance = InstanceType<typeof ImageViewer>;
