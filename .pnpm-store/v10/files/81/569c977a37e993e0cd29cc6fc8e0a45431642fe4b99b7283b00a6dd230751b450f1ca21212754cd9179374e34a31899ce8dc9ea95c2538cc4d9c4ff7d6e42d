import type { AgColumn } from '../entities/agColumn';
export interface IShowRowGroupColsService {
    refresh(): void;
    getShowRowGroupCols(): AgColumn[];
    getShowRowGroupCol(id: string): AgColumn | undefined;
    getSourceColumnsForGroupColumn(groupCol: AgColumn): AgColumn[] | null;
    isRowGroupDisplayed(column: AgColumn, colId: string): boolean;
}
