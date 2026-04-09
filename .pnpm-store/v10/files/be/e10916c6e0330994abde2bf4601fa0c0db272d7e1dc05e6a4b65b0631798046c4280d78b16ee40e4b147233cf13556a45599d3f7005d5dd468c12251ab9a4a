import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, PixelSize, Ratio } from '../../chart/types';
import type { AgColorType, FillOptions, LineDashOptions, StrokeOptions } from '../cartesian/commonOptions';
import type { AgBaseSeriesOptions, AgBaseSeriesThemeableOptions } from '../seriesOptions';
export interface AgChordSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseSeriesOptions<TDatum, TContext>, AgChordSeriesOptionsKeys, AgChordSeriesOptionsNames, AgChordSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Chord Series. */
    type: 'chord';
}
export interface AgChordSeriesLinkItemStylerParams<TDatum, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgChordSeriesOptionsKeys, Required<AgChordSeriesLinkStyle> {
}
export interface AgChordSeriesNodeItemStylerParams<TDatum, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgChordSeriesOptionsKeys, Required<AgChordSeriesNodeStyle> {
    /** Label of the node */
    label: string | undefined;
    /** Size of the node */
    size: number;
}
export interface AgChordSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseSeriesThemeableOptions<TDatum, TContext> {
    /** Options for the label for each node. */
    label?: AgChordSeriesLabelOptions<TDatum, TContext>;
    /** The colours to cycle through for the fills of the nodes and links. */
    fills?: AgColorType[];
    /** The colours to cycle through for the strokes of the nodes and links. */
    strokes?: CssColor[];
    /** Options for the links. */
    link?: AgChordSeriesLinkOptions<TDatum, TContext>;
    /** Options for the nodes. */
    node?: AgChordSeriesNodeOptions<TDatum, TContext>;
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgChordSeriesTooltipRendererParams<TDatum, TContext>>;
}
export interface AgChordSeriesLabelOptions<TDatum, TContext = ContextDefault> extends AgChartLabelOptions<TDatum, AgChordSeriesLabelFormatterParams<TDatum>, TContext> {
    /** Spacing between a node and its label. */
    spacing?: PixelSize;
    /** If the label text exceeds the maximum length, it will be truncated and an ellipsis will be appended to indicate this. */
    maxWidth?: PixelSize;
}
export interface AgChordSeriesLinkStyle extends FillOptions, StrokeOptions, LineDashOptions {
    /** Tension of the links. 0 gives a maximally curved link, and 1 gives a straight line. */
    tension?: Ratio;
}
export interface AgChordSeriesLinkOptions<TDatum, TContext = ContextDefault> extends AgChordSeriesLinkStyle {
    /** Function used to return formatting for individual links, based on the given parameters.*/
    itemStyler?: Styler<AgChordSeriesLinkItemStylerParams<TDatum, TContext>, AgChordSeriesLinkStyle>;
}
export interface AgChordSeriesNodeStyle extends FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgChordSeriesNodeOptions<TDatum, TContext = ContextDefault> extends AgChordSeriesNodeStyle {
    /** Minimum spacing between the nodes. */
    spacing?: PixelSize;
    /** Width of the nodes. */
    width?: PixelSize;
    /** Function used to return formatting for individual nodes, based on the given parameters.*/
    itemStyler?: Styler<AgChordSeriesNodeItemStylerParams<TDatum, TContext>, AgChordSeriesNodeStyle>;
}
export interface AgChordSeriesOptionsKeys {
    /** The key containing the start node of each link. */
    fromKey?: string;
    /** The key containing the end node of each link. */
    toKey?: string;
    /** The key containing the size of each link. */
    sizeKey?: string;
}
export interface AgChordSeriesOptionsNames {
    /** A human-readable description of the size values.
     * If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    sizeName?: string;
}
interface SizeParams {
    size: number;
}
export interface AgChordSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgChordSeriesOptionsKeys, AgChordSeriesOptionsNames, SizeParams, FillOptions, StrokeOptions, LineDashOptions {
}
export interface AgChordSeriesLabelFormatterParams<_TDatum = DatumDefault> extends AgChordSeriesOptionsKeys, SizeParams {
}
export {};
