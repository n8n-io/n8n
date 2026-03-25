import { c as createRule, S as STATEMENT_LIST_PARENTS, e as isEqToken, i as isSingleLine, f as getCommentsBetween, j as isQuestionToken, s as skipChainExpression, k as createGlobalLinebreakMatcher } from '../utils.js';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const KNOWN_NODES = /* @__PURE__ */ new Set([
  "AssignmentExpression",
  "AssignmentPattern",
  "ArrayExpression",
  "ArrayPattern",
  "ArrowFunctionExpression",
  "AwaitExpression",
  "BlockStatement",
  "BinaryExpression",
  "BreakStatement",
  "CallExpression",
  "CatchClause",
  "ChainExpression",
  "ClassBody",
  "ClassDeclaration",
  "ClassExpression",
  "ConditionalExpression",
  "ContinueStatement",
  "DoWhileStatement",
  "DebuggerStatement",
  "EmptyStatement",
  "ExpressionStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "FunctionDeclaration",
  "FunctionExpression",
  "Identifier",
  "IfStatement",
  "Literal",
  "LabeledStatement",
  "LogicalExpression",
  "MemberExpression",
  "MetaProperty",
  "MethodDefinition",
  "NewExpression",
  "ObjectExpression",
  "ObjectPattern",
  "PrivateIdentifier",
  "Program",
  "Property",
  "PropertyDefinition",
  "RestElement",
  "ReturnStatement",
  "SequenceExpression",
  "SpreadElement",
  "StaticBlock",
  "Super",
  "SwitchCase",
  "SwitchStatement",
  "TaggedTemplateExpression",
  "TemplateElement",
  "TemplateLiteral",
  "ThisExpression",
  "ThrowStatement",
  "TryStatement",
  "UnaryExpression",
  "UpdateExpression",
  "VariableDeclaration",
  "VariableDeclarator",
  "WhileStatement",
  "WithStatement",
  "YieldExpression",
  "JSXFragment",
  "JSXOpeningFragment",
  "JSXClosingFragment",
  "JSXIdentifier",
  "JSXNamespacedName",
  "JSXMemberExpression",
  "JSXEmptyExpression",
  "JSXExpressionContainer",
  "JSXElement",
  "JSXClosingElement",
  "JSXOpeningElement",
  "JSXAttribute",
  "JSXSpreadAttribute",
  "JSXText",
  "ExportDefaultDeclaration",
  "ExportNamedDeclaration",
  "ExportAllDeclaration",
  "ExportSpecifier",
  "ImportDeclaration",
  "ImportSpecifier",
  "ImportDefaultSpecifier",
  "ImportNamespaceSpecifier",
  "ImportExpression",
  "ImportAttribute",
  // ts keywords
  AST_NODE_TYPES.TSAbstractKeyword,
  AST_NODE_TYPES.TSAnyKeyword,
  AST_NODE_TYPES.TSBooleanKeyword,
  AST_NODE_TYPES.TSNeverKeyword,
  AST_NODE_TYPES.TSNumberKeyword,
  AST_NODE_TYPES.TSStringKeyword,
  AST_NODE_TYPES.TSSymbolKeyword,
  AST_NODE_TYPES.TSUndefinedKeyword,
  AST_NODE_TYPES.TSUnknownKeyword,
  AST_NODE_TYPES.TSVoidKeyword,
  AST_NODE_TYPES.TSNullKeyword,
  // ts specific nodes we want to support
  AST_NODE_TYPES.TSAbstractPropertyDefinition,
  AST_NODE_TYPES.TSAbstractMethodDefinition,
  AST_NODE_TYPES.TSArrayType,
  AST_NODE_TYPES.TSAsExpression,
  AST_NODE_TYPES.TSCallSignatureDeclaration,
  AST_NODE_TYPES.TSConditionalType,
  AST_NODE_TYPES.TSConstructorType,
  AST_NODE_TYPES.TSConstructSignatureDeclaration,
  AST_NODE_TYPES.TSDeclareFunction,
  AST_NODE_TYPES.TSEmptyBodyFunctionExpression,
  AST_NODE_TYPES.TSEnumDeclaration,
  AST_NODE_TYPES.TSEnumMember,
  AST_NODE_TYPES.TSExportAssignment,
  AST_NODE_TYPES.TSExternalModuleReference,
  AST_NODE_TYPES.TSFunctionType,
  AST_NODE_TYPES.TSImportType,
  AST_NODE_TYPES.TSIndexedAccessType,
  AST_NODE_TYPES.TSIndexSignature,
  AST_NODE_TYPES.TSInferType,
  AST_NODE_TYPES.TSInterfaceBody,
  AST_NODE_TYPES.TSInterfaceDeclaration,
  AST_NODE_TYPES.TSInterfaceHeritage,
  AST_NODE_TYPES.TSImportEqualsDeclaration,
  AST_NODE_TYPES.TSLiteralType,
  AST_NODE_TYPES.TSMappedType,
  AST_NODE_TYPES.TSMethodSignature,
  "TSMinusToken",
  AST_NODE_TYPES.TSModuleBlock,
  AST_NODE_TYPES.TSModuleDeclaration,
  AST_NODE_TYPES.TSNonNullExpression,
  AST_NODE_TYPES.TSParameterProperty,
  "TSPlusToken",
  AST_NODE_TYPES.TSPropertySignature,
  AST_NODE_TYPES.TSQualifiedName,
  "TSQuestionToken",
  AST_NODE_TYPES.TSRestType,
  AST_NODE_TYPES.TSThisType,
  AST_NODE_TYPES.TSTupleType,
  AST_NODE_TYPES.TSTypeAnnotation,
  AST_NODE_TYPES.TSTypeLiteral,
  AST_NODE_TYPES.TSTypeOperator,
  AST_NODE_TYPES.TSTypeParameter,
  AST_NODE_TYPES.TSTypeParameterDeclaration,
  AST_NODE_TYPES.TSTypeParameterInstantiation,
  AST_NODE_TYPES.TSTypeReference,
  AST_NODE_TYPES.Decorator
  // These are took care by `indent-binary-ops` rule
  // AST_NODE_TYPES.TSIntersectionType,
  // AST_NODE_TYPES.TSUnionType,
]);
class IndexMap {
  _values;
  /**
   * Creates an empty map
   * @param maxKey The maximum key
   */
  constructor(maxKey) {
    this._values = new Array(maxKey + 1);
  }
  /**
   * Inserts an entry into the map.
   * @param key The entry's key
   * @param value The entry's value
   */
  insert(key, value) {
    this._values[key] = value;
  }
  /**
   * Finds the value of the entry with the largest key less than or equal to the provided key
   * @param key The provided key
   * @returns The value of the found entry, or undefined if no such entry exists.
   */
  findLastNotAfter(key) {
    const values = this._values;
    for (let index = key; index >= 0; index--) {
      const value = values[index];
      if (value)
        return value;
    }
  }
  /**
   * Deletes all of the keys in the interval [start, end)
   * @param start The start of the range
   * @param end The end of the range
   */
  deleteRange(start, end) {
    this._values.fill(void 0, start, end);
  }
}
class TokenInfo {
  sourceCode;
  firstTokensByLineNumber;
  /**
   * @param sourceCode A SourceCode object
   */
  constructor(sourceCode) {
    this.sourceCode = sourceCode;
    this.firstTokensByLineNumber = /* @__PURE__ */ new Map();
    const tokens = sourceCode.tokensAndComments;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!this.firstTokensByLineNumber.has(token.loc.start.line))
        this.firstTokensByLineNumber.set(token.loc.start.line, token);
      if (!this.firstTokensByLineNumber.has(token.loc.end.line) && sourceCode.text.slice(token.range[1] - token.loc.end.column, token.range[1]).trim())
        this.firstTokensByLineNumber.set(token.loc.end.line, token);
    }
  }
  /**
   * Gets the first token on a given token's line
   * @param token a node or token
   * @returns The first token on the given line
   */
  getFirstTokenOfLine(token) {
    return this.firstTokensByLineNumber.get(token.loc.start.line);
  }
  /**
   * Determines whether a token is the first token in its line
   * @param token The token
   * @returns `true` if the token is the first on its line
   */
  isFirstTokenOfLine(token) {
    return this.getFirstTokenOfLine(token) === token;
  }
  /**
   * Get the actual indent of a token
   * @param token Token to examine. This should be the first token on its line.
   * @returns The indentation characters that precede the token
   */
  getTokenIndent(token) {
    return this.sourceCode.text.slice(token.range[0] - token.loc.start.column, token.range[0]);
  }
}
class OffsetStorage {
  _tokenInfo;
  _indentSize;
  _indentType;
  _indexMap;
  _lockedFirstTokens = /* @__PURE__ */ new WeakMap();
  _desiredIndentCache = /* @__PURE__ */ new WeakMap();
  _ignoredTokens = /* @__PURE__ */ new WeakSet();
  /**
   * @param tokenInfo a TokenInfo instance
   * @param indentSize The desired size of each indentation level
   * @param indentType The indentation character
   * @param maxIndex The maximum end index of any token
   */
  constructor(tokenInfo, indentSize, indentType, maxIndex) {
    this._tokenInfo = tokenInfo;
    this._indentSize = indentSize;
    this._indentType = indentType;
    this._indexMap = new IndexMap(maxIndex);
    this._indexMap.insert(0, { offset: 0, from: null, force: false });
  }
  _getOffsetDescriptor(token) {
    return this._indexMap.findLastNotAfter(token.range[0]);
  }
  /**
   * Sets the offset column of token B to match the offset column of token A.
   * - **WARNING**: This matches a *column*, even if baseToken is not the first token on its line. In
   * most cases, `setDesiredOffset` should be used instead.
   * @param baseToken The first token
   * @param offsetToken The second token, whose offset should be matched to the first token
   */
  matchOffsetOf(baseToken, offsetToken) {
    this._lockedFirstTokens.set(offsetToken, baseToken);
  }
  /**
   * Sets the desired offset of a token.
   *
   * This uses a line-based offset collapsing behavior to handle tokens on the same line.
   * For example, consider the following two cases:
   *
   * (
   *     [
   *         bar
   *     ]
   * )
   *
   * ([
   *     bar
   * ])
   *
   * Based on the first case, it's clear that the `bar` token needs to have an offset of 1 indent level (4 spaces) from
   * the `[` token, and the `[` token has to have an offset of 1 indent level from the `(` token. Since the `(` token is
   * the first on its line (with an indent of 0 spaces), the `bar` token needs to be offset by 2 indent levels (8 spaces)
   * from the start of its line.
   *
   * However, in the second case `bar` should only be indented by 4 spaces. This is because the offset of 1 indent level
   * between the `(` and the `[` tokens gets "collapsed" because the two tokens are on the same line. As a result, the
   * `(` token is mapped to the `[` token with an offset of 0, and the rule correctly decides that `bar` should be indented
   * by 1 indent level from the start of the line.
   *
   * This is useful because rule listeners can usually just call `setDesiredOffset` for all the tokens in the node,
   * without needing to check which lines those tokens are on.
   *
   * Note that since collapsing only occurs when two tokens are on the same line, there are a few cases where non-intuitive
   * behavior can occur. For example, consider the following cases:
   *
   * foo(
   * ).
   *     bar(
   *         baz
   *     )
   *
   * foo(
   * ).bar(
   *     baz
   * )
   *
   * Based on the first example, it would seem that `bar` should be offset by 1 indent level from `foo`, and `baz`
   * should be offset by 1 indent level from `bar`. However, this is not correct, because it would result in `baz`
   * being indented by 2 indent levels in the second case (since `foo`, `bar`, and `baz` are all on separate lines, no
   * collapsing would occur).
   *
   * Instead, the correct way would be to offset `baz` by 1 level from `bar`, offset `bar` by 1 level from the `)`, and
   * offset the `)` by 0 levels from `foo`. This ensures that the offset between `bar` and the `)` are correctly collapsed
   * in the second case.
   * @param token The token
   * @param fromToken The token that `token` should be offset from
   * @param offset The desired indent level
   */
  setDesiredOffset(token, fromToken, offset) {
    if (token)
      this.setDesiredOffsets(token.range, fromToken, offset);
  }
  /**
   * Sets the desired offset of all tokens in a range
   * It's common for node listeners in this file to need to apply the same offset to a large, contiguous range of tokens.
   * Moreover, the offset of any given token is usually updated multiple times (roughly once for each node that contains
   * it). This means that the offset of each token is updated O(AST depth) times.
   * It would not be performant to store and update the offsets for each token independently, because the rule would end
   * up having a time complexity of O(number of tokens * AST depth), which is quite slow for large files.
   *
   * Instead, the offset tree is represented as a collection of contiguous offset ranges in a file. For example, the following
   * list could represent the state of the offset tree at a given point:
   *
   * - Tokens starting in the interval [0, 15) are aligned with the beginning of the file
   * - Tokens starting in the interval [15, 30) are offset by 1 indent level from the `bar` token
   * - Tokens starting in the interval [30, 43) are offset by 1 indent level from the `foo` token
   * - Tokens starting in the interval [43, 820) are offset by 2 indent levels from the `bar` token
   * - Tokens starting in the interval [820, ∞) are offset by 1 indent level from the `baz` token
   *
   * The `setDesiredOffsets` methods inserts ranges like the ones above. The third line above would be inserted by using:
   * `setDesiredOffsets([30, 43], fooToken, 1);`
   * @param range A [start, end] pair. All tokens with range[0] <= token.start < range[1] will have the offset applied.
   * @param fromToken The token that this is offset from
   * @param offset The desired indent level
   * @param force `true` if this offset should not use the normal collapsing behavior. This should almost always be false.
   */
  setDesiredOffsets(range, fromToken, offset, force = false) {
    const descriptorToInsert = { offset, from: fromToken, force };
    const descriptorAfterRange = this._indexMap.findLastNotAfter(range[1]);
    const fromTokenIsInRange = fromToken && fromToken.range[0] >= range[0] && fromToken.range[1] <= range[1];
    const fromTokenDescriptor = fromTokenIsInRange && this._getOffsetDescriptor(fromToken);
    this._indexMap.deleteRange(range[0] + 1, range[1]);
    this._indexMap.insert(range[0], descriptorToInsert);
    if (fromTokenIsInRange) {
      this._indexMap.insert(fromToken.range[0], fromTokenDescriptor);
      this._indexMap.insert(fromToken.range[1], descriptorToInsert);
    }
    this._indexMap.insert(range[1], descriptorAfterRange);
  }
  /**
   * Gets the desired indent of a token
   * @param token The token
   * @returns The desired indent of the token
   */
  getDesiredIndent(token) {
    if (!this._desiredIndentCache.has(token)) {
      if (this._ignoredTokens.has(token)) {
        this._desiredIndentCache.set(
          token,
          this._tokenInfo.getTokenIndent(token)
        );
      } else if (this._lockedFirstTokens.has(token)) {
        const firstToken = this._lockedFirstTokens.get(token);
        this._desiredIndentCache.set(
          token,
          // (indentation for the first element's line)
          this.getDesiredIndent(this._tokenInfo.getFirstTokenOfLine(firstToken)) + this._indentType.repeat(firstToken.loc.start.column - this._tokenInfo.getFirstTokenOfLine(firstToken).loc.start.column)
        );
      } else {
        const offsetInfo = this._getOffsetDescriptor(token);
        const offset = offsetInfo.from && offsetInfo.from.loc.start.line === token.loc.start.line && !/^\s*?\n/u.test(token.value) && !offsetInfo.force ? 0 : offsetInfo.offset * this._indentSize;
        this._desiredIndentCache.set(
          token,
          (offsetInfo.from ? this.getDesiredIndent(offsetInfo.from) : "") + this._indentType.repeat(offset)
        );
      }
    }
    return this._desiredIndentCache.get(token);
  }
  /**
   * Ignores a token, preventing it from being reported.
   * @param token The token
   */
  ignoreToken(token) {
    if (this._tokenInfo.isFirstTokenOfLine(token))
      this._ignoredTokens.add(token);
  }
  /**
   * Gets the first token that the given token's indentation is dependent on
   * @param token The token
   * @returns The token that the given token depends on, or `null` if the given token is at the top level
   */
  getFirstDependency(token) {
    return this._getOffsetDescriptor(token).from;
  }
}
const ELEMENT_LIST_SCHEMA = {
  oneOf: [
    {
      type: "integer",
      minimum: 0
    },
    {
      type: "string",
      enum: ["first", "off"]
    }
  ]
};
var indent = createRule({
  name: "indent",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce consistent indentation"
      // too opinionated to be recommended
    },
    fixable: "whitespace",
    schema: [
      {
        oneOf: [
          {
            type: "string",
            enum: ["tab"]
          },
          {
            type: "integer",
            minimum: 0
          }
        ]
      },
      {
        type: "object",
        properties: {
          SwitchCase: {
            type: "integer",
            minimum: 0,
            default: 0
          },
          VariableDeclarator: {
            oneOf: [
              ELEMENT_LIST_SCHEMA,
              {
                type: "object",
                properties: {
                  var: ELEMENT_LIST_SCHEMA,
                  let: ELEMENT_LIST_SCHEMA,
                  const: ELEMENT_LIST_SCHEMA,
                  using: ELEMENT_LIST_SCHEMA
                },
                additionalProperties: false
              }
            ]
          },
          outerIIFEBody: {
            oneOf: [
              {
                type: "integer",
                minimum: 0
              },
              {
                type: "string",
                enum: ["off"]
              }
            ]
          },
          MemberExpression: {
            oneOf: [
              {
                type: "integer",
                minimum: 0
              },
              {
                type: "string",
                enum: ["off"]
              }
            ]
          },
          FunctionDeclaration: {
            type: "object",
            properties: {
              parameters: ELEMENT_LIST_SCHEMA,
              body: {
                type: "integer",
                minimum: 0
              }
            },
            additionalProperties: false
          },
          FunctionExpression: {
            type: "object",
            properties: {
              parameters: ELEMENT_LIST_SCHEMA,
              body: {
                type: "integer",
                minimum: 0
              }
            },
            additionalProperties: false
          },
          StaticBlock: {
            type: "object",
            properties: {
              body: {
                type: "integer",
                minimum: 0
              }
            },
            additionalProperties: false
          },
          CallExpression: {
            type: "object",
            properties: {
              arguments: ELEMENT_LIST_SCHEMA
            },
            additionalProperties: false
          },
          ArrayExpression: ELEMENT_LIST_SCHEMA,
          ObjectExpression: ELEMENT_LIST_SCHEMA,
          ImportDeclaration: ELEMENT_LIST_SCHEMA,
          flatTernaryExpressions: {
            type: "boolean",
            default: false
          },
          offsetTernaryExpressions: {
            type: "boolean",
            default: false
          },
          offsetTernaryExpressionsOffsetCallExpressions: {
            type: "boolean",
            default: true
          },
          ignoredNodes: {
            type: "array",
            items: {
              type: "string",
              // @ts-expect-error Not sure the original intention
              not: {
                pattern: ":exit$"
              }
            }
          },
          ignoreComments: {
            type: "boolean",
            default: false
          },
          tabLength: {
            type: "number",
            default: 4
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      wrongIndentation: "Expected indentation of {{expected}} but found {{actual}}."
    }
  },
  defaultOptions: [
    // typescript docs and playground use 4 space indent
    4,
    {
      // typescript docs indent the case from the switch
      // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-1-8.html#example-4
      SwitchCase: 1,
      flatTernaryExpressions: false,
      ignoredNodes: []
    }
  ],
  create(context, optionsWithDefaults) {
    const DEFAULT_VARIABLE_INDENT = 1;
    const DEFAULT_PARAMETER_INDENT = 1;
    const DEFAULT_FUNCTION_BODY_INDENT = 1;
    let indentType = "space";
    let indentSize = 4;
    const options = {
      SwitchCase: 0,
      VariableDeclarator: {
        var: DEFAULT_VARIABLE_INDENT,
        let: DEFAULT_VARIABLE_INDENT,
        const: DEFAULT_VARIABLE_INDENT,
        using: DEFAULT_VARIABLE_INDENT
      },
      outerIIFEBody: 1,
      FunctionDeclaration: {
        parameters: DEFAULT_PARAMETER_INDENT,
        body: DEFAULT_FUNCTION_BODY_INDENT
      },
      FunctionExpression: {
        parameters: DEFAULT_PARAMETER_INDENT,
        body: DEFAULT_FUNCTION_BODY_INDENT
      },
      StaticBlock: {
        body: DEFAULT_FUNCTION_BODY_INDENT
      },
      CallExpression: {
        arguments: DEFAULT_PARAMETER_INDENT
      },
      MemberExpression: 1,
      ArrayExpression: 1,
      ObjectExpression: 1,
      ImportDeclaration: 1,
      flatTernaryExpressions: false,
      ignoredNodes: [],
      ignoreComments: false,
      offsetTernaryExpressions: false,
      offsetTernaryExpressionsOffsetCallExpressions: true,
      tabLength: 4
    };
    if (optionsWithDefaults.length) {
      if (optionsWithDefaults[0] === "tab") {
        indentSize = 1;
        indentType = "tab";
      } else {
        indentSize = optionsWithDefaults[0] ?? indentSize;
        indentType = "space";
      }
      const userOptions = optionsWithDefaults[1];
      if (userOptions) {
        Object.assign(options, userOptions);
        if (typeof userOptions.VariableDeclarator === "number" || userOptions.VariableDeclarator === "first") {
          options.VariableDeclarator = {
            var: userOptions.VariableDeclarator,
            let: userOptions.VariableDeclarator,
            const: userOptions.VariableDeclarator,
            using: userOptions.VariableDeclarator
          };
        }
      }
    }
    const sourceCode = context.sourceCode;
    const tokenInfo = new TokenInfo(sourceCode);
    const offsets = new OffsetStorage(tokenInfo, indentSize, indentType === "space" ? " " : "	", sourceCode.text.length);
    const parameterParens = /* @__PURE__ */ new WeakSet();
    function createErrorMessageData(expectedAmount, actualSpaces, actualTabs) {
      const expectedStatement = `${expectedAmount} ${indentType}${expectedAmount === 1 ? "" : "s"}`;
      const foundSpacesWord = `space${actualSpaces === 1 ? "" : "s"}`;
      const foundTabsWord = `tab${actualTabs === 1 ? "" : "s"}`;
      let foundStatement;
      if (actualSpaces > 0) {
        foundStatement = indentType === "space" ? actualSpaces : `${actualSpaces} ${foundSpacesWord}`;
      } else if (actualTabs > 0) {
        foundStatement = indentType === "tab" ? actualTabs : `${actualTabs} ${foundTabsWord}`;
      } else {
        foundStatement = "0";
      }
      return {
        expected: expectedStatement,
        actual: foundStatement
      };
    }
    function report(token, neededIndent) {
      const actualIndent = Array.from(tokenInfo.getTokenIndent(token));
      const numSpaces = actualIndent.filter((char) => char === " ").length;
      const numTabs = actualIndent.filter((char) => char === "	").length;
      context.report({
        node: token,
        messageId: "wrongIndentation",
        data: createErrorMessageData(neededIndent.length, numSpaces, numTabs),
        loc: {
          start: { line: token.loc.start.line, column: 0 },
          end: { line: token.loc.start.line, column: token.loc.start.column }
        },
        fix(fixer) {
          const range = [token.range[0] - token.loc.start.column, token.range[0]];
          const newText = neededIndent;
          return fixer.replaceTextRange(range, newText);
        }
      });
    }
    function validateTokenIndent(token, desiredIndent) {
      const indentation = tokenInfo.getTokenIndent(token);
      return indentation === desiredIndent;
    }
    function isOuterIIFE(node) {
      if (!node.parent || node.parent.type !== "CallExpression" || node.parent.callee !== node)
        return false;
      let statement = node.parent && node.parent.parent;
      while (statement.type === "UnaryExpression" && ["!", "~", "+", "-"].includes(statement.operator) || statement.type === "AssignmentExpression" || statement.type === "LogicalExpression" || statement.type === "SequenceExpression" || statement.type === "VariableDeclarator") {
        statement = statement.parent;
      }
      return (statement.type === "ExpressionStatement" || statement.type === "VariableDeclaration") && statement.parent.type === "Program";
    }
    function countTrailingLinebreaks(string) {
      const trailingWhitespace = string.match(/\s*$/u)[0];
      const linebreakMatches = trailingWhitespace.match(createGlobalLinebreakMatcher());
      return linebreakMatches === null ? 0 : linebreakMatches.length;
    }
    function addElementListIndent(elements, startToken, endToken, offset) {
      function getFirstToken(element) {
        let token = sourceCode.getTokenBefore(element);
        while (astUtilsExports.isOpeningParenToken(token) && token !== startToken)
          token = sourceCode.getTokenBefore(token);
        return sourceCode.getTokenAfter(token);
      }
      offsets.setDesiredOffsets(
        [startToken.range[1], endToken.range[0]],
        startToken,
        typeof offset === "number" ? offset : 1
      );
      offsets.setDesiredOffset(endToken, startToken, 0);
      if (offset === "first" && elements.length && !elements[0])
        return;
      elements.forEach((element, index) => {
        if (!element) {
          return;
        }
        if (offset === "off") {
          offsets.ignoreToken(getFirstToken(element));
        }
        if (index === 0)
          return;
        if (offset === "first" && tokenInfo.isFirstTokenOfLine(getFirstToken(element))) {
          offsets.matchOffsetOf(getFirstToken(elements[0]), getFirstToken(element));
        } else {
          const previousElement = elements[index - 1];
          const firstTokenOfPreviousElement = previousElement && getFirstToken(previousElement);
          const previousElementLastToken = previousElement && sourceCode.getLastToken(previousElement);
          if (previousElement && previousElementLastToken.loc.end.line - countTrailingLinebreaks(previousElementLastToken.value) > startToken.loc.end.line) {
            offsets.setDesiredOffsets(
              [previousElement.range[1], element.range[1]],
              firstTokenOfPreviousElement,
              0
            );
          }
        }
      });
    }
    function addBlocklessNodeIndent(node) {
      if (node.type !== "BlockStatement") {
        const lastParentToken = sourceCode.getTokenBefore(node, astUtilsExports.isNotOpeningParenToken);
        let firstBodyToken = sourceCode.getFirstToken(node);
        let lastBodyToken = sourceCode.getLastToken(node);
        while (astUtilsExports.isOpeningParenToken(sourceCode.getTokenBefore(firstBodyToken)) && astUtilsExports.isClosingParenToken(sourceCode.getTokenAfter(lastBodyToken))) {
          firstBodyToken = sourceCode.getTokenBefore(firstBodyToken);
          lastBodyToken = sourceCode.getTokenAfter(lastBodyToken);
        }
        offsets.setDesiredOffsets([firstBodyToken.range[0], lastBodyToken.range[1]], lastParentToken, 1);
      }
    }
    function addFunctionCallIndent(node) {
      let openingParen;
      if (node.arguments.length)
        openingParen = sourceCode.getFirstTokenBetween(node.callee, node.arguments[0], astUtilsExports.isOpeningParenToken);
      else
        openingParen = sourceCode.getLastToken(node, 1);
      const closingParen = sourceCode.getLastToken(node);
      parameterParens.add(openingParen);
      parameterParens.add(closingParen);
      if ("optional" in node && node.optional) {
        const dotToken = sourceCode.getTokenAfter(node.callee, astUtilsExports.isOptionalChainPunctuator);
        const calleeParenCount = sourceCode.getTokensBetween(node.callee, dotToken, { filter: astUtilsExports.isClosingParenToken }).length;
        const firstTokenOfCallee = calleeParenCount ? sourceCode.getTokenBefore(node.callee, { skip: calleeParenCount - 1 }) : sourceCode.getFirstToken(node.callee);
        const lastTokenOfCallee = sourceCode.getTokenBefore(dotToken);
        const offsetBase = astUtilsExports.isTokenOnSameLine(lastTokenOfCallee, openingParen) ? lastTokenOfCallee : firstTokenOfCallee;
        offsets.setDesiredOffset(dotToken, offsetBase, 1);
      }
      const offsetAfterToken = node.callee.type === "TaggedTemplateExpression" ? sourceCode.getFirstToken(node.callee.quasi) : node.typeArguments ?? openingParen;
      const offsetToken = sourceCode.getTokenBefore(offsetAfterToken);
      offsets.setDesiredOffset(openingParen, offsetToken, 0);
      addElementListIndent(node.arguments, openingParen, closingParen, options.CallExpression.arguments);
    }
    function addParensIndent(tokens) {
      const parenStack = [];
      const parenPairs = [];
      for (let i = 0; i < tokens.length; i++) {
        const nextToken = tokens[i];
        if (astUtilsExports.isOpeningParenToken(nextToken))
          parenStack.push(nextToken);
        else if (astUtilsExports.isClosingParenToken(nextToken))
          parenPairs.push({ left: parenStack.pop(), right: nextToken });
      }
      for (let i = parenPairs.length - 1; i >= 0; i--) {
        const leftParen = parenPairs[i].left;
        const rightParen = parenPairs[i].right;
        if (!parameterParens.has(leftParen) && !parameterParens.has(rightParen)) {
          const parenthesizedTokens = new Set(sourceCode.getTokensBetween(leftParen, rightParen));
          parenthesizedTokens.forEach((token) => {
            if (!parenthesizedTokens.has(offsets.getFirstDependency(token)))
              offsets.setDesiredOffset(token, leftParen, 1);
          });
        }
        offsets.setDesiredOffset(rightParen, leftParen, 0);
      }
    }
    function ignoreNode(node) {
      const unknownNodeTokens = new Set(sourceCode.getTokens(node, { includeComments: true }));
      unknownNodeTokens.forEach((token) => {
        if (!unknownNodeTokens.has(offsets.getFirstDependency(token))) {
          const firstTokenOfLine = tokenInfo.getFirstTokenOfLine(token);
          if (token === firstTokenOfLine)
            offsets.ignoreToken(token);
          else
            offsets.setDesiredOffset(token, firstTokenOfLine, 0);
        }
      });
    }
    function isOnFirstLineOfStatement(token, leafNode) {
      let node = leafNode;
      while (node.parent && !node.parent.type.endsWith("Statement") && !node.parent.type.endsWith("Declaration"))
        node = node.parent;
      node = node.parent;
      return !node || node.loc.start.line === token.loc.start.line;
    }
    function hasBlankLinesBetween(firstToken, secondToken) {
      const firstTokenLine = firstToken.loc.end.line;
      const secondTokenLine = secondToken.loc.start.line;
      if (firstTokenLine === secondTokenLine || firstTokenLine === secondTokenLine - 1)
        return false;
      for (let line = firstTokenLine + 1; line < secondTokenLine; ++line) {
        if (!tokenInfo.firstTokensByLineNumber.has(line))
          return true;
      }
      return false;
    }
    const ignoredNodeFirstTokens = /* @__PURE__ */ new Set();
    function checkArrayLikeNode(node) {
      const elementList = node.type === AST_NODE_TYPES.TSTupleType ? node.elementTypes : node.elements;
      const openingBracket = sourceCode.getFirstToken(node);
      const closingBracket = sourceCode.getTokenAfter([...elementList].reverse().find((_) => _) || openingBracket, astUtilsExports.isClosingBracketToken);
      addElementListIndent(elementList, openingBracket, closingBracket, options.ArrayExpression);
    }
    function checkObjectLikeNode(node, properties) {
      const openingCurly = sourceCode.getFirstToken(node, astUtilsExports.isOpeningBraceToken);
      const closingCurly = sourceCode.getTokenAfter(
        properties.length ? properties[properties.length - 1] : openingCurly,
        astUtilsExports.isClosingBraceToken
      );
      addElementListIndent(properties, openingCurly, closingCurly, options.ObjectExpression);
    }
    function checkConditionalNode(node, test, consequent, alternate) {
      const firstToken = sourceCode.getFirstToken(node);
      if (!options.flatTernaryExpressions || !astUtilsExports.isTokenOnSameLine(test, consequent) || isOnFirstLineOfStatement(firstToken, node)) {
        const questionMarkToken = sourceCode.getFirstTokenBetween(test, consequent, isQuestionToken);
        const colonToken = sourceCode.getFirstTokenBetween(consequent, alternate, astUtilsExports.isColonToken);
        const firstConsequentToken = sourceCode.getTokenAfter(questionMarkToken);
        const lastConsequentToken = sourceCode.getTokenBefore(colonToken);
        const firstAlternateToken = sourceCode.getTokenAfter(colonToken);
        offsets.setDesiredOffset(questionMarkToken, firstToken, 1);
        offsets.setDesiredOffset(colonToken, firstToken, 1);
        let offset = 1;
        if (options.offsetTernaryExpressions) {
          if (firstConsequentToken.type === "Punctuator")
            offset = 2;
          const consequentType = skipChainExpression(consequent).type;
          if (options.offsetTernaryExpressionsOffsetCallExpressions && (consequentType === "CallExpression" || consequentType === "AwaitExpression")) {
            offset = 2;
          }
        }
        offsets.setDesiredOffset(
          firstConsequentToken,
          firstToken,
          offset
        );
        if (astUtilsExports.isTokenOnSameLine(lastConsequentToken, firstAlternateToken)) {
          offsets.setDesiredOffset(firstAlternateToken, firstConsequentToken, 0);
        } else {
          let offset2 = 1;
          if (options.offsetTernaryExpressions) {
            if (firstAlternateToken.type === "Punctuator")
              offset2 = 2;
            const alternateType = skipChainExpression(alternate).type;
            if (options.offsetTernaryExpressionsOffsetCallExpressions && (alternateType === "CallExpression" || alternateType === "AwaitExpression")) {
              offset2 = 2;
            }
          }
          offsets.setDesiredOffset(
            firstAlternateToken,
            firstToken,
            offset2
          );
        }
      }
    }
    function checkOperatorToken(left, right, operator) {
      const operatorToken = sourceCode.getFirstTokenBetween(left, right, (token) => token.value === operator);
      const tokenAfterOperator = sourceCode.getTokenAfter(operatorToken);
      offsets.ignoreToken(operatorToken);
      offsets.ignoreToken(tokenAfterOperator);
      offsets.setDesiredOffset(tokenAfterOperator, operatorToken, 0);
    }
    function checkMemberExpression(node, object, property, computed = false) {
      const firstNonObjectToken = sourceCode.getFirstTokenBetween(object, property, astUtilsExports.isNotClosingParenToken);
      const secondNonObjectToken = sourceCode.getTokenAfter(firstNonObjectToken);
      const objectParenCount = sourceCode.getTokensBetween(object, property, { filter: astUtilsExports.isClosingParenToken }).length;
      const firstObjectToken = objectParenCount ? sourceCode.getTokenBefore(object, { skip: objectParenCount - 1 }) : sourceCode.getFirstToken(object);
      const lastObjectToken = sourceCode.getTokenBefore(firstNonObjectToken);
      const firstPropertyToken = computed ? firstNonObjectToken : secondNonObjectToken;
      if (computed) {
        offsets.setDesiredOffset(sourceCode.getLastToken(node), firstNonObjectToken, 0);
        offsets.setDesiredOffsets(property.range, firstNonObjectToken, 1);
      }
      const offsetBase = astUtilsExports.isTokenOnSameLine(lastObjectToken, firstPropertyToken) ? lastObjectToken : firstObjectToken;
      if (typeof options.MemberExpression === "number") {
        offsets.setDesiredOffset(firstNonObjectToken, offsetBase, options.MemberExpression);
        offsets.setDesiredOffset(secondNonObjectToken, computed ? firstNonObjectToken : offsetBase, options.MemberExpression);
      } else {
        offsets.ignoreToken(firstNonObjectToken);
        offsets.ignoreToken(secondNonObjectToken);
        offsets.setDesiredOffset(firstNonObjectToken, offsetBase, 0);
        offsets.setDesiredOffset(secondNonObjectToken, firstNonObjectToken, 0);
      }
    }
    function checkBlockLikeNode(node) {
      let blockIndentLevel;
      if (node.parent && isOuterIIFE(node.parent))
        blockIndentLevel = options.outerIIFEBody;
      else if (node.parent && (node.parent.type === "FunctionExpression" || node.parent.type === "ArrowFunctionExpression"))
        blockIndentLevel = options.FunctionExpression.body;
      else if (node.parent && node.parent.type === "FunctionDeclaration")
        blockIndentLevel = options.FunctionDeclaration.body;
      else
        blockIndentLevel = 1;
      if (!STATEMENT_LIST_PARENTS.has(node.parent.type))
        offsets.setDesiredOffset(sourceCode.getFirstToken(node), sourceCode.getFirstToken(node.parent), 0);
      addElementListIndent(
        node.body,
        sourceCode.getFirstToken(node),
        sourceCode.getLastToken(node),
        blockIndentLevel
      );
    }
    function checkHeritages(node, heritages) {
      const classToken = sourceCode.getFirstToken(node);
      const extendsToken = sourceCode.getTokenBefore(heritages[0], astUtilsExports.isNotOpeningParenToken);
      offsets.setDesiredOffsets([extendsToken.range[0], node.body.range[0]], classToken, 1);
    }
    function getNodeIndent(node, byLastLine = false, excludeCommas = false) {
      let src = context.sourceCode.getText(node, node.loc.start.column);
      const lines = src.split("\n");
      if (byLastLine)
        src = lines[lines.length - 1];
      else
        src = lines[0];
      const skip = excludeCommas ? "," : "";
      let regExp;
      if (indentType === "space")
        regExp = new RegExp(`^[ ${skip}]+`);
      else
        regExp = new RegExp(`^[	${skip}]+`);
      const indent = regExp.exec(src);
      return indent ? indent[0].length : 0;
    }
    const baseOffsetListeners = {
      "ArrayExpression": checkArrayLikeNode,
      "ArrayPattern": checkArrayLikeNode,
      ObjectExpression(node) {
        checkObjectLikeNode(node, node.properties);
      },
      ObjectPattern(node) {
        checkObjectLikeNode(node, node.properties);
      },
      ArrowFunctionExpression(node) {
        const maybeOpeningParen = sourceCode.getFirstToken(node, { skip: node.async ? 1 : 0 });
        if (astUtilsExports.isOpeningParenToken(maybeOpeningParen)) {
          const openingParen = maybeOpeningParen;
          const closingParen = sourceCode.getTokenBefore(node.body, astUtilsExports.isClosingParenToken);
          parameterParens.add(openingParen);
          parameterParens.add(closingParen);
          addElementListIndent(node.params, openingParen, closingParen, options.FunctionExpression.parameters);
        }
        addBlocklessNodeIndent(node.body);
      },
      AssignmentExpression(node) {
        const operator = sourceCode.getFirstTokenBetween(node.left, node.right, (token) => token.value === node.operator);
        offsets.setDesiredOffsets([operator.range[0], node.range[1]], sourceCode.getLastToken(node.left), 1);
        offsets.ignoreToken(operator);
        offsets.ignoreToken(sourceCode.getTokenAfter(operator));
      },
      BinaryExpression(node) {
        checkOperatorToken(node.left, node.right, node.operator);
      },
      LogicalExpression(node) {
        checkOperatorToken(node.left, node.right, node.operator);
      },
      "BlockStatement": checkBlockLikeNode,
      "ClassBody": checkBlockLikeNode,
      "CallExpression": addFunctionCallIndent,
      ClassDeclaration(node) {
        if (!node.superClass)
          return;
        checkHeritages(node, [node.superClass]);
      },
      ClassExpression(node) {
        if (!node.superClass)
          return;
        checkHeritages(node, [node.superClass]);
      },
      ConditionalExpression(node) {
        checkConditionalNode(node, node.test, node.consequent, node.alternate);
      },
      "DoWhileStatement, WhileStatement, ForInStatement, ForOfStatement, WithStatement": function(node) {
        addBlocklessNodeIndent(node.body);
      },
      ExportNamedDeclaration(node) {
        if (node.declaration === null) {
          const closingCurly = node.source ? sourceCode.getTokenBefore(node.source, astUtilsExports.isClosingBraceToken) : sourceCode.getLastToken(node, astUtilsExports.isClosingBraceToken);
          addElementListIndent(node.specifiers, sourceCode.getFirstToken(node, { skip: 1 }), closingCurly, 1);
          if (node.source) {
            const fromToken = sourceCode.getTokenAfter(
              closingCurly,
              (token) => token.type === "Identifier" && token.value === "from"
            );
            const lastToken = sourceCode.getLastToken(node, astUtilsExports.isNotSemicolonToken);
            offsets.setDesiredOffsets([fromToken.range[0], lastToken.range[1]], sourceCode.getFirstToken(node), 1);
            const lastClosingCurly = sourceCode.getLastToken(node, astUtilsExports.isClosingBraceToken);
            if (lastClosingCurly && node.source.range[1] < lastClosingCurly.range[0]) {
              const openingCurly = sourceCode.getTokenAfter(node.source, astUtilsExports.isOpeningBraceToken);
              const closingCurly2 = lastClosingCurly;
              addElementListIndent(node.attributes, openingCurly, closingCurly2, 1);
            }
          }
        }
      },
      ExportAllDeclaration(node) {
        const fromToken = sourceCode.getTokenAfter(
          node.exported || sourceCode.getFirstToken(node),
          (token) => token.type === "Identifier" && token.value === "from"
        );
        const lastToken = sourceCode.getLastToken(node, astUtilsExports.isNotSemicolonToken);
        offsets.setDesiredOffsets([fromToken.range[0], lastToken.range[1]], sourceCode.getFirstToken(node), 1);
        const lastClosingCurly = sourceCode.getLastToken(node, astUtilsExports.isClosingBraceToken);
        if (lastClosingCurly && node.source.range[1] < lastClosingCurly.range[0]) {
          const openingCurly = sourceCode.getTokenAfter(node.source, astUtilsExports.isOpeningBraceToken);
          const closingCurly = lastClosingCurly;
          addElementListIndent(node.attributes, openingCurly, closingCurly, 1);
        }
      },
      ForStatement(node) {
        const forOpeningParen = sourceCode.getFirstToken(node, 1);
        if (node.init)
          offsets.setDesiredOffsets(node.init.range, forOpeningParen, 1);
        if (node.test)
          offsets.setDesiredOffsets(node.test.range, forOpeningParen, 1);
        if (node.update)
          offsets.setDesiredOffsets(node.update.range, forOpeningParen, 1);
        addBlocklessNodeIndent(node.body);
      },
      "FunctionDeclaration, FunctionExpression": function(node) {
        const closingParen = sourceCode.getTokenBefore(node.body);
        const openingParen = sourceCode.getTokenBefore(
          node.params.length ? node.params[0].decorators?.length ? node.params[0].decorators[0] : node.params[0] : closingParen,
          {
            filter: astUtilsExports.isOpeningParenToken
          }
        );
        parameterParens.add(openingParen);
        parameterParens.add(closingParen);
        addElementListIndent(node.params, openingParen, closingParen, options[node.type].parameters);
      },
      IfStatement(node) {
        addBlocklessNodeIndent(node.consequent);
        if (node.alternate)
          addBlocklessNodeIndent(node.alternate);
      },
      /**
       * For blockless nodes with semicolon-first style, don't indent the semicolon.
       * e.g.
       * if (foo)
       *     bar()
       * ; [1, 2, 3].map(foo)
       *
       * Traversal into the node sets indentation of the semicolon, so we need to override it on exit.
       */
      ":matches(DoWhileStatement, ForStatement, ForInStatement, ForOfStatement, IfStatement, WhileStatement, WithStatement):exit": function(node) {
        let nodesToCheck;
        if (node.type === "IfStatement") {
          nodesToCheck = [node.consequent];
          if (node.alternate)
            nodesToCheck.push(node.alternate);
        } else {
          nodesToCheck = [node.body];
        }
        for (const nodeToCheck of nodesToCheck) {
          const lastToken = sourceCode.getLastToken(nodeToCheck);
          if (astUtilsExports.isSemicolonToken(lastToken)) {
            const tokenBeforeLast = sourceCode.getTokenBefore(lastToken);
            const tokenAfterLast = sourceCode.getTokenAfter(lastToken);
            if (!astUtilsExports.isTokenOnSameLine(tokenBeforeLast, lastToken) && tokenAfterLast && astUtilsExports.isTokenOnSameLine(lastToken, tokenAfterLast)) {
              offsets.setDesiredOffset(
                lastToken,
                sourceCode.getFirstToken(node),
                0
              );
            }
          }
        }
      },
      ImportDeclaration(node) {
        if (node.specifiers.some((specifier) => specifier.type === "ImportSpecifier")) {
          const openingCurly = sourceCode.getFirstToken(node, astUtilsExports.isOpeningBraceToken);
          const closingCurly = sourceCode.getTokenBefore(node.source, astUtilsExports.isClosingBraceToken);
          addElementListIndent(node.specifiers.filter((specifier) => specifier.type === "ImportSpecifier"), openingCurly, closingCurly, options.ImportDeclaration);
        }
        const fromToken = node.specifiers.length ? sourceCode.getTokenAfter(node.specifiers[node.specifiers.length - 1], (token) => token.type === "Identifier" && token.value === "from") : sourceCode.getFirstToken(node, (token) => token.type === "Identifier" && token.value === "from");
        const lastToken = sourceCode.getLastToken(node, astUtilsExports.isNotSemicolonToken);
        if (fromToken) {
          offsets.setDesiredOffsets([fromToken.range[0], lastToken.range[1]], sourceCode.getFirstToken(node), 1);
        }
        const lastClosingCurly = sourceCode.getLastToken(node, astUtilsExports.isClosingBraceToken);
        if (lastClosingCurly && node.source.range[1] < lastClosingCurly.range[0]) {
          const openingCurly = sourceCode.getTokenAfter(node.source, astUtilsExports.isOpeningBraceToken);
          const closingCurly = lastClosingCurly;
          if (!fromToken) {
            const withToken = sourceCode.getTokenBefore(openingCurly, (token) => token.value === "with");
            offsets.setDesiredOffsets([withToken.range[0], lastToken.range[1]], sourceCode.getFirstToken(node), 1);
          }
          addElementListIndent(node.attributes, openingCurly, closingCurly, 1);
        }
      },
      ImportExpression(node) {
        const openingParen = sourceCode.getFirstToken(node, 1);
        const closingParen = sourceCode.getLastToken(node);
        parameterParens.add(openingParen);
        parameterParens.add(closingParen);
        offsets.setDesiredOffset(openingParen, sourceCode.getTokenBefore(openingParen), 0);
        addElementListIndent([node.source], openingParen, closingParen, options.CallExpression.arguments);
      },
      MemberExpression(node) {
        checkMemberExpression(node, node.object, node.property, node.computed);
      },
      MetaProperty(node) {
        checkMemberExpression(node, node.meta, node.property);
      },
      NewExpression(node) {
        if (node.arguments.length > 0 || astUtilsExports.isClosingParenToken(sourceCode.getLastToken(node)) && astUtilsExports.isOpeningParenToken(sourceCode.getLastToken(node, 1))) {
          addFunctionCallIndent(node);
        }
      },
      Property(node) {
        if (!node.shorthand && !node.method && node.kind === "init") {
          const colon = sourceCode.getFirstTokenBetween(node.key, node.value, astUtilsExports.isColonToken);
          offsets.ignoreToken(sourceCode.getTokenAfter(colon));
        }
      },
      PropertyDefinition(node) {
        const firstToken = sourceCode.getFirstToken(node);
        const maybeSemicolonToken = sourceCode.getLastToken(node);
        let keyLastToken = null;
        if (node.computed) {
          const bracketTokenL = sourceCode.getTokenBefore(node.key, astUtilsExports.isOpeningBracketToken);
          const bracketTokenR = keyLastToken = sourceCode.getTokenAfter(node.key, astUtilsExports.isClosingBracketToken);
          const keyRange = [bracketTokenL.range[1], bracketTokenR.range[0]];
          if (bracketTokenL !== firstToken)
            offsets.setDesiredOffset(bracketTokenL, firstToken, 0);
          offsets.setDesiredOffsets(keyRange, bracketTokenL, 1);
          offsets.setDesiredOffset(bracketTokenR, bracketTokenL, 0);
        } else {
          const idToken = keyLastToken = sourceCode.getFirstToken(node.key);
          if (!node.decorators?.length && idToken !== firstToken)
            offsets.setDesiredOffset(idToken, firstToken, 1);
        }
        if (node.value) {
          const eqToken = sourceCode.getTokenBefore(node.value, isEqToken);
          const valueToken = sourceCode.getTokenAfter(eqToken);
          const typeToken = sourceCode.getTokenBefore(eqToken);
          offsets.setDesiredOffset(eqToken, keyLastToken, 1);
          offsets.setDesiredOffset(valueToken, keyLastToken === typeToken ? eqToken : typeToken, 1);
          if (astUtilsExports.isSemicolonToken(maybeSemicolonToken))
            offsets.setDesiredOffset(maybeSemicolonToken, eqToken, 1);
        } else if (astUtilsExports.isSemicolonToken(maybeSemicolonToken)) {
          offsets.setDesiredOffset(maybeSemicolonToken, keyLastToken, 1);
        }
      },
      StaticBlock(node) {
        const openingCurly = sourceCode.getFirstToken(node, { skip: 1 });
        const closingCurly = sourceCode.getLastToken(node);
        addElementListIndent(node.body, openingCurly, closingCurly, options.StaticBlock.body);
      },
      SwitchStatement(node) {
        const openingCurly = sourceCode.getTokenAfter(node.discriminant, astUtilsExports.isOpeningBraceToken);
        const closingCurly = sourceCode.getLastToken(node);
        offsets.setDesiredOffsets([openingCurly.range[1], closingCurly.range[0]], openingCurly, options.SwitchCase);
        if (node.cases.length) {
          getCommentsBetween(
            sourceCode,
            node.cases[node.cases.length - 1],
            closingCurly
          ).forEach((token) => offsets.ignoreToken(token));
        }
      },
      SwitchCase(node) {
        if (!(node.consequent.length === 1 && node.consequent[0].type === "BlockStatement")) {
          const caseKeyword = sourceCode.getFirstToken(node);
          const tokenAfterCurrentCase = sourceCode.getTokenAfter(node);
          offsets.setDesiredOffsets([caseKeyword.range[1], tokenAfterCurrentCase.range[0]], caseKeyword, 1);
        }
      },
      TemplateLiteral(node) {
        node.expressions.forEach((expression, index) => {
          const previousQuasi = node.quasis[index];
          const nextQuasi = node.quasis[index + 1];
          const tokenToAlignFrom = isSingleLine(previousQuasi) ? sourceCode.getFirstToken(previousQuasi) : null;
          const startsOnSameLine = astUtilsExports.isTokenOnSameLine(previousQuasi, expression);
          const endsOnSameLine = astUtilsExports.isTokenOnSameLine(expression, nextQuasi);
          if (tokenToAlignFrom || endsOnSameLine && !startsOnSameLine) {
            offsets.setDesiredOffsets([previousQuasi.range[1], nextQuasi.range[0]], tokenToAlignFrom, 1);
            offsets.setDesiredOffset(sourceCode.getFirstToken(nextQuasi), tokenToAlignFrom, 0);
            return;
          }
          const tokenBeforeText = sourceCode.text.slice(previousQuasi.range[1] - previousQuasi.loc.end.column, previousQuasi.range[1] - 2).split("");
          let numIndentation = tokenBeforeText.findIndex((char) => char !== " " && char !== "	");
          if (numIndentation === -1) {
            numIndentation = tokenBeforeText.length;
          }
          const numSpaces = tokenBeforeText.slice(0, numIndentation).filter((char) => char === " ").length;
          const numTabs = numIndentation - numSpaces;
          const indentOffset = numTabs + Math.ceil(numSpaces / (indentType === "tab" ? options.tabLength : indentSize));
          const innerIndentation = endsOnSameLine ? indentOffset : indentOffset + 1;
          offsets.setDesiredOffsets([previousQuasi.range[1], nextQuasi.range[0]], tokenToAlignFrom, innerIndentation);
          offsets.setDesiredOffset(sourceCode.getFirstToken(nextQuasi), tokenToAlignFrom, indentOffset);
        });
      },
      VariableDeclaration(node) {
        if (node.declarations.length === 0)
          return;
        const kind = node.kind === "await using" ? "using" : node.kind;
        let variableIndent = Object.prototype.hasOwnProperty.call(options.VariableDeclarator, kind) ? options.VariableDeclarator[kind] : DEFAULT_VARIABLE_INDENT;
        const firstToken = sourceCode.getFirstToken(node);
        const lastToken = sourceCode.getLastToken(node);
        if (options.VariableDeclarator[kind] === "first") {
          if (node.declarations.length > 1) {
            addElementListIndent(
              node.declarations,
              firstToken,
              lastToken,
              "first"
            );
            return;
          }
          variableIndent = DEFAULT_VARIABLE_INDENT;
        }
        if (node.declarations[node.declarations.length - 1].loc.start.line > node.loc.start.line) {
          offsets.setDesiredOffsets(node.range, firstToken, variableIndent, true);
        } else {
          offsets.setDesiredOffsets(node.range, firstToken, variableIndent);
        }
        if (astUtilsExports.isSemicolonToken(lastToken))
          offsets.ignoreToken(lastToken);
      },
      VariableDeclarator(node) {
        if (node.init) {
          const equalOperator = sourceCode.getTokenBefore(node.init, astUtilsExports.isNotOpeningParenToken);
          const tokenAfterOperator = sourceCode.getTokenAfter(equalOperator);
          offsets.ignoreToken(equalOperator);
          offsets.ignoreToken(tokenAfterOperator);
          offsets.setDesiredOffsets([tokenAfterOperator.range[0], node.range[1]], equalOperator, 1);
          offsets.setDesiredOffset(equalOperator, sourceCode.getLastToken(node.id), 0);
        }
      },
      JSXText(node) {
        if (!node.parent)
          return;
        if (node.parent.type !== "JSXElement" && node.parent.type !== "JSXFragment")
          return;
        const value = node.value;
        const regExp = indentType === "space" ? /\n( *)[\t ]*\S/g : /\n(\t*)[\t ]*\S/g;
        const nodeIndentsPerLine = Array.from(
          String(value).matchAll(regExp),
          (match) => match[1] ? match[1].length : 0
        );
        const hasFirstInLineNode = nodeIndentsPerLine.length > 0;
        const parentNodeIndent = getNodeIndent(node.parent);
        const indent = parentNodeIndent + indentSize;
        if (hasFirstInLineNode && !nodeIndentsPerLine.every((actualIndent) => actualIndent === indent)) {
          nodeIndentsPerLine.forEach((nodeIndent) => {
            context.report({
              node,
              messageId: "wrongIndentation",
              data: createErrorMessageData(indent, nodeIndent, nodeIndent),
              fix(fixer) {
                const indentChar = indentType === "space" ? " " : "	";
                const indentStr = new Array(indent + 1).join(indentChar);
                const regExp2 = /\n[\t ]*(\S)/g;
                const fixedText = node.raw.replace(regExp2, (match, p1) => `
${indentStr}${p1}`);
                return fixer.replaceText(node, fixedText);
              }
            });
          });
        }
      },
      JSXAttribute(node) {
        if (!node.value)
          return;
        const equalsToken = sourceCode.getFirstTokenBetween(node.name, node.value, isEqToken);
        offsets.setDesiredOffsets([equalsToken.range[0], node.value.range[1]], sourceCode.getFirstToken(node.name), 1);
      },
      JSXElement(node) {
        if (node.closingElement) {
          addElementListIndent(
            node.children,
            sourceCode.getFirstToken(node.openingElement),
            sourceCode.getFirstToken(node.closingElement),
            1
          );
        }
      },
      JSXOpeningElement(node) {
        const firstToken = sourceCode.getFirstToken(node);
        let closingToken;
        if (node.selfClosing) {
          closingToken = sourceCode.getLastToken(node, { skip: 1 });
          offsets.setDesiredOffset(sourceCode.getLastToken(node), closingToken, 0);
        } else {
          closingToken = sourceCode.getLastToken(node);
        }
        offsets.setDesiredOffsets(node.name.range, firstToken, 0);
        addElementListIndent(node.attributes, firstToken, closingToken, 1);
      },
      JSXClosingElement(node) {
        const firstToken = sourceCode.getFirstToken(node);
        offsets.setDesiredOffsets(node.name.range, firstToken, 1);
      },
      JSXFragment(node) {
        const firstOpeningToken = sourceCode.getFirstToken(node.openingFragment);
        const firstClosingToken = sourceCode.getFirstToken(node.closingFragment);
        addElementListIndent(node.children, firstOpeningToken, firstClosingToken, 1);
      },
      JSXOpeningFragment(node) {
        const firstToken = sourceCode.getFirstToken(node);
        const closingToken = sourceCode.getLastToken(node);
        offsets.setDesiredOffsets(node.range, firstToken, 1);
        offsets.matchOffsetOf(firstToken, closingToken);
      },
      JSXClosingFragment(node) {
        const firstToken = sourceCode.getFirstToken(node);
        const slashToken = sourceCode.getLastToken(node, { skip: 1 });
        const closingToken = sourceCode.getLastToken(node);
        const tokenToMatch = astUtilsExports.isTokenOnSameLine(slashToken, closingToken) ? slashToken : closingToken;
        offsets.setDesiredOffsets(node.range, firstToken, 1);
        offsets.matchOffsetOf(firstToken, tokenToMatch);
      },
      JSXExpressionContainer(node) {
        const openingCurly = sourceCode.getFirstToken(node);
        const closingCurly = sourceCode.getLastToken(node);
        offsets.setDesiredOffsets(
          [openingCurly.range[1], closingCurly.range[0]],
          openingCurly,
          1
        );
      },
      JSXSpreadAttribute(node) {
        const openingCurly = sourceCode.getFirstToken(node);
        const closingCurly = sourceCode.getLastToken(node);
        offsets.setDesiredOffsets(
          [openingCurly.range[1], closingCurly.range[0]],
          openingCurly,
          1
        );
      },
      JSXMemberExpression(node) {
        checkMemberExpression(node, node.object, node.property);
      },
      "TSTupleType": checkArrayLikeNode,
      TSEnumDeclaration(node) {
        const members = node.body?.members || node.members;
        checkObjectLikeNode(node, members);
      },
      TSTypeLiteral(node) {
        checkObjectLikeNode(node, node.members);
      },
      TSMappedType(node) {
        const squareBracketStart = sourceCode.getTokenBefore(
          node.constraint || node.typeParameter
        );
        const properties = [
          {
            parent: node,
            type: AST_NODE_TYPES.Property,
            key: node.key || node.typeParameter,
            value: node.typeAnnotation,
            // location data
            range: [
              squareBracketStart.range[0],
              node.typeAnnotation ? node.typeAnnotation.range[1] : squareBracketStart.range[0]
            ],
            loc: {
              start: squareBracketStart.loc.start,
              end: node.typeAnnotation ? node.typeAnnotation.loc.end : squareBracketStart.loc.end
            },
            kind: "init",
            computed: false,
            method: false,
            optional: false,
            shorthand: false
          }
        ];
        checkObjectLikeNode(node, properties);
      },
      TSAsExpression(node) {
        checkOperatorToken(node.expression, node.typeAnnotation, "as");
      },
      // TODO: TSSatisfiesExpression
      TSConditionalType(node) {
        checkConditionalNode(
          node,
          {
            parent: node,
            type: AST_NODE_TYPES.BinaryExpression,
            operator: "extends",
            left: node.checkType,
            right: node.extendsType,
            // location data
            range: [node.checkType.range[0], node.extendsType.range[1]],
            loc: {
              start: node.checkType.loc.start,
              end: node.extendsType.loc.end
            }
          },
          node.trueType,
          node.falseType
        );
      },
      TSImportEqualsDeclaration(node) {
        const indent = DEFAULT_VARIABLE_INDENT;
        const firstToken = sourceCode.getFirstToken(node);
        const lastToken = sourceCode.getLastToken(node);
        offsets.setDesiredOffsets(node.range, firstToken, indent);
        if (astUtilsExports.isSemicolonToken(lastToken))
          offsets.ignoreToken(lastToken);
      },
      TSIndexedAccessType(node) {
        checkMemberExpression(node, node.objectType, node.indexType, true);
      },
      "TSInterfaceBody": checkBlockLikeNode,
      TSInterfaceDeclaration(node) {
        if (node.extends.length === 0)
          return;
        checkHeritages(node, node.extends);
      },
      TSQualifiedName(node) {
        checkMemberExpression(node, node.left, node.right);
      },
      TSTypeParameterDeclaration(node) {
        if (!node.params.length)
          return;
        const firstToken = sourceCode.getFirstToken(node);
        const closingToken = sourceCode.getLastToken(node);
        addElementListIndent(node.params, firstToken, closingToken, 1);
      },
      TSTypeParameterInstantiation(node) {
        if (!node.params.length)
          return;
        const firstToken = sourceCode.getFirstToken(node);
        const closingToken = sourceCode.getLastToken(node);
        addElementListIndent(node.params, firstToken, closingToken, 1);
      },
      "TSModuleBlock": checkBlockLikeNode,
      "*": function(node) {
        const firstToken = sourceCode.getFirstToken(node);
        if (firstToken && !ignoredNodeFirstTokens.has(firstToken))
          offsets.setDesiredOffsets(node.range, firstToken, 0);
      }
    };
    const listenerCallQueue = [];
    const offsetListeners = {};
    for (const [selector, listener] of Object.entries(baseOffsetListeners)) {
      offsetListeners[selector] = (node) => listenerCallQueue.push({ listener, node });
    }
    const ignoredNodes = /* @__PURE__ */ new Set();
    function addToIgnoredNodes(node) {
      ignoredNodes.add(node);
      ignoredNodeFirstTokens.add(sourceCode.getFirstToken(node));
    }
    const ignoredNodeListeners = options.ignoredNodes.reduce(
      (listeners, ignoredSelector) => Object.assign(listeners, { [ignoredSelector]: addToIgnoredNodes }),
      {}
    );
    return {
      // Listeners
      ...offsetListeners,
      // Ignored nodes
      ...ignoredNodeListeners,
      // overwrite the base rule here so we can use our KNOWN_NODES list instead
      "*:exit": function(node) {
        if (!KNOWN_NODES.has(node.type))
          addToIgnoredNodes(node);
      },
      "Program:exit": function() {
        if (options.ignoreComments) {
          sourceCode.getAllComments().forEach((comment) => offsets.ignoreToken(comment));
        }
        for (let i = 0; i < listenerCallQueue.length; i++) {
          const nodeInfo = listenerCallQueue[i];
          if (!ignoredNodes.has(nodeInfo.node))
            nodeInfo.listener?.(nodeInfo.node);
        }
        ignoredNodes.forEach(ignoreNode);
        addParensIndent(sourceCode.ast.tokens);
        const precedingTokens = /* @__PURE__ */ new WeakMap();
        for (let i = 0; i < sourceCode.ast.comments.length; i++) {
          const comment = sourceCode.ast.comments[i];
          const tokenOrCommentBefore = sourceCode.getTokenBefore(comment, { includeComments: true });
          const hasToken = precedingTokens.has(tokenOrCommentBefore) ? precedingTokens.get(tokenOrCommentBefore) : tokenOrCommentBefore;
          precedingTokens.set(comment, hasToken);
        }
        for (let i = 1; i < sourceCode.lines.length + 1; i++) {
          if (!tokenInfo.firstTokensByLineNumber.has(i)) {
            continue;
          }
          const firstTokenOfLine = tokenInfo.firstTokensByLineNumber.get(i);
          if (firstTokenOfLine.loc.start.line !== i) {
            continue;
          }
          if (astUtilsExports.isCommentToken(firstTokenOfLine)) {
            const tokenBefore = precedingTokens.get(firstTokenOfLine);
            const tokenAfter = tokenBefore ? sourceCode.getTokenAfter(tokenBefore) : sourceCode.ast.tokens[0];
            const mayAlignWithBefore = tokenBefore && !hasBlankLinesBetween(tokenBefore, firstTokenOfLine);
            const mayAlignWithAfter = tokenAfter && !hasBlankLinesBetween(firstTokenOfLine, tokenAfter);
            if (tokenAfter && astUtilsExports.isSemicolonToken(tokenAfter) && !astUtilsExports.isTokenOnSameLine(firstTokenOfLine, tokenAfter))
              offsets.setDesiredOffset(firstTokenOfLine, tokenAfter, 0);
            if (mayAlignWithBefore && validateTokenIndent(firstTokenOfLine, offsets.getDesiredIndent(tokenBefore)) || mayAlignWithAfter && validateTokenIndent(firstTokenOfLine, offsets.getDesiredIndent(tokenAfter))) {
              continue;
            }
          }
          if (validateTokenIndent(firstTokenOfLine, offsets.getDesiredIndent(firstTokenOfLine)))
            continue;
          report(firstTokenOfLine, offsets.getDesiredIndent(firstTokenOfLine));
        }
      }
    };
  }
});

export { indent as default };
