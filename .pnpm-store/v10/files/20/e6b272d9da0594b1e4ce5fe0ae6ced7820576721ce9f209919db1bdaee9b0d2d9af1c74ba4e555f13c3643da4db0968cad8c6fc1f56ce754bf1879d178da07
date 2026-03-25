/**
 * Any validator function type (non type-guarding)
 */

/**
 * Adds type guarding to a validator function
 *
 * ```ts
 * const validate: Validator = <S extends JSONSchema, T = FromSchema<S>>(
 *   schema: S,
 *   data: unknown
 * ): data is T => {
 *   const isDataValid: boolean = ... // Implement validation here
 *   return isDataValid;
 * };
 * ```
 */

/**
 * Type definition for wrapValidatorAsTypeGuard
 */

/**
 * Adds type guarding to any validator function (doesn't modify it)
 * @param validator Validator function
 * @returns Validator function with type guarding
 */
export var wrapValidatorAsTypeGuard = function wrapValidatorAsTypeGuard(validator) {
  return function (schema, data) {
    for (var _len = arguments.length, validationOptions = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      validationOptions[_key - 2] = arguments[_key];
    }

    return validator.apply(void 0, [schema, data].concat(validationOptions));
  };
};
//# sourceMappingURL=validator.js.map