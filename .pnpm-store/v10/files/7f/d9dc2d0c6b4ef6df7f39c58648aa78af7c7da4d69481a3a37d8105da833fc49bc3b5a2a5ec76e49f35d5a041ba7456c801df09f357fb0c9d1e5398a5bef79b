import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { IRowNode, VerticalScrollPosition } from '../interfaces/iRowNode';
export interface ScrollPartner {
    eViewport: HTMLElement;
    onScrollCallback(fn: () => void): void;
}
export declare class GridBodyScrollFeature extends BeanStub {
    private ctrlsSvc;
    private animationFrameSvc?;
    private visibleCols;
    private clearRetryListenerFncs;
    wireBeans(beans: BeanCollection): void;
    private enableRtl;
    private lastScrollSource;
    private eBodyViewport;
    private scrollLeft;
    private nextScrollTop;
    private scrollTop;
    private lastOffsetHeight;
    private lastScrollTop;
    private lastIsHorizontalScrollShowing;
    private scrollTimer;
    private isScrollActive;
    private isVerticalPositionInvalidated;
    private isHorizontalPositionInvalidated;
    private readonly resetLastHScrollDebounced;
    private readonly resetLastVScrollDebounced;
    private centerRowsCtrl;
    constructor(eBodyViewport: HTMLElement);
    destroy(): void;
    postConstruct(): void;
    private invalidateHorizontalScroll;
    private invalidateVerticalScroll;
    private addScrollListener;
    private addHorizontalScrollListeners;
    private addVerticalScrollListeners;
    private registerScrollPartner;
    private onDisplayedColumnsWidthChanged;
    private horizontallyScrollHeaderCenterAndFloatingCenter;
    private setScrollLeftForAllContainersExceptCurrent;
    private getViewportForSource;
    private isControllingScroll;
    private onHScroll;
    private onVScroll;
    private doHorizontalScroll;
    isScrolling(): boolean;
    private fireScrollEvent;
    private shouldBlockScrollUpdate;
    private shouldBlockVerticalScroll;
    private shouldBlockHorizontalScroll;
    private redrawRowsAfterScroll;
    checkScrollLeft(): void;
    scrollGridIfNeeded(suppressedAnimationFrame?: boolean): boolean;
    setHorizontalScrollPosition(hScrollPosition: number, fromAlignedGridsService?: boolean): void;
    setVerticalScrollPosition(vScrollPosition: number): void;
    getVScrollPosition(): VerticalScrollPosition;
    /** Get an approximate scroll position that returns the last real value read.
     * This is useful for avoiding repeated DOM reads that force the browser to recalculate styles.
     * This can have big performance improvements but may not be 100% accurate so only use if this is acceptable.
     */
    getApproximateVScollPosition(): VerticalScrollPosition;
    getHScrollPosition(): {
        left: number;
        right: number;
    };
    isHorizontalScrollShowing(): boolean;
    scrollHorizontally(pixels: number): number;
    scrollToTop(): void;
    ensureNodeVisible<TData = any>(comparator: TData | IRowNode<TData> | ((row: IRowNode<TData>) => boolean), position?: 'top' | 'bottom' | 'middle' | null): void;
    ensureIndexVisible(index: number, position?: 'top' | 'bottom' | 'middle' | null, retry?: number): void;
    private clearRetryListeners;
    ensureColumnVisible(key: any, position?: 'auto' | 'start' | 'middle' | 'end'): void;
    private getPositionedHorizontalScroll;
    private isColumnOutsideViewport;
    private getColumnBounds;
    private getViewportBounds;
}
