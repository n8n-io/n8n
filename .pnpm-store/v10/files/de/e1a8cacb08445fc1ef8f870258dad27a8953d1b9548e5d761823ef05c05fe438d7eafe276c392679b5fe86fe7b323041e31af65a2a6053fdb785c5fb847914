'use strict';

var util = require('util');

var ParseError = require('./lib/error');
var ascii = require('./lib/ascii');

var isDelimiter = ascii.isDelimiter;
var isTokenChar = ascii.isTokenChar;
var isExtended = ascii.isExtended;
var isPrint = ascii.isPrint;

/**
 * Unescape a string.
 *
 * @param {string} str The string to unescape.
 * @returns {string} A new unescaped string.
 * @private
 */
function decode(str) {
  return str.replace(/\\(.)/g, '$1');
}

/**
 * Build an error message when an unexpected character is found.
 *
 * @param {string} header The header field value.
 * @param {number} position The position of the unexpected character.
 * @returns {string} The error message.
 * @private
 */
function unexpectedCharacterMessage(header, position) {
  return util.format(
    "Unexpected character '%s' at index %d",
    header.charAt(position),
    position
  );
}

/**
 * Parse the `Forwarded` header field value into an array of objects.
 *
 * @param {string} header The header field value.
 * @returns {Object[]}
 * @public
 */
function parse(header) {
  var mustUnescape = false;
  var isEscaping = false;
  var inQuotes = false;
  var forwarded = {};
  var output = [];
  var start = -1;
  var end = -1;
  var parameter;
  var code;

  for (var i = 0; i < header.length; i++) {
    code = header.charCodeAt(i);

    if (parameter === undefined) {
      if (
        i !== 0 &&
        start === -1 &&
        (code === 0x20/*' '*/ || code === 0x09/*'\t'*/)
      ) {
        continue;
      }

      if (isTokenChar(code)) {
        if (start === -1) start = i;
      } else if (code === 0x3D/*'='*/ && start !== -1) {
        parameter = header.slice(start, i).toLowerCase();
        start = -1;
      } else {
        throw new ParseError(unexpectedCharacterMessage(header, i), header);
      }
    } else {
      if (isEscaping && (code === 0x09 || isPrint(code) || isExtended(code))) {
        isEscaping = false;
      } else if (isTokenChar(code)) {
        if (end !== -1) {
          throw new ParseError(unexpectedCharacterMessage(header, i), header);
        }

        if (start === -1) start = i;
      } else if (isDelimiter(code) || isExtended(code)) {
        if (inQuotes) {
          if (code === 0x22/*'"'*/) {
            inQuotes = false;
            end = i;
          } else if (code === 0x5C/*'\'*/) {
            if (start === -1) start = i;
            isEscaping = mustUnescape = true;
          } else if (start === -1) {
            start = i;
          }
        } else if (code === 0x22 && header.charCodeAt(i - 1) === 0x3D) {
          inQuotes = true;
        } else if (
          (code === 0x2C/*','*/|| code === 0x3B/*';'*/) &&
          (start !== -1 || end !== -1)
        ) {
          if (start !== -1) {
            if (end === -1) end = i;
            forwarded[parameter] = mustUnescape
              ? decode(header.slice(start, end))
              : header.slice(start, end);
          } else {
            forwarded[parameter] = '';
          }

          if (code === 0x2C) {
            output.push(forwarded);
            forwarded = {};
          }

          parameter = undefined;
          start = end = -1;
        } else {
          throw new ParseError(unexpectedCharacterMessage(header, i), header);
        }
      } else if (code === 0x20 || code === 0x09) {
        if (end !== -1) continue;

        if (inQuotes) {
          if (start === -1) start = i;
        } else if (start !== -1) {
          end = i;
        } else {
          throw new ParseError(unexpectedCharacterMessage(header, i), header);
        }
      } else {
        throw new ParseError(unexpectedCharacterMessage(header, i), header);
      }
    }
  }

  if (
    parameter === undefined ||
    inQuotes ||
    (start === -1 && end === -1) ||
    code === 0x20 ||
    code === 0x09
  ) {
    throw new ParseError('Unexpected end of input', header);
  }

  if (start !== -1) {
    if (end === -1) end = i;
    forwarded[parameter] = mustUnescape
      ? decode(header.slice(start, end))
      : header.slice(start, end);
  } else {
    forwarded[parameter] = '';
  }

  output.push(forwarded);
  return output;
}

module.exports = parse;
