Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const is = require('../utils/is.js');
const normalize = require('../utils/normalize.js');
const worldwide = require('../utils/worldwide.js');

/**
 * Formats the given values into a string.
 *
 * @param values - The values to format.
 * @param normalizeDepth - The depth to normalize the values.
 * @param normalizeMaxBreadth - The max breadth to normalize the values.
 * @returns The formatted string.
 */
function formatConsoleArgs(values, normalizeDepth, normalizeMaxBreadth) {
  return 'util' in worldwide.GLOBAL_OBJ && typeof (worldwide.GLOBAL_OBJ ).util.format === 'function'
    ? (worldwide.GLOBAL_OBJ ).util.format(...values)
    : safeJoinConsoleArgs(values, normalizeDepth, normalizeMaxBreadth);
}

/**
 * Joins the given values into a string.
 *
 * @param values - The values to join.
 * @param normalizeDepth - The depth to normalize the values.
 * @param normalizeMaxBreadth - The max breadth to normalize the values.
 * @returns The joined string.
 */
function safeJoinConsoleArgs(values, normalizeDepth, normalizeMaxBreadth) {
  return values
    .map(value =>
      is.isPrimitive(value) ? String(value) : JSON.stringify(normalize.normalize(value, normalizeDepth, normalizeMaxBreadth)),
    )
    .join(' ');
}

/**
 * Checks if a string contains console substitution patterns like %s, %d, %i, %f, %o, %O, %c.
 *
 * @param str - The string to check
 * @returns true if the string contains console substitution patterns
 */
function hasConsoleSubstitutions(str) {
  // Match console substitution patterns: %s, %d, %i, %f, %o, %O, %c
  return /%[sdifocO]/.test(str);
}

/**
 * Creates template attributes for multiple console arguments.
 *
 * @param args - The console arguments
 * @returns An object with template and parameter attributes
 */
function createConsoleTemplateAttributes(firstArg, followingArgs) {
  const attributes = {};

  // Create template with placeholders for each argument
  const template = new Array(followingArgs.length).fill('{}').join(' ');
  attributes['sentry.message.template'] = `${firstArg} ${template}`;

  // Add each argument as a parameter
  followingArgs.forEach((arg, index) => {
    attributes[`sentry.message.parameter.${index}`] = arg;
  });

  return attributes;
}

exports.createConsoleTemplateAttributes = createConsoleTemplateAttributes;
exports.formatConsoleArgs = formatConsoleArgs;
exports.hasConsoleSubstitutions = hasConsoleSubstitutions;
exports.safeJoinConsoleArgs = safeJoinConsoleArgs;
//# sourceMappingURL=utils.js.map
