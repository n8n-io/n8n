import type { AgAreaSeriesOptions, AgAreaSeriesThemeableOptions } from '../series/cartesian/areaOptions';
import type { AgBarSeriesOptions, AgBarSeriesThemeableOptions } from '../series/cartesian/barOptions';
import type { AgBoxPlotSeriesOptions, AgBoxPlotSeriesThemeableOptions } from '../series/cartesian/boxPlotOptions';
import type { AgBubbleSeriesOptions, AgBubbleSeriesThemeableOptions } from '../series/cartesian/bubbleOptions';
import type { AgCandlestickSeriesOptions, AgCandlestickSeriesThemeableOptions } from '../series/cartesian/candlestickOptions';
import type { AgHeatmapSeriesOptions, AgHeatmapSeriesThemeableOptions } from '../series/cartesian/heatmapOptions';
import type { AgHistogramSeriesOptions, AgHistogramSeriesThemeableOptions } from '../series/cartesian/histogramOptions';
import type { AgLineSeriesOptions, AgLineSeriesThemeableOptions } from '../series/cartesian/lineOptions';
import type { AgOhlcSeriesOptions, AgOhlcSeriesThemeableOptions } from '../series/cartesian/ohlcOptions';
import type { AgRangeAreaSeriesOptions, AgRangeAreaSeriesThemeableOptions } from '../series/cartesian/rangeAreaOptions';
import type { AgRangeBarSeriesOptions, AgRangeBarSeriesThemeableOptions } from '../series/cartesian/rangeBarOptions';
import type { AgScatterSeriesOptions, AgScatterSeriesThemeableOptions } from '../series/cartesian/scatterOptions';
import type { AgWaterfallSeriesOptions, AgWaterfallSeriesThemeableOptions } from '../series/cartesian/waterfallOptions';
import type { AgAxisLabelFormatterParams } from './axisOptions';
import type { Formatter } from './callbackOptions';
import type { ContextDefault, CssColor, DatumDefault, FontFamilyFull, FontSize, FontStyle, FontWeight, Opacity, PixelSize } from './types';
type SharedProperties<A, B> = {
    [K in keyof A & keyof B as A[K] extends B[K] ? (B[K] extends A[K] ? K : never) : never]: A[K];
};
export interface AgNavigatorMiniChartIntervalOptions {
    /** Maximum gap in pixels between labels. */
    minSpacing?: PixelSize;
    /** Maximum gap in pixels between labels. */
    maxSpacing?: PixelSize;
    /** Array of values in axis units to display as labels along the axis. The values in this array must be compatible with the axis type. */
    values?: any[];
    /** The step value between labels, specified as a number or time interval. If the configured interval results in too many labels given the chart size, it will be ignored. */
    step?: number;
}
export interface AgNavigatorMiniChartLabelOptions<TContext = ContextDefault> {
    /** Configuration for interval between the Mini Chart's axis labels. */
    interval?: AgNavigatorMiniChartIntervalOptions;
    /** Set to `false` to hide the axis labels. */
    enabled?: boolean;
    /** The font style to use for the labels. */
    fontStyle?: FontStyle;
    /** The font weight to use for the labels. */
    fontWeight?: FontWeight;
    /** The font size in pixels to use for the labels. */
    fontSize?: FontSize;
    /** The font family to use for the labels. */
    fontFamily?: FontFamilyFull;
    /** Spacing in pixels between the axis labels and the Mini Chart. */
    spacing?: PixelSize;
    /** The colour to use for the labels. */
    color?: CssColor;
    /** Avoid axis label collision by automatically reducing the number of labels displayed. If set to `false`, axis labels may collide. */
    avoidCollisions?: boolean;
    /** Format string used when rendering labels. */
    format?: string;
    /** Function used to render axis labels. If `value` is a number, `fractionDigits` will also be provided, which indicates the number of fractional digits used in the step between intervals; for example, a tick step of `0.0005` would have `fractionDigits` set to `4`. */
    formatter?: Formatter<AgAxisLabelFormatterParams<TContext>>;
}
export interface AgNavigatorMiniChartPadding {
    /** Padding between the top edge of the Navigator and the Mini Chart series. */
    top?: number;
    /** Padding between the bottom edge of the Navigator and the Mini Chart series. */
    bottom?: number;
}
export type CommonIgnoredProperties = 'context' | 'cursor' | 'highlight' | 'highlightStyle' | 'listeners' | 'nodeClickRange' | 'showInLegend' | 'showInMiniChart' | 'tooltip' | 'visible' | 'xName' | 'yName';
export type BarIgnoredProperties = CommonIgnoredProperties | 'errorBar' | 'label' | 'legendItemName' | 'direction';
export type BoxPlotIgnoredProperties = CommonIgnoredProperties | 'direction' | 'legendItemName' | 'minName' | 'q1Name' | 'medianName' | 'q3Name' | 'maxName';
export type BubbleIgnoredProperties = CommonIgnoredProperties | 'title' | 'label' | 'labelKey' | 'labelName' | 'sizeName';
export type HeatmapIgnoredProperties = CommonIgnoredProperties | 'title' | 'label' | 'colorName' | 'textAlign' | 'verticalAlign' | 'itemPadding' | 'colorRange';
export type HistogramIgnoredProperties = CommonIgnoredProperties | 'label';
export type LineIgnoredProperties = CommonIgnoredProperties | 'errorBar' | 'title' | 'label';
export type RangeAreaIgnoredProperties = CommonIgnoredProperties | 'label' | 'yLowName' | 'yHighName';
export type RangeBarIgnoredProperties = CommonIgnoredProperties | 'label' | 'direction' | 'yLowName' | 'yHighName';
export type ScatterIgnoredProperties = CommonIgnoredProperties | 'errorBar' | 'title' | 'label' | 'labelKey' | 'labelName';
export type WaterfallIgnoredProperties = CommonIgnoredProperties | 'direction';
export interface AgLineMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgLineSeriesOptions<TDatum, TContext>, LineIgnoredProperties>> {
}
export interface AgScatterMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgScatterSeriesOptions<TDatum, TContext>, ScatterIgnoredProperties>> {
}
export interface AgBubbleMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgBubbleSeriesOptions<TDatum, TContext>, BubbleIgnoredProperties>> {
}
export interface AgAreaMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgAreaSeriesOptions<TDatum, TContext>, CommonIgnoredProperties>> {
}
export interface AgBarMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgBarSeriesOptions<TDatum, TContext>, BarIgnoredProperties>> {
}
export interface AgBoxPlotMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgBoxPlotSeriesOptions<TDatum, TContext>, BoxPlotIgnoredProperties>> {
}
export interface AgHistogramMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgHistogramSeriesOptions<TDatum, TContext>, HistogramIgnoredProperties>> {
}
export interface AgHeatmapMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgHeatmapSeriesOptions<TDatum, TContext>, HeatmapIgnoredProperties>> {
}
export interface AgWaterfallMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgWaterfallSeriesOptions<TDatum, TContext>, WaterfallIgnoredProperties>> {
}
export interface AgRangeBarMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgRangeBarSeriesOptions<TDatum, TContext>, RangeBarIgnoredProperties>> {
}
export interface AgRangeAreaMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgRangeAreaSeriesOptions<TDatum, TContext>, RangeAreaIgnoredProperties>> {
}
export interface AgCandlestickMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgCandlestickSeriesOptions<TDatum, TContext>, CommonIgnoredProperties>> {
}
export interface AgOhlcMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Partial<Omit<AgOhlcSeriesOptions<TDatum, TContext>, CommonIgnoredProperties>> {
}
export type AgMiniChartSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> = AgLineMiniChartSeriesOptions<TDatum, TContext> | AgScatterMiniChartSeriesOptions<TDatum, TContext> | AgBubbleMiniChartSeriesOptions<TDatum, TContext> | AgAreaMiniChartSeriesOptions<TDatum, TContext> | AgBarMiniChartSeriesOptions<TDatum, TContext> | AgBoxPlotMiniChartSeriesOptions<TDatum, TContext> | AgHistogramMiniChartSeriesOptions<TDatum, TContext> | AgHeatmapMiniChartSeriesOptions<TDatum, TContext> | AgWaterfallMiniChartSeriesOptions<TDatum, TContext> | AgRangeBarMiniChartSeriesOptions<TDatum, TContext> | AgRangeAreaMiniChartSeriesOptions<TDatum, TContext> | AgCandlestickMiniChartSeriesOptions<TDatum, TContext> | AgOhlcMiniChartSeriesOptions<TDatum, TContext>;
export type AgMiniChartSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> = SharedProperties<AgLineMiniChartSeriesOptions<TDatum, TContext>, AgLineSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgScatterMiniChartSeriesOptions<TDatum, TContext>, AgScatterSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgBubbleMiniChartSeriesOptions<TDatum, TContext>, AgBubbleSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgAreaMiniChartSeriesOptions<TDatum, TContext>, AgAreaSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgBarMiniChartSeriesOptions<TDatum, TContext>, AgBarSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgBoxPlotMiniChartSeriesOptions<TDatum, TContext>, AgBoxPlotSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgHistogramMiniChartSeriesOptions<TDatum, TContext>, AgHistogramSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgHeatmapMiniChartSeriesOptions<TDatum, TContext>, AgHeatmapSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgWaterfallMiniChartSeriesOptions<TDatum, TContext>, AgWaterfallSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgRangeBarMiniChartSeriesOptions<TDatum, TContext>, AgRangeBarSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgRangeAreaMiniChartSeriesOptions<TDatum, TContext>, AgRangeAreaSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgCandlestickMiniChartSeriesOptions<TDatum, TContext>, AgCandlestickSeriesThemeableOptions<TDatum, TContext>> | SharedProperties<AgOhlcMiniChartSeriesOptions<TDatum, TContext>, AgOhlcSeriesThemeableOptions<TDatum, TContext>>;
export interface AgNavigatorMiniChartOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Whether to show a Mini Chart in the Navigator. */
    enabled?: boolean;
    /** Override series used in Mini Chart. */
    series?: AgMiniChartSeriesOptions<TDatum, TContext>[];
    /** Configuration for the Mini Chart's axis labels. */
    label?: AgNavigatorMiniChartLabelOptions<TContext>;
    /** Configuration for the padding inside the Mini Chart. */
    padding?: AgNavigatorMiniChartPadding;
}
export interface AgNavigatorMiniChartThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Whether to show a Mini Chart in the Navigator. */
    enabled?: boolean;
    /** Override series used in Mini Chart. */
    series?: AgMiniChartSeriesThemeableOptions<TDatum, TContext>;
    /** Configuration for the Mini Chart's axis labels. */
    label?: AgNavigatorMiniChartLabelOptions<TContext>;
    /** Configuration for the padding inside the Mini Chart. */
    padding?: AgNavigatorMiniChartPadding;
}
export interface AgNavigatorMaskOptions {
    /** The fill colour used by the mask. */
    fill?: CssColor;
    /** The opacity of the mask's fill in the `[0, 1]` interval, where `0` is effectively no masking. */
    fillOpacity?: Opacity;
    /** The stroke colour used by the mask. */
    stroke?: CssColor;
    /** The stroke width used by the mask. */
    strokeWidth?: PixelSize;
}
export interface AgNavigatorHandleOptions {
    /** The fill colour used by the handle. */
    fill?: CssColor;
    /** The stroke colour used by the handle. */
    stroke?: CssColor;
    /** The stroke width used by the handle. */
    strokeWidth?: PixelSize;
    /** The width of the handle. */
    width?: PixelSize;
    /** The height of the handle. */
    height?: PixelSize;
    /** The corner radius of the handle. */
    cornerRadius?: PixelSize;
    /** Whether to enable the grip dots. */
    grip?: boolean;
}
export interface AgNavigatorOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Whether to show the Navigator. */
    enabled?: boolean;
    /** The height of the Navigator. */
    height?: PixelSize;
    /** The corner radius used by the Navigator. */
    cornerRadius?: number;
    /** The distance between the Navigator and the bottom axis of the chart. */
    spacing?: PixelSize;
    /** Configuration for the Navigator's visible range mask. */
    mask?: AgNavigatorMaskOptions;
    /** Configuration for the Navigator's left handle. */
    minHandle?: AgNavigatorHandleOptions;
    /** Configuration for the Navigator's right handle. */
    maxHandle?: AgNavigatorHandleOptions;
    /** Mini Chart options. */
    miniChart?: AgNavigatorMiniChartOptions<TDatum, TContext>;
}
export interface AgNavigatorThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgNavigatorOptions<TDatum, TContext>, 'miniChart'> {
    /** Mini Chart options. */
    miniChart?: AgNavigatorMiniChartThemeableOptions<TDatum, TContext>;
}
export {};
