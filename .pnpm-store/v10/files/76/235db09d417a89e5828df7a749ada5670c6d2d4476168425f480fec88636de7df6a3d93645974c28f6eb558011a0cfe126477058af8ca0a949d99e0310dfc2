const isActualPromise = (p) =>
  p instanceof Promise && !(p )[kChainedCopy];

const kChainedCopy = Symbol('chained PromiseLike');

/**
 * Copy the properties from a decorated promiselike object onto its chained
 * actual promise.
 */
const chainAndCopyPromiseLike = (
  original,
  onSuccess,
  onError,
) => {
  const chained = original.then(
    value => {
      onSuccess(value);
      return value;
    },
    err => {
      onError(err);
      throw err;
    },
  ) ;

  // if we're just dealing with "normal" Promise objects, return the chain
  return isActualPromise(chained) && isActualPromise(original) ? chained : copyProps(original, chained);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const copyProps = (original, chained) => {
  let mutated = false;
  //oxlint-disable-next-line guard-for-in
  for (const key in original) {
    if (key in chained) continue;
    mutated = true;
    const value = original[key];
    if (typeof value === 'function') {
      Object.defineProperty(chained, key, {
        value: (...args) => value.apply(original, args),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    } else {
      (chained )[key] = value;
    }
  }

  if (mutated) Object.assign(chained, { [kChainedCopy]: true });
  return chained;
};

export { chainAndCopyPromiseLike };
//# sourceMappingURL=chain-and-copy-promiselike.js.map
