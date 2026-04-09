import type { IFilterParams } from '../../../interfaces/iFilter';
import type { IScalarFilterParams } from '../iScalarFilter';
import type { ISimpleFilterModel } from '../iSimpleFilter';
export interface DateFilterModel extends ISimpleFilterModel {
    /** Filter type is always `'date'` */
    filterType?: 'date';
    /**
     * The date value(s) associated with the filter.
     * The type is `string` and the format is `YYYY-MM-DD hh:mm:ss`, e.g. 2019-05-24 00:00:00.
     * If `useIsoSeparator = true`, the format is instead `YYYY-MM-DDThh:mm:ss`.
     * Custom filters can have no values (hence both are optional). Range filter has two values (from and to).
     */
    dateFrom: string | null;
    /**
     * Range filter `to` date value.
     */
    dateTo: string | null;
}
/**
 * Parameters provided by the grid to the `init` method of a `DateFilter`.
 * Do not use in `colDef.filterParams` - see `IDateFilterParams` instead.
 */
export type DateFilterParams<TData = any> = IDateFilterParams & IFilterParams<TData>;
/**
 * Parameters used in `colDef.filterParams` to configure a Date Filter (`agDateColumnFilter`).
 */
export interface IDateFilterParams extends IScalarFilterParams {
    /**
     * Required if the data for the column are not native JS `Date` objects.
     * If cell values can contain invalid dates, should also implement `isValidDate`.
     */
    comparator?: IDateComparatorFunc;
    /**
     * Defines whether the grid uses the browser date picker or a plain text box.
     *  - `true`: Force the browser date picker to be used.
     *  - `false`: Force a plain text box to be used.
     *
     * If a date component is not provided, then the grid will use the browser date picker
     * for all supported browsers and a plain text box for other browsers.
     */
    browserDatePicker?: boolean;
    /**
     * This is the minimum year that may be entered in a date field for the value to be considered valid.
     * @default 1000
     * */
    minValidYear?: number;
    /** This is the maximum year that may be entered in a date field for the value to be considered valid. Default is no restriction. */
    maxValidYear?: number;
    /**
     * The minimum valid date that can be entered in the filter.
     * It can be a Date object or a string in the format `YYYY-MM-DD`.
     * If set, this will override `minValidYear` - the minimum valid year setting.
     */
    minValidDate?: Date | string;
    /**
     * The maximum valid date that can be entered in the filter.
     * It can be a Date object or a string in the format `YYYY-MM-DD`.
     * If set, this will override `maxValidYear` - the maximum valid year setting.
     */
    maxValidDate?: Date | string;
    /**
     * Defines the date format for the floating filter text when an `inRange` filter has been applied.
     *
     * @default YYYY-MM-DD
     */
    inRangeFloatingFilterDateFormat?: string;
    /**
     * If providing a `comparator` and cell values can contain invalid dates,
     * this can be implemented to allow invalid date values to be filtered out
     * (as the comparator only allows for greater than, less than and equals).
     */
    isValidDate?: (value: any) => boolean;
    /**
     * Defines whether time should be included when filtering dates.
     *
     * - `true`: Include the time component in date comparisons.
     * - `false`: Only compare dates without considering the time component.
     *
     * @default false
     */
    includeTime?: boolean;
    /**
     * By default, the `dateFrom` and `dateTo` values in the filter model will be in the format `YYYY-MM-DD hh:mm:ss`.
     * Set this to `true` to instead use the format `YYYY-MM-DDThh:mm:ss`.
     */
    useIsoSeparator?: boolean;
}
export interface IDateComparatorFunc {
    (filterLocalDateAtMidnight: Date, cellValue: any): number;
}
