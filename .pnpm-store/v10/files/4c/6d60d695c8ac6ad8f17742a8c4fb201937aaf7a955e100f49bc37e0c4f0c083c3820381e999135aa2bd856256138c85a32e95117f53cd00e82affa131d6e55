Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

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
  exports$1,
  exportName,
  wrappedConstructor,
) {
  const original = exports$1[exportName];

  if (typeof original !== 'function') {
    return;
  }

  // Replace the named export - handle read-only properties
  try {
    exports$1[exportName] = wrappedConstructor;
  } catch {
    // If direct assignment fails, override the property descriptor
    Object.defineProperty(exports$1, exportName, {
      value: wrappedConstructor,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  // Replace the default export if it points to the original constructor
  if (exports$1.default === original) {
    try {
      exports$1.default = wrappedConstructor;
    } catch {
      Object.defineProperty(exports$1, 'default', {
        value: wrappedConstructor,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }
}

exports.replaceExports = replaceExports;
//# sourceMappingURL=exports.js.map
