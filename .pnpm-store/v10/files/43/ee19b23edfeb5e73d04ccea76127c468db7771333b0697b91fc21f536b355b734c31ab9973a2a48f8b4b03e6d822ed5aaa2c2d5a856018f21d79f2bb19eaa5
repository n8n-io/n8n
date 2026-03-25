import type { Renderer } from '../../chart/callbackOptions';
import type { AgCrosshairOptions } from '../../chart/crosshairOptions';
import type { AgSeriesTooltipInteraction, AgTooltipPositionOptions } from '../../chart/tooltipOptions';
import type { DatumDefault, InteractionRange } from '../../chart/types';
import type { AgAreaSeriesOptions } from '../../series/cartesian/areaOptions';
import type { AgBarSeriesOptions } from '../../series/cartesian/barOptions';
import type { AgLineSeriesOptions } from '../../series/cartesian/lineOptions';
import type { AgSparklineAxisOptions } from './sparklineAxisOptions';
export interface AgSparklineCrosshairOptions extends Omit<AgCrosshairOptions<never>, 'label'> {
}
export interface AgSparklineTooltipRendererParams<TDatum> {
    /** Context passed into the Sparkline options, if provided. */
    context: any;
    /** Value of the datum. */
    datum: TDatum;
    /** Value of the datum against the x-axis. */
    xValue: any;
    /** Value of the datum against the y-axis. */
    yValue: any;
}
export interface AgSparklineTooltipRendererResult {
    /*** The title of the tooltip. */
    title?: string;
    /*** The content to display in each tooltip. */
    content?: string;
}
export interface AgSparklineTooltip<TDatum = DatumDefault> {
    /** Whether to show tooltips when the series are hovered over. */
    enabled?: boolean;
    /** The tooltip arrow is displayed by default, unless the container restricts it or a position offset is provided. To always display the arrow, set `showArrow` to `true`. To remove the arrow, set `showArrow` to `false`.  */
    showArrow?: boolean;
    /** Range from a point that triggers the tooltip to show. Each series type uses its own default; typically this is `'nearest'` for marker-based series and `'exact'` for shape-based series. */
    range?: InteractionRange;
    /** The position of the tooltip. Each series type uses its own default; typically this is `'node'` for marker-based series and `'pointer'` for shape-based series. */
    position?: AgTooltipPositionOptions;
    /** Configuration for tooltip interaction. */
    interaction?: AgSeriesTooltipInteraction;
    /** Function used to create the content for tooltips. */
    renderer?: Renderer<AgSparklineTooltipRendererParams<TDatum>, AgSparklineTooltipRendererResult>;
}
export interface AgSparklineBaseThemeableOptions<TDatum = DatumDefault> {
    /** Context to use for tooltips. */
    context?: any;
    /** Crosshair configurations. */
    crosshair?: AgSparklineCrosshairOptions;
    /** y-axis configurations. */
    axis?: AgSparklineAxisOptions;
    /** User override for the automatically determined min value (based on series data). */
    min?: number;
    /** User override for the automatically determined max value (based on series data). */
    max?: number;
    /** Tooltip configuration. */
    tooltip?: AgSparklineTooltip<TDatum>;
    /**
     * A nonce to be used by any dynamically injected CSS <style> tags to assist with Content Security Policy.
     *
     * See: [MDN none reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce)
     *
     * Default: `undefined`
     */
    styleNonce?: string;
}
export interface AgSparklineDataKeysOptions {
    xKey?: string;
    yKey?: string;
}
type AgSparklineSeriesOmit = 'context' | 'showInLegend' | 'showInMiniChart' | 'grouped' | 'stacked' | 'stackGroup' | 'tooltip' | 'listeners' | 'errorBar' | 'xKey' | 'yKey';
export interface AgAreaSparklinePreset<TDatum = DatumDefault> extends AgSparklineBaseThemeableOptions<TDatum>, AgSparklineDataKeysOptions, Omit<AgAreaSeriesOptions<TDatum, any>, AgSparklineSeriesOmit> {
}
export interface AgBarSparklinePreset<TDatum = DatumDefault> extends AgSparklineBaseThemeableOptions<TDatum>, AgSparklineDataKeysOptions, Omit<AgBarSeriesOptions<TDatum, any>, AgSparklineSeriesOmit> {
}
export interface AgLineSparklinePreset<TDatum = DatumDefault> extends AgSparklineBaseThemeableOptions<TDatum>, AgSparklineDataKeysOptions, Omit<AgLineSeriesOptions<TDatum, any>, AgSparklineSeriesOmit> {
    type: 'line';
}
export type AgSparklinePresets<TDatum = DatumDefault> = AgBarSparklinePreset<TDatum> | AgLineSparklinePreset<TDatum> | AgAreaSparklinePreset<TDatum>;
export {};
