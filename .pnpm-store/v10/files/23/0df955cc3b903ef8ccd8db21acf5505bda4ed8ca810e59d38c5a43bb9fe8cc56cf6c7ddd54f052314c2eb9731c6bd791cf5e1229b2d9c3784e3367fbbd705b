export interface IDragService {
    readonly beanName: 'dragSvc';
    readonly startTarget: EventTarget | null;
    removeDragSource(params: DragListenerParams): void;
    addDragSource(params: DragListenerParams): void;
    cancelDrag(el?: Element): void;
    /** Returns true if the pointer is currently captured. See https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events */
    hasPointerCapture(): boolean;
}
export interface DragListenerParams {
    /** If true, the pointer will be captured, see https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events */
    capturePointer?: boolean;
    /** After how many pixels of dragging should the drag operation start. Default is 4px. */
    dragStartPixels?: number;
    /** Dom element to add the drag handling to */
    eElement: Element;
    /** Callback for drag starting */
    onDragStart: (mouseEvent: MouseEvent | Touch) => void;
    /** Callback for drag stopping */
    onDragStop: (mouseEvent: MouseEvent | Touch) => void;
    /** Callback for drag cancel */
    onDragCancel?: () => void;
    /** Callback for mouse move while dragging */
    onDragging: (mouseEvent: MouseEvent | Touch) => void;
    /** Include touch events for this Drag Listener */
    includeTouch?: boolean;
    /** If `true`, it will stop the propagation of Touch Events */
    stopPropagationForTouch?: boolean;
}
