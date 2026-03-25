import type { AgDropShadowOptions } from '../../chart/dropShadowOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip } from '../../chart/tooltipOptions';
import type { ContextDefault, DatumDefault, DatumKey, PixelSize } from '../../chart/types';
import type { AgInterpolationType } from '../interpolationOptions';
import type { AgSeriesMarkerOptions, AgSeriesMarkerStyle } from '../markerOptions';
import type { AgBaseCartesianThemeableOptions, AgBaseSeriesOptions, AgHighlightStyleOptions, AgMultiSeriesHighlightOptions, AgSeriesHighlightStyle } from '../seriesOptions';
import type { AgCartesianSeriesTooltipRendererParams } from './cartesianSeriesTooltipOptions';
import type { FillOptions, LineDashOptions, StrokeOptions } from './commonOptions';
export interface AgRangeAreaSeriesTooltipRendererParams<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgCartesianSeriesTooltipRendererParams<TDatum, TContext>, 'xKey' | 'xName' | 'yKey' | 'yName'>, AgRangeAreaSeriesOptionsKeys<TDatum>, AgRangeAreaSeriesOptionsNames, Omit<AgSeriesMarkerStyle, 'shape'> {
    /** Hovered marker */
    itemId: 'up' | 'down' | 'unknown';
}
export interface AgRangeAreaSeriesLabelOptions<TDatum, TParams, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, TParams, TContext> {
    /** Where to render series labels relative to the area. */
    placement?: AgRangeAreaSeriesLabelPlacement;
    /** Spacing in pixels between the label and the edge of the marker. */
    spacing?: PixelSize;
}
export type AgRangeAreaSeriesLabelPlacement = 'inside' | 'outside';
export type AgRangeAreaSeriesLabelFormatterParams<TDatum = DatumDefault> = AgRangeAreaSeriesOptionsKeys<TDatum> & AgRangeAreaSeriesOptionsNames;
export interface AgRangeAreaSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends StrokeOptions, FillOptions, LineDashOptions, AgBaseCartesianThemeableOptions<TDatum, TContext> {
    /** Configuration for the markers used in the series.  */
    marker?: AgSeriesMarkerOptions<TDatum, AgRangeAreaSeriesOptionsKeys<TDatum>, TContext>;
    /** Configuration for the line used in the series. */
    interpolation?: AgInterpolationType;
    /** @deprecated Configuration for the range series items when they are hovered over. */
    highlightStyle?: AgSeriesHighlightStyle;
    /** Configuration for the labels shown on top of data points. */
    label?: AgRangeAreaSeriesLabelOptions<TDatum, AgRangeAreaSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Configuration for the shadow used behind the series items. */
    shadow?: AgDropShadowOptions;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgRangeAreaSeriesTooltipRendererParams<TDatum, TContext>>;
    /** Set to `true` to connect across missing data points. */
    connectMissingData?: boolean;
    /** Configuration for highlighting when a series or legend item is hovered over. */
    highlight?: AgMultiSeriesHighlightOptions<AgHighlightStyleOptions, AgHighlightStyleOptions>;
}
export interface AgRangeAreaSeriesOptionsKeys<TDatum = DatumDefault> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-low-values from the data. */
    yLowKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-high-values from the data. */
    yHighKey: DatumKey<TDatum>;
}
export interface AgRangeAreaSeriesOptionsNames {
    /** A human-readable description of the x-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    xName?: string;
    /** A human-readable description of the y-low-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yLowName?: string;
    /** A human-readable description of the y-high-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yHighName?: string;
    /** A human-readable description of the y-values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    yName?: string;
}
export interface AgRangeAreaSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight'>, AgRangeAreaSeriesOptionsKeys<TDatum>, AgRangeAreaSeriesOptionsNames, AgRangeAreaSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Range Area Series. */
    type: 'range-area';
}
