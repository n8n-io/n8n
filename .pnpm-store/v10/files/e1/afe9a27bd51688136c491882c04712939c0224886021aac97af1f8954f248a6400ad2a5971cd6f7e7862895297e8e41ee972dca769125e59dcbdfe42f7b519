import type { GridApi } from '../api/gridApi';
import type { GetFindTextFunc } from '../entities/colDef';
import type { Column } from './iColumn';
import type { IRowNode } from './iRowNode';
export interface FindMatch<TData = any, TValue = any> {
    node: IRowNode<TData>;
    /** Will be `null` if the match is within a full width row or detail row. */
    column: Column<TValue> | null;
    /** The number of the match within the cell (starting from `1`). */
    numInMatch: number;
    /** The number of the match within all the matches in the grid (starting from `1`). */
    numOverall: number;
}
export interface IFindService {
    totalMatches: number;
    activeMatch: FindMatch | undefined;
    isMatch(node: IRowNode, column: Column | null): boolean;
    getParts(params: FindCellValueParams): FindPart[];
    next(): void;
    previous(): void;
    goTo(match: number, force?: boolean): void;
    clearActive(): void;
    getNumMatches(node: IRowNode, column: Column | null): number;
    registerDetailGrid(node: IRowNode, api: GridApi): void;
    refresh(maintainActive: boolean): void;
}
export interface FindOptions {
    /** Match values in the current page only (when pagination enabled). */
    currentPageOnly?: boolean;
    /** Match case of values. */
    caseSensitive?: boolean;
    /** Perform searches across Detail Grids or Custom Detail Cells when using Master/Detail. */
    searchDetail?: boolean;
}
export interface FindCellParams<TData = any, TValue = any> {
    node: IRowNode<TData>;
    /** `null` if the cell is a full width row or detail row. */
    column: Column<TValue> | null;
}
export interface FindCellValueParams<TData = any, TValue = any> extends FindCellParams<TData, TValue> {
    /** Display value to search within. */
    value: string;
    /**
     * Useful when trying to convert multiple values within a cell separately.
     * The value supplied here will be treated as the number of matches that appear before `value` in the cell,
     * and the active match will then be offset correctly.
     */
    precedingNumMatches?: number;
}
export interface FindPart {
    /** Partial display value. */
    value: string;
    /** `true` if a match. */
    match?: boolean;
    /** `true` if the active match. */
    activeMatch?: boolean;
}
export interface GetFindMatches<TData = any> {
    (params: GetFindMatchesParams<TData>): number;
}
export interface GetFindMatchesParams<TData = any> {
    node: IRowNode<TData>;
    data: TData;
    /** Current search value. */
    findSearchValue: string;
    /** Should be called if the number of matches has updated. */
    updateMatches: () => void;
    /** Helper function to get the number of matches within the provided string value. */
    getMatchesForValue: (value: string) => number;
}
export interface FindDetailCellRendererParams<TData = any> {
    /**
     * If using Find across Master / Detail, this will be called to work out
     * the number of matches that would be within the custom detail cell.
     */
    getFindMatches?: GetFindMatches<TData>;
}
export interface FindDetailGridCellRendererParams<TData = any> {
    /**
     * If using Find across Master / Detail and the Detail Grid is not open,
     * this will be called to work out the number of matches that would be
     * within the Detail Grid.
     */
    getFindMatches?: GetFindMatches<TData>;
}
export interface FindFullWidthCellRendererParams<TData = any> {
    /**
     * If using Find with full width rows, this will be called to work out
     * the number of matches that would be within the full width row.
     */
    getFindMatches?: GetFindMatches<TData>;
}
export interface FindGroupRowRendererParams<TData = any, TValue = any> {
    /**
     * When using Find with a custom group row renderer, this allows providing a custom value to search within.
     * E.g. if the group row renderer is displaying text that is different from the formatted value.
     * Returning `null` means Find will not search within the group row.
     */
    getFindText?: GetFindTextFunc<TData, TValue>;
}
