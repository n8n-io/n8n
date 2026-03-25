// Make this a module
export {};

// Conditional type aliases, which are later merged into the global scope.
// Will either be empty if the relevant web library is already present, or the @types/node definition otherwise.

type __Event = typeof globalThis extends { onmessage: any } ? {} : Event;
interface Event {
    readonly bubbles: boolean;
    cancelBubble: boolean;
    readonly cancelable: boolean;
    readonly composed: boolean;
    composedPath(): [EventTarget?];
    readonly currentTarget: EventTarget | null;
    readonly defaultPrevented: boolean;
    readonly eventPhase: 0 | 2;
    initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void;
    readonly isTrusted: boolean;
    preventDefault(): void;
    readonly returnValue: boolean;
    readonly srcElement: EventTarget | null;
    stopImmediatePropagation(): void;
    stopPropagation(): void;
    readonly target: EventTarget | null;
    readonly timeStamp: number;
    readonly type: string;
}

type __CustomEvent<T = any> = typeof globalThis extends { onmessage: any } ? {} : CustomEvent<T>;
interface CustomEvent<T = any> extends Event {
    readonly detail: T;
}

type __EventTarget = typeof globalThis extends { onmessage: any } ? {} : EventTarget;
interface EventTarget {
    addEventListener(
        type: string,
        listener: EventListener | EventListenerObject,
        options?: AddEventListenerOptions | boolean,
    ): void;
    dispatchEvent(event: Event): boolean;
    removeEventListener(
        type: string,
        listener: EventListener | EventListenerObject,
        options?: EventListenerOptions | boolean,
    ): void;
}

interface EventInit {
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
}

interface CustomEventInit<T = any> extends EventInit {
    detail?: T;
}

interface EventListenerOptions {
    capture?: boolean;
}

interface AddEventListenerOptions extends EventListenerOptions {
    once?: boolean;
    passive?: boolean;
    signal?: AbortSignal;
}

interface EventListener {
    (evt: Event): void;
}

interface EventListenerObject {
    handleEvent(object: Event): void;
}

// Merge conditional interfaces into global scope, and conditionally declare global constructors.
declare global {
    interface Event extends __Event {}
    var Event: typeof globalThis extends { onmessage: any; Event: infer T } ? T
        : {
            prototype: Event;
            new(type: string, eventInitDict?: EventInit): Event;
        };

    interface CustomEvent<T = any> extends __CustomEvent<T> {}
    var CustomEvent: typeof globalThis extends { onmessage: any; CustomEvent: infer T } ? T
        : {
            prototype: CustomEvent;
            new<T>(type: string, eventInitDict?: CustomEventInit<T>): CustomEvent<T>;
        };

    interface EventTarget extends __EventTarget {}
    var EventTarget: typeof globalThis extends { onmessage: any; EventTarget: infer T } ? T
        : {
            prototype: EventTarget;
            new(): EventTarget;
        };
}
