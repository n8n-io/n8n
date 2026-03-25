'use strict';

const {
  ArrayPrototypeFind,
  ObjectEntries,
  ObjectPrototypeHasOwnProperty: ObjectHasOwn,
  StringPrototypeCharAt,
  StringPrototypeIncludes,
  StringPrototypeStartsWith,
} = require('./internal/primordials');

const {
  validateObject,
} = require('./internal/validators');

// These are internal utilities to make the parsing logic easier to read, and
// add lots of detail for the curious. They are in a separate file to allow
// unit testing, although that is not essential (this could be rolled into
// main file and just tested implicitly via API).
//
// These routines are for internal use, not for export to client.

/**
 * Return the named property, but only if it is an own property.
 */
function objectGetOwn(obj, prop) {
  if (ObjectHasOwn(obj, prop))
    return obj[prop];
}

/**
 * Return the named options property, but only if it is an own property.
 */
function optionsGetOwn(options, longOption, prop) {
  if (ObjectHasOwn(options, longOption))
    return objectGetOwn(options[longOption], prop);
}

/**
 * Determines if the argument may be used as an option value.
 * @example
 * isOptionValue('V') // returns true
 * isOptionValue('-v') // returns true (greedy)
 * isOptionValue('--foo') // returns true (greedy)
 * isOptionValue(undefined) // returns false
 */
function isOptionValue(value) {
  if (value == null) return false;

  // Open Group Utility Conventions are that an option-argument
  // is the argument after the option, and may start with a dash.
  return true; // greedy!
}

/**
 * Detect whether there is possible confusion and user may have omitted
 * the option argument, like `--port --verbose` when `port` of type:string.
 * In strict mode we throw errors if value is option-like.
 */
function isOptionLikeValue(value) {
  if (value == null) return false;

  return value.length > 1 && StringPrototypeCharAt(value, 0) === '-';
}

/**
 * Determines if `arg` is just a short option.
 * @example '-f'
 */
function isLoneShortOption(arg) {
  return arg.length === 2 &&
    StringPrototypeCharAt(arg, 0) === '-' &&
    StringPrototypeCharAt(arg, 1) !== '-';
}

/**
 * Determines if `arg` is a lone long option.
 * @example
 * isLoneLongOption('a') // returns false
 * isLoneLongOption('-a') // returns false
 * isLoneLongOption('--foo') // returns true
 * isLoneLongOption('--foo=bar') // returns false
 */
function isLoneLongOption(arg) {
  return arg.length > 2 &&
    StringPrototypeStartsWith(arg, '--') &&
    !StringPrototypeIncludes(arg, '=', 3);
}

/**
 * Determines if `arg` is a long option and value in the same argument.
 * @example
 * isLongOptionAndValue('--foo') // returns false
 * isLongOptionAndValue('--foo=bar') // returns true
 */
function isLongOptionAndValue(arg) {
  return arg.length > 2 &&
    StringPrototypeStartsWith(arg, '--') &&
    StringPrototypeIncludes(arg, '=', 3);
}

/**
 * Determines if `arg` is a short option group.
 *
 * See Guideline 5 of the [Open Group Utility Conventions](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html).
 *   One or more options without option-arguments, followed by at most one
 *   option that takes an option-argument, should be accepted when grouped
 *   behind one '-' delimiter.
 * @example
 * isShortOptionGroup('-a', {}) // returns false
 * isShortOptionGroup('-ab', {}) // returns true
 * // -fb is an option and a value, not a short option group
 * isShortOptionGroup('-fb', {
 *   options: { f: { type: 'string' } }
 * }) // returns false
 * isShortOptionGroup('-bf', {
 *   options: { f: { type: 'string' } }
 * }) // returns true
 * // -bfb is an edge case, return true and caller sorts it out
 * isShortOptionGroup('-bfb', {
 *   options: { f: { type: 'string' } }
 * }) // returns true
 */
function isShortOptionGroup(arg, options) {
  if (arg.length <= 2) return false;
  if (StringPrototypeCharAt(arg, 0) !== '-') return false;
  if (StringPrototypeCharAt(arg, 1) === '-') return false;

  const firstShort = StringPrototypeCharAt(arg, 1);
  const longOption = findLongOptionForShort(firstShort, options);
  return optionsGetOwn(options, longOption, 'type') !== 'string';
}

/**
 * Determine if arg is a short string option followed by its value.
 * @example
 * isShortOptionAndValue('-a', {}); // returns false
 * isShortOptionAndValue('-ab', {}); // returns false
 * isShortOptionAndValue('-fFILE', {
 *   options: { foo: { short: 'f', type: 'string' }}
 * }) // returns true
 */
function isShortOptionAndValue(arg, options) {
  validateObject(options, 'options');

  if (arg.length <= 2) return false;
  if (StringPrototypeCharAt(arg, 0) !== '-') return false;
  if (StringPrototypeCharAt(arg, 1) === '-') return false;

  const shortOption = StringPrototypeCharAt(arg, 1);
  const longOption = findLongOptionForShort(shortOption, options);
  return optionsGetOwn(options, longOption, 'type') === 'string';
}

/**
 * Find the long option associated with a short option. Looks for a configured
 * `short` and returns the short option itself if a long option is not found.
 * @example
 * findLongOptionForShort('a', {}) // returns 'a'
 * findLongOptionForShort('b', {
 *   options: { bar: { short: 'b' } }
 * }) // returns 'bar'
 */
function findLongOptionForShort(shortOption, options) {
  validateObject(options, 'options');
  const longOptionEntry = ArrayPrototypeFind(
    ObjectEntries(options),
    ({ 1: optionConfig }) => objectGetOwn(optionConfig, 'short') === shortOption
  );
  return longOptionEntry?.[0] ?? shortOption;
}

/**
 * Check if the given option includes a default value
 * and that option has not been set by the input args.
 *
 * @param {string} longOption - long option name e.g. 'foo'
 * @param {object} optionConfig - the option configuration properties
 * @param {object} values - option values returned in `values` by parseArgs
 */
function useDefaultValueOption(longOption, optionConfig, values) {
  return objectGetOwn(optionConfig, 'default') !== undefined &&
    values[longOption] === undefined;
}

module.exports = {
  findLongOptionForShort,
  isLoneLongOption,
  isLoneShortOption,
  isLongOptionAndValue,
  isOptionValue,
  isOptionLikeValue,
  isShortOptionAndValue,
  isShortOptionGroup,
  useDefaultValueOption,
  objectGetOwn,
  optionsGetOwn,
};
