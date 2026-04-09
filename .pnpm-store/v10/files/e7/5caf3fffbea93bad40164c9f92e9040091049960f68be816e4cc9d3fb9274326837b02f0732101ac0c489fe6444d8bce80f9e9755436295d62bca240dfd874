import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { RowNode } from '../entities/rowNode';
import type { IRowNode } from '../interfaces/iRowNode';
import type { RowDraggingEvent } from './rowDragTypes';
export type DropIndicatorPosition = 'above' | 'inside' | 'below' | 'none';
export interface RowDropPositionIndicator<TData = any> {
    row: IRowNode<TData> | null;
    dropIndicatorPosition: DropIndicatorPosition;
}
export interface SetRowDropPositionIndicatorParams<TData = any> {
    row: IRowNode<TData> | null | undefined;
    dropIndicatorPosition: DropIndicatorPosition | null | false;
}
export declare class RowDropHighlightService extends BeanStub implements NamedBean {
    beanName: "rowDropHighlightSvc";
    private uiLevel;
    private dragging;
    row: RowNode | null;
    position: DropIndicatorPosition;
    postConstruct(): void;
    private onModelUpdated;
    destroy(): void;
    clear(): void;
    set(row: RowNode, dropIndicatorPosition: Exclude<DropIndicatorPosition, 'none'>): void;
    fromDrag(draggingEvent: RowDraggingEvent | null): void;
}
