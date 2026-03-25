import type { AgAnnotation } from '../chart/annotationsOptions';
import type { AgInitialStateLegendOptions } from '../chart/legendOptions';
import type { Ratio } from '../chart/types';
import type { AgAutoScaledAxes } from '../chart/zoomOptions';
import type { AgPriceVolumeChartType } from '../presets/financial/priceVolumeOptions';
import type { AgStateSerializableDate } from './stateTypes';
export interface AgInitialStateThemeableOptions {
    zoom?: AgInitialStateZoomOptions;
    legend?: AgInitialStateLegendOptions[];
}
export interface AgInitialStateOptions {
    /** The initial set of annotations to display on the chart. */
    annotations?: AgAnnotation[];
    chartType?: AgInitialStateChartType;
    /** The initial zoom state. */
    zoom?: AgInitialStateZoomOptions;
    /** The initial legend state. */
    legend?: AgInitialStateLegendOptions[];
}
export type AgInitialStateChartType = AgPriceVolumeChartType;
export interface AgInitialStateZoomOptions {
    rangeX?: AgInitialStateZoomRange;
    rangeY?: AgInitialStateZoomRange;
    ratioX?: AgInitialStateZoomRatio;
    ratioY?: AgInitialStateZoomRatio;
    /** Axes that are zoomed by the auto scaling functionality. */
    autoScaledAxes?: AgAutoScaledAxes;
}
export interface AgInitialStateZoomRange {
    start?: AgStateSerializableDate | number;
    end?: AgStateSerializableDate | number;
}
export interface AgInitialStateZoomRatio {
    start?: Ratio;
    end?: Ratio;
}
