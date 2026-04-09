import { BaseDragAndDropService } from '../agStack/core/baseDragAndDropService';
import type { IComponent } from '../agStack/interfaces/iComponent';
import type { AgDragSource, AgDraggingEvent, AgDropTarget, IDragAndDropImage } from '../agStack/interfaces/iDragAndDrop';
import type { AgPromise } from '../agStack/utils/promise';
import type { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { AgEventTypeParams } from '../events';
import type { GridOptionsWithDefaults } from '../gridOptionsDefault';
import type { GridOptionsService } from '../gridOptionsService';
import type { AgGridCommon } from '../interfaces/iCommon';
import type { DragItem } from '../interfaces/iDragItem';
export declare enum DragSourceType {
    ToolPanel = 0,
    HeaderCell = 1,
    RowDrag = 2,
    ChartPanel = 3,
    AdvancedFilterBuilder = 4
}
/** This is used internally. `DragSource` is used for external-facing things */
export interface GridDragSource<TDraggingEvent extends AgDraggingEvent<DragSourceType, DragItem, DragAndDropIcon, TDraggingEvent> = GridDraggingEvent> extends AgDragSource<DragSourceType, DragItem, DragAndDropIcon, TDraggingEvent> {
    /** Callback for entering the grid */
    onGridEnter?: (dragItem: DragItem | null) => void;
    /** Callback for exiting the grid */
    onGridExit?: (dragItem: DragItem | null) => void;
}
export interface DropTarget extends AgDropTarget<DragSourceType, DragItem, DragAndDropIcon, GridDraggingEvent> {
}
/** This is used internally. `DraggingEvent` is used for external-facing things */
export interface GridDraggingEvent<TData = any, TContext = any> extends AgDraggingEvent<DragSourceType, DragItem, DragAndDropIcon, GridDraggingEvent>, AgGridCommon<TData, TContext> {
}
export type DragAndDropIcon = 'pinned' | 'move' | 'left' | 'right' | 'group' | 'aggregate' | 'pivot' | 'notAllowed' | 'hide';
export declare class DragAndDropService extends BaseDragAndDropService<BeanCollection, GridOptionsWithDefaults, AgEventTypeParams, AgGridCommon<any, any>, GridOptionsService, DragSourceType, DragItem, DragAndDropIcon, GridDraggingEvent, GridDragSource> {
    protected createEvent(event: AgDraggingEvent<DragSourceType, DragItem, DragAndDropIcon, GridDraggingEvent>): GridDraggingEvent;
    protected createDragImageComp(dragSource: GridDragSource): AgPromise<IDragAndDropImage & IComponent<any>> | undefined;
    protected handleEnter(dragSource: GridDragSource | null, dragItem: DragItem | null): void;
    protected handleExit(dragSource: GridDragSource | null, dragItem: DragItem | null): void;
    protected warnNoBody(): void;
    isDropZoneWithinThisGrid(draggingEvent: AgDraggingEvent<DragSourceType, DragItem, DragAndDropIcon, GridDraggingEvent>): boolean;
    registerGridDropTarget(elementFn: () => HTMLElement, ctrl: BeanStub): void;
}
