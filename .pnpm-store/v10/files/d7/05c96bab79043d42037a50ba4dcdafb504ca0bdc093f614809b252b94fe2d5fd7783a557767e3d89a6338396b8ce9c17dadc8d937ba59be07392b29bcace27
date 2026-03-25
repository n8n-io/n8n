'use strict';

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
const create = s => new Error(s);

/**
 * @throws {Error}
 * @return {never}
 */
/* c8 ignore next 3 */
const methodUnimplemented = () => {
  throw create('Method unimplemented')
};

/**
 * @throws {Error}
 * @return {never}
 */
/* c8 ignore next 3 */
const unexpectedCase = () => {
  throw create('Unexpected case')
};

/**
 * @param {boolean} property
 * @return {asserts property is true}
 */
const assert = property => { if (!property) throw create('Assert failed') };

var error = /*#__PURE__*/Object.freeze({
  __proto__: null,
  create: create,
  methodUnimplemented: methodUnimplemented,
  unexpectedCase: unexpectedCase,
  assert: assert
});

exports.assert = assert;
exports.create = create;
exports.error = error;
exports.methodUnimplemented = methodUnimplemented;
exports.unexpectedCase = unexpectedCase;
//# sourceMappingURL=error-0c1f634f.cjs.map
