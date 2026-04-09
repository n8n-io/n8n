/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { IDisposable } from 'common/Types';

interface IListener<T, U = void> {
  (arg1: T, arg2: U): void;
}

export interface IEvent<T, U = void> {
  (listener: (arg1: T, arg2: U) => any): IDisposable;
}

export interface IEventEmitter<T, U = void> {
  event: IEvent<T, U>;
  fire(arg1: T, arg2: U): void;
  dispose(): void;
}

export class EventEmitter<T, U = void> implements IEventEmitter<T, U> {
  private _listeners: IListener<T, U>[] = [];
  private _event?: IEvent<T, U>;
  private _disposed: boolean = false;

  public get event(): IEvent<T, U> {
    if (!this._event) {
      this._event = (listener: (arg1: T, arg2: U) => any) => {
        this._listeners.push(listener);
        const disposable = {
          dispose: () => {
            if (!this._disposed) {
              for (let i = 0; i < this._listeners.length; i++) {
                if (this._listeners[i] === listener) {
                  this._listeners.splice(i, 1);
                  return;
                }
              }
            }
          }
        };
        return disposable;
      };
    }
    return this._event;
  }

  public fire(arg1: T, arg2: U): void {
    const queue: IListener<T, U>[] = [];
    for (let i = 0; i < this._listeners.length; i++) {
      queue.push(this._listeners[i]);
    }
    for (let i = 0; i < queue.length; i++) {
      queue[i].call(undefined, arg1, arg2);
    }
  }

  public dispose(): void {
    this.clearListeners();
    this._disposed = true;
  }

  public clearListeners(): void {
    if (this._listeners) {
      this._listeners.length = 0;
    }
  }
}

export function forwardEvent<T>(from: IEvent<T>, to: IEventEmitter<T>): IDisposable {
  return from(e => to.fire(e));
}

export function runAndSubscribe<T>(event: IEvent<T>, handler: (e: T | undefined) => any): IDisposable {
  handler(undefined);
  return event(e => handler(e));
}
