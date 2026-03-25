import { BeanStub } from '../../context/beanStub';
import type { DragAndDropIcon, DraggingEvent } from '../../dragAndDrop/dragAndDropService';
import type { ColumnPinnedType } from '../../interfaces/iColumn';
import type { DropListener } from './bodyDropTarget';
export declare class BodyDropPivotTarget extends BeanStub implements DropListener {
    private readonly pinned;
    private columnsToAggregate;
    private columnsToGroup;
    private columnsToPivot;
    constructor(pinned: ColumnPinnedType);
    /** Callback for when drag enters */
    onDragEnter(draggingEvent: DraggingEvent): void;
    getIconName(): DragAndDropIcon | null;
    /** Callback for when drag leaves */
    onDragLeave(draggingEvent: DraggingEvent): void;
    private clearColumnsList;
    /** Callback for when dragging */
    onDragging(draggingEvent: DraggingEvent): void;
    /** Callback for when drag stops */
    onDragStop(draggingEvent: DraggingEvent): void;
    onDragCancel(): void;
}
