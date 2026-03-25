import type { ContextCallbackParams, DatumCallbackParams, Styler } from '../../chart/callbackOptions';
import type { AgChartAutoSizedLabelOptions, AgChartAutoSizedSecondaryLabelOptions, AgChartLabelOptions } from '../../chart/labelOptions';
import type { AgSeriesTooltip, AgSeriesTooltipRendererParams } from '../../chart/tooltipOptions';
import type { ContextDefault, CssColor, DatumDefault, Opacity, PixelSize } from '../../chart/types';
import type { AgColorType, FillOptions, StrokeOptions } from '../cartesian/commonOptions';
import type { AgBaseSeriesOptions, AgBaseSeriesThemeableOptions } from '../seriesOptions';
export type AgSunburstSeriesLabelHighlightOptions<TDatum, TContext = ContextDefault> = Pick<AgChartLabelOptions<TDatum, AgSunburstSeriesLabelFormatterParams<TDatum>, TContext>, 'color'>;
export interface AgSunburstSeriesTooltipRendererParams<TDatum, TContext = ContextDefault> extends AgSeriesTooltipRendererParams<TDatum, TContext>, AgSunburstSeriesOptionsKeys, AgSunburstSeriesOptionsNames, AgSunburstSeriesStyle {
    /** The depth of the datum in the hierarchy. */
    depth: number;
}
export interface AgSunburstSeriesHighlightStyle<TDatum, TContext = ContextDefault> extends AgSunburstSeriesStyle {
    /** Options for the label in a sector. */
    label?: AgSunburstSeriesLabelHighlightOptions<TDatum, TContext>;
    /** Options for a secondary, smaller label in a sector - displayed under the primary label. */
    secondaryLabel?: AgSunburstSeriesLabelHighlightOptions<TDatum, TContext>;
}
export interface AgSunburstSeriesThemeableOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesThemeableOptions<TDatum, TContext>, 'highlightStyle' | 'highlight' | 'showInLegend'> {
    /** Options for the label in a sector. */
    label?: AgChartAutoSizedLabelOptions<TDatum, AgSunburstSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Options for a secondary, smaller label in a sector - displayed under the primary label. */
    secondaryLabel?: AgChartAutoSizedSecondaryLabelOptions<TDatum, AgSunburstSeriesLabelFormatterParams<TDatum>, TContext>;
    /** Apply rounded corners to each sector. */
    cornerRadius?: PixelSize;
    /** Spacing between the sectors. */
    sectorSpacing?: PixelSize;
    /** Minimum distance between text and the edges of the sectors. */
    padding?: PixelSize;
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
    /** The colour range to interpolate the numeric colour domain (min and max `colorKey` values) into. */
    colorRange?: CssColor[];
    /** Series-specific tooltip configuration. */
    tooltip?: AgSeriesTooltip<AgSunburstSeriesTooltipRendererParams<TDatum, TContext>>;
    /** A callback function for adjusting the styles of a particular Sunburst sector based on the input parameters. */
    itemStyler?: Styler<AgSunburstSeriesItemStylerParams<TDatum, TContext>, AgSunburstSeriesStyle>;
    /** Style overrides when a node is hovered. */
    highlightStyle?: AgSunburstSeriesHighlightStyle<TDatum, TContext>;
}
export interface AgSunburstSeriesOptions<TDatum = DatumDefault, TContext = ContextDefault> extends Omit<AgBaseSeriesOptions<TDatum, TContext>, 'highlight' | 'highlightStyle' | 'showInLegend'>, AgSunburstSeriesOptionsKeys, AgSunburstSeriesOptionsNames, AgSunburstSeriesThemeableOptions<TDatum, TContext> {
    /** Configuration for the Sunburst Series. */
    type: 'sunburst';
}
export interface AgSunburstSeriesOptionsKeys {
    /** The name of the node key containing the label. */
    labelKey?: string;
    /** The name of the node key containing a secondary label. */
    secondaryLabelKey?: string;
    /** The name of the node key containing the children. Defaults to `children`. */
    childrenKey?: string;
    /** The name of the node key containing the size value. */
    sizeKey?: string;
    /** The name of the node key containing the colour value. This value (along with `colorRange` config) will be used to determine the segment colour. */
    colorKey?: string;
}
export interface AgSunburstSeriesOptionsNames {
    /** A human-readable description of the size values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    sizeName?: string;
    /** A human-readable description of the colour values. If supplied, this will be shown in the default tooltip and passed to the tooltip renderer as one of the parameters. */
    colorName?: string;
}
/** The parameters of the Sunburst series formatter function */
export interface AgSunburstSeriesItemStylerParams<TDatum, TContext = ContextDefault> extends DatumCallbackParams<TDatum>, ContextCallbackParams<TContext>, AgSunburstSeriesOptionsKeys, Required<AgSunburstSeriesStyle> {
    /** The depth of the datum in the hierarchy. */
    depth: number;
}
export interface AgSunburstSeriesLabelFormatterParams<_TDatum = DatumDefault> extends AgSunburstSeriesOptionsKeys, AgSunburstSeriesOptionsNames {
    /** The depth of the datum in the hierarchy. */
    depth: number;
}
/** The formatted style of a Sunburst sector. */
export type AgSunburstSeriesStyle = FillOptions & StrokeOptions;
