import type { ColumnState } from '../../columns/columnStateUtils';
import type { ColumnGroupState, GridState } from '../../interfaces/gridState';
/**
 * Converts state retrieved from `api.getColumnState()` to grid state.
 *
 * @param enablePivotMode Whether pivot mode should be enabled or not. Default `false`.
 * @returns A partial `GridState` object containing only the properties relevant to columns
 */
export declare function convertColumnState(columnState: ColumnState[], enablePivotMode?: boolean): Pick<GridState, 'sort' | 'rowGroup' | 'aggregation' | 'pivot' | 'columnPinning' | 'columnVisibility' | 'columnSizing' | 'columnOrder'>;
export declare function _convertColumnGroupState(columnGroupState: {
    groupId: string;
    open: boolean;
}[]): ColumnGroupState | undefined;
/**
 * Converts state retrieved from `api.getColumnGroupState()` to grid state.
 *
 * @returns A partial `GridState` object containing only the properties relevant to column groups
 */
export declare function convertColumnGroupState(columnGroupState: {
    groupId: string;
    open: boolean;
}[]): Pick<GridState, 'columnGroup'>;
