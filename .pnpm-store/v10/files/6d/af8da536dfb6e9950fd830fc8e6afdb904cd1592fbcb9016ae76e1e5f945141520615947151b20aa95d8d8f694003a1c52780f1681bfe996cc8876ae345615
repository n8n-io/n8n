import type { AgInitialStateThemeableOptions } from '../api/initialStateOptions';
import type { AgLinearGaugeTarget, AgLinearGaugeThemeableOptions } from '../presets/gauge/linearGaugeOptions';
import type { AgRadialGaugeTarget, AgRadialGaugeThemeableOptions } from '../presets/gauge/radialGaugeOptions';
import type { AgAreaSeriesThemeableOptions } from '../series/cartesian/areaOptions';
import type { AgBarSeriesThemeableOptions } from '../series/cartesian/barOptions';
import type { AgBoxPlotSeriesThemeableOptions } from '../series/cartesian/boxPlotOptions';
import type { AgBubbleSeriesThemeableOptions } from '../series/cartesian/bubbleOptions';
import type { AgCandlestickSeriesThemeableOptions } from '../series/cartesian/candlestickOptions';
import type { AgColorType, AgColorTypeStrict } from '../series/cartesian/commonOptions';
import type { AgConeFunnelSeriesThemeableOptions } from '../series/cartesian/coneFunnelOptions';
import type { AgFunnelSeriesThemeableOptions } from '../series/cartesian/funnelOptions';
import type { AgHeatmapSeriesThemeableOptions } from '../series/cartesian/heatmapOptions';
import type { AgHistogramSeriesThemeableOptions } from '../series/cartesian/histogramOptions';
import type { AgLineSeriesThemeableOptions } from '../series/cartesian/lineOptions';
import type { AgOhlcSeriesThemeableOptions } from '../series/cartesian/ohlcOptions';
import type { AgRangeAreaSeriesThemeableOptions } from '../series/cartesian/rangeAreaOptions';
import type { AgRangeBarSeriesThemeableOptions } from '../series/cartesian/rangeBarOptions';
import type { AgScatterSeriesThemeableOptions } from '../series/cartesian/scatterOptions';
import type { AgWaterfallSeriesThemeableOptions } from '../series/cartesian/waterfallOptions';
import type { AgDonutSeriesThemeableOptions } from '../series/polar/donutOptions';
import type { AgNightingaleSeriesThemeableOptions } from '../series/polar/nightingaleOptions';
import type { AgPieSeriesThemeableOptions } from '../series/polar/pieOptions';
import type { AgRadarAreaSeriesThemeableOptions } from '../series/polar/radarAreaOptions';
import type { AgRadarSeriesThemeableOptions } from '../series/polar/radarOptions';
import type { AgRadialBarSeriesThemeableOptions } from '../series/polar/radialBarOptions';
import type { AgRadialColumnSeriesThemeableOptions } from '../series/polar/radialColumnOptions';
import type { AgChordSeriesThemeableOptions } from '../series/standalone/chordOptions';
import type { AgPyramidSeriesThemeableOptions } from '../series/standalone/pyramidOptions';
import type { AgSankeySeriesThemeableOptions } from '../series/standalone/sankeyOptions';
import type { AgBaseStandaloneThemeOptions } from '../series/standalone/standaloneOptions';
import type { AgSunburstSeriesThemeableOptions } from '../series/standalone/sunburstOptions';
import type { AgTreemapSeriesThemeableOptions } from '../series/standalone/treemapOptions';
import type { AgMapLineBackgroundThemeableOptions } from '../series/topology/mapLineBackgroundOptions';
import type { AgMapLineSeriesThemeableOptions } from '../series/topology/mapLineOptions';
import type { AgMapMarkerSeriesThemeableOptions } from '../series/topology/mapMarkerOptions';
import type { AgMapShapeBackgroundThemeableOptions } from '../series/topology/mapShapeBackgroundOptions';
import type { AgMapShapeSeriesThemeableOptions } from '../series/topology/mapShapeOptions';
import type { AgBaseTopologyThemeOptions } from '../series/topology/topologyOptions';
import type { AgAnnotationsThemeableOptions } from './annotationsOptions';
import type { AgBaseCartesianThemeOptions, AgCartesianAxesTheme, AgContinuousCartesianAxesTheme } from './cartesianOptions';
import type { AgBaseChartOptions, AgBaseThemeableChartOptions } from './chartOptions';
import type { AgChartToolbarThemeableOptions } from './chartToolbarOptions';
import type { AgBasePolarThemeOptions, AgPolarAxesTheme } from './polarOptions';
import type { AgChartThemeParams } from './themeParamsOptions';
import type { ContextDefault, CssColor, DatumDefault } from './types';
export type AgChartThemeName = 'ag-default' | 'ag-default-dark' | 'ag-sheets' | 'ag-sheets-dark' | 'ag-polychroma' | 'ag-polychroma-dark' | 'ag-vivid' | 'ag-vivid-dark' | 'ag-material' | 'ag-material-dark' | 'ag-financial' | 'ag-financial-dark';
export interface AgPaletteColors {
    fill?: AgColorTypeStrict;
    stroke?: CssColor;
}
/**
 * Palette used by the chart instance.
 */
export interface AgChartThemePalette {
    /** The array of fills to be used. */
    fills?: AgColorType[];
    /** The array of strokes to be used. */
    strokes?: CssColor[];
    up?: AgPaletteColors;
    down?: AgPaletteColors;
    neutral?: AgPaletteColors;
}
export interface AgBaseChartThemeOptions<TDatum = DatumDefault, TContext = ContextDefault> {
    /** The palette to use. If specified, this replaces the palette from the base theme. */
    palette?: AgChartThemePalette;
    /** Global parameters to set styles across the whole chart. */
    params?: AgChartThemeParams;
    /** Configuration from this object is merged over the defaults specified in the base theme. */
    overrides?: AgThemeOverrides<TDatum, TContext>;
}
/** This object is used to define the configuration for a custom chart theme. */
export interface AgChartTheme<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseChartThemeOptions<TDatum, TContext> {
    /** The name of the theme to base your theme on. Your custom theme will inherit all the configuration from the base theme, allowing you to override just the settings you wish to change using the `overrides` config (see below). */
    baseTheme?: AgChartThemeName;
}
export interface AgLineSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgLineSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgScatterSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgScatterSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgBubbleSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgBubbleSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgAreaSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgAreaSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgBarSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgBarSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgBoxPlotSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgBoxPlotSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgCandlestickSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgCandlestickSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgConeFunnelSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgConeFunnelSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgFunnelSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgFunnelSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgOhlcSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgOhlcSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgHistogramSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    axes?: AgContinuousCartesianAxesTheme<TContext>;
    series?: AgHistogramSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgHeatmapSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgHeatmapSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgWaterfallSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgWaterfallSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgRangeBarSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgRangeBarSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgRangeAreaSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseCartesianThemeOptions<TDatum, TContext> {
    series?: AgRangeAreaSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgDonutSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
    series?: AgDonutSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgPieSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
    series?: AgPieSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgRadarLineSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBasePolarThemeOptions<TDatum, TContext> {
    series?: AgRadarSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgRadarAreaSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBasePolarThemeOptions<TDatum, TContext> {
    series?: AgRadarAreaSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgRadialBarSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBasePolarThemeOptions<TDatum, TContext> {
    series?: AgRadialBarSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgRadialColumnSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBasePolarThemeOptions<TDatum, TContext> {
    series?: AgRadialColumnSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgNightingaleSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBasePolarThemeOptions<TDatum, TContext> {
    series?: AgNightingaleSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgMapShapeSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseTopologyThemeOptions<TDatum, TContext> {
    series?: AgMapShapeSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgMapLineSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseTopologyThemeOptions<TDatum, TContext> {
    series?: AgMapLineSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgMapMarkerSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseTopologyThemeOptions<TDatum, TContext> {
    series?: AgMapMarkerSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgMapShapeBackgroundThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseTopologyThemeOptions<TDatum, TContext> {
    series?: AgMapShapeBackgroundThemeableOptions;
}
export interface AgMapLineBackgroundThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseTopologyThemeOptions<TDatum, TContext> {
    series?: AgMapLineBackgroundThemeableOptions;
}
export interface AgSankeyThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseStandaloneThemeOptions<TDatum, TContext> {
    series?: AgSankeySeriesThemeableOptions<TDatum, TContext>;
}
export interface AgChordThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseStandaloneThemeOptions<TDatum, TContext> {
    series?: AgChordSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgPyramidThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseStandaloneThemeOptions<TDatum, TContext> {
    series?: AgPyramidSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgSunburstSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseStandaloneThemeOptions<TDatum, TContext> {
    series?: AgSunburstSeriesThemeableOptions<TDatum, TContext>;
}
export interface AgTreemapSeriesThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseStandaloneThemeOptions<TDatum, TContext> {
    series?: AgTreemapSeriesThemeableOptions<TDatum, TContext>;
}
export type AgBaseGaugePresetThemeOptions<TDatum = DatumDefault, TContext = ContextDefault> = Pick<AgBaseChartOptions<TDatum, TContext>, 'animation' | 'background' | 'contextMenu' | 'context' | 'footnote' | 'height' | 'listeners' | 'locale' | 'minHeight' | 'minWidth' | 'padding' | 'subtitle' | 'title' | 'tooltip' | 'width'>;
type AgRadialGaugeTheme<TDatum, TContext> = AgBaseGaugePresetThemeOptions<TDatum, TContext> & AgRadialGaugeThemeableOptions<TContext>;
export interface AgRadialGaugeTargetTheme extends Omit<AgRadialGaugeTarget, 'value' | 'text'> {
}
export interface AgRadialGaugeThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgRadialGaugeTheme<TDatum, TContext> {
    targets?: AgRadialGaugeTargetTheme;
}
type AgLinearGaugeTheme<TDatum, TContext> = AgBaseGaugePresetThemeOptions<TDatum, TContext> & AgLinearGaugeThemeableOptions<TContext>;
export interface AgLinearGaugeTargetTheme extends Omit<AgLinearGaugeTarget, 'value' | 'text'> {
}
export interface AgLinearGaugeThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgLinearGaugeTheme<TDatum, TContext> {
    targets?: AgLinearGaugeTargetTheme;
}
export interface AgCommonThemeableAxisOptions<TContext = ContextDefault> extends AgCartesianAxesTheme<TContext>, AgPolarAxesTheme<TContext> {
}
export interface AgCommonThemeableChartOptions<TDatum = DatumDefault, TContext = ContextDefault> extends AgBaseThemeableChartOptions<TDatum, TContext> {
    axes?: AgCommonThemeableAxisOptions<TContext>;
    annotations?: AgAnnotationsThemeableOptions;
    chartToolbar?: AgChartToolbarThemeableOptions;
    initialState?: AgInitialStateThemeableOptions;
}
export interface AgChartThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Common theme overrides for series. */
    common?: AgCommonThemeableChartOptions<TDatum, TContext>;
    /** Line series theme overrides. */
    line?: AgLineSeriesThemeOverrides<TDatum, TContext>;
    /** Scatter series theme overrides. */
    scatter?: AgScatterSeriesThemeOverrides<TDatum, TContext>;
    /** Bubble series theme overrides. */
    bubble?: AgBubbleSeriesThemeOverrides<TDatum, TContext>;
    /** Area series theme overrides. */
    area?: AgAreaSeriesThemeOverrides<TDatum, TContext>;
    /** Bar series theme overrides. */
    bar?: AgBarSeriesThemeOverrides<TDatum, TContext>;
    /** Box-plot series theme overrides. */
    'box-plot'?: AgBoxPlotSeriesThemeOverrides<TDatum, TContext>;
    /** Candlestick series theme overrides. */
    candlestick?: AgCandlestickSeriesThemeOverrides<TDatum, TContext>;
    /** Cone Funnel series theme overrides. */
    'cone-funnel'?: AgConeFunnelSeriesThemeOverrides<TDatum, TContext>;
    /** Funnel series theme overrides. */
    funnel?: AgFunnelSeriesThemeOverrides<TDatum, TContext>;
    /** ohlc series theme overrides. */
    ohlc?: AgOhlcSeriesThemeOverrides<TDatum, TContext>;
    /** Histogram series theme overrides. */
    histogram?: AgHistogramSeriesThemeOverrides<TDatum, TContext>;
    /** Heatmap series theme overrides. */
    heatmap?: AgHeatmapSeriesThemeOverrides<TDatum, TContext>;
    /** Waterfall series theme overrides. */
    waterfall?: AgWaterfallSeriesThemeOverrides<TDatum, TContext>;
    /** Range-bar series theme overrides. */
    'range-bar'?: AgRangeBarSeriesThemeOverrides<TDatum, TContext>;
    /** Range-area series theme overrides. */
    'range-area'?: AgRangeAreaSeriesThemeOverrides<TDatum, TContext>;
    /** Donut series theme overrides. */
    donut?: AgDonutSeriesThemeOverrides<TDatum, TContext>;
    /** Pie series theme overrides. */
    pie?: AgPieSeriesThemeOverrides<TDatum, TContext>;
    /** Radar-line series theme overrides. */
    'radar-line'?: AgRadarLineSeriesThemeOverrides<TDatum, TContext>;
    /** Radar-area series theme overrides. */
    'radar-area'?: AgRadarAreaSeriesThemeOverrides<TDatum, TContext>;
    /** Radial-bar series theme overrides. */
    'radial-bar'?: AgRadialBarSeriesThemeOverrides<TDatum, TContext>;
    /** Radial-column series theme overrides. */
    'radial-column'?: AgRadialColumnSeriesThemeOverrides<TDatum, TContext>;
    /** Nightingale series theme overrides. */
    nightingale?: AgNightingaleSeriesThemeOverrides<TDatum, TContext>;
    /** Map shape series theme overrides. */
    'map-shape'?: AgMapShapeSeriesThemeOverrides<TDatum, TContext>;
    /** Map line series theme overrides. */
    'map-line'?: AgMapLineSeriesThemeOverrides<TDatum, TContext>;
    /** Map marker series theme overrides. */
    'map-marker'?: AgMapMarkerSeriesThemeOverrides<TDatum, TContext>;
    /** Map shape background series theme overrides. */
    'map-shape-background'?: AgMapShapeBackgroundThemeOverrides<TDatum, TContext>;
    /** Map line background series theme overrides. */
    'map-line-background'?: AgMapLineBackgroundThemeOverrides<TDatum, TContext>;
    /** Sankey series theme overrides. */
    sankey?: AgSankeyThemeOverrides<TDatum, TContext>;
    /** Chord series theme overrides. */
    chord?: AgChordThemeOverrides<TDatum, TContext>;
    /** Pyramid series theme overrides. */
    pyramid?: AgPyramidThemeOverrides<TDatum, TContext>;
    /** Sunburst series theme overrides. */
    sunburst?: AgSunburstSeriesThemeOverrides<TDatum, TContext>;
    /** Treemap series theme overrides. */
    treemap?: AgTreemapSeriesThemeOverrides<TDatum, TContext>;
}
export interface AgPresetOverrides<TDatum = DatumDefault, TContext = ContextDefault> {
    /** Radial gauge theme overrides. */
    'radial-gauge'?: AgRadialGaugeThemeOverrides<TDatum, TContext>;
    /** Linear Gauge theme overrides. */
    'linear-gauge'?: AgLinearGaugeThemeOverrides<TDatum, TContext>;
}
export interface AgThemeOverrides<TDatum = DatumDefault, TContext = ContextDefault> extends AgChartThemeOverrides<TDatum, TContext>, AgPresetOverrides<TDatum, TContext> {
}
export {};
