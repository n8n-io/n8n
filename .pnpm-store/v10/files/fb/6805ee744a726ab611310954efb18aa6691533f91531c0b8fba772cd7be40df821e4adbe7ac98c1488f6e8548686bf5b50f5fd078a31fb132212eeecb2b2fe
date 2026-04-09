import type { HorizontalDirection, VerticalDirection } from '../constants/direction';
export interface IDragAndDropService<TDragSourceType extends number, TDragItem, TDragAndDropIcon extends string, TDraggingEvent extends AgDraggingEvent<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>, TDragSource extends AgDragSource<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>> {
    readonly beanName: 'dragAndDrop';
    addDragSource(dragSource: TDragSource, allowTouch?: boolean): void;
    setDragDropIcon(iconName: string | null, shake: boolean): void;
    removeDragSource(dragSource: TDragSource): void;
    nudge(): void;
    addDropTarget(dropTarget: AgDropTarget<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>): void;
    removeDropTarget(dropTarget: AgDropTarget<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>): void;
    hasExternalDropZones(): boolean;
    findExternalZone(container: HTMLElement): AgDropTarget<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent> | null;
}
export interface AgDragSource<TDragSourceType extends number, TDragItem, TDragAndDropIcon extends string, TDraggingEvent extends AgDraggingEvent<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>> {
    /** The type of the drag source, used by the drop target to know where the drag originated from. */
    type: TDragSourceType;
    /** Can be used to identify a specific component as the source */
    sourceId?: string;
    /** Element which, when dragged, will kick off the DnD process */
    eElement: Element;
    /** If eElement is dragged, then the dragItem is the object that gets passed around. */
    getDragItem: () => TDragItem;
    /** This name appears in the drag and drop image component when dragging. */
    dragItemName: ((draggingEvent?: TDraggingEvent | null) => string | null | undefined) | string | null;
    /** Icon to show when not over a drop zone */
    getDefaultIconName?: () => TDragAndDropIcon;
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
}
export interface AgDraggingEvent<TDragSourceType extends number, TDragItem, TDragAndDropIcon extends string, TDraggingEvent extends AgDraggingEvent<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>, TDrop = any> {
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
    /** The x-offset of the pointer from the drag source when the drag operation started */
    initialSourcePointerOffsetX: number;
    /** The y-offset of the pointer from the drag source when the drag operation started */
    initialSourcePointerOffsetY: number;
    /** The drag source that initiated the drag */
    dragSource: AgDragSource<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>;
    /** The drag item that is being dragged */
    dragItem: TDragItem;
    fromNudge: boolean;
    /** The target element where the drop is happening */
    dropZoneTarget: HTMLElement;
    /** Details about the row dragging drop target. */
    dropTarget: TDrop | null;
    /** True if relevant information about the drop target are changed and the drag ghost need to be updated */
    changed: boolean;
}
export interface AgDropTarget<TDragSourceType extends number, TDragItem, TDragAndDropIcon extends string, TDraggingEvent extends AgDraggingEvent<TDragSourceType, TDragItem, TDragAndDropIcon, TDraggingEvent>> {
    /** The main container that will get the drop. */
    getContainer(): HTMLElement;
    /** If any secondary containers. For example when moving columns in AG Grid, we listen for drops
     * in the header as well as the body (main rows and pinned rows) of the grid. */
    getSecondaryContainers?(): HTMLElement[][];
    /** Icon to show when drag is over */
    getIconName?(draggingEvent?: TDraggingEvent | null | undefined): TDragAndDropIcon | null | undefined;
    isInterestedIn(type: TDragSourceType, el: Element): boolean;
    /**
     * If `true`, the DragSources will only be allowed to be dragged within the DragTarget that contains them.
     * This is useful for changing order of items within a container, and not moving items across containers.
     * @default false
     */
    targetContainsSource?: boolean;
    /** Callback for when drag enters */
    onDragEnter?(params: TDraggingEvent): void;
    /** Callback for when drag leaves */
    onDragLeave?(params: TDraggingEvent): void;
    /** Callback for when dragging */
    onDragging?(params: TDraggingEvent): void;
    /** Callback for when drag stops */
    onDragStop?(params: TDraggingEvent): void;
    /** Callback for when the drag is cancelled */
    onDragCancel?(params: TDraggingEvent): void;
    external?: boolean;
}
export interface IDragAndDropImage {
    setIcon(iconName: string | null, shake: boolean): void;
    setLabel(label: string): void;
}
