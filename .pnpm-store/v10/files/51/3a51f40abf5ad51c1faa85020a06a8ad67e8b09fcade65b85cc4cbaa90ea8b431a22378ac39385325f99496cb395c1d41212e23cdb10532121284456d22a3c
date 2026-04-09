export function mockValues<T>(...values: T[]): () => T {
  let counter = 0;
  return () => values[counter++] ?? values[values.length - 1];
}
