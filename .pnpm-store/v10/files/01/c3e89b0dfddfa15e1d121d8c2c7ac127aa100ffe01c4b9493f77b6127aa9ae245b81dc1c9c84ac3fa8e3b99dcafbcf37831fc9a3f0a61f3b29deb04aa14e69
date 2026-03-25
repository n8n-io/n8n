import type { RedocNormalizedOptions } from './RedocNormalizedOptions';
export declare class ScrollService {
    private options;
    private _scrollParent;
    private _emiter;
    private _prevOffsetY;
    constructor(options: RedocNormalizedOptions);
    bind(): void;
    dispose(): void;
    scrollY(): number;
    isElementBellow(el: Element | null): boolean | undefined;
    isElementAbove(el: Element | null): boolean | undefined;
    subscribe(cb: any): () => void;
    scrollIntoView(element: Element | null): void;
    scrollIntoViewBySelector(selector: string): void;
    handleScroll(): void;
}
