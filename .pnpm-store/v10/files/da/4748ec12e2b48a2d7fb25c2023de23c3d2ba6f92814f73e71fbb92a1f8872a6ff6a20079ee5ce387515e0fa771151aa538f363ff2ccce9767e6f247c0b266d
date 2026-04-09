import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { DragListenerParams, IDragService } from '../interfaces/iDrag';
import type { IPropertiesService } from '../interfaces/iProperties';
import { AgBeanStub } from './agBeanStub';
export declare class BaseDragService<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>> extends AgBeanStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService> implements IDragService {
    beanName: "dragSvc";
    dragging: boolean;
    private drag;
    private readonly dragSources;
    get startTarget(): EventTarget | null;
    /** True if there is at least one active pointer drag in any BaseDragService instance in the page */
    private isPointer;
    hasPointerCapture(): boolean;
    destroy(): void;
    removeDragSource(params: DragListenerParams): void;
    addDragSource(params: DragListenerParams): void;
    cancelDrag(eElement?: Element | undefined): void;
    protected shouldPreventMouseEvent(mouseEvent: MouseEvent): boolean;
    private initDrag;
    private destroyDrag;
    private onPointerDown;
    private onTouchStart;
    private onMouseDown;
    private onScroll;
    /** only gets called after a mouse down - as this is only added after mouseDown and is removed when mouseUp happens */
    private onMouseOrPointerMove;
    private onTouchMove;
    private onMove;
    private onTouchUp;
    private onMouseOrPointerUp;
    private onUp;
    private onKeyDown;
}
