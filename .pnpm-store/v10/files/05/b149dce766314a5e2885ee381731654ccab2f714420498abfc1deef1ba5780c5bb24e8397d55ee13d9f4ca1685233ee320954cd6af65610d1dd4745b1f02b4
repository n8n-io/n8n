/* eslint-env node */

/**
 * Custom inspect function for Node.js, Deno, and Bun
 *
 * ```
 * Float16Array.prototype[Symbol.for("nodejs.util.inspect.custom")] = customInspect;
 * ```
 * @param {number} _deps
 * @param {import("node:util").InspectOptions} options
 * @param {import("node:util").inspect} inspect
 * @returns {string}
 */
export function customInspect(_deps, options, inspect) {
  const length = this.length;

  const array = [];
  for (let i = 0; i < length; ++i) {
    array[i] = this[i];
  }

  return `Float16Array(${length}) ${inspect(array, options)}`;
}
