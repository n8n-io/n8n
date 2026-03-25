/**
 * Utility module to work with sets.
 *
 * @module set
 */

export const create = () => new Set()

/**
 * @template T
 * @param {Set<T>} set
 * @return {Array<T>}
 */
export const toArray = set => Array.from(set)

/**
 * @template T
 * @param {Set<T>} set
 * @return {T|undefined}
 */
export const first = set => set.values().next().value

/**
 * @template T
 * @param {Iterable<T>} entries
 * @return {Set<T>}
 */
export const from = entries => new Set(entries)
