import type { IFilterParams } from '../../../interfaces/iFilter';
import type { IScalarFilterParams } from '../iScalarFilter';
import type { ISimpleFilterModel } from '../iSimpleFilter';
import type { ITextInputFloatingFilterParams } from '../text/iTextFilter';
export interface NumberFilterModel extends ISimpleFilterModel {
    /** Filter type is always `'number'` */
    filterType?: 'number';
    /**
     * The number value(s) associated with the filter.
     * Custom filters can have no values (hence both are optional).
     * Range filter has two values (from and to), where `filter` acts as a `from` value.
     */
    filter?: number | null;
    /**
     * Range filter `to` value.
     */
    filterTo?: number | null;
}
/**
 * Parameters provided by the grid to the `init` method of a `NumberFilter`.
 * Do not use in `colDef.filterParams` - see `INumberFilterParams` instead.
 */
export type NumberFilterParams<TData = any> = INumberFilterParams & IFilterParams<TData>;
/**
 * Parameters used in `colDef.filterParams` to configure a Number Filter (`agNumberColumnFilter`).
 */
export interface INumberFilterParams extends IScalarFilterParams {
    /**
     * When specified, the input field will be of type `text`, and this will be used as a regex of all the characters that are allowed to be typed.
     * This will be compared against any typed character and prevent the character from appearing in the input if it does not match.
     */
    allowedCharPattern?: string;
    /**
     * Typically used alongside `allowedCharPattern`, this provides a custom parser to convert the value entered in the filter inputs into a number that can be used for comparisons.
     */
    numberParser?: (text: string | null) => number | null;
    /**
     * Typically used alongside `allowedCharPattern`, this provides a custom formatter to convert the number value in the filter model
     * into a string to be used in the filter input. This is the inverse of the `numberParser`.
     */
    numberFormatter?: (value: number | null) => string | null;
}
export interface INumberFloatingFilterParams extends ITextInputFloatingFilterParams {
}
