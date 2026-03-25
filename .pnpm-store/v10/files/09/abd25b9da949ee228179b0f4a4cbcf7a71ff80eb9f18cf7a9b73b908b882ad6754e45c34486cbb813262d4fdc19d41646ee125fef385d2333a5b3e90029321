/**
 * Splits an array into chunks of a given size.
 * @param arr The array to split.
 * @param size The size of each chunk.
 * @returns An array of arrays, where each sub-array has `size` elements from the original array.
 * @example ```ts
 * const arr = [1, 2, 3, 4, 5, 6, 7, 8];
 * const chunks = chunk(arr, 3);
 * // chunks = [[1, 2, 3], [4, 5, 6], [7, 8]]
 * ```
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result = []
  for (let i = 0; i < arr.length; i += size)
    result.push(arr.slice(i, i + size))

  return result
}
