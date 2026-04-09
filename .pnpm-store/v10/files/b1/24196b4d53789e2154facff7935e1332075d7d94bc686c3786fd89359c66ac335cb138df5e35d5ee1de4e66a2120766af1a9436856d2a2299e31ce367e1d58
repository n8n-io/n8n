import type { AgColumn } from '../entities/agColumn';
import type { IColumnCollectionService } from './iColumnCollectionService';
export interface IGroupHierarchyColService extends IColumnCollectionService {
    /**
     * Mutates the `target` parameter, adding any virtual columns associated with the given source column, as well as the source column itself (last in the array)
     */
    expandColumnInto(target: AgColumn[], col: AgColumn): void;
    /**
     * Mutates the `columns` parameter, adding any virtual columns associated with the given source column, _not_ including the source column itself.
     * Returns the virtual columns added.
     */
    insertVirtualColumnsForCol(columns: AgColumn[], col: AgColumn): AgColumn[];
    /**
     * If both arguments are virtural columns with the same source column, we use the same
     * order in which they are added.
     *
     * If one column is a virtual column and the other its source column, the virtual column is sorted first.
     *
     * Otherwise, we defer sorting to the caller.
     */
    compareVirtualColumns(colA: AgColumn, colB: AgColumn): number | null;
}
