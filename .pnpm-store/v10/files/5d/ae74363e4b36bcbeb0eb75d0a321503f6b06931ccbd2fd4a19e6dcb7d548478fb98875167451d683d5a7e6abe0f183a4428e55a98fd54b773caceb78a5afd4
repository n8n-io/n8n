import type { GridApi } from '../api/gridApi';
type TypeOrNull<T> = T | null;
type ApiRef = {
    /** api of the grid to align with. */
    api?: TypeOrNull<GridApi>;
} | null;
/**
 * Alias for the grid API or an object containing the grid API for linking Aligned Grids.
 */
export type AlignedGrid = TypeOrNull<GridApi> | ApiRef | {
    current: ApiRef;
};
export {};
