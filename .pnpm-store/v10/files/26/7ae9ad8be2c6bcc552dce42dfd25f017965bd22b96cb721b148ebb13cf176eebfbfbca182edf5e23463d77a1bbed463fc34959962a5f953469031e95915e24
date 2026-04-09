import { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { PopupService } from '../../widgets/popupService';
export interface PositionableOptions {
    popup?: boolean;
    minWidth?: number | null;
    width?: number | string | null;
    minHeight?: number | null;
    height?: number | string | null;
    centered?: boolean | null;
    calculateTopBuffer?: () => number;
    /**
     * Used for when a popup needs to be resized by an element within itself
     * In that case, the feature will configured as `popup=false` but the offsetParent
     * needs to be the popupParent.
     */
    forcePopupParentAsOffsetParent?: boolean;
    x?: number | null;
    y?: number | null;
}
export type ResizableSides = 'topLeft' | 'top' | 'topRight' | 'right' | 'bottomRight' | 'bottom' | 'bottomLeft' | 'left';
export type ResizableStructure = {
    [key in ResizableSides]?: boolean;
};
type PositionableFeatureEvent = 'resize';
export declare class PositionableFeature extends BeanStub<PositionableFeatureEvent> {
    private readonly element;
    protected popupSvc?: PopupService;
    private dragSvc?;
    wireBeans(beans: BeanCollection): void;
    private dragStartPosition;
    private readonly position;
    private readonly lastSize;
    private resizerMap;
    private minWidth;
    private minHeight?;
    private positioned;
    private resizersAdded;
    private readonly config;
    private readonly resizeListeners;
    private moveElementDragListener;
    private offsetParent;
    private boundaryEl;
    private isResizing;
    private isMoving;
    private resizable;
    private movable;
    private currentResizer;
    private resizeObserverSubscriber;
    constructor(element: HTMLElement, config?: PositionableOptions);
    center(postProcessCallback?: () => void): void;
    initialisePosition(postProcessCallback?: () => void): void;
    isPositioned(): boolean;
    getPosition(): {
        x: number;
        y: number;
    };
    setMovable(movable: boolean, moveElement: HTMLElement): void;
    setResizable(resizable: boolean | ResizableStructure): void;
    removeSizeFromEl(): void;
    restoreLastSize(): void;
    getHeight(): number | undefined;
    setHeight(height: number | string): void;
    private getAvailableHeight;
    getWidth(): number | undefined;
    setWidth(width: number | string): void;
    offsetElement(x?: number, y?: number, postProcessCallback?: () => void): void;
    constrainSizeToAvailableHeight(constrain: boolean): void;
    private setPosition;
    private updateDragStartPosition;
    private calculateMouseMovement;
    private shouldSkipX;
    private shouldSkipY;
    private createResizeMap;
    private addResizers;
    private removeResizers;
    private getResizerElement;
    private onResizeStart;
    private getSiblings;
    private getMinSizeOfSiblings;
    private applySizeToSiblings;
    isResizable(): boolean;
    private onResize;
    private onResizeEnd;
    private refreshSize;
    private onMoveStart;
    private onMove;
    private onMoveEnd;
    private setOffsetParent;
    private findBoundaryElement;
    private clearResizeListeners;
    destroy(): void;
}
export {};
