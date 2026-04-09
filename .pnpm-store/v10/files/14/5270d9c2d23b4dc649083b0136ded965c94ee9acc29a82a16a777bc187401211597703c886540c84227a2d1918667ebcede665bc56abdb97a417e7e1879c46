import { parseLosslessNumber } from './numberParsers.js';
import { revive } from './revive.js';
/**
 * The LosslessJSON.parse() method parses a string as JSON, optionally transforming
 * the value produced by parsing.
 *
 * The parser is based on the parser of Tan Li Hou shared in
 * https://lihautan.com/json-parser-with-javascript/
 *
 * @param text
 * The string to parse as JSON. See the JSON object for a description of JSON syntax.
 *
 * @param [reviver]
 * If a function, prescribes how the value originally produced by parsing is
 * transformed, before being returned.
 *
 * @param [options=ParseOptions | NumberParserArgument]
 * Pass a custom number parser. Input is a string, and the output can be unknown
 * numeric value: number, bigint, LosslessNumber, or a custom BigNumber library.
 *
 * @returns Returns the Object corresponding to the given JSON text.
 *
 * @throws Throws a SyntaxError exception if the string to parse is not valid JSON.
 */
export function parse(text, reviver, options) {
  const optionsObj = typeof options === 'function' ? {
    parseNumber: options
  } : options;
  const parseNumber = optionsObj?.parseNumber ?? parseLosslessNumber;
  const onDuplicateKey = optionsObj?.onDuplicateKey ?? throwDuplicateKey;
  let i = 0;
  const value = parseValue();
  expectValue(value);
  expectEndOfInput();
  return reviver ? revive(value, reviver) : value;
  function parseObject() {
    if (text.charCodeAt(i) === codeOpeningBrace) {
      i++;
      skipWhitespace();
      const object = {};
      let initial = true;
      while (i < text.length && text.charCodeAt(i) !== codeClosingBrace) {
        if (!initial) {
          eatComma();
          skipWhitespace();
        } else {
          initial = false;
        }
        const start = i;
        const key = parseString();
        if (key === undefined) {
          throwObjectKeyExpected();
          return; // To make TS happy
        }
        skipWhitespace();
        eatColon();
        const value = parseValue();
        if (value === undefined) {
          throwObjectValueExpected();
          return; // To make TS happy
        }

        // handle duplicate keys
        // biome-ignore lint/suspicious/noPrototypeBuiltins: TODO: replace with hasOwn one day, when browser support is high enough
        if (Object.prototype.hasOwnProperty.call(object, key) && !isDeepEqual(value, object[key])) {
          // Note that we could also test `if(key in object) {...}`
          // or `if (object[key] !== 'undefined') {...}`, but that is slower.
          const returnedValue = onDuplicateKey({
            key,
            position: start + 1,
            oldValue: object[key],
            newValue: value
          });
          if (returnedValue !== undefined) {
            object[key] = returnedValue;
          }
        } else {
          object[key] = value;
        }
      }
      if (text.charCodeAt(i) !== codeClosingBrace) {
        throwObjectKeyOrEndExpected();
      }
      i++;
      return object;
    }
  }
  function parseArray() {
    if (text.charCodeAt(i) === codeOpeningBracket) {
      i++;
      skipWhitespace();
      const array = [];
      let initial = true;
      while (i < text.length && text.charCodeAt(i) !== codeClosingBracket) {
        if (!initial) {
          eatComma();
        } else {
          initial = false;
        }
        const value = parseValue();
        expectArrayItem(value);
        array.push(value);
      }
      if (text.charCodeAt(i) !== codeClosingBracket) {
        throwArrayItemOrEndExpected();
      }
      i++;
      return array;
    }
  }
  function parseValue() {
    skipWhitespace();
    const value = parseString() ?? parseNumeric() ?? parseObject() ?? parseArray() ?? parseKeyword('true', true) ?? parseKeyword('false', false) ?? parseKeyword('null', null);
    skipWhitespace();
    return value;
  }
  function parseKeyword(name, value) {
    if (text.slice(i, i + name.length) === name) {
      i += name.length;
      return value;
    }
  }
  function skipWhitespace() {
    while (isWhitespace(text.charCodeAt(i))) {
      i++;
    }
  }
  function parseString() {
    if (text.charCodeAt(i) === codeDoubleQuote) {
      i++;
      let result = '';
      while (i < text.length && text.charCodeAt(i) !== codeDoubleQuote) {
        if (text.charCodeAt(i) === codeBackslash) {
          const char = text[i + 1];
          const escapeChar = escapeCharacters[char];
          if (escapeChar !== undefined) {
            result += escapeChar;
            i++;
          } else if (char === 'u') {
            if (isHex(text.charCodeAt(i + 2)) && isHex(text.charCodeAt(i + 3)) && isHex(text.charCodeAt(i + 4)) && isHex(text.charCodeAt(i + 5))) {
              result += String.fromCharCode(Number.parseInt(text.slice(i + 2, i + 6), 16));
              i += 5;
            } else {
              throwInvalidUnicodeCharacter(i);
            }
          } else {
            throwInvalidEscapeCharacter(i);
          }
        } else {
          if (isValidStringCharacter(text.charCodeAt(i))) {
            result += text[i];
          } else {
            throwInvalidCharacter(text[i]);
          }
        }
        i++;
      }
      expectEndOfString();
      i++;
      return result;
    }
  }
  function parseNumeric() {
    const start = i;
    if (text.charCodeAt(i) === codeMinus) {
      i++;
      expectDigit(start);
    }
    if (text.charCodeAt(i) === codeZero) {
      i++;
    } else if (isNonZeroDigit(text.charCodeAt(i))) {
      i++;
      while (isDigit(text.charCodeAt(i))) {
        i++;
      }
    }
    if (text.charCodeAt(i) === codeDot) {
      i++;
      expectDigit(start);
      while (isDigit(text.charCodeAt(i))) {
        i++;
      }
    }
    if (text.charCodeAt(i) === codeLowercaseE || text.charCodeAt(i) === codeUppercaseE) {
      i++;
      if (text.charCodeAt(i) === codeMinus || text.charCodeAt(i) === codePlus) {
        i++;
      }
      expectDigit(start);
      while (isDigit(text.charCodeAt(i))) {
        i++;
      }
    }
    if (i > start) {
      return parseNumber(text.slice(start, i));
    }
  }
  function eatComma() {
    if (text.charCodeAt(i) !== codeComma) {
      throw new SyntaxError(`Comma ',' expected after value ${gotAt()}`);
    }
    i++;
  }
  function eatColon() {
    if (text.charCodeAt(i) !== codeColon) {
      throw new SyntaxError(`Colon ':' expected after property name ${gotAt()}`);
    }
    i++;
  }
  function expectValue(value) {
    if (value === undefined) {
      throw new SyntaxError(`JSON value expected ${gotAt()}`);
    }
  }
  function expectArrayItem(value) {
    if (value === undefined) {
      throw new SyntaxError(`Array item expected ${gotAt()}`);
    }
  }
  function expectEndOfInput() {
    if (i < text.length) {
      throw new SyntaxError(`Expected end of input ${gotAt()}`);
    }
  }
  function expectDigit(start) {
    if (!isDigit(text.charCodeAt(i))) {
      const numSoFar = text.slice(start, i);
      throw new SyntaxError(`Invalid number '${numSoFar}', expecting a digit ${gotAt()}`);
    }
  }
  function expectEndOfString() {
    if (text.charCodeAt(i) !== codeDoubleQuote) {
      throw new SyntaxError(`End of string '"' expected ${gotAt()}`);
    }
  }
  function throwObjectKeyExpected() {
    throw new SyntaxError(`Quoted object key expected ${gotAt()}`);
  }
  function throwDuplicateKey(_ref) {
    let {
      key,
      position
    } = _ref;
    throw new SyntaxError(`Duplicate key '${key}' encountered at position ${position}`);
  }
  function throwObjectKeyOrEndExpected() {
    throw new SyntaxError(`Quoted object key or end of object '}' expected ${gotAt()}`);
  }
  function throwArrayItemOrEndExpected() {
    throw new SyntaxError(`Array item or end of array ']' expected ${gotAt()}`);
  }
  function throwInvalidCharacter(char) {
    throw new SyntaxError(`Invalid character '${char}' ${pos()}`);
  }
  function throwInvalidEscapeCharacter(start) {
    const chars = text.slice(start, start + 2);
    throw new SyntaxError(`Invalid escape character '${chars}' ${pos()}`);
  }
  function throwObjectValueExpected() {
    throw new SyntaxError(`Object value expected after ':' ${pos()}`);
  }
  function throwInvalidUnicodeCharacter(start) {
    const chars = text.slice(start, start + 6);
    throw new SyntaxError(`Invalid unicode character '${chars}' ${pos()}`);
  }

  // zero based character position
  function pos() {
    return `at position ${i}`;
  }
  function got() {
    return i < text.length ? `but got '${text[i]}'` : 'but reached end of input';
  }
  function gotAt() {
    return `${got()} ${pos()}`;
  }
}
function isWhitespace(code) {
  return code === codeSpace || code === codeNewline || code === codeTab || code === codeReturn;
}
function isHex(code) {
  return code >= codeZero && code <= codeNine || code >= codeUppercaseA && code <= codeUppercaseF || code >= codeLowercaseA && code <= codeLowercaseF;
}
function isDigit(code) {
  return code >= codeZero && code <= codeNine;
}
function isNonZeroDigit(code) {
  return code >= codeOne && code <= codeNine;
}
export function isValidStringCharacter(code) {
  return code >= 0x20 && code <= 0x10ffff;
}
export function isDeepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => isDeepEqual(item, b[index]));
  }
  if (isObject(a) && isObject(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.every(key => isDeepEqual(a[key], b[key]));
  }
  return false;
}
function isObject(value) {
  return typeof value === 'object' && value !== null;
}

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
const codeBackslash = 0x5c; // "\"
const codeOpeningBrace = 0x7b; // "{"
const codeClosingBrace = 0x7d; // "}"
const codeOpeningBracket = 0x5b; // "["
const codeClosingBracket = 0x5d; // "]"
const codeSpace = 0x20; // " "
const codeNewline = 0xa; // "\n"
const codeTab = 0x9; // "\t"
const codeReturn = 0xd; // "\r"
const codeDoubleQuote = 0x0022; // "
const codePlus = 0x2b; // "+"
const codeMinus = 0x2d; // "-"
const codeZero = 0x30;
const codeOne = 0x31;
const codeNine = 0x39;
const codeComma = 0x2c; // ","
const codeDot = 0x2e; // "." (dot, period)
const codeColon = 0x3a; // ":"
export const codeUppercaseA = 0x41; // "A"
export const codeLowercaseA = 0x61; // "a"
export const codeUppercaseE = 0x45; // "E"
export const codeLowercaseE = 0x65; // "e"
export const codeUppercaseF = 0x46; // "F"
export const codeLowercaseF = 0x66; // "f"
//# sourceMappingURL=parse.js.map