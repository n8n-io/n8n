import type { AgTimeIntervalUnit } from './axisOptions';
import type { ContextDefault, DatumDefault, DatumKey } from './types';
export type FormatterPropertyType = 'x' | 'y' | 'angle' | 'radius' | 'size' | 'color' | 'label' | 'secondaryLabel' | 'calloutLabel' | 'sectorLabel' | 'legendItem';
export type SeriesFormatterSource = 'tooltip' | 'series-label';
export type ChartFormatterSource = 'axis-label' | 'gradient-legend' | 'legend-label' | 'crosshair' | 'annotation-label';
export type AnyFormatterSource = SeriesFormatterSource | ChartFormatterSource;
interface FormatterBoundSeries {
    /** ID used by the series for values. */
    seriesId: string;
    /** Key used by the series for values. */
    key: string;
    /** Optional name used by the series for values. */
    name?: string;
}
export interface SeriesFormatterParams<TContext, TDatum, Value> {
    value: Value;
    datum: TDatum | undefined;
    legendItemName: string | undefined;
    seriesId: string | undefined;
    key: DatumKey<TDatum> | undefined;
    source: SeriesFormatterSource;
    property: FormatterPropertyType;
    context?: TContext;
}
export interface ChartFormatterParams<TContext, Value> {
    value: Value;
    datum: undefined;
    legendItemName: string | undefined;
    seriesId: undefined;
    key: undefined;
    source: ChartFormatterSource;
    property: FormatterPropertyType;
    context?: TContext;
}
interface BaseFormatterParams<TDatum, TContext, Value> {
    /** The current value being formatted. */
    value: Value;
    /** The datum associated with the value, if available. */
    datum: TDatum | undefined;
    /** The legendItemName of the series that the value belongs to, if available. */
    legendItemName: string | undefined;
    /** The ID of the series that the value belongs to, if available. */
    seriesId: string | undefined;
    /** The key of the property associated with the datum, if available. */
    key: DatumKey<TDatum> | undefined;
    /** The source of the formatter, indicating the element where it is being used. */
    source: AnyFormatterSource;
    /** The property being formatted, such as 'x', 'y', 'angle', etc. */
    property: FormatterPropertyType;
    /** The data domain of the series that the value belongs to, if available.. */
    domain: any[];
    /** A description of the key and name properties of the series associated with the element being formatted. */
    boundSeries: FormatterBoundSeries[];
    /** Context for this callback. */
    context?: TContext;
}
export interface NumberFormatterParams<TDatum, TContext> extends BaseFormatterParams<TDatum, TContext, number> {
    /** Configuration for a number-formatted value. */
    type: 'number';
    /** The recommended precision to format the value. */
    fractionDigits: number | undefined;
}
export type DateFormatterStyle = 'long' | 'component';
export interface DateFormatterParams<TDatum, TContext> extends BaseFormatterParams<TDatum, TContext, Date> {
    /** Configuration for a date-formatted value. */
    type: 'date';
    /** The interval used for the formatted element. I.e. if given the unit `day`, you may format your day as '1 January 2020'. */
    unit: AgTimeIntervalUnit;
    /** The frequency of `unit`. I.e. a unit of `day` and a step of `7` indicates a weekly interval. */
    step: number;
    /** The date from which the time interval is relative to. For example, if you had weekly data, and your epoch was a Sunday, you would format every Sunday. */
    epoch: Date | undefined;
    /** Date formatting style. Either `long` for the full date, such as '25 December 2020'; or `component` for just the unit component of the date, such as '25'. */
    style: DateFormatterStyle;
}
export interface CategoryFormatterParams<TDatum, TContext> extends BaseFormatterParams<TDatum, TContext, string | number | Date | string[]> {
    /** Configuration for a category-formatted value. */
    type: 'category';
}
export type FormatterParams<TDatum = DatumDefault, TContext = ContextDefault> = NumberFormatterParams<TDatum, TContext> | DateFormatterParams<TDatum, TContext> | CategoryFormatterParams<TDatum, TContext>;
type FunctionFormatter<TDatum, TContext> = (params: FormatterParams<TDatum, TContext>) => string | undefined;
type TimeIntervalFormatter = Record<AgTimeIntervalUnit, string>;
export type FormatterConfiguration<TDatum, TContext = ContextDefault> = FunctionFormatter<TDatum, TContext> | Partial<Record<FormatterPropertyType, FunctionFormatter<TDatum, TContext> | TimeIntervalFormatter | string>>;
export {};
