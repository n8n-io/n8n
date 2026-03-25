import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { SortDirection } from '../entities/colDef';
import type { ColumnEventType } from '../events';
import type { SortModelItem } from '../interfaces/iSortModelItem';
import type { SortOption } from '../interfaces/iSortOption';
import type { Component, ComponentSelector } from '../widgets/component';
import { SortIndicatorComp } from './sortIndicatorComp';
export declare const DEFAULT_SORTING_ORDER: SortDirection[];
export declare class SortService extends BeanStub implements NamedBean {
    beanName: "sortSvc";
    progressSort(column: AgColumn, multiSort: boolean, source: ColumnEventType): void;
    progressSortFromEvent(column: AgColumn, event: MouseEvent | KeyboardEvent): void;
    setSortForColumn(column: AgColumn, sort: SortDirection, multiSort: boolean, source: ColumnEventType): void;
    private updateSortIndex;
    onSortChanged(source: string, columns?: AgColumn[]): void;
    isSortActive(): boolean;
    dispatchSortChangedEvents(source: string, columns?: AgColumn[]): void;
    private clearSortBarTheseColumns;
    private getNextSortDirection;
    /**
     * @returns a map of sort indexes for every sorted column, if groups sort primaries then they will have equivalent indices
     */
    private getIndexedSortMap;
    getColumnsWithSortingOrdered(): AgColumn[];
    getSortModel(): SortModelItem[];
    getSortOptions(): SortOption[];
    canColumnDisplayMixedSort(column: AgColumn): boolean;
    getDisplaySortForColumn(column: AgColumn): SortDirection | 'mixed' | undefined;
    getDisplaySortIndexForColumn(column: AgColumn): number | null | undefined;
    setupHeader(comp: Component, column: AgColumn, clickElement?: HTMLElement): void;
    initCol(column: AgColumn): void;
    updateColSort(column: AgColumn, sort: SortDirection | undefined, source: ColumnEventType): void;
    private setColSort;
    setColSortIndex(column: AgColumn, sortOrder?: number | null): void;
    createSortIndicator(skipTemplate?: boolean): SortIndicatorComp;
    getSortIndicatorSelector(): ComponentSelector;
}
