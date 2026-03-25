import { Observable } from '../Observable';
export interface NodeStyleEventEmitter {
    addListener(eventName: string | symbol, handler: NodeEventHandler): this;
    removeListener(eventName: string | symbol, handler: NodeEventHandler): this;
}
export declare type NodeEventHandler = (...args: any[]) => void;
export interface NodeCompatibleEventEmitter {
    addListener(eventName: string, handler: NodeEventHandler): void | {};
    removeListener(eventName: string, handler: NodeEventHandler): void | {};
}
export interface JQueryStyleEventEmitter<TContext, T> {
    on(eventName: string, handler: (this: TContext, t: T, ...args: any[]) => any): void;
    off(eventName: string, handler: (this: TContext, t: T, ...args: any[]) => any): void;
}
export interface EventListenerObject<E> {
    handleEvent(evt: E): void;
}
export interface HasEventTargetAddRemove<E> {
    addEventListener(type: string, listener: ((evt: E) => void) | EventListenerObject<E> | null, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: ((evt: E) => void) | EventListenerObject<E> | null, options?: EventListenerOptions | boolean): void;
}
export interface EventListenerOptions {
    capture?: boolean;
    passive?: boolean;
    once?: boolean;
}
export interface AddEventListenerOptions extends EventListenerOptions {
    once?: boolean;
    passive?: boolean;
}
export declare function fromEvent<T>(target: HasEventTargetAddRemove<T> | ArrayLike<HasEventTargetAddRemove<T>>, eventName: string): Observable<T>;
export declare function fromEvent<T, R>(target: HasEventTargetAddRemove<T> | ArrayLike<HasEventTargetAddRemove<T>>, eventName: string, resultSelector: (event: T) => R): Observable<R>;
export declare function fromEvent<T>(target: HasEventTargetAddRemove<T> | ArrayLike<HasEventTargetAddRemove<T>>, eventName: string, options: EventListenerOptions): Observable<T>;
export declare function fromEvent<T, R>(target: HasEventTargetAddRemove<T> | ArrayLike<HasEventTargetAddRemove<T>>, eventName: string, options: EventListenerOptions, resultSelector: (event: T) => R): Observable<R>;
export declare function fromEvent(target: NodeStyleEventEmitter | ArrayLike<NodeStyleEventEmitter>, eventName: string): Observable<unknown>;
/** @deprecated Do not specify explicit type parameters. Signatures with type parameters that cannot be inferred will be removed in v8. */
export declare function fromEvent<T>(target: NodeStyleEventEmitter | ArrayLike<NodeStyleEventEmitter>, eventName: string): Observable<T>;
export declare function fromEvent<R>(target: NodeStyleEventEmitter | ArrayLike<NodeStyleEventEmitter>, eventName: string, resultSelector: (...args: any[]) => R): Observable<R>;
export declare function fromEvent(target: NodeCompatibleEventEmitter | ArrayLike<NodeCompatibleEventEmitter>, eventName: string): Observable<unknown>;
/** @deprecated Do not specify explicit type parameters. Signatures with type parameters that cannot be inferred will be removed in v8. */
export declare function fromEvent<T>(target: NodeCompatibleEventEmitter | ArrayLike<NodeCompatibleEventEmitter>, eventName: string): Observable<T>;
export declare function fromEvent<R>(target: NodeCompatibleEventEmitter | ArrayLike<NodeCompatibleEventEmitter>, eventName: string, resultSelector: (...args: any[]) => R): Observable<R>;
export declare function fromEvent<T>(target: JQueryStyleEventEmitter<any, T> | ArrayLike<JQueryStyleEventEmitter<any, T>>, eventName: string): Observable<T>;
export declare function fromEvent<T, R>(target: JQueryStyleEventEmitter<any, T> | ArrayLike<JQueryStyleEventEmitter<any, T>>, eventName: string, resultSelector: (value: T, ...args: any[]) => R): Observable<R>;
//# sourceMappingURL=fromEvent.d.ts.map