export declare class AutoScrollService {
    private tickingInterval;
    private readonly scrollHorizontally;
    private readonly scrollVertically;
    private tickLeft;
    private tickRight;
    private tickUp;
    private tickDown;
    private readonly scrollContainer;
    private readonly scrollByTick;
    private readonly getVerticalPosition;
    private readonly setVerticalPosition;
    private readonly getHorizontalPosition;
    private readonly setHorizontalPosition;
    private readonly shouldSkipVerticalScroll;
    private readonly shouldSkipHorizontalScroll;
    private readonly onScrollCallback;
    private tickCount;
    /** True while auto-scrolling */
    get scrolling(): boolean;
    constructor(params: {
        scrollContainer: HTMLElement;
        scrollAxis: 'x' | 'y' | 'xy';
        scrollByTick?: number;
        getVerticalPosition?: () => number;
        setVerticalPosition?: (position: number) => void;
        getHorizontalPosition?: () => number;
        setHorizontalPosition?: (position: number) => void;
        shouldSkipVerticalScroll?: () => boolean;
        shouldSkipHorizontalScroll?: () => boolean;
        onScrollCallback?: () => void;
    });
    check(mouseEvent: MouseEvent, forceSkipVerticalScroll?: boolean): void;
    private ensureTickingStarted;
    private doTick;
    ensureCleared(): void;
}
