import { BeanStub } from '../../context/beanStub';
import type { DragAndDropIcon, DropTarget, GridDraggingEvent } from '../../dragAndDrop/dragAndDropService';
import { DragSourceType } from '../../dragAndDrop/dragAndDropService';
import type { ColumnPinnedType } from '../../interfaces/iColumn';
export interface DropListener {
    getIconName(): DragAndDropIcon | null;
    onDragEnter(params: GridDraggingEvent): void;
    onDragLeave(params: GridDraggingEvent): void;
    onDragging(params: GridDraggingEvent): void;
    onDragStop(params: GridDraggingEvent): void;
    onDragCancel(): void;
}
export declare class BodyDropTarget extends BeanStub implements DropTarget {
    private readonly pinned;
    private readonly eContainer;
    private eSecondaryContainers;
    private currentDropListener;
    private moveColumnFeature;
    private bodyDropPivotTarget;
    constructor(pinned: ColumnPinnedType, eContainer: HTMLElement);
    postConstruct(): void;
    isInterestedIn(type: DragSourceType): boolean;
    getSecondaryContainers(): HTMLElement[][];
    getContainer(): HTMLElement;
    getIconName(): DragAndDropIcon | null;
    private isDropColumnInPivotMode;
    onDragEnter(draggingEvent: GridDraggingEvent): void;
    onDragLeave(params: GridDraggingEvent): void;
    onDragging(params: GridDraggingEvent): void;
    onDragStop(params: GridDraggingEvent): void;
    onDragCancel(): void;
}
