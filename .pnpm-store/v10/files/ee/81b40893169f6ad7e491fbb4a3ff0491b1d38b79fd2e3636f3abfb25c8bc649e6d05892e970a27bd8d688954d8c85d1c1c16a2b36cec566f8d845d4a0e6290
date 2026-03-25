"use strict";

const mediaQueryParser = require("postcss-media-query-parser").default;
const { utils } = require("stylelint");
const atRuleParamIndex = require("../../utils/atRuleParamIndex");
const declarationValueIndex = require("../../utils/declarationValueIndex");
const eachRoot = require("../../utils/eachRoot");
const findCommentsInRaws = require("../../utils/findCommentsInRaws");
const findOperators = require("../../utils/sassValueParser");
const isWhitespace = require("../../utils/isWhitespace");
const namespace = require("../../utils/namespace");
const ruleUrl = require("../../utils/ruleUrl");

const ruleName = namespace("operator-no-unspaced");

const messages = utils.ruleMessages(ruleName, {
  expectedAfter: operator => `Expected single space after "${operator}"`,
  expectedBefore: operator => `Expected single space before "${operator}"`
});

const meta = {
  url: ruleUrl(ruleName)
};

/**
 * The actual check for are there (un)necessary whitespaces
 */
function checkSpaces({
  string,
  globalIndex,
  startIndex,
  endIndex,
  node,
  result
}) {
  const symbol = string.substring(startIndex, endIndex + 1);

  const beforeOk =
    (string[startIndex - 1] === " " && !isWhitespace(string[startIndex - 2])) ||
    newlineBefore(string, startIndex - 1);

  if (!beforeOk) {
    const index = globalIndex + startIndex;
    utils.report({
      ruleName,
      result,
      node,
      message: messages.expectedBefore(symbol),
      index,
      endIndex: index + symbol.length
    });
  }

  const afterOk =
    (string[endIndex + 1] === " " && !isWhitespace(string[endIndex + 2])) ||
    string[endIndex + 1] === "\n" ||
    string.substr(endIndex + 1, 2) === "\r\n";

  if (!afterOk) {
    const index = globalIndex + startIndex;
    utils.report({
      ruleName,
      result,
      node,
      message: messages.expectedAfter(symbol),
      index,
      endIndex: index + symbol.length
    });
  }
}

function newlineBefore(str, startIndex) {
  let index = startIndex;

  while (index && isWhitespace(str[index])) {
    if (str[index] === "\n") return true;

    index--;
  }

  return false;
}

function rule(expectation) {
  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: expectation
    });

    if (!validOptions) {
      return;
    }

    eachRoot(root, checkRoot);

    function checkRoot(root) {
      const rootString = root.source.input.css;

      if (rootString.trim() === "") {
        return;
      }

      calculationOperatorSpaceChecker({
        root,
        result,
        checker: checkSpaces
      });
    }
  };
}

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

/**
 * The core rule logic function. This one can be imported by some other rules
 * that work with Sass operators
 *
 * @param {Object} args -- Named arguments object
 * @param {PostCSS Root} args.root
 * @param {PostCSS Result} args.result
 * @param {function} args.checker -- the function that is run against all the
 *    operators found in the input. Takes these arguments:
 *    {Object} cbArgs -- Named arguments object
 *    {string} cbArgs.string -- the input string (suspected operation)
 *    {number} cbArgs.globalIndex -- the string's index in a global input
 *    {number} cbArgs.startIndex -- the start index of a symbol to inspect
 *    {number} cbArgs.endIndex -- the end index of a symbol to inspect
 *      (two indexes needed to allow for `==`, `!=`, etc.)
 *    {PostCSS Node} cbArgs.node -- for stylelint.utils.report
 *    {PostCSS Result} cbArgs.result -- for stylelint.utils.report
 */
function calculationOperatorSpaceChecker({ root, result, checker }) {
  /**
   * Takes a string, finds all occurrences of Sass interpolation in it, then
   * finds all operators inside that interpolation
   *
   * @return {array} An array of objects { string, operators } - effectively,
   *    a list of operators for each Sass interpolation occurrence
   */
  function findInterpolation(string, startIndex) {
    const interpolationRegex = /#{(.*?)}/g;
    const results = [];
    // Searching for interpolation
    let match = interpolationRegex.exec(string);

    startIndex = !isNaN(startIndex) ? Number(startIndex) : 0;
    while (match !== null) {
      results.push({
        source: match[0],
        operators: findOperators({
          string: match[0],
          globalIndex: match.index + startIndex
        })
      });
      match = interpolationRegex.exec(string);
    }

    return results;
  }

  const dataURIRegex = /url\(\s*['"]?data:.+['"]?\s*\)/;

  root.walk(item => {
    if (item.prop === "unicode-range") {
      return;
    }

    let results = [];

    // Check a value (`10px` in `width: 10px;`)
    if (item.value !== undefined) {
      if (dataURIRegex.test(item.value)) {
        return results;
      }
      results.push({
        source: item.value,
        operators: findOperators({
          string: item.value,
          globalIndex: declarationValueIndex(item),
          // For Sass variable values some special rules apply
          isAfterColon: item.prop[0] === "$"
        })
      });
    }

    // Property name
    if (item.prop !== undefined) {
      results = results.concat(findInterpolation(item.prop));
    }

    // Selector
    if (item.selector !== undefined) {
      results = results.concat(findInterpolation(item.selector));
    }

    if (item.type === "atrule") {
      // @forward, @use, @at-root, and @scope
      if (
        item.name === "forward" ||
        item.name === "use" ||
        item.name === "at-root" ||
        item.name === "scope"
      ) {
        return;
      }

      // Tailwind-specific at-rules (Directives)
      // https://tailwindcss.com/docs/functions-and-directives#directives
      if (
        item.name === "apply" ||
        item.name === "custom-variant" ||
        item.name === "reference" ||
        item.name === "source" ||
        item.name === "theme" ||
        item.name === "utility" ||
        item.name === "variant"
      ) {
        return;
      }

      // Media queries
      if (item.name === "media" || item.name === "import") {
        mediaQueryParser(item.params).walk(node => {
          const type = node.type;

          if (["keyword", "media-type", "media-feature"].includes(type)) {
            results = results.concat(
              findInterpolation(
                node.value,
                atRuleParamIndex(item) + node.sourceIndex
              )
            );
          } else if (type === "value") {
            results.push({
              source: node.value,
              operators: findOperators({
                string: node.value,
                globalIndex: atRuleParamIndex(item) + node.sourceIndex,
                isAfterColon: true
              })
            });
          } else if (type === "url") {
            const isQuoted = node.value[0] === '"' || node.value[0] === "'";
            const containsWhitespace = node.value.search(/\s/) > -1;

            if (isQuoted || containsWhitespace) {
              // The argument to the url function is only parsed as SassScript if it is a quoted
              // string, or a _valid_ unquoted URL [1].
              //
              // [1] https://sass-lang.com/documentation/syntax/special-functions#url
              results.push({
                source: node.value,
                operators: findOperators({
                  string: node.value,
                  globalIndex: atRuleParamIndex(item) + node.sourceIndex,
                  isAfterColon: true
                })
              });
            }
          }
        });
      } else {
        // Function and mixin definitions and other rules
        results.push({
          source: item.params,
          operators: findOperators({
            string: item.params,
            globalIndex: atRuleParamIndex(item),
            isAfterColon: true
          })
        });
      }
    }

    // All the strings have been parsed, now run whitespace checking
    results.forEach(el => {
      // Only if there are operators within a string
      if (el.operators && el.operators.length > 0) {
        el.operators.forEach(operator => {
          checker({
            string: el.source,
            globalIndex: operator.globalIndex,
            startIndex: operator.startIndex,
            endIndex: operator.endIndex,
            node: item,
            result
          });
        });
      }
    });
  });

  // Checking interpolation inside comments
  // We have to give up on PostCSS here because it skips some inline comments
  findCommentsInRaws(root.source.input.css).forEach(comment => {
    const startIndex =
      comment.source.start +
      comment.raws.startToken.length +
      comment.raws.left.length;

    if (comment.type !== "css") {
      return;
    }

    findInterpolation(comment.text).forEach(el => {
      // Only if there are operators within a string
      if (el.operators && el.operators.length > 0) {
        el.operators.forEach(operator => {
          checker({
            string: el.source,
            globalIndex: operator.globalIndex + startIndex,
            startIndex: operator.startIndex,
            endIndex: operator.endIndex,
            node: root,
            result
          });
        });
      }
    });
  });
}

rule.calculationOperatorSpaceChecker = calculationOperatorSpaceChecker;

module.exports = rule;
