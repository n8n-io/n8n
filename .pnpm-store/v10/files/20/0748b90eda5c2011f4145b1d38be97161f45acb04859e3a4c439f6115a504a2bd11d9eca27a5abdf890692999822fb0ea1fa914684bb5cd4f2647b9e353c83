export declare class NumberAllocator {
  /**
   * NumberAllocator constructor.
   * The all numbers are set to vacant status.
   * Time Complexity O(1)
   * @constructor
   * @param {number} min  - The maximum number of allocatable. The number must be integer.
   * @param {number} maxh - The minimum number of allocatable. The number must be integer.
   */
  constructor (min: number, max: number)

  /**
   * Get the first vacant number. The status of the number is not updated.
   * Time Complexity O(1)
   * @return {number} - The first vacant number. If all numbers are occupied, return null.
   *                    When alloc() is called then the same value will be allocated.
   */
  public firstVacant (): number | null

  /**
   * Allocate the first vacant number. The number become occupied status.
   * Time Complexity O(1)
   * @return {number} - The first vacant number. If all numbers are occupied, return null.
   */
  public alloc (): number | null

  /**
   * Use the number. The number become occupied status.
   * If the number has already been occupied, then return false.
   * Time Complexity O(logN) : N is the number of intervals (not numbers)
   * @param {number} num - The number to request use.
   * @return {Boolean} - If `num` was not occupied, then return true, otherwise return false.
   */
  public use (num: number): Boolean

  /**
   * Deallocate the number. The number become vacant status.
   * Time Complexity O(logN) : N is the number of intervals (not numbers)
   * @param {number} num - The number to deallocate. The number must be occupied status.
   *                       In other words, the number must be allocated by alloc() or occupied be use().
   */
  public free (num: number): void

  /**
   * Clear all occupied numbers.
   * The all numbers are set to vacant status.
   * Time Complexity O(1)
   */
  public clear (): void

  /**
   * Get the number of intervals. Interval is internal structure of this library.
   * This function is for debugging.
   * Time Complexity O(1)
   * @return {number} - The number of intervals.
   */
  public intervalCount (): number

  /**
   * Dump the internal structor of the library.
   * This function is for debugging.
   * Time Complexity O(N) : N is the number of intervals (not numbers)
   */
  dump (): void
}
