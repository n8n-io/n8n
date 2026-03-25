const Util = require('../util');

const PROVIDED_TEXT = 'provided';
const NOT_PROVIDED_TEXT = 'not provided';

/**
 * Describes the presence of a given value. If the value is not empty (as a string),
 * returns the corresponding text (by default: 'provided' or 'not provided').
 *
 * @param {*} valueToDescribe - The value to check for presence.
 * @param {Object} [options] - Optional overrides for the "provided" and "not provided" text.
 * @param {string} [options.overrideProvidedText]
 * @param {string} [options.overrideNotProvidedText]
 * @returns {string} A string indicating the presence of `valueToDescribe`.
 */
exports.describePresence = function (valueToDescribe, { overrideProvidedText, overrideNotProvidedText } = {}) {
  const providedText = overrideProvidedText || PROVIDED_TEXT;
  const notProvidedText = overrideNotProvidedText || NOT_PROVIDED_TEXT;
  return Util.isNotEmptyAsString(valueToDescribe) ? providedText : notProvidedText;
};

/**
 * @param {Object} sourceObject - The object holding attribute values.
 * @param {Array<string>} attributesWithValues - Attributes to show with their values.
 * @param {Array<string>} attributesWithoutValues - Attributes to show as present/not present.
 * @returns {string} Comma-separated string describing the attributes.
 */
exports.attributesToString = function (
  sourceObject = {},
  attributesWithValues = [],
  attributesWithoutValues = []
) {
  const withValues = attributesWithValues
    .filter(attr => sourceObject[attr] !== undefined)
    .map(attr => `${attr}=${String(sourceObject[attr])}`);

  const withoutValues = attributesWithoutValues
    .filter(attr => sourceObject[attr] !== undefined)
    .map(attr => `${attr} is ${exports.describePresence(sourceObject[attr])}`);

  return [...withValues, ...withoutValues].join(', ');
};

/**
 * @param {Object} sourceObject - The object holding attribute values.
 * @param {Array<string>} attributesWithValues - Attributes to show with their values.
 * @param {Array<string>} attributesWithoutValues - Attributes to show as present/not present.
 * @returns {string} A bracketed string of described attributes.
 */
exports.describeAttributes = function (
  sourceObject,
  attributesWithValues,
  attributesWithoutValues
) {
  const attributesDescription = exports.attributesToString(
    sourceObject,
    attributesWithValues,
    attributesWithoutValues
  );
  return `[${attributesDescription}]`;
};
