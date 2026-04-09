import { BeanStub } from '../context/beanStub';
import type { DragAndDropIcon, DropTarget } from './dragAndDropService';
import { DragSourceType } from './dragAndDropService';
import type { RowDraggingEvent, RowDropZoneEvents, RowDropZoneParams } from './rowDragTypes';
export declare class RowDragFeature extends BeanStub implements DropTarget {
    private eContainer;
    private lastDraggingEvent;
    private nudger;
    constructor(eContainer: HTMLElement | null);
    postConstruct(): void;
    destroy(): void;
    getContainer(): HTMLElement;
    isInterestedIn(type: DragSourceType): boolean;
    getIconName(draggingEvent: RowDraggingEvent | null): DragAndDropIcon;
    shouldPreventRowMove(): boolean;
    private getRowNodes;
    onDragEnter(draggingEvent: RowDraggingEvent): void;
    onDragging(draggingEvent: RowDraggingEvent): void;
    private dragging;
    private isFromThisGrid;
    private makeRowsDrop;
    private newRowsDrop;
    private validateRowsDrop;
    private targetShouldBeParent;
    addRowDropZone(params: RowDropZoneParams & {
        fromGrid?: boolean;
    }): void;
    getRowDropZone(events?: RowDropZoneEvents): RowDropZoneParams;
    private getOverNode;
    private rowDragEvent;
    private dispatchGridEvent;
    onDragLeave(draggingEvent: RowDraggingEvent): void;
    onDragStop(draggingEvent: RowDraggingEvent): void;
    onDragCancel(draggingEvent: RowDraggingEvent): void;
    private stopDragging;
    /** Drag and drop. Returns false if at least a row was moved, otherwise true */
    private dropRows;
    private csrmAddRows;
    private filterRows;
    private csrmMoveRows;
    /** For reorderLeafChildren, returns min index of the rows to move, the target index and the max index of the rows to move. */
    private getMoveRowsBounds;
    /** Reorders the children of the root node, so that the rows to move are in the correct order.
     * @param leafs The valid set of rows to move, as returned by getValidRowsToMove
     * @param firstAffectedLeafIdx The first index of the rows to move
     * @param targetPositionIdx The target index, where the rows will be moved
     * @param lastAffectedLeafIndex The last index of the rows to move
     * @returns True if the order of the rows changed, false otherwise
     */
    private reorderLeafChildren;
}
