import type { ComponentPublicInstance, ObjectDirective } from 'vue';
export declare const SCOPE = "ElInfiniteScroll";
export declare const CHECK_INTERVAL = 50;
export declare const DEFAULT_DELAY = 200;
export declare const DEFAULT_DISTANCE = 0;
declare type InfiniteScrollCallback = () => void;
declare type InfiniteScrollEl = HTMLElement & {
    [SCOPE]: {
        container: HTMLElement | Window;
        containerEl: HTMLElement;
        instance: ComponentPublicInstance;
        delay: number;
        lastScrollTop: number;
        cb: InfiniteScrollCallback;
        onScroll: () => void;
        observer?: MutationObserver;
    };
};
declare const InfiniteScroll: ObjectDirective<InfiniteScrollEl, InfiniteScrollCallback>;
export default InfiniteScroll;
