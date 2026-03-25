"use strict";

const isPlainObject = require("is-plain-object");

/**
 * Check whether the variable is an object and all its properties are one or more values
 * that satisfy the specified validator(s):
 *
 * @example
 * ignoreProperties = {
 *   value1: ["item11", "item12", "item13"],
 *   value2: "item2",
 * };
 * validateObjectWithArrayProps(isString)(ignoreProperties);
 * //=> true
 *
 * @typedef {(value: unknown) => boolean} Validator
 * @param {...Validator} validators
 * @returns {Validator}
 */
function validateObjectWithArrayProps(...validators) {
  return value => {
    if (isPlainObject.isPlainObject(value) || !value) {
      return false;
    }

    return Object.values(value)
      .flat()
      .every(item => validators.some(v => v(item)));
  };
}

module.exports = validateObjectWithArrayProps;
