import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { ColKey } from '../entities/colDef';
import type { ColumnEventType } from '../events';
import type { ISizeColumnsToFitParams, SizeColumnsToContentColumnLimits } from '../interfaces/autoSize';
interface AutoSizeColumnParams {
    colKeys: ColKey[];
    skipHeader?: boolean;
    skipHeaderGroups?: boolean;
    stopAtGroup?: AgColumnGroup;
    defaultMinWidth?: number;
    defaultMaxWidth?: number;
    columnLimits?: SizeColumnsToContentColumnLimits[];
    scaleUpToFitGridWidth?: boolean;
    source?: ColumnEventType;
}
export declare class ColumnAutosizeService extends BeanStub implements NamedBean {
    beanName: "colAutosize";
    private timesDelayed;
    /** when we're waiting for cell data types to be inferred, we need to defer column resizing */
    shouldQueueResizeOperations: boolean;
    private resizeOperationQueue;
    postConstruct(): void;
    autoSizeCols(params: AutoSizeColumnParams): void;
    private innerAutoSizeCols;
    autoSizeColumn(key: ColKey, source: ColumnEventType, skipHeader?: boolean): void;
    private autoSizeColumnGroupsByColumns;
    autoSizeAllColumns(params: {
        skipHeader?: boolean;
        defaultMinWidth?: number;
        defaultMaxWidth?: number;
        columnLimits?: SizeColumnsToContentColumnLimits[];
        source?: ColumnEventType;
    }): void;
    addColumnAutosizeListeners(element: HTMLElement, column: AgColumn): () => void;
    addColumnGroupResize(element: HTMLElement, columnGroup: AgColumnGroup, callback: () => void): () => void;
    sizeColumnsToFitGridBody(params?: ISizeColumnsToFitParams, nextTimeout?: number): void;
    sizeColumnsToFit(gridWidth: number, source?: ColumnEventType, silent?: boolean, params?: ISizeColumnsToFitParams & {
        colKeys?: ColKey[];
        onlyScaleUp?: boolean;
    }): void;
    applyAutosizeStrategy(): void;
    private onFirstDataRendered;
    processResizeOperations(): void;
    pushResizeOperation(func: () => void): void;
    destroy(): void;
}
export {};
