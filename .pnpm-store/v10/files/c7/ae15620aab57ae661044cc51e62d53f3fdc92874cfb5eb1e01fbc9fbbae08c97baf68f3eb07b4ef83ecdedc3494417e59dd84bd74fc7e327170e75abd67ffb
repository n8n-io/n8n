export * from './utils.cjs';
type ScrollDirection = 'forward' | 'backward';
type ScrollAlignment = 'start' | 'center' | 'end' | 'auto';
type ScrollBehavior = 'auto' | 'smooth';
export interface ScrollToOptions {
    align?: ScrollAlignment;
    behavior?: ScrollBehavior;
}
type ScrollToOffsetOptions = ScrollToOptions;
type ScrollToIndexOptions = ScrollToOptions;
export interface Range {
    startIndex: number;
    endIndex: number;
    overscan: number;
    count: number;
}
type Key = number | string | bigint;
export interface VirtualItem {
    key: Key;
    index: number;
    start: number;
    end: number;
    size: number;
    lane: number;
}
export interface Rect {
    width: number;
    height: number;
}
export declare const defaultKeyExtractor: (index: number) => number;
export declare const defaultRangeExtractor: (range: Range) => number[];
export declare const observeElementRect: <T extends Element>(instance: Virtualizer<T, any>, cb: (rect: Rect) => void) => (() => void) | undefined;
export declare const observeWindowRect: (instance: Virtualizer<Window, any>, cb: (rect: Rect) => void) => (() => void) | undefined;
type ObserveOffsetCallBack = (offset: number, isScrolling: boolean) => void;
export declare const observeElementOffset: <T extends Element>(instance: Virtualizer<T, any>, cb: ObserveOffsetCallBack) => (() => void) | undefined;
export declare const observeWindowOffset: (instance: Virtualizer<Window, any>, cb: ObserveOffsetCallBack) => (() => void) | undefined;
export declare const measureElement: <TItemElement extends Element>(element: TItemElement, entry: ResizeObserverEntry | undefined, instance: Virtualizer<any, TItemElement>) => number;
export declare const windowScroll: <T extends Window>(offset: number, { adjustments, behavior, }: {
    adjustments?: number | undefined;
    behavior?: ScrollBehavior | undefined;
}, instance: Virtualizer<T, any>) => void;
export declare const elementScroll: <T extends Element>(offset: number, { adjustments, behavior, }: {
    adjustments?: number | undefined;
    behavior?: ScrollBehavior | undefined;
}, instance: Virtualizer<T, any>) => void;
export interface VirtualizerOptions<TScrollElement extends Element | Window, TItemElement extends Element> {
    count: number;
    getScrollElement: () => TScrollElement | null;
    estimateSize: (index: number) => number;
    scrollToFn: (offset: number, options: {
        adjustments?: number;
        behavior?: ScrollBehavior;
    }, instance: Virtualizer<TScrollElement, TItemElement>) => void;
    observeElementRect: (instance: Virtualizer<TScrollElement, TItemElement>, cb: (rect: Rect) => void) => void | (() => void);
    observeElementOffset: (instance: Virtualizer<TScrollElement, TItemElement>, cb: ObserveOffsetCallBack) => void | (() => void);
    debug?: boolean;
    initialRect?: Rect;
    onChange?: (instance: Virtualizer<TScrollElement, TItemElement>, sync: boolean) => void;
    measureElement?: (element: TItemElement, entry: ResizeObserverEntry | undefined, instance: Virtualizer<TScrollElement, TItemElement>) => number;
    overscan?: number;
    horizontal?: boolean;
    paddingStart?: number;
    paddingEnd?: number;
    scrollPaddingStart?: number;
    scrollPaddingEnd?: number;
    initialOffset?: number | (() => number);
    getItemKey?: (index: number) => Key;
    rangeExtractor?: (range: Range) => Array<number>;
    scrollMargin?: number;
    gap?: number;
    indexAttribute?: string;
    initialMeasurementsCache?: Array<VirtualItem>;
    lanes?: number;
    isScrollingResetDelay?: number;
    useScrollendEvent?: boolean;
    enabled?: boolean;
    isRtl?: boolean;
    useAnimationFrameWithResizeObserver?: boolean;
}
export declare class Virtualizer<TScrollElement extends Element | Window, TItemElement extends Element> {
    private unsubs;
    options: Required<VirtualizerOptions<TScrollElement, TItemElement>>;
    scrollElement: TScrollElement | null;
    targetWindow: (Window & typeof globalThis) | null;
    isScrolling: boolean;
    private scrollToIndexTimeoutId;
    measurementsCache: Array<VirtualItem>;
    private itemSizeCache;
    private pendingMeasuredCacheIndexes;
    scrollRect: Rect | null;
    scrollOffset: number | null;
    scrollDirection: ScrollDirection | null;
    private scrollAdjustments;
    shouldAdjustScrollPositionOnItemSizeChange: undefined | ((item: VirtualItem, delta: number, instance: Virtualizer<TScrollElement, TItemElement>) => boolean);
    elementsCache: Map<Key, TItemElement>;
    private observer;
    range: {
        startIndex: number;
        endIndex: number;
    } | null;
    constructor(opts: VirtualizerOptions<TScrollElement, TItemElement>);
    setOptions: (opts: VirtualizerOptions<TScrollElement, TItemElement>) => void;
    private notify;
    private maybeNotify;
    private cleanup;
    _didMount: () => () => void;
    _willUpdate: () => void;
    private getSize;
    private getScrollOffset;
    private getFurthestMeasurement;
    private getMeasurementOptions;
    private getMeasurements;
    calculateRange: {
        (): {
            startIndex: number;
            endIndex: number;
        } | null;
        updateDeps(newDeps: [VirtualItem[], number, number, number]): void;
    };
    getVirtualIndexes: {
        (): number[];
        updateDeps(newDeps: [(range: Range) => number[], number, number, number | null, number | null]): void;
    };
    indexFromElement: (node: TItemElement) => number;
    private _measureElement;
    resizeItem: (index: number, size: number) => void;
    measureElement: (node: TItemElement | null | undefined) => void;
    getVirtualItems: {
        (): VirtualItem[];
        updateDeps(newDeps: [number[], VirtualItem[]]): void;
    };
    getVirtualItemForOffset: (offset: number) => VirtualItem | undefined;
    getOffsetForAlignment: (toOffset: number, align: ScrollAlignment, itemSize?: number) => number;
    getOffsetForIndex: (index: number, align?: ScrollAlignment) => readonly [number, "auto"] | readonly [number, "start" | "center" | "end"] | undefined;
    private isDynamicMode;
    private cancelScrollToIndex;
    scrollToOffset: (toOffset: number, { align, behavior }?: ScrollToOffsetOptions) => void;
    scrollToIndex: (index: number, { align: initialAlign, behavior }?: ScrollToIndexOptions) => void;
    scrollBy: (delta: number, { behavior }?: ScrollToOffsetOptions) => void;
    getTotalSize: () => number;
    private _scrollToOffset;
    measure: () => void;
}
