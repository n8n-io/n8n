import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { IAggFunc } from '../entities/colDef';
import type { ColumnEventType } from '../events';
import type { ColumnPinnedType } from '../interfaces/iColumn';
export interface ColumnStateParams {
    /** True if the column is hidden */
    hide?: boolean | null;
    /** Width of the column in pixels */
    width?: number;
    /** Column's flex if flex is set */
    flex?: number | null;
    /** Sort applied to the column */
    sort?: 'asc' | 'desc' | null;
    /** The order of the sort, if sorting by many columns */
    sortIndex?: number | null;
    /** The aggregation function applied */
    aggFunc?: string | IAggFunc | null;
    /** True if pivot active */
    pivot?: boolean | null;
    /** The order of the pivot, if pivoting by many columns */
    pivotIndex?: number | null;
    /** Set if column is pinned */
    pinned?: ColumnPinnedType;
    /** True if row group active */
    rowGroup?: boolean | null;
    /** The order of the row group, if grouping by many columns */
    rowGroupIndex?: number | null;
}
export interface ColumnState extends ColumnStateParams {
    /** ID of the column */
    colId: string;
}
export interface ApplyColumnStateParams {
    /** The state from `getColumnState` */
    state?: ColumnState[];
    /** Whether column order should be applied */
    applyOrder?: boolean;
    /** State to apply to columns where state is missing for those columns */
    defaultState?: ColumnStateParams;
}
export declare function _applyColumnState(beans: BeanCollection, params: ApplyColumnStateParams, source: ColumnEventType): boolean;
export declare function _resetColumnState(beans: BeanCollection, source: ColumnEventType): void;
/**
 * calculates what events to fire between column state changes. gets used when:
 * a) apply column state
 * b) apply new column definitions (so changes from old cols)
 */
export declare function _compareColumnStatesAndDispatchEvents(beans: BeanCollection, source: ColumnEventType): () => void;
export declare function _getColumnState(beans: BeanCollection): ColumnState[];
export declare function getColumnStateFromColDef(column: AgColumn): ColumnState;
