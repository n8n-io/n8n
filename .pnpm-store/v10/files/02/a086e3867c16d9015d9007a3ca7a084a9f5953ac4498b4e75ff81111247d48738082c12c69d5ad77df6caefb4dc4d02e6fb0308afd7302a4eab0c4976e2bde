import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import { AgColumn } from '../entities/agColumn';
import type { AgProvidedColumnGroup } from '../entities/agProvidedColumnGroup';
import type { ColDef, ColGroupDef, ColKey } from '../entities/colDef';
import type { GridOptions } from '../entities/gridOptions';
import type { ColumnEventType } from '../events';
import type { PropertyChangedEvent, PropertyValueChangedEvent } from '../gridOptionsService';
export type Maybe<T> = T | null | undefined;
export interface ColumnCollections {
    tree: (AgColumn | AgProvidedColumnGroup)[];
    treeDepth: number;
    list: AgColumn[];
    map: {
        [id: string]: AgColumn;
    };
}
export declare class ColumnModel extends BeanStub implements NamedBean {
    beanName: "colModel";
    private colDefs?;
    colDefCols?: ColumnCollections;
    cols?: ColumnCollections;
    private pivotMode;
    private showingPivotResult;
    private lastOrder;
    private lastPivotOrder;
    colSpanActive: boolean;
    ready: boolean;
    changeEventsDispatching: boolean;
    postConstruct(): void;
    private createColsFromColDefs;
    refreshCols(newColDefs: boolean, source: ColumnEventType): void;
    private createColumnsForService;
    private selectCols;
    getColsToShow(): AgColumn[];
    refreshAll(source: ColumnEventType): void;
    setColsVisible(keys: (string | AgColumn)[], visible: boolean | undefined, source: ColumnEventType): void;
    /**
     * Restores provided columns order to the previous order in this.lastPivotOrder / this.lastOrder
     * If columns are not in the last order:
     *  - Check column groups, and apply column after the last column in the lowest shared group
     *  - If no sibling is found, apply the column at the end of the cols
     */
    private restoreColOrder;
    private positionLockedCols;
    private saveColOrder;
    getColumnDefs(sorted?: boolean): (ColDef | ColGroupDef)[] | undefined;
    private setColSpanActive;
    isPivotMode(): boolean;
    private setPivotMode;
    isPivotActive(): boolean;
    recreateColumnDefs(e: PropertyChangedEvent | PropertyValueChangedEvent<keyof GridOptions>): void;
    setColumnDefs(columnDefs: (ColDef | ColGroupDef)[], source: ColumnEventType): void;
    destroy(): void;
    getColTree(): (AgColumn | AgProvidedColumnGroup)[];
    getColDefColTree(): (AgColumn | AgProvidedColumnGroup)[];
    getColDefCols(): AgColumn[] | null;
    getCols(): AgColumn[];
    forAllCols(callback: (column: AgColumn) => void): void;
    getColsForKeys(keys: ColKey[]): AgColumn[];
    getColDefCol(key: ColKey): AgColumn | null;
    getCol(key: Maybe<ColKey>): AgColumn | null;
    /**
     * Get column exclusively by ID.
     *
     * Note getCol/getColFromCollection have poor performance when col has been removed.
     */
    getColById(key: string): AgColumn | null;
    getColFromCollection(key: ColKey, cols?: ColumnCollections): AgColumn | null;
}
