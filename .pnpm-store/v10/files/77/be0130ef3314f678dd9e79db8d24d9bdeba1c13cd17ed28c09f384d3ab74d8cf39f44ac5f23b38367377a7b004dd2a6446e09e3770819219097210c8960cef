/**
 * Splits an array into chunks of a specified size.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} array - The array to split.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {T[][]} - A new array containing the chunks.
 */
export function splitArray<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0');
  }

  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
}
