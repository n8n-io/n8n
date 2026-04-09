import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import { AgColumn } from '../entities/agColumn';
import type { ColKey } from '../entities/colDef';
import type { PropertyValueChangedEvent } from '../gridOptionsService';
import type { IColumnCollectionService } from '../interfaces/iColumnCollectionService';
import type { ColumnCollections } from './columnModel';
export declare class SelectionColService extends BeanStub implements NamedBean, IColumnCollectionService {
    beanName: "selectionColSvc";
    columns: ColumnCollections | null;
    postConstruct(): void;
    addColumns(cols: ColumnCollections): void;
    createColumns(cols: ColumnCollections, updateOrders: (callback: (cols: AgColumn[] | null) => AgColumn[] | null) => void): void;
    updateColumns(event: PropertyValueChangedEvent<'selectionColumnDef'>): void;
    getColumn(key: ColKey): AgColumn | null;
    getColumns(): AgColumn[] | null;
    isSelectionColumnEnabled(): boolean;
    private createSelectionColDef;
    private generateSelectionCols;
    private onSelectionOptionsChanged;
    destroy(): void;
    /**
     * Refreshes visibility of the selection column based on which columns are currently visible.
     * Called by the VisibleColsService with the columns that are currently visible in left/center/right
     * containers. This method *MUTATES* those arrays directly.
     *
     * The selection column should be visible if all of the following are true
     * - The selection column is not disabled
     * - The number of visible columns excluding the selection column and row numbers column is greater than 0
     * @param leftCols Visible columns in the left-pinned container
     * @param centerCols Visible columns in the center viewport
     * @param rightCols Visible columns in the right-pinned container
     */
    refreshVisibility(leftCols: AgColumn[], centerCols: AgColumn[], rightCols: AgColumn[]): void;
}
