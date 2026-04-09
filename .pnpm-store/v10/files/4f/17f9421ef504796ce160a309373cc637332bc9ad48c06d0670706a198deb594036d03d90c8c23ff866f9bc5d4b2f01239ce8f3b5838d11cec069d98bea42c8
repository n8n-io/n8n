/**
 * Copyright (c) 2018 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { IDisposable } from 'common/Types';

/**
 * A base class that can be extended to provide convenience methods for managing the lifecycle of an
 * object and its components.
 */
export abstract class Disposable implements IDisposable {
  protected _disposables: IDisposable[] = [];
  protected _isDisposed: boolean = false;

  /**
   * Disposes the object, triggering the `dispose` method on all registered IDisposables.
   */
  public dispose(): void {
    this._isDisposed = true;
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.length = 0;
  }

  /**
   * Registers a disposable object.
   * @param d The disposable to register.
   * @returns The disposable.
   */
  public register<T extends IDisposable>(d: T): T {
    this._disposables.push(d);
    return d;
  }

  /**
   * Unregisters a disposable object if it has been registered, if not do
   * nothing.
   * @param d The disposable to unregister.
   */
  public unregister<T extends IDisposable>(d: T): void {
    const index = this._disposables.indexOf(d);
    if (index !== -1) {
      this._disposables.splice(index, 1);
    }
  }
}

export class MutableDisposable<T extends IDisposable> implements IDisposable {
  private _value?: T;
  private _isDisposed = false;

  /**
   * Gets the value if it exists.
   */
  public get value(): T | undefined {
    return this._isDisposed ? undefined : this._value;
  }

  /**
   * Sets the value, disposing of the old value if it exists.
   */
  public set value(value: T | undefined) {
    if (this._isDisposed || value === this._value) {
      return;
    }
    this._value?.dispose();
    this._value = value;
  }

  /**
   * Resets the stored value and disposes of the previously stored value.
   */
  public clear(): void {
    this.value = undefined;
  }

  public dispose(): void {
    this._isDisposed = true;
    this._value?.dispose();
    this._value = undefined;
  }
}

/**
 * Wrap a function in a disposable.
 */
export function toDisposable(f: () => void): IDisposable {
  return { dispose: f };
}

/**
 * Dispose of all disposables in an array and set its length to 0.
 */
export function disposeArray(disposables: IDisposable[]): void {
  for (const d of disposables) {
    d.dispose();
  }
  disposables.length = 0;
}

/**
 * Creates a disposable that will dispose of an array of disposables when disposed.
 */
export function getDisposeArrayDisposable(array: IDisposable[]): IDisposable {
  return { dispose: () => disposeArray(array) };
}
