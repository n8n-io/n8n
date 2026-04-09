import type { AgChartAutoSizedLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { AgMarkerShape, ContextDefault, DatumDefault, Degree, Direction, PixelSize } from '../../chart/types';
import type { FillOptions, LineDashOptions, StrokeOptions } from '../../series/cartesian/commonOptions';
import type { AgBaseGaugeThemeableOptions, AgGaugeCornerMode, AgGaugeScaleLabel, AgGaugeSegmentation, FillsOptions } from './commonOptions';
export type AgLinearGaugeTargetPlacement = 'before' | 'after' | 'middle';
export interface AgLinearGaugeSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgLinearGaugeScaleInterval {
    /** Array of values in scale units for specified intervals along the scale. The values in this array must be compatible with the scale type. */
    values?: number[];
    /** The scale interval. Expressed in the units of the scale. If the configured interval results in too many items given the chart size, it will be ignored. */
    step?: number;
}
export interface AgLinearGaugeScaleLabel<TContext = ContextDefault> extends AgGaugeScaleLabel<TContext> {
    /** Placement of labels */
    placement?: 'before' | 'after';
}
export interface AgLinearGaugeScale<TContext = ContextDefault> extends AgLinearGaugeSeriesStyle, FillsOptions {
    /** Maximum value of the scale. Any values exceeding this number will be clipped to this maximum. */
    min?: number;
    /** Minimum value of the scale. Any values exceeding this number will be clipped to this minimum. */
    max?: number;
    /** Configuration for the scale labels. */
    label?: AgLinearGaugeScaleLabel<TContext>;
    /** Configuration for the ticks interval. */
    interval?: AgLinearGaugeScaleInterval;
}
export interface AgLinearGaugeTooltipRendererParams extends AgSeriesTooltipRendererParams<DatumDefault, ContextDefault> {
    /** Value of the Gauge */
    value: number;
}
export interface AgLinearGaugeBarStyle extends AgLinearGaugeSeriesStyle, FillsOptions {
    /** Whether the bar should be shown. */
    enabled?: boolean;
    /** Width of the bar, or the height if `horizontal` is true. Defaults to the gauge thickness. */
    thickness?: number;
    /** Thickness of the bar in proportion to the gauge thickness. Ignored if `thickness` is set. */
    thicknessRatio?: number;
}
export type AgLinearGaugeMarkerShape = AgMarkerShape | 'line';
export interface AgLinearGaugeTarget extends AgLinearGaugeSeriesStyle {
    /** Value to use to position the target */
    value: number;
    /** Text to use for the target label. */
    text?: string;
    /** The shape to use for the markers. You can also supply a custom marker by providing a `AgMarkerShapeFn` function. */
    shape?: AgLinearGaugeMarkerShape;
    /** Placement of target. */
    placement?: AgLinearGaugeTargetPlacement;
    /** Spacing of the target. Ignored when placement is 'middle'. */
    spacing?: PixelSize;
    /** Size of the target. */
    size?: PixelSize;
    /** Rotation of the target, in degrees. */
    rotation?: Degree;
}
export type AgLinearGaugeLabelPlacement = 'inside-start' | 'outside-start' | 'inside-end' | 'outside-end' | 'inside-center' | 'bar-inside' | 'bar-inside-end' | 'bar-outside-end' | 'bar-end';
export interface AgLinearGaugeLabelOptions extends AgChartAutoSizedLabelOptions<never, unknown, ContextDefault> {
    /** Text to always display. */
    text?: string;
    /** Distance between the shape edges and the text. */
    spacing?: PixelSize;
    /**
     * Avoid label collisions with the bar and/or scale.
     *
     * Default: `true`
     */
    avoidCollisions?: boolean;
    /** Placement of the label. */
    placement?: AgLinearGaugeLabelPlacement;
}
export interface AgLinearGaugeThemeableOptions<TContext = ContextDefault> extends AgBaseGaugeThemeableOptions<TContext> {
    /** Direction to display the gauge in. */
    direction?: Direction;
    /** Width of the gauge, or the height if `direction` is `horizontal`. */
    thickness?: number;
    /** Configuration for a segmented appearance. */
    segmentation?: AgGaugeSegmentation;
    /** Apply rounded corners to the gauge. */
    cornerRadius?: number;
    /**
     * Configuration on whether to apply `cornerRadius` only to the ends of the gauge, or each individual item within the gauge.
     *
     * Default: `container`
     **/
    cornerMode?: AgGaugeCornerMode;
    /** Configuration for the bar. */
    bar?: AgLinearGaugeBarStyle;
    /** Configuration for the labels shown inside the shape. */
    label?: AgLinearGaugeLabelOptions;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgLinearGaugeTooltipRendererParams>;
}
export interface AgLinearGaugePreset<TContext = ContextDefault> extends AgLinearGaugeThemeableOptions<TContext> {
    /** Configuration for the Linear Gauge. */
    type: 'linear-gauge';
    /** Value of the Linear Gauge. */
    value: number;
    /** Scale of the Linear Gauge. */
    scale?: AgLinearGaugeScale<TContext>;
    /** Configuration for the targets. */
    targets?: AgLinearGaugeTarget[];
}
