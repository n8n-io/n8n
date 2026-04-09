import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgDropShadowOptions } from '../../chart/dropShadowOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, DatumKey, Degree, Opacity, PixelSize, Ratio } from '../../chart/types';
import type { AgColorType, FillOptions, FontOptions, LineDashOptions, StrokeOptions, Toggleable } from '../cartesian/commonOptions';
import type { AgBaseSeriesOptions, AgBaseSeriesThemeableOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions } from '../seriesOptions';
export interface AgDonutSeriesLabelOptions<TDatum, TParams, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, TParams, TContext> {
    /** Distance in pixels between the callout line and the label text. */
    offset?: PixelSize;
    /** Minimum angle in degrees required for a sector to show a label. */
    minAngle?: Degree;
    /** Avoid callout label collision and overflow by automatically moving colliding labels or reducing the Donut radius. If set to `false`, callout labels may collide with each other and the Donut radius will not change to prevent clipping of callout labels. */
    avoidCollisions?: boolean;
}
export interface AgDonutSeriesSectorLabelOptions<TDatum, TParams, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, TParams, TContext> {
    /** Distance in pixels, used to make the label text closer to or further from the center. This offset is applied after positionRatio. */
    positionOffset?: PixelSize;
    /** Position of labels as a ratio proportional to Donut radius (or Donut thickness). Additional offset in pixels can be applied by using positionOffset. */
    positionRatio?: Ratio;
}
export type AgDonutSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgDonutSeriesOptionsKeys<TDatum> & Required<AgDonutSeriesStyle>;
export interface AgDonutSeriesStyle extends FillOptions, StrokeOptions, LineDashOptions {
    /** Apply rounded corners to each sector. */
    cornerRadius?: PixelSize;
}
export interface AgDonutTitleOptions extends Toggleable, FontOptions {
    /** The text to display. */
    text?: string;
    /** Spacing added to help position the text. */
    spacing?: PixelSize;
    /** Whether the title text should be shown in the legend. */
    showInLegend?: boolean;
}
export interface AgDonutCalloutLineItemStylerParams<TDatum, TContext> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgDonutSeriesLabelFormatterParams<TDatum> {
}
export interface AgDonutCalloutLineItemStylerResult {
    /** The colour for this callout line. */
    color?: CssColor;
    /** The length in pixels of the callout lines. */
    length?: PixelSize;
    /** The width in pixels of the stroke for callout lines. */
    strokeWidth?: PixelSize;
}
export interface AgDonutSeriesCalloutOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** The colours to cycle through for the strokes of the callouts. */
    colors?: CssColor[];
    /** The length in pixels of the callout lines. */
    length?: PixelSize;
    /** The width in pixels of the stroke for callout lines. */
    strokeWidth?: PixelSize;
    /** Function used to style individual callout lines. */
    itemStyler?: Styler<AgDonutCalloutLineItemStylerParams<TDatum, TContext>, AgDonutCalloutLineItemStylerResult>;
}
export interface AgDonutInnerLabel extends FontOptions {
    /** The text to show in the inner label. */
    text: string;
    /** The spacing in pixels before and after the inner label. */
    spacing?: PixelSize;
}
export interface AgDonutInnerLabelThemeOptions extends Omit<AgDonutInnerLabel, 'text'> {
}
export interface AgDonutInnerCircle {
    /** The colour of the fill for the inner circle. */
    fill: CssColor;
    /** The opacity of the fill for the inner circle. */
    fillOpacity?: Opacity;
}
export interface AgDonutSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseSeriesThemeableOptions<TDatum, TContext>, LineDashOptions {
    /** Configuration for the series title. */
    title?: AgDonutTitleOptions;
    /** Configuration for the labels used outside the sectors. */
    calloutLabel?: AgDonutSeriesLabelOptions<TDatum, AgDonutSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Configuration for the labels used inside the sectors. */
    sectorLabel?: AgDonutSeriesSectorLabelOptions<TDatum, AgDonutSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Configuration for the callout lines used with the labels for the sectors. */
    calloutLine?: AgDonutSeriesCalloutOptions<TDatum, TContext>;
    /** The colours to cycle through for the fills of the sectors. */
    fills?: AgColorType[];
    /** The colours to cycle through for the strokes of the sectors. */
    strokes?: CssColor[];
    /** The opacity of the fill for the sectors. */
    fillOpacity?: Opacity;
    /** The opacity of the stroke for the sectors. */
    strokeOpacity?: Opacity;
    /** The width in pixels of the stroke for the sectors. */
    strokeWidth?: PixelSize;
    /** The rotation of the Donut series in degrees. */
    rotation?: Degree;
    /** The offset in pixels of the outer radius of the series. */
    outerRadiusOffset?: PixelSize;
    /** The ratio of the outer radius of the series. Used to adjust the outer radius proportionally to the automatically calculated value. */
    outerRadiusRatio?: Ratio;
    /** The offset in pixels of the inner radius of the series. */
    innerRadiusOffset?: PixelSize;
    /**
     * The ratio of the inner radius of the series.
     *
     * Default: `0.7`
     */
    innerRadiusRatio?: Ratio;
    /** Override of the automatically determined minimum radiusKey value from the data. */
    radiusMin?: number;
    /** Override of the automatically determined maximum radiusKey value from the data. */
    radiusMax?: number;
    /** Configuration for the shadow used behind the chart series. */
    shadow?: AgDropShadowOptions;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgDonutSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Configuration for the text lines to display inside the series. */
    innerLabels?: AgDonutInnerLabelThemeOptions;
    /** Configuration for the area inside the series. */
    innerCircle?: AgDonutInnerCircle;
    /** Apply rounded corners to each sector. */
    cornerRadius?: PixelSize;
    /** The spacing between Donut sectors. */
    sectorSpacing?: PixelSize;
    /** Whether items with a value of 0 should be hidden in the legend. */
    hideZeroValueSectorsInLegend?: boolean;
    /** A styler function for adjusting the styling of the Donut sectors. */
    itemStyler?: Styler<AgDonutSeriesItemStylerParams<TDatum, TContext>, AgDonutSeriesStyle>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
}
export interface AgDonutSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgDonutSeriesThemeableOptions<TDatum, TContext>, 'innerLabels'>, AgDonutSeriesOptionsKeys<TDatum>, AgDonutSeriesOptionsNames, Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'> {
    /** Configuration for Donut Series. */
    type: 'donut';
    /** Configuration for the text lines to display inside the series. */
    innerLabels?: AgDonutInnerLabel[];
}
export interface AgDonutSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve angle values from the data. */
    angleKey: DatumKey<TDatum>;
    /** The key to use to retrieve radius values from the data. */
    radiusKey?: DatumKey<TDatum>;
    /** The key to use to retrieve label values from the data. */
    calloutLabelKey?: DatumKey<TDatum>;
    /** The key to use to retrieve sector label values from the data. */
    sectorLabelKey?: DatumKey<TDatum>;
    /** The key to use to retrieve legend item labels from the data. If multiple series share this key they will be merged in the legend. */
    legendItemKey?: DatumKey<TDatum>;
}
export interface AgDonutSeriesOptionsNames {
    /** A human-readable description of the angle values. If supplied, this will be passed to the tooltip renderer as one of the parameters. */
    angleName?: string;
    /** A human-readable description of the radius values. If supplied, this will be passed to the tooltip renderer as one of the parameters. */
    radiusName?: string;
    /** A human-readable description of the label values. If supplied, this will be passed to the tooltip renderer as one of the parameters. */
    calloutLabelName?: string;
    /** A human-readable description of the sector label values. If supplied, this will be passed to the tooltip renderer as one of the parameters. */
    sectorLabelName?: string;
}
export interface AgDonutSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgDonutSeriesOptionsKeys<TDatum>, AgDonutSeriesOptionsNames, FillOptions, StrokeOptions, LineDashOptions {
}
export type AgDonutSeriesLabelFormatterParams<TDatum = DatumDefault> = AgDonutSeriesOptionsKeys<TDatum> & AgDonutSeriesOptionsNames;
