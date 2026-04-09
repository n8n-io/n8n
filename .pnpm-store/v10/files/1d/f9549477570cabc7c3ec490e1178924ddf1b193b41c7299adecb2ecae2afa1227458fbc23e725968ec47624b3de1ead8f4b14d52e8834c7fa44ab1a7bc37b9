export = limitFactory

declare namespace limitFactory {}

/**
 * Returns a function that can be used to wrap promise returning functions,
 * limiting them to concurrency outstanding calls.
 * @param concurrency the concurrency, i.e. 1 will limit calls to one at a
 * time, effectively in sequence or serial. 2 will allow two at a time, etc.
 * 0 or undefined specify no limit, and all calls will be run in parallel.
 */
declare function limitFactory<T>(concurrency?: number): limit<T>

declare type limit<T> = limitFunc<T> & limitInterface<T>

declare interface limitInterface<T> {
  /**
   * Maps an array of items using mapper, but limiting the number of concurrent
   * calls to mapper with the concurrency of limit. If at least one call to
   * mapper returns a rejected promise, the result of map is a the same rejected
   * promise, and no further calls to mapper are made.
   * @param items any items
   * @param mapper iterator
   */
  map<U>(items: ReadonlyArray<T>, mapper: (value: T) => Promise<U>): Promise<U[]>

  /**
   * Returns the queue length, the number of jobs that are waiting to be started.
   * You could use this to throttle incoming jobs, so the queue doesn't
   * overwhealm the available memory - for e.g. pause() a stream.
  */
  queue: number
}

/**
 * A function that limits calls to fn, based on concurrency above. Returns a
 * promise that resolves or rejects the same value or error as fn. All functions
 * are executed in the same order in which they were passed to limit. fn must
 * return a promise.
 * @param fn a function that is called with no arguments and returns a promise.
 * You can pass arguments to your function by putting it inside another function,
 * i.e. `() -> myfunc(a, b, c)`.
*/
declare type limitFunc<T> = (fn: () => Promise<T>) => Promise<T>

