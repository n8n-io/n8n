"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Environment: () => Environment,
  Interpreter: () => Interpreter,
  Template: () => Template,
  parse: () => parse,
  tokenize: () => tokenize
});
module.exports = __toCommonJS(src_exports);

// src/lexer.ts
var TOKEN_TYPES = Object.freeze({
  Text: "Text",
  // The text between Jinja statements or expressions
  NumericLiteral: "NumericLiteral",
  // e.g., 123, 1.0
  StringLiteral: "StringLiteral",
  // 'string'
  Identifier: "Identifier",
  // Variables, functions, statements, booleans, etc.
  Equals: "Equals",
  // =
  OpenParen: "OpenParen",
  // (
  CloseParen: "CloseParen",
  // )
  OpenStatement: "OpenStatement",
  // {%
  CloseStatement: "CloseStatement",
  // %}
  OpenExpression: "OpenExpression",
  // {{
  CloseExpression: "CloseExpression",
  // }}
  OpenSquareBracket: "OpenSquareBracket",
  // [
  CloseSquareBracket: "CloseSquareBracket",
  // ]
  OpenCurlyBracket: "OpenCurlyBracket",
  // {
  CloseCurlyBracket: "CloseCurlyBracket",
  // }
  Comma: "Comma",
  // ,
  Dot: "Dot",
  // .
  Colon: "Colon",
  // :
  Pipe: "Pipe",
  // |
  CallOperator: "CallOperator",
  // ()
  AdditiveBinaryOperator: "AdditiveBinaryOperator",
  // + - ~
  MultiplicativeBinaryOperator: "MultiplicativeBinaryOperator",
  // * / %
  ComparisonBinaryOperator: "ComparisonBinaryOperator",
  // < > <= >= == !=
  UnaryOperator: "UnaryOperator",
  // ! - +
  Comment: "Comment"
  // {# ... #}
});
var Token = class {
  /**
   * Constructs a new Token.
   * @param {string} value The raw value as seen inside the source code.
   * @param {TokenType} type The type of token.
   */
  constructor(value, type) {
    this.value = value;
    this.type = type;
  }
};
function isWord(char) {
  return /\w/.test(char);
}
function isInteger(char) {
  return /[0-9]/.test(char);
}
var ORDERED_MAPPING_TABLE = [
  // Control sequences
  ["{%", TOKEN_TYPES.OpenStatement],
  ["%}", TOKEN_TYPES.CloseStatement],
  ["{{", TOKEN_TYPES.OpenExpression],
  ["}}", TOKEN_TYPES.CloseExpression],
  // Single character tokens
  ["(", TOKEN_TYPES.OpenParen],
  [")", TOKEN_TYPES.CloseParen],
  ["{", TOKEN_TYPES.OpenCurlyBracket],
  ["}", TOKEN_TYPES.CloseCurlyBracket],
  ["[", TOKEN_TYPES.OpenSquareBracket],
  ["]", TOKEN_TYPES.CloseSquareBracket],
  [",", TOKEN_TYPES.Comma],
  [".", TOKEN_TYPES.Dot],
  [":", TOKEN_TYPES.Colon],
  ["|", TOKEN_TYPES.Pipe],
  // Comparison operators
  ["<=", TOKEN_TYPES.ComparisonBinaryOperator],
  [">=", TOKEN_TYPES.ComparisonBinaryOperator],
  ["==", TOKEN_TYPES.ComparisonBinaryOperator],
  ["!=", TOKEN_TYPES.ComparisonBinaryOperator],
  ["<", TOKEN_TYPES.ComparisonBinaryOperator],
  [">", TOKEN_TYPES.ComparisonBinaryOperator],
  // Arithmetic operators
  ["+", TOKEN_TYPES.AdditiveBinaryOperator],
  ["-", TOKEN_TYPES.AdditiveBinaryOperator],
  ["~", TOKEN_TYPES.AdditiveBinaryOperator],
  ["*", TOKEN_TYPES.MultiplicativeBinaryOperator],
  ["/", TOKEN_TYPES.MultiplicativeBinaryOperator],
  ["%", TOKEN_TYPES.MultiplicativeBinaryOperator],
  // Assignment operator
  ["=", TOKEN_TYPES.Equals]
];
var ESCAPE_CHARACTERS = /* @__PURE__ */ new Map([
  ["n", "\n"],
  // New line
  ["t", "	"],
  // Horizontal tab
  ["r", "\r"],
  // Carriage return
  ["b", "\b"],
  // Backspace
  ["f", "\f"],
  // Form feed
  ["v", "\v"],
  // Vertical tab
  ["'", "'"],
  // Single quote
  ['"', '"'],
  // Double quote
  ["\\", "\\"]
  // Backslash
]);
function preprocess(template, options = {}) {
  if (template.endsWith("\n")) {
    template = template.slice(0, -1);
  }
  if (options.lstrip_blocks) {
    template = template.replace(/^[ \t]*({[#%-])/gm, "$1");
  }
  if (options.trim_blocks) {
    template = template.replace(/([#%-]})\n/g, "$1");
  }
  return template.replace(/-%}\s*/g, "%}").replace(/\s*{%-/g, "{%").replace(/-}}\s*/g, "}}").replace(/\s*{{-/g, "{{").replace(/-#}\s*/g, "#}").replace(/\s*{#-/g, "{#").replace(/{%\s*(end)?generation\s*%}/gs, "");
}
function tokenize(source, options = {}) {
  const tokens = [];
  const src = preprocess(source, options);
  let cursorPosition = 0;
  let curlyBracketDepth = 0;
  const consumeWhile = (predicate) => {
    let str = "";
    while (predicate(src[cursorPosition])) {
      if (src[cursorPosition] === "\\") {
        ++cursorPosition;
        if (cursorPosition >= src.length)
          throw new SyntaxError("Unexpected end of input");
        const escaped = src[cursorPosition++];
        const unescaped = ESCAPE_CHARACTERS.get(escaped);
        if (unescaped === void 0) {
          throw new SyntaxError(`Unexpected escaped character: ${escaped}`);
        }
        str += unescaped;
        continue;
      }
      str += src[cursorPosition++];
      if (cursorPosition >= src.length)
        throw new SyntaxError("Unexpected end of input");
    }
    return str;
  };
  main:
    while (cursorPosition < src.length) {
      const lastTokenType = tokens.at(-1)?.type;
      if (lastTokenType === void 0 || lastTokenType === TOKEN_TYPES.CloseStatement || lastTokenType === TOKEN_TYPES.CloseExpression || lastTokenType === TOKEN_TYPES.Comment) {
        let text = "";
        while (cursorPosition < src.length && // Keep going until we hit the next Jinja statement or expression
        !(src[cursorPosition] === "{" && (src[cursorPosition + 1] === "%" || src[cursorPosition + 1] === "{" || src[cursorPosition + 1] === "#"))) {
          text += src[cursorPosition++];
        }
        if (text.length > 0) {
          tokens.push(new Token(text, TOKEN_TYPES.Text));
          continue;
        }
      }
      if (src[cursorPosition] === "{" && src[cursorPosition + 1] === "#") {
        cursorPosition += 2;
        let comment = "";
        while (src[cursorPosition] !== "#" || src[cursorPosition + 1] !== "}") {
          if (cursorPosition + 2 >= src.length) {
            throw new SyntaxError("Missing end of comment tag");
          }
          comment += src[cursorPosition++];
        }
        tokens.push(new Token(comment, TOKEN_TYPES.Comment));
        cursorPosition += 2;
        continue;
      }
      consumeWhile((char2) => /\s/.test(char2));
      const char = src[cursorPosition];
      if (char === "-" || char === "+") {
        const lastTokenType2 = tokens.at(-1)?.type;
        if (lastTokenType2 === TOKEN_TYPES.Text || lastTokenType2 === void 0) {
          throw new SyntaxError(`Unexpected character: ${char}`);
        }
        switch (lastTokenType2) {
          case TOKEN_TYPES.Identifier:
          case TOKEN_TYPES.NumericLiteral:
          case TOKEN_TYPES.StringLiteral:
          case TOKEN_TYPES.CloseParen:
          case TOKEN_TYPES.CloseSquareBracket:
            break;
          default: {
            ++cursorPosition;
            const num = consumeWhile(isInteger);
            tokens.push(
              new Token(`${char}${num}`, num.length > 0 ? TOKEN_TYPES.NumericLiteral : TOKEN_TYPES.UnaryOperator)
            );
            continue;
          }
        }
      }
      for (const [seq, type] of ORDERED_MAPPING_TABLE) {
        if (seq === "}}" && curlyBracketDepth > 0) {
          continue;
        }
        const slice2 = src.slice(cursorPosition, cursorPosition + seq.length);
        if (slice2 === seq) {
          tokens.push(new Token(seq, type));
          if (type === TOKEN_TYPES.OpenExpression) {
            curlyBracketDepth = 0;
          } else if (type === TOKEN_TYPES.OpenCurlyBracket) {
            ++curlyBracketDepth;
          } else if (type === TOKEN_TYPES.CloseCurlyBracket) {
            --curlyBracketDepth;
          }
          cursorPosition += seq.length;
          continue main;
        }
      }
      if (char === "'" || char === '"') {
        ++cursorPosition;
        const str = consumeWhile((c) => c !== char);
        tokens.push(new Token(str, TOKEN_TYPES.StringLiteral));
        ++cursorPosition;
        continue;
      }
      if (isInteger(char)) {
        let num = consumeWhile(isInteger);
        if (src[cursorPosition] === "." && isInteger(src[cursorPosition + 1])) {
          ++cursorPosition;
          const frac = consumeWhile(isInteger);
          num = `${num}.${frac}`;
        }
        tokens.push(new Token(num, TOKEN_TYPES.NumericLiteral));
        continue;
      }
      if (isWord(char)) {
        const word = consumeWhile(isWord);
        tokens.push(new Token(word, TOKEN_TYPES.Identifier));
        continue;
      }
      throw new SyntaxError(`Unexpected character: ${char}`);
    }
  return tokens;
}

// src/ast.ts
var Statement = class {
  type = "Statement";
};
var Program = class extends Statement {
  constructor(body) {
    super();
    this.body = body;
  }
  type = "Program";
};
var If = class extends Statement {
  constructor(test, body, alternate) {
    super();
    this.test = test;
    this.body = body;
    this.alternate = alternate;
  }
  type = "If";
};
var For = class extends Statement {
  constructor(loopvar, iterable, body, defaultBlock) {
    super();
    this.loopvar = loopvar;
    this.iterable = iterable;
    this.body = body;
    this.defaultBlock = defaultBlock;
  }
  type = "For";
};
var Break = class extends Statement {
  type = "Break";
};
var Continue = class extends Statement {
  type = "Continue";
};
var SetStatement = class extends Statement {
  constructor(assignee, value, body) {
    super();
    this.assignee = assignee;
    this.value = value;
    this.body = body;
  }
  type = "Set";
};
var Macro = class extends Statement {
  constructor(name, args, body) {
    super();
    this.name = name;
    this.args = args;
    this.body = body;
  }
  type = "Macro";
};
var Comment = class extends Statement {
  constructor(value) {
    super();
    this.value = value;
  }
  type = "Comment";
};
var Expression = class extends Statement {
  type = "Expression";
};
var MemberExpression = class extends Expression {
  constructor(object, property, computed) {
    super();
    this.object = object;
    this.property = property;
    this.computed = computed;
  }
  type = "MemberExpression";
};
var CallExpression = class extends Expression {
  constructor(callee, args) {
    super();
    this.callee = callee;
    this.args = args;
  }
  type = "CallExpression";
};
var Identifier = class extends Expression {
  /**
   * @param {string} value The name of the identifier
   */
  constructor(value) {
    super();
    this.value = value;
  }
  type = "Identifier";
};
var Literal = class extends Expression {
  constructor(value) {
    super();
    this.value = value;
  }
  type = "Literal";
};
var IntegerLiteral = class extends Literal {
  type = "IntegerLiteral";
};
var FloatLiteral = class extends Literal {
  type = "FloatLiteral";
};
var StringLiteral = class extends Literal {
  type = "StringLiteral";
};
var ArrayLiteral = class extends Literal {
  type = "ArrayLiteral";
};
var TupleLiteral = class extends Literal {
  type = "TupleLiteral";
};
var ObjectLiteral = class extends Literal {
  type = "ObjectLiteral";
};
var BinaryExpression = class extends Expression {
  constructor(operator, left, right) {
    super();
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
  type = "BinaryExpression";
};
var FilterExpression = class extends Expression {
  constructor(operand, filter) {
    super();
    this.operand = operand;
    this.filter = filter;
  }
  type = "FilterExpression";
};
var FilterStatement = class extends Statement {
  constructor(filter, body) {
    super();
    this.filter = filter;
    this.body = body;
  }
  type = "FilterStatement";
};
var SelectExpression = class extends Expression {
  constructor(lhs, test) {
    super();
    this.lhs = lhs;
    this.test = test;
  }
  type = "SelectExpression";
};
var TestExpression = class extends Expression {
  constructor(operand, negate, test) {
    super();
    this.operand = operand;
    this.negate = negate;
    this.test = test;
  }
  type = "TestExpression";
};
var UnaryExpression = class extends Expression {
  constructor(operator, argument) {
    super();
    this.operator = operator;
    this.argument = argument;
  }
  type = "UnaryExpression";
};
var SliceExpression = class extends Expression {
  constructor(start = void 0, stop = void 0, step = void 0) {
    super();
    this.start = start;
    this.stop = stop;
    this.step = step;
  }
  type = "SliceExpression";
};
var KeywordArgumentExpression = class extends Expression {
  constructor(key, value) {
    super();
    this.key = key;
    this.value = value;
  }
  type = "KeywordArgumentExpression";
};
var SpreadExpression = class extends Expression {
  constructor(argument) {
    super();
    this.argument = argument;
  }
  type = "SpreadExpression";
};
var CallStatement = class extends Statement {
  constructor(call, callerArgs, body) {
    super();
    this.call = call;
    this.callerArgs = callerArgs;
    this.body = body;
  }
  type = "CallStatement";
};
var Ternary = class extends Expression {
  constructor(condition, trueExpr, falseExpr) {
    super();
    this.condition = condition;
    this.trueExpr = trueExpr;
    this.falseExpr = falseExpr;
  }
  type = "Ternary";
};

// src/parser.ts
function parse(tokens) {
  const program = new Program([]);
  let current = 0;
  function expect(type, error) {
    const prev = tokens[current++];
    if (!prev || prev.type !== type) {
      throw new Error(`Parser Error: ${error}. ${prev.type} !== ${type}.`);
    }
    return prev;
  }
  function expectIdentifier(name) {
    if (!isIdentifier(name)) {
      throw new SyntaxError(`Expected ${name}`);
    }
    ++current;
  }
  function parseAny() {
    switch (tokens[current].type) {
      case TOKEN_TYPES.Comment:
        return new Comment(tokens[current++].value);
      case TOKEN_TYPES.Text:
        return parseText();
      case TOKEN_TYPES.OpenStatement:
        return parseJinjaStatement();
      case TOKEN_TYPES.OpenExpression:
        return parseJinjaExpression();
      default:
        throw new SyntaxError(`Unexpected token type: ${tokens[current].type}`);
    }
  }
  function is(...types) {
    return current + types.length <= tokens.length && types.every((type, i) => type === tokens[current + i].type);
  }
  function isStatement(...names) {
    return tokens[current]?.type === TOKEN_TYPES.OpenStatement && tokens[current + 1]?.type === TOKEN_TYPES.Identifier && names.includes(tokens[current + 1]?.value);
  }
  function isIdentifier(...names) {
    return current + names.length <= tokens.length && names.every((name, i) => tokens[current + i].type === "Identifier" && name === tokens[current + i].value);
  }
  function parseText() {
    return new StringLiteral(expect(TOKEN_TYPES.Text, "Expected text token").value);
  }
  function parseJinjaStatement() {
    expect(TOKEN_TYPES.OpenStatement, "Expected opening statement token");
    if (tokens[current].type !== TOKEN_TYPES.Identifier) {
      throw new SyntaxError(`Unknown statement, got ${tokens[current].type}`);
    }
    const name = tokens[current].value;
    let result;
    switch (name) {
      case "set":
        ++current;
        result = parseSetStatement();
        break;
      case "if":
        ++current;
        result = parseIfStatement();
        expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
        expectIdentifier("endif");
        expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
        break;
      case "macro":
        ++current;
        result = parseMacroStatement();
        expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
        expectIdentifier("endmacro");
        expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
        break;
      case "for":
        ++current;
        result = parseForStatement();
        expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
        expectIdentifier("endfor");
        expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
        break;
      case "call": {
        ++current;
        let callerArgs = null;
        if (is(TOKEN_TYPES.OpenParen)) {
          callerArgs = parseArgs();
        }
        const callee = parsePrimaryExpression();
        if (callee.type !== "Identifier") {
          throw new SyntaxError(`Expected identifier following call statement`);
        }
        const callArgs = parseArgs();
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        const body = [];
        while (!isStatement("endcall")) {
          body.push(parseAny());
        }
        expect(TOKEN_TYPES.OpenStatement, "Expected '{%'");
        expectIdentifier("endcall");
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        const callExpr = new CallExpression(callee, callArgs);
        result = new CallStatement(callExpr, callerArgs, body);
        break;
      }
      case "break":
        ++current;
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        result = new Break();
        break;
      case "continue":
        ++current;
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        result = new Continue();
        break;
      case "filter": {
        ++current;
        let filterNode = parsePrimaryExpression();
        if (filterNode instanceof Identifier && is(TOKEN_TYPES.OpenParen)) {
          filterNode = parseCallExpression(filterNode);
        }
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        const filterBody = [];
        while (!isStatement("endfilter")) {
          filterBody.push(parseAny());
        }
        expect(TOKEN_TYPES.OpenStatement, "Expected '{%'");
        expectIdentifier("endfilter");
        expect(TOKEN_TYPES.CloseStatement, "Expected '%}'");
        result = new FilterStatement(filterNode, filterBody);
        break;
      }
      default:
        throw new SyntaxError(`Unknown statement type: ${name}`);
    }
    return result;
  }
  function parseJinjaExpression() {
    expect(TOKEN_TYPES.OpenExpression, "Expected opening expression token");
    const result = parseExpression();
    expect(TOKEN_TYPES.CloseExpression, "Expected closing expression token");
    return result;
  }
  function parseSetStatement() {
    const left = parseExpressionSequence();
    let value = null;
    const body = [];
    if (is(TOKEN_TYPES.Equals)) {
      ++current;
      value = parseExpressionSequence();
    } else {
      expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
      while (!isStatement("endset")) {
        body.push(parseAny());
      }
      expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
      expectIdentifier("endset");
    }
    expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
    return new SetStatement(left, value, body);
  }
  function parseIfStatement() {
    const test = parseExpression();
    expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
    const body = [];
    const alternate = [];
    while (!isStatement("elif", "else", "endif")) {
      body.push(parseAny());
    }
    if (isStatement("elif")) {
      ++current;
      ++current;
      const result = parseIfStatement();
      alternate.push(result);
    } else if (isStatement("else")) {
      ++current;
      ++current;
      expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
      while (!isStatement("endif")) {
        alternate.push(parseAny());
      }
    }
    return new If(test, body, alternate);
  }
  function parseMacroStatement() {
    const name = parsePrimaryExpression();
    if (name.type !== "Identifier") {
      throw new SyntaxError(`Expected identifier following macro statement`);
    }
    const args = parseArgs();
    expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
    const body = [];
    while (!isStatement("endmacro")) {
      body.push(parseAny());
    }
    return new Macro(name, args, body);
  }
  function parseExpressionSequence(primary = false) {
    const fn = primary ? parsePrimaryExpression : parseExpression;
    const expressions = [fn()];
    const isTuple = is(TOKEN_TYPES.Comma);
    while (isTuple) {
      ++current;
      expressions.push(fn());
      if (!is(TOKEN_TYPES.Comma)) {
        break;
      }
    }
    return isTuple ? new TupleLiteral(expressions) : expressions[0];
  }
  function parseForStatement() {
    const loopVariable = parseExpressionSequence(true);
    if (!(loopVariable instanceof Identifier || loopVariable instanceof TupleLiteral)) {
      throw new SyntaxError(`Expected identifier/tuple for the loop variable, got ${loopVariable.type} instead`);
    }
    if (!isIdentifier("in")) {
      throw new SyntaxError("Expected `in` keyword following loop variable");
    }
    ++current;
    const iterable = parseExpression();
    expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
    const body = [];
    while (!isStatement("endfor", "else")) {
      body.push(parseAny());
    }
    const alternative = [];
    if (isStatement("else")) {
      ++current;
      ++current;
      expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
      while (!isStatement("endfor")) {
        alternative.push(parseAny());
      }
    }
    return new For(loopVariable, iterable, body, alternative);
  }
  function parseExpression() {
    return parseIfExpression();
  }
  function parseIfExpression() {
    const a = parseLogicalOrExpression();
    if (isIdentifier("if")) {
      ++current;
      const test = parseLogicalOrExpression();
      if (isIdentifier("else")) {
        ++current;
        const falseExpr = parseIfExpression();
        return new Ternary(test, a, falseExpr);
      } else {
        return new SelectExpression(a, test);
      }
    }
    return a;
  }
  function parseLogicalOrExpression() {
    let left = parseLogicalAndExpression();
    while (isIdentifier("or")) {
      const operator = tokens[current];
      ++current;
      const right = parseLogicalAndExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseLogicalAndExpression() {
    let left = parseLogicalNegationExpression();
    while (isIdentifier("and")) {
      const operator = tokens[current];
      ++current;
      const right = parseLogicalNegationExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseLogicalNegationExpression() {
    let right;
    while (isIdentifier("not")) {
      const operator = tokens[current];
      ++current;
      const arg = parseLogicalNegationExpression();
      right = new UnaryExpression(operator, arg);
    }
    return right ?? parseComparisonExpression();
  }
  function parseComparisonExpression() {
    let left = parseAdditiveExpression();
    while (true) {
      let operator;
      if (isIdentifier("not", "in")) {
        operator = new Token("not in", TOKEN_TYPES.Identifier);
        current += 2;
      } else if (isIdentifier("in")) {
        operator = tokens[current++];
      } else if (is(TOKEN_TYPES.ComparisonBinaryOperator)) {
        operator = tokens[current++];
      } else {
        break;
      }
      const right = parseAdditiveExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseAdditiveExpression() {
    let left = parseMultiplicativeExpression();
    while (is(TOKEN_TYPES.AdditiveBinaryOperator)) {
      const operator = tokens[current];
      ++current;
      const right = parseMultiplicativeExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseCallMemberExpression() {
    const member = parseMemberExpression(parsePrimaryExpression());
    if (is(TOKEN_TYPES.OpenParen)) {
      return parseCallExpression(member);
    }
    return member;
  }
  function parseCallExpression(callee) {
    let expression = new CallExpression(callee, parseArgs());
    expression = parseMemberExpression(expression);
    if (is(TOKEN_TYPES.OpenParen)) {
      expression = parseCallExpression(expression);
    }
    return expression;
  }
  function parseArgs() {
    expect(TOKEN_TYPES.OpenParen, "Expected opening parenthesis for arguments list");
    const args = parseArgumentsList();
    expect(TOKEN_TYPES.CloseParen, "Expected closing parenthesis for arguments list");
    return args;
  }
  function parseArgumentsList() {
    const args = [];
    while (!is(TOKEN_TYPES.CloseParen)) {
      let argument;
      if (tokens[current].type === TOKEN_TYPES.MultiplicativeBinaryOperator && tokens[current].value === "*") {
        ++current;
        const expr = parseExpression();
        argument = new SpreadExpression(expr);
      } else {
        argument = parseExpression();
        if (is(TOKEN_TYPES.Equals)) {
          ++current;
          if (!(argument instanceof Identifier)) {
            throw new SyntaxError(`Expected identifier for keyword argument`);
          }
          const value = parseExpression();
          argument = new KeywordArgumentExpression(argument, value);
        }
      }
      args.push(argument);
      if (is(TOKEN_TYPES.Comma)) {
        ++current;
      }
    }
    return args;
  }
  function parseMemberExpressionArgumentsList() {
    const slices = [];
    let isSlice = false;
    while (!is(TOKEN_TYPES.CloseSquareBracket)) {
      if (is(TOKEN_TYPES.Colon)) {
        slices.push(void 0);
        ++current;
        isSlice = true;
      } else {
        slices.push(parseExpression());
        if (is(TOKEN_TYPES.Colon)) {
          ++current;
          isSlice = true;
        }
      }
    }
    if (slices.length === 0) {
      throw new SyntaxError(`Expected at least one argument for member/slice expression`);
    }
    if (isSlice) {
      if (slices.length > 3) {
        throw new SyntaxError(`Expected 0-3 arguments for slice expression`);
      }
      return new SliceExpression(...slices);
    }
    return slices[0];
  }
  function parseMemberExpression(object) {
    while (is(TOKEN_TYPES.Dot) || is(TOKEN_TYPES.OpenSquareBracket)) {
      const operator = tokens[current];
      ++current;
      let property;
      const computed = operator.type === TOKEN_TYPES.OpenSquareBracket;
      if (computed) {
        property = parseMemberExpressionArgumentsList();
        expect(TOKEN_TYPES.CloseSquareBracket, "Expected closing square bracket");
      } else {
        property = parsePrimaryExpression();
        if (property.type !== "Identifier") {
          throw new SyntaxError(`Expected identifier following dot operator`);
        }
      }
      object = new MemberExpression(object, property, computed);
    }
    return object;
  }
  function parseMultiplicativeExpression() {
    let left = parseTestExpression();
    while (is(TOKEN_TYPES.MultiplicativeBinaryOperator)) {
      const operator = tokens[current++];
      const right = parseTestExpression();
      left = new BinaryExpression(operator, left, right);
    }
    return left;
  }
  function parseTestExpression() {
    let operand = parseFilterExpression();
    while (isIdentifier("is")) {
      ++current;
      const negate = isIdentifier("not");
      if (negate) {
        ++current;
      }
      const filter = parsePrimaryExpression();
      if (!(filter instanceof Identifier)) {
        throw new SyntaxError(`Expected identifier for the test`);
      }
      operand = new TestExpression(operand, negate, filter);
    }
    return operand;
  }
  function parseFilterExpression() {
    let operand = parseCallMemberExpression();
    while (is(TOKEN_TYPES.Pipe)) {
      ++current;
      let filter = parsePrimaryExpression();
      if (!(filter instanceof Identifier)) {
        throw new SyntaxError(`Expected identifier for the filter`);
      }
      if (is(TOKEN_TYPES.OpenParen)) {
        filter = parseCallExpression(filter);
      }
      operand = new FilterExpression(operand, filter);
    }
    return operand;
  }
  function parsePrimaryExpression() {
    const token = tokens[current++];
    switch (token.type) {
      case TOKEN_TYPES.NumericLiteral: {
        const num = token.value;
        return num.includes(".") ? new FloatLiteral(Number(num)) : new IntegerLiteral(Number(num));
      }
      case TOKEN_TYPES.StringLiteral: {
        let value = token.value;
        while (is(TOKEN_TYPES.StringLiteral)) {
          value += tokens[current++].value;
        }
        return new StringLiteral(value);
      }
      case TOKEN_TYPES.Identifier:
        return new Identifier(token.value);
      case TOKEN_TYPES.OpenParen: {
        const expression = parseExpressionSequence();
        expect(TOKEN_TYPES.CloseParen, "Expected closing parenthesis, got ${tokens[current].type} instead.");
        return expression;
      }
      case TOKEN_TYPES.OpenSquareBracket: {
        const values = [];
        while (!is(TOKEN_TYPES.CloseSquareBracket)) {
          values.push(parseExpression());
          if (is(TOKEN_TYPES.Comma)) {
            ++current;
          }
        }
        ++current;
        return new ArrayLiteral(values);
      }
      case TOKEN_TYPES.OpenCurlyBracket: {
        const values = /* @__PURE__ */ new Map();
        while (!is(TOKEN_TYPES.CloseCurlyBracket)) {
          const key = parseExpression();
          expect(TOKEN_TYPES.Colon, "Expected colon between key and value in object literal");
          const value = parseExpression();
          values.set(key, value);
          if (is(TOKEN_TYPES.Comma)) {
            ++current;
          }
        }
        ++current;
        return new ObjectLiteral(values);
      }
      default:
        throw new SyntaxError(`Unexpected token: ${token.type}`);
    }
  }
  while (current < tokens.length) {
    program.body.push(parseAny());
  }
  return program;
}

// src/utils.ts
function range(start, stop, step = 1) {
  if (stop === void 0) {
    stop = start;
    start = 0;
  }
  const result = [];
  for (let i = start; i < stop; i += step) {
    result.push(i);
  }
  return result;
}
function slice(array, start, stop, step = 1) {
  const direction = Math.sign(step);
  if (direction >= 0) {
    start = (start ??= 0) < 0 ? Math.max(array.length + start, 0) : Math.min(start, array.length);
    stop = (stop ??= array.length) < 0 ? Math.max(array.length + stop, 0) : Math.min(stop, array.length);
  } else {
    start = (start ??= array.length - 1) < 0 ? Math.max(array.length + start, -1) : Math.min(start, array.length - 1);
    stop = (stop ??= -1) < -1 ? Math.max(array.length + stop, -1) : Math.min(stop, array.length - 1);
  }
  const result = [];
  for (let i = start; direction * i < direction * stop; i += step) {
    result.push(array[i]);
  }
  return result;
}
function titleCase(value) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
function strftime_now(format2) {
  return strftime(/* @__PURE__ */ new Date(), format2);
}
function strftime(date, format2) {
  const monthFormatterLong = new Intl.DateTimeFormat(void 0, { month: "long" });
  const monthFormatterShort = new Intl.DateTimeFormat(void 0, { month: "short" });
  const pad2 = (n) => n < 10 ? "0" + n : n.toString();
  return format2.replace(/%[YmdbBHM%]/g, (token) => {
    switch (token) {
      case "%Y":
        return date.getFullYear().toString();
      case "%m":
        return pad2(date.getMonth() + 1);
      case "%d":
        return pad2(date.getDate());
      case "%b":
        return monthFormatterShort.format(date);
      case "%B":
        return monthFormatterLong.format(date);
      case "%H":
        return pad2(date.getHours());
      case "%M":
        return pad2(date.getMinutes());
      case "%%":
        return "%";
      default:
        return token;
    }
  });
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replace(str, oldvalue, newvalue, count) {
  if (count === 0)
    return str;
  let remaining = count == null || count < 0 ? Infinity : count;
  const pattern = oldvalue.length === 0 ? new RegExp("(?=)", "gu") : new RegExp(escapeRegExp(oldvalue), "gu");
  return str.replaceAll(pattern, (match) => {
    if (remaining > 0) {
      --remaining;
      return newvalue;
    }
    return match;
  });
}

// src/runtime.ts
var BreakControl = class extends Error {
};
var ContinueControl = class extends Error {
};
var RuntimeValue = class {
  type = "RuntimeValue";
  value;
  /**
   * A collection of built-in functions for this type.
   */
  builtins = /* @__PURE__ */ new Map();
  /**
   * Creates a new RuntimeValue.
   */
  constructor(value = void 0) {
    this.value = value;
  }
  /**
   * Determines truthiness or falsiness of the runtime value.
   * This function should be overridden by subclasses if it has custom truthiness criteria.
   * @returns {BooleanValue} BooleanValue(true) if the value is truthy, BooleanValue(false) otherwise.
   */
  __bool__() {
    return new BooleanValue(!!this.value);
  }
  toString() {
    return String(this.value);
  }
};
var IntegerValue = class extends RuntimeValue {
  type = "IntegerValue";
};
var FloatValue = class extends RuntimeValue {
  type = "FloatValue";
  toString() {
    return this.value % 1 === 0 ? this.value.toFixed(1) : this.value.toString();
  }
};
var StringValue = class extends RuntimeValue {
  type = "StringValue";
  builtins = /* @__PURE__ */ new Map([
    [
      "upper",
      new FunctionValue(() => {
        return new StringValue(this.value.toUpperCase());
      })
    ],
    [
      "lower",
      new FunctionValue(() => {
        return new StringValue(this.value.toLowerCase());
      })
    ],
    [
      "strip",
      new FunctionValue(() => {
        return new StringValue(this.value.trim());
      })
    ],
    [
      "title",
      new FunctionValue(() => {
        return new StringValue(titleCase(this.value));
      })
    ],
    [
      "capitalize",
      new FunctionValue(() => {
        return new StringValue(this.value.charAt(0).toUpperCase() + this.value.slice(1));
      })
    ],
    ["length", new IntegerValue(this.value.length)],
    [
      "rstrip",
      new FunctionValue(() => {
        return new StringValue(this.value.trimEnd());
      })
    ],
    [
      "lstrip",
      new FunctionValue(() => {
        return new StringValue(this.value.trimStart());
      })
    ],
    [
      "startswith",
      new FunctionValue((args) => {
        if (args.length === 0) {
          throw new Error("startswith() requires at least one argument");
        }
        const pattern = args[0];
        if (pattern instanceof StringValue) {
          return new BooleanValue(this.value.startsWith(pattern.value));
        } else if (pattern instanceof ArrayValue) {
          for (const item of pattern.value) {
            if (!(item instanceof StringValue)) {
              throw new Error("startswith() tuple elements must be strings");
            }
            if (this.value.startsWith(item.value)) {
              return new BooleanValue(true);
            }
          }
          return new BooleanValue(false);
        }
        throw new Error("startswith() argument must be a string or tuple of strings");
      })
    ],
    [
      "endswith",
      new FunctionValue((args) => {
        if (args.length === 0) {
          throw new Error("endswith() requires at least one argument");
        }
        const pattern = args[0];
        if (pattern instanceof StringValue) {
          return new BooleanValue(this.value.endsWith(pattern.value));
        } else if (pattern instanceof ArrayValue) {
          for (const item of pattern.value) {
            if (!(item instanceof StringValue)) {
              throw new Error("endswith() tuple elements must be strings");
            }
            if (this.value.endsWith(item.value)) {
              return new BooleanValue(true);
            }
          }
          return new BooleanValue(false);
        }
        throw new Error("endswith() argument must be a string or tuple of strings");
      })
    ],
    [
      "split",
      // follows Python's `str.split(sep=None, maxsplit=-1)` function behavior
      // https://docs.python.org/3.13/library/stdtypes.html#str.split
      new FunctionValue((args) => {
        const sep = args[0] ?? new NullValue();
        if (!(sep instanceof StringValue || sep instanceof NullValue)) {
          throw new Error("sep argument must be a string or null");
        }
        const maxsplit = args[1] ?? new IntegerValue(-1);
        if (!(maxsplit instanceof IntegerValue)) {
          throw new Error("maxsplit argument must be a number");
        }
        let result = [];
        if (sep instanceof NullValue) {
          const text = this.value.trimStart();
          for (const { 0: match, index } of text.matchAll(/\S+/g)) {
            if (maxsplit.value !== -1 && result.length >= maxsplit.value && index !== void 0) {
              result.push(match + text.slice(index + match.length));
              break;
            }
            result.push(match);
          }
        } else {
          if (sep.value === "") {
            throw new Error("empty separator");
          }
          result = this.value.split(sep.value);
          if (maxsplit.value !== -1 && result.length > maxsplit.value) {
            result.push(result.splice(maxsplit.value).join(sep.value));
          }
        }
        return new ArrayValue(result.map((part) => new StringValue(part)));
      })
    ],
    [
      "replace",
      new FunctionValue((args) => {
        if (args.length < 2) {
          throw new Error("replace() requires at least two arguments");
        }
        const oldValue = args[0];
        const newValue = args[1];
        if (!(oldValue instanceof StringValue && newValue instanceof StringValue)) {
          throw new Error("replace() arguments must be strings");
        }
        let count;
        if (args.length > 2) {
          if (args[2].type === "KeywordArgumentsValue") {
            count = args[2].value.get("count") ?? new NullValue();
          } else {
            count = args[2];
          }
        } else {
          count = new NullValue();
        }
        if (!(count instanceof IntegerValue || count instanceof NullValue)) {
          throw new Error("replace() count argument must be a number or null");
        }
        return new StringValue(replace(this.value, oldValue.value, newValue.value, count.value));
      })
    ]
  ]);
};
var BooleanValue = class extends RuntimeValue {
  type = "BooleanValue";
};
var ObjectValue = class extends RuntimeValue {
  type = "ObjectValue";
  /**
   * NOTE: necessary to override since all JavaScript arrays are considered truthy,
   * while only non-empty Python arrays are consider truthy.
   *
   * e.g.,
   *  - JavaScript:  {} && 5 -> 5
   *  - Python:      {} and 5 -> {}
   */
  __bool__() {
    return new BooleanValue(this.value.size > 0);
  }
  builtins = /* @__PURE__ */ new Map([
    [
      "get",
      new FunctionValue(([key, defaultValue]) => {
        if (!(key instanceof StringValue)) {
          throw new Error(`Object key must be a string: got ${key.type}`);
        }
        return this.value.get(key.value) ?? defaultValue ?? new NullValue();
      })
    ],
    ["items", new FunctionValue(() => this.items())],
    ["keys", new FunctionValue(() => this.keys())],
    ["values", new FunctionValue(() => this.values())]
  ]);
  items() {
    return new ArrayValue(
      Array.from(this.value.entries()).map(([key, value]) => new ArrayValue([new StringValue(key), value]))
    );
  }
  keys() {
    return new ArrayValue(Array.from(this.value.keys()).map((key) => new StringValue(key)));
  }
  values() {
    return new ArrayValue(Array.from(this.value.values()));
  }
};
var KeywordArgumentsValue = class extends ObjectValue {
  type = "KeywordArgumentsValue";
};
var ArrayValue = class extends RuntimeValue {
  type = "ArrayValue";
  builtins = /* @__PURE__ */ new Map([["length", new IntegerValue(this.value.length)]]);
  /**
   * NOTE: necessary to override since all JavaScript arrays are considered truthy,
   * while only non-empty Python arrays are consider truthy.
   *
   * e.g.,
   *  - JavaScript:  [] && 5 -> 5
   *  - Python:      [] and 5 -> []
   */
  __bool__() {
    return new BooleanValue(this.value.length > 0);
  }
};
var TupleValue = class extends ArrayValue {
  type = "TupleValue";
};
var FunctionValue = class extends RuntimeValue {
  type = "FunctionValue";
};
var NullValue = class extends RuntimeValue {
  type = "NullValue";
};
var UndefinedValue = class extends RuntimeValue {
  type = "UndefinedValue";
};
var Environment = class {
  constructor(parent) {
    this.parent = parent;
  }
  /**
   * The variables declared in this environment.
   */
  variables = /* @__PURE__ */ new Map([
    [
      "namespace",
      new FunctionValue((args) => {
        if (args.length === 0) {
          return new ObjectValue(/* @__PURE__ */ new Map());
        }
        if (args.length !== 1 || !(args[0] instanceof ObjectValue)) {
          throw new Error("`namespace` expects either zero arguments or a single object argument");
        }
        return args[0];
      })
    ]
  ]);
  /**
   * The tests available in this environment.
   */
  tests = /* @__PURE__ */ new Map([
    ["boolean", (operand) => operand.type === "BooleanValue"],
    ["callable", (operand) => operand instanceof FunctionValue],
    [
      "odd",
      (operand) => {
        if (!(operand instanceof IntegerValue)) {
          throw new Error(`cannot odd on ${operand.type}`);
        }
        return operand.value % 2 !== 0;
      }
    ],
    [
      "even",
      (operand) => {
        if (!(operand instanceof IntegerValue)) {
          throw new Error(`cannot even on ${operand.type}`);
        }
        return operand.value % 2 === 0;
      }
    ],
    ["false", (operand) => operand.type === "BooleanValue" && !operand.value],
    ["true", (operand) => operand.type === "BooleanValue" && operand.value],
    ["none", (operand) => operand.type === "NullValue"],
    ["string", (operand) => operand.type === "StringValue"],
    ["number", (operand) => operand instanceof IntegerValue || operand instanceof FloatValue],
    ["integer", (operand) => operand instanceof IntegerValue],
    ["iterable", (operand) => operand.type === "ArrayValue" || operand.type === "StringValue"],
    ["mapping", (operand) => operand.type === "ObjectValue"],
    [
      "lower",
      (operand) => {
        const str = operand.value;
        return operand.type === "StringValue" && str === str.toLowerCase();
      }
    ],
    [
      "upper",
      (operand) => {
        const str = operand.value;
        return operand.type === "StringValue" && str === str.toUpperCase();
      }
    ],
    ["none", (operand) => operand.type === "NullValue"],
    ["defined", (operand) => operand.type !== "UndefinedValue"],
    ["undefined", (operand) => operand.type === "UndefinedValue"],
    ["equalto", (a, b) => a.value === b.value],
    ["eq", (a, b) => a.value === b.value]
  ]);
  /**
   * Set the value of a variable in the current environment.
   */
  set(name, value) {
    return this.declareVariable(name, convertToRuntimeValues(value));
  }
  declareVariable(name, value) {
    if (this.variables.has(name)) {
      throw new SyntaxError(`Variable already declared: ${name}`);
    }
    this.variables.set(name, value);
    return value;
  }
  // private assignVariable(name: string, value: AnyRuntimeValue): AnyRuntimeValue {
  // 	const env = this.resolve(name);
  // 	env.variables.set(name, value);
  // 	return value;
  // }
  /**
   * Set variable in the current scope.
   * See https://jinja.palletsprojects.com/en/3.0.x/templates/#assignments for more information.
   */
  setVariable(name, value) {
    this.variables.set(name, value);
    return value;
  }
  /**
   * Resolve the environment in which the variable is declared.
   * @param {string} name The name of the variable.
   * @returns {Environment} The environment in which the variable is declared.
   */
  resolve(name) {
    if (this.variables.has(name)) {
      return this;
    }
    if (this.parent) {
      return this.parent.resolve(name);
    }
    throw new Error(`Unknown variable: ${name}`);
  }
  lookupVariable(name) {
    try {
      return this.resolve(name).variables.get(name) ?? new UndefinedValue();
    } catch {
      return new UndefinedValue();
    }
  }
};
function setupGlobals(env) {
  env.set("false", false);
  env.set("true", true);
  env.set("none", null);
  env.set("raise_exception", (args) => {
    throw new Error(args);
  });
  env.set("range", range);
  env.set("strftime_now", strftime_now);
  env.set("True", true);
  env.set("False", false);
  env.set("None", null);
}
var Interpreter = class {
  global;
  constructor(env) {
    this.global = env ?? new Environment();
  }
  /**
   * Run the program.
   */
  run(program) {
    return this.evaluate(program, this.global);
  }
  /**
   * Evaluates expressions following the binary operation type.
   */
  evaluateBinaryExpression(node, environment) {
    const left = this.evaluate(node.left, environment);
    switch (node.operator.value) {
      case "and":
        return left.__bool__().value ? this.evaluate(node.right, environment) : left;
      case "or":
        return left.__bool__().value ? left : this.evaluate(node.right, environment);
    }
    const right = this.evaluate(node.right, environment);
    switch (node.operator.value) {
      case "==":
        return new BooleanValue(left.value == right.value);
      case "!=":
        return new BooleanValue(left.value != right.value);
    }
    if (left instanceof UndefinedValue || right instanceof UndefinedValue) {
      if (right instanceof UndefinedValue && ["in", "not in"].includes(node.operator.value)) {
        return new BooleanValue(node.operator.value === "not in");
      }
      throw new Error(`Cannot perform operation ${node.operator.value} on undefined values`);
    } else if (left instanceof NullValue || right instanceof NullValue) {
      throw new Error("Cannot perform operation on null values");
    } else if (node.operator.value === "~") {
      return new StringValue(left.value.toString() + right.value.toString());
    } else if ((left instanceof IntegerValue || left instanceof FloatValue) && (right instanceof IntegerValue || right instanceof FloatValue)) {
      const a = left.value, b = right.value;
      switch (node.operator.value) {
        case "+":
        case "-":
        case "*": {
          const res = node.operator.value === "+" ? a + b : node.operator.value === "-" ? a - b : a * b;
          const isFloat = left instanceof FloatValue || right instanceof FloatValue;
          return isFloat ? new FloatValue(res) : new IntegerValue(res);
        }
        case "/":
          return new FloatValue(a / b);
        case "%": {
          const rem = a % b;
          const isFloat = left instanceof FloatValue || right instanceof FloatValue;
          return isFloat ? new FloatValue(rem) : new IntegerValue(rem);
        }
        case "<":
          return new BooleanValue(a < b);
        case ">":
          return new BooleanValue(a > b);
        case ">=":
          return new BooleanValue(a >= b);
        case "<=":
          return new BooleanValue(a <= b);
      }
    } else if (left instanceof ArrayValue && right instanceof ArrayValue) {
      switch (node.operator.value) {
        case "+":
          return new ArrayValue(left.value.concat(right.value));
      }
    } else if (right instanceof ArrayValue) {
      const member = right.value.find((x) => x.value === left.value) !== void 0;
      switch (node.operator.value) {
        case "in":
          return new BooleanValue(member);
        case "not in":
          return new BooleanValue(!member);
      }
    }
    if (left instanceof StringValue || right instanceof StringValue) {
      switch (node.operator.value) {
        case "+":
          return new StringValue(left.value.toString() + right.value.toString());
      }
    }
    if (left instanceof StringValue && right instanceof StringValue) {
      switch (node.operator.value) {
        case "in":
          return new BooleanValue(right.value.includes(left.value));
        case "not in":
          return new BooleanValue(!right.value.includes(left.value));
      }
    }
    if (left instanceof StringValue && right instanceof ObjectValue) {
      switch (node.operator.value) {
        case "in":
          return new BooleanValue(right.value.has(left.value));
        case "not in":
          return new BooleanValue(!right.value.has(left.value));
      }
    }
    throw new SyntaxError(`Unknown operator "${node.operator.value}" between ${left.type} and ${right.type}`);
  }
  evaluateArguments(args, environment) {
    const positionalArguments = [];
    const keywordArguments = /* @__PURE__ */ new Map();
    for (const argument of args) {
      if (argument.type === "SpreadExpression") {
        const spreadNode = argument;
        const val = this.evaluate(spreadNode.argument, environment);
        if (!(val instanceof ArrayValue)) {
          throw new Error(`Cannot unpack non-iterable type: ${val.type}`);
        }
        for (const item of val.value) {
          positionalArguments.push(item);
        }
      } else if (argument.type === "KeywordArgumentExpression") {
        const kwarg = argument;
        keywordArguments.set(kwarg.key.value, this.evaluate(kwarg.value, environment));
      } else {
        if (keywordArguments.size > 0) {
          throw new Error("Positional arguments must come before keyword arguments");
        }
        positionalArguments.push(this.evaluate(argument, environment));
      }
    }
    return [positionalArguments, keywordArguments];
  }
  applyFilter(operand, filterNode, environment) {
    if (filterNode.type === "Identifier") {
      const filter = filterNode;
      if (filter.value === "tojson") {
        return new StringValue(toJSON(operand));
      }
      if (operand instanceof ArrayValue) {
        switch (filter.value) {
          case "list":
            return operand;
          case "first":
            return operand.value[0];
          case "last":
            return operand.value[operand.value.length - 1];
          case "length":
            return new IntegerValue(operand.value.length);
          case "reverse":
            return new ArrayValue(operand.value.reverse());
          case "sort":
            return new ArrayValue(
              operand.value.sort((a, b) => {
                if (a.type !== b.type) {
                  throw new Error(`Cannot compare different types: ${a.type} and ${b.type}`);
                }
                switch (a.type) {
                  case "IntegerValue":
                  case "FloatValue":
                    return a.value - b.value;
                  case "StringValue":
                    return a.value.localeCompare(b.value);
                  default:
                    throw new Error(`Cannot compare type: ${a.type}`);
                }
              })
            );
          case "join":
            return new StringValue(operand.value.map((x) => x.value).join(""));
          case "string":
            return new StringValue(toJSON(operand));
          case "unique": {
            const seen = /* @__PURE__ */ new Set();
            const output = [];
            for (const item of operand.value) {
              if (!seen.has(item.value)) {
                seen.add(item.value);
                output.push(item);
              }
            }
            return new ArrayValue(output);
          }
          default:
            throw new Error(`Unknown ArrayValue filter: ${filter.value}`);
        }
      } else if (operand instanceof StringValue) {
        switch (filter.value) {
          case "length":
          case "upper":
          case "lower":
          case "title":
          case "capitalize": {
            const builtin = operand.builtins.get(filter.value);
            if (builtin instanceof FunctionValue) {
              return builtin.value(
                /* no arguments */
                [],
                environment
              );
            } else if (builtin instanceof IntegerValue) {
              return builtin;
            } else {
              throw new Error(`Unknown StringValue filter: ${filter.value}`);
            }
          }
          case "trim":
            return new StringValue(operand.value.trim());
          case "indent":
            return new StringValue(
              operand.value.split("\n").map(
                (x, i) => (
                  // By default, don't indent the first line or empty lines
                  i === 0 || x.length === 0 ? x : "    " + x
                )
              ).join("\n")
            );
          case "join":
          case "string":
            return operand;
          case "int": {
            const val = parseInt(operand.value, 10);
            return new IntegerValue(isNaN(val) ? 0 : val);
          }
          case "float": {
            const val = parseFloat(operand.value);
            return new FloatValue(isNaN(val) ? 0 : val);
          }
          default:
            throw new Error(`Unknown StringValue filter: ${filter.value}`);
        }
      } else if (operand instanceof IntegerValue || operand instanceof FloatValue) {
        switch (filter.value) {
          case "abs":
            return operand instanceof IntegerValue ? new IntegerValue(Math.abs(operand.value)) : new FloatValue(Math.abs(operand.value));
          case "int":
            return new IntegerValue(Math.floor(operand.value));
          case "float":
            return new FloatValue(operand.value);
          default:
            throw new Error(`Unknown NumericValue filter: ${filter.value}`);
        }
      } else if (operand instanceof ObjectValue) {
        switch (filter.value) {
          case "items":
            return new ArrayValue(
              Array.from(operand.value.entries()).map(([key, value]) => new ArrayValue([new StringValue(key), value]))
            );
          case "length":
            return new IntegerValue(operand.value.size);
          default:
            throw new Error(`Unknown ObjectValue filter: ${filter.value}`);
        }
      } else if (operand instanceof BooleanValue) {
        switch (filter.value) {
          case "bool":
            return new BooleanValue(operand.value);
          case "int":
            return new IntegerValue(operand.value ? 1 : 0);
          case "float":
            return new FloatValue(operand.value ? 1 : 0);
          case "string":
            return new StringValue(operand.value ? "true" : "false");
          default:
            throw new Error(`Unknown BooleanValue filter: ${filter.value}`);
        }
      }
      throw new Error(`Cannot apply filter "${filter.value}" to type: ${operand.type}`);
    } else if (filterNode.type === "CallExpression") {
      const filter = filterNode;
      if (filter.callee.type !== "Identifier") {
        throw new Error(`Unknown filter: ${filter.callee.type}`);
      }
      const filterName = filter.callee.value;
      if (filterName === "tojson") {
        const [, kwargs] = this.evaluateArguments(filter.args, environment);
        const indent = kwargs.get("indent") ?? new NullValue();
        if (!(indent instanceof IntegerValue || indent instanceof NullValue)) {
          throw new Error("If set, indent must be a number");
        }
        return new StringValue(toJSON(operand, indent.value));
      } else if (filterName === "join") {
        let value;
        if (operand instanceof StringValue) {
          value = Array.from(operand.value);
        } else if (operand instanceof ArrayValue) {
          value = operand.value.map((x) => x.value);
        } else {
          throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
        }
        const [args, kwargs] = this.evaluateArguments(filter.args, environment);
        const separator = args.at(0) ?? kwargs.get("separator") ?? new StringValue("");
        if (!(separator instanceof StringValue)) {
          throw new Error("separator must be a string");
        }
        return new StringValue(value.join(separator.value));
      } else if (filterName === "int" || filterName === "float") {
        const [args, kwargs] = this.evaluateArguments(filter.args, environment);
        const defaultValue = args.at(0) ?? kwargs.get("default") ?? (filterName === "int" ? new IntegerValue(0) : new FloatValue(0));
        if (operand instanceof StringValue) {
          const val = filterName === "int" ? parseInt(operand.value, 10) : parseFloat(operand.value);
          return isNaN(val) ? defaultValue : filterName === "int" ? new IntegerValue(val) : new FloatValue(val);
        } else if (operand instanceof IntegerValue || operand instanceof FloatValue) {
          return operand;
        } else if (operand instanceof BooleanValue) {
          return filterName === "int" ? new IntegerValue(operand.value ? 1 : 0) : new FloatValue(operand.value ? 1 : 0);
        } else {
          throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
        }
      } else if (filterName === "default") {
        const [args, kwargs] = this.evaluateArguments(filter.args, environment);
        const defaultValue = args[0] ?? new StringValue("");
        const booleanValue = args[1] ?? kwargs.get("boolean") ?? new BooleanValue(false);
        if (!(booleanValue instanceof BooleanValue)) {
          throw new Error("`default` filter flag must be a boolean");
        }
        if (operand instanceof UndefinedValue || booleanValue.value && !operand.__bool__().value) {
          return defaultValue;
        }
        return operand;
      }
      if (operand instanceof ArrayValue) {
        switch (filterName) {
          case "selectattr":
          case "rejectattr": {
            const select = filterName === "selectattr";
            if (operand.value.some((x) => !(x instanceof ObjectValue))) {
              throw new Error(`\`${filterName}\` can only be applied to array of objects`);
            }
            if (filter.args.some((x) => x.type !== "StringLiteral")) {
              throw new Error(`arguments of \`${filterName}\` must be strings`);
            }
            const [attr, testName, value] = filter.args.map((x) => this.evaluate(x, environment));
            let testFunction;
            if (testName) {
              const test = environment.tests.get(testName.value);
              if (!test) {
                throw new Error(`Unknown test: ${testName.value}`);
              }
              testFunction = test;
            } else {
              testFunction = (...x) => x[0].__bool__().value;
            }
            const filtered = operand.value.filter((item) => {
              const a = item.value.get(attr.value);
              const result = a ? testFunction(a, value) : false;
              return select ? result : !result;
            });
            return new ArrayValue(filtered);
          }
          case "map": {
            const [, kwargs] = this.evaluateArguments(filter.args, environment);
            if (kwargs.has("attribute")) {
              const attr = kwargs.get("attribute");
              if (!(attr instanceof StringValue)) {
                throw new Error("attribute must be a string");
              }
              const defaultValue = kwargs.get("default");
              const mapped = operand.value.map((item) => {
                if (!(item instanceof ObjectValue)) {
                  throw new Error("items in map must be an object");
                }
                return item.value.get(attr.value) ?? defaultValue ?? new UndefinedValue();
              });
              return new ArrayValue(mapped);
            } else {
              throw new Error("`map` expressions without `attribute` set are not currently supported.");
            }
          }
        }
        throw new Error(`Unknown ArrayValue filter: ${filterName}`);
      } else if (operand instanceof StringValue) {
        switch (filterName) {
          case "indent": {
            const [args, kwargs] = this.evaluateArguments(filter.args, environment);
            const width = args.at(0) ?? kwargs.get("width") ?? new IntegerValue(4);
            if (!(width instanceof IntegerValue)) {
              throw new Error("width must be a number");
            }
            const first = args.at(1) ?? kwargs.get("first") ?? new BooleanValue(false);
            const blank = args.at(2) ?? kwargs.get("blank") ?? new BooleanValue(false);
            const lines = operand.value.split("\n");
            const indent = " ".repeat(width.value);
            const indented = lines.map(
              (x, i) => !first.value && i === 0 || !blank.value && x.length === 0 ? x : indent + x
            );
            return new StringValue(indented.join("\n"));
          }
          case "replace": {
            const replaceFn = operand.builtins.get("replace");
            if (!(replaceFn instanceof FunctionValue)) {
              throw new Error("replace filter not available");
            }
            const [args, kwargs] = this.evaluateArguments(filter.args, environment);
            return replaceFn.value([...args, new KeywordArgumentsValue(kwargs)], environment);
          }
        }
        throw new Error(`Unknown StringValue filter: ${filterName}`);
      } else {
        throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
      }
    }
    throw new Error(`Unknown filter: ${filterNode.type}`);
  }
  /**
   * Evaluates expressions following the filter operation type.
   */
  evaluateFilterExpression(node, environment) {
    const operand = this.evaluate(node.operand, environment);
    return this.applyFilter(operand, node.filter, environment);
  }
  /**
   * Evaluates expressions following the test operation type.
   */
  evaluateTestExpression(node, environment) {
    const operand = this.evaluate(node.operand, environment);
    const test = environment.tests.get(node.test.value);
    if (!test) {
      throw new Error(`Unknown test: ${node.test.value}`);
    }
    const result = test(operand);
    return new BooleanValue(node.negate ? !result : result);
  }
  /**
   * Evaluates expressions following the select operation type.
   */
  evaluateSelectExpression(node, environment) {
    const predicate = this.evaluate(node.test, environment);
    if (!predicate.__bool__().value) {
      return new UndefinedValue();
    }
    return this.evaluate(node.lhs, environment);
  }
  /**
   * Evaluates expressions following the unary operation type.
   */
  evaluateUnaryExpression(node, environment) {
    const argument = this.evaluate(node.argument, environment);
    switch (node.operator.value) {
      case "not":
        return new BooleanValue(!argument.value);
      default:
        throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
    }
  }
  evaluateTernaryExpression(node, environment) {
    const cond = this.evaluate(node.condition, environment);
    return cond.__bool__().value ? this.evaluate(node.trueExpr, environment) : this.evaluate(node.falseExpr, environment);
  }
  evalProgram(program, environment) {
    return this.evaluateBlock(program.body, environment);
  }
  evaluateBlock(statements, environment) {
    let result = "";
    for (const statement of statements) {
      const lastEvaluated = this.evaluate(statement, environment);
      if (lastEvaluated.type !== "NullValue" && lastEvaluated.type !== "UndefinedValue") {
        result += lastEvaluated.toString();
      }
    }
    return new StringValue(result);
  }
  evaluateIdentifier(node, environment) {
    return environment.lookupVariable(node.value);
  }
  evaluateCallExpression(expr, environment) {
    const [args, kwargs] = this.evaluateArguments(expr.args, environment);
    if (kwargs.size > 0) {
      args.push(new KeywordArgumentsValue(kwargs));
    }
    const fn = this.evaluate(expr.callee, environment);
    if (fn.type !== "FunctionValue") {
      throw new Error(`Cannot call something that is not a function: got ${fn.type}`);
    }
    return fn.value(args, environment);
  }
  evaluateSliceExpression(object, expr, environment) {
    if (!(object instanceof ArrayValue || object instanceof StringValue)) {
      throw new Error("Slice object must be an array or string");
    }
    const start = this.evaluate(expr.start, environment);
    const stop = this.evaluate(expr.stop, environment);
    const step = this.evaluate(expr.step, environment);
    if (!(start instanceof IntegerValue || start instanceof UndefinedValue)) {
      throw new Error("Slice start must be numeric or undefined");
    }
    if (!(stop instanceof IntegerValue || stop instanceof UndefinedValue)) {
      throw new Error("Slice stop must be numeric or undefined");
    }
    if (!(step instanceof IntegerValue || step instanceof UndefinedValue)) {
      throw new Error("Slice step must be numeric or undefined");
    }
    if (object instanceof ArrayValue) {
      return new ArrayValue(slice(object.value, start.value, stop.value, step.value));
    } else {
      return new StringValue(slice(Array.from(object.value), start.value, stop.value, step.value).join(""));
    }
  }
  evaluateMemberExpression(expr, environment) {
    const object = this.evaluate(expr.object, environment);
    let property;
    if (expr.computed) {
      if (expr.property.type === "SliceExpression") {
        return this.evaluateSliceExpression(object, expr.property, environment);
      } else {
        property = this.evaluate(expr.property, environment);
      }
    } else {
      property = new StringValue(expr.property.value);
    }
    let value;
    if (object instanceof ObjectValue) {
      if (!(property instanceof StringValue)) {
        throw new Error(`Cannot access property with non-string: got ${property.type}`);
      }
      value = object.value.get(property.value) ?? object.builtins.get(property.value);
    } else if (object instanceof ArrayValue || object instanceof StringValue) {
      if (property instanceof IntegerValue) {
        value = object.value.at(property.value);
        if (object instanceof StringValue) {
          value = new StringValue(object.value.at(property.value));
        }
      } else if (property instanceof StringValue) {
        value = object.builtins.get(property.value);
      } else {
        throw new Error(`Cannot access property with non-string/non-number: got ${property.type}`);
      }
    } else {
      if (!(property instanceof StringValue)) {
        throw new Error(`Cannot access property with non-string: got ${property.type}`);
      }
      value = object.builtins.get(property.value);
    }
    return value instanceof RuntimeValue ? value : new UndefinedValue();
  }
  evaluateSet(node, environment) {
    const rhs = node.value ? this.evaluate(node.value, environment) : this.evaluateBlock(node.body, environment);
    if (node.assignee.type === "Identifier") {
      const variableName = node.assignee.value;
      environment.setVariable(variableName, rhs);
    } else if (node.assignee.type === "TupleLiteral") {
      const tuple = node.assignee;
      if (!(rhs instanceof ArrayValue)) {
        throw new Error(`Cannot unpack non-iterable type in set: ${rhs.type}`);
      }
      const arr = rhs.value;
      if (arr.length !== tuple.value.length) {
        throw new Error(`Too ${tuple.value.length > arr.length ? "few" : "many"} items to unpack in set`);
      }
      for (let i = 0; i < tuple.value.length; ++i) {
        const elem = tuple.value[i];
        if (elem.type !== "Identifier") {
          throw new Error(`Cannot unpack to non-identifier in set: ${elem.type}`);
        }
        environment.setVariable(elem.value, arr[i]);
      }
    } else if (node.assignee.type === "MemberExpression") {
      const member = node.assignee;
      const object = this.evaluate(member.object, environment);
      if (!(object instanceof ObjectValue)) {
        throw new Error("Cannot assign to member of non-object");
      }
      if (member.property.type !== "Identifier") {
        throw new Error("Cannot assign to member with non-identifier property");
      }
      object.value.set(member.property.value, rhs);
    } else {
      throw new Error(`Invalid LHS inside assignment expression: ${JSON.stringify(node.assignee)}`);
    }
    return new NullValue();
  }
  evaluateIf(node, environment) {
    const test = this.evaluate(node.test, environment);
    return this.evaluateBlock(test.__bool__().value ? node.body : node.alternate, environment);
  }
  evaluateFor(node, environment) {
    const scope = new Environment(environment);
    let test, iterable;
    if (node.iterable.type === "SelectExpression") {
      const select = node.iterable;
      iterable = this.evaluate(select.lhs, scope);
      test = select.test;
    } else {
      iterable = this.evaluate(node.iterable, scope);
    }
    if (!(iterable instanceof ArrayValue || iterable instanceof ObjectValue)) {
      throw new Error(`Expected iterable or object type in for loop: got ${iterable.type}`);
    }
    if (iterable instanceof ObjectValue) {
      iterable = iterable.keys();
    }
    const items = [];
    const scopeUpdateFunctions = [];
    for (let i = 0; i < iterable.value.length; ++i) {
      const loopScope = new Environment(scope);
      const current = iterable.value[i];
      let scopeUpdateFunction;
      if (node.loopvar.type === "Identifier") {
        scopeUpdateFunction = (scope2) => scope2.setVariable(node.loopvar.value, current);
      } else if (node.loopvar.type === "TupleLiteral") {
        const loopvar = node.loopvar;
        if (current.type !== "ArrayValue") {
          throw new Error(`Cannot unpack non-iterable type: ${current.type}`);
        }
        const c = current;
        if (loopvar.value.length !== c.value.length) {
          throw new Error(`Too ${loopvar.value.length > c.value.length ? "few" : "many"} items to unpack`);
        }
        scopeUpdateFunction = (scope2) => {
          for (let j = 0; j < loopvar.value.length; ++j) {
            if (loopvar.value[j].type !== "Identifier") {
              throw new Error(`Cannot unpack non-identifier type: ${loopvar.value[j].type}`);
            }
            scope2.setVariable(loopvar.value[j].value, c.value[j]);
          }
        };
      } else {
        throw new Error(`Invalid loop variable(s): ${node.loopvar.type}`);
      }
      if (test) {
        scopeUpdateFunction(loopScope);
        const testValue = this.evaluate(test, loopScope);
        if (!testValue.__bool__().value) {
          continue;
        }
      }
      items.push(current);
      scopeUpdateFunctions.push(scopeUpdateFunction);
    }
    let result = "";
    let noIteration = true;
    for (let i = 0; i < items.length; ++i) {
      const loop = /* @__PURE__ */ new Map([
        ["index", new IntegerValue(i + 1)],
        ["index0", new IntegerValue(i)],
        ["revindex", new IntegerValue(items.length - i)],
        ["revindex0", new IntegerValue(items.length - i - 1)],
        ["first", new BooleanValue(i === 0)],
        ["last", new BooleanValue(i === items.length - 1)],
        ["length", new IntegerValue(items.length)],
        ["previtem", i > 0 ? items[i - 1] : new UndefinedValue()],
        ["nextitem", i < items.length - 1 ? items[i + 1] : new UndefinedValue()]
      ]);
      scope.setVariable("loop", new ObjectValue(loop));
      scopeUpdateFunctions[i](scope);
      try {
        const evaluated = this.evaluateBlock(node.body, scope);
        result += evaluated.value;
      } catch (err) {
        if (err instanceof ContinueControl) {
          continue;
        }
        if (err instanceof BreakControl) {
          break;
        }
        throw err;
      }
      noIteration = false;
    }
    if (noIteration) {
      const defaultEvaluated = this.evaluateBlock(node.defaultBlock, scope);
      result += defaultEvaluated.value;
    }
    return new StringValue(result);
  }
  /**
   * See https://jinja.palletsprojects.com/en/3.1.x/templates/#macros for more information.
   */
  evaluateMacro(node, environment) {
    environment.setVariable(
      node.name.value,
      new FunctionValue((args, scope) => {
        const macroScope = new Environment(scope);
        args = args.slice();
        let kwargs;
        if (args.at(-1)?.type === "KeywordArgumentsValue") {
          kwargs = args.pop();
        }
        for (let i = 0; i < node.args.length; ++i) {
          const nodeArg = node.args[i];
          const passedArg = args[i];
          if (nodeArg.type === "Identifier") {
            const identifier = nodeArg;
            if (!passedArg) {
              throw new Error(`Missing positional argument: ${identifier.value}`);
            }
            macroScope.setVariable(identifier.value, passedArg);
          } else if (nodeArg.type === "KeywordArgumentExpression") {
            const kwarg = nodeArg;
            const value = passedArg ?? // Try positional arguments first
            kwargs?.value.get(kwarg.key.value) ?? // Look in user-passed kwargs
            this.evaluate(kwarg.value, macroScope);
            macroScope.setVariable(kwarg.key.value, value);
          } else {
            throw new Error(`Unknown argument type: ${nodeArg.type}`);
          }
        }
        return this.evaluateBlock(node.body, macroScope);
      })
    );
    return new NullValue();
  }
  evaluateCallStatement(node, environment) {
    const callerFn = new FunctionValue((callerArgs, callerEnv) => {
      const callBlockEnv = new Environment(callerEnv);
      if (node.callerArgs) {
        for (let i = 0; i < node.callerArgs.length; ++i) {
          const param = node.callerArgs[i];
          if (param.type !== "Identifier") {
            throw new Error(`Caller parameter must be an identifier, got ${param.type}`);
          }
          callBlockEnv.setVariable(param.value, callerArgs[i] ?? new UndefinedValue());
        }
      }
      return this.evaluateBlock(node.body, callBlockEnv);
    });
    const [macroArgs, macroKwargs] = this.evaluateArguments(node.call.args, environment);
    macroArgs.push(new KeywordArgumentsValue(macroKwargs));
    const fn = this.evaluate(node.call.callee, environment);
    if (fn.type !== "FunctionValue") {
      throw new Error(`Cannot call something that is not a function: got ${fn.type}`);
    }
    const newEnv = new Environment(environment);
    newEnv.setVariable("caller", callerFn);
    return fn.value(macroArgs, newEnv);
  }
  evaluateFilterStatement(node, environment) {
    const rendered = this.evaluateBlock(node.body, environment);
    return this.applyFilter(rendered, node.filter, environment);
  }
  evaluate(statement, environment) {
    if (!statement)
      return new UndefinedValue();
    switch (statement.type) {
      case "Program":
        return this.evalProgram(statement, environment);
      case "Set":
        return this.evaluateSet(statement, environment);
      case "If":
        return this.evaluateIf(statement, environment);
      case "For":
        return this.evaluateFor(statement, environment);
      case "Macro":
        return this.evaluateMacro(statement, environment);
      case "CallStatement":
        return this.evaluateCallStatement(statement, environment);
      case "Break":
        throw new BreakControl();
      case "Continue":
        throw new ContinueControl();
      case "IntegerLiteral":
        return new IntegerValue(statement.value);
      case "FloatLiteral":
        return new FloatValue(statement.value);
      case "StringLiteral":
        return new StringValue(statement.value);
      case "ArrayLiteral":
        return new ArrayValue(statement.value.map((x) => this.evaluate(x, environment)));
      case "TupleLiteral":
        return new TupleValue(statement.value.map((x) => this.evaluate(x, environment)));
      case "ObjectLiteral": {
        const mapping = /* @__PURE__ */ new Map();
        for (const [key, value] of statement.value) {
          const evaluatedKey = this.evaluate(key, environment);
          if (!(evaluatedKey instanceof StringValue)) {
            throw new Error(`Object keys must be strings: got ${evaluatedKey.type}`);
          }
          mapping.set(evaluatedKey.value, this.evaluate(value, environment));
        }
        return new ObjectValue(mapping);
      }
      case "Identifier":
        return this.evaluateIdentifier(statement, environment);
      case "CallExpression":
        return this.evaluateCallExpression(statement, environment);
      case "MemberExpression":
        return this.evaluateMemberExpression(statement, environment);
      case "UnaryExpression":
        return this.evaluateUnaryExpression(statement, environment);
      case "BinaryExpression":
        return this.evaluateBinaryExpression(statement, environment);
      case "FilterExpression":
        return this.evaluateFilterExpression(statement, environment);
      case "FilterStatement":
        return this.evaluateFilterStatement(statement, environment);
      case "TestExpression":
        return this.evaluateTestExpression(statement, environment);
      case "SelectExpression":
        return this.evaluateSelectExpression(statement, environment);
      case "Ternary":
        return this.evaluateTernaryExpression(statement, environment);
      case "Comment":
        return new NullValue();
      default:
        throw new SyntaxError(`Unknown node type: ${statement.type}`);
    }
  }
};
function convertToRuntimeValues(input) {
  switch (typeof input) {
    case "number":
      return Number.isInteger(input) ? new IntegerValue(input) : new FloatValue(input);
    case "string":
      return new StringValue(input);
    case "boolean":
      return new BooleanValue(input);
    case "undefined":
      return new UndefinedValue();
    case "object":
      if (input === null) {
        return new NullValue();
      } else if (Array.isArray(input)) {
        return new ArrayValue(input.map(convertToRuntimeValues));
      } else {
        return new ObjectValue(
          new Map(Object.entries(input).map(([key, value]) => [key, convertToRuntimeValues(value)]))
        );
      }
    case "function":
      return new FunctionValue((args, _scope) => {
        const result = input(...args.map((x) => x.value)) ?? null;
        return convertToRuntimeValues(result);
      });
    default:
      throw new Error(`Cannot convert to runtime value: ${input}`);
  }
}
function toJSON(input, indent, depth) {
  const currentDepth = depth ?? 0;
  switch (input.type) {
    case "NullValue":
    case "UndefinedValue":
      return "null";
    case "IntegerValue":
    case "FloatValue":
    case "StringValue":
    case "BooleanValue":
      return JSON.stringify(input.value);
    case "ArrayValue":
    case "ObjectValue": {
      const indentValue = indent ? " ".repeat(indent) : "";
      const basePadding = "\n" + indentValue.repeat(currentDepth);
      const childrenPadding = basePadding + indentValue;
      if (input.type === "ArrayValue") {
        const core = input.value.map((x) => toJSON(x, indent, currentDepth + 1));
        return indent ? `[${childrenPadding}${core.join(`,${childrenPadding}`)}${basePadding}]` : `[${core.join(", ")}]`;
      } else {
        const core = Array.from(input.value.entries()).map(([key, value]) => {
          const v = `"${key}": ${toJSON(value, indent, currentDepth + 1)}`;
          return indent ? `${childrenPadding}${v}` : v;
        });
        return indent ? `{${core.join(",")}${basePadding}}` : `{${core.join(", ")}}`;
      }
    }
    default:
      throw new Error(`Cannot convert to JSON: ${input.type}`);
  }
}

// src/format.ts
var NEWLINE = "\n";
var OPEN_STATEMENT = "{%- ";
var CLOSE_STATEMENT = " -%}";
function getBinaryOperatorPrecedence(expr) {
  switch (expr.operator.type) {
    case "MultiplicativeBinaryOperator":
      return 4;
    case "AdditiveBinaryOperator":
      return 3;
    case "ComparisonBinaryOperator":
      return 2;
    case "Identifier":
      if (expr.operator.value === "and")
        return 1;
      if (expr.operator.value === "in" || expr.operator.value === "not in")
        return 2;
      return 0;
  }
  return 0;
}
function format(program, indent = "	") {
  const indentStr = typeof indent === "number" ? " ".repeat(indent) : indent;
  const body = formatStatements(program.body, 0, indentStr);
  return body.replace(/\n$/, "");
}
function createStatement(...text) {
  return OPEN_STATEMENT + text.join(" ") + CLOSE_STATEMENT;
}
function formatStatements(stmts, depth, indentStr) {
  return stmts.map((stmt) => formatStatement(stmt, depth, indentStr)).join(NEWLINE);
}
function formatStatement(node, depth, indentStr) {
  const pad = indentStr.repeat(depth);
  switch (node.type) {
    case "Program":
      return formatStatements(node.body, depth, indentStr);
    case "If":
      return formatIf(node, depth, indentStr);
    case "For":
      return formatFor(node, depth, indentStr);
    case "Set":
      return formatSet(node, depth, indentStr);
    case "Macro":
      return formatMacro(node, depth, indentStr);
    case "Break":
      return pad + createStatement("break");
    case "Continue":
      return pad + createStatement("continue");
    case "CallStatement":
      return formatCallStatement(node, depth, indentStr);
    case "FilterStatement":
      return formatFilterStatement(node, depth, indentStr);
    case "Comment":
      return pad + "{# " + node.value + " #}";
    default:
      return pad + "{{- " + formatExpression(node) + " -}}";
  }
}
function formatIf(node, depth, indentStr) {
  const pad = indentStr.repeat(depth);
  const clauses = [];
  let current = node;
  while (current) {
    clauses.push({ test: current.test, body: current.body });
    if (current.alternate.length === 1 && current.alternate[0].type === "If") {
      current = current.alternate[0];
    } else {
      break;
    }
  }
  let out = pad + createStatement("if", formatExpression(clauses[0].test)) + NEWLINE + formatStatements(clauses[0].body, depth + 1, indentStr);
  for (let i = 1; i < clauses.length; ++i) {
    out += NEWLINE + pad + createStatement("elif", formatExpression(clauses[i].test)) + NEWLINE + formatStatements(clauses[i].body, depth + 1, indentStr);
  }
  if (current && current.alternate.length > 0) {
    out += NEWLINE + pad + createStatement("else") + NEWLINE + formatStatements(current.alternate, depth + 1, indentStr);
  }
  out += NEWLINE + pad + createStatement("endif");
  return out;
}
function formatFor(node, depth, indentStr) {
  const pad = indentStr.repeat(depth);
  let formattedIterable = "";
  if (node.iterable.type === "SelectExpression") {
    const n = node.iterable;
    formattedIterable = `${formatExpression(n.lhs)} if ${formatExpression(n.test)}`;
  } else {
    formattedIterable = formatExpression(node.iterable);
  }
  let out = pad + createStatement("for", formatExpression(node.loopvar), "in", formattedIterable) + NEWLINE + formatStatements(node.body, depth + 1, indentStr);
  if (node.defaultBlock.length > 0) {
    out += NEWLINE + pad + createStatement("else") + NEWLINE + formatStatements(node.defaultBlock, depth + 1, indentStr);
  }
  out += NEWLINE + pad + createStatement("endfor");
  return out;
}
function formatSet(node, depth, indentStr) {
  const pad = indentStr.repeat(depth);
  const left = formatExpression(node.assignee);
  const right = node.value ? formatExpression(node.value) : "";
  const value = pad + createStatement("set", `${left}${node.value ? " = " + right : ""}`);
  if (node.body.length === 0) {
    return value;
  }
  return value + NEWLINE + formatStatements(node.body, depth + 1, indentStr) + NEWLINE + pad + createStatement("endset");
}
function formatMacro(node, depth, indentStr) {
  const pad = indentStr.repeat(depth);
  const args = node.args.map(formatExpression).join(", ");
  return pad + createStatement("macro", `${node.name.value}(${args})`) + NEWLINE + formatStatements(node.body, depth + 1, indentStr) + NEWLINE + pad + createStatement("endmacro");
}
function formatCallStatement(node, depth, indentStr) {
  const pad = indentStr.repeat(depth);
  const params = node.callerArgs && node.callerArgs.length > 0 ? `(${node.callerArgs.map(formatExpression).join(", ")})` : "";
  const callExpr = formatExpression(node.call);
  let out = pad + createStatement(`call${params}`, callExpr) + NEWLINE;
  out += formatStatements(node.body, depth + 1, indentStr) + NEWLINE;
  out += pad + createStatement("endcall");
  return out;
}
function formatFilterStatement(node, depth, indentStr) {
  const pad = indentStr.repeat(depth);
  const spec = node.filter.type === "Identifier" ? node.filter.value : formatExpression(node.filter);
  let out = pad + createStatement("filter", spec) + NEWLINE;
  out += formatStatements(node.body, depth + 1, indentStr) + NEWLINE;
  out += pad + createStatement("endfilter");
  return out;
}
function formatExpression(node, parentPrec = -1) {
  switch (node.type) {
    case "SpreadExpression": {
      const n = node;
      return `*${formatExpression(n.argument)}`;
    }
    case "Identifier":
      return node.value;
    case "IntegerLiteral":
      return `${node.value}`;
    case "FloatLiteral":
      return `${node.value}`;
    case "StringLiteral":
      return JSON.stringify(node.value);
    case "BinaryExpression": {
      const n = node;
      const thisPrecedence = getBinaryOperatorPrecedence(n);
      const left = formatExpression(n.left, thisPrecedence);
      const right = formatExpression(n.right, thisPrecedence + 1);
      const expr = `${left} ${n.operator.value} ${right}`;
      return thisPrecedence < parentPrec ? `(${expr})` : expr;
    }
    case "UnaryExpression": {
      const n = node;
      const val = n.operator.value + (n.operator.value === "not" ? " " : "") + formatExpression(n.argument, Infinity);
      return val;
    }
    case "CallExpression": {
      const n = node;
      const args = n.args.map(formatExpression).join(", ");
      return `${formatExpression(n.callee)}(${args})`;
    }
    case "MemberExpression": {
      const n = node;
      let obj = formatExpression(n.object);
      if (![
        "Identifier",
        "MemberExpression",
        "CallExpression",
        "StringLiteral",
        "IntegerLiteral",
        "FloatLiteral",
        "ArrayLiteral",
        "TupleLiteral",
        "ObjectLiteral"
      ].includes(n.object.type)) {
        obj = `(${obj})`;
      }
      let prop = formatExpression(n.property);
      if (!n.computed && n.property.type !== "Identifier") {
        prop = `(${prop})`;
      }
      return n.computed ? `${obj}[${prop}]` : `${obj}.${prop}`;
    }
    case "FilterExpression": {
      const n = node;
      const operand = formatExpression(n.operand, Infinity);
      if (n.filter.type === "CallExpression") {
        return `${operand} | ${formatExpression(n.filter)}`;
      }
      return `${operand} | ${n.filter.value}`;
    }
    case "SelectExpression": {
      const n = node;
      return `${formatExpression(n.lhs)} if ${formatExpression(n.test)}`;
    }
    case "TestExpression": {
      const n = node;
      return `${formatExpression(n.operand)} is${n.negate ? " not" : ""} ${n.test.value}`;
    }
    case "ArrayLiteral":
    case "TupleLiteral": {
      const elems = node.value.map(formatExpression);
      const brackets = node.type === "ArrayLiteral" ? "[]" : "()";
      return `${brackets[0]}${elems.join(", ")}${brackets[1]}`;
    }
    case "ObjectLiteral": {
      const entries = Array.from(node.value.entries()).map(
        ([k, v]) => `${formatExpression(k)}: ${formatExpression(v)}`
      );
      return `{${entries.join(", ")}}`;
    }
    case "SliceExpression": {
      const n = node;
      const s = n.start ? formatExpression(n.start) : "";
      const t = n.stop ? formatExpression(n.stop) : "";
      const st = n.step ? `:${formatExpression(n.step)}` : "";
      return `${s}:${t}${st}`;
    }
    case "KeywordArgumentExpression": {
      const n = node;
      return `${n.key.value}=${formatExpression(n.value)}`;
    }
    case "Ternary": {
      const n = node;
      const expr = `${formatExpression(n.trueExpr)} if ${formatExpression(n.condition, 0)} else ${formatExpression(
        n.falseExpr
      )}`;
      return parentPrec > -1 ? `(${expr})` : expr;
    }
    default:
      throw new Error(`Unknown expression type: ${node.type}`);
  }
}

// src/index.ts
var Template = class {
  parsed;
  /**
   * @param {string} template The template string
   */
  constructor(template) {
    const tokens = tokenize(template, {
      lstrip_blocks: true,
      trim_blocks: true
    });
    this.parsed = parse(tokens);
  }
  render(items) {
    const env = new Environment();
    setupGlobals(env);
    if (items) {
      for (const [key, value] of Object.entries(items)) {
        env.set(key, value);
      }
    }
    const interpreter = new Interpreter(env);
    const result = interpreter.run(this.parsed);
    return result.value;
  }
  format(options) {
    return format(this.parsed, options?.indent || "	");
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Environment,
  Interpreter,
  Template,
  parse,
  tokenize
});
