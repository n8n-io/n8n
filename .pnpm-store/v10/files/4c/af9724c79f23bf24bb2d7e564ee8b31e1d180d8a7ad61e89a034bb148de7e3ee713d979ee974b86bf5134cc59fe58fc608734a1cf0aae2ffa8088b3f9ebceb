/**
 * Any compiler function type (non type-guarding)
 */

/**
 * Adds type guarding to a validator function
 *
 * ```ts
 * const compiler: Compiler = <S extends JSONSchema, T = FromSchema<S>>(
 *   schema: S,
 * ) => (data: unknown): data is T => {
 *   const isDataValid: boolean = ... // Implement validation here
 *   return isDataValid;
 * };
 * ```
 */

/**
 * Type definition for `wrapCompilerAsTypeGuard`
 */

/**
 * Adds type guarding to any compiler function (doesn't modify it)
 * @param compiler Compiler function
 * @returns Compiler function with type guarding
 */
export var wrapCompilerAsTypeGuard = function wrapCompilerAsTypeGuard(compiler) {
  return function (schema) {
    for (var _len = arguments.length, compilingOptions = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      compilingOptions[_key - 1] = arguments[_key];
    }

    var validator = compiler.apply(void 0, [schema].concat(compilingOptions));
    return function (data) {
      for (var _len2 = arguments.length, validationOptions = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        validationOptions[_key2 - 1] = arguments[_key2];
      }

      return validator.apply(void 0, [data].concat(validationOptions));
    };
  };
};
//# sourceMappingURL=compiler.js.map