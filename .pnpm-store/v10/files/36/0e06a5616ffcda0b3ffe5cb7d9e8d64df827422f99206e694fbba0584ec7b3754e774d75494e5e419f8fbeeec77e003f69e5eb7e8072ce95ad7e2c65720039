/**
 * Replaces constructor functions in module exports, handling read-only properties,
 * and both default and named exports by wrapping them with the constructor.
 *
 * @param exports The module exports object to modify
 * @param exportName The name of the export to replace (e.g., 'GoogleGenAI', 'Anthropic', 'OpenAI')
 * @param wrappedConstructor The wrapped constructor function to replace the original with
 * @returns void
 */
function replaceExports(
  exports,
  exportName,
  wrappedConstructor,
) {
  const original = exports[exportName];

  if (typeof original !== 'function') {
    return;
  }

  // Replace the named export - handle read-only properties
  try {
    exports[exportName] = wrappedConstructor;
  } catch (error) {
    // If direct assignment fails, override the property descriptor
    Object.defineProperty(exports, exportName, {
      value: wrappedConstructor,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  // Replace the default export if it points to the original constructor
  if (exports.default === original) {
    try {
      exports.default = wrappedConstructor;
    } catch (error) {
      Object.defineProperty(exports, 'default', {
        value: wrappedConstructor,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }
}

export { replaceExports };
//# sourceMappingURL=exports.js.map
