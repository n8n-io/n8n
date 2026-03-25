export declare type EventTargetLike<T> = EventTargetLike.HasEventTargetAddRemove<T> | EventTargetLike.NodeStyleEventEmitter | EventTargetLike.NodeCompatibleEventEmitter | EventTargetLike.JQueryStyleEventEmitter<any, T>;
/**
 * Returns a promise that fulfills when an event of specific type is emitted
 * from given event target and rejects with `AbortError` once `signal` is
 * aborted.
 *
 * Example:
 *
 *     // Create a WebSocket and wait for connection
 *     const webSocket = new WebSocket(url);
 *
 *     const openEvent = await race(signal, signal => [
 *       waitForEvent<WebSocketEventMap['open']>(signal, webSocket, 'open'),
 *       waitForEvent<WebSocketEventMap['close']>(signal, webSocket, 'close').then(
 *         event => {
 *           throw new Error(`Failed to connect to ${url}: ${event.reason}`);
 *         },
 *       ),
 *     ]);
 */
export declare function waitForEvent<T>(signal: AbortSignal, target: EventTargetLike<T>, eventName: string | symbol, options?: EventTargetLike.EventListenerOptions): Promise<T>;
export declare namespace EventTargetLike {
    interface NodeStyleEventEmitter {
        addListener: (eventName: string | symbol, handler: NodeEventHandler) => this;
        removeListener: (eventName: string | symbol, handler: NodeEventHandler) => this;
    }
    type NodeEventHandler = (...args: any[]) => void;
    interface NodeCompatibleEventEmitter {
        addListener: (eventName: string, handler: NodeEventHandler) => void | {};
        removeListener: (eventName: string, handler: NodeEventHandler) => void | {};
    }
    interface JQueryStyleEventEmitter<TContext, T> {
        on: (eventName: string | symbol, handler: (this: TContext, t: T, ...args: any[]) => any) => void;
        off: (eventName: string | symbol, handler: (this: TContext, t: T, ...args: any[]) => any) => void;
    }
    interface HasEventTargetAddRemove<E> {
        addEventListener(type: string | symbol, listener: ((evt: E) => void) | null, options?: boolean | AddEventListenerOptions): void;
        removeEventListener(type: string | symbol, listener: ((evt: E) => void) | null, options?: EventListenerOptions | boolean): void;
    }
    interface EventListenerOptions {
        capture?: boolean;
        passive?: boolean;
        once?: boolean;
    }
    interface AddEventListenerOptions extends EventListenerOptions {
        once?: boolean;
        passive?: boolean;
    }
}
