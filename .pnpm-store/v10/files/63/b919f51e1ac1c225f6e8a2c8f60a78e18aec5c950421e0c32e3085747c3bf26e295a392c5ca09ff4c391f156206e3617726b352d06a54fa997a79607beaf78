import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

const OPTION_ENUMS = ["always", "never", "start", "end"];
var paddedBlocks = createRule({
  name: "padded-blocks",
  meta: {
    type: "layout",
    docs: {
      description: "Require or disallow padding within blocks"
    },
    fixable: "whitespace",
    schema: [
      {
        oneOf: [
          {
            type: "string",
            enum: OPTION_ENUMS
          },
          {
            type: "object",
            properties: {
              blocks: {
                type: "string",
                enum: OPTION_ENUMS
              },
              switches: {
                type: "string",
                enum: OPTION_ENUMS
              },
              classes: {
                type: "string",
                enum: OPTION_ENUMS
              }
            },
            additionalProperties: false,
            minProperties: 1
          }
        ]
      },
      {
        type: "object",
        properties: {
          allowSingleLineBlocks: {
            type: "boolean"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      missingPadBlock: "Block must be padded by blank lines.",
      extraPadBlock: "Block must not be padded by blank lines."
    }
  },
  create(context) {
    const options = {};
    const typeOptions = context.options[0] || "always";
    const exceptOptions = context.options[1] || {};
    if (typeof typeOptions === "string") {
      options.blocks = typeOptions;
      options.switches = typeOptions;
      options.classes = typeOptions;
    } else {
      Object.assign(options, typeOptions);
    }
    exceptOptions.allowSingleLineBlocks ??= false;
    const sourceCode = context.sourceCode;
    function getOpenBrace(node) {
      if (node.type === "SwitchStatement")
        return sourceCode.getTokenBefore(node.cases[0]);
      if (node.type === "StaticBlock")
        return sourceCode.getFirstToken(node, { skip: 1 });
      return sourceCode.getFirstToken(node);
    }
    function isComment(node) {
      return node.type === "Line" || node.type === "Block";
    }
    function isPaddingBetweenTokens(first, second) {
      return second.loc.start.line - first.loc.end.line >= 2;
    }
    function getFirstBlockToken(token) {
      let prev;
      let first = token;
      do {
        prev = first;
        first = sourceCode.getTokenAfter(first, { includeComments: true });
      } while (isComment(first) && astUtilsExports.isTokenOnSameLine(prev, first));
      return first;
    }
    function getLastBlockToken(token) {
      let last = token;
      let next;
      do {
        next = last;
        last = sourceCode.getTokenBefore(last, { includeComments: true });
      } while (isComment(last) && astUtilsExports.isTokenOnSameLine(last, next));
      return last;
    }
    function requirePaddingFor(node) {
      switch (node.type) {
        case "BlockStatement":
        case "StaticBlock":
          return options.blocks;
        case "SwitchStatement":
          return options.switches;
        case "ClassBody":
          return options.classes;
        /* c8 ignore next */
        default:
          throw new Error("unreachable");
      }
    }
    function checkPadding(node) {
      const openBrace = getOpenBrace(node);
      const firstBlockToken = getFirstBlockToken(openBrace);
      const tokenBeforeFirst = sourceCode.getTokenBefore(firstBlockToken, { includeComments: true });
      const closeBrace = sourceCode.getLastToken(node);
      const lastBlockToken = getLastBlockToken(closeBrace);
      const tokenAfterLast = sourceCode.getTokenAfter(lastBlockToken, { includeComments: true });
      const blockHasTopPadding = isPaddingBetweenTokens(tokenBeforeFirst, firstBlockToken);
      const blockHasBottomPadding = isPaddingBetweenTokens(lastBlockToken, tokenAfterLast);
      if (exceptOptions.allowSingleLineBlocks && astUtilsExports.isTokenOnSameLine(tokenBeforeFirst, tokenAfterLast))
        return;
      const requiredPadding = requirePaddingFor(node);
      if (blockHasTopPadding) {
        if (requiredPadding === "never" || requiredPadding === "end") {
          context.report({
            node,
            loc: {
              start: tokenBeforeFirst.loc.start,
              end: firstBlockToken.loc.start
            },
            fix(fixer) {
              return fixer.replaceTextRange([tokenBeforeFirst.range[1], firstBlockToken.range[0] - firstBlockToken.loc.start.column], "\n");
            },
            messageId: "extraPadBlock"
          });
        }
      } else {
        if (requiredPadding === "always" || requiredPadding === "start") {
          context.report({
            node,
            loc: {
              start: tokenBeforeFirst.loc.start,
              end: firstBlockToken.loc.start
            },
            fix(fixer) {
              return fixer.insertTextAfter(tokenBeforeFirst, "\n");
            },
            messageId: "missingPadBlock"
          });
        }
      }
      if (blockHasBottomPadding) {
        if (requiredPadding === "never" || requiredPadding === "start") {
          context.report({
            node,
            loc: {
              end: tokenAfterLast.loc.start,
              start: lastBlockToken.loc.end
            },
            messageId: "extraPadBlock",
            fix(fixer) {
              return fixer.replaceTextRange([lastBlockToken.range[1], tokenAfterLast.range[0] - tokenAfterLast.loc.start.column], "\n");
            }
          });
        }
      } else {
        if (requiredPadding === "always" || requiredPadding === "end") {
          context.report({
            node,
            loc: {
              end: tokenAfterLast.loc.start,
              start: lastBlockToken.loc.end
            },
            fix(fixer) {
              return fixer.insertTextBefore(tokenAfterLast, "\n");
            },
            messageId: "missingPadBlock"
          });
        }
      }
    }
    const rule = {};
    if (Object.prototype.hasOwnProperty.call(options, "switches")) {
      rule.SwitchStatement = function(node) {
        if (node.cases.length === 0)
          return;
        checkPadding(node);
      };
    }
    if (Object.prototype.hasOwnProperty.call(options, "blocks")) {
      rule.BlockStatement = function(node) {
        if (node.body.length === 0)
          return;
        checkPadding(node);
      };
      rule.StaticBlock = rule.BlockStatement;
    }
    if (Object.prototype.hasOwnProperty.call(options, "classes")) {
      rule.ClassBody = function(node) {
        if (node.body.length === 0)
          return;
        checkPadding(node);
      };
    }
    return rule;
  }
});

export { paddedBlocks as default };
