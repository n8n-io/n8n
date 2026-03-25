import type { IFilterParams } from '../../interfaces/iFilter';
import type { ISimpleFilterParams } from './iSimpleFilter';
/**
 * @deprecated v34 Internal only. Use `IScalarFilterParams`
 */
export type ScalarFilterParams<TData = any> = IScalarFilterParams & IFilterParams<TData>;
/**
 * Common parameters in `colDef.filterParams` used by all scalar filters. Extended by the specific filter types.
 */
export interface IScalarFilterParams extends ISimpleFilterParams {
    /** If `true`, the `'inRange'` filter option will include values equal to the start and end of the range. */
    inRangeInclusive?: boolean;
    /** If `true`, blank (`null` or `undefined`) values will pass the `'equals'` filter option. */
    includeBlanksInEquals?: boolean;
    /** If `true`, blank (`null` or `undefined`) values will pass the `'notEqual'` filter option. */
    includeBlanksInNotEqual?: boolean;
    /** If `true`, blank (`null` or `undefined`) values will pass the `'lessThan'` and `'lessThanOrEqual'` filter options. */
    includeBlanksInLessThan?: boolean;
    /** If `true`, blank (`null` or `undefined`) values will pass the `'greaterThan'` and `'greaterThanOrEqual'` filter options. */
    includeBlanksInGreaterThan?: boolean;
    /** If `true`, blank (`null` or `undefined`) values will pass the `'inRange'` filter option. */
    includeBlanksInRange?: boolean;
}
export interface Comparator<T> {
    (left: T, right: T): number;
}
