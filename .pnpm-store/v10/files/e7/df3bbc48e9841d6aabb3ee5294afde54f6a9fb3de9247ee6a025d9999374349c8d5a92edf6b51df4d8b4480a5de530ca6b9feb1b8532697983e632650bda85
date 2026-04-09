import type { AgChartAutoSizedLabelOptions, AgChartAutoSizedSecondaryLabelOptions, AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { AgMarkerShape, ContextDefault, DatumDefault, Degree, PixelSize, Ratio } from '../../chart/types';
import type { FillOptions, LineDashOptions, StrokeOptions } from '../../series/cartesian/commonOptions';
import type { AgBaseGaugeThemeableOptions, AgGaugeCornerMode, AgGaugeScaleLabel, AgGaugeSegmentation, FillsOptions } from './commonOptions';
export type AgRadialGaugeTargetPlacement = 'inside' | 'outside' | 'middle';
export interface AgRadialGaugeLabelFormatterParams {
    value: number;
}
export interface AgRadialGaugeScaleInterval {
    /** Array of values in scale units for specified intervals along the scale. The values in this array must be compatible with the scale type. */
    values?: number[];
    /** The scale interval. Expressed in the units of the scale. If the configured interval results in too many items given the chart size, it will be ignored. */
    step?: number;
}
export interface AgRadialGaugeScaleLabel<TContext = ContextDefault> extends AgGaugeScaleLabel<TContext> {
}
export interface AgRadialGaugeSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgRadialGaugeScale<TContext = ContextDefault> extends FillsOptions, AgRadialGaugeSeriesStyle {
    /** Maximum value of the scale. Any values exceeding this number will be clipped to this maximum. */
    min?: number;
    /** Minimum value of the scale. Any values exceeding this number will be clipped to this minimum. */
    max?: number;
    /** Configuration for the scale labels. */
    label?: AgRadialGaugeScaleLabel<TContext>;
    /** Configuration for the ticks interval. */
    interval?: AgRadialGaugeScaleInterval;
}
export interface AgRadialGaugeTooltipRendererParams extends AgSeriesTooltipRendererParams<DatumDefault, ContextDefault> {
    /** Value of the Gauge */
    value: number;
}
export interface AgRadialGaugeBarStyle extends FillsOptions, AgRadialGaugeSeriesStyle {
    /** Whether the bar should be shown. */
    enabled?: boolean;
}
export interface AgRadialGaugeNeedleStyle extends AgRadialGaugeSeriesStyle {
    /** Whether the needle should be shown. */
    enabled?: boolean;
    /** Ratio of the size of the needle. */
    radiusRatio?: number;
    /** Spacing between radiusRatio, in pixels. */
    spacing?: number;
}
export type AgRadialGaugeMarkerShape = AgMarkerShape | 'line';
export interface AgRadialGaugeTargetLabelOptions extends AgChartLabelOptions<never, never, ContextDefault> {
    /** Spacing of the label. */
    spacing?: PixelSize;
}
export interface AgRadialGaugeTarget extends AgRadialGaugeSeriesStyle {
    /** Value to use to position the target */
    value: number;
    /** Text to use for the target label. */
    text?: string;
    /** The shape to use for the markers. You can also supply a custom marker by providing a `AgMarkerShapeFn` function. */
    shape?: AgRadialGaugeMarkerShape;
    /** Placement of target. */
    placement?: AgRadialGaugeTargetPlacement;
    /** Spacing of the target. Ignored when placement is 'middle'. */
    spacing?: PixelSize;
    /** Size of the target. */
    size?: PixelSize;
    /** Rotation of the target, in degrees. */
    rotation?: Degree;
    /** Label options for all targets. */
    label?: AgRadialGaugeTargetLabelOptions;
}
export interface AgRadialGaugeLabelOptions extends AgChartAutoSizedLabelOptions<never, AgRadialGaugeLabelFormatterParams, ContextDefault> {
    /** Text to always display. */
    text?: string;
}
export interface AgRadialGaugeSecondaryLabelOptions extends AgChartAutoSizedSecondaryLabelOptions<never, AgRadialGaugeLabelFormatterParams, ContextDefault> {
    /** Text to always display. */
    text?: string;
}
export interface AgRadialGaugeThemeableOptions<TContext = ContextDefault> extends AgBaseGaugeThemeableOptions<TContext> {
    /** Outer radius of the gauge. */
    outerRadius?: PixelSize;
    /** Inner radius of the gauge. */
    innerRadius?: PixelSize;
    /** Ratio of the outer radius of the gauge. */
    outerRadiusRatio?: Ratio;
    /** Ratio of the inner radius of the gauge. */
    innerRadiusRatio?: Ratio;
    /** Angle in degrees of the start of the gauge. */
    startAngle?: Degree;
    /** Angle in degrees of the end of the gauge. */
    endAngle?: Degree;
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
    /** Configuration for the needle. */
    needle?: AgRadialGaugeNeedleStyle;
    /** Configuration for the scale. */
    scale?: AgRadialGaugeScale<TContext>;
    /** Configuration for the bar. */
    bar?: AgRadialGaugeBarStyle;
    /** Configuration for the labels shown inside the shape. */
    label?: AgRadialGaugeLabelOptions;
    /** Configuration for the labels shown inside the shape. */
    secondaryLabel?: AgRadialGaugeSecondaryLabelOptions;
    /** Distance between the shape edges and the text. */
    spacing?: PixelSize;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgRadialGaugeTooltipRendererParams>;
}
export interface AgRadialGaugePreset<TContext = ContextDefault> extends AgRadialGaugeThemeableOptions<TContext> {
    /** Configuration for the Radial Gauge. */
    type: 'radial-gauge';
    /** Value of the Radial Gauge. */
    value: number;
    /** Configuration for the targets. */
    targets?: AgRadialGaugeTarget[];
}
