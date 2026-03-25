import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { RowNode } from '../entities/rowNode';
import type { ColumnPinnedType } from '../interfaces/iColumn';
export declare class ColumnViewportService extends BeanStub implements NamedBean {
    beanName: "colViewport";
    private visibleCols;
    private colModel;
    wireBeans(beans: BeanCollection): void;
    private colsWithinViewport;
    private headerColsWithinViewport;
    colsWithinViewportHash: string;
    private rowsOfHeadersToRenderLeft;
    private rowsOfHeadersToRenderRight;
    private rowsOfHeadersToRenderCenter;
    private columnsToRenderLeft;
    private columnsToRenderRight;
    private columnsToRenderCenter;
    private scrollWidth;
    private scrollPosition;
    private viewportLeft;
    private viewportRight;
    private suppressColumnVirtualisation;
    postConstruct(): void;
    setScrollPosition(scrollWidth: number, scrollPosition: number, afterScroll?: boolean): void;
    /**
     * Returns the columns that are currently rendered in the viewport.
     */
    getColumnHeadersToRender(type: ColumnPinnedType): AgColumn[];
    /**
     * Returns the column groups that are currently rendered in the viewport at a specific header row index.
     */
    getHeadersToRender(type: ColumnPinnedType, depth: number): AgColumnGroup[];
    private extractViewportColumns;
    private isColumnVirtualisationSuppressed;
    clear(): void;
    private isColumnInHeaderViewport;
    private isColumnInRowViewport;
    getViewportColumns(): AgColumn[];
    getColsWithinViewport(rowNode: RowNode): AgColumn[];
    checkViewportColumns(afterScroll?: boolean): void;
    private calculateHeaderRows;
    private extractViewport;
}
