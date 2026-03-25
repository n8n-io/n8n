"use strict";

const configurationError = require("./configurationError");
const isSingleLineString = require("./isSingleLineString");
const isWhitespace = require("./isWhitespace");

/**
 * Create a whitespaceChecker, which exposes the following functions:
 * - `before()`
 * - `beforeAllowingIndentation()`
 * - `after()`
 * - `afterOneOnly()`
 *
 * @param {"space"|"newline"} targetWhitespace - This is a keyword instead
 *   of the actual character (e.g. " ") in order to accommodate
 *   different styles of newline ("\n" vs "\r\n")
 * @param {
 *     "always"|"never"
 *     |"always-single-line"|"always-multi-line"
 *     | "never-single-line"|"never-multi-line"
 *   } expectation
 * @param {object} messages - An object of message functions;
 *   calling `before*()` or `after*()` and the `expectation` that is passed
 *   determines which message functions are required
 * @param {function} [messages.expectedBefore]
 * @param {function} [messages.rejectedBefore]
 * @param {function} [messages.expectedAfter]
 * @param {function} [messages.rejectedAfter]
 * @param {function} [messages.expectedBeforeSingleLine]
 * @param {function} [messages.rejectedBeforeSingleLine]
 * @param {function} [messages.expectedBeforeMultiLine]
 * @param {function} [messages.rejectedBeforeMultiLine]
 * @return {object} The checker, with its exposed checking functions
 */
module.exports = function (targetWhitespace, expectation, messages) {
  // Keep track of active arguments in order to avoid passing
  // too much stuff around, making signatures long and confusing.
  // This variable gets reset anytime a checking function is called.
  let activeArgs;

  /**
   * Check for whitespace *before* a character.
   *
   * @param {object} args - Named arguments object
   * @param {string} args.source - The source string
   * @param {number} args.index - The index of the character to check before
   * @param {function} args.err - If a violation is found, this callback
   *   will be invoked with the relevant warning message.
   *   Typically this callback will report() the violation.
   * @param {function} args.errTarget - If a violation is found, this string
   *   will be sent to the relevant warning message.
   * @param {string} [args.lineCheckStr] - Single- and multi-line checkers
   *   will use this string to determine whether they should proceed,
   *   i.e. if this string is one line only, single-line checkers will check,
   *   multi-line checkers will ignore.
   *   If none is passed, they will use `source`.
   * @param {boolean} [args.onlyOneChar=false] - Only check *one* character before.
   *   By default, "always-*" checks will look for the `targetWhitespace` one
   *   before and then ensure there is no whitespace two before. This option
   *   bypasses that second check.
   * @param {boolean} [args.allowIndentation=false] - Allow arbitrary indentation
   *   between the `targetWhitespace` (almost definitely a newline) and the `index`.
   *   With this option, the checker will see if a newline *begins* the whitespace before
   *   the `index`.
   */
  function before({
    source,
    index,
    err,
    errTarget,
    lineCheckStr,
    onlyOneChar = false,
    allowIndentation = false
  }) {
    activeArgs = {
      source,
      index,
      err,
      errTarget,
      onlyOneChar,
      allowIndentation
    };

    switch (expectation) {
      case "always":
        expectBefore();
        break;
      case "never":
        rejectBefore();
        break;
      case "always-single-line":
        if (!isSingleLineString(lineCheckStr || source)) {
          return;
        }

        expectBefore(messages.expectedBeforeSingleLine);
        break;
      case "never-single-line":
        if (!isSingleLineString(lineCheckStr || source)) {
          return;
        }

        rejectBefore(messages.rejectedBeforeSingleLine);
        break;
      case "always-multi-line":
        if (isSingleLineString(lineCheckStr || source)) {
          return;
        }

        expectBefore(messages.expectedBeforeMultiLine);
        break;
      case "never-multi-line":
        if (isSingleLineString(lineCheckStr || source)) {
          return;
        }

        rejectBefore(messages.rejectedBeforeMultiLine);
        break;
      default:
        throw configurationError(`Unknown expectation "${expectation}"`);
    }
  }

  /**
   * Check for whitespace *after* a character.
   *
   * Parameters are pretty much the same as for `before()`, above, just substitute
   * the word "after" for "before".
   */
  function after({
    source,
    index,
    err,
    errTarget,
    lineCheckStr,
    onlyOneChar = false
  }) {
    activeArgs = { source, index, err, errTarget, onlyOneChar };

    switch (expectation) {
      case "always":
        expectAfter();
        break;
      case "never":
        rejectAfter();
        break;
      case "always-single-line":
        if (!isSingleLineString(lineCheckStr || source)) {
          return;
        }

        expectAfter(messages.expectedAfterSingleLine);
        break;
      case "never-single-line":
        if (!isSingleLineString(lineCheckStr || source)) {
          return;
        }

        rejectAfter(messages.rejectedAfterSingleLine);
        break;
      case "always-multi-line":
        if (isSingleLineString(lineCheckStr || source)) {
          return;
        }

        expectAfter(messages.expectedAfterMultiLine);
        break;
      case "never-multi-line":
        if (isSingleLineString(lineCheckStr || source)) {
          return;
        }

        rejectAfter(messages.rejectedAfterMultiLine);
        break;
      case "at-least-one-space":
        expectAfter(messages.expectedAfterAtLeast);
        break;
      default:
        throw configurationError(`Unknown expectation "${expectation}"`);
    }
  }

  function beforeAllowingIndentation(obj) {
    before(Object.assign({}, obj, { allowIndentation: true }));
  }

  function expectBefore(messageFunc = messages.expectedBefore) {
    if (activeArgs.allowIndentation) {
      expectBeforeAllowingIndentation(messageFunc);

      return;
    }

    const { source, index } = activeArgs;
    const oneCharBefore = source[index - 1];
    const twoCharsBefore = source[index - 2];

    if (!isValue(oneCharBefore)) {
      return;
    }

    if (targetWhitespace === "newline") {
      // If index is preceeded by a Windows CR-LF ...
      if (oneCharBefore === "\n" && twoCharsBefore === "\r") {
        if (activeArgs.onlyOneChar || !isWhitespace(source[index - 3])) {
          return;
        }
      }

      // If index is followed by a Unix LF ...
      if (oneCharBefore === "\n" && twoCharsBefore !== "\r") {
        if (activeArgs.onlyOneChar || !isWhitespace(twoCharsBefore)) {
          return;
        }
      }
    }

    if (targetWhitespace === "space" && oneCharBefore === " ") {
      if (activeArgs.onlyOneChar || !isWhitespace(twoCharsBefore)) {
        return;
      }
    }

    activeArgs.err(
      messageFunc(activeArgs.errTarget ? activeArgs.errTarget : source[index])
    );
  }

  function expectBeforeAllowingIndentation(
    messageFunc = messages.expectedBefore
  ) {
    const { source, index, err } = activeArgs;
    const expectedChar = (() => {
      if (targetWhitespace === "newline") {
        return "\n";
      }

      if (targetWhitespace === "space") {
        return " ";
      }
    })();
    let i = index - 1;

    while (source[i] !== expectedChar) {
      if (source[i] === "\t" || source[i] === " ") {
        i--;
        continue;
      }

      err(
        messageFunc(activeArgs.errTarget ? activeArgs.errTarget : source[index])
      );

      return;
    }
  }

  function rejectBefore(messageFunc = messages.rejectedBefore) {
    const { source, index } = activeArgs;
    const oneCharBefore = source[index - 1];

    if (isValue(oneCharBefore) && isWhitespace(oneCharBefore)) {
      activeArgs.err(
        messageFunc(activeArgs.errTarget ? activeArgs.errTarget : source[index])
      );
    }
  }

  function afterOneOnly(obj) {
    after(Object.assign({}, obj, { onlyOneChar: true }));
  }

  function expectAfter(messageFunc = messages.expectedAfter) {
    const { source, index } = activeArgs;

    const oneCharAfter = index + 1 < source.length ? source[index + 1] : "";
    const twoCharsAfter = index + 2 < source.length ? source[index + 2] : "";

    if (!isValue(oneCharAfter)) {
      return;
    }

    if (targetWhitespace === "newline") {
      // If index is followed by a Windows CR-LF ...
      if (oneCharAfter === "\r" && twoCharsAfter === "\n") {
        const threeCharsAfter =
          index + 3 < source.length ? source[index + 3] : "";

        if (activeArgs.onlyOneChar || !isWhitespace(threeCharsAfter)) {
          return;
        }
      }

      // If index is followed by a Unix LF ...
      if (oneCharAfter === "\n") {
        if (activeArgs.onlyOneChar || !isWhitespace(twoCharsAfter)) {
          return;
        }
      }
    }

    if (targetWhitespace === "space" && oneCharAfter === " ") {
      if (
        expectation === "at-least-one-space" ||
        activeArgs.onlyOneChar ||
        !isWhitespace(twoCharsAfter)
      ) {
        return;
      }
    }

    activeArgs.err(
      messageFunc(activeArgs.errTarget ? activeArgs.errTarget : source[index])
    );
  }

  function rejectAfter(messageFunc = messages.rejectedAfter) {
    const { source, index } = activeArgs;
    const oneCharAfter = index + 1 < source.length ? source[index + 1] : "";

    if (isValue(oneCharAfter) && isWhitespace(oneCharAfter)) {
      activeArgs.err(
        messageFunc(activeArgs.errTarget ? activeArgs.errTarget : source[index])
      );
    }
  }

  return {
    before,
    beforeAllowingIndentation,
    after,
    afterOneOnly
  };
};

function isValue(x) {
  return x !== undefined && x !== null;
}
