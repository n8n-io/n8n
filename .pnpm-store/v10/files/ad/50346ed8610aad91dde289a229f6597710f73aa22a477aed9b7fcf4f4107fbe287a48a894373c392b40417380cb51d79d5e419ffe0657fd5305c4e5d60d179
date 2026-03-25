import { execute } from './execute';

export type EventTargetLike<T> =
  | EventTargetLike.HasEventTargetAddRemove<T>
  | EventTargetLike.NodeStyleEventEmitter
  | EventTargetLike.NodeCompatibleEventEmitter
  | EventTargetLike.JQueryStyleEventEmitter<any, T>;

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
export function waitForEvent<T>(
  signal: AbortSignal,
  target: EventTargetLike<T>,
  eventName: string | symbol,
  options?: EventTargetLike.EventListenerOptions,
): Promise<T> {
  return execute<T>(signal, resolve => {
    let unlisten: (() => void) | undefined;
    let finished = false;

    const handler = (...args: any[]) => {
      resolve(args.length > 1 ? args : args[0]);
      finished = true;

      if (unlisten != null) {
        unlisten();
      }
    };

    unlisten = listen(target, eventName, handler, options);

    if (finished) {
      unlisten();
    }

    return () => {
      finished = true;

      if (unlisten != null) {
        unlisten();
      }
    };
  });
}

// gratefully copied from RxJS' fromEvent
export namespace EventTargetLike {
  export interface NodeStyleEventEmitter {
    addListener: (
      eventName: string | symbol,
      handler: NodeEventHandler,
    ) => this;
    removeListener: (
      eventName: string | symbol,
      handler: NodeEventHandler,
    ) => this;
  }

  export type NodeEventHandler = (...args: any[]) => void;

  // For APIs that implement `addListener` and `removeListener` methods that may
  // not use the same arguments or return EventEmitter values
  // such as React Native
  export interface NodeCompatibleEventEmitter {
    addListener: (eventName: string, handler: NodeEventHandler) => void | {};
    removeListener: (eventName: string, handler: NodeEventHandler) => void | {};
  }

  // Use handler types like those in @types/jquery. See:
  // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/847731ba1d7fa6db6b911c0e43aa0afe596e7723/types/jquery/misc.d.ts#L6395
  export interface JQueryStyleEventEmitter<TContext, T> {
    on: (
      eventName: string | symbol,
      handler: (this: TContext, t: T, ...args: any[]) => any,
    ) => void;
    off: (
      eventName: string | symbol,
      handler: (this: TContext, t: T, ...args: any[]) => any,
    ) => void;
  }

  export interface HasEventTargetAddRemove<E> {
    addEventListener(
      type: string | symbol,
      listener: ((evt: E) => void) | null,
      options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener(
      type: string | symbol,
      listener: ((evt: E) => void) | null,
      options?: EventListenerOptions | boolean,
    ): void;
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
}

function listen<T>(
  target: EventTargetLike<T>,
  eventName: string | symbol,
  handler: (...args: any[]) => void,
  options?: EventTargetLike.EventListenerOptions,
) {
  if (isEventTarget(target)) {
    target.addEventListener(eventName, handler, options);
    return () => target.removeEventListener(eventName, handler, options);
  }

  if (isJQueryStyleEventEmitter(target)) {
    target.on(eventName, handler);
    return () => target.off(eventName, handler);
  }

  if (isNodeStyleEventEmitter(target)) {
    target.addListener(eventName, handler);
    return () => target.removeListener(eventName, handler);
  }

  throw new Error('Invalid event target');
}

function isNodeStyleEventEmitter(
  sourceObj: any,
): sourceObj is EventTargetLike.NodeStyleEventEmitter {
  return (
    isFunction(sourceObj.addListener) && isFunction(sourceObj.removeListener)
  );
}

function isJQueryStyleEventEmitter(
  sourceObj: any,
): sourceObj is EventTargetLike.JQueryStyleEventEmitter<any, any> {
  return isFunction(sourceObj.on) && isFunction(sourceObj.off);
}

function isEventTarget(
  sourceObj: any,
): sourceObj is EventTargetLike.HasEventTargetAddRemove<any> {
  return (
    isFunction(sourceObj.addEventListener) &&
    isFunction(sourceObj.removeEventListener)
  );
}

const isFunction = (obj: any) => typeof obj === 'function';
