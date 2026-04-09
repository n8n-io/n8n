import type { ColumnCollections } from '../columns/columnModel';
import type { AgColumn } from '../entities/agColumn';
import type { ColDef, ColGroupDef, ColKey } from '../entities/colDef';
import type { ColumnEventType } from '../events';
export interface IPivotResultColsService {
    isPivotResultColsPresent(): boolean;
    lookupPivotResultCol(pivotKeys: string[], valueColKey: ColKey): AgColumn | null;
    getPivotResultCols(): ColumnCollections | null;
    getPivotResultCol(key: ColKey): AgColumn | null;
    setPivotResultCols(colDefs: (ColDef | ColGroupDef)[] | null, source: ColumnEventType): void;
}
