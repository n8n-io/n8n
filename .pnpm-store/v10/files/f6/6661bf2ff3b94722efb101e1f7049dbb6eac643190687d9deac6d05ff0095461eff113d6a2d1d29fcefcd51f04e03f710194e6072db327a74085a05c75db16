"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.jsonrepairCore = jsonrepairCore;
var _JSONRepairError = require("../utils/JSONRepairError.js");
var _stringUtils = require("../utils/stringUtils.js");
var _InputBuffer = require("./buffer/InputBuffer.js");
var _OutputBuffer = require("./buffer/OutputBuffer.js");
var _stack = require("./stack.js");
const controlCharacters = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t'
};

// map with all escape characters
const escapeCharacters = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
  // note that \u is handled separately in parseString()
};
function jsonrepairCore(_ref) {
  let {
    onData,
    bufferSize = 65536,
    chunkSize = 65536
  } = _ref;
  const input = (0, _InputBuffer.createInputBuffer)();
  const output = (0, _OutputBuffer.createOutputBuffer)({
    write: onData,
    bufferSize,
    chunkSize
  });
  let i = 0;
  let iFlushed = 0;
  const stack = (0, _stack.createStack)();
  function flushInputBuffer() {
    while (iFlushed < i - bufferSize - chunkSize) {
      iFlushed += chunkSize;
      input.flush(iFlushed);
    }
  }
  function transform(chunk) {
    input.push(chunk);
    while (i < input.currentLength() - bufferSize && parse()) {
      // loop until there is nothing more to process
    }
    flushInputBuffer();
  }
  function flush() {
    input.close();
    while (parse()) {
      // loop until there is nothing more to process
    }
    output.flush();
  }
  function parse() {
    parseWhitespaceAndSkipComments();
    switch (stack.type) {
      case _stack.StackType.object:
        {
          switch (stack.caret) {
            case _stack.Caret.beforeKey:
              return skipEllipsis() || parseObjectKey() || parseUnexpectedColon() || parseRepairTrailingComma() || parseRepairObjectEndOrComma();
            case _stack.Caret.beforeValue:
              return parseValue() || parseRepairMissingObjectValue();
            case _stack.Caret.afterValue:
              return parseObjectComma() || parseObjectEnd() || parseRepairObjectEndOrComma();
            default:
              return false;
          }
        }
      case _stack.StackType.array:
        {
          switch (stack.caret) {
            case _stack.Caret.beforeValue:
              return skipEllipsis() || parseValue() || parseRepairTrailingComma() || parseRepairArrayEnd();
            case _stack.Caret.afterValue:
              return parseArrayComma() || parseArrayEnd() || parseRepairMissingComma() || parseRepairArrayEnd();
            default:
              return false;
          }
        }
      case _stack.StackType.ndJson:
        {
          switch (stack.caret) {
            case _stack.Caret.beforeValue:
              return parseValue() || parseRepairTrailingComma();
            case _stack.Caret.afterValue:
              return parseArrayComma() || parseRepairMissingComma() || parseRepairNdJsonEnd();
            default:
              return false;
          }
        }
      case _stack.StackType.functionCall:
        {
          switch (stack.caret) {
            case _stack.Caret.beforeValue:
              return parseValue();
            case _stack.Caret.afterValue:
              return parseFunctionCallEnd();
            default:
              return false;
          }
        }
      case _stack.StackType.root:
        {
          switch (stack.caret) {
            case _stack.Caret.beforeValue:
              return parseRootStart();
            case _stack.Caret.afterValue:
              return parseRootEnd();
            default:
              return false;
          }
        }
      default:
        return false;
    }
  }
  function parseValue() {
    return parseObjectStart() || parseArrayStart() || parseString() || parseNumber() || parseKeywords() || parseRepairUnquotedString() || parseRepairRegex();
  }
  function parseObjectStart() {
    if (parseCharacter('{')) {
      parseWhitespaceAndSkipComments();
      skipEllipsis();
      if (skipCharacter(',')) {
        parseWhitespaceAndSkipComments();
      }
      if (parseCharacter('}')) {
        return stack.update(_stack.Caret.afterValue);
      }
      return stack.push(_stack.StackType.object, _stack.Caret.beforeKey);
    }
    return false;
  }
  function parseArrayStart() {
    if (parseCharacter('[')) {
      parseWhitespaceAndSkipComments();
      skipEllipsis();
      if (skipCharacter(',')) {
        parseWhitespaceAndSkipComments();
      }
      if (parseCharacter(']')) {
        return stack.update(_stack.Caret.afterValue);
      }
      return stack.push(_stack.StackType.array, _stack.Caret.beforeValue);
    }
    return false;
  }
  function parseRepairUnquotedString() {
    let j = i;
    if ((0, _stringUtils.isFunctionNameCharStart)(input.charAt(j))) {
      while (!input.isEnd(j) && (0, _stringUtils.isFunctionNameChar)(input.charAt(j))) {
        j++;
      }
      let k = j;
      while ((0, _stringUtils.isWhitespace)(input, k)) {
        k++;
      }
      if (input.charAt(k) === '(') {
        // repair a MongoDB function call like NumberLong("2")
        // repair a JSONP function call like callback({...});
        k++;
        i = k;
        return stack.push(_stack.StackType.functionCall, _stack.Caret.beforeValue);
      }
    }
    j = findNextDelimiter(false, j);
    if (j !== null) {
      // test start of an url like "https://..." (this would be parsed as a comment)
      if (input.charAt(j - 1) === ':' && _stringUtils.regexUrlStart.test(input.substring(i, j + 2))) {
        while (!input.isEnd(j) && _stringUtils.regexUrlChar.test(input.charAt(j))) {
          j++;
        }
      }
      const symbol = input.substring(i, j);
      i = j;
      output.push(symbol === 'undefined' ? 'null' : JSON.stringify(symbol));
      if (input.charAt(i) === '"') {
        // we had a missing start quote, but now we encountered the end quote, so we can skip that one
        i++;
      }
      return stack.update(_stack.Caret.afterValue);
    }
    return false;
  }
  function parseRepairRegex() {
    if (input.charAt(i) === '/') {
      const start = i;
      i++;
      while (!input.isEnd(i) && (input.charAt(i) !== '/' || input.charAt(i - 1) === '\\')) {
        i++;
      }
      i++;
      output.push(JSON.stringify(input.substring(start, i)));
      return stack.update(_stack.Caret.afterValue);
    }
  }
  function parseRepairMissingObjectValue() {
    // repair missing object value
    output.push('null');
    return stack.update(_stack.Caret.afterValue);
  }
  function parseRepairTrailingComma() {
    // repair trailing comma
    if (output.endsWithIgnoringWhitespace(',')) {
      output.stripLastOccurrence(',');
      return stack.update(_stack.Caret.afterValue);
    }
    return false;
  }
  function parseUnexpectedColon() {
    if (input.charAt(i) === ':') {
      throwObjectKeyExpected();
    }
    return false;
  }
  function parseUnexpectedEnd() {
    if (input.isEnd(i)) {
      throwUnexpectedEnd();
    } else {
      throwUnexpectedCharacter();
    }
    return false;
  }
  function parseObjectKey() {
    const parsedKey = parseString() || parseUnquotedKey();
    if (parsedKey) {
      parseWhitespaceAndSkipComments();
      if (parseCharacter(':')) {
        // expect a value after the :
        return stack.update(_stack.Caret.beforeValue);
      }
      const truncatedText = input.isEnd(i);
      if ((0, _stringUtils.isStartOfValue)(input.charAt(i)) || truncatedText) {
        // repair missing colon
        output.insertBeforeLastWhitespace(':');
        return stack.update(_stack.Caret.beforeValue);
      }
      throwColonExpected();
    }
    return false;
  }
  function parseObjectComma() {
    if (parseCharacter(',')) {
      return stack.update(_stack.Caret.beforeKey);
    }
    return false;
  }
  function parseObjectEnd() {
    if (parseCharacter('}')) {
      return stack.pop();
    }
    return false;
  }
  function parseRepairObjectEndOrComma() {
    // repair missing object end and trailing comma
    if (input.charAt(i) === '{') {
      output.stripLastOccurrence(',');
      output.insertBeforeLastWhitespace('}');
      return stack.pop();
    }

    // repair missing comma
    if (!input.isEnd(i) && (0, _stringUtils.isStartOfValue)(input.charAt(i))) {
      output.insertBeforeLastWhitespace(',');
      return stack.update(_stack.Caret.beforeKey);
    }

    // repair missing closing brace
    output.insertBeforeLastWhitespace('}');
    return stack.pop();
  }
  function parseArrayComma() {
    if (parseCharacter(',')) {
      return stack.update(_stack.Caret.beforeValue);
    }
    return false;
  }
  function parseArrayEnd() {
    if (parseCharacter(']')) {
      return stack.pop();
    }
    return false;
  }
  function parseRepairMissingComma() {
    // repair missing comma
    if (!input.isEnd(i) && (0, _stringUtils.isStartOfValue)(input.charAt(i))) {
      output.insertBeforeLastWhitespace(',');
      return stack.update(_stack.Caret.beforeValue);
    }
    return false;
  }
  function parseRepairArrayEnd() {
    // repair missing closing bracket
    output.insertBeforeLastWhitespace(']');
    return stack.pop();
  }
  function parseRepairNdJsonEnd() {
    if (input.isEnd(i)) {
      output.push('\n]');
      return stack.pop();
    }
    throwUnexpectedEnd();
    return false; // just to make TS happy
  }
  function parseFunctionCallEnd() {
    if (skipCharacter(')')) {
      skipCharacter(';');
    }
    return stack.pop();
  }
  function parseRootStart() {
    parseMarkdownCodeBlock(['```', '[```', '{```']);
    return parseValue() || parseUnexpectedEnd();
  }
  function parseRootEnd() {
    parseMarkdownCodeBlock(['```', '```]', '```}']);
    const parsedComma = parseCharacter(',');
    parseWhitespaceAndSkipComments();
    if ((0, _stringUtils.isStartOfValue)(input.charAt(i)) && (output.endsWithIgnoringWhitespace(',') || output.endsWithIgnoringWhitespace('\n'))) {
      // start of a new value after end of the root level object: looks like
      // newline delimited JSON -> turn into a root level array
      if (!parsedComma) {
        // repair missing comma
        output.insertBeforeLastWhitespace(',');
      }
      output.unshift('[\n');
      return stack.push(_stack.StackType.ndJson, _stack.Caret.beforeValue);
    }
    if (parsedComma) {
      // repair: remove trailing comma
      output.stripLastOccurrence(',');
      return stack.update(_stack.Caret.afterValue);
    }

    // repair redundant end braces and brackets
    while (input.charAt(i) === '}' || input.charAt(i) === ']') {
      i++;
      parseWhitespaceAndSkipComments();
    }
    if (!input.isEnd(i)) {
      throwUnexpectedCharacter();
    }
    return false;
  }
  function parseWhitespaceAndSkipComments() {
    let skipNewline = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    const start = i;
    let changed = parseWhitespace(skipNewline);
    do {
      changed = parseComment();
      if (changed) {
        changed = parseWhitespace(skipNewline);
      }
    } while (changed);
    return i > start;
  }
  function parseWhitespace(skipNewline) {
    const _isWhiteSpace = skipNewline ? _stringUtils.isWhitespace : _stringUtils.isWhitespaceExceptNewline;
    let whitespace = '';
    while (true) {
      if (_isWhiteSpace(input, i)) {
        whitespace += input.charAt(i);
        i++;
      } else if ((0, _stringUtils.isSpecialWhitespace)(input, i)) {
        // repair special whitespace
        whitespace += ' ';
        i++;
      } else {
        break;
      }
    }
    if (whitespace.length > 0) {
      output.push(whitespace);
      return true;
    }
    return false;
  }
  function parseComment() {
    // find a block comment '/* ... */'
    if (input.charAt(i) === '/' && input.charAt(i + 1) === '*') {
      // repair block comment by skipping it
      while (!input.isEnd(i) && !atEndOfBlockComment(i)) {
        i++;
      }
      i += 2;
      return true;
    }

    // find a line comment '// ...'
    if (input.charAt(i) === '/' && input.charAt(i + 1) === '/') {
      // repair line comment by skipping it
      while (!input.isEnd(i) && input.charAt(i) !== '\n') {
        i++;
      }
      return true;
    }
    return false;
  }
  function parseMarkdownCodeBlock(blocks) {
    // find and skip over a Markdown fenced code block:
    //     ``` ... ```
    // or
    //     ```json ... ```
    if (skipMarkdownCodeBlock(blocks)) {
      if ((0, _stringUtils.isFunctionNameCharStart)(input.charAt(i))) {
        // strip the optional language specifier like "json"
        while (!input.isEnd(i) && (0, _stringUtils.isFunctionNameChar)(input.charAt(i))) {
          i++;
        }
      }
      parseWhitespaceAndSkipComments();
      return true;
    }
    return false;
  }
  function skipMarkdownCodeBlock(blocks) {
    for (const block of blocks) {
      const end = i + block.length;
      if (input.substring(i, end) === block) {
        i = end;
        return true;
      }
    }
    return false;
  }
  function parseCharacter(char) {
    if (input.charAt(i) === char) {
      output.push(input.charAt(i));
      i++;
      return true;
    }
    return false;
  }
  function skipCharacter(char) {
    if (input.charAt(i) === char) {
      i++;
      return true;
    }
    return false;
  }
  function skipEscapeCharacter() {
    return skipCharacter('\\');
  }

  /**
   * Skip ellipsis like "[1,2,3,...]" or "[1,2,3,...,9]" or "[...,7,8,9]"
   * or a similar construct in objects.
   */
  function skipEllipsis() {
    parseWhitespaceAndSkipComments();
    if (input.charAt(i) === '.' && input.charAt(i + 1) === '.' && input.charAt(i + 2) === '.') {
      // repair: remove the ellipsis (three dots) and optionally a comma
      i += 3;
      parseWhitespaceAndSkipComments();
      skipCharacter(',');
      return true;
    }
    return false;
  }

  /**
   * Parse a string enclosed by double quotes "...". Can contain escaped quotes
   * Repair strings enclosed in single quotes or special quotes
   * Repair an escaped string
   *
   * The function can run in two stages:
   * - First, it assumes the string has a valid end quote
   * - If it turns out that the string does not have a valid end quote followed
   *   by a delimiter (which should be the case), the function runs again in a
   *   more conservative way, stopping the string at the first next delimiter
   *   and fixing the string by inserting a quote there, or stopping at a
   *   stop index detected in the first iteration.
   */
  function parseString() {
    let stopAtDelimiter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    let stopAtIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
    let skipEscapeChars = input.charAt(i) === '\\';
    if (skipEscapeChars) {
      // repair: remove the first escape character
      i++;
      skipEscapeChars = true;
    }
    if ((0, _stringUtils.isQuote)(input.charAt(i))) {
      // double quotes are correct JSON,
      // single quotes come from JavaScript for example, we assume it will have a correct single end quote too
      // otherwise, we will match any double-quote-like start with a double-quote-like end,
      // or any single-quote-like start with a single-quote-like end
      const isEndQuote = (0, _stringUtils.isDoubleQuote)(input.charAt(i)) ? _stringUtils.isDoubleQuote : (0, _stringUtils.isSingleQuote)(input.charAt(i)) ? _stringUtils.isSingleQuote : (0, _stringUtils.isSingleQuoteLike)(input.charAt(i)) ? _stringUtils.isSingleQuoteLike : _stringUtils.isDoubleQuoteLike;
      const iBefore = i;
      const oBefore = output.length();
      output.push('"');
      i++;
      while (true) {
        if (input.isEnd(i)) {
          // end of text, we have a missing quote somewhere

          const iPrev = prevNonWhitespaceIndex(i - 1);
          if (!stopAtDelimiter && (0, _stringUtils.isDelimiter)(input.charAt(iPrev))) {
            // if the text ends with a delimiter, like ["hello],
            // so the missing end quote should be inserted before this delimiter
            // retry parsing the string, stopping at the first next delimiter
            i = iBefore;
            output.remove(oBefore);
            return parseString(true);
          }

          // repair missing quote
          output.insertBeforeLastWhitespace('"');
          return stack.update(_stack.Caret.afterValue);
        }
        if (i === stopAtIndex) {
          // use the stop index detected in the first iteration, and repair end quote
          output.insertBeforeLastWhitespace('"');
          return stack.update(_stack.Caret.afterValue);
        }
        if (isEndQuote(input.charAt(i))) {
          // end quote
          // let us check what is before and after the quote to verify whether this is a legit end quote
          const iQuote = i;
          const oQuote = output.length();
          output.push('"');
          i++;
          parseWhitespaceAndSkipComments(false);
          if (stopAtDelimiter || input.isEnd(i) || (0, _stringUtils.isDelimiter)(input.charAt(i)) || (0, _stringUtils.isQuote)(input.charAt(i)) || (0, _stringUtils.isDigit)(input.charAt(i))) {
            // The quote is followed by the end of the text, a delimiter, or a next value
            // so the quote is indeed the end of the string
            parseConcatenatedString();
            return stack.update(_stack.Caret.afterValue);
          }
          const iPrevChar = prevNonWhitespaceIndex(iQuote - 1);
          const prevChar = input.charAt(iPrevChar);
          if (prevChar === ',') {
            // A comma followed by a quote, like '{"a":"b,c,"d":"e"}'.
            // We assume that the quote is a start quote, and that the end quote
            // should have been located right before the comma but is missing.
            i = iBefore;
            output.remove(oBefore);
            return parseString(false, iPrevChar);
          }
          if ((0, _stringUtils.isDelimiter)(prevChar)) {
            // This is not the right end quote: it is preceded by a delimiter,
            // and NOT followed by a delimiter. So, there is an end quote missing
            // parse the string again and then stop at the first next delimiter
            i = iBefore;
            output.remove(oBefore);
            return parseString(true);
          }

          // revert to right after the quote but before any whitespace, and continue parsing the string
          output.remove(oQuote + 1);
          i = iQuote + 1;

          // repair unescaped quote
          output.insertAt(oQuote, '\\');
        } else if (stopAtDelimiter && (0, _stringUtils.isUnquotedStringDelimiter)(input.charAt(i))) {
          // we're in the mode to stop the string at the first delimiter
          // because there is an end quote missing

          // test start of an url like "https://..." (this would be parsed as a comment)
          if (input.charAt(i - 1) === ':' && _stringUtils.regexUrlStart.test(input.substring(iBefore + 1, i + 2))) {
            while (!input.isEnd(i) && _stringUtils.regexUrlChar.test(input.charAt(i))) {
              output.push(input.charAt(i));
              i++;
            }
          }

          // repair missing quote
          output.insertBeforeLastWhitespace('"');
          parseConcatenatedString();
          return stack.update(_stack.Caret.afterValue);
        } else if (input.charAt(i) === '\\') {
          // handle escaped content like \n or \u2605
          const char = input.charAt(i + 1);
          const escapeChar = escapeCharacters[char];
          if (escapeChar !== undefined) {
            output.push(input.substring(i, i + 2));
            i += 2;
          } else if (char === 'u') {
            let j = 2;
            while (j < 6 && (0, _stringUtils.isHex)(input.charAt(i + j))) {
              j++;
            }
            if (j === 6) {
              output.push(input.substring(i, i + 6));
              i += 6;
            } else if (input.isEnd(i + j)) {
              // repair invalid or truncated unicode char at the end of the text
              // by removing the unicode char and ending the string here
              i += j;
            } else {
              throwInvalidUnicodeCharacter();
            }
          } else {
            // repair invalid escape character: remove it
            output.push(char);
            i += 2;
          }
        } else {
          // handle regular characters
          const char = input.charAt(i);
          if (char === '"' && input.charAt(i - 1) !== '\\') {
            // repair unescaped double quote
            output.push(`\\${char}`);
            i++;
          } else if ((0, _stringUtils.isControlCharacter)(char)) {
            // unescaped control character
            output.push(controlCharacters[char]);
            i++;
          } else {
            if (!(0, _stringUtils.isValidStringCharacter)(char)) {
              throwInvalidCharacter(char);
            }
            output.push(char);
            i++;
          }
        }
        if (skipEscapeChars) {
          // repair: skipped escape character (nothing to do)
          skipEscapeCharacter();
        }
      }
    }
    return false;
  }

  /**
   * Repair concatenated strings like "hello" + "world", change this into "helloworld"
   */
  function parseConcatenatedString() {
    let parsed = false;
    parseWhitespaceAndSkipComments();
    while (input.charAt(i) === '+') {
      parsed = true;
      i++;
      parseWhitespaceAndSkipComments();

      // repair: remove the end quote of the first string
      output.stripLastOccurrence('"', true);
      const start = output.length();
      const parsedStr = parseString();
      if (parsedStr) {
        // repair: remove the start quote of the second string
        output.remove(start, start + 1);
      } else {
        // repair: remove the + because it is not followed by a string
        output.insertBeforeLastWhitespace('"');
      }
    }
    return parsed;
  }

  /**
   * Parse a number like 2.4 or 2.4e6
   */
  function parseNumber() {
    const start = i;
    if (input.charAt(i) === '-') {
      i++;
      if (atEndOfNumber()) {
        repairNumberEndingWithNumericSymbol(start);
        return stack.update(_stack.Caret.afterValue);
      }
      if (!(0, _stringUtils.isDigit)(input.charAt(i))) {
        i = start;
        return false;
      }
    }

    // Note that in JSON leading zeros like "00789" are not allowed.
    // We will allow all leading zeros here though and at the end of parseNumber
    // check against trailing zeros and repair that if needed.
    // Leading zeros can have meaning, so we should not clear them.
    while ((0, _stringUtils.isDigit)(input.charAt(i))) {
      i++;
    }
    if (input.charAt(i) === '.') {
      i++;
      if (atEndOfNumber()) {
        repairNumberEndingWithNumericSymbol(start);
        return stack.update(_stack.Caret.afterValue);
      }
      if (!(0, _stringUtils.isDigit)(input.charAt(i))) {
        i = start;
        return false;
      }
      while ((0, _stringUtils.isDigit)(input.charAt(i))) {
        i++;
      }
    }
    if (input.charAt(i) === 'e' || input.charAt(i) === 'E') {
      i++;
      if (input.charAt(i) === '-' || input.charAt(i) === '+') {
        i++;
      }
      if (atEndOfNumber()) {
        repairNumberEndingWithNumericSymbol(start);
        return stack.update(_stack.Caret.afterValue);
      }
      if (!(0, _stringUtils.isDigit)(input.charAt(i))) {
        i = start;
        return false;
      }
      while ((0, _stringUtils.isDigit)(input.charAt(i))) {
        i++;
      }
    }

    // if we're not at the end of the number by this point, allow this to be parsed as another type
    if (!atEndOfNumber()) {
      i = start;
      return false;
    }
    if (i > start) {
      // repair a number with leading zeros like "00789"
      const num = input.substring(start, i);
      const hasInvalidLeadingZero = /^0\d/.test(num);
      output.push(hasInvalidLeadingZero ? `"${num}"` : num);
      return stack.update(_stack.Caret.afterValue);
    }
    return false;
  }

  /**
   * Parse keywords true, false, null
   * Repair Python keywords True, False, None
   */
  function parseKeywords() {
    return parseKeyword('true', 'true') || parseKeyword('false', 'false') || parseKeyword('null', 'null') ||
    // repair Python keywords True, False, None
    parseKeyword('True', 'true') || parseKeyword('False', 'false') || parseKeyword('None', 'null');
  }
  function parseKeyword(name, value) {
    if (input.substring(i, i + name.length) === name) {
      output.push(value);
      i += name.length;
      return stack.update(_stack.Caret.afterValue);
    }
    return false;
  }
  function parseUnquotedKey() {
    let end = findNextDelimiter(true, i);
    if (end !== null) {
      // first, go back to prevent getting trailing whitespaces in the string
      while ((0, _stringUtils.isWhitespace)(input, end - 1) && end > i) {
        end--;
      }
      const symbol = input.substring(i, end);
      output.push(JSON.stringify(symbol));
      i = end;
      if (input.charAt(i) === '"') {
        // we had a missing start quote, but now we encountered the end quote, so we can skip that one
        i++;
      }
      return stack.update(_stack.Caret.afterValue); // we do not have a state Caret.afterKey, therefore we use afterValue here
    }
    return false;
  }
  function findNextDelimiter(isKey, start) {
    // note that the symbol can end with whitespaces: we stop at the next delimiter
    // also, note that we allow strings to contain a slash / in order to support repairing regular expressions
    let j = start;
    while (!input.isEnd(j) && !(0, _stringUtils.isUnquotedStringDelimiter)(input.charAt(j)) && !(0, _stringUtils.isQuote)(input.charAt(j)) && (!isKey || input.charAt(j) !== ':')) {
      j++;
    }
    return j > i ? j : null;
  }
  function prevNonWhitespaceIndex(start) {
    let prev = start;
    while (prev > 0 && (0, _stringUtils.isWhitespace)(input, prev)) {
      prev--;
    }
    return prev;
  }
  function atEndOfNumber() {
    return input.isEnd(i) || (0, _stringUtils.isDelimiter)(input.charAt(i)) || (0, _stringUtils.isWhitespace)(input, i);
  }
  function repairNumberEndingWithNumericSymbol(start) {
    // repair numbers cut off at the end
    // this will only be called when we end after a '.', '-', or 'e' and does not
    // change the number more than it needs to make it valid JSON
    output.push(`${input.substring(start, i)}0`);
  }
  function throwInvalidCharacter(char) {
    throw new _JSONRepairError.JSONRepairError(`Invalid character ${JSON.stringify(char)}`, i);
  }
  function throwUnexpectedCharacter() {
    throw new _JSONRepairError.JSONRepairError(`Unexpected character ${JSON.stringify(input.charAt(i))}`, i);
  }
  function throwUnexpectedEnd() {
    throw new _JSONRepairError.JSONRepairError('Unexpected end of json string', i);
  }
  function throwObjectKeyExpected() {
    throw new _JSONRepairError.JSONRepairError('Object key expected', i);
  }
  function throwColonExpected() {
    throw new _JSONRepairError.JSONRepairError('Colon expected', i);
  }
  function throwInvalidUnicodeCharacter() {
    const chars = input.substring(i, i + 6);
    throw new _JSONRepairError.JSONRepairError(`Invalid unicode character "${chars}"`, i);
  }
  function atEndOfBlockComment(i) {
    return input.charAt(i) === '*' && input.charAt(i + 1) === '/';
  }
  return {
    transform,
    flush
  };
}
//# sourceMappingURL=core.js.map