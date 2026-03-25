import type { BaseColDefParams } from '../../../entities/colDef';
import type { IFilterParams } from '../../../interfaces/iFilter';
import type { IFloatingFilterParams } from '../../floating/floatingFilter';
import type { ISimpleFilterModel, ISimpleFilterParams } from '../iSimpleFilter';
import type { NumberFilter } from '../number/numberFilter';
import type { TextFilter } from './textFilter';
export interface TextFilterModel extends ISimpleFilterModel {
    /** Filter type is always `'text'` */
    filterType?: 'text';
    /**
     * The text value associated with the filter.
     * It's optional as custom filters may not have a text value.
     */
    filter?: string | null;
    /**
     * The 2nd text value associated with the filter, if supported.
     */
    filterTo?: string | null;
}
export interface TextMatcherParams extends BaseColDefParams {
    /**
     * The applicable filter option being tested.
     * One of: `equals`, `notEqual`, `contains`, `notContains`, `startsWith`, `endsWith`.
     */
    filterOption: string | null | undefined;
    /**
     * The value about to be filtered.
     * If this column has a value getter, this value will be coming from the value getter,
     * otherwise it is the raw value injected into the grid.
     * If a `textFormatter` is provided, this value will have been formatted.
     * If no `textFormatter` is provided and `caseSensitive` is not provided or is `false`,
     * the value will have been converted to lower case.
     */
    value: any;
    /**
     * The value to filter by.
     * If a `textFormatter` is provided, this value will have been formatted.
     * If no `textFormatter` is provided and `caseSensitive` is not provided or is `false`,
     * the value will have been converted to lower case.
     */
    filterText: string | null;
    textFormatter?: TextFormatter;
}
export interface TextMatcher {
    (params: TextMatcherParams): boolean;
}
export interface TextFormatter {
    (from?: string | null): string | null;
}
/**
 * Parameters provided by the grid to the `init` method of a `TextFilter`.
 * Do not use in `colDef.filterParams` - see `ITextFilterParams` instead.
 */
export type TextFilterParams<TData = any> = ITextFilterParams & IFilterParams<TData>;
/**
 * Parameters used in `colDef.filterParams` to configure a  Text Filter (`agTextColumnFilter`).
 */
export interface ITextFilterParams extends ISimpleFilterParams {
    /**
     * Used to override how to filter based on the user input.
     * Returns `true` if the value passes the filter, otherwise `false`.
     */
    textMatcher?: TextMatcher;
    /**
     * By default, text filtering is case-insensitive. Set this to `true` to make text filtering case-sensitive.
     * @default false
     */
    caseSensitive?: boolean;
    /**
     * Formats the text before applying the filter compare logic.
     * Useful if you want to substitute accented characters, for example.
     */
    textFormatter?: (from: string) => string | null;
    /**
     * If `true`, the input that the user enters will be trimmed when the filter is applied, so any leading or trailing whitespace will be removed.
     * If only whitespace is entered, it will be left as-is.
     * If you enable `trimInput`, it is best to also increase the `debounceMs` to give users more time to enter text.
     * @default false
     */
    trimInput?: boolean;
}
export interface ITextInputFloatingFilterParams extends IFloatingFilterParams<TextFilter | NumberFilter> {
    /**
     * Overrides the browser's autocomplete/autofill behaviour by updating the autocomplete attribute on the input field used in the floating filter input.
     * Possible values are:
     * - `true` to allow the **default** browser autocomplete/autofill behaviour.
     * - `false` to disable the browser autocomplete/autofill behavior by setting the `autocomplete` attribute to `off`.
     * - A **string** to be used as the [autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) attribute value.
     * Some browsers do not respect setting the HTML attribute `autocomplete="off"` and display the auto-fill prompts anyway.
     * @default false
     */
    browserAutoComplete?: boolean | string;
}
export interface ITextFloatingFilterParams extends ITextInputFloatingFilterParams {
}
