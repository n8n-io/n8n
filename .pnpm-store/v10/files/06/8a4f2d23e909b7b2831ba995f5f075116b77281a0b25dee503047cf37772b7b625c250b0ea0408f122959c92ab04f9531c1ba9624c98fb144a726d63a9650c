import areInputsEqual from './are-inputs-equal';

export type EqualityFn<TFunc extends (...args: any[]) => any> = (
  newArgs: Parameters<TFunc>,
  lastArgs: Parameters<TFunc>,
) => boolean;

export type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
  clear: () => void;
  (this: ThisParameterType<TFunc>, ...args: Parameters<TFunc>): ReturnType<TFunc>;
};

// internal type
type Cache<TFunc extends (this: any, ...args: any[]) => any> = {
  lastThis: ThisParameterType<TFunc>;
  lastArgs: Parameters<TFunc>;
  lastResult: ReturnType<TFunc>;
};

function memoizeOne<TFunc extends (this: any, ...newArgs: any[]) => any>(
  resultFn: TFunc,
  isEqual: EqualityFn<TFunc> = areInputsEqual,
): MemoizedFn<TFunc> {
  let cache: Cache<TFunc> | null = null;

  // breaking cache when context (this) or arguments change
  function memoized(
    this: ThisParameterType<TFunc>,
    ...newArgs: Parameters<TFunc>
  ): ReturnType<TFunc> {
    if (cache && cache.lastThis === this && isEqual(newArgs, cache.lastArgs)) {
      return cache.lastResult;
    }

    // Throwing during an assignment aborts the assignment: https://codepen.io/alexreardon/pen/RYKoaz
    // Doing the lastResult assignment first so that if it throws
    // the cache will not be overwritten
    const lastResult = resultFn.apply(this, newArgs);
    cache = {
      lastResult,
      lastArgs: newArgs,
      lastThis: this,
    };

    return lastResult;
  }

  // Adding the ability to clear the cache of a memoized function
  memoized.clear = function clear() {
    cache = null;
  };

  return memoized;
}

export default memoizeOne;
