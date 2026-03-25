"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArgumentPlaceholder = ArgumentPlaceholder;
exports.ArrayPattern = exports.ArrayExpression = ArrayExpression;
exports.BigIntLiteral = BigIntLiteral;
exports.BooleanLiteral = BooleanLiteral;
exports.Identifier = Identifier;
exports.NullLiteral = NullLiteral;
exports.NumericLiteral = NumericLiteral;
exports.ObjectPattern = exports.ObjectExpression = ObjectExpression;
exports.ObjectMethod = ObjectMethod;
exports.ObjectProperty = ObjectProperty;
exports.PipelineBareFunction = PipelineBareFunction;
exports.PipelinePrimaryTopicReference = PipelinePrimaryTopicReference;
exports.PipelineTopicExpression = PipelineTopicExpression;
exports.RecordExpression = RecordExpression;
exports.RegExpLiteral = RegExpLiteral;
exports.SpreadElement = exports.RestElement = RestElement;
exports.StringLiteral = StringLiteral;
exports.TopicReference = TopicReference;
exports.TupleExpression = TupleExpression;
exports.VoidPattern = VoidPattern;
exports._getRawIdentifier = _getRawIdentifier;
var _t = require("@babel/types");
var _jsesc = require("jsesc");
const {
  isAssignmentPattern,
  isIdentifier
} = _t;
let lastRawIdentNode = null;
let lastRawIdentResult = "";
function _getRawIdentifier(node) {
  if (node === lastRawIdentNode) return lastRawIdentResult;
  lastRawIdentNode = node;
  const {
    name
  } = node;
  const token = this.tokenMap.find(node, tok => tok.value === name);
  if (token) {
    lastRawIdentResult = this._originalCode.slice(token.start, token.end);
    return lastRawIdentResult;
  }
  return lastRawIdentResult = node.name;
}
function Identifier(node) {
  var _node$loc;
  this.sourceIdentifierName(((_node$loc = node.loc) == null ? void 0 : _node$loc.identifierName) || node.name);
  this.word(this.tokenMap ? this._getRawIdentifier(node) : node.name);
}
function ArgumentPlaceholder() {
  this.tokenChar(63);
}
function RestElement(node) {
  this.token("...");
  this.print(node.argument);
}
function ObjectExpression(node) {
  const props = node.properties;
  this.tokenChar(123);
  if (props.length) {
    const exit = this.enterDelimited();
    this.space();
    this.printList(props, this.shouldPrintTrailingComma("}"), true, true);
    this.space();
    exit();
  }
  this.sourceWithOffset("end", node.loc, -1);
  this.tokenChar(125);
}
function ObjectMethod(node) {
  this.printJoin(node.decorators);
  this._methodHead(node);
  this.space();
  this.print(node.body);
}
function ObjectProperty(node) {
  this.printJoin(node.decorators);
  if (node.computed) {
    this.tokenChar(91);
    this.print(node.key);
    this.tokenChar(93);
  } else {
    if (isAssignmentPattern(node.value) && isIdentifier(node.key) && node.key.name === node.value.left.name) {
      this.print(node.value);
      return;
    }
    this.print(node.key);
    if (node.shorthand && isIdentifier(node.key) && isIdentifier(node.value) && node.key.name === node.value.name) {
      return;
    }
  }
  this.tokenChar(58);
  this.space();
  this.print(node.value);
}
function ArrayExpression(node) {
  const elems = node.elements;
  const len = elems.length;
  this.tokenChar(91);
  const exit = this.enterDelimited();
  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    if (elem) {
      if (i > 0) this.space();
      this.print(elem);
      if (i < len - 1 || this.shouldPrintTrailingComma("]")) {
        this.token(",", false, i);
      }
    } else {
      this.token(",", false, i);
    }
  }
  exit();
  this.tokenChar(93);
}
function RecordExpression(node) {
  const props = node.properties;
  let startToken;
  let endToken;
  {
    if (this.format.recordAndTupleSyntaxType === "bar") {
      startToken = "{|";
      endToken = "|}";
    } else if (this.format.recordAndTupleSyntaxType !== "hash" && this.format.recordAndTupleSyntaxType != null) {
      throw new Error(`The "recordAndTupleSyntaxType" generator option must be "bar" or "hash" (${JSON.stringify(this.format.recordAndTupleSyntaxType)} received).`);
    } else {
      startToken = "#{";
      endToken = "}";
    }
  }
  this.token(startToken);
  if (props.length) {
    this.space();
    this.printList(props, this.shouldPrintTrailingComma(endToken), true, true);
    this.space();
  }
  this.token(endToken);
}
function TupleExpression(node) {
  const elems = node.elements;
  const len = elems.length;
  let startToken;
  let endToken;
  {
    if (this.format.recordAndTupleSyntaxType === "bar") {
      startToken = "[|";
      endToken = "|]";
    } else if (this.format.recordAndTupleSyntaxType === "hash") {
      startToken = "#[";
      endToken = "]";
    } else {
      throw new Error(`${this.format.recordAndTupleSyntaxType} is not a valid recordAndTuple syntax type`);
    }
  }
  this.token(startToken);
  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    if (elem) {
      if (i > 0) this.space();
      this.print(elem);
      if (i < len - 1 || this.shouldPrintTrailingComma(endToken)) {
        this.token(",", false, i);
      }
    }
  }
  this.token(endToken);
}
function RegExpLiteral(node) {
  this.word(`/${node.pattern}/${node.flags}`);
}
function BooleanLiteral(node) {
  this.word(node.value ? "true" : "false");
}
function NullLiteral() {
  this.word("null");
}
function NumericLiteral(node) {
  const raw = this.getPossibleRaw(node);
  const opts = this.format.jsescOption;
  const value = node.value;
  const str = value + "";
  if (opts.numbers) {
    this.number(_jsesc(value, opts), value);
  } else if (raw == null) {
    this.number(str, value);
  } else if (this.format.minified) {
    this.number(raw.length < str.length ? raw : str, value);
  } else {
    this.number(raw, value);
  }
}
function StringLiteral(node) {
  const raw = this.getPossibleRaw(node);
  if (!this.format.minified && raw !== undefined) {
    this.token(raw);
    return;
  }
  const val = _jsesc(node.value, this.format.jsescOption);
  this.token(val);
}
function BigIntLiteral(node) {
  const raw = this.getPossibleRaw(node);
  if (!this.format.minified && raw !== undefined) {
    this.word(raw);
    return;
  }
  this.word(node.value + "n");
}
const validTopicTokenSet = new Set(["^^", "@@", "^", "%", "#"]);
function TopicReference() {
  const {
    topicToken
  } = this.format;
  if (validTopicTokenSet.has(topicToken)) {
    this.token(topicToken);
  } else {
    const givenTopicTokenJSON = JSON.stringify(topicToken);
    const validTopics = Array.from(validTopicTokenSet, v => JSON.stringify(v));
    throw new Error(`The "topicToken" generator option must be one of ` + `${validTopics.join(", ")} (${givenTopicTokenJSON} received instead).`);
  }
}
function PipelineTopicExpression(node) {
  this.print(node.expression);
}
function PipelineBareFunction(node) {
  this.print(node.callee);
}
function PipelinePrimaryTopicReference() {
  this.tokenChar(35);
}
function VoidPattern() {
  this.word("void");
}

//# sourceMappingURL=types.js.map
