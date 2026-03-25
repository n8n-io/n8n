/**
 * Error helpers.
 *
 * @module error
 */

/**
 * @param {string} s
 * @return {Error}
 */
/* c8 ignore next */
export const create = s => new Error(s)

/**
 * @throws {Error}
 * @return {never}
 */
/* c8 ignore next 3 */
export const methodUnimplemented = () => {
  throw create('Method unimplemented')
}

/**
 * @throws {Error}
 * @return {never}
 */
/* c8 ignore next 3 */
export const unexpectedCase = () => {
  throw create('Unexpected case')
}

/**
 * @param {boolean} property
 * @return {asserts property is true}
 */
export const assert = property => { if (!property) throw create('Assert failed') }
