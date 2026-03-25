import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

const SPACING = {
  always: "always",
  never: "never"
};
const SPACING_VALUES = [SPACING.always, SPACING.never];
const messages = {
  noNewlineAfter: "There should be no newline after '{{token}}'",
  noNewlineBefore: "There should be no newline before '{{token}}'",
  noSpaceAfter: "There should be no space after '{{token}}'",
  noSpaceBefore: "There should be no space before '{{token}}'",
  spaceNeededAfter: "A space is required after '{{token}}'",
  spaceNeededBefore: "A space is required before '{{token}}'"
};
var jsxCurlySpacing = createRule({
  name: "jsx-curly-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce or disallow spaces inside of curly braces in JSX attributes and expressions"
    },
    fixable: "code",
    messages,
    schema: {
      definitions: {
        basicConfig: {
          type: "object",
          properties: {
            when: {
              type: "string",
              enum: SPACING_VALUES
            },
            allowMultiline: {
              type: "boolean"
            },
            spacing: {
              type: "object",
              properties: {
                objectLiterals: {
                  type: "string",
                  enum: SPACING_VALUES
                }
              }
            }
          }
        },
        basicConfigOrBoolean: {
          anyOf: [{
            $ref: "#/definitions/basicConfig"
          }, {
            type: "boolean"
          }]
        }
      },
      type: "array",
      items: [{
        anyOf: [{
          allOf: [{
            $ref: "#/definitions/basicConfig"
          }, {
            type: "object",
            properties: {
              attributes: {
                $ref: "#/definitions/basicConfigOrBoolean"
              },
              children: {
                $ref: "#/definitions/basicConfigOrBoolean"
              }
            }
          }]
        }, {
          type: "string",
          enum: SPACING_VALUES
        }]
      }, {
        type: "object",
        properties: {
          allowMultiline: {
            type: "boolean"
          },
          spacing: {
            type: "object",
            properties: {
              objectLiterals: {
                type: "string",
                enum: SPACING_VALUES
              }
            }
          }
        },
        additionalProperties: false
      }]
    }
  },
  create(context) {
    function normalizeConfig(configOrTrue, defaults, lastPass = false) {
      const config = configOrTrue === true ? {} : configOrTrue;
      const when = config.when || defaults.when;
      const allowMultiline = "allowMultiline" in config ? config.allowMultiline : defaults.allowMultiline;
      const spacing = config.spacing || {};
      let objectLiteralSpaces = spacing.objectLiterals || defaults.objectLiteralSpaces;
      if (lastPass) {
        objectLiteralSpaces = objectLiteralSpaces || when;
      }
      return {
        when,
        allowMultiline,
        objectLiteralSpaces
      };
    }
    const DEFAULT_WHEN = SPACING.never;
    const DEFAULT_ALLOW_MULTILINE = true;
    const DEFAULT_ATTRIBUTES = true;
    const DEFAULT_CHILDREN = false;
    let originalConfig = context.options[0] || {};
    if (SPACING_VALUES.includes(originalConfig))
      originalConfig = Object.assign({ when: context.options[0] }, context.options[1]);
    originalConfig = originalConfig;
    const defaultConfig = normalizeConfig(originalConfig, {
      when: DEFAULT_WHEN,
      allowMultiline: DEFAULT_ALLOW_MULTILINE
    });
    const attributes = "attributes" in originalConfig ? originalConfig.attributes : DEFAULT_ATTRIBUTES;
    const attributesConfig = attributes ? normalizeConfig(attributes, defaultConfig, true) : null;
    const children = "children" in originalConfig ? originalConfig.children : DEFAULT_CHILDREN;
    const childrenConfig = children ? normalizeConfig(children, defaultConfig, true) : null;
    function fixByTrimmingWhitespace(fixer, fromLoc, toLoc, mode, spacing = "") {
      let replacementText = context.sourceCode.text.slice(fromLoc, toLoc);
      if (mode === "start")
        replacementText = replacementText.replace(/^\s+/gm, "");
      else
        replacementText = replacementText.replace(/\s+$/gm, "");
      if (spacing === SPACING.always) {
        if (mode === "start")
          replacementText += " ";
        else
          replacementText = ` ${replacementText}`;
      }
      return fixer.replaceTextRange([fromLoc, toLoc], replacementText);
    }
    function reportNoBeginningNewline(node, token, spacing) {
      context.report({
        node,
        loc: token.loc.start,
        messageId: "noNewlineAfter",
        data: {
          token: token.value
        },
        fix(fixer) {
          const nextToken = context.sourceCode.getTokenAfter(token);
          return fixByTrimmingWhitespace(fixer, token.range[1], nextToken.range[0], "start", spacing);
        }
      });
    }
    function reportNoEndingNewline(node, token, spacing) {
      context.report({
        node,
        loc: token.loc.start,
        messageId: "noNewlineBefore",
        data: {
          token: token.value
        },
        fix(fixer) {
          const previousToken = context.sourceCode.getTokenBefore(token);
          return fixByTrimmingWhitespace(fixer, previousToken.range[1], token.range[0], "end", spacing);
        }
      });
    }
    function reportNoBeginningSpace(node, token) {
      context.report({
        node,
        loc: token.loc.start,
        messageId: "noSpaceAfter",
        data: {
          token: token.value
        },
        fix(fixer) {
          const sourceCode = context.sourceCode;
          const nextToken = sourceCode.getTokenAfter(token);
          const nextComment = sourceCode.getCommentsAfter(token);
          if (nextComment.length > 0)
            return fixByTrimmingWhitespace(fixer, token.range[1], Math.min(nextToken.range[0], nextComment[0].range[0]), "start");
          return fixByTrimmingWhitespace(fixer, token.range[1], nextToken.range[0], "start");
        }
      });
    }
    function reportNoEndingSpace(node, token) {
      context.report({
        node,
        loc: token.loc.start,
        messageId: "noSpaceBefore",
        data: {
          token: token.value
        },
        fix(fixer) {
          const sourceCode = context.sourceCode;
          const previousToken = sourceCode.getTokenBefore(token);
          const previousComment = sourceCode.getCommentsBefore(token);
          if (previousComment.length > 0)
            return fixByTrimmingWhitespace(fixer, Math.max(previousToken.range[1], previousComment[0].range[1]), token.range[0], "end");
          return fixByTrimmingWhitespace(fixer, previousToken.range[1], token.range[0], "end");
        }
      });
    }
    function reportRequiredBeginningSpace(node, token) {
      context.report({
        node,
        loc: token.loc.start,
        messageId: "spaceNeededAfter",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.insertTextAfter(token, " ");
        }
      });
    }
    function reportRequiredEndingSpace(node, token) {
      context.report({
        node,
        loc: token.loc.start,
        messageId: "spaceNeededBefore",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.insertTextBefore(token, " ");
        }
      });
    }
    function validateBraceSpacing(node) {
      let config;
      switch (node.parent?.type) {
        case "JSXAttribute":
        case "JSXOpeningElement":
          config = attributesConfig;
          break;
        case "JSXElement":
        case "JSXFragment":
          config = childrenConfig;
          break;
        default:
          return;
      }
      if (config === null)
        return;
      const sourceCode = context.sourceCode;
      const first = sourceCode.getFirstToken(node);
      const last = sourceCode.getLastToken(node);
      let second = sourceCode.getTokenAfter(first, { includeComments: true });
      let penultimate = sourceCode.getTokenBefore(last, { includeComments: true });
      if (!second) {
        second = sourceCode.getTokenAfter(first);
        const leadingComments = sourceCode.getCommentsBefore(second);
        second = leadingComments ? leadingComments[0] : second;
      }
      if (!penultimate) {
        penultimate = sourceCode.getTokenBefore(last);
        const trailingComments = sourceCode.getCommentsAfter(penultimate);
        penultimate = trailingComments ? trailingComments[trailingComments.length - 1] : penultimate;
      }
      const isObjectLiteral = first.value === second.value;
      const spacing = isObjectLiteral ? config.objectLiteralSpaces : config.when;
      if (spacing === SPACING.always) {
        if (!sourceCode.isSpaceBetween(first, second))
          reportRequiredBeginningSpace(node, first);
        else if (!config.allowMultiline && !astUtilsExports.isTokenOnSameLine(first, second))
          reportNoBeginningNewline(node, first, spacing);
        if (!sourceCode.isSpaceBetween(penultimate, last))
          reportRequiredEndingSpace(node, last);
        else if (!config.allowMultiline && !astUtilsExports.isTokenOnSameLine(penultimate, last))
          reportNoEndingNewline(node, last, spacing);
      } else if (spacing === SPACING.never) {
        if (!astUtilsExports.isTokenOnSameLine(first, second)) {
          if (!config.allowMultiline)
            reportNoBeginningNewline(node, first, spacing);
        } else if (sourceCode.isSpaceBetween(first, second)) {
          reportNoBeginningSpace(node, first);
        }
        if (!astUtilsExports.isTokenOnSameLine(penultimate, last)) {
          if (!config.allowMultiline)
            reportNoEndingNewline(node, last, spacing);
        } else if (sourceCode.isSpaceBetween(penultimate, last)) {
          reportNoEndingSpace(node, last);
        }
      }
    }
    return {
      JSXExpressionContainer: validateBraceSpacing,
      JSXSpreadAttribute: validateBraceSpacing
    };
  }
});

export { jsxCurlySpacing as default };
