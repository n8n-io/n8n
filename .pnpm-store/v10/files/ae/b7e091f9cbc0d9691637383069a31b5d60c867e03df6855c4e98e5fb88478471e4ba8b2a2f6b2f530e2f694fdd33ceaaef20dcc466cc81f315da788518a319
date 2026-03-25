import type { CssColor, PixelSize, Ratio } from '../../chart/types';
export interface AgSparklineBaseAxisOptions {
    /** Whether the axis should be shown. */
    visible?: boolean;
    /** The colour of the axis line. */
    stroke?: CssColor;
    /** The width in pixels of the axis line. */
    strokeWidth?: PixelSize;
    /** Reverse the axis scale domain if `true`. */
    reverse?: boolean;
}
interface AgSparklineBaseCategoryAxisOptions extends AgSparklineBaseAxisOptions {
    /** The size of the gap between the categories as a proportion, between 0 and 1. This value is a fraction of the “step”, which is the interval between the start of a band and the start of the next band.
     */
    paddingInner?: Ratio;
    /** The padding on the outside i.e. left and right of the first and last category. In association with `paddingInner`, this value can be between 0 and 1.
     */
    paddingOuter?: Ratio;
}
export interface AgSparklineContinuousAxisOptions<TDatum extends Date | number> {
    /** User override for the automatically determined min value (based on series data). */
    min?: TDatum;
    /** User override for the automatically determined max value (based on series data). */
    max?: TDatum;
}
export interface AgSparklineCategoryAxisOptions extends AgSparklineBaseCategoryAxisOptions {
    type: 'category';
}
export interface AgSparklineNumberAxisOptions extends AgSparklineBaseAxisOptions, AgSparklineContinuousAxisOptions<number> {
    type: 'number';
}
export interface AgSparklineTimeAxisOptions extends AgSparklineBaseAxisOptions, AgSparklineContinuousAxisOptions<Date | number> {
    type: 'time';
}
export type AgSparklineAxisOptions = AgSparklineCategoryAxisOptions | AgSparklineNumberAxisOptions | AgSparklineTimeAxisOptions;
export {};
