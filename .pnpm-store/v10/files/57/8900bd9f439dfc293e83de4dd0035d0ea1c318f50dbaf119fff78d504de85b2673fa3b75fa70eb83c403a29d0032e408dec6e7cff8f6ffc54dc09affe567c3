import { c as createRule, x as getTokenBeforeClosingBracket, i as isSingleLine } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const messages = {
  selfCloseSlashNoSpace: "Whitespace is forbidden between `/` and `>`; write `/>`",
  selfCloseSlashNeedSpace: "Whitespace is required between `/` and `>`; write `/ >`",
  closeSlashNoSpace: "Whitespace is forbidden between `<` and `/`; write `</`",
  closeSlashNeedSpace: "Whitespace is required between `<` and `/`; write `< /`",
  beforeSelfCloseNoSpace: "A space is forbidden before closing bracket",
  beforeSelfCloseNeedSpace: "A space is required before closing bracket",
  beforeSelfCloseNeedNewline: "A newline is required before closing bracket",
  afterOpenNoSpace: "A space is forbidden after opening bracket",
  afterOpenNeedSpace: "A space is required after opening bracket",
  beforeCloseNoSpace: "A space is forbidden before closing bracket",
  beforeCloseNeedSpace: "Whitespace is required before closing bracket",
  beforeCloseNeedNewline: "A newline is required before closing bracket"
};
function validateClosingSlash(context, node, option) {
  const sourceCode = context.sourceCode;
  let adjacent;
  if ("selfClosing" in node && node.selfClosing) {
    const lastTokens = sourceCode.getLastTokens(node, 2);
    adjacent = !sourceCode.isSpaceBetween(lastTokens[0], lastTokens[1]);
    if (option === "never") {
      if (!adjacent) {
        context.report({
          node,
          messageId: "selfCloseSlashNoSpace",
          loc: {
            start: lastTokens[0].loc.start,
            end: lastTokens[1].loc.end
          },
          fix(fixer) {
            return fixer.removeRange([lastTokens[0].range[1], lastTokens[1].range[0]]);
          }
        });
      }
    } else if (option === "always" && adjacent) {
      context.report({
        node,
        messageId: "selfCloseSlashNeedSpace",
        loc: {
          start: lastTokens[0].loc.start,
          end: lastTokens[1].loc.end
        },
        fix(fixer) {
          return fixer.insertTextBefore(lastTokens[1], " ");
        }
      });
    }
  } else {
    const firstTokens = sourceCode.getFirstTokens(node, 2);
    adjacent = !sourceCode.isSpaceBetween(firstTokens[0], firstTokens[1]);
    if (option === "never") {
      if (!adjacent) {
        context.report({
          node,
          messageId: "closeSlashNoSpace",
          loc: {
            start: firstTokens[0].loc.start,
            end: firstTokens[1].loc.end
          },
          fix(fixer) {
            return fixer.removeRange([firstTokens[0].range[1], firstTokens[1].range[0]]);
          }
        });
      }
    } else if (option === "always" && adjacent) {
      context.report({
        node,
        messageId: "closeSlashNeedSpace",
        loc: {
          start: firstTokens[0].loc.start,
          end: firstTokens[1].loc.end
        },
        fix(fixer) {
          return fixer.insertTextBefore(firstTokens[1], " ");
        }
      });
    }
  }
}
function validateBeforeSelfClosing(context, node, option) {
  const sourceCode = context.sourceCode;
  const leftToken = getTokenBeforeClosingBracket(node);
  const closingSlash = sourceCode.getTokenAfter(leftToken);
  if (!isSingleLine(node) && option === "proportional-always") {
    if (astUtilsExports.isTokenOnSameLine(leftToken, closingSlash)) {
      context.report({
        node,
        messageId: "beforeSelfCloseNeedNewline",
        loc: leftToken.loc.end,
        fix(fixer) {
          return fixer.insertTextBefore(closingSlash, "\n");
        }
      });
      return;
    }
  }
  if (!astUtilsExports.isTokenOnSameLine(leftToken, closingSlash))
    return;
  const adjacent = !sourceCode.isSpaceBetween(leftToken, closingSlash);
  if ((option === "always" || option === "proportional-always") && adjacent) {
    context.report({
      node,
      messageId: "beforeSelfCloseNeedSpace",
      loc: closingSlash.loc.start,
      fix(fixer) {
        return fixer.insertTextBefore(closingSlash, " ");
      }
    });
  } else if (option === "never" && !adjacent) {
    context.report({
      node,
      messageId: "beforeSelfCloseNoSpace",
      loc: closingSlash.loc.start,
      fix(fixer) {
        const previousToken = sourceCode.getTokenBefore(closingSlash);
        return fixer.removeRange([previousToken.range[1], closingSlash.range[0]]);
      }
    });
  }
}
function validateAfterOpening(context, node, option) {
  const sourceCode = context.sourceCode;
  const openingToken = sourceCode.getTokenBefore(node.name);
  if (option === "allow-multiline") {
    if (openingToken.loc.start.line !== node.name.loc.start.line)
      return;
  }
  const adjacent = !sourceCode.isSpaceBetween(openingToken, node.name);
  if (option === "never" || option === "allow-multiline") {
    if (!adjacent) {
      context.report({
        node,
        messageId: "afterOpenNoSpace",
        loc: {
          start: openingToken.loc.start,
          end: node.name.loc.start
        },
        fix(fixer) {
          return fixer.removeRange([openingToken.range[1], node.name.range[0]]);
        }
      });
    }
  } else if (option === "always" && adjacent) {
    context.report({
      node,
      messageId: "afterOpenNeedSpace",
      loc: {
        start: openingToken.loc.start,
        end: node.name.loc.start
      },
      fix(fixer) {
        return fixer.insertTextBefore(node.name, " ");
      }
    });
  }
}
function validateBeforeClosing(context, node, option) {
  if (!("selfClosing" in node && node.selfClosing)) {
    const sourceCode = context.sourceCode;
    const leftToken = option === "proportional-always" ? getTokenBeforeClosingBracket(node) : sourceCode.getLastTokens(node, 2)[0];
    const closingToken = sourceCode.getTokenAfter(leftToken);
    if (!isSingleLine(node) && option === "proportional-always") {
      if (astUtilsExports.isTokenOnSameLine(leftToken, closingToken)) {
        context.report({
          node,
          messageId: "beforeCloseNeedNewline",
          loc: leftToken.loc.end,
          fix(fixer) {
            return fixer.insertTextBefore(closingToken, "\n");
          }
        });
        return;
      }
    }
    if (leftToken.loc.start.line !== closingToken.loc.start.line)
      return;
    const adjacent = !sourceCode.isSpaceBetween(leftToken, closingToken);
    if (option === "never" && !adjacent) {
      context.report({
        node,
        messageId: "beforeCloseNoSpace",
        loc: {
          start: leftToken.loc.end,
          end: closingToken.loc.start
        },
        fix(fixer) {
          return fixer.removeRange([leftToken.range[1], closingToken.range[0]]);
        }
      });
    } else if (option === "always" && adjacent) {
      context.report({
        node,
        loc: {
          start: leftToken.loc.end,
          end: closingToken.loc.start
        },
        messageId: "beforeCloseNeedSpace",
        fix(fixer) {
          return fixer.insertTextBefore(closingToken, " ");
        }
      });
    } else if (option === "proportional-always" && node.type === "JSXOpeningElement" && adjacent !== isSingleLine(node)) {
      context.report({
        node,
        messageId: "beforeCloseNeedSpace",
        loc: {
          start: leftToken.loc.end,
          end: closingToken.loc.start
        },
        fix(fixer) {
          return fixer.insertTextBefore(closingToken, " ");
        }
      });
    }
  }
}
const optionDefaults = {
  closingSlash: "never",
  beforeSelfClosing: "always",
  afterOpening: "never",
  beforeClosing: "allow"
};
var jsxTagSpacing = createRule({
  name: "jsx-tag-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce whitespace in and around the JSX opening and closing brackets"
    },
    fixable: "whitespace",
    messages,
    schema: [
      {
        type: "object",
        properties: {
          closingSlash: {
            type: "string",
            enum: ["always", "never", "allow"]
          },
          beforeSelfClosing: {
            type: "string",
            enum: ["always", "proportional-always", "never", "allow"]
          },
          afterOpening: {
            type: "string",
            enum: ["always", "allow-multiline", "never", "allow"]
          },
          beforeClosing: {
            type: "string",
            enum: ["always", "proportional-always", "never", "allow"]
          }
        },
        default: optionDefaults,
        additionalProperties: false
      }
    ]
  },
  create(context) {
    const options = Object.assign({}, optionDefaults, context.options[0]);
    return {
      JSXOpeningElement(node) {
        if (options.closingSlash !== "allow" && node.selfClosing)
          validateClosingSlash(context, node, options.closingSlash);
        if (options.afterOpening !== "allow")
          validateAfterOpening(context, node, options.afterOpening);
        if (options.beforeSelfClosing !== "allow" && node.selfClosing)
          validateBeforeSelfClosing(context, node, options.beforeSelfClosing);
        if (options.beforeClosing !== "allow")
          validateBeforeClosing(context, node, options.beforeClosing);
      },
      JSXClosingElement(node) {
        if (options.afterOpening !== "allow")
          validateAfterOpening(context, node, options.afterOpening);
        if (options.closingSlash !== "allow")
          validateClosingSlash(context, node, options.closingSlash);
        if (options.beforeClosing !== "allow")
          validateBeforeClosing(context, node, options.beforeClosing);
      }
    };
  }
});

export { jsxTagSpacing as default };
