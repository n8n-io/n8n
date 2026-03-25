import type { LineDashOptions, StrokeOptions } from '../series/cartesian/commonOptions';
import type { ContextCallbackParams, DatumCallbackParams, Styler } from './callbackOptions';
import type { ContextDefault, DatumDefault, DatumKey, PixelSize, Ratio } from './types';
export type AgErrorBarItemStylerParams<TDatum = DatumDefault, TContext = ContextDefault> = DatumCallbackParams<TDatum> & ContextCallbackParams<TContext> & SeriesKeyOptions<TDatum> & ErrorBarKeyOptions<TDatum> & Required<AgErrorBarThemeableOptions>;
interface ErrorBarStylingOptions extends StrokeOptions, LineDashOptions {
    /** Whether to display the error bars. */
    visible?: boolean;
}
interface SeriesKeyOptions<TDatum> {
    /** The key to use to retrieve x-values from the data. */
    xKey: DatumKey<TDatum>;
    /** The key to use to retrieve y-values from the data. */
    yKey?: DatumKey<TDatum>;
}
interface ErrorBarKeyOptions<TDatum> {
    /** The key to use to retrieve lower bound error values from the x-axis data. */
    xLowerKey?: DatumKey<TDatum>;
    /** The key to use to retrieve upper bound error values from the x-axis data. */
    xUpperKey?: DatumKey<TDatum>;
    /** The key to use to retrieve lower bound error values from the y-axis data. */
    yLowerKey?: DatumKey<TDatum>;
    /** The key to use to retrieve upper bound error values from the y-axis data. */
    yUpperKey?: DatumKey<TDatum>;
}
interface ErrorBarNameOptions {
    /** Human-readable description of the lower bound error value for the x-axis. This is the value to use in tooltips or labels. */
    xLowerName?: string;
    /** Human-readable description of the upper bound error value for the x-axis. This is the value to use in tooltips or labels. */
    xUpperName?: string;
    /** Human-readable description of the lower bound error value for the y-axis. This is the value to use in tooltips or labels. */
    yLowerName?: string;
    /** Human-readable description of the upper bound error value for the y-axis. This is the value to use in tooltips or labels. */
    yUpperName?: string;
}
interface ErrorBarFormatterOption<TDatum, TContext> {
    /** Function used to return formatting for individual error bars, based on the given parameters. If the current error bar is highlighted, the `highlighted` property will be set to `true`; make sure to check this if you want to differentiate between the highlighted and un-highlighted states. */
    itemStyler?: Styler<AgErrorBarItemStylerParams<TDatum, TContext>, AgErrorBarThemeableOptions>;
}
export interface ErrorBarCapOptions extends ErrorBarStylingOptions {
    /** Absolute length of caps in pixels. */
    length?: PixelSize;
    /** Length of caps relative to the shape used by the series. */
    lengthRatio?: Ratio;
}
export interface AgErrorBarThemeableOptions extends ErrorBarStylingOptions {
    /** Options to style error bars' caps */
    cap?: ErrorBarCapOptions;
}
export declare const AgErrorBarSupportedSeriesTypes: readonly ["bar", "line", "scatter"];
export interface AgErrorBarOptions<TDatum = DatumDefault, TContext = ContextDefault> extends ErrorBarKeyOptions<TDatum>, ErrorBarNameOptions, ErrorBarFormatterOption<TDatum, TContext>, AgErrorBarThemeableOptions {
}
export {};
