import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, PixelSize } from '../../chart/types';
import type { AgColorType, FillOptions, LineDashOptions, StrokeOptions } from '../cartesian/commonOptions';
import type { AgBaseSeriesOptions, AgBaseSeriesThemeableOptions } from '../seriesOptions';
export interface AgSankeySeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseSeriesOptions<TDatum, TContext>, AgSankeySeriesOptionsKeys, AgSankeySeriesOptionsNames, AgSankeySeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Sankey Series. */
    type: 'sankey';
}
export interface AgSankeySeriesLinkItemStylerParams<TDatum, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgSankeySeriesOptionsKeys, Required<AgSankeySeriesLinkStyle> {
}
export interface AgSankeySeriesNodeItemStylerParams<TDatum, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgSankeySeriesOptionsKeys, Required<AgSankeySeriesNodeStyle> {
    /** Label of the node */
    label: string | undefined;
    /** Size of the node */
    size: number;
}
export interface AgSankeySeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseSeriesThemeableOptions<TDatum, TContext> {
    /** Options for the label for each node. */
    label?: AgSankeySeriesLabelOptions<TDatum, TContext>;
    /** The colours to cycle through for the fills of the nodes and links. */
    fills?: AgColorType[];
    /** The colours to cycle through for the strokes of the nodes and links. */
    strokes?: CssColor[];
    /** Options for the links. */
    link?: AgSankeySeriesLinkOptions<TDatum, TContext>;
    /** Options for the nodes. */
    node?: AgSankeySeriesNodeOptions<TDatum, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgSankeySeriesTooltipRendererParams<TDatum, TContext>>;
}
export interface AgSankeySeriesLabelOptions<TDatum, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, AgSankeySeriesLabelFormatterParams<TDatum>, TContext> {
    /** Spacing between a node and its label. */
    spacing?: PixelSize;
    /** Placement of a label relative to its node. */
    placement?: 'left' | 'right' | 'center';
    /** Placement of an edge label relative to its node. */
    edgePlacement?: 'inside' | 'outside';
}
export interface AgSankeySeriesLinkStyle extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgSankeySeriesLinkOptions<TDatum, TContext = ContextDefault> extends AgSankeySeriesLinkStyle {
    /** Function used to return formatting for individual links, based on the given parameters.*/
    itemStyler?: Styler<AgSankeySeriesLinkItemStylerParams<TDatum, TContext>, AgSankeySeriesLinkStyle>;
}
export interface AgSankeySeriesNodeStyle extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgSankeySeriesNodeOptions<TDatum, TContext = ContextDefault> extends AgSankeySeriesNodeStyle {
    /**
     * Spacing between the nodes.
     *
     * Default: `20`
     */
    spacing?: PixelSize;
    /**
     * Minimum spacing between the nodes when the series area is reduced in height.
     *
     * Default: `0`
     */
    minSpacing?: PixelSize;
    /**
     * Width of the nodes.
     *
     * Default: `1`
     */
    width?: PixelSize;
    /**
     * Alignment of the nodes.
     *
     * Default: `'justify'`
     */
    alignment?: 'left' | 'right' | 'center' | 'justify';
    /**
     * Vertical alignment of the nodes.
     *
     * Default: `'center'`
     */
    verticalAlignment?: 'top' | 'bottom' | 'center';
    /**
     * Sorting method of the nodes.
     *
     * Default: `'auto'`
     */
    sort?: 'data' | 'ascending' | 'descending' | 'auto';
    /** Function used to return formatting for individual nodes, based on the given parameters.*/
    itemStyler?: Styler<AgSankeySeriesNodeItemStylerParams<TDatum, TContext>, AgSankeySeriesNodeStyle>;
}
export interface AgSankeySeriesOptionsKeys {
    /** The key containing the start node of each link. */
    fromKey?: string;
    /** The key containing the end node of each link. */
    toKey?: string;
    /** The key containing the size of each link. */
    sizeKey?: string;
}
export interface AgSankeySeriesOptionsNames {
    /** A human-readable description of the size values.
     * If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    sizeName?: string;
}
interface SizeParams {
    size: number;
}
export interface AgSankeySeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgSankeySeriesOptionsKeys, AgSankeySeriesOptionsNames, SizeParams {
}
export interface AgSankeySeriesLabelFormatterParams<_TDatum = DatumDefault> extends AgSankeySeriesOptionsKeys, SizeParams {
}
export {};
