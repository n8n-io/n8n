import type { ColKey, Maybe } from '../columns/columnModel';
import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
import type { ColumnEventType } from '../events';
import type { ISizeColumnsToFitParams, SizeColumnsToContentColumnLimits } from '../interfaces/autoSize';
export declare class ColumnAutosizeService extends BeanStub implements NamedBean {
    beanName: "colAutosize";
    private timesDelayed;
    shouldQueueResizeOperations: boolean;
    private resizeOperationQueue;
    postConstruct(): void;
    autoSizeCols(params: {
        colKeys: ColKey[];
        skipHeader?: boolean;
        skipHeaderGroups?: boolean;
        stopAtGroup?: AgColumnGroup;
        defaultMinWidth?: number;
        defaultMaxWidth?: number;
        columnLimits?: SizeColumnsToContentColumnLimits[];
        source?: ColumnEventType;
    }): void;
    autoSizeColumn(key: Maybe<ColKey>, source: ColumnEventType, skipHeader?: boolean): void;
    private autoSizeColumnGroupsByColumns;
    autoSizeAllColumns(params: {
        skipHeader?: boolean;
        defaultMinWidth?: number;
        defaultMaxWidth?: number;
        columnLimits?: SizeColumnsToContentColumnLimits[];
        source?: ColumnEventType;
    }): void;
    addColumnAutosize(element: HTMLElement, column: AgColumn): () => void;
    addColumnGroupResize(element: HTMLElement, columnGroup: AgColumnGroup, callback: () => void): () => void;
    sizeColumnsToFitGridBody(params?: ISizeColumnsToFitParams, nextTimeout?: number): void;
    sizeColumnsToFit(gridWidth: any, source?: ColumnEventType, silent?: boolean, params?: ISizeColumnsToFitParams): void;
    applyAutosizeStrategy(): void;
    private onFirstDataRendered;
    processResizeOperations(): void;
    pushResizeOperation(func: () => void): void;
    destroy(): void;
}
