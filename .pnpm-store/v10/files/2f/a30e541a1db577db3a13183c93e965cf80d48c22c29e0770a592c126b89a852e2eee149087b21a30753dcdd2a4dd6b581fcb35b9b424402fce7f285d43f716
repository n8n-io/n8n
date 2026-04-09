import type { HorizontalDirection, VerticalDirection } from '../agStack/constants/direction';
import type { AgDraggingEvent } from '../agStack/interfaces/iDragAndDrop';
import type { RowDragCancelEvent, RowDragEndEvent, RowDragEnterEvent, RowDragLeaveEvent, RowDragMoveEvent } from '../events';
import type { AgGridCommon } from '../interfaces/iCommon';
import type { DragItem } from '../interfaces/iDragItem';
import type { IRowNode } from '../interfaces/iRowNode';
import type { DragAndDropIcon, DragSourceType } from './dragAndDropService';
export type RowDropTargetPosition = 'above' | 'inside' | 'below' | 'none';
export interface IsRowValidDropPositionResult<TData = any> {
    /** The rows that are being dropped, can be used to filter the rows. If empty, the operation is aborted. */
    rows?: IRowNode<TData>[] | null;
    /** The position of the rows relative to the target row. If "none" the drop is not allowed */
    position?: RowDropTargetPosition;
    /** The new parent row the rows will have after dropped */
    newParent?: IRowNode<TData> | null;
    /** The target row node where the row is being dropped. */
    target?: IRowNode<TData> | null;
    /** True if the drop is allowed, false otherwise */
    allowed?: boolean;
    /**
     * True if the drop target can be highlighted, matching the `position` value.
     * Can be set to true during unmanaged row dragging to show the drop position indicator.
     */
    highlight?: boolean;
    /** True if relevant information about the drop target are changed and the drag ghost need to be updated */
    changed?: boolean;
}
export type IsRowValidDropPositionCallback<TData = any, TContext = any> = (params: IsRowValidDropPositionParams<TData, TContext>) => IsRowValidDropPositionResult<TData> | null | boolean;
export interface DragSource {
    /** The type of the drag source, used by the drop target to know where the drag originated from. */
    type: DragSourceType;
    /** Can be used to identify a specific component as the source */
    sourceId?: string;
    /** Element which, when dragged, will kick off the DnD process */
    eElement: Element;
    /** If eElement is dragged, then the dragItem is the object that gets passed around. */
    getDragItem: () => DragItem;
    /** This name appears in the drag and drop image component when dragging. */
    dragItemName: ((draggingEvent?: DraggingEvent | null) => string | null | undefined) | string | null;
    /** Icon to show when not over a drop zone */
    getDefaultIconName?: () => DragAndDropIcon;
    /** The drag source DOM Data Key, this is useful to detect if the origin grid is the same as the target grid. */
    dragSourceDomDataKey?: string;
    /** After how many pixels of dragging should the drag operation start. Default is 4. */
    dragStartPixels?: number;
    /** Callback for drag started */
    onDragStarted?: () => void;
    /** Callback for drag stopped */
    onDragStopped?: () => void;
    /** Callback for drag cancelled */
    onDragCancelled?: () => void;
    /** Callback for entering the grid */
    onGridEnter?: (dragItem: DragItem | null) => void;
    /** Callback for exiting the grid */
    onGridExit?: (dragItem: DragItem | null) => void;
}
export interface DraggingEvent<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The mouse event that triggered the dragging event */
    event: MouseEvent;
    /** The X position in pixel relative to the drop target */
    x: number;
    /** The Y position in pixel relative to the drop target */
    y: number;
    /** The vertical direction of the drag, can be 'up', 'down' or null */
    vDirection: VerticalDirection | null;
    /** The horizontal direction of the drag, can be 'left', 'right' or null */
    hDirection: HorizontalDirection | null;
    /** The drag source that initiated the drag */
    dragSource: DragSource;
    /** The drag item that is being dragged */
    dragItem: DragItem;
    fromNudge: boolean;
    /** The target element where the drop is happening */
    dropZoneTarget: HTMLElement;
}
export interface IsRowValidDropPositionParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    /** The dragging event that originated this drop operation */
    draggingEvent: DraggingEvent<TData, TContext> | null;
    /** True if the grid is managing row dragging, false if using unmanaged row dragging */
    rowDragManaged: boolean;
    /** True if the grid is suppressing move when row dragging, false otherwise */
    suppressMoveWhenRowDragging: boolean;
    /** True if this rows comes from the same grid, false if is coming from another grid */
    sameGrid: boolean;
    /** True if the drop zone is within this grid, false otherwise */
    withinGrid: boolean;
    /** The root row node that contains all the rows */
    rootNode: IRowNode<TData>;
    /** The vertical pixel location the mouse is over, with `0` meaning the top of the first row.
     * This can be compared to the `rowNode.rowHeight` and `rowNode.rowTop` to work out the mouse position relative to rows.
     * The provided attributes `overIndex` and `overNode` means the `y` property is mostly redundant.
     * The `y` property can be handy if you want more information such as 'how close is the mouse to the top or bottom of the row?'
     */
    y: number;
    /** True if the current row dragged is not the same as the target row */
    moved: boolean;
    /** The row node the mouse is dragging over or undefined if over no row. Might be different than `target`. */
    overNode: IRowNode<TData> | undefined;
    /** The row index the mouse is dragging over or -1 if over no row. */
    overIndex: number;
    /** The position of the rows relative to the target row */
    position: RowDropTargetPosition;
    /** The source row node that was dragged, if any */
    source: IRowNode<TData>;
    /** The target row node where the row is being dropped. */
    target: IRowNode<TData> | null;
    /** The new parent row the rows will have after dropped */
    newParent: IRowNode<TData> | null;
    /** The rows that are being dropped */
    rows: IRowNode<TData>[];
    /** True if the drop is allowed, false otherwise */
    allowed: boolean;
}
/** This is used internally instead of `GridDraggingEvent` to type `dropTarget` for row dragging */
export interface RowDraggingEvent<TData = any, TContext = any> extends AgDraggingEvent<DragSourceType, DragItem, DragAndDropIcon, RowDraggingEvent, RowsDrop<TData, TContext>>, AgGridCommon<TData, TContext> {
}
/** This is only used internally */
export interface RowsDrop<TData = any, TContext = any> extends Omit<IsRowValidDropPositionParams<TData, TContext>, 'draggingEvent'> {
    /** The dragging event that originated this drop operation */
    draggingEvent: RowDraggingEvent<TData, TContext> | null;
    /** True if the drop target can be highlighted while moving, matching the `position` value. */
    highlight: boolean;
}
export interface RowsDropParams<TData = any, TContext = any> extends IsRowValidDropPositionParams<TData, TContext> {
}
export interface RowDropZoneEvents {
    /** Callback function that will be executed when the rowDrag enters the target. */
    onDragEnter?: (params: RowDragEnterEvent) => void;
    /** Callback function that will be executed when the rowDrag leaves the target */
    onDragLeave?: (params: RowDragLeaveEvent) => void;
    /**
     * Callback function that will be executed when the rowDrag is dragged inside the target.
     * Note: this gets called multiple times.
     */
    onDragging?: (params: RowDragMoveEvent) => void;
    /** Callback function that will be executed when the rowDrag drops rows within the target. */
    onDragStop?: (params: RowDragEndEvent) => void;
    onDragCancel?: (params: RowDragCancelEvent) => void;
}
export interface RowDropZoneParams extends RowDropZoneEvents {
    /** A callback method that returns the DropZone HTMLElement. */
    getContainer: () => HTMLElement;
}
