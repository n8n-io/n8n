import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgChartAutoSizedSecondaryLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, DatumKey, GeoJSON, PixelSize } from '../../chart/types';
import type { FillOptions, LineDashOptions, StrokeOptions } from '../cartesian/commonOptions';
import type { AgBaseSeriesOptions, AgBaseSeriesThemeableOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions, AgSeriesHighlightStyle } from '../seriesOptions';
export interface AgMapShapeSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgMapShapeSeriesOptionsKeys<TDatum>, AgMapShapeSeriesOptionsNames, AgMapShapeSeriesStyle {
}
export type AgMapShapeSeriesHighlightStyle<_TDatum> = AgSeriesHighlightStyle & FillOptions & StrokeOptions;
export type AgMapShapeSeriesStyle = FillOptions & StrokeOptions & LineDashOptions;
export type AgMapShapeSeriesLabelFormatterParams<TDatum = DatumDefault> = AgMapShapeSeriesOptionsKeys<TDatum> & AgMapShapeSeriesOptionsNames;
export type AgMapShapeSeriesItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & AgMapShapeSeriesOptionsKeys<TDatum> & Required<AgMapShapeSeriesStyle>;
export interface AgMapShapeSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The name of the node key containing the id value. */
    idKey?: DatumKey<TDatum>;
    /** The name of the node key containing the colour value. This value (along with `colorRange` config) will be used to determine the segment colour. */
    colorKey?: DatumKey<TDatum>;
    /** The key to use to retrieve values from the data to use as labels inside shapes. */
    labelKey?: DatumKey<TDatum>;
}
export interface AgMapShapeSeriesOptionsNames {
    /** A human-readable description of the id-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    idName?: string;
    /** A human-readable description of the colour values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    colorName?: string;
    /** A human-readable description of the label values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    labelName?: string;
}
export interface AgMapShapeSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgMapShapeSeriesStyle, Omit<AgBaseSeriesThemeableOptions<TDatum, TContext>, 'highlightStyle' | 'highlight'> {
    /** The colour range to interpolate the numeric colour domain (min and max `colorKey` values) into. */
    colorRange?: CssColor[];
    /** Configuration for the labels shown inside the shape. */
    label?: AgChartAutoSizedSecondaryLabelOptions<TDatum, AgMapShapeSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Distance between the shape edges and the text. */
    padding?: PixelSize;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgMapShapeSeriesTooltipRendererParams<TDatum, TContext>>;
    /** A callback function for adjusting the styles of a particular Map shape based on the input parameters. */
    itemStyler?: Styler<AgMapShapeSeriesItemStylerParams<TDatum, TContext>, AgMapShapeSeriesStyle>;
    /** @deprecated Style overrides when a node is hovered. */
    highlightStyle?: AgMapShapeSeriesHighlightStyle<TDatum>;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
}
export interface AgMapShapeSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlightStyle' | 'highlight'>, AgMapShapeSeriesOptionsKeys<TDatum>, AgMapShapeSeriesOptionsNames, AgMapShapeSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Map Shape Series. */
    type: 'map-shape';
    /** GeoJSON data. */
    topology?: GeoJSON;
    /**
     * The property to reference in the topology to match up with data.
     *
     * Default: `name`
     */
    topologyIdKey?: string;
    /** The title to use for the series. */
    title?: string;
    /**
     * The text to display in the legend for this series.
     * If multiple series share this value, they will be merged for the legend toggle behaviour.
     */
    legendItemName?: string;
}
