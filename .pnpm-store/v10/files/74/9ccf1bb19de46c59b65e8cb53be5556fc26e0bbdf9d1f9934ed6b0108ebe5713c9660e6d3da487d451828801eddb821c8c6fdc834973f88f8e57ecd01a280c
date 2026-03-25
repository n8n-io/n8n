"use strict";

/**
 * Processes a string and finds Sass operators in it
 *
 * @param {Object} args - Named arguments object
 * @param {String} args.string - the input string
 * @param {Number} args.globalIndex - the position of args.string from the start of the line
 * @param {Boolean} args.isAfterColon - pass "true" if the string is
 *    a variable value, a mixin/function parameter default.
 *    In such cases + and / tend to be operations more often
 * @param {Function} args.callback - will be called on every instance of
 *    an operator. Accepts parameters:
 *    • string - the default source string
 *    • globalIndex - the string's position in the outer input
 *    • startIndex - index in string, where the operator starts
 *    • endIndex - index in string, where the operator ends (for `==`, etc.)
 *
 * @return {Array} array of { symbol, globalIndex, startIndex, endIndex }
 *    for each operator found within a string
 */
module.exports = function findOperators({
  string,
  globalIndex,
  isAfterColon,
  callback
}) {
  const mathOperators = ["+", "/", "-", "*", "%"];
  // A stack of modes activated for the current char: string, interpolation
  // Calculations inside strings are not processed, so spaces are not linted
  const modesEntered = [
    {
      mode: "normal",
      isCalculationEnabled: true,
      character: null
    }
  ];
  const result = [];
  let lastModeIndex = 0;

  for (let i = 0; i < string.length; i++) {
    const character = string[i];
    const substringStartingWithIndex = string.substring(i);
    const lastMode = modesEntered[lastModeIndex];

    // If entering/exiting a string
    if (character === '"' || character === "'") {
      if (lastMode && lastMode.isCalculationEnabled === true) {
        modesEntered.push({
          mode: "string",
          isCalculationEnabled: false,
          character
        });
        lastModeIndex++;
      } else if (
        lastMode &&
        lastMode.mode === "string" &&
        lastMode.character === character &&
        string[i - 1] !== "\\"
      ) {
        modesEntered.pop();
        lastModeIndex--;
      }
    }

    // If entering/exiting interpolation (may be inside a string)
    // Comparing with length-2 because `#{` at the very end doesnt matter
    if (
      character === "#" &&
      i + 1 < string.length - 2 &&
      string[i + 1] === "{"
    ) {
      modesEntered.push({
        mode: "interpolation",
        isCalculationEnabled: true
      });
      lastModeIndex++;
    } else if (character === "}") {
      modesEntered.pop();
      lastModeIndex--;
    }

    // Don't lint if inside a string
    if (lastMode && lastMode.isCalculationEnabled === false) {
      continue;
    }

    // If it's a math operator
    if (
      (mathOperators.includes(character) &&
        mathOperatorCharType(string, i, isAfterColon) === "op") ||
      // or is "<" or ">"
      substringStartingWithIndex.search(/^[<>]([^=]|$)/) !== -1
    ) {
      result.push({
        symbol: string[i],
        globalIndex,
        startIndex: i,
        endIndex: i
      });

      if (callback) {
        callback(string, globalIndex, i, i);
      }
    }

    // "<=", ">=", "!=", "=="
    if (substringStartingWithIndex.search(/^[><=!]=/) !== -1) {
      result.push({
        symbol: string[i],
        globalIndex,
        startIndex: i,
        endIndex: i + 1
      });

      if (callback) {
        callback(string, globalIndex, i, i + 1);
      }
    }
  }

  // result.length > 0 && console.log(string, result)
  return result;
};

/**
 * Checks if a character is an operator, a sign (+ or -), or part of a string
 *
 * @param {String} string - the source string
 * @param {Number} index - the index of the character in string to check
 * @param {Boolean} isAfterColon - if the value string a variable
 *    value, a mixin/function parameter default. In such cases + and / tend
 *    to be operations more often
 * @return {String|false}
 *    • "op", if the character is a operator in a math/string operation
 *    • "sign" if it is a + or - before a numeric,
 *    • "char" if it is a part of a string,
 *    • false - if it is none from above (most likely an error)
 */
function mathOperatorCharType(string, index, isAfterColon) {
  // !Checking here to prevent unnecessary calculations and deep recursion
  // when calling isPrecedingOperator()
  if (!["+", "/", "-", "*", "%"].includes(string[index])) {
    return "char";
  }

  const character = string[index];
  const prevCharacter = string[index - 1];

  if (prevCharacter !== "\\") {
    // ---- Processing + characters
    if (character === "+") {
      return checkPlus(string, index, isAfterColon);
    }

    // ---- Processing - characters
    if (character === "-") {
      return checkMinus(string, index);
    }

    // ---- Processing * character
    if (character === "*") {
      return checkMultiplication(string, index);
    }

    // ---- Processing % character
    if (character === "%") {
      return checkPercent(string, index);
    }

    // ---- Processing / character
    // https://sass-lang.com/documentation/operators/numeric#slash-separated-values
    if (character === "/") {
      return checkSlash(string, index, isAfterColon);
    }
  }

  return "char";
}

// --------------------------------------------------------------------------
// Functions for checking particular characters (+, -, /)
// --------------------------------------------------------------------------

/**
 * Checks the specified `*` char type: operator, sign (*), part of string
 *
 * @param {String} string - the source string
 * @param {Number} index - the index of the character in string to check
 * @return {String|false}
 *    • "op", if the character is a operator in a math/string operation
 *    • "sign" if it is a sign before a positive number,
 *    • "char" if it is a part of a string or identifier,
 *    • false - if it is none from above (most likely an error)
 */
function checkMultiplication(string, index) {
  const after = string.substring(index + 1);
  const insideFn = isInsideFunctionCall(string, index);

  // e.g. Tailwind @apply *:w-full;
  if (after[0] === ":") {
    return "char";
  }

  if (insideFn.is && insideFn.fn) {
    const fnArgsReg = new RegExp(insideFn.fn + "\\(([^)]+)\\)");
    const fnArgs = string.match(fnArgsReg);
    const isSingleMultiplicationChar =
      Array.isArray(fnArgs) && fnArgs[1] === "*";
    // e.g. selector(:has(*))
    if (isSingleMultiplicationChar) {
      return "char";
    }
  }

  return "op";
}

/**
 * Checks the specified `+` char type: operator, sign (+ or -), part of string
 *
 * @param {String} string - the source string
 * @param {Number} index - the index of the character in string to check
 * @param {Boolean} isAftercolon - if the value string a variable
 *    value, a mixin/function parameter default. In such cases + is always an
 *    operator if surrounded by numbers/values with units
 * @return {String|false}
 *    • "op", if the character is a operator in a math/string operation
 *    • "sign" if it is a sign before a positive number,
 *    • false - if it is none from above (most likely an error)
 */
function checkPlus(string, index, isAftercolon) {
  const before = string.substring(0, index);
  const after = string.substring(index + 1);

  // If the character is at the beginning of the input
  const isAtStart_ = isAtStart(string, index);
  // If the character is at the end of the input
  const isAtEnd_ = isAtEnd(string, index);
  const isWhitespaceBefore = before.search(/\s$/) !== -1;
  const isWhitespaceAfter = after.search(/^\s/) !== -1;

  const isValueWithUnitAfter_ = isValueWithUnitAfter(after);
  const isNumberAfter_ = isNumberAfter(after);
  const isInterpolationAfter_ = isInterpolationAfter(after);
  // The early check above helps prevent deep recursion here
  const isPrecedingOperator_ = isPrecedingOperator(string, index);

  if (isAtStart_) {
    // console.log("+, `+<sth>` or `+ <sth>`")
    return "sign";
  }

  // E.g. `1+1`, `string+#fff`
  if (!isAtStart_ && !isWhitespaceBefore && !isAtEnd_ && !isWhitespaceAfter) {
    // E.g. `1-+1`
    if (isPrecedingOperator_) {
      // console.log('1+1')
      return "sign";
    }

    // console.log("+, no spaces")
    return "op";
  }

  // e.g. `something +something`
  if (!isAtEnd_ && !isWhitespaceAfter) {
    // e.g. `+something`, ` ... , +something`, etc.
    if (isNoOperandBefore(string, index)) {
      // console.log("+, nothing before")
      return "sign";
    }

    // e.g. `sth +10px`, `sth +1`
    if (
      (isValueWithUnitAfter_.is && !isValueWithUnitAfter_.opsBetween) ||
      (isNumberAfter_.is && !isNumberAfter_.opsBetween)
    ) {
      if (isAftercolon === true) {
        // console.log(": 10px +1")
        return "op";
      }

      // e.g. `(sth +10px)`, `fun(sth +1)`
      if (
        isInsideParens(string, index) ||
        isInsideFunctionCall(string, index).is
      ) {
        // console.log("+10px or +1, inside function or parens")
        return "op";
      }

      // e.g. `#{10px +1}`
      if (isInsideInterpolation(string, index)) {
        // console.log('+, #{10px +1}')
        return "op";
      }

      // console.log('+, default')
      return "sign";
    }

    // e.g. `sth +#fff`, `sth +string`, `sth +#{...}`, `sth +$var`
    if (
      isStringAfter(after) ||
      isHexColorAfter(after) ||
      after[0] === "$" ||
      (isInterpolationAfter_.is && !isInterpolationAfter_.opsBefore)
    ) {
      // e.g. `sth+ +string`
      if (isPrecedingOperator_) {
        // console.log("+10px or +1, before is an operator")
        return "sign";
      }

      // console.log("+#000, +string, +#{sth}, +$var")
      return "op";
    }

    // console.log('sth +sth, default')
    return "op";
  }

  // If the + is after a value, e.g. `$var+`
  if (!isAtStart_ && !isWhitespaceBefore) {
    // It is always an operator. Prior to Sass 4, `#{...}+` was different,
    // but that's not logical and had been fixed.
    // console.log('1+ sth')
    return "op";
  }

  // If it has whitespaces on both sides
  // console.log('sth + sth')
  return "op";
}

/**
 * Checks the specified `-` character: operator, sign (+ or -), part of string
 *
 * @param {String} string - the source string
 * @param {Number} index - the index of the character in string to check
 * @return {String|false}
 *    • "op", if the character is a operator in a math/string operation
 *    • "sign" if it is a sign before a negative number,
 *    • "char" if it is a part of a string or identifier,
 *    • false - if it is none from above (most likely an error)
 */
function checkMinus(string, index) {
  const before = string.substring(0, index);
  const after = string.substring(index + 1);
  // If the character is at the beginning of the input
  const isAtStart_ = isAtStart(string, index);
  // If the character is at the end of the input
  const isAtEnd_ = isAtEnd(string, index);
  const isWhitespaceBefore = before.search(/\s$/) !== -1;
  const isWhitespaceAfter = after.search(/^\s/) !== -1;

  const isValueWithUnitAfter_ = isValueWithUnitAfter(after);
  const isValueWithUnitBefore_ = isValueWithUnitBefore(before);
  const isNumberAfter_ = isNumberAfter(after);
  const isNumberBefore_ = isNumberBefore(before);
  const isInterpolationAfter_ = isInterpolationAfter(after);
  const isParensAfter_ = isParensAfter(after);
  const isParensBefore_ = isParensBefore(before);
  // The early check above helps prevent deep recursion here
  const isPrecedingOperator_ = isPrecedingOperator(string, index);
  const isInsideFunctionCall_ = isInsideFunctionCall(string, index);

  if (isComparisonOperatorBefore(before)) {
    return "sign";
  }

  if (isAtStart_) {
    // console.log("-, -<sth> or - <sth>")
    return "sign";
  }

  // `10 -    11`
  if (!isAtEnd_ && !isAtStart_ && isWhitespaceBefore && isWhitespaceAfter) {
    // console.log("-, Op: 10px -  10px")
    return "op";
  }

  // e.g. `something -10px`
  if (!isAtEnd_ && !isAtStart_ && isWhitespaceBefore && !isWhitespaceAfter) {
    if (isParensAfter_.is && !isParensAfter_.opsBefore) {
      // console.log("-, Op: <sth> -(...)")
      return "op";
    }

    // e.g. `#{10px -1}`, `#{math.acos(-0.5)}`
    if (isInsideInterpolation(string, index)) {
      // e.g. `url(https://my-url.com/image-#{$i -2}-dark.svg)`
      if (isInsideFunctionCall_.fn === "url") {
        return "op";
      }

      /*
      e.g.
      $fooBar: #{color.scale(
        #000000,
        $lightness: -50%,
        $alpha: -50%
      )};
      */
      if (isInsideFunctionCall_.is) {
        return "sign";
      }

      // e.g. `#{$i * -10}px`
      if (isWhitespaceBefore && isNumberAfter_.is && isPrecedingOperator_) {
        return "sign";
      }

      return "op";
    }

    // e.g. `sth -1px`, `sth -1`.
    // Always a sign, even inside parens/function args
    if (
      (isValueWithUnitAfter_.is && !isValueWithUnitAfter_.opsBetween) ||
      (isNumberAfter_.is && !isNumberAfter_.opsBetween)
    ) {
      // console.log("-, sign: -1px or -1")
      return "sign";
    }

    // e.g. `sth --1`, `sth +-2px`
    if (
      (isValueWithUnitAfter_.is && isValueWithUnitAfter_.opsBetween) ||
      (isNumberAfter_.is && isNumberAfter_.opsBetween)
    ) {
      // console.log("-, op: --1px or --1")
      return "op";
    }

    // `<sth> -string`, `<sth> -#{...}`
    if (
      isStringAfter(after) ||
      (isInterpolationAfter_.is && !isInterpolationAfter_.opsBefore)
    ) {
      // console.log("-, char: -#{...}")
      return "char";
    }

    // e.g. `#0af -#f0a`, and edge-cases can take a hike
    if (isHexColorAfter(after) && isHexColorBefore(before.trim())) {
      // console.log("-, op: #fff-, -#fff")
      return "op";
    }

    if (after[0] === "$") {
      if (isPrecedingOperator_) {
        // console.log("-, sign: -$var, another operator before")
        return "sign";
      }

      // e.g. prop: -$margin-offset;
      if (isAtStart_) {
        return "sign";
      }

      // If the - is before a variable, then it's most likely an operator
      // console.log("-, op: -$var, NO other operator before")
      return "op";
    }

    // By default let's make it an sign for now
    // console.log('-, sign: default in <sth> -<sth>')
    return "sign";
  }

  // No whitespace before,
  // e.g. `10x- something`
  if (!isAtEnd_ && !isAtStart_ && !isWhitespaceBefore && isWhitespaceAfter) {
    if (isParensBefore_) {
      // console.log('-, op: `(...)- <sth>`')
      return "op";
    }

    // e.g. `#{10px- 1}`
    if (isInsideInterpolation(string, index)) {
      return "op";
    }

    if (isNumberBefore(before) || isHexColorBefore(before)) {
      // console.log('`-, op: 10- <sth>, #aff- <sth>`')
      return "op";
    }

    // console.log('-, char: default in <sth>- <sth>')
    return "char";
  }

  // NO Whitespace,
  // e.g. `10px-1`
  if (!isAtEnd_ && !isAtStart_ && !isWhitespaceBefore && !isWhitespaceAfter) {
    // console.log('no spaces')
    // `<something>-1`, `<something>-10px`
    if (
      (isValueWithUnitAfter_.is && !isValueWithUnitAfter_.opsBetween) ||
      (isNumberAfter_.is && !isNumberAfter_.opsBetween)
    ) {
      // `10px-1`, `1-10px`, `1-1`, `1x-1x`
      if (isValueWithUnitBefore_ || isNumberBefore_) {
        // console.log("-, op: 1-10px")
        return "op";
      }

      // The - could be a "sign" here, but for now "char" does the job
    }

    // `1-$var`
    if (isNumberBefore_ && after[0] === "$") {
      // console.log("-, op: 1-$var")
      return "op";
    }

    // `fn()-10px`
    if (
      isFunctionBefore(before) &&
      ((isNumberAfter_.is && !isNumberAfter_.opsBetween) ||
        (isValueWithUnitAfter_.is && !isValueWithUnitAfter_.opsBetween))
    ) {
      // console.log("-, op: fn()-10px")
      return "op";
    }
  }

  // And in all the other cases it's a character inside a string
  // console.log("-, default: char")
  return "char";
}

/**
 * Checks the specified `/` character: operator, sign (+ or -), part of string
 *
 * @param {String} string - the source string
 * @param {Number} index - the index of the character in string to check
 * @param {Boolean} isAfterColon - if the value string a variable
 *    value, a mixin/function parameter default. In such cases / is always an
 *    operator if surrounded by numbers/values with units
 * @return {String|false}
 *    • "op", if the character is a operator in a math/string operation
 *    • "char" if it gets compiled as-is, e.g. `font: 10px/1.2;`,
 *    • false - if it is none from above (most likely an error)
 */
function checkSlash(string, index, isAfterColon) {
  // Trimming these, as spaces before/after a slash don't matter
  const before = string.substring(0, index).trim();
  const after = string.substring(index + 1).trim();

  const isValueWithUnitAfter_ = isValueWithUnitAfter(after);
  const isValueWithUnitBefore_ = isValueWithUnitBefore(before);
  const isNumberAfter_ = isNumberAfter(after);
  const isNumberBefore_ = isNumberBefore(before);
  const isParensAfter_ = isParensAfter(after);
  const isParensBefore_ = isParensBefore(before);

  // FIRST OFF. Interpolation on any of the sides is a NO-GO for division op
  if (isInterpolationBefore(before).is || isInterpolationAfter(after).is) {
    // console.log("/, interpolation")
    return "char";
  }

  // having a dot before probably means a relative path.
  // e.g. url(../../image.png)
  if (isDotBefore(before)) {
    return "char";
  }

  // e.g. `(1px/1)`, `fn(7 / 15)`, but not `url(8/11)`
  const isInsideFn = isInsideFunctionCall(string, index);

  if (isInsideFn.is && isInsideFn.fn === "url") {
    // e.g. `url(https://my-url.com/image-#{$i /2}-dark.svg)`
    if (isInsideInterpolation(string, index)) {
      return "op";
    }
    return "char";
  }

  // e.g. `10px/normal`
  if (isStringBefore(before).is || isStringAfter(after)) {
    // console.log("/, string")
    return "char";
  }

  // For all other value options (numbers, value+unit, hex color)

  // `$var/1`, `#fff/-$var`
  // Here we don't care if there is a sign before the var
  if (isVariableBefore(before) || isVariableAfter(after).is) {
    // console.log("/, variable")
    return "op";
  }

  if (isFunctionBefore(before) || isFunctionAfter(after).is) {
    // console.log("/, function as operand")
    return "op";
  }

  if (isParensBefore_ || isParensAfter_.is) {
    // console.log("/, function as operand")
    return "op";
  }

  // `$var: 10px/2; // 5px`
  if (
    isAfterColon === true &&
    (isValueWithUnitAfter_.is || isNumberAfter_.is) &&
    (isValueWithUnitBefore_ || isNumberBefore_)
  ) {
    return "op";
  }

  // Quick check of the following operator symbol - if it is a math operator
  if (
    // +, *, % count as operators unless after interpolation or at the start
    before.search(/[^{,(}\s]\s*[+*%][^(){},]+$/) !== -1 ||
    // We consider minus as op only if surrounded by whitespaces (` - `);
    before.search(/[^{,(}\s]\s+-\s[^(){},]+$/) !== -1 ||
    // `10/2 * 3`, `10/2 % 3`, with or without spaces
    after.search(/^[^(){},]+[*%]/) !== -1 ||
    // `10px/2px+1`, `10px/2px+ 1`
    after.search(/^[^(){},\s]+\+/) !== -1 ||
    // Anything but `10px/2px +1`, `10px/2px +1px`
    after.search(/^[^(){},\s]+\s+(\+\D)/) !== -1 ||
    // Following ` -`: only if `$var` after (`10/10 -$var`)
    after.search(/^[^(){},\s]+\s+-(\$|\s)/) !== -1 ||
    // Following `-`: only if number after (`10s/10s-10`, `10s/10s-.1`)
    after.search(/^[^(){},\s]+-(\.)?\d/) !== -1 ||
    // Or if there is a number before anything but string after (not `10s/1-str`,)
    after.search(/^(\d*\.)?\d+-\s*[^#a-zA-Z_\s]/) !== -1
  ) {
    // console.log("/, math op around")
    return "op";
  }

  if (
    isInsideParens(string, index) ||
    (isInsideFn.is && isInsideFn.fn !== "url")
  ) {
    // console.log("/, parens or function arg")
    return "op";
  }

  // console.log("/, default")
  return "char";
}

/**
 * Checks the specified `%` character: operator or part of value
 *
 * @param {String} string - the source string
 * @param {Number} index - the index of the character in string to check
 * @return {String|false}
 *    • "op", if the character is a operator in a math/string operation
 *    • "char" if it gets compiled as-is, e.g. `width: 10%`,
 *    • false - if it is none from above (most likely an error)
 */
function checkPercent(string, index) {
  // Trimming these, as spaces before/after a slash don't matter
  const before = string.substring(0, index);
  const after = string.substring(index + 1);

  // If the character is at the beginning of the input
  const isAtStart_ = isAtStart(string, index);
  // If the character is at the end of the input
  const isAtEnd_ = isAtEnd(string, index);
  const isWhitespaceBefore = before.search(/\s$/) !== -1;
  const isWhitespaceAfter = after.search(/^\s/) !== -1;

  const isParensBefore_ = isParensBefore(before);

  // FIRST OFF. Interpolation on any of the sides is a NO-GO
  if (
    isInterpolationBefore(before.trim()).is ||
    isInterpolationAfter(after.trim()).is
  ) {
    // console.log("%, interpolation")
    return "char";
  }

  if (isAtStart_ || isAtEnd_) {
    // console.log("%, start/end")
    return "char";
  }

  // In `<sth> %<sth>` it's most likely an operator (except for interpolation
  // checked above)
  if (isWhitespaceBefore && !isWhitespaceAfter) {
    // console.log("%, `<sth> %<sth>`")
    return "op";
  }

  // `$var% 1`, `$var%1`, `$var%-1`
  if (isVariableBefore(before) || isParensBefore_) {
    // console.log("%, after a variable, function or parens")
    return "op";
  }

  // in all other cases in `<sth>% <sth>` it is most likely a unit
  if (!isWhitespaceBefore && isWhitespaceAfter) {
    // console.log("%, `<sth>% <sth>`")
    return "char";
  }

  // console.log("%, default")
  return "char";
}

// --------------------------------------------------------------------------
// Lots of elementary helpers
// --------------------------------------------------------------------------

function isAtStart(string, index) {
  const before = string.substring(0, index).trim();

  return before.length === 0 || before.search(/[({,]$/) !== -1;
}

function isAtEnd(string, index) {
  const after = string.substring(index + 1).trim();

  return after.length === 0 || after.search(/^[,)}]/) !== -1;
}

function isInsideParens(string, index) {
  const before = string.substring(0, index).trim();
  const after = string.substring(index + 1).trim();

  return (
    before.search(/(?:^|[,{\s])\([^(){},]+$/) !== -1 &&
    after.search(/^[^(){},\s]+\s*\)/) !== -1
  );
}

function isInsideInterpolation(string, index) {
  const before = string.substring(0, index).trim();

  return before.search(/#{[^}]*$/) !== -1;
}

/**
 * Checks if the character is inside a function arguments
 *
 * @param {String} string - the input string
 * @param {Number} index - current character index
 * @return {Object} return
 *    {Boolean} return.is - if inside a function arguments
 *    {String} return.fn - function name
 */
function isInsideFunctionCall(string, index) {
  const result = { is: false, fn: null };
  const before = string.substring(0, index).trim();
  const after = string.substring(index + 1).trim();
  const beforeMatch = before.match(
    /(?:[a-zA-Z_-][\w-]*\()?(:?[a-zA-Z_-][\w-]*)\(/
  );

  if (beforeMatch && beforeMatch[0] && after.search(/^[^(]+\)/g) !== -1) {
    result.is = true;
    result.fn = beforeMatch[1];
  }

  return result;
}

/**
 * Checks if there is a string before the character.
 * Also checks if there is a math operator in between
 *
 * @param {String} before - the input string that preceses the character
 * @return {Object} return
 *    {Boolean} return.is - if there is a string
 *    {String} return.opsBetween - if there are operators in between
 */
function isStringBefore(before) {
  const result = { is: false, opsBetween: false };
  const stringOpsClipped = before.replace(/(\s*[+/*%]|\s+-)+$/, "");

  if (stringOpsClipped !== before) {
    result.opsBetween = true;
  }

  // If it is quoted
  if (
    stringOpsClipped[stringOpsClipped.length - 1] === '"' ||
    stringOpsClipped[stringOpsClipped.length - 1] === "'"
  ) {
    result.is = true;
  } else if (
    stringOpsClipped.search(
      /(?:^|[/(){},: ])([a-zA-Z_][\w-]*|-+[a-zA-Z_][\w-]*)$/
    ) !== -1
  ) {
    // First pattern: a1, a1a, a-1,
    result.is = true;
  }

  return result;
}

function isStringAfter(after) {
  const stringTrimmed = after.trim();

  // If it is quoted
  if (stringTrimmed[0] === '"' || stringTrimmed[0] === "'") return true;

  // e.g. `a1`, `a1a`, `a-1`, and even `--s323`
  return (
    stringTrimmed.search(/^([a-zA-Z_][\w-]*|-+[a-zA-Z_][\w-]*)(?:$|[)}, ])/) !==
    -1
  );
}

function isInterpolationAfter(after) {
  const result = { is: false, opsBetween: false };
  const matches = after.match(/^\s*([+/*%-]\s*)*#{/);

  if (matches) {
    if (matches[0]) {
      result.is = true;
    }

    if (matches[1]) {
      result.opsBetween = true;
    }
  }

  return result;
}

function isParensAfter(after) {
  const result = { is: false, opsBetween: false };
  const matches = after.match(/^\s*([+/*%-]\s*)*\(/);

  if (matches) {
    if (matches[0]) {
      result.is = true;
    }

    if (matches[1]) {
      result.opsBetween = true;
    }
  }

  return result;
}

function isParensBefore(before) {
  return before.search(/\)\s*$/) !== -1;
}

/**
 * Checks if there is an interpolation before the character.
 * Also checks if there is a math operator in between
 *
 * @param {String} before - the input string that preceses the character
 * @return {Object} return
 *    {Boolean} return.is - if there is an interpolation
 *    {String} return.opsBetween - if there are operators in between
 */
function isInterpolationBefore(before) {
  const result = { is: false, opsBetween: false };
  // Removing preceding operators if any
  const beforeOpsClipped = before.replace(/(\s*[+/*%-])+$/, "");

  if (beforeOpsClipped !== before) {
    result.opsBetween = true;
  }

  if (beforeOpsClipped[beforeOpsClipped.length - 1] === "}") {
    result.is = true;
  }

  return result;
}

function isValueWithUnitBefore(before) {
  // 1px, 0.1p-x, .2p-, 11.2pdf-df1df_
  // Surprisingly, ` d.10px` - .10px is separated from a sequence
  // and is considered a value with a unit
  return before.trim().search(/(^|[/(, .])\d[\w-]+$/) !== -1;
}

function isValueWithUnitAfter(after) {
  const result = { is: false, opsBetween: false };
  // 1px, 0.1p-x, .2p-, 11.2pdf-dfd1f_
  // Again, ` d.10px` - .10px is separated from a sequence
  // and is considered a value with a unit
  const matches = after.match(
    /^\s*([+/*%-]\s*)*(\d+(\.\d+)?|\.\d+)[\w-%]+(?:$|[)}, ])/
  );

  if (matches) {
    if (matches[0]) {
      result.is = true;
    }

    if (matches[1]) {
      result.opsBetween = true;
    }
  }

  return result;
}

function isNumberAfter(after) {
  const result = { is: false, opsBetween: false };
  const matches = after.match(
    /^\s*([+/*%-]\s*)*(\d+(\.\d+)?|\.\d+)(?:$|[)}, ])/
  );

  if (matches) {
    if (matches[0]) {
      result.is = true;
    }

    if (matches[1]) {
      result.opsBetween = true;
    }
  }

  return result;
}

function isNumberBefore(before) {
  return before.trim().search(/(?:^|[/(){},\s])(\d+(\.\d+)?|\.\d+)$/) !== -1;
}

function isVariableBefore(before) {
  return before.trim().search(/\$[\w-]+$/) !== -1;
}

function isVariableAfter(after) {
  const result = { is: false, opsBetween: false };
  const matches = after.match(/^\s*([+/*%-]\s*)*\$/);

  if (matches) {
    if (matches[0]) {
      result.is = true;
    }

    if (matches[1]) {
      result.opsBetween = true;
    }
  }

  return result;
}

function isDotBefore(before) {
  return before.slice(-1) === ".";
}

function isFunctionBefore(before) {
  return before.trim().search(/[\w-]\(.*?\)\s*$/) !== -1;
}

function isFunctionAfter(after) {
  const result = { is: false, opsBetween: false };
  // `-fn()` is a valid function name, so if a - should be a sign/operator,
  // it must have a space after
  const matches = after.match(/^\s*(-\s+|[+/*%]\s*)*[a-zA-Z_-][\w-]*\(/);

  if (matches) {
    if (matches[0]) {
      result.is = true;
    }

    if (matches[1]) {
      result.opsBetween = true;
    }
  }

  return result;
}

function isComparisonOperatorBefore(before) {
  return before.search(/([><=!]=|[<>])\s+$/) !== -1;
}

/**
 * Checks if the input string is a hex color value
 *
 * @param {String} string - the input
 * @return {Boolean} true, if the input is a hex color
 */
function isHexColor(string) {
  return string.trim().search(/^#([\da-fA-F]{3}|[\da-fA-F]{6})$/) !== -1;
}

function isHexColorAfter(after) {
  const afterTrimmed = after.match(/(.*?)(?:[)},+/*%\-\s]|$)/)[1].trim();

  return isHexColor(afterTrimmed);
}

function isHexColorBefore(before) {
  return (
    before.search(/(?:[/(){},+*%-\s]|^)#([\da-fA-F]{3}|[\da-fA-F]{6})$/) !== -1
  );
}

/**
 * Checks if there is no operand before the current char
 * In other words, the current char is at the start of a possible operation,
 * e.g. at the string start, after the opening paren or after a comma
 *
 * @param {String} string - the input string
 * @param {Number} index - current char's position in string
 * @return {Boolean}
 */
function isNoOperandBefore(string, index) {
  const before = string.substring(0, index).trim();

  return before.length === 0 || before.search(/[({,]&/) !== -1;
}

function isPrecedingOperator(string, index) {
  let prevCharIndex = -1;

  for (let i = index - 1; i >= 0; i--) {
    if (string[i].search(/\s/) === -1) {
      prevCharIndex = i;
      break;
    }
  }

  if (prevCharIndex === -1) {
    return false;
  }

  if (mathOperatorCharType(string, prevCharIndex) === "op") {
    return true;
  }

  return false;
}

module.exports.mathOperatorCharType = mathOperatorCharType;
module.exports.isInsideFunctionCall = isInsideFunctionCall;
