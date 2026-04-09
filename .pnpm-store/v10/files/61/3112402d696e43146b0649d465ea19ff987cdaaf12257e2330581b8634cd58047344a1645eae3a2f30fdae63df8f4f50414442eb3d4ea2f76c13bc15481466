export type IterableInput<T> = Iterable<T> | ArrayLike<T>;

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const deepClone = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export const iterableToArray = <T>(values: IterableInput<T>): T[] => {
  if (Array.isArray(values)) {
    return values.slice();
  }
  return Array.from(values as Iterable<T>);
};

export const assertNonEmptyArray = (values: unknown[], message: string) => {
  if (values.length === 0) {
    throw new Error(message);
  }
};
