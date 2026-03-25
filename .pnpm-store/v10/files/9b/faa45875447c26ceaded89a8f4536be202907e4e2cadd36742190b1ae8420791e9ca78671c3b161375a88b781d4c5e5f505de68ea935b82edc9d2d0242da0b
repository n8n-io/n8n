import '@eslint-community/eslint-utils';
import { a as astUtilsExports } from './vendor.js';
import { KEYS } from 'eslint-visitor-keys';
import { tokenize, latestEcmaVersion } from 'espree';
import '@typescript-eslint/types';
import { traverse as traverse$1 } from 'estraverse';

function createAllConfigs(plugin, name, filter) {
  const rules = Object.fromEntries(
    Object.entries(plugin.rules).filter(
      ([key, rule]) => (
        // Only include fixable rules
        rule.meta.fixable && !rule.meta.deprecated && key === rule.meta.docs.url.split("/").pop() && (!filter || filter(key, rule))
      )
    ).map(([key]) => [`${name}/${key}`, 2])
  );
  return {
    plugins: {
      [name]: plugin
    },
    rules
  };
}

const COMMENTS_IGNORE_PATTERN = /^\s*(?:eslint|jshint\s+|jslint\s+|istanbul\s+|globals?\s+|exported\s+|jscs)/u;
const LINEBREAKS = /* @__PURE__ */ new Set(["\r\n", "\r", "\n", "\u2028", "\u2029"]);
const STATEMENT_LIST_PARENTS = /* @__PURE__ */ new Set(["Program", "BlockStatement", "StaticBlock", "SwitchCase"]);
const DECIMAL_INTEGER_PATTERN = /^(?:0|0[0-7]*[89]\d*|[1-9](?:_?\d)*)$/u;
const OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN = /^(?:[^\\]|\\.)*\\(?:[1-9]|0\d)/su;
const ASSIGNMENT_OPERATOR = ["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", ">>>=", "|=", "^=", "&=", "**=", "||=", "&&=", "??="];
const KEYWORDS_JS = [
  "abstract",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "volatile",
  "while",
  "with"
];
function createGlobalLinebreakMatcher() {
  return new RegExp(astUtilsExports.LINEBREAK_MATCHER.source, "gu");
}
const anyFunctionPattern = /^(?:Function(?:Declaration|Expression)|ArrowFunctionExpression)$/u;
function getUpperFunction(node) {
  for (let currentNode = node; currentNode; currentNode = currentNode.parent) {
    if (anyFunctionPattern.test(currentNode.type))
      return currentNode;
  }
  return null;
}
function isNullLiteral(node) {
  return node.type === "Literal" && node.value === null && !("regex" in node) && !("bigint" in node);
}
function getStaticStringValue(node) {
  switch (node.type) {
    case "Literal":
      if (node.value === null) {
        if (isNullLiteral(node))
          return String(node.value);
        if ("regex" in node && node.regex)
          return `/${node.regex.pattern}/${node.regex.flags}`;
        if ("bigint" in node && node.bigint)
          return node.bigint;
      } else {
        return String(node.value);
      }
      break;
    case "TemplateLiteral":
      if (node.expressions.length === 0 && node.quasis.length === 1)
        return node.quasis[0].value.cooked;
      break;
  }
  return null;
}
function getStaticPropertyName(node) {
  let prop;
  if (node) {
    switch (node.type) {
      case "ChainExpression":
        return getStaticPropertyName(node.expression);
      case "Property":
      case "PropertyDefinition":
      case "MethodDefinition":
      case "ImportAttribute":
        prop = node.key;
        break;
      case "MemberExpression":
        prop = node.property;
        break;
    }
  }
  if (prop) {
    if (prop.type === "Identifier" && !("computed" in node && node.computed))
      return prop.name;
    return getStaticStringValue(prop);
  }
  return null;
}
function skipChainExpression(node) {
  return node && node.type === "ChainExpression" ? node.expression : node;
}
function isParenthesised(sourceCode, node) {
  const previousToken = sourceCode.getTokenBefore(node);
  const nextToken = sourceCode.getTokenAfter(node);
  return !!previousToken && !!nextToken && astUtilsExports.isOpeningParenToken(previousToken) && previousToken.range[1] <= node.range[0] && astUtilsExports.isClosingParenToken(nextToken) && nextToken.range[0] >= node.range[1];
}
function isEqToken(token) {
  return token.value === "=" && token.type === "Punctuator";
}
function isQuestionToken(token) {
  return token.value === "?" && token.type === "Punctuator";
}
function isKeywordToken(token) {
  return token?.type === "Keyword";
}
function isHashbangComment(comment) {
  return comment.type === "Shebang" || comment.type === "Hashbang";
}
function isLogicalExpression(node) {
  return node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||");
}
function isCoalesceExpression(node) {
  return node.type === "LogicalExpression" && node.operator === "??";
}
function isMixedLogicalAndCoalesceExpressions(left, right) {
  return isLogicalExpression(left) && isCoalesceExpression(right) || isCoalesceExpression(left) && isLogicalExpression(right);
}
function getSwitchCaseColonToken(node, sourceCode) {
  if (node.test)
    return sourceCode.getTokenAfter(node.test, (token) => astUtilsExports.isColonToken(token));
  return sourceCode.getFirstToken(node, 1);
}
function isTopLevelExpressionStatement(node) {
  if (node.type !== "ExpressionStatement")
    return false;
  const parent = node.parent;
  return parent.type === "Program" || parent.type === "BlockStatement" && astUtilsExports.isFunction(parent.parent);
}
function isStringLiteral(node) {
  return node.type === "Literal" && typeof node.value === "string" || node.type === "TemplateLiteral";
}
function isSurroundedBy(val, character) {
  return val[0] === character && val[val.length - 1] === character;
}
function getPrecedence(node) {
  switch (node.type) {
    case "SequenceExpression":
      return 0;
    case "AssignmentExpression":
    case "ArrowFunctionExpression":
    case "YieldExpression":
      return 1;
    case "ConditionalExpression":
      return 3;
    case "LogicalExpression":
      switch (node.operator) {
        case "||":
        case "??":
          return 4;
        case "&&":
          return 5;
      }
    /* falls through */
    case "BinaryExpression":
      switch (node.operator) {
        case "|":
          return 6;
        case "^":
          return 7;
        case "&":
          return 8;
        case "==":
        case "!=":
        case "===":
        case "!==":
          return 9;
        case "<":
        case "<=":
        case ">":
        case ">=":
        case "in":
        case "instanceof":
          return 10;
        case "<<":
        case ">>":
        case ">>>":
          return 11;
        case "+":
        case "-":
          return 12;
        case "*":
        case "/":
        case "%":
          return 13;
        case "**":
          return 15;
      }
    /* falls through */
    case "UnaryExpression":
    case "AwaitExpression":
      return 16;
    case "UpdateExpression":
      return 17;
    case "CallExpression":
    case "ChainExpression":
    case "ImportExpression":
      return 18;
    case "NewExpression":
      return 19;
    default:
      if (node.type in KEYS)
        return 20;
      return -1;
  }
}
function isDecimalInteger(node) {
  return node.type === "Literal" && typeof node.value === "number" && DECIMAL_INTEGER_PATTERN.test(node.raw);
}
function isDecimalIntegerNumericToken(token) {
  return token.type === "Numeric" && DECIMAL_INTEGER_PATTERN.test(token.value);
}
function getNextLocation(sourceCode, { column, line }) {
  if (column < sourceCode.lines[line - 1].length) {
    return {
      column: column + 1,
      line
    };
  }
  if (line < sourceCode.lines.length) {
    return {
      column: 0,
      line: line + 1
    };
  }
  return null;
}
function isNumericLiteral(node) {
  return node.type === "Literal" && (typeof node.value === "number" || Boolean("bigint" in node && node.bigint));
}
function canTokensBeAdjacent(leftValue, rightValue) {
  const espreeOptions = {
    comment: true,
    ecmaVersion: latestEcmaVersion,
    range: true
  };
  let leftToken;
  if (typeof leftValue === "string") {
    let tokens;
    try {
      tokens = tokenize(leftValue, espreeOptions);
    } catch {
      return false;
    }
    const comments = tokens.comments;
    leftToken = tokens[tokens.length - 1];
    if (comments.length) {
      const lastComment = comments[comments.length - 1];
      if (!leftToken || lastComment.range[0] > leftToken.range[0])
        leftToken = lastComment;
    }
  } else {
    leftToken = leftValue;
  }
  if (isHashbangComment(leftToken))
    return false;
  let rightToken;
  if (typeof rightValue === "string") {
    let tokens;
    try {
      tokens = tokenize(rightValue, espreeOptions);
    } catch {
      return false;
    }
    const comments = tokens.comments;
    rightToken = tokens[0];
    if (comments.length) {
      const firstComment = comments[0];
      if (!rightToken || firstComment.range[0] < rightToken.range[0])
        rightToken = firstComment;
    }
  } else {
    rightToken = rightValue;
  }
  if (leftToken.type === "Punctuator" || rightToken.type === "Punctuator") {
    if (leftToken.type === "Punctuator" && rightToken.type === "Punctuator") {
      const PLUS_TOKENS = /* @__PURE__ */ new Set(["+", "++"]);
      const MINUS_TOKENS = /* @__PURE__ */ new Set(["-", "--"]);
      return !(PLUS_TOKENS.has(leftToken.value) && PLUS_TOKENS.has(rightToken.value) || MINUS_TOKENS.has(leftToken.value) && MINUS_TOKENS.has(rightToken.value));
    }
    if (leftToken.type === "Punctuator" && leftToken.value === "/")
      return !["Block", "Line", "RegularExpression"].includes(rightToken.type);
    return true;
  }
  if (leftToken.type === "String" || rightToken.type === "String" || leftToken.type === "Template" || rightToken.type === "Template")
    return true;
  if (leftToken.type !== "Numeric" && rightToken.type === "Numeric" && rightToken.value.startsWith("."))
    return true;
  if (leftToken.type === "Block" || rightToken.type === "Block" || rightToken.type === "Line")
    return true;
  if (rightToken.type === "PrivateIdentifier")
    return true;
  return false;
}
function hasOctalOrNonOctalDecimalEscapeSequence(rawString) {
  return OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN.test(rawString);
}
const WHITE_SPACES_PATTERN = /^\s*$/u;
function isWhiteSpaces(value) {
  return typeof value === "string" ? WHITE_SPACES_PATTERN.test(value) : false;
}
function getFirstNodeInLine(context, node) {
  const sourceCode = context.sourceCode;
  let token = node;
  let lines = null;
  do {
    token = sourceCode.getTokenBefore(token);
    lines = token.type === "JSXText" ? token.value.split("\n") : null;
  } while (token.type === "JSXText" && lines && isWhiteSpaces(lines.at(-1)));
  return token;
}
function isNodeFirstInLine(context, node) {
  const token = getFirstNodeInLine(context, node);
  if (!token)
    return false;
  return !astUtilsExports.isTokenOnSameLine(token, node);
}
function getTokenBeforeClosingBracket(node) {
  const attributes = "attributes" in node && node.attributes;
  if (!attributes || attributes.length === 0)
    return node.name;
  return attributes[attributes.length - 1];
}
function isSingleLine(node) {
  return node.loc.start.line === node.loc.end.line;
}
function hasCommentsBetween(sourceCode, left, right) {
  return sourceCode.getFirstTokenBetween(
    left,
    right,
    {
      includeComments: true,
      filter: astUtilsExports.isCommentToken
    }
  ) !== null;
}
function getCommentsBetween(sourceCode, left, right) {
  return sourceCode.getTokensBetween(
    left,
    right,
    {
      includeComments: true,
      filter: astUtilsExports.isCommentToken
    }
  );
}

function isObjectNotArray(obj) {
  return typeof obj === "object" && obj != null && !Array.isArray(obj);
}
function deepMerge(first = {}, second = {}) {
  const keys = new Set(Object.keys(first).concat(Object.keys(second)));
  return Array.from(keys).reduce((acc, key) => {
    const firstHasKey = key in first;
    const secondHasKey = key in second;
    const firstValue = first[key];
    const secondValue = second[key];
    if (firstHasKey && secondHasKey) {
      if (isObjectNotArray(firstValue) && isObjectNotArray(secondValue)) {
        acc[key] = deepMerge(firstValue, secondValue);
      } else {
        acc[key] = secondValue;
      }
    } else if (firstHasKey) {
      acc[key] = firstValue;
    } else {
      acc[key] = secondValue;
    }
    return acc;
  }, {});
}

function createRule({
  name,
  create,
  defaultOptions = [],
  meta
}) {
  return {
    create: (context) => {
      const optionsCount = Math.max(context.options.length, defaultOptions.length);
      const optionsWithDefault = Array.from(
        { length: optionsCount },
        (_, i) => {
          if (isObjectNotArray(context.options[i]) && isObjectNotArray(defaultOptions[i])) {
            return deepMerge(defaultOptions[i], context.options[i]);
          }
          return context.options[i] ?? defaultOptions[i];
        }
      );
      return create(context, optionsWithDefault);
    },
    defaultOptions,
    meta: {
      ...meta,
      docs: {
        ...meta.docs,
        url: `https://eslint.style/rules/${name}`
      }
    }
  };
}

function traverse(ASTnode, visitor) {
  const opts = Object.assign({}, {
    fallback(node) {
      return Object.keys(node).filter((key) => key === "children" || key === "argument");
    }
  }, visitor);
  opts.keys = Object.assign({}, visitor.keys, {
    JSXElement: ["children"],
    JSXFragment: ["children"]
  });
  traverse$1(ASTnode, opts);
}
function traverseReturns(ASTNode, onReturn) {
  const nodeType = ASTNode.type;
  if (nodeType === "ReturnStatement") {
    onReturn(ASTNode.argument, () => {
    });
    return;
  }
  if (nodeType === "ArrowFunctionExpression" && ASTNode.expression) {
    onReturn(ASTNode.body, () => {
    });
    return;
  }
  if (nodeType !== "FunctionExpression" && nodeType !== "FunctionDeclaration" && nodeType !== "ArrowFunctionExpression" && nodeType !== "MethodDefinition") {
    return;
  }
  traverse(ASTNode.body, {
    enter(node) {
      const breakTraverse = () => {
        this.break();
      };
      switch (node.type) {
        case "ReturnStatement":
          this.skip();
          onReturn(node.argument, breakTraverse);
          return;
        case "BlockStatement":
        case "IfStatement":
        case "ForStatement":
        case "WhileStatement":
        case "SwitchStatement":
        case "SwitchCase":
          return;
        default:
          this.skip();
      }
    }
  });
}

function getVariable(variables, name) {
  return variables.find((variable) => variable.name === name);
}
function variablesInScope(context) {
  let scope = context.getScope();
  let variables = scope.variables;
  while (scope.type !== "global") {
    scope = scope.upper;
    variables = scope.variables.concat(variables);
  }
  if (scope.childScopes.length) {
    variables = scope.childScopes[0].variables.concat(variables);
    if (scope.childScopes[0].childScopes.length)
      variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
  }
  variables.reverse();
  return variables;
}
function findVariableByName(context, name) {
  const variable = getVariable(variablesInScope(context), name);
  if (!variable || !variable.defs[0] || !variable.defs[0].node)
    return null;
  if (variable.defs[0].node.type === "TypeAlias")
    return variable.defs[0].node.right;
  if (variable.defs[0].type === "ImportBinding")
    return variable.defs[0].node;
  return variable.defs[0].node.init;
}

const COMPAT_TAG_REGEX = /^[a-z]/;
function isDOMComponent(node) {
  const name = getElementType(node);
  return COMPAT_TAG_REGEX.test(name);
}
function isJSX(node) {
  return node && ["JSXElement", "JSXFragment"].includes(node.type);
}
function isReturningJSX(ASTnode, context, strict = false, ignoreNull = false) {
  const isJSXValue = (node) => {
    if (!node)
      return false;
    switch (node.type) {
      case "ConditionalExpression":
        if (strict)
          return isJSXValue(node.consequent) && isJSXValue(node.alternate);
        return isJSXValue(node.consequent) || isJSXValue(node.alternate);
      case "LogicalExpression":
        if (strict)
          return isJSXValue(node.left) && isJSXValue(node.right);
        return isJSXValue(node.left) || isJSXValue(node.right);
      case "SequenceExpression":
        return isJSXValue(node.expressions[node.expressions.length - 1]);
      case "JSXElement":
      case "JSXFragment":
        return true;
      case "Literal":
        if (!ignoreNull && node.value === null)
          return true;
        return false;
      case "Identifier": {
        const variable = findVariableByName(context, node.name);
        return isJSX(variable);
      }
      default:
        return false;
    }
  };
  let found = false;
  traverseReturns(
    ASTnode,
    (node, breakTraverse) => {
      if (isJSXValue(node)) {
        found = true;
        breakTraverse();
      }
    }
  );
  return found;
}
function getPropName(prop) {
  if (!prop.type || prop.type !== "JSXAttribute")
    throw new Error("The prop must be a JSXAttribute collected by the AST parser.");
  if (prop.name.type === "JSXNamespacedName")
    return `${prop.name.namespace.name}:${prop.name.name.name}`;
  return prop.name.name;
}
function resolveMemberExpressions(object, property) {
  if (object.type === "JSXMemberExpression")
    return `${resolveMemberExpressions(object.object, object.property)}.${property.name}`;
  return `${object.name}.${property.name}`;
}
function getElementType(node) {
  if (node.type === "JSXOpeningFragment")
    return "<>";
  const { name } = node;
  if (!name)
    throw new Error("The argument provided is not a JSXElement node.");
  if (name.type === "JSXMemberExpression") {
    const { object, property } = name;
    return resolveMemberExpressions(object, property);
  }
  if (name.type === "JSXNamespacedName")
    return `${name.namespace.name}:${name.name.name}`;
  return node.name.name;
}

let segmenter;
function isASCII(value) {
  return /^[\u0020-\u007F]*$/u.test(value);
}
function getStringLength(value) {
  if (isASCII(value))
    return value.length;
  segmenter ??= new Intl.Segmenter();
  return [...segmenter.segment(value)].length;
}

const NullThrowsReasons = {
  MissingParent: "Expected node to have a parent.",
  MissingToken: (token, thing) => `Expected to find a ${token} for the ${thing}.`
};
function nullThrows(value, message) {
  if (value == null) {
    throw new Error(`Non-null Assertion Failed: ${message}`);
  }
  return value;
}

class FixTracker {
  /**
   * Create a new FixTracker.
   * @param fixer A ruleFixer instance.
   * @param sourceCode A SourceCode object for the current code.
   */
  constructor(fixer, sourceCode) {
    this.fixer = fixer;
    this.sourceCode = sourceCode;
    this.retainedRange = null;
  }
  retainedRange;
  /**
   * Mark the given range as "retained", meaning that other fixes may not
   * may not modify this region in the same pass.
   * @param range The range to retain.
   * @returns The same RuleFixer, for chained calls.
   */
  retainRange(range) {
    this.retainedRange = range;
    return this;
  }
  /**
   * Given a node, find the function containing it (or the entire program) and
   * mark it as retained, meaning that other fixes may not modify it in this
   * pass. This is useful for avoiding conflicts in fixes that modify control
   * flow.
   * @param node The node to use as a starting point.
   * @returns The same RuleFixer, for chained calls.
   */
  retainEnclosingFunction(node) {
    const functionNode = getUpperFunction(node);
    return this.retainRange(functionNode ? functionNode.range : this.sourceCode.ast.range);
  }
  /**
   * Given a node or token, find the token before and afterward, and mark that
   * range as retained, meaning that other fixes may not modify it in this
   * pass. This is useful for avoiding conflicts in fixes that make a small
   * change to the code where the AST should not be changed.
   * @param nodeOrToken The node or token to use as a starting
   *      point. The token to the left and right are use in the range.
   * @returns The same RuleFixer, for chained calls.
   */
  retainSurroundingTokens(nodeOrToken) {
    const tokenBefore = this.sourceCode.getTokenBefore(nodeOrToken) || nodeOrToken;
    const tokenAfter = this.sourceCode.getTokenAfter(nodeOrToken) || nodeOrToken;
    return this.retainRange([tokenBefore.range[0], tokenAfter.range[1]]);
  }
  /**
   * Create a fix command that replaces the given range with the given text,
   * accounting for any retained ranges.
   * @param range The range to remove in the fix.
   * @param text The text to insert in place of the range.
   * @returns The fix command.
   */
  replaceTextRange(range, text) {
    let actualRange;
    if (this.retainedRange) {
      actualRange = [
        Math.min(this.retainedRange[0], range[0]),
        Math.max(this.retainedRange[1], range[1])
      ];
    } else {
      actualRange = range;
    }
    return this.fixer.replaceTextRange(
      actualRange,
      this.sourceCode.text.slice(actualRange[0], range[0]) + text + this.sourceCode.text.slice(range[1], actualRange[1])
    );
  }
  /**
   * Create a fix command that removes the given node or token, accounting for
   * any retained ranges.
   * @param nodeOrToken The node or token to remove.
   * @returns The fix command.
   */
  remove(nodeOrToken) {
    return this.replaceTextRange(nodeOrToken.range, "");
  }
}

export { ASSIGNMENT_OPERATOR as A, nullThrows as B, COMMENTS_IGNORE_PATTERN as C, isHashbangComment as D, deepMerge as E, isParenthesised as F, getPrecedence as G, isDecimalInteger as H, isMixedLogicalAndCoalesceExpressions as I, isTopLevelExpressionStatement as J, KEYWORDS_JS as K, FixTracker as L, LINEBREAKS as M, NullThrowsReasons as N, isNumericLiteral as O, hasOctalOrNonOctalDecimalEscapeSequence as P, getSwitchCaseColonToken as Q, STATEMENT_LIST_PARENTS as S, WHITE_SPACES_PATTERN as W, canTokensBeAdjacent as a, createAllConfigs as b, createRule as c, isDecimalIntegerNumericToken as d, isEqToken as e, getCommentsBetween as f, getNextLocation as g, hasCommentsBetween as h, isSingleLine as i, isQuestionToken as j, createGlobalLinebreakMatcher as k, isKeywordToken as l, isNodeFirstInLine as m, isJSX as n, isWhiteSpaces as o, isReturningJSX as p, getFirstNodeInLine as q, isDOMComponent as r, skipChainExpression as s, getElementType as t, isStringLiteral as u, isSurroundedBy as v, getPropName as w, getTokenBeforeClosingBracket as x, getStringLength as y, getStaticPropertyName as z };
