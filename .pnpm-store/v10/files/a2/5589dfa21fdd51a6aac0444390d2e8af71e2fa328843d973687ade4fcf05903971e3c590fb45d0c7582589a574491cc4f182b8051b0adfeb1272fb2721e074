/**
 * Create a new error constructor instance.
 */
declare function makeError(
  name: string
): makeError.Constructor<makeError.BaseError>;

/**
 * Set the constructor prototype to `BaseError`.
 */
declare function makeError<T extends Error>(super_: {
  new (...args: any[]): T;
}): makeError.Constructor<T & makeError.BaseError>;

/**
 * Create a specialized error instance.
 */
declare function makeError<T extends Error, K>(
  name: string | Function,
  super_: K
): K & makeError.SpecializedConstructor<T>;

declare namespace makeError {
  /**
   * Use with ES2015+ inheritance.
   */
  export class BaseError extends Error {
    message: string;
    name: string;
    stack: string;

    constructor(message?: string);
  }

  export interface Constructor<T> {
    new (message?: string): T;
    super_: any;
    prototype: T;
  }

  export interface SpecializedConstructor<T> {
    super_: any;
    prototype: T;
  }
}

export = makeError;
