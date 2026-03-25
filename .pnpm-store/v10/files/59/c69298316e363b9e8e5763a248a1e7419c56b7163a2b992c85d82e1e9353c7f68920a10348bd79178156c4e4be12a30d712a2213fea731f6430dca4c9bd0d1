import { c as createRule, l as isKeywordToken, Q as getSwitchCaseColonToken } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var spaceBeforeBlocks = createRule({
  name: "space-before-blocks",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing before blocks"
    },
    fixable: "whitespace",
    schema: [
      {
        oneOf: [
          {
            type: "string",
            enum: ["always", "never"]
          },
          {
            type: "object",
            properties: {
              keywords: {
                type: "string",
                enum: ["always", "never", "off"]
              },
              functions: {
                type: "string",
                enum: ["always", "never", "off"]
              },
              classes: {
                type: "string",
                enum: ["always", "never", "off"]
              },
              modules: {
                type: "string",
                enum: ["always", "never", "off"]
              }
            },
            additionalProperties: false
          }
        ]
      }
    ],
    messages: {
      unexpectedSpace: "Unexpected space before opening brace.",
      missingSpace: "Missing space before opening brace."
    }
  },
  defaultOptions: ["always"],
  create(context, [config]) {
    const sourceCode = context.sourceCode;
    let alwaysFunctions = true;
    let alwaysKeywords = true;
    let alwaysClasses = true;
    let alwaysModules = true;
    let neverFunctions = false;
    let neverKeywords = false;
    let neverClasses = false;
    let neverModules = false;
    if (typeof config === "object") {
      alwaysFunctions = config.functions === "always";
      alwaysKeywords = config.keywords === "always";
      alwaysClasses = config.classes === "always";
      alwaysModules = config.modules === "always";
      neverFunctions = config.functions === "never";
      neverKeywords = config.keywords === "never";
      neverClasses = config.classes === "never";
      neverModules = config.modules === "never";
    } else if (config === "never") {
      alwaysFunctions = false;
      alwaysKeywords = false;
      alwaysClasses = false;
      alwaysModules = false;
      neverFunctions = true;
      neverKeywords = true;
      neverClasses = true;
      neverModules = true;
    }
    function isFunctionBody(node) {
      if (!("parent" in node))
        return false;
      const parent = node.parent;
      return node.type === "BlockStatement" && astUtilsExports.isFunction(parent) && parent.body === node;
    }
    function isConflicted(precedingToken, node) {
      return astUtilsExports.isArrowToken(precedingToken) || isKeywordToken(precedingToken) && !isFunctionBody(node) || astUtilsExports.isColonToken(precedingToken) && "parent" in node && node.parent && node.parent.type === "SwitchCase" && precedingToken === getSwitchCaseColonToken(node.parent, sourceCode);
    }
    function checkPrecedingSpace(node) {
      const precedingToken = sourceCode.getTokenBefore(node);
      if (precedingToken && !isConflicted(precedingToken, node) && astUtilsExports.isTokenOnSameLine(precedingToken, node)) {
        const hasSpace = sourceCode.isSpaceBetween(precedingToken, node);
        let requireSpace;
        let requireNoSpace;
        if (isFunctionBody(node)) {
          requireSpace = alwaysFunctions;
          requireNoSpace = neverFunctions;
        } else if (node.type === "ClassBody" || node.type === "TSEnumBody" || node.type === "TSInterfaceBody") {
          requireSpace = alwaysClasses;
          requireNoSpace = neverClasses;
        } else if (node.type === "TSModuleBlock") {
          requireSpace = alwaysModules;
          requireNoSpace = neverModules;
        } else {
          requireSpace = alwaysKeywords;
          requireNoSpace = neverKeywords;
        }
        if (requireSpace && !hasSpace) {
          context.report({
            node,
            messageId: "missingSpace",
            fix(fixer) {
              return fixer.insertTextBefore(node, " ");
            }
          });
        } else if (requireNoSpace && hasSpace) {
          context.report({
            node,
            messageId: "unexpectedSpace",
            fix(fixer) {
              return fixer.removeRange([
                precedingToken.range[1],
                node.range[0]
              ]);
            }
          });
        }
      }
    }
    return {
      BlockStatement: checkPrecedingSpace,
      ClassBody: checkPrecedingSpace,
      SwitchStatement(node) {
        const cases = node.cases;
        let openingBrace;
        if (cases.length > 0)
          openingBrace = sourceCode.getTokenBefore(cases[0]);
        else
          openingBrace = sourceCode.getLastToken(node, 1);
        checkPrecedingSpace(openingBrace);
      },
      TSEnumBody: checkPrecedingSpace,
      TSInterfaceBody: checkPrecedingSpace,
      TSModuleBlock: checkPrecedingSpace
    };
  }
});

export { spaceBeforeBlocks as default };
