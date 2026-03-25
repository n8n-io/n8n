import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

var objectCurlySpacing = createRule({
  name: "object-curly-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent spacing inside braces"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never"]
      },
      {
        type: "object",
        properties: {
          arraysInObjects: {
            type: "boolean"
          },
          objectsInObjects: {
            type: "boolean"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      requireSpaceBefore: "A space is required before '{{token}}'.",
      requireSpaceAfter: "A space is required after '{{token}}'.",
      unexpectedSpaceBefore: "There should be no space before '{{token}}'.",
      unexpectedSpaceAfter: "There should be no space after '{{token}}'."
    }
  },
  defaultOptions: ["never"],
  create(context) {
    const [firstOption, secondOption] = context.options;
    const spaced = firstOption === "always";
    const sourceCode = context.sourceCode;
    function isOptionSet(option) {
      return secondOption ? secondOption[option] === !spaced : false;
    }
    const options = {
      spaced,
      arraysInObjectsException: isOptionSet("arraysInObjects"),
      objectsInObjectsException: isOptionSet("objectsInObjects")
    };
    function reportNoBeginningSpace(node, token) {
      const nextToken = sourceCode.getTokenAfter(token, { includeComments: true });
      context.report({
        node,
        loc: { start: token.loc.end, end: nextToken.loc.start },
        messageId: "unexpectedSpaceAfter",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.removeRange([token.range[1], nextToken.range[0]]);
        }
      });
    }
    function reportNoEndingSpace(node, token) {
      const previousToken = sourceCode.getTokenBefore(token, { includeComments: true });
      context.report({
        node,
        loc: { start: previousToken.loc.end, end: token.loc.start },
        messageId: "unexpectedSpaceBefore",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.removeRange([previousToken.range[1], token.range[0]]);
        }
      });
    }
    function reportRequiredBeginningSpace(node, token) {
      context.report({
        node,
        loc: token.loc,
        messageId: "requireSpaceAfter",
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
        loc: token.loc,
        messageId: "requireSpaceBefore",
        data: {
          token: token.value
        },
        fix(fixer) {
          return fixer.insertTextBefore(token, " ");
        }
      });
    }
    function validateBraceSpacing(node, openingToken, closingToken) {
      const tokenAfterOpening = sourceCode.getTokenAfter(openingToken, { includeComments: true });
      if (astUtilsExports.isTokenOnSameLine(openingToken, tokenAfterOpening)) {
        const firstSpaced = sourceCode.isSpaceBetween(openingToken, tokenAfterOpening);
        const secondType = sourceCode.getNodeByRangeIndex(
          tokenAfterOpening.range[0]
        ).type;
        const openingCurlyBraceMustBeSpaced = options.arraysInObjectsException && [
          AST_NODE_TYPES.TSMappedType,
          AST_NODE_TYPES.TSIndexSignature
        ].includes(secondType) ? !options.spaced : options.spaced;
        if (openingCurlyBraceMustBeSpaced && !firstSpaced)
          reportRequiredBeginningSpace(node, openingToken);
        if (!openingCurlyBraceMustBeSpaced && firstSpaced && tokenAfterOpening.type !== AST_TOKEN_TYPES.Line) {
          reportNoBeginningSpace(node, openingToken);
        }
      }
      const tokenBeforeClosing = sourceCode.getTokenBefore(closingToken, { includeComments: true });
      if (astUtilsExports.isTokenOnSameLine(tokenBeforeClosing, closingToken)) {
        const shouldCheckPenultimate = options.arraysInObjectsException && astUtilsExports.isClosingBracketToken(tokenBeforeClosing) || options.objectsInObjectsException && astUtilsExports.isClosingBraceToken(tokenBeforeClosing);
        const penultimateType = shouldCheckPenultimate ? sourceCode.getNodeByRangeIndex(tokenBeforeClosing.range[0]).type : void 0;
        const closingCurlyBraceMustBeSpaced = options.arraysInObjectsException && [
          AST_NODE_TYPES.ArrayExpression,
          AST_NODE_TYPES.TSTupleType
        ].includes(penultimateType) || options.objectsInObjectsException && penultimateType !== void 0 && [
          AST_NODE_TYPES.ObjectExpression,
          AST_NODE_TYPES.ObjectPattern,
          AST_NODE_TYPES.TSMappedType,
          AST_NODE_TYPES.TSTypeLiteral
        ].includes(penultimateType) ? !options.spaced : options.spaced;
        const lastSpaced = sourceCode.isSpaceBetween(tokenBeforeClosing, closingToken);
        if (closingCurlyBraceMustBeSpaced && !lastSpaced)
          reportRequiredEndingSpace(node, closingToken);
        if (!closingCurlyBraceMustBeSpaced && lastSpaced)
          reportNoEndingSpace(node, closingToken);
      }
    }
    function checkForObjectLike(node, properties) {
      if (properties.length === 0)
        return;
      const closeToken = sourceCode.getTokenAfter(properties.at(-1), astUtilsExports.isClosingBraceToken);
      const openingToken = sourceCode.getFirstToken(node);
      validateBraceSpacing(node, openingToken, closeToken);
    }
    function checkForImport(node) {
      if (node.specifiers.length === 0)
        return;
      let firstSpecifier = node.specifiers[0];
      const lastSpecifier = node.specifiers[node.specifiers.length - 1];
      if (lastSpecifier.type !== "ImportSpecifier")
        return;
      if (firstSpecifier.type !== "ImportSpecifier")
        firstSpecifier = node.specifiers[1];
      const first = sourceCode.getTokenBefore(firstSpecifier);
      const last = sourceCode.getTokenAfter(lastSpecifier, astUtilsExports.isNotCommaToken);
      validateBraceSpacing(node, first, last);
    }
    function checkForExport(node) {
      if (node.specifiers.length === 0)
        return;
      const firstSpecifier = node.specifiers[0];
      const lastSpecifier = node.specifiers[node.specifiers.length - 1];
      const first = sourceCode.getTokenBefore(firstSpecifier);
      const last = sourceCode.getTokenAfter(lastSpecifier, astUtilsExports.isNotCommaToken);
      validateBraceSpacing(node, first, last);
    }
    return {
      // var {x} = y;
      ObjectPattern(node) {
        checkForObjectLike(node, node.properties);
      },
      // var y = {x: 'y'}
      ObjectExpression(node) {
        checkForObjectLike(node, node.properties);
      },
      // import {y} from 'x';
      ImportDeclaration: checkForImport,
      // export {name} from 'yo';
      ExportNamedDeclaration: checkForExport,
      TSMappedType(node) {
        const openingToken = sourceCode.getFirstToken(node);
        const closeToken = sourceCode.getLastToken(node);
        validateBraceSpacing(node, openingToken, closeToken);
      },
      TSTypeLiteral(node) {
        checkForObjectLike(node, node.members);
      },
      TSInterfaceBody(node) {
        checkForObjectLike(node, node.body);
      },
      TSEnumBody(node) {
        checkForObjectLike(node, node.members);
      }
    };
  }
});

export { objectCurlySpacing as default };
