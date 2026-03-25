import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  any,
  invariant,
  up2 as up
} from "./chunk-PFJRSBIJ.js";
import {
  resolvePackageDir
} from "./chunk-O7UZQAUS.js";
import {
  require_dist
} from "./chunk-SLZHVDN6.js";
import {
  babelParse,
  recast,
  traverse,
  types
} from "./chunk-N2XJQMXW.js";
import {
  require_picocolors
} from "./chunk-LE232J7F.js";
import {
  __commonJS,
  __require,
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// ../node_modules/esprima/dist/esprima.js
var require_esprima = __commonJS({
  "../node_modules/esprima/dist/esprima.js"(exports, module) {
    (function(root, factory) {
      typeof exports == "object" && typeof module == "object" ? module.exports = factory() : typeof define == "function" && define.amd ? define([], factory) : typeof exports == "object" ? exports.esprima = factory() : root.esprima = factory();
    })(exports, function() {
      return (
        /******/
        (function(modules) {
          var installedModules = {};
          function __webpack_require__(moduleId) {
            if (installedModules[moduleId])
              return installedModules[moduleId].exports;
            var module2 = installedModules[moduleId] = {
              /******/
              exports: {},
              /******/
              id: moduleId,
              /******/
              loaded: !1
              /******/
            };
            return modules[moduleId].call(module2.exports, module2, module2.exports, __webpack_require__), module2.loaded = !0, module2.exports;
          }
          return __webpack_require__.m = modules, __webpack_require__.c = installedModules, __webpack_require__.p = "", __webpack_require__(0);
        })([
          /* 0 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var comment_handler_1 = __webpack_require__(1), jsx_parser_1 = __webpack_require__(3), parser_1 = __webpack_require__(8), tokenizer_1 = __webpack_require__(15);
            function parse(code, options, delegate) {
              var commentHandler = null, proxyDelegate = function(node, metadata) {
                delegate && delegate(node, metadata), commentHandler && commentHandler.visit(node, metadata);
              }, parserDelegate = typeof delegate == "function" ? proxyDelegate : null, collectComment = !1;
              if (options) {
                collectComment = typeof options.comment == "boolean" && options.comment;
                var attachComment = typeof options.attachComment == "boolean" && options.attachComment;
                (collectComment || attachComment) && (commentHandler = new comment_handler_1.CommentHandler(), commentHandler.attach = attachComment, options.comment = !0, parserDelegate = proxyDelegate);
              }
              var isModule = !1;
              options && typeof options.sourceType == "string" && (isModule = options.sourceType === "module");
              var parser;
              options && typeof options.jsx == "boolean" && options.jsx ? parser = new jsx_parser_1.JSXParser(code, options, parserDelegate) : parser = new parser_1.Parser(code, options, parserDelegate);
              var program = isModule ? parser.parseModule() : parser.parseScript(), ast = program;
              return collectComment && commentHandler && (ast.comments = commentHandler.comments), parser.config.tokens && (ast.tokens = parser.tokens), parser.config.tolerant && (ast.errors = parser.errorHandler.errors), ast;
            }
            exports2.parse = parse;
            function parseModule(code, options, delegate) {
              var parsingOptions = options || {};
              return parsingOptions.sourceType = "module", parse(code, parsingOptions, delegate);
            }
            exports2.parseModule = parseModule;
            function parseScript(code, options, delegate) {
              var parsingOptions = options || {};
              return parsingOptions.sourceType = "script", parse(code, parsingOptions, delegate);
            }
            exports2.parseScript = parseScript;
            function tokenize(code, options, delegate) {
              var tokenizer = new tokenizer_1.Tokenizer(code, options), tokens;
              tokens = [];
              try {
                for (; ; ) {
                  var token = tokenizer.getNextToken();
                  if (!token)
                    break;
                  delegate && (token = delegate(token)), tokens.push(token);
                }
              } catch (e) {
                tokenizer.errorHandler.tolerate(e);
              }
              return tokenizer.errorHandler.tolerant && (tokens.errors = tokenizer.errors()), tokens;
            }
            exports2.tokenize = tokenize;
            var syntax_1 = __webpack_require__(2);
            exports2.Syntax = syntax_1.Syntax, exports2.version = "4.0.1";
          },
          /* 1 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var syntax_1 = __webpack_require__(2), CommentHandler = (function() {
              function CommentHandler2() {
                this.attach = !1, this.comments = [], this.stack = [], this.leading = [], this.trailing = [];
              }
              return CommentHandler2.prototype.insertInnerComments = function(node, metadata) {
                if (node.type === syntax_1.Syntax.BlockStatement && node.body.length === 0) {
                  for (var innerComments = [], i = this.leading.length - 1; i >= 0; --i) {
                    var entry = this.leading[i];
                    metadata.end.offset >= entry.start && (innerComments.unshift(entry.comment), this.leading.splice(i, 1), this.trailing.splice(i, 1));
                  }
                  innerComments.length && (node.innerComments = innerComments);
                }
              }, CommentHandler2.prototype.findTrailingComments = function(metadata) {
                var trailingComments = [];
                if (this.trailing.length > 0) {
                  for (var i = this.trailing.length - 1; i >= 0; --i) {
                    var entry_1 = this.trailing[i];
                    entry_1.start >= metadata.end.offset && trailingComments.unshift(entry_1.comment);
                  }
                  return this.trailing.length = 0, trailingComments;
                }
                var entry = this.stack[this.stack.length - 1];
                if (entry && entry.node.trailingComments) {
                  var firstComment = entry.node.trailingComments[0];
                  firstComment && firstComment.range[0] >= metadata.end.offset && (trailingComments = entry.node.trailingComments, delete entry.node.trailingComments);
                }
                return trailingComments;
              }, CommentHandler2.prototype.findLeadingComments = function(metadata) {
                for (var leadingComments = [], target; this.stack.length > 0; ) {
                  var entry = this.stack[this.stack.length - 1];
                  if (entry && entry.start >= metadata.start.offset)
                    target = entry.node, this.stack.pop();
                  else
                    break;
                }
                if (target) {
                  for (var count = target.leadingComments ? target.leadingComments.length : 0, i = count - 1; i >= 0; --i) {
                    var comment = target.leadingComments[i];
                    comment.range[1] <= metadata.start.offset && (leadingComments.unshift(comment), target.leadingComments.splice(i, 1));
                  }
                  return target.leadingComments && target.leadingComments.length === 0 && delete target.leadingComments, leadingComments;
                }
                for (var i = this.leading.length - 1; i >= 0; --i) {
                  var entry = this.leading[i];
                  entry.start <= metadata.start.offset && (leadingComments.unshift(entry.comment), this.leading.splice(i, 1));
                }
                return leadingComments;
              }, CommentHandler2.prototype.visitNode = function(node, metadata) {
                if (!(node.type === syntax_1.Syntax.Program && node.body.length > 0)) {
                  this.insertInnerComments(node, metadata);
                  var trailingComments = this.findTrailingComments(metadata), leadingComments = this.findLeadingComments(metadata);
                  leadingComments.length > 0 && (node.leadingComments = leadingComments), trailingComments.length > 0 && (node.trailingComments = trailingComments), this.stack.push({
                    node,
                    start: metadata.start.offset
                  });
                }
              }, CommentHandler2.prototype.visitComment = function(node, metadata) {
                var type = node.type[0] === "L" ? "Line" : "Block", comment = {
                  type,
                  value: node.value
                };
                if (node.range && (comment.range = node.range), node.loc && (comment.loc = node.loc), this.comments.push(comment), this.attach) {
                  var entry = {
                    comment: {
                      type,
                      value: node.value,
                      range: [metadata.start.offset, metadata.end.offset]
                    },
                    start: metadata.start.offset
                  };
                  node.loc && (entry.comment.loc = node.loc), node.type = type, this.leading.push(entry), this.trailing.push(entry);
                }
              }, CommentHandler2.prototype.visit = function(node, metadata) {
                node.type === "LineComment" ? this.visitComment(node, metadata) : node.type === "BlockComment" ? this.visitComment(node, metadata) : this.attach && this.visitNode(node, metadata);
              }, CommentHandler2;
            })();
            exports2.CommentHandler = CommentHandler;
          },
          /* 2 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 }), exports2.Syntax = {
              AssignmentExpression: "AssignmentExpression",
              AssignmentPattern: "AssignmentPattern",
              ArrayExpression: "ArrayExpression",
              ArrayPattern: "ArrayPattern",
              ArrowFunctionExpression: "ArrowFunctionExpression",
              AwaitExpression: "AwaitExpression",
              BlockStatement: "BlockStatement",
              BinaryExpression: "BinaryExpression",
              BreakStatement: "BreakStatement",
              CallExpression: "CallExpression",
              CatchClause: "CatchClause",
              ClassBody: "ClassBody",
              ClassDeclaration: "ClassDeclaration",
              ClassExpression: "ClassExpression",
              ConditionalExpression: "ConditionalExpression",
              ContinueStatement: "ContinueStatement",
              DoWhileStatement: "DoWhileStatement",
              DebuggerStatement: "DebuggerStatement",
              EmptyStatement: "EmptyStatement",
              ExportAllDeclaration: "ExportAllDeclaration",
              ExportDefaultDeclaration: "ExportDefaultDeclaration",
              ExportNamedDeclaration: "ExportNamedDeclaration",
              ExportSpecifier: "ExportSpecifier",
              ExpressionStatement: "ExpressionStatement",
              ForStatement: "ForStatement",
              ForOfStatement: "ForOfStatement",
              ForInStatement: "ForInStatement",
              FunctionDeclaration: "FunctionDeclaration",
              FunctionExpression: "FunctionExpression",
              Identifier: "Identifier",
              IfStatement: "IfStatement",
              ImportDeclaration: "ImportDeclaration",
              ImportDefaultSpecifier: "ImportDefaultSpecifier",
              ImportNamespaceSpecifier: "ImportNamespaceSpecifier",
              ImportSpecifier: "ImportSpecifier",
              Literal: "Literal",
              LabeledStatement: "LabeledStatement",
              LogicalExpression: "LogicalExpression",
              MemberExpression: "MemberExpression",
              MetaProperty: "MetaProperty",
              MethodDefinition: "MethodDefinition",
              NewExpression: "NewExpression",
              ObjectExpression: "ObjectExpression",
              ObjectPattern: "ObjectPattern",
              Program: "Program",
              Property: "Property",
              RestElement: "RestElement",
              ReturnStatement: "ReturnStatement",
              SequenceExpression: "SequenceExpression",
              SpreadElement: "SpreadElement",
              Super: "Super",
              SwitchCase: "SwitchCase",
              SwitchStatement: "SwitchStatement",
              TaggedTemplateExpression: "TaggedTemplateExpression",
              TemplateElement: "TemplateElement",
              TemplateLiteral: "TemplateLiteral",
              ThisExpression: "ThisExpression",
              ThrowStatement: "ThrowStatement",
              TryStatement: "TryStatement",
              UnaryExpression: "UnaryExpression",
              UpdateExpression: "UpdateExpression",
              VariableDeclaration: "VariableDeclaration",
              VariableDeclarator: "VariableDeclarator",
              WhileStatement: "WhileStatement",
              WithStatement: "WithStatement",
              YieldExpression: "YieldExpression"
            };
          },
          /* 3 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            var __extends = this && this.__extends || (function() {
              var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
                d.__proto__ = b;
              } || function(d, b) {
                for (var p in b) b.hasOwnProperty(p) && (d[p] = b[p]);
              };
              return function(d, b) {
                extendStatics(d, b);
                function __() {
                  this.constructor = d;
                }
                d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
              };
            })();
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var character_1 = __webpack_require__(4), JSXNode = __webpack_require__(5), jsx_syntax_1 = __webpack_require__(6), Node = __webpack_require__(7), parser_1 = __webpack_require__(8), token_1 = __webpack_require__(13), xhtml_entities_1 = __webpack_require__(14);
            token_1.TokenName[
              100
              /* Identifier */
            ] = "JSXIdentifier", token_1.TokenName[
              101
              /* Text */
            ] = "JSXText";
            function getQualifiedElementName(elementName) {
              var qualifiedName;
              switch (elementName.type) {
                case jsx_syntax_1.JSXSyntax.JSXIdentifier:
                  var id = elementName;
                  qualifiedName = id.name;
                  break;
                case jsx_syntax_1.JSXSyntax.JSXNamespacedName:
                  var ns = elementName;
                  qualifiedName = getQualifiedElementName(ns.namespace) + ":" + getQualifiedElementName(ns.name);
                  break;
                case jsx_syntax_1.JSXSyntax.JSXMemberExpression:
                  var expr = elementName;
                  qualifiedName = getQualifiedElementName(expr.object) + "." + getQualifiedElementName(expr.property);
                  break;
                /* istanbul ignore next */
                default:
                  break;
              }
              return qualifiedName;
            }
            var JSXParser = (function(_super) {
              __extends(JSXParser2, _super);
              function JSXParser2(code, options, delegate) {
                return _super.call(this, code, options, delegate) || this;
              }
              return JSXParser2.prototype.parsePrimaryExpression = function() {
                return this.match("<") ? this.parseJSXRoot() : _super.prototype.parsePrimaryExpression.call(this);
              }, JSXParser2.prototype.startJSX = function() {
                this.scanner.index = this.startMarker.index, this.scanner.lineNumber = this.startMarker.line, this.scanner.lineStart = this.startMarker.index - this.startMarker.column;
              }, JSXParser2.prototype.finishJSX = function() {
                this.nextToken();
              }, JSXParser2.prototype.reenterJSX = function() {
                this.startJSX(), this.expectJSX("}"), this.config.tokens && this.tokens.pop();
              }, JSXParser2.prototype.createJSXNode = function() {
                return this.collectComments(), {
                  index: this.scanner.index,
                  line: this.scanner.lineNumber,
                  column: this.scanner.index - this.scanner.lineStart
                };
              }, JSXParser2.prototype.createJSXChildNode = function() {
                return {
                  index: this.scanner.index,
                  line: this.scanner.lineNumber,
                  column: this.scanner.index - this.scanner.lineStart
                };
              }, JSXParser2.prototype.scanXHTMLEntity = function(quote) {
                for (var result = "&", valid = !0, terminated = !1, numeric = !1, hex = !1; !this.scanner.eof() && valid && !terminated; ) {
                  var ch = this.scanner.source[this.scanner.index];
                  if (ch === quote)
                    break;
                  if (terminated = ch === ";", result += ch, ++this.scanner.index, !terminated)
                    switch (result.length) {
                      case 2:
                        numeric = ch === "#";
                        break;
                      case 3:
                        numeric && (hex = ch === "x", valid = hex || character_1.Character.isDecimalDigit(ch.charCodeAt(0)), numeric = numeric && !hex);
                        break;
                      default:
                        valid = valid && !(numeric && !character_1.Character.isDecimalDigit(ch.charCodeAt(0))), valid = valid && !(hex && !character_1.Character.isHexDigit(ch.charCodeAt(0)));
                        break;
                    }
                }
                if (valid && terminated && result.length > 2) {
                  var str = result.substr(1, result.length - 2);
                  numeric && str.length > 1 ? result = String.fromCharCode(parseInt(str.substr(1), 10)) : hex && str.length > 2 ? result = String.fromCharCode(parseInt("0" + str.substr(1), 16)) : !numeric && !hex && xhtml_entities_1.XHTMLEntities[str] && (result = xhtml_entities_1.XHTMLEntities[str]);
                }
                return result;
              }, JSXParser2.prototype.lexJSX = function() {
                var cp2 = this.scanner.source.charCodeAt(this.scanner.index);
                if (cp2 === 60 || cp2 === 62 || cp2 === 47 || cp2 === 58 || cp2 === 61 || cp2 === 123 || cp2 === 125) {
                  var value = this.scanner.source[this.scanner.index++];
                  return {
                    type: 7,
                    value,
                    lineNumber: this.scanner.lineNumber,
                    lineStart: this.scanner.lineStart,
                    start: this.scanner.index - 1,
                    end: this.scanner.index
                  };
                }
                if (cp2 === 34 || cp2 === 39) {
                  for (var start = this.scanner.index, quote = this.scanner.source[this.scanner.index++], str = ""; !this.scanner.eof(); ) {
                    var ch = this.scanner.source[this.scanner.index++];
                    if (ch === quote)
                      break;
                    ch === "&" ? str += this.scanXHTMLEntity(quote) : str += ch;
                  }
                  return {
                    type: 8,
                    value: str,
                    lineNumber: this.scanner.lineNumber,
                    lineStart: this.scanner.lineStart,
                    start,
                    end: this.scanner.index
                  };
                }
                if (cp2 === 46) {
                  var n1 = this.scanner.source.charCodeAt(this.scanner.index + 1), n2 = this.scanner.source.charCodeAt(this.scanner.index + 2), value = n1 === 46 && n2 === 46 ? "..." : ".", start = this.scanner.index;
                  return this.scanner.index += value.length, {
                    type: 7,
                    value,
                    lineNumber: this.scanner.lineNumber,
                    lineStart: this.scanner.lineStart,
                    start,
                    end: this.scanner.index
                  };
                }
                if (cp2 === 96)
                  return {
                    type: 10,
                    value: "",
                    lineNumber: this.scanner.lineNumber,
                    lineStart: this.scanner.lineStart,
                    start: this.scanner.index,
                    end: this.scanner.index
                  };
                if (character_1.Character.isIdentifierStart(cp2) && cp2 !== 92) {
                  var start = this.scanner.index;
                  for (++this.scanner.index; !this.scanner.eof(); ) {
                    var ch = this.scanner.source.charCodeAt(this.scanner.index);
                    if (character_1.Character.isIdentifierPart(ch) && ch !== 92)
                      ++this.scanner.index;
                    else if (ch === 45)
                      ++this.scanner.index;
                    else
                      break;
                  }
                  var id = this.scanner.source.slice(start, this.scanner.index);
                  return {
                    type: 100,
                    value: id,
                    lineNumber: this.scanner.lineNumber,
                    lineStart: this.scanner.lineStart,
                    start,
                    end: this.scanner.index
                  };
                }
                return this.scanner.lex();
              }, JSXParser2.prototype.nextJSXToken = function() {
                this.collectComments(), this.startMarker.index = this.scanner.index, this.startMarker.line = this.scanner.lineNumber, this.startMarker.column = this.scanner.index - this.scanner.lineStart;
                var token = this.lexJSX();
                return this.lastMarker.index = this.scanner.index, this.lastMarker.line = this.scanner.lineNumber, this.lastMarker.column = this.scanner.index - this.scanner.lineStart, this.config.tokens && this.tokens.push(this.convertToken(token)), token;
              }, JSXParser2.prototype.nextJSXText = function() {
                this.startMarker.index = this.scanner.index, this.startMarker.line = this.scanner.lineNumber, this.startMarker.column = this.scanner.index - this.scanner.lineStart;
                for (var start = this.scanner.index, text = ""; !this.scanner.eof(); ) {
                  var ch = this.scanner.source[this.scanner.index];
                  if (ch === "{" || ch === "<")
                    break;
                  ++this.scanner.index, text += ch, character_1.Character.isLineTerminator(ch.charCodeAt(0)) && (++this.scanner.lineNumber, ch === "\r" && this.scanner.source[this.scanner.index] === `
` && ++this.scanner.index, this.scanner.lineStart = this.scanner.index);
                }
                this.lastMarker.index = this.scanner.index, this.lastMarker.line = this.scanner.lineNumber, this.lastMarker.column = this.scanner.index - this.scanner.lineStart;
                var token = {
                  type: 101,
                  value: text,
                  lineNumber: this.scanner.lineNumber,
                  lineStart: this.scanner.lineStart,
                  start,
                  end: this.scanner.index
                };
                return text.length > 0 && this.config.tokens && this.tokens.push(this.convertToken(token)), token;
              }, JSXParser2.prototype.peekJSXToken = function() {
                var state = this.scanner.saveState();
                this.scanner.scanComments();
                var next = this.lexJSX();
                return this.scanner.restoreState(state), next;
              }, JSXParser2.prototype.expectJSX = function(value) {
                var token = this.nextJSXToken();
                (token.type !== 7 || token.value !== value) && this.throwUnexpectedToken(token);
              }, JSXParser2.prototype.matchJSX = function(value) {
                var next = this.peekJSXToken();
                return next.type === 7 && next.value === value;
              }, JSXParser2.prototype.parseJSXIdentifier = function() {
                var node = this.createJSXNode(), token = this.nextJSXToken();
                return token.type !== 100 && this.throwUnexpectedToken(token), this.finalize(node, new JSXNode.JSXIdentifier(token.value));
              }, JSXParser2.prototype.parseJSXElementName = function() {
                var node = this.createJSXNode(), elementName = this.parseJSXIdentifier();
                if (this.matchJSX(":")) {
                  var namespace = elementName;
                  this.expectJSX(":");
                  var name_1 = this.parseJSXIdentifier();
                  elementName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name_1));
                } else if (this.matchJSX("."))
                  for (; this.matchJSX("."); ) {
                    var object = elementName;
                    this.expectJSX(".");
                    var property = this.parseJSXIdentifier();
                    elementName = this.finalize(node, new JSXNode.JSXMemberExpression(object, property));
                  }
                return elementName;
              }, JSXParser2.prototype.parseJSXAttributeName = function() {
                var node = this.createJSXNode(), attributeName, identifier = this.parseJSXIdentifier();
                if (this.matchJSX(":")) {
                  var namespace = identifier;
                  this.expectJSX(":");
                  var name_2 = this.parseJSXIdentifier();
                  attributeName = this.finalize(node, new JSXNode.JSXNamespacedName(namespace, name_2));
                } else
                  attributeName = identifier;
                return attributeName;
              }, JSXParser2.prototype.parseJSXStringLiteralAttribute = function() {
                var node = this.createJSXNode(), token = this.nextJSXToken();
                token.type !== 8 && this.throwUnexpectedToken(token);
                var raw = this.getTokenRaw(token);
                return this.finalize(node, new Node.Literal(token.value, raw));
              }, JSXParser2.prototype.parseJSXExpressionAttribute = function() {
                var node = this.createJSXNode();
                this.expectJSX("{"), this.finishJSX(), this.match("}") && this.tolerateError("JSX attributes must only be assigned a non-empty expression");
                var expression = this.parseAssignmentExpression();
                return this.reenterJSX(), this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
              }, JSXParser2.prototype.parseJSXAttributeValue = function() {
                return this.matchJSX("{") ? this.parseJSXExpressionAttribute() : this.matchJSX("<") ? this.parseJSXElement() : this.parseJSXStringLiteralAttribute();
              }, JSXParser2.prototype.parseJSXNameValueAttribute = function() {
                var node = this.createJSXNode(), name = this.parseJSXAttributeName(), value = null;
                return this.matchJSX("=") && (this.expectJSX("="), value = this.parseJSXAttributeValue()), this.finalize(node, new JSXNode.JSXAttribute(name, value));
              }, JSXParser2.prototype.parseJSXSpreadAttribute = function() {
                var node = this.createJSXNode();
                this.expectJSX("{"), this.expectJSX("..."), this.finishJSX();
                var argument = this.parseAssignmentExpression();
                return this.reenterJSX(), this.finalize(node, new JSXNode.JSXSpreadAttribute(argument));
              }, JSXParser2.prototype.parseJSXAttributes = function() {
                for (var attributes = []; !this.matchJSX("/") && !this.matchJSX(">"); ) {
                  var attribute = this.matchJSX("{") ? this.parseJSXSpreadAttribute() : this.parseJSXNameValueAttribute();
                  attributes.push(attribute);
                }
                return attributes;
              }, JSXParser2.prototype.parseJSXOpeningElement = function() {
                var node = this.createJSXNode();
                this.expectJSX("<");
                var name = this.parseJSXElementName(), attributes = this.parseJSXAttributes(), selfClosing = this.matchJSX("/");
                return selfClosing && this.expectJSX("/"), this.expectJSX(">"), this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
              }, JSXParser2.prototype.parseJSXBoundaryElement = function() {
                var node = this.createJSXNode();
                if (this.expectJSX("<"), this.matchJSX("/")) {
                  this.expectJSX("/");
                  var name_3 = this.parseJSXElementName();
                  return this.expectJSX(">"), this.finalize(node, new JSXNode.JSXClosingElement(name_3));
                }
                var name = this.parseJSXElementName(), attributes = this.parseJSXAttributes(), selfClosing = this.matchJSX("/");
                return selfClosing && this.expectJSX("/"), this.expectJSX(">"), this.finalize(node, new JSXNode.JSXOpeningElement(name, selfClosing, attributes));
              }, JSXParser2.prototype.parseJSXEmptyExpression = function() {
                var node = this.createJSXChildNode();
                return this.collectComments(), this.lastMarker.index = this.scanner.index, this.lastMarker.line = this.scanner.lineNumber, this.lastMarker.column = this.scanner.index - this.scanner.lineStart, this.finalize(node, new JSXNode.JSXEmptyExpression());
              }, JSXParser2.prototype.parseJSXExpressionContainer = function() {
                var node = this.createJSXNode();
                this.expectJSX("{");
                var expression;
                return this.matchJSX("}") ? (expression = this.parseJSXEmptyExpression(), this.expectJSX("}")) : (this.finishJSX(), expression = this.parseAssignmentExpression(), this.reenterJSX()), this.finalize(node, new JSXNode.JSXExpressionContainer(expression));
              }, JSXParser2.prototype.parseJSXChildren = function() {
                for (var children = []; !this.scanner.eof(); ) {
                  var node = this.createJSXChildNode(), token = this.nextJSXText();
                  if (token.start < token.end) {
                    var raw = this.getTokenRaw(token), child = this.finalize(node, new JSXNode.JSXText(token.value, raw));
                    children.push(child);
                  }
                  if (this.scanner.source[this.scanner.index] === "{") {
                    var container = this.parseJSXExpressionContainer();
                    children.push(container);
                  } else
                    break;
                }
                return children;
              }, JSXParser2.prototype.parseComplexJSXElement = function(el) {
                for (var stack = []; !this.scanner.eof(); ) {
                  el.children = el.children.concat(this.parseJSXChildren());
                  var node = this.createJSXChildNode(), element = this.parseJSXBoundaryElement();
                  if (element.type === jsx_syntax_1.JSXSyntax.JSXOpeningElement) {
                    var opening = element;
                    if (opening.selfClosing) {
                      var child = this.finalize(node, new JSXNode.JSXElement(opening, [], null));
                      el.children.push(child);
                    } else
                      stack.push(el), el = { node, opening, closing: null, children: [] };
                  }
                  if (element.type === jsx_syntax_1.JSXSyntax.JSXClosingElement) {
                    el.closing = element;
                    var open_1 = getQualifiedElementName(el.opening.name), close_1 = getQualifiedElementName(el.closing.name);
                    if (open_1 !== close_1 && this.tolerateError("Expected corresponding JSX closing tag for %0", open_1), stack.length > 0) {
                      var child = this.finalize(el.node, new JSXNode.JSXElement(el.opening, el.children, el.closing));
                      el = stack[stack.length - 1], el.children.push(child), stack.pop();
                    } else
                      break;
                  }
                }
                return el;
              }, JSXParser2.prototype.parseJSXElement = function() {
                var node = this.createJSXNode(), opening = this.parseJSXOpeningElement(), children = [], closing = null;
                if (!opening.selfClosing) {
                  var el = this.parseComplexJSXElement({ node, opening, closing, children });
                  children = el.children, closing = el.closing;
                }
                return this.finalize(node, new JSXNode.JSXElement(opening, children, closing));
              }, JSXParser2.prototype.parseJSXRoot = function() {
                this.config.tokens && this.tokens.pop(), this.startJSX();
                var element = this.parseJSXElement();
                return this.finishJSX(), element;
              }, JSXParser2.prototype.isStartOfExpression = function() {
                return _super.prototype.isStartOfExpression.call(this) || this.match("<");
              }, JSXParser2;
            })(parser_1.Parser);
            exports2.JSXParser = JSXParser;
          },
          /* 4 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var Regex = {
              // Unicode v8.0.0 NonAsciiIdentifierStart:
              NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]/,
              // Unicode v8.0.0 NonAsciiIdentifierPart:
              NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/
            };
            exports2.Character = {
              /* tslint:disable:no-bitwise */
              fromCodePoint: function(cp2) {
                return cp2 < 65536 ? String.fromCharCode(cp2) : String.fromCharCode(55296 + (cp2 - 65536 >> 10)) + String.fromCharCode(56320 + (cp2 - 65536 & 1023));
              },
              // https://tc39.github.io/ecma262/#sec-white-space
              isWhiteSpace: function(cp2) {
                return cp2 === 32 || cp2 === 9 || cp2 === 11 || cp2 === 12 || cp2 === 160 || cp2 >= 5760 && [5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8239, 8287, 12288, 65279].indexOf(cp2) >= 0;
              },
              // https://tc39.github.io/ecma262/#sec-line-terminators
              isLineTerminator: function(cp2) {
                return cp2 === 10 || cp2 === 13 || cp2 === 8232 || cp2 === 8233;
              },
              // https://tc39.github.io/ecma262/#sec-names-and-keywords
              isIdentifierStart: function(cp2) {
                return cp2 === 36 || cp2 === 95 || cp2 >= 65 && cp2 <= 90 || cp2 >= 97 && cp2 <= 122 || cp2 === 92 || cp2 >= 128 && Regex.NonAsciiIdentifierStart.test(exports2.Character.fromCodePoint(cp2));
              },
              isIdentifierPart: function(cp2) {
                return cp2 === 36 || cp2 === 95 || cp2 >= 65 && cp2 <= 90 || cp2 >= 97 && cp2 <= 122 || cp2 >= 48 && cp2 <= 57 || cp2 === 92 || cp2 >= 128 && Regex.NonAsciiIdentifierPart.test(exports2.Character.fromCodePoint(cp2));
              },
              // https://tc39.github.io/ecma262/#sec-literals-numeric-literals
              isDecimalDigit: function(cp2) {
                return cp2 >= 48 && cp2 <= 57;
              },
              isHexDigit: function(cp2) {
                return cp2 >= 48 && cp2 <= 57 || cp2 >= 65 && cp2 <= 70 || cp2 >= 97 && cp2 <= 102;
              },
              isOctalDigit: function(cp2) {
                return cp2 >= 48 && cp2 <= 55;
              }
            };
          },
          /* 5 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var jsx_syntax_1 = __webpack_require__(6), JSXClosingElement = /* @__PURE__ */ (function() {
              function JSXClosingElement2(name) {
                this.type = jsx_syntax_1.JSXSyntax.JSXClosingElement, this.name = name;
              }
              return JSXClosingElement2;
            })();
            exports2.JSXClosingElement = JSXClosingElement;
            var JSXElement = /* @__PURE__ */ (function() {
              function JSXElement2(openingElement, children, closingElement) {
                this.type = jsx_syntax_1.JSXSyntax.JSXElement, this.openingElement = openingElement, this.children = children, this.closingElement = closingElement;
              }
              return JSXElement2;
            })();
            exports2.JSXElement = JSXElement;
            var JSXEmptyExpression = /* @__PURE__ */ (function() {
              function JSXEmptyExpression2() {
                this.type = jsx_syntax_1.JSXSyntax.JSXEmptyExpression;
              }
              return JSXEmptyExpression2;
            })();
            exports2.JSXEmptyExpression = JSXEmptyExpression;
            var JSXExpressionContainer = /* @__PURE__ */ (function() {
              function JSXExpressionContainer2(expression) {
                this.type = jsx_syntax_1.JSXSyntax.JSXExpressionContainer, this.expression = expression;
              }
              return JSXExpressionContainer2;
            })();
            exports2.JSXExpressionContainer = JSXExpressionContainer;
            var JSXIdentifier = /* @__PURE__ */ (function() {
              function JSXIdentifier2(name) {
                this.type = jsx_syntax_1.JSXSyntax.JSXIdentifier, this.name = name;
              }
              return JSXIdentifier2;
            })();
            exports2.JSXIdentifier = JSXIdentifier;
            var JSXMemberExpression = /* @__PURE__ */ (function() {
              function JSXMemberExpression2(object, property) {
                this.type = jsx_syntax_1.JSXSyntax.JSXMemberExpression, this.object = object, this.property = property;
              }
              return JSXMemberExpression2;
            })();
            exports2.JSXMemberExpression = JSXMemberExpression;
            var JSXAttribute = /* @__PURE__ */ (function() {
              function JSXAttribute2(name, value) {
                this.type = jsx_syntax_1.JSXSyntax.JSXAttribute, this.name = name, this.value = value;
              }
              return JSXAttribute2;
            })();
            exports2.JSXAttribute = JSXAttribute;
            var JSXNamespacedName = /* @__PURE__ */ (function() {
              function JSXNamespacedName2(namespace, name) {
                this.type = jsx_syntax_1.JSXSyntax.JSXNamespacedName, this.namespace = namespace, this.name = name;
              }
              return JSXNamespacedName2;
            })();
            exports2.JSXNamespacedName = JSXNamespacedName;
            var JSXOpeningElement = /* @__PURE__ */ (function() {
              function JSXOpeningElement2(name, selfClosing, attributes) {
                this.type = jsx_syntax_1.JSXSyntax.JSXOpeningElement, this.name = name, this.selfClosing = selfClosing, this.attributes = attributes;
              }
              return JSXOpeningElement2;
            })();
            exports2.JSXOpeningElement = JSXOpeningElement;
            var JSXSpreadAttribute = /* @__PURE__ */ (function() {
              function JSXSpreadAttribute2(argument) {
                this.type = jsx_syntax_1.JSXSyntax.JSXSpreadAttribute, this.argument = argument;
              }
              return JSXSpreadAttribute2;
            })();
            exports2.JSXSpreadAttribute = JSXSpreadAttribute;
            var JSXText = /* @__PURE__ */ (function() {
              function JSXText2(value, raw) {
                this.type = jsx_syntax_1.JSXSyntax.JSXText, this.value = value, this.raw = raw;
              }
              return JSXText2;
            })();
            exports2.JSXText = JSXText;
          },
          /* 6 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 }), exports2.JSXSyntax = {
              JSXAttribute: "JSXAttribute",
              JSXClosingElement: "JSXClosingElement",
              JSXElement: "JSXElement",
              JSXEmptyExpression: "JSXEmptyExpression",
              JSXExpressionContainer: "JSXExpressionContainer",
              JSXIdentifier: "JSXIdentifier",
              JSXMemberExpression: "JSXMemberExpression",
              JSXNamespacedName: "JSXNamespacedName",
              JSXOpeningElement: "JSXOpeningElement",
              JSXSpreadAttribute: "JSXSpreadAttribute",
              JSXText: "JSXText"
            };
          },
          /* 7 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var syntax_1 = __webpack_require__(2), ArrayExpression = /* @__PURE__ */ (function() {
              function ArrayExpression2(elements) {
                this.type = syntax_1.Syntax.ArrayExpression, this.elements = elements;
              }
              return ArrayExpression2;
            })();
            exports2.ArrayExpression = ArrayExpression;
            var ArrayPattern = /* @__PURE__ */ (function() {
              function ArrayPattern2(elements) {
                this.type = syntax_1.Syntax.ArrayPattern, this.elements = elements;
              }
              return ArrayPattern2;
            })();
            exports2.ArrayPattern = ArrayPattern;
            var ArrowFunctionExpression = /* @__PURE__ */ (function() {
              function ArrowFunctionExpression2(params, body, expression) {
                this.type = syntax_1.Syntax.ArrowFunctionExpression, this.id = null, this.params = params, this.body = body, this.generator = !1, this.expression = expression, this.async = !1;
              }
              return ArrowFunctionExpression2;
            })();
            exports2.ArrowFunctionExpression = ArrowFunctionExpression;
            var AssignmentExpression = /* @__PURE__ */ (function() {
              function AssignmentExpression2(operator, left, right) {
                this.type = syntax_1.Syntax.AssignmentExpression, this.operator = operator, this.left = left, this.right = right;
              }
              return AssignmentExpression2;
            })();
            exports2.AssignmentExpression = AssignmentExpression;
            var AssignmentPattern = /* @__PURE__ */ (function() {
              function AssignmentPattern2(left, right) {
                this.type = syntax_1.Syntax.AssignmentPattern, this.left = left, this.right = right;
              }
              return AssignmentPattern2;
            })();
            exports2.AssignmentPattern = AssignmentPattern;
            var AsyncArrowFunctionExpression = /* @__PURE__ */ (function() {
              function AsyncArrowFunctionExpression2(params, body, expression) {
                this.type = syntax_1.Syntax.ArrowFunctionExpression, this.id = null, this.params = params, this.body = body, this.generator = !1, this.expression = expression, this.async = !0;
              }
              return AsyncArrowFunctionExpression2;
            })();
            exports2.AsyncArrowFunctionExpression = AsyncArrowFunctionExpression;
            var AsyncFunctionDeclaration = /* @__PURE__ */ (function() {
              function AsyncFunctionDeclaration2(id, params, body) {
                this.type = syntax_1.Syntax.FunctionDeclaration, this.id = id, this.params = params, this.body = body, this.generator = !1, this.expression = !1, this.async = !0;
              }
              return AsyncFunctionDeclaration2;
            })();
            exports2.AsyncFunctionDeclaration = AsyncFunctionDeclaration;
            var AsyncFunctionExpression = /* @__PURE__ */ (function() {
              function AsyncFunctionExpression2(id, params, body) {
                this.type = syntax_1.Syntax.FunctionExpression, this.id = id, this.params = params, this.body = body, this.generator = !1, this.expression = !1, this.async = !0;
              }
              return AsyncFunctionExpression2;
            })();
            exports2.AsyncFunctionExpression = AsyncFunctionExpression;
            var AwaitExpression = /* @__PURE__ */ (function() {
              function AwaitExpression2(argument) {
                this.type = syntax_1.Syntax.AwaitExpression, this.argument = argument;
              }
              return AwaitExpression2;
            })();
            exports2.AwaitExpression = AwaitExpression;
            var BinaryExpression = /* @__PURE__ */ (function() {
              function BinaryExpression2(operator, left, right) {
                var logical = operator === "||" || operator === "&&";
                this.type = logical ? syntax_1.Syntax.LogicalExpression : syntax_1.Syntax.BinaryExpression, this.operator = operator, this.left = left, this.right = right;
              }
              return BinaryExpression2;
            })();
            exports2.BinaryExpression = BinaryExpression;
            var BlockStatement = /* @__PURE__ */ (function() {
              function BlockStatement2(body) {
                this.type = syntax_1.Syntax.BlockStatement, this.body = body;
              }
              return BlockStatement2;
            })();
            exports2.BlockStatement = BlockStatement;
            var BreakStatement = /* @__PURE__ */ (function() {
              function BreakStatement2(label) {
                this.type = syntax_1.Syntax.BreakStatement, this.label = label;
              }
              return BreakStatement2;
            })();
            exports2.BreakStatement = BreakStatement;
            var CallExpression = /* @__PURE__ */ (function() {
              function CallExpression2(callee, args) {
                this.type = syntax_1.Syntax.CallExpression, this.callee = callee, this.arguments = args;
              }
              return CallExpression2;
            })();
            exports2.CallExpression = CallExpression;
            var CatchClause = /* @__PURE__ */ (function() {
              function CatchClause2(param, body) {
                this.type = syntax_1.Syntax.CatchClause, this.param = param, this.body = body;
              }
              return CatchClause2;
            })();
            exports2.CatchClause = CatchClause;
            var ClassBody = /* @__PURE__ */ (function() {
              function ClassBody2(body) {
                this.type = syntax_1.Syntax.ClassBody, this.body = body;
              }
              return ClassBody2;
            })();
            exports2.ClassBody = ClassBody;
            var ClassDeclaration = /* @__PURE__ */ (function() {
              function ClassDeclaration2(id, superClass, body) {
                this.type = syntax_1.Syntax.ClassDeclaration, this.id = id, this.superClass = superClass, this.body = body;
              }
              return ClassDeclaration2;
            })();
            exports2.ClassDeclaration = ClassDeclaration;
            var ClassExpression = /* @__PURE__ */ (function() {
              function ClassExpression2(id, superClass, body) {
                this.type = syntax_1.Syntax.ClassExpression, this.id = id, this.superClass = superClass, this.body = body;
              }
              return ClassExpression2;
            })();
            exports2.ClassExpression = ClassExpression;
            var ComputedMemberExpression = /* @__PURE__ */ (function() {
              function ComputedMemberExpression2(object, property) {
                this.type = syntax_1.Syntax.MemberExpression, this.computed = !0, this.object = object, this.property = property;
              }
              return ComputedMemberExpression2;
            })();
            exports2.ComputedMemberExpression = ComputedMemberExpression;
            var ConditionalExpression = /* @__PURE__ */ (function() {
              function ConditionalExpression2(test, consequent, alternate) {
                this.type = syntax_1.Syntax.ConditionalExpression, this.test = test, this.consequent = consequent, this.alternate = alternate;
              }
              return ConditionalExpression2;
            })();
            exports2.ConditionalExpression = ConditionalExpression;
            var ContinueStatement = /* @__PURE__ */ (function() {
              function ContinueStatement2(label) {
                this.type = syntax_1.Syntax.ContinueStatement, this.label = label;
              }
              return ContinueStatement2;
            })();
            exports2.ContinueStatement = ContinueStatement;
            var DebuggerStatement = /* @__PURE__ */ (function() {
              function DebuggerStatement2() {
                this.type = syntax_1.Syntax.DebuggerStatement;
              }
              return DebuggerStatement2;
            })();
            exports2.DebuggerStatement = DebuggerStatement;
            var Directive = /* @__PURE__ */ (function() {
              function Directive2(expression, directive) {
                this.type = syntax_1.Syntax.ExpressionStatement, this.expression = expression, this.directive = directive;
              }
              return Directive2;
            })();
            exports2.Directive = Directive;
            var DoWhileStatement = /* @__PURE__ */ (function() {
              function DoWhileStatement2(body, test) {
                this.type = syntax_1.Syntax.DoWhileStatement, this.body = body, this.test = test;
              }
              return DoWhileStatement2;
            })();
            exports2.DoWhileStatement = DoWhileStatement;
            var EmptyStatement = /* @__PURE__ */ (function() {
              function EmptyStatement2() {
                this.type = syntax_1.Syntax.EmptyStatement;
              }
              return EmptyStatement2;
            })();
            exports2.EmptyStatement = EmptyStatement;
            var ExportAllDeclaration = /* @__PURE__ */ (function() {
              function ExportAllDeclaration2(source) {
                this.type = syntax_1.Syntax.ExportAllDeclaration, this.source = source;
              }
              return ExportAllDeclaration2;
            })();
            exports2.ExportAllDeclaration = ExportAllDeclaration;
            var ExportDefaultDeclaration = /* @__PURE__ */ (function() {
              function ExportDefaultDeclaration2(declaration) {
                this.type = syntax_1.Syntax.ExportDefaultDeclaration, this.declaration = declaration;
              }
              return ExportDefaultDeclaration2;
            })();
            exports2.ExportDefaultDeclaration = ExportDefaultDeclaration;
            var ExportNamedDeclaration = /* @__PURE__ */ (function() {
              function ExportNamedDeclaration2(declaration, specifiers, source) {
                this.type = syntax_1.Syntax.ExportNamedDeclaration, this.declaration = declaration, this.specifiers = specifiers, this.source = source;
              }
              return ExportNamedDeclaration2;
            })();
            exports2.ExportNamedDeclaration = ExportNamedDeclaration;
            var ExportSpecifier = /* @__PURE__ */ (function() {
              function ExportSpecifier2(local, exported) {
                this.type = syntax_1.Syntax.ExportSpecifier, this.exported = exported, this.local = local;
              }
              return ExportSpecifier2;
            })();
            exports2.ExportSpecifier = ExportSpecifier;
            var ExpressionStatement = /* @__PURE__ */ (function() {
              function ExpressionStatement2(expression) {
                this.type = syntax_1.Syntax.ExpressionStatement, this.expression = expression;
              }
              return ExpressionStatement2;
            })();
            exports2.ExpressionStatement = ExpressionStatement;
            var ForInStatement = /* @__PURE__ */ (function() {
              function ForInStatement2(left, right, body) {
                this.type = syntax_1.Syntax.ForInStatement, this.left = left, this.right = right, this.body = body, this.each = !1;
              }
              return ForInStatement2;
            })();
            exports2.ForInStatement = ForInStatement;
            var ForOfStatement = /* @__PURE__ */ (function() {
              function ForOfStatement2(left, right, body) {
                this.type = syntax_1.Syntax.ForOfStatement, this.left = left, this.right = right, this.body = body;
              }
              return ForOfStatement2;
            })();
            exports2.ForOfStatement = ForOfStatement;
            var ForStatement = /* @__PURE__ */ (function() {
              function ForStatement2(init, test, update, body) {
                this.type = syntax_1.Syntax.ForStatement, this.init = init, this.test = test, this.update = update, this.body = body;
              }
              return ForStatement2;
            })();
            exports2.ForStatement = ForStatement;
            var FunctionDeclaration = /* @__PURE__ */ (function() {
              function FunctionDeclaration2(id, params, body, generator) {
                this.type = syntax_1.Syntax.FunctionDeclaration, this.id = id, this.params = params, this.body = body, this.generator = generator, this.expression = !1, this.async = !1;
              }
              return FunctionDeclaration2;
            })();
            exports2.FunctionDeclaration = FunctionDeclaration;
            var FunctionExpression = /* @__PURE__ */ (function() {
              function FunctionExpression2(id, params, body, generator) {
                this.type = syntax_1.Syntax.FunctionExpression, this.id = id, this.params = params, this.body = body, this.generator = generator, this.expression = !1, this.async = !1;
              }
              return FunctionExpression2;
            })();
            exports2.FunctionExpression = FunctionExpression;
            var Identifier = /* @__PURE__ */ (function() {
              function Identifier2(name) {
                this.type = syntax_1.Syntax.Identifier, this.name = name;
              }
              return Identifier2;
            })();
            exports2.Identifier = Identifier;
            var IfStatement = /* @__PURE__ */ (function() {
              function IfStatement2(test, consequent, alternate) {
                this.type = syntax_1.Syntax.IfStatement, this.test = test, this.consequent = consequent, this.alternate = alternate;
              }
              return IfStatement2;
            })();
            exports2.IfStatement = IfStatement;
            var ImportDeclaration = /* @__PURE__ */ (function() {
              function ImportDeclaration2(specifiers, source) {
                this.type = syntax_1.Syntax.ImportDeclaration, this.specifiers = specifiers, this.source = source;
              }
              return ImportDeclaration2;
            })();
            exports2.ImportDeclaration = ImportDeclaration;
            var ImportDefaultSpecifier = /* @__PURE__ */ (function() {
              function ImportDefaultSpecifier2(local) {
                this.type = syntax_1.Syntax.ImportDefaultSpecifier, this.local = local;
              }
              return ImportDefaultSpecifier2;
            })();
            exports2.ImportDefaultSpecifier = ImportDefaultSpecifier;
            var ImportNamespaceSpecifier = /* @__PURE__ */ (function() {
              function ImportNamespaceSpecifier2(local) {
                this.type = syntax_1.Syntax.ImportNamespaceSpecifier, this.local = local;
              }
              return ImportNamespaceSpecifier2;
            })();
            exports2.ImportNamespaceSpecifier = ImportNamespaceSpecifier;
            var ImportSpecifier = /* @__PURE__ */ (function() {
              function ImportSpecifier2(local, imported) {
                this.type = syntax_1.Syntax.ImportSpecifier, this.local = local, this.imported = imported;
              }
              return ImportSpecifier2;
            })();
            exports2.ImportSpecifier = ImportSpecifier;
            var LabeledStatement = /* @__PURE__ */ (function() {
              function LabeledStatement2(label, body) {
                this.type = syntax_1.Syntax.LabeledStatement, this.label = label, this.body = body;
              }
              return LabeledStatement2;
            })();
            exports2.LabeledStatement = LabeledStatement;
            var Literal = /* @__PURE__ */ (function() {
              function Literal2(value, raw) {
                this.type = syntax_1.Syntax.Literal, this.value = value, this.raw = raw;
              }
              return Literal2;
            })();
            exports2.Literal = Literal;
            var MetaProperty = /* @__PURE__ */ (function() {
              function MetaProperty2(meta, property) {
                this.type = syntax_1.Syntax.MetaProperty, this.meta = meta, this.property = property;
              }
              return MetaProperty2;
            })();
            exports2.MetaProperty = MetaProperty;
            var MethodDefinition = /* @__PURE__ */ (function() {
              function MethodDefinition2(key, computed, value, kind, isStatic) {
                this.type = syntax_1.Syntax.MethodDefinition, this.key = key, this.computed = computed, this.value = value, this.kind = kind, this.static = isStatic;
              }
              return MethodDefinition2;
            })();
            exports2.MethodDefinition = MethodDefinition;
            var Module = /* @__PURE__ */ (function() {
              function Module2(body) {
                this.type = syntax_1.Syntax.Program, this.body = body, this.sourceType = "module";
              }
              return Module2;
            })();
            exports2.Module = Module;
            var NewExpression = /* @__PURE__ */ (function() {
              function NewExpression2(callee, args) {
                this.type = syntax_1.Syntax.NewExpression, this.callee = callee, this.arguments = args;
              }
              return NewExpression2;
            })();
            exports2.NewExpression = NewExpression;
            var ObjectExpression = /* @__PURE__ */ (function() {
              function ObjectExpression2(properties) {
                this.type = syntax_1.Syntax.ObjectExpression, this.properties = properties;
              }
              return ObjectExpression2;
            })();
            exports2.ObjectExpression = ObjectExpression;
            var ObjectPattern = /* @__PURE__ */ (function() {
              function ObjectPattern2(properties) {
                this.type = syntax_1.Syntax.ObjectPattern, this.properties = properties;
              }
              return ObjectPattern2;
            })();
            exports2.ObjectPattern = ObjectPattern;
            var Property = /* @__PURE__ */ (function() {
              function Property2(kind, key, computed, value, method, shorthand) {
                this.type = syntax_1.Syntax.Property, this.key = key, this.computed = computed, this.value = value, this.kind = kind, this.method = method, this.shorthand = shorthand;
              }
              return Property2;
            })();
            exports2.Property = Property;
            var RegexLiteral = /* @__PURE__ */ (function() {
              function RegexLiteral2(value, raw, pattern, flags) {
                this.type = syntax_1.Syntax.Literal, this.value = value, this.raw = raw, this.regex = { pattern, flags };
              }
              return RegexLiteral2;
            })();
            exports2.RegexLiteral = RegexLiteral;
            var RestElement = /* @__PURE__ */ (function() {
              function RestElement2(argument) {
                this.type = syntax_1.Syntax.RestElement, this.argument = argument;
              }
              return RestElement2;
            })();
            exports2.RestElement = RestElement;
            var ReturnStatement = /* @__PURE__ */ (function() {
              function ReturnStatement2(argument) {
                this.type = syntax_1.Syntax.ReturnStatement, this.argument = argument;
              }
              return ReturnStatement2;
            })();
            exports2.ReturnStatement = ReturnStatement;
            var Script = /* @__PURE__ */ (function() {
              function Script2(body) {
                this.type = syntax_1.Syntax.Program, this.body = body, this.sourceType = "script";
              }
              return Script2;
            })();
            exports2.Script = Script;
            var SequenceExpression = /* @__PURE__ */ (function() {
              function SequenceExpression2(expressions) {
                this.type = syntax_1.Syntax.SequenceExpression, this.expressions = expressions;
              }
              return SequenceExpression2;
            })();
            exports2.SequenceExpression = SequenceExpression;
            var SpreadElement = /* @__PURE__ */ (function() {
              function SpreadElement2(argument) {
                this.type = syntax_1.Syntax.SpreadElement, this.argument = argument;
              }
              return SpreadElement2;
            })();
            exports2.SpreadElement = SpreadElement;
            var StaticMemberExpression = /* @__PURE__ */ (function() {
              function StaticMemberExpression2(object, property) {
                this.type = syntax_1.Syntax.MemberExpression, this.computed = !1, this.object = object, this.property = property;
              }
              return StaticMemberExpression2;
            })();
            exports2.StaticMemberExpression = StaticMemberExpression;
            var Super = /* @__PURE__ */ (function() {
              function Super2() {
                this.type = syntax_1.Syntax.Super;
              }
              return Super2;
            })();
            exports2.Super = Super;
            var SwitchCase = /* @__PURE__ */ (function() {
              function SwitchCase2(test, consequent) {
                this.type = syntax_1.Syntax.SwitchCase, this.test = test, this.consequent = consequent;
              }
              return SwitchCase2;
            })();
            exports2.SwitchCase = SwitchCase;
            var SwitchStatement = /* @__PURE__ */ (function() {
              function SwitchStatement2(discriminant, cases) {
                this.type = syntax_1.Syntax.SwitchStatement, this.discriminant = discriminant, this.cases = cases;
              }
              return SwitchStatement2;
            })();
            exports2.SwitchStatement = SwitchStatement;
            var TaggedTemplateExpression = /* @__PURE__ */ (function() {
              function TaggedTemplateExpression2(tag, quasi) {
                this.type = syntax_1.Syntax.TaggedTemplateExpression, this.tag = tag, this.quasi = quasi;
              }
              return TaggedTemplateExpression2;
            })();
            exports2.TaggedTemplateExpression = TaggedTemplateExpression;
            var TemplateElement = /* @__PURE__ */ (function() {
              function TemplateElement2(value, tail) {
                this.type = syntax_1.Syntax.TemplateElement, this.value = value, this.tail = tail;
              }
              return TemplateElement2;
            })();
            exports2.TemplateElement = TemplateElement;
            var TemplateLiteral = /* @__PURE__ */ (function() {
              function TemplateLiteral2(quasis, expressions) {
                this.type = syntax_1.Syntax.TemplateLiteral, this.quasis = quasis, this.expressions = expressions;
              }
              return TemplateLiteral2;
            })();
            exports2.TemplateLiteral = TemplateLiteral;
            var ThisExpression = /* @__PURE__ */ (function() {
              function ThisExpression2() {
                this.type = syntax_1.Syntax.ThisExpression;
              }
              return ThisExpression2;
            })();
            exports2.ThisExpression = ThisExpression;
            var ThrowStatement = /* @__PURE__ */ (function() {
              function ThrowStatement2(argument) {
                this.type = syntax_1.Syntax.ThrowStatement, this.argument = argument;
              }
              return ThrowStatement2;
            })();
            exports2.ThrowStatement = ThrowStatement;
            var TryStatement = /* @__PURE__ */ (function() {
              function TryStatement2(block, handler, finalizer) {
                this.type = syntax_1.Syntax.TryStatement, this.block = block, this.handler = handler, this.finalizer = finalizer;
              }
              return TryStatement2;
            })();
            exports2.TryStatement = TryStatement;
            var UnaryExpression = /* @__PURE__ */ (function() {
              function UnaryExpression2(operator, argument) {
                this.type = syntax_1.Syntax.UnaryExpression, this.operator = operator, this.argument = argument, this.prefix = !0;
              }
              return UnaryExpression2;
            })();
            exports2.UnaryExpression = UnaryExpression;
            var UpdateExpression = /* @__PURE__ */ (function() {
              function UpdateExpression2(operator, argument, prefix) {
                this.type = syntax_1.Syntax.UpdateExpression, this.operator = operator, this.argument = argument, this.prefix = prefix;
              }
              return UpdateExpression2;
            })();
            exports2.UpdateExpression = UpdateExpression;
            var VariableDeclaration = /* @__PURE__ */ (function() {
              function VariableDeclaration2(declarations, kind) {
                this.type = syntax_1.Syntax.VariableDeclaration, this.declarations = declarations, this.kind = kind;
              }
              return VariableDeclaration2;
            })();
            exports2.VariableDeclaration = VariableDeclaration;
            var VariableDeclarator = /* @__PURE__ */ (function() {
              function VariableDeclarator2(id, init) {
                this.type = syntax_1.Syntax.VariableDeclarator, this.id = id, this.init = init;
              }
              return VariableDeclarator2;
            })();
            exports2.VariableDeclarator = VariableDeclarator;
            var WhileStatement = /* @__PURE__ */ (function() {
              function WhileStatement2(test, body) {
                this.type = syntax_1.Syntax.WhileStatement, this.test = test, this.body = body;
              }
              return WhileStatement2;
            })();
            exports2.WhileStatement = WhileStatement;
            var WithStatement = /* @__PURE__ */ (function() {
              function WithStatement2(object, body) {
                this.type = syntax_1.Syntax.WithStatement, this.object = object, this.body = body;
              }
              return WithStatement2;
            })();
            exports2.WithStatement = WithStatement;
            var YieldExpression = /* @__PURE__ */ (function() {
              function YieldExpression2(argument, delegate) {
                this.type = syntax_1.Syntax.YieldExpression, this.argument = argument, this.delegate = delegate;
              }
              return YieldExpression2;
            })();
            exports2.YieldExpression = YieldExpression;
          },
          /* 8 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var assert_1 = __webpack_require__(9), error_handler_1 = __webpack_require__(10), messages_1 = __webpack_require__(11), Node = __webpack_require__(7), scanner_1 = __webpack_require__(12), syntax_1 = __webpack_require__(2), token_1 = __webpack_require__(13), ArrowParameterPlaceHolder = "ArrowParameterPlaceHolder", Parser = (function() {
              function Parser2(code, options, delegate) {
                options === void 0 && (options = {}), this.config = {
                  range: typeof options.range == "boolean" && options.range,
                  loc: typeof options.loc == "boolean" && options.loc,
                  source: null,
                  tokens: typeof options.tokens == "boolean" && options.tokens,
                  comment: typeof options.comment == "boolean" && options.comment,
                  tolerant: typeof options.tolerant == "boolean" && options.tolerant
                }, this.config.loc && options.source && options.source !== null && (this.config.source = String(options.source)), this.delegate = delegate, this.errorHandler = new error_handler_1.ErrorHandler(), this.errorHandler.tolerant = this.config.tolerant, this.scanner = new scanner_1.Scanner(code, this.errorHandler), this.scanner.trackComment = this.config.comment, this.operatorPrecedence = {
                  ")": 0,
                  ";": 0,
                  ",": 0,
                  "=": 0,
                  "]": 0,
                  "||": 1,
                  "&&": 2,
                  "|": 3,
                  "^": 4,
                  "&": 5,
                  "==": 6,
                  "!=": 6,
                  "===": 6,
                  "!==": 6,
                  "<": 7,
                  ">": 7,
                  "<=": 7,
                  ">=": 7,
                  "<<": 8,
                  ">>": 8,
                  ">>>": 8,
                  "+": 9,
                  "-": 9,
                  "*": 11,
                  "/": 11,
                  "%": 11
                }, this.lookahead = {
                  type: 2,
                  value: "",
                  lineNumber: this.scanner.lineNumber,
                  lineStart: 0,
                  start: 0,
                  end: 0
                }, this.hasLineTerminator = !1, this.context = {
                  isModule: !1,
                  await: !1,
                  allowIn: !0,
                  allowStrictDirective: !0,
                  allowYield: !0,
                  firstCoverInitializedNameError: null,
                  isAssignmentTarget: !1,
                  isBindingElement: !1,
                  inFunctionBody: !1,
                  inIteration: !1,
                  inSwitch: !1,
                  labelSet: {},
                  strict: !1
                }, this.tokens = [], this.startMarker = {
                  index: 0,
                  line: this.scanner.lineNumber,
                  column: 0
                }, this.lastMarker = {
                  index: 0,
                  line: this.scanner.lineNumber,
                  column: 0
                }, this.nextToken(), this.lastMarker = {
                  index: this.scanner.index,
                  line: this.scanner.lineNumber,
                  column: this.scanner.index - this.scanner.lineStart
                };
              }
              return Parser2.prototype.throwError = function(messageFormat) {
                for (var values = [], _i = 1; _i < arguments.length; _i++)
                  values[_i - 1] = arguments[_i];
                var args = Array.prototype.slice.call(arguments, 1), msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
                  return assert_1.assert(idx < args.length, "Message reference must be in range"), args[idx];
                }), index = this.lastMarker.index, line = this.lastMarker.line, column = this.lastMarker.column + 1;
                throw this.errorHandler.createError(index, line, column, msg);
              }, Parser2.prototype.tolerateError = function(messageFormat) {
                for (var values = [], _i = 1; _i < arguments.length; _i++)
                  values[_i - 1] = arguments[_i];
                var args = Array.prototype.slice.call(arguments, 1), msg = messageFormat.replace(/%(\d)/g, function(whole, idx) {
                  return assert_1.assert(idx < args.length, "Message reference must be in range"), args[idx];
                }), index = this.lastMarker.index, line = this.scanner.lineNumber, column = this.lastMarker.column + 1;
                this.errorHandler.tolerateError(index, line, column, msg);
              }, Parser2.prototype.unexpectedTokenError = function(token, message) {
                var msg = message || messages_1.Messages.UnexpectedToken, value;
                if (token ? (message || (msg = token.type === 2 ? messages_1.Messages.UnexpectedEOS : token.type === 3 ? messages_1.Messages.UnexpectedIdentifier : token.type === 6 ? messages_1.Messages.UnexpectedNumber : token.type === 8 ? messages_1.Messages.UnexpectedString : token.type === 10 ? messages_1.Messages.UnexpectedTemplate : messages_1.Messages.UnexpectedToken, token.type === 4 && (this.scanner.isFutureReservedWord(token.value) ? msg = messages_1.Messages.UnexpectedReserved : this.context.strict && this.scanner.isStrictModeReservedWord(token.value) && (msg = messages_1.Messages.StrictReservedWord))), value = token.value) : value = "ILLEGAL", msg = msg.replace("%0", value), token && typeof token.lineNumber == "number") {
                  var index = token.start, line = token.lineNumber, lastMarkerLineStart = this.lastMarker.index - this.lastMarker.column, column = token.start - lastMarkerLineStart + 1;
                  return this.errorHandler.createError(index, line, column, msg);
                } else {
                  var index = this.lastMarker.index, line = this.lastMarker.line, column = this.lastMarker.column + 1;
                  return this.errorHandler.createError(index, line, column, msg);
                }
              }, Parser2.prototype.throwUnexpectedToken = function(token, message) {
                throw this.unexpectedTokenError(token, message);
              }, Parser2.prototype.tolerateUnexpectedToken = function(token, message) {
                this.errorHandler.tolerate(this.unexpectedTokenError(token, message));
              }, Parser2.prototype.collectComments = function() {
                if (!this.config.comment)
                  this.scanner.scanComments();
                else {
                  var comments = this.scanner.scanComments();
                  if (comments.length > 0 && this.delegate)
                    for (var i = 0; i < comments.length; ++i) {
                      var e = comments[i], node = void 0;
                      node = {
                        type: e.multiLine ? "BlockComment" : "LineComment",
                        value: this.scanner.source.slice(e.slice[0], e.slice[1])
                      }, this.config.range && (node.range = e.range), this.config.loc && (node.loc = e.loc);
                      var metadata = {
                        start: {
                          line: e.loc.start.line,
                          column: e.loc.start.column,
                          offset: e.range[0]
                        },
                        end: {
                          line: e.loc.end.line,
                          column: e.loc.end.column,
                          offset: e.range[1]
                        }
                      };
                      this.delegate(node, metadata);
                    }
                }
              }, Parser2.prototype.getTokenRaw = function(token) {
                return this.scanner.source.slice(token.start, token.end);
              }, Parser2.prototype.convertToken = function(token) {
                var t = {
                  type: token_1.TokenName[token.type],
                  value: this.getTokenRaw(token)
                };
                if (this.config.range && (t.range = [token.start, token.end]), this.config.loc && (t.loc = {
                  start: {
                    line: this.startMarker.line,
                    column: this.startMarker.column
                  },
                  end: {
                    line: this.scanner.lineNumber,
                    column: this.scanner.index - this.scanner.lineStart
                  }
                }), token.type === 9) {
                  var pattern = token.pattern, flags = token.flags;
                  t.regex = { pattern, flags };
                }
                return t;
              }, Parser2.prototype.nextToken = function() {
                var token = this.lookahead;
                this.lastMarker.index = this.scanner.index, this.lastMarker.line = this.scanner.lineNumber, this.lastMarker.column = this.scanner.index - this.scanner.lineStart, this.collectComments(), this.scanner.index !== this.startMarker.index && (this.startMarker.index = this.scanner.index, this.startMarker.line = this.scanner.lineNumber, this.startMarker.column = this.scanner.index - this.scanner.lineStart);
                var next = this.scanner.lex();
                return this.hasLineTerminator = token.lineNumber !== next.lineNumber, next && this.context.strict && next.type === 3 && this.scanner.isStrictModeReservedWord(next.value) && (next.type = 4), this.lookahead = next, this.config.tokens && next.type !== 2 && this.tokens.push(this.convertToken(next)), token;
              }, Parser2.prototype.nextRegexToken = function() {
                this.collectComments();
                var token = this.scanner.scanRegExp();
                return this.config.tokens && (this.tokens.pop(), this.tokens.push(this.convertToken(token))), this.lookahead = token, this.nextToken(), token;
              }, Parser2.prototype.createNode = function() {
                return {
                  index: this.startMarker.index,
                  line: this.startMarker.line,
                  column: this.startMarker.column
                };
              }, Parser2.prototype.startNode = function(token, lastLineStart) {
                lastLineStart === void 0 && (lastLineStart = 0);
                var column = token.start - token.lineStart, line = token.lineNumber;
                return column < 0 && (column += lastLineStart, line--), {
                  index: token.start,
                  line,
                  column
                };
              }, Parser2.prototype.finalize = function(marker, node) {
                if (this.config.range && (node.range = [marker.index, this.lastMarker.index]), this.config.loc && (node.loc = {
                  start: {
                    line: marker.line,
                    column: marker.column
                  },
                  end: {
                    line: this.lastMarker.line,
                    column: this.lastMarker.column
                  }
                }, this.config.source && (node.loc.source = this.config.source)), this.delegate) {
                  var metadata = {
                    start: {
                      line: marker.line,
                      column: marker.column,
                      offset: marker.index
                    },
                    end: {
                      line: this.lastMarker.line,
                      column: this.lastMarker.column,
                      offset: this.lastMarker.index
                    }
                  };
                  this.delegate(node, metadata);
                }
                return node;
              }, Parser2.prototype.expect = function(value) {
                var token = this.nextToken();
                (token.type !== 7 || token.value !== value) && this.throwUnexpectedToken(token);
              }, Parser2.prototype.expectCommaSeparator = function() {
                if (this.config.tolerant) {
                  var token = this.lookahead;
                  token.type === 7 && token.value === "," ? this.nextToken() : token.type === 7 && token.value === ";" ? (this.nextToken(), this.tolerateUnexpectedToken(token)) : this.tolerateUnexpectedToken(token, messages_1.Messages.UnexpectedToken);
                } else
                  this.expect(",");
              }, Parser2.prototype.expectKeyword = function(keyword) {
                var token = this.nextToken();
                (token.type !== 4 || token.value !== keyword) && this.throwUnexpectedToken(token);
              }, Parser2.prototype.match = function(value) {
                return this.lookahead.type === 7 && this.lookahead.value === value;
              }, Parser2.prototype.matchKeyword = function(keyword) {
                return this.lookahead.type === 4 && this.lookahead.value === keyword;
              }, Parser2.prototype.matchContextualKeyword = function(keyword) {
                return this.lookahead.type === 3 && this.lookahead.value === keyword;
              }, Parser2.prototype.matchAssign = function() {
                if (this.lookahead.type !== 7)
                  return !1;
                var op = this.lookahead.value;
                return op === "=" || op === "*=" || op === "**=" || op === "/=" || op === "%=" || op === "+=" || op === "-=" || op === "<<=" || op === ">>=" || op === ">>>=" || op === "&=" || op === "^=" || op === "|=";
              }, Parser2.prototype.isolateCoverGrammar = function(parseFunction) {
                var previousIsBindingElement = this.context.isBindingElement, previousIsAssignmentTarget = this.context.isAssignmentTarget, previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
                this.context.isBindingElement = !0, this.context.isAssignmentTarget = !0, this.context.firstCoverInitializedNameError = null;
                var result = parseFunction.call(this);
                return this.context.firstCoverInitializedNameError !== null && this.throwUnexpectedToken(this.context.firstCoverInitializedNameError), this.context.isBindingElement = previousIsBindingElement, this.context.isAssignmentTarget = previousIsAssignmentTarget, this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError, result;
              }, Parser2.prototype.inheritCoverGrammar = function(parseFunction) {
                var previousIsBindingElement = this.context.isBindingElement, previousIsAssignmentTarget = this.context.isAssignmentTarget, previousFirstCoverInitializedNameError = this.context.firstCoverInitializedNameError;
                this.context.isBindingElement = !0, this.context.isAssignmentTarget = !0, this.context.firstCoverInitializedNameError = null;
                var result = parseFunction.call(this);
                return this.context.isBindingElement = this.context.isBindingElement && previousIsBindingElement, this.context.isAssignmentTarget = this.context.isAssignmentTarget && previousIsAssignmentTarget, this.context.firstCoverInitializedNameError = previousFirstCoverInitializedNameError || this.context.firstCoverInitializedNameError, result;
              }, Parser2.prototype.consumeSemicolon = function() {
                this.match(";") ? this.nextToken() : this.hasLineTerminator || (this.lookahead.type !== 2 && !this.match("}") && this.throwUnexpectedToken(this.lookahead), this.lastMarker.index = this.startMarker.index, this.lastMarker.line = this.startMarker.line, this.lastMarker.column = this.startMarker.column);
              }, Parser2.prototype.parsePrimaryExpression = function() {
                var node = this.createNode(), expr, token, raw;
                switch (this.lookahead.type) {
                  case 3:
                    (this.context.isModule || this.context.await) && this.lookahead.value === "await" && this.tolerateUnexpectedToken(this.lookahead), expr = this.matchAsyncFunction() ? this.parseFunctionExpression() : this.finalize(node, new Node.Identifier(this.nextToken().value));
                    break;
                  case 6:
                  case 8:
                    this.context.strict && this.lookahead.octal && this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.StrictOctalLiteral), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1, token = this.nextToken(), raw = this.getTokenRaw(token), expr = this.finalize(node, new Node.Literal(token.value, raw));
                    break;
                  case 1:
                    this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1, token = this.nextToken(), raw = this.getTokenRaw(token), expr = this.finalize(node, new Node.Literal(token.value === "true", raw));
                    break;
                  case 5:
                    this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1, token = this.nextToken(), raw = this.getTokenRaw(token), expr = this.finalize(node, new Node.Literal(null, raw));
                    break;
                  case 10:
                    expr = this.parseTemplateLiteral();
                    break;
                  case 7:
                    switch (this.lookahead.value) {
                      case "(":
                        this.context.isBindingElement = !1, expr = this.inheritCoverGrammar(this.parseGroupExpression);
                        break;
                      case "[":
                        expr = this.inheritCoverGrammar(this.parseArrayInitializer);
                        break;
                      case "{":
                        expr = this.inheritCoverGrammar(this.parseObjectInitializer);
                        break;
                      case "/":
                      case "/=":
                        this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1, this.scanner.index = this.startMarker.index, token = this.nextRegexToken(), raw = this.getTokenRaw(token), expr = this.finalize(node, new Node.RegexLiteral(token.regex, raw, token.pattern, token.flags));
                        break;
                      default:
                        expr = this.throwUnexpectedToken(this.nextToken());
                    }
                    break;
                  case 4:
                    !this.context.strict && this.context.allowYield && this.matchKeyword("yield") ? expr = this.parseIdentifierName() : !this.context.strict && this.matchKeyword("let") ? expr = this.finalize(node, new Node.Identifier(this.nextToken().value)) : (this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1, this.matchKeyword("function") ? expr = this.parseFunctionExpression() : this.matchKeyword("this") ? (this.nextToken(), expr = this.finalize(node, new Node.ThisExpression())) : this.matchKeyword("class") ? expr = this.parseClassExpression() : expr = this.throwUnexpectedToken(this.nextToken()));
                    break;
                  default:
                    expr = this.throwUnexpectedToken(this.nextToken());
                }
                return expr;
              }, Parser2.prototype.parseSpreadElement = function() {
                var node = this.createNode();
                this.expect("...");
                var arg = this.inheritCoverGrammar(this.parseAssignmentExpression);
                return this.finalize(node, new Node.SpreadElement(arg));
              }, Parser2.prototype.parseArrayInitializer = function() {
                var node = this.createNode(), elements = [];
                for (this.expect("["); !this.match("]"); )
                  if (this.match(","))
                    this.nextToken(), elements.push(null);
                  else if (this.match("...")) {
                    var element = this.parseSpreadElement();
                    this.match("]") || (this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1, this.expect(",")), elements.push(element);
                  } else
                    elements.push(this.inheritCoverGrammar(this.parseAssignmentExpression)), this.match("]") || this.expect(",");
                return this.expect("]"), this.finalize(node, new Node.ArrayExpression(elements));
              }, Parser2.prototype.parsePropertyMethod = function(params) {
                this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                var previousStrict = this.context.strict, previousAllowStrictDirective = this.context.allowStrictDirective;
                this.context.allowStrictDirective = params.simple;
                var body = this.isolateCoverGrammar(this.parseFunctionSourceElements);
                return this.context.strict && params.firstRestricted && this.tolerateUnexpectedToken(params.firstRestricted, params.message), this.context.strict && params.stricted && this.tolerateUnexpectedToken(params.stricted, params.message), this.context.strict = previousStrict, this.context.allowStrictDirective = previousAllowStrictDirective, body;
              }, Parser2.prototype.parsePropertyMethodFunction = function() {
                var isGenerator = !1, node = this.createNode(), previousAllowYield = this.context.allowYield;
                this.context.allowYield = !0;
                var params = this.parseFormalParameters(), method = this.parsePropertyMethod(params);
                return this.context.allowYield = previousAllowYield, this.finalize(node, new Node.FunctionExpression(null, params.params, method, isGenerator));
              }, Parser2.prototype.parsePropertyMethodAsyncFunction = function() {
                var node = this.createNode(), previousAllowYield = this.context.allowYield, previousAwait = this.context.await;
                this.context.allowYield = !1, this.context.await = !0;
                var params = this.parseFormalParameters(), method = this.parsePropertyMethod(params);
                return this.context.allowYield = previousAllowYield, this.context.await = previousAwait, this.finalize(node, new Node.AsyncFunctionExpression(null, params.params, method));
              }, Parser2.prototype.parseObjectPropertyKey = function() {
                var node = this.createNode(), token = this.nextToken(), key;
                switch (token.type) {
                  case 8:
                  case 6:
                    this.context.strict && token.octal && this.tolerateUnexpectedToken(token, messages_1.Messages.StrictOctalLiteral);
                    var raw = this.getTokenRaw(token);
                    key = this.finalize(node, new Node.Literal(token.value, raw));
                    break;
                  case 3:
                  case 1:
                  case 5:
                  case 4:
                    key = this.finalize(node, new Node.Identifier(token.value));
                    break;
                  case 7:
                    token.value === "[" ? (key = this.isolateCoverGrammar(this.parseAssignmentExpression), this.expect("]")) : key = this.throwUnexpectedToken(token);
                    break;
                  default:
                    key = this.throwUnexpectedToken(token);
                }
                return key;
              }, Parser2.prototype.isPropertyKey = function(key, value) {
                return key.type === syntax_1.Syntax.Identifier && key.name === value || key.type === syntax_1.Syntax.Literal && key.value === value;
              }, Parser2.prototype.parseObjectProperty = function(hasProto) {
                var node = this.createNode(), token = this.lookahead, kind, key = null, value = null, computed = !1, method = !1, shorthand = !1, isAsync = !1;
                if (token.type === 3) {
                  var id = token.value;
                  this.nextToken(), computed = this.match("["), isAsync = !this.hasLineTerminator && id === "async" && !this.match(":") && !this.match("(") && !this.match("*") && !this.match(","), key = isAsync ? this.parseObjectPropertyKey() : this.finalize(node, new Node.Identifier(id));
                } else this.match("*") ? this.nextToken() : (computed = this.match("["), key = this.parseObjectPropertyKey());
                var lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
                if (token.type === 3 && !isAsync && token.value === "get" && lookaheadPropertyKey)
                  kind = "get", computed = this.match("["), key = this.parseObjectPropertyKey(), this.context.allowYield = !1, value = this.parseGetterMethod();
                else if (token.type === 3 && !isAsync && token.value === "set" && lookaheadPropertyKey)
                  kind = "set", computed = this.match("["), key = this.parseObjectPropertyKey(), value = this.parseSetterMethod();
                else if (token.type === 7 && token.value === "*" && lookaheadPropertyKey)
                  kind = "init", computed = this.match("["), key = this.parseObjectPropertyKey(), value = this.parseGeneratorMethod(), method = !0;
                else if (key || this.throwUnexpectedToken(this.lookahead), kind = "init", this.match(":") && !isAsync)
                  !computed && this.isPropertyKey(key, "__proto__") && (hasProto.value && this.tolerateError(messages_1.Messages.DuplicateProtoProperty), hasProto.value = !0), this.nextToken(), value = this.inheritCoverGrammar(this.parseAssignmentExpression);
                else if (this.match("("))
                  value = isAsync ? this.parsePropertyMethodAsyncFunction() : this.parsePropertyMethodFunction(), method = !0;
                else if (token.type === 3) {
                  var id = this.finalize(node, new Node.Identifier(token.value));
                  if (this.match("=")) {
                    this.context.firstCoverInitializedNameError = this.lookahead, this.nextToken(), shorthand = !0;
                    var init = this.isolateCoverGrammar(this.parseAssignmentExpression);
                    value = this.finalize(node, new Node.AssignmentPattern(id, init));
                  } else
                    shorthand = !0, value = id;
                } else
                  this.throwUnexpectedToken(this.nextToken());
                return this.finalize(node, new Node.Property(kind, key, computed, value, method, shorthand));
              }, Parser2.prototype.parseObjectInitializer = function() {
                var node = this.createNode();
                this.expect("{");
                for (var properties = [], hasProto = { value: !1 }; !this.match("}"); )
                  properties.push(this.parseObjectProperty(hasProto)), this.match("}") || this.expectCommaSeparator();
                return this.expect("}"), this.finalize(node, new Node.ObjectExpression(properties));
              }, Parser2.prototype.parseTemplateHead = function() {
                assert_1.assert(this.lookahead.head, "Template literal must start with a template head");
                var node = this.createNode(), token = this.nextToken(), raw = token.value, cooked = token.cooked;
                return this.finalize(node, new Node.TemplateElement({ raw, cooked }, token.tail));
              }, Parser2.prototype.parseTemplateElement = function() {
                this.lookahead.type !== 10 && this.throwUnexpectedToken();
                var node = this.createNode(), token = this.nextToken(), raw = token.value, cooked = token.cooked;
                return this.finalize(node, new Node.TemplateElement({ raw, cooked }, token.tail));
              }, Parser2.prototype.parseTemplateLiteral = function() {
                var node = this.createNode(), expressions = [], quasis = [], quasi = this.parseTemplateHead();
                for (quasis.push(quasi); !quasi.tail; )
                  expressions.push(this.parseExpression()), quasi = this.parseTemplateElement(), quasis.push(quasi);
                return this.finalize(node, new Node.TemplateLiteral(quasis, expressions));
              }, Parser2.prototype.reinterpretExpressionAsPattern = function(expr) {
                switch (expr.type) {
                  case syntax_1.Syntax.Identifier:
                  case syntax_1.Syntax.MemberExpression:
                  case syntax_1.Syntax.RestElement:
                  case syntax_1.Syntax.AssignmentPattern:
                    break;
                  case syntax_1.Syntax.SpreadElement:
                    expr.type = syntax_1.Syntax.RestElement, this.reinterpretExpressionAsPattern(expr.argument);
                    break;
                  case syntax_1.Syntax.ArrayExpression:
                    expr.type = syntax_1.Syntax.ArrayPattern;
                    for (var i = 0; i < expr.elements.length; i++)
                      expr.elements[i] !== null && this.reinterpretExpressionAsPattern(expr.elements[i]);
                    break;
                  case syntax_1.Syntax.ObjectExpression:
                    expr.type = syntax_1.Syntax.ObjectPattern;
                    for (var i = 0; i < expr.properties.length; i++)
                      this.reinterpretExpressionAsPattern(expr.properties[i].value);
                    break;
                  case syntax_1.Syntax.AssignmentExpression:
                    expr.type = syntax_1.Syntax.AssignmentPattern, delete expr.operator, this.reinterpretExpressionAsPattern(expr.left);
                    break;
                  default:
                    break;
                }
              }, Parser2.prototype.parseGroupExpression = function() {
                var expr;
                if (this.expect("("), this.match(")"))
                  this.nextToken(), this.match("=>") || this.expect("=>"), expr = {
                    type: ArrowParameterPlaceHolder,
                    params: [],
                    async: !1
                  };
                else {
                  var startToken = this.lookahead, params = [];
                  if (this.match("..."))
                    expr = this.parseRestElement(params), this.expect(")"), this.match("=>") || this.expect("=>"), expr = {
                      type: ArrowParameterPlaceHolder,
                      params: [expr],
                      async: !1
                    };
                  else {
                    var arrow = !1;
                    if (this.context.isBindingElement = !0, expr = this.inheritCoverGrammar(this.parseAssignmentExpression), this.match(",")) {
                      var expressions = [];
                      for (this.context.isAssignmentTarget = !1, expressions.push(expr); this.lookahead.type !== 2 && this.match(","); ) {
                        if (this.nextToken(), this.match(")")) {
                          this.nextToken();
                          for (var i = 0; i < expressions.length; i++)
                            this.reinterpretExpressionAsPattern(expressions[i]);
                          arrow = !0, expr = {
                            type: ArrowParameterPlaceHolder,
                            params: expressions,
                            async: !1
                          };
                        } else if (this.match("...")) {
                          this.context.isBindingElement || this.throwUnexpectedToken(this.lookahead), expressions.push(this.parseRestElement(params)), this.expect(")"), this.match("=>") || this.expect("=>"), this.context.isBindingElement = !1;
                          for (var i = 0; i < expressions.length; i++)
                            this.reinterpretExpressionAsPattern(expressions[i]);
                          arrow = !0, expr = {
                            type: ArrowParameterPlaceHolder,
                            params: expressions,
                            async: !1
                          };
                        } else
                          expressions.push(this.inheritCoverGrammar(this.parseAssignmentExpression));
                        if (arrow)
                          break;
                      }
                      arrow || (expr = this.finalize(this.startNode(startToken), new Node.SequenceExpression(expressions)));
                    }
                    if (!arrow) {
                      if (this.expect(")"), this.match("=>") && (expr.type === syntax_1.Syntax.Identifier && expr.name === "yield" && (arrow = !0, expr = {
                        type: ArrowParameterPlaceHolder,
                        params: [expr],
                        async: !1
                      }), !arrow)) {
                        if (this.context.isBindingElement || this.throwUnexpectedToken(this.lookahead), expr.type === syntax_1.Syntax.SequenceExpression)
                          for (var i = 0; i < expr.expressions.length; i++)
                            this.reinterpretExpressionAsPattern(expr.expressions[i]);
                        else
                          this.reinterpretExpressionAsPattern(expr);
                        var parameters = expr.type === syntax_1.Syntax.SequenceExpression ? expr.expressions : [expr];
                        expr = {
                          type: ArrowParameterPlaceHolder,
                          params: parameters,
                          async: !1
                        };
                      }
                      this.context.isBindingElement = !1;
                    }
                  }
                }
                return expr;
              }, Parser2.prototype.parseArguments = function() {
                this.expect("(");
                var args = [];
                if (!this.match(")"))
                  for (; ; ) {
                    var expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAssignmentExpression);
                    if (args.push(expr), this.match(")") || (this.expectCommaSeparator(), this.match(")")))
                      break;
                  }
                return this.expect(")"), args;
              }, Parser2.prototype.isIdentifierName = function(token) {
                return token.type === 3 || token.type === 4 || token.type === 1 || token.type === 5;
              }, Parser2.prototype.parseIdentifierName = function() {
                var node = this.createNode(), token = this.nextToken();
                return this.isIdentifierName(token) || this.throwUnexpectedToken(token), this.finalize(node, new Node.Identifier(token.value));
              }, Parser2.prototype.parseNewExpression = function() {
                var node = this.createNode(), id = this.parseIdentifierName();
                assert_1.assert(id.name === "new", "New expression must start with `new`");
                var expr;
                if (this.match("."))
                  if (this.nextToken(), this.lookahead.type === 3 && this.context.inFunctionBody && this.lookahead.value === "target") {
                    var property = this.parseIdentifierName();
                    expr = new Node.MetaProperty(id, property);
                  } else
                    this.throwUnexpectedToken(this.lookahead);
                else {
                  var callee = this.isolateCoverGrammar(this.parseLeftHandSideExpression), args = this.match("(") ? this.parseArguments() : [];
                  expr = new Node.NewExpression(callee, args), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                }
                return this.finalize(node, expr);
              }, Parser2.prototype.parseAsyncArgument = function() {
                var arg = this.parseAssignmentExpression();
                return this.context.firstCoverInitializedNameError = null, arg;
              }, Parser2.prototype.parseAsyncArguments = function() {
                this.expect("(");
                var args = [];
                if (!this.match(")"))
                  for (; ; ) {
                    var expr = this.match("...") ? this.parseSpreadElement() : this.isolateCoverGrammar(this.parseAsyncArgument);
                    if (args.push(expr), this.match(")") || (this.expectCommaSeparator(), this.match(")")))
                      break;
                  }
                return this.expect(")"), args;
              }, Parser2.prototype.parseLeftHandSideExpressionAllowCall = function() {
                var startToken = this.lookahead, maybeAsync = this.matchContextualKeyword("async"), previousAllowIn = this.context.allowIn;
                this.context.allowIn = !0;
                var expr;
                for (this.matchKeyword("super") && this.context.inFunctionBody ? (expr = this.createNode(), this.nextToken(), expr = this.finalize(expr, new Node.Super()), !this.match("(") && !this.match(".") && !this.match("[") && this.throwUnexpectedToken(this.lookahead)) : expr = this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression); ; )
                  if (this.match(".")) {
                    this.context.isBindingElement = !1, this.context.isAssignmentTarget = !0, this.expect(".");
                    var property = this.parseIdentifierName();
                    expr = this.finalize(this.startNode(startToken), new Node.StaticMemberExpression(expr, property));
                  } else if (this.match("(")) {
                    var asyncArrow = maybeAsync && startToken.lineNumber === this.lookahead.lineNumber;
                    this.context.isBindingElement = !1, this.context.isAssignmentTarget = !1;
                    var args = asyncArrow ? this.parseAsyncArguments() : this.parseArguments();
                    if (expr = this.finalize(this.startNode(startToken), new Node.CallExpression(expr, args)), asyncArrow && this.match("=>")) {
                      for (var i = 0; i < args.length; ++i)
                        this.reinterpretExpressionAsPattern(args[i]);
                      expr = {
                        type: ArrowParameterPlaceHolder,
                        params: args,
                        async: !0
                      };
                    }
                  } else if (this.match("[")) {
                    this.context.isBindingElement = !1, this.context.isAssignmentTarget = !0, this.expect("[");
                    var property = this.isolateCoverGrammar(this.parseExpression);
                    this.expect("]"), expr = this.finalize(this.startNode(startToken), new Node.ComputedMemberExpression(expr, property));
                  } else if (this.lookahead.type === 10 && this.lookahead.head) {
                    var quasi = this.parseTemplateLiteral();
                    expr = this.finalize(this.startNode(startToken), new Node.TaggedTemplateExpression(expr, quasi));
                  } else
                    break;
                return this.context.allowIn = previousAllowIn, expr;
              }, Parser2.prototype.parseSuper = function() {
                var node = this.createNode();
                return this.expectKeyword("super"), !this.match("[") && !this.match(".") && this.throwUnexpectedToken(this.lookahead), this.finalize(node, new Node.Super());
              }, Parser2.prototype.parseLeftHandSideExpression = function() {
                assert_1.assert(this.context.allowIn, "callee of new expression always allow in keyword.");
                for (var node = this.startNode(this.lookahead), expr = this.matchKeyword("super") && this.context.inFunctionBody ? this.parseSuper() : this.inheritCoverGrammar(this.matchKeyword("new") ? this.parseNewExpression : this.parsePrimaryExpression); ; )
                  if (this.match("[")) {
                    this.context.isBindingElement = !1, this.context.isAssignmentTarget = !0, this.expect("[");
                    var property = this.isolateCoverGrammar(this.parseExpression);
                    this.expect("]"), expr = this.finalize(node, new Node.ComputedMemberExpression(expr, property));
                  } else if (this.match(".")) {
                    this.context.isBindingElement = !1, this.context.isAssignmentTarget = !0, this.expect(".");
                    var property = this.parseIdentifierName();
                    expr = this.finalize(node, new Node.StaticMemberExpression(expr, property));
                  } else if (this.lookahead.type === 10 && this.lookahead.head) {
                    var quasi = this.parseTemplateLiteral();
                    expr = this.finalize(node, new Node.TaggedTemplateExpression(expr, quasi));
                  } else
                    break;
                return expr;
              }, Parser2.prototype.parseUpdateExpression = function() {
                var expr, startToken = this.lookahead;
                if (this.match("++") || this.match("--")) {
                  var node = this.startNode(startToken), token = this.nextToken();
                  expr = this.inheritCoverGrammar(this.parseUnaryExpression), this.context.strict && expr.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(expr.name) && this.tolerateError(messages_1.Messages.StrictLHSPrefix), this.context.isAssignmentTarget || this.tolerateError(messages_1.Messages.InvalidLHSInAssignment);
                  var prefix = !0;
                  expr = this.finalize(node, new Node.UpdateExpression(token.value, expr, prefix)), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                } else if (expr = this.inheritCoverGrammar(this.parseLeftHandSideExpressionAllowCall), !this.hasLineTerminator && this.lookahead.type === 7 && (this.match("++") || this.match("--"))) {
                  this.context.strict && expr.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(expr.name) && this.tolerateError(messages_1.Messages.StrictLHSPostfix), this.context.isAssignmentTarget || this.tolerateError(messages_1.Messages.InvalidLHSInAssignment), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                  var operator = this.nextToken().value, prefix = !1;
                  expr = this.finalize(this.startNode(startToken), new Node.UpdateExpression(operator, expr, prefix));
                }
                return expr;
              }, Parser2.prototype.parseAwaitExpression = function() {
                var node = this.createNode();
                this.nextToken();
                var argument = this.parseUnaryExpression();
                return this.finalize(node, new Node.AwaitExpression(argument));
              }, Parser2.prototype.parseUnaryExpression = function() {
                var expr;
                if (this.match("+") || this.match("-") || this.match("~") || this.match("!") || this.matchKeyword("delete") || this.matchKeyword("void") || this.matchKeyword("typeof")) {
                  var node = this.startNode(this.lookahead), token = this.nextToken();
                  expr = this.inheritCoverGrammar(this.parseUnaryExpression), expr = this.finalize(node, new Node.UnaryExpression(token.value, expr)), this.context.strict && expr.operator === "delete" && expr.argument.type === syntax_1.Syntax.Identifier && this.tolerateError(messages_1.Messages.StrictDelete), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                } else this.context.await && this.matchContextualKeyword("await") ? expr = this.parseAwaitExpression() : expr = this.parseUpdateExpression();
                return expr;
              }, Parser2.prototype.parseExponentiationExpression = function() {
                var startToken = this.lookahead, expr = this.inheritCoverGrammar(this.parseUnaryExpression);
                if (expr.type !== syntax_1.Syntax.UnaryExpression && this.match("**")) {
                  this.nextToken(), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                  var left = expr, right = this.isolateCoverGrammar(this.parseExponentiationExpression);
                  expr = this.finalize(this.startNode(startToken), new Node.BinaryExpression("**", left, right));
                }
                return expr;
              }, Parser2.prototype.binaryPrecedence = function(token) {
                var op = token.value, precedence;
                return token.type === 7 ? precedence = this.operatorPrecedence[op] || 0 : token.type === 4 ? precedence = op === "instanceof" || this.context.allowIn && op === "in" ? 7 : 0 : precedence = 0, precedence;
              }, Parser2.prototype.parseBinaryExpression = function() {
                var startToken = this.lookahead, expr = this.inheritCoverGrammar(this.parseExponentiationExpression), token = this.lookahead, prec = this.binaryPrecedence(token);
                if (prec > 0) {
                  this.nextToken(), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                  for (var markers = [startToken, this.lookahead], left = expr, right = this.isolateCoverGrammar(this.parseExponentiationExpression), stack = [left, token.value, right], precedences = [prec]; prec = this.binaryPrecedence(this.lookahead), !(prec <= 0); ) {
                    for (; stack.length > 2 && prec <= precedences[precedences.length - 1]; ) {
                      right = stack.pop();
                      var operator = stack.pop();
                      precedences.pop(), left = stack.pop(), markers.pop();
                      var node = this.startNode(markers[markers.length - 1]);
                      stack.push(this.finalize(node, new Node.BinaryExpression(operator, left, right)));
                    }
                    stack.push(this.nextToken().value), precedences.push(prec), markers.push(this.lookahead), stack.push(this.isolateCoverGrammar(this.parseExponentiationExpression));
                  }
                  var i = stack.length - 1;
                  expr = stack[i];
                  for (var lastMarker = markers.pop(); i > 1; ) {
                    var marker = markers.pop(), lastLineStart = lastMarker && lastMarker.lineStart, node = this.startNode(marker, lastLineStart), operator = stack[i - 1];
                    expr = this.finalize(node, new Node.BinaryExpression(operator, stack[i - 2], expr)), i -= 2, lastMarker = marker;
                  }
                }
                return expr;
              }, Parser2.prototype.parseConditionalExpression = function() {
                var startToken = this.lookahead, expr = this.inheritCoverGrammar(this.parseBinaryExpression);
                if (this.match("?")) {
                  this.nextToken();
                  var previousAllowIn = this.context.allowIn;
                  this.context.allowIn = !0;
                  var consequent = this.isolateCoverGrammar(this.parseAssignmentExpression);
                  this.context.allowIn = previousAllowIn, this.expect(":");
                  var alternate = this.isolateCoverGrammar(this.parseAssignmentExpression);
                  expr = this.finalize(this.startNode(startToken), new Node.ConditionalExpression(expr, consequent, alternate)), this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                }
                return expr;
              }, Parser2.prototype.checkPatternParam = function(options, param) {
                switch (param.type) {
                  case syntax_1.Syntax.Identifier:
                    this.validateParam(options, param, param.name);
                    break;
                  case syntax_1.Syntax.RestElement:
                    this.checkPatternParam(options, param.argument);
                    break;
                  case syntax_1.Syntax.AssignmentPattern:
                    this.checkPatternParam(options, param.left);
                    break;
                  case syntax_1.Syntax.ArrayPattern:
                    for (var i = 0; i < param.elements.length; i++)
                      param.elements[i] !== null && this.checkPatternParam(options, param.elements[i]);
                    break;
                  case syntax_1.Syntax.ObjectPattern:
                    for (var i = 0; i < param.properties.length; i++)
                      this.checkPatternParam(options, param.properties[i].value);
                    break;
                  default:
                    break;
                }
                options.simple = options.simple && param instanceof Node.Identifier;
              }, Parser2.prototype.reinterpretAsCoverFormalsList = function(expr) {
                var params = [expr], options, asyncArrow = !1;
                switch (expr.type) {
                  case syntax_1.Syntax.Identifier:
                    break;
                  case ArrowParameterPlaceHolder:
                    params = expr.params, asyncArrow = expr.async;
                    break;
                  default:
                    return null;
                }
                options = {
                  simple: !0,
                  paramSet: {}
                };
                for (var i = 0; i < params.length; ++i) {
                  var param = params[i];
                  param.type === syntax_1.Syntax.AssignmentPattern ? param.right.type === syntax_1.Syntax.YieldExpression && (param.right.argument && this.throwUnexpectedToken(this.lookahead), param.right.type = syntax_1.Syntax.Identifier, param.right.name = "yield", delete param.right.argument, delete param.right.delegate) : asyncArrow && param.type === syntax_1.Syntax.Identifier && param.name === "await" && this.throwUnexpectedToken(this.lookahead), this.checkPatternParam(options, param), params[i] = param;
                }
                if (this.context.strict || !this.context.allowYield)
                  for (var i = 0; i < params.length; ++i) {
                    var param = params[i];
                    param.type === syntax_1.Syntax.YieldExpression && this.throwUnexpectedToken(this.lookahead);
                  }
                if (options.message === messages_1.Messages.StrictParamDupe) {
                  var token = this.context.strict ? options.stricted : options.firstRestricted;
                  this.throwUnexpectedToken(token, options.message);
                }
                return {
                  simple: options.simple,
                  params,
                  stricted: options.stricted,
                  firstRestricted: options.firstRestricted,
                  message: options.message
                };
              }, Parser2.prototype.parseAssignmentExpression = function() {
                var expr;
                if (!this.context.allowYield && this.matchKeyword("yield"))
                  expr = this.parseYieldExpression();
                else {
                  var startToken = this.lookahead, token = startToken;
                  if (expr = this.parseConditionalExpression(), token.type === 3 && token.lineNumber === this.lookahead.lineNumber && token.value === "async" && (this.lookahead.type === 3 || this.matchKeyword("yield"))) {
                    var arg = this.parsePrimaryExpression();
                    this.reinterpretExpressionAsPattern(arg), expr = {
                      type: ArrowParameterPlaceHolder,
                      params: [arg],
                      async: !0
                    };
                  }
                  if (expr.type === ArrowParameterPlaceHolder || this.match("=>")) {
                    this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1;
                    var isAsync = expr.async, list = this.reinterpretAsCoverFormalsList(expr);
                    if (list) {
                      this.hasLineTerminator && this.tolerateUnexpectedToken(this.lookahead), this.context.firstCoverInitializedNameError = null;
                      var previousStrict = this.context.strict, previousAllowStrictDirective = this.context.allowStrictDirective;
                      this.context.allowStrictDirective = list.simple;
                      var previousAllowYield = this.context.allowYield, previousAwait = this.context.await;
                      this.context.allowYield = !0, this.context.await = isAsync;
                      var node = this.startNode(startToken);
                      this.expect("=>");
                      var body = void 0;
                      if (this.match("{")) {
                        var previousAllowIn = this.context.allowIn;
                        this.context.allowIn = !0, body = this.parseFunctionSourceElements(), this.context.allowIn = previousAllowIn;
                      } else
                        body = this.isolateCoverGrammar(this.parseAssignmentExpression);
                      var expression = body.type !== syntax_1.Syntax.BlockStatement;
                      this.context.strict && list.firstRestricted && this.throwUnexpectedToken(list.firstRestricted, list.message), this.context.strict && list.stricted && this.tolerateUnexpectedToken(list.stricted, list.message), expr = isAsync ? this.finalize(node, new Node.AsyncArrowFunctionExpression(list.params, body, expression)) : this.finalize(node, new Node.ArrowFunctionExpression(list.params, body, expression)), this.context.strict = previousStrict, this.context.allowStrictDirective = previousAllowStrictDirective, this.context.allowYield = previousAllowYield, this.context.await = previousAwait;
                    }
                  } else if (this.matchAssign()) {
                    if (this.context.isAssignmentTarget || this.tolerateError(messages_1.Messages.InvalidLHSInAssignment), this.context.strict && expr.type === syntax_1.Syntax.Identifier) {
                      var id = expr;
                      this.scanner.isRestrictedWord(id.name) && this.tolerateUnexpectedToken(token, messages_1.Messages.StrictLHSAssignment), this.scanner.isStrictModeReservedWord(id.name) && this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord);
                    }
                    this.match("=") ? this.reinterpretExpressionAsPattern(expr) : (this.context.isAssignmentTarget = !1, this.context.isBindingElement = !1), token = this.nextToken();
                    var operator = token.value, right = this.isolateCoverGrammar(this.parseAssignmentExpression);
                    expr = this.finalize(this.startNode(startToken), new Node.AssignmentExpression(operator, expr, right)), this.context.firstCoverInitializedNameError = null;
                  }
                }
                return expr;
              }, Parser2.prototype.parseExpression = function() {
                var startToken = this.lookahead, expr = this.isolateCoverGrammar(this.parseAssignmentExpression);
                if (this.match(",")) {
                  var expressions = [];
                  for (expressions.push(expr); this.lookahead.type !== 2 && this.match(","); )
                    this.nextToken(), expressions.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
                  expr = this.finalize(this.startNode(startToken), new Node.SequenceExpression(expressions));
                }
                return expr;
              }, Parser2.prototype.parseStatementListItem = function() {
                var statement;
                if (this.context.isAssignmentTarget = !0, this.context.isBindingElement = !0, this.lookahead.type === 4)
                  switch (this.lookahead.value) {
                    case "export":
                      this.context.isModule || this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.IllegalExportDeclaration), statement = this.parseExportDeclaration();
                      break;
                    case "import":
                      this.context.isModule || this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.IllegalImportDeclaration), statement = this.parseImportDeclaration();
                      break;
                    case "const":
                      statement = this.parseLexicalDeclaration({ inFor: !1 });
                      break;
                    case "function":
                      statement = this.parseFunctionDeclaration();
                      break;
                    case "class":
                      statement = this.parseClassDeclaration();
                      break;
                    case "let":
                      statement = this.isLexicalDeclaration() ? this.parseLexicalDeclaration({ inFor: !1 }) : this.parseStatement();
                      break;
                    default:
                      statement = this.parseStatement();
                      break;
                  }
                else
                  statement = this.parseStatement();
                return statement;
              }, Parser2.prototype.parseBlock = function() {
                var node = this.createNode();
                this.expect("{");
                for (var block = []; !this.match("}"); )
                  block.push(this.parseStatementListItem());
                return this.expect("}"), this.finalize(node, new Node.BlockStatement(block));
              }, Parser2.prototype.parseLexicalBinding = function(kind, options) {
                var node = this.createNode(), params = [], id = this.parsePattern(params, kind);
                this.context.strict && id.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(id.name) && this.tolerateError(messages_1.Messages.StrictVarName);
                var init = null;
                return kind === "const" ? !this.matchKeyword("in") && !this.matchContextualKeyword("of") && (this.match("=") ? (this.nextToken(), init = this.isolateCoverGrammar(this.parseAssignmentExpression)) : this.throwError(messages_1.Messages.DeclarationMissingInitializer, "const")) : (!options.inFor && id.type !== syntax_1.Syntax.Identifier || this.match("=")) && (this.expect("="), init = this.isolateCoverGrammar(this.parseAssignmentExpression)), this.finalize(node, new Node.VariableDeclarator(id, init));
              }, Parser2.prototype.parseBindingList = function(kind, options) {
                for (var list = [this.parseLexicalBinding(kind, options)]; this.match(","); )
                  this.nextToken(), list.push(this.parseLexicalBinding(kind, options));
                return list;
              }, Parser2.prototype.isLexicalDeclaration = function() {
                var state = this.scanner.saveState();
                this.scanner.scanComments();
                var next = this.scanner.lex();
                return this.scanner.restoreState(state), next.type === 3 || next.type === 7 && next.value === "[" || next.type === 7 && next.value === "{" || next.type === 4 && next.value === "let" || next.type === 4 && next.value === "yield";
              }, Parser2.prototype.parseLexicalDeclaration = function(options) {
                var node = this.createNode(), kind = this.nextToken().value;
                assert_1.assert(kind === "let" || kind === "const", "Lexical declaration must be either let or const");
                var declarations = this.parseBindingList(kind, options);
                return this.consumeSemicolon(), this.finalize(node, new Node.VariableDeclaration(declarations, kind));
              }, Parser2.prototype.parseBindingRestElement = function(params, kind) {
                var node = this.createNode();
                this.expect("...");
                var arg = this.parsePattern(params, kind);
                return this.finalize(node, new Node.RestElement(arg));
              }, Parser2.prototype.parseArrayPattern = function(params, kind) {
                var node = this.createNode();
                this.expect("[");
                for (var elements = []; !this.match("]"); )
                  if (this.match(","))
                    this.nextToken(), elements.push(null);
                  else {
                    if (this.match("...")) {
                      elements.push(this.parseBindingRestElement(params, kind));
                      break;
                    } else
                      elements.push(this.parsePatternWithDefault(params, kind));
                    this.match("]") || this.expect(",");
                  }
                return this.expect("]"), this.finalize(node, new Node.ArrayPattern(elements));
              }, Parser2.prototype.parsePropertyPattern = function(params, kind) {
                var node = this.createNode(), computed = !1, shorthand = !1, method = !1, key, value;
                if (this.lookahead.type === 3) {
                  var keyToken = this.lookahead;
                  key = this.parseVariableIdentifier();
                  var init = this.finalize(node, new Node.Identifier(keyToken.value));
                  if (this.match("=")) {
                    params.push(keyToken), shorthand = !0, this.nextToken();
                    var expr = this.parseAssignmentExpression();
                    value = this.finalize(this.startNode(keyToken), new Node.AssignmentPattern(init, expr));
                  } else this.match(":") ? (this.expect(":"), value = this.parsePatternWithDefault(params, kind)) : (params.push(keyToken), shorthand = !0, value = init);
                } else
                  computed = this.match("["), key = this.parseObjectPropertyKey(), this.expect(":"), value = this.parsePatternWithDefault(params, kind);
                return this.finalize(node, new Node.Property("init", key, computed, value, method, shorthand));
              }, Parser2.prototype.parseObjectPattern = function(params, kind) {
                var node = this.createNode(), properties = [];
                for (this.expect("{"); !this.match("}"); )
                  properties.push(this.parsePropertyPattern(params, kind)), this.match("}") || this.expect(",");
                return this.expect("}"), this.finalize(node, new Node.ObjectPattern(properties));
              }, Parser2.prototype.parsePattern = function(params, kind) {
                var pattern;
                return this.match("[") ? pattern = this.parseArrayPattern(params, kind) : this.match("{") ? pattern = this.parseObjectPattern(params, kind) : (this.matchKeyword("let") && (kind === "const" || kind === "let") && this.tolerateUnexpectedToken(this.lookahead, messages_1.Messages.LetInLexicalBinding), params.push(this.lookahead), pattern = this.parseVariableIdentifier(kind)), pattern;
              }, Parser2.prototype.parsePatternWithDefault = function(params, kind) {
                var startToken = this.lookahead, pattern = this.parsePattern(params, kind);
                if (this.match("=")) {
                  this.nextToken();
                  var previousAllowYield = this.context.allowYield;
                  this.context.allowYield = !0;
                  var right = this.isolateCoverGrammar(this.parseAssignmentExpression);
                  this.context.allowYield = previousAllowYield, pattern = this.finalize(this.startNode(startToken), new Node.AssignmentPattern(pattern, right));
                }
                return pattern;
              }, Parser2.prototype.parseVariableIdentifier = function(kind) {
                var node = this.createNode(), token = this.nextToken();
                return token.type === 4 && token.value === "yield" ? this.context.strict ? this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord) : this.context.allowYield || this.throwUnexpectedToken(token) : token.type !== 3 ? this.context.strict && token.type === 4 && this.scanner.isStrictModeReservedWord(token.value) ? this.tolerateUnexpectedToken(token, messages_1.Messages.StrictReservedWord) : (this.context.strict || token.value !== "let" || kind !== "var") && this.throwUnexpectedToken(token) : (this.context.isModule || this.context.await) && token.type === 3 && token.value === "await" && this.tolerateUnexpectedToken(token), this.finalize(node, new Node.Identifier(token.value));
              }, Parser2.prototype.parseVariableDeclaration = function(options) {
                var node = this.createNode(), params = [], id = this.parsePattern(params, "var");
                this.context.strict && id.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(id.name) && this.tolerateError(messages_1.Messages.StrictVarName);
                var init = null;
                return this.match("=") ? (this.nextToken(), init = this.isolateCoverGrammar(this.parseAssignmentExpression)) : id.type !== syntax_1.Syntax.Identifier && !options.inFor && this.expect("="), this.finalize(node, new Node.VariableDeclarator(id, init));
              }, Parser2.prototype.parseVariableDeclarationList = function(options) {
                var opt = { inFor: options.inFor }, list = [];
                for (list.push(this.parseVariableDeclaration(opt)); this.match(","); )
                  this.nextToken(), list.push(this.parseVariableDeclaration(opt));
                return list;
              }, Parser2.prototype.parseVariableStatement = function() {
                var node = this.createNode();
                this.expectKeyword("var");
                var declarations = this.parseVariableDeclarationList({ inFor: !1 });
                return this.consumeSemicolon(), this.finalize(node, new Node.VariableDeclaration(declarations, "var"));
              }, Parser2.prototype.parseEmptyStatement = function() {
                var node = this.createNode();
                return this.expect(";"), this.finalize(node, new Node.EmptyStatement());
              }, Parser2.prototype.parseExpressionStatement = function() {
                var node = this.createNode(), expr = this.parseExpression();
                return this.consumeSemicolon(), this.finalize(node, new Node.ExpressionStatement(expr));
              }, Parser2.prototype.parseIfClause = function() {
                return this.context.strict && this.matchKeyword("function") && this.tolerateError(messages_1.Messages.StrictFunction), this.parseStatement();
              }, Parser2.prototype.parseIfStatement = function() {
                var node = this.createNode(), consequent, alternate = null;
                this.expectKeyword("if"), this.expect("(");
                var test = this.parseExpression();
                return !this.match(")") && this.config.tolerant ? (this.tolerateUnexpectedToken(this.nextToken()), consequent = this.finalize(this.createNode(), new Node.EmptyStatement())) : (this.expect(")"), consequent = this.parseIfClause(), this.matchKeyword("else") && (this.nextToken(), alternate = this.parseIfClause())), this.finalize(node, new Node.IfStatement(test, consequent, alternate));
              }, Parser2.prototype.parseDoWhileStatement = function() {
                var node = this.createNode();
                this.expectKeyword("do");
                var previousInIteration = this.context.inIteration;
                this.context.inIteration = !0;
                var body = this.parseStatement();
                this.context.inIteration = previousInIteration, this.expectKeyword("while"), this.expect("(");
                var test = this.parseExpression();
                return !this.match(")") && this.config.tolerant ? this.tolerateUnexpectedToken(this.nextToken()) : (this.expect(")"), this.match(";") && this.nextToken()), this.finalize(node, new Node.DoWhileStatement(body, test));
              }, Parser2.prototype.parseWhileStatement = function() {
                var node = this.createNode(), body;
                this.expectKeyword("while"), this.expect("(");
                var test = this.parseExpression();
                if (!this.match(")") && this.config.tolerant)
                  this.tolerateUnexpectedToken(this.nextToken()), body = this.finalize(this.createNode(), new Node.EmptyStatement());
                else {
                  this.expect(")");
                  var previousInIteration = this.context.inIteration;
                  this.context.inIteration = !0, body = this.parseStatement(), this.context.inIteration = previousInIteration;
                }
                return this.finalize(node, new Node.WhileStatement(test, body));
              }, Parser2.prototype.parseForStatement = function() {
                var init = null, test = null, update = null, forIn = !0, left, right, node = this.createNode();
                if (this.expectKeyword("for"), this.expect("("), this.match(";"))
                  this.nextToken();
                else if (this.matchKeyword("var")) {
                  init = this.createNode(), this.nextToken();
                  var previousAllowIn = this.context.allowIn;
                  this.context.allowIn = !1;
                  var declarations = this.parseVariableDeclarationList({ inFor: !0 });
                  if (this.context.allowIn = previousAllowIn, declarations.length === 1 && this.matchKeyword("in")) {
                    var decl = declarations[0];
                    decl.init && (decl.id.type === syntax_1.Syntax.ArrayPattern || decl.id.type === syntax_1.Syntax.ObjectPattern || this.context.strict) && this.tolerateError(messages_1.Messages.ForInOfLoopInitializer, "for-in"), init = this.finalize(init, new Node.VariableDeclaration(declarations, "var")), this.nextToken(), left = init, right = this.parseExpression(), init = null;
                  } else declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of") ? (init = this.finalize(init, new Node.VariableDeclaration(declarations, "var")), this.nextToken(), left = init, right = this.parseAssignmentExpression(), init = null, forIn = !1) : (init = this.finalize(init, new Node.VariableDeclaration(declarations, "var")), this.expect(";"));
                } else if (this.matchKeyword("const") || this.matchKeyword("let")) {
                  init = this.createNode();
                  var kind = this.nextToken().value;
                  if (!this.context.strict && this.lookahead.value === "in")
                    init = this.finalize(init, new Node.Identifier(kind)), this.nextToken(), left = init, right = this.parseExpression(), init = null;
                  else {
                    var previousAllowIn = this.context.allowIn;
                    this.context.allowIn = !1;
                    var declarations = this.parseBindingList(kind, { inFor: !0 });
                    this.context.allowIn = previousAllowIn, declarations.length === 1 && declarations[0].init === null && this.matchKeyword("in") ? (init = this.finalize(init, new Node.VariableDeclaration(declarations, kind)), this.nextToken(), left = init, right = this.parseExpression(), init = null) : declarations.length === 1 && declarations[0].init === null && this.matchContextualKeyword("of") ? (init = this.finalize(init, new Node.VariableDeclaration(declarations, kind)), this.nextToken(), left = init, right = this.parseAssignmentExpression(), init = null, forIn = !1) : (this.consumeSemicolon(), init = this.finalize(init, new Node.VariableDeclaration(declarations, kind)));
                  }
                } else {
                  var initStartToken = this.lookahead, previousAllowIn = this.context.allowIn;
                  if (this.context.allowIn = !1, init = this.inheritCoverGrammar(this.parseAssignmentExpression), this.context.allowIn = previousAllowIn, this.matchKeyword("in"))
                    (!this.context.isAssignmentTarget || init.type === syntax_1.Syntax.AssignmentExpression) && this.tolerateError(messages_1.Messages.InvalidLHSInForIn), this.nextToken(), this.reinterpretExpressionAsPattern(init), left = init, right = this.parseExpression(), init = null;
                  else if (this.matchContextualKeyword("of"))
                    (!this.context.isAssignmentTarget || init.type === syntax_1.Syntax.AssignmentExpression) && this.tolerateError(messages_1.Messages.InvalidLHSInForLoop), this.nextToken(), this.reinterpretExpressionAsPattern(init), left = init, right = this.parseAssignmentExpression(), init = null, forIn = !1;
                  else {
                    if (this.match(",")) {
                      for (var initSeq = [init]; this.match(","); )
                        this.nextToken(), initSeq.push(this.isolateCoverGrammar(this.parseAssignmentExpression));
                      init = this.finalize(this.startNode(initStartToken), new Node.SequenceExpression(initSeq));
                    }
                    this.expect(";");
                  }
                }
                typeof left > "u" && (this.match(";") || (test = this.parseExpression()), this.expect(";"), this.match(")") || (update = this.parseExpression()));
                var body;
                if (!this.match(")") && this.config.tolerant)
                  this.tolerateUnexpectedToken(this.nextToken()), body = this.finalize(this.createNode(), new Node.EmptyStatement());
                else {
                  this.expect(")");
                  var previousInIteration = this.context.inIteration;
                  this.context.inIteration = !0, body = this.isolateCoverGrammar(this.parseStatement), this.context.inIteration = previousInIteration;
                }
                return typeof left > "u" ? this.finalize(node, new Node.ForStatement(init, test, update, body)) : forIn ? this.finalize(node, new Node.ForInStatement(left, right, body)) : this.finalize(node, new Node.ForOfStatement(left, right, body));
              }, Parser2.prototype.parseContinueStatement = function() {
                var node = this.createNode();
                this.expectKeyword("continue");
                var label = null;
                if (this.lookahead.type === 3 && !this.hasLineTerminator) {
                  var id = this.parseVariableIdentifier();
                  label = id;
                  var key = "$" + id.name;
                  Object.prototype.hasOwnProperty.call(this.context.labelSet, key) || this.throwError(messages_1.Messages.UnknownLabel, id.name);
                }
                return this.consumeSemicolon(), label === null && !this.context.inIteration && this.throwError(messages_1.Messages.IllegalContinue), this.finalize(node, new Node.ContinueStatement(label));
              }, Parser2.prototype.parseBreakStatement = function() {
                var node = this.createNode();
                this.expectKeyword("break");
                var label = null;
                if (this.lookahead.type === 3 && !this.hasLineTerminator) {
                  var id = this.parseVariableIdentifier(), key = "$" + id.name;
                  Object.prototype.hasOwnProperty.call(this.context.labelSet, key) || this.throwError(messages_1.Messages.UnknownLabel, id.name), label = id;
                }
                return this.consumeSemicolon(), label === null && !this.context.inIteration && !this.context.inSwitch && this.throwError(messages_1.Messages.IllegalBreak), this.finalize(node, new Node.BreakStatement(label));
              }, Parser2.prototype.parseReturnStatement = function() {
                this.context.inFunctionBody || this.tolerateError(messages_1.Messages.IllegalReturn);
                var node = this.createNode();
                this.expectKeyword("return");
                var hasArgument = !this.match(";") && !this.match("}") && !this.hasLineTerminator && this.lookahead.type !== 2 || this.lookahead.type === 8 || this.lookahead.type === 10, argument = hasArgument ? this.parseExpression() : null;
                return this.consumeSemicolon(), this.finalize(node, new Node.ReturnStatement(argument));
              }, Parser2.prototype.parseWithStatement = function() {
                this.context.strict && this.tolerateError(messages_1.Messages.StrictModeWith);
                var node = this.createNode(), body;
                this.expectKeyword("with"), this.expect("(");
                var object = this.parseExpression();
                return !this.match(")") && this.config.tolerant ? (this.tolerateUnexpectedToken(this.nextToken()), body = this.finalize(this.createNode(), new Node.EmptyStatement())) : (this.expect(")"), body = this.parseStatement()), this.finalize(node, new Node.WithStatement(object, body));
              }, Parser2.prototype.parseSwitchCase = function() {
                var node = this.createNode(), test;
                this.matchKeyword("default") ? (this.nextToken(), test = null) : (this.expectKeyword("case"), test = this.parseExpression()), this.expect(":");
                for (var consequent = []; !(this.match("}") || this.matchKeyword("default") || this.matchKeyword("case")); )
                  consequent.push(this.parseStatementListItem());
                return this.finalize(node, new Node.SwitchCase(test, consequent));
              }, Parser2.prototype.parseSwitchStatement = function() {
                var node = this.createNode();
                this.expectKeyword("switch"), this.expect("(");
                var discriminant = this.parseExpression();
                this.expect(")");
                var previousInSwitch = this.context.inSwitch;
                this.context.inSwitch = !0;
                var cases = [], defaultFound = !1;
                for (this.expect("{"); !this.match("}"); ) {
                  var clause = this.parseSwitchCase();
                  clause.test === null && (defaultFound && this.throwError(messages_1.Messages.MultipleDefaultsInSwitch), defaultFound = !0), cases.push(clause);
                }
                return this.expect("}"), this.context.inSwitch = previousInSwitch, this.finalize(node, new Node.SwitchStatement(discriminant, cases));
              }, Parser2.prototype.parseLabelledStatement = function() {
                var node = this.createNode(), expr = this.parseExpression(), statement;
                if (expr.type === syntax_1.Syntax.Identifier && this.match(":")) {
                  this.nextToken();
                  var id = expr, key = "$" + id.name;
                  Object.prototype.hasOwnProperty.call(this.context.labelSet, key) && this.throwError(messages_1.Messages.Redeclaration, "Label", id.name), this.context.labelSet[key] = !0;
                  var body = void 0;
                  if (this.matchKeyword("class"))
                    this.tolerateUnexpectedToken(this.lookahead), body = this.parseClassDeclaration();
                  else if (this.matchKeyword("function")) {
                    var token = this.lookahead, declaration = this.parseFunctionDeclaration();
                    this.context.strict ? this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunction) : declaration.generator && this.tolerateUnexpectedToken(token, messages_1.Messages.GeneratorInLegacyContext), body = declaration;
                  } else
                    body = this.parseStatement();
                  delete this.context.labelSet[key], statement = new Node.LabeledStatement(id, body);
                } else
                  this.consumeSemicolon(), statement = new Node.ExpressionStatement(expr);
                return this.finalize(node, statement);
              }, Parser2.prototype.parseThrowStatement = function() {
                var node = this.createNode();
                this.expectKeyword("throw"), this.hasLineTerminator && this.throwError(messages_1.Messages.NewlineAfterThrow);
                var argument = this.parseExpression();
                return this.consumeSemicolon(), this.finalize(node, new Node.ThrowStatement(argument));
              }, Parser2.prototype.parseCatchClause = function() {
                var node = this.createNode();
                this.expectKeyword("catch"), this.expect("("), this.match(")") && this.throwUnexpectedToken(this.lookahead);
                for (var params = [], param = this.parsePattern(params), paramMap = {}, i = 0; i < params.length; i++) {
                  var key = "$" + params[i].value;
                  Object.prototype.hasOwnProperty.call(paramMap, key) && this.tolerateError(messages_1.Messages.DuplicateBinding, params[i].value), paramMap[key] = !0;
                }
                this.context.strict && param.type === syntax_1.Syntax.Identifier && this.scanner.isRestrictedWord(param.name) && this.tolerateError(messages_1.Messages.StrictCatchVariable), this.expect(")");
                var body = this.parseBlock();
                return this.finalize(node, new Node.CatchClause(param, body));
              }, Parser2.prototype.parseFinallyClause = function() {
                return this.expectKeyword("finally"), this.parseBlock();
              }, Parser2.prototype.parseTryStatement = function() {
                var node = this.createNode();
                this.expectKeyword("try");
                var block = this.parseBlock(), handler = this.matchKeyword("catch") ? this.parseCatchClause() : null, finalizer = this.matchKeyword("finally") ? this.parseFinallyClause() : null;
                return !handler && !finalizer && this.throwError(messages_1.Messages.NoCatchOrFinally), this.finalize(node, new Node.TryStatement(block, handler, finalizer));
              }, Parser2.prototype.parseDebuggerStatement = function() {
                var node = this.createNode();
                return this.expectKeyword("debugger"), this.consumeSemicolon(), this.finalize(node, new Node.DebuggerStatement());
              }, Parser2.prototype.parseStatement = function() {
                var statement;
                switch (this.lookahead.type) {
                  case 1:
                  case 5:
                  case 6:
                  case 8:
                  case 10:
                  case 9:
                    statement = this.parseExpressionStatement();
                    break;
                  case 7:
                    var value = this.lookahead.value;
                    value === "{" ? statement = this.parseBlock() : value === "(" ? statement = this.parseExpressionStatement() : value === ";" ? statement = this.parseEmptyStatement() : statement = this.parseExpressionStatement();
                    break;
                  case 3:
                    statement = this.matchAsyncFunction() ? this.parseFunctionDeclaration() : this.parseLabelledStatement();
                    break;
                  case 4:
                    switch (this.lookahead.value) {
                      case "break":
                        statement = this.parseBreakStatement();
                        break;
                      case "continue":
                        statement = this.parseContinueStatement();
                        break;
                      case "debugger":
                        statement = this.parseDebuggerStatement();
                        break;
                      case "do":
                        statement = this.parseDoWhileStatement();
                        break;
                      case "for":
                        statement = this.parseForStatement();
                        break;
                      case "function":
                        statement = this.parseFunctionDeclaration();
                        break;
                      case "if":
                        statement = this.parseIfStatement();
                        break;
                      case "return":
                        statement = this.parseReturnStatement();
                        break;
                      case "switch":
                        statement = this.parseSwitchStatement();
                        break;
                      case "throw":
                        statement = this.parseThrowStatement();
                        break;
                      case "try":
                        statement = this.parseTryStatement();
                        break;
                      case "var":
                        statement = this.parseVariableStatement();
                        break;
                      case "while":
                        statement = this.parseWhileStatement();
                        break;
                      case "with":
                        statement = this.parseWithStatement();
                        break;
                      default:
                        statement = this.parseExpressionStatement();
                        break;
                    }
                    break;
                  default:
                    statement = this.throwUnexpectedToken(this.lookahead);
                }
                return statement;
              }, Parser2.prototype.parseFunctionSourceElements = function() {
                var node = this.createNode();
                this.expect("{");
                var body = this.parseDirectivePrologues(), previousLabelSet = this.context.labelSet, previousInIteration = this.context.inIteration, previousInSwitch = this.context.inSwitch, previousInFunctionBody = this.context.inFunctionBody;
                for (this.context.labelSet = {}, this.context.inIteration = !1, this.context.inSwitch = !1, this.context.inFunctionBody = !0; this.lookahead.type !== 2 && !this.match("}"); )
                  body.push(this.parseStatementListItem());
                return this.expect("}"), this.context.labelSet = previousLabelSet, this.context.inIteration = previousInIteration, this.context.inSwitch = previousInSwitch, this.context.inFunctionBody = previousInFunctionBody, this.finalize(node, new Node.BlockStatement(body));
              }, Parser2.prototype.validateParam = function(options, param, name) {
                var key = "$" + name;
                this.context.strict ? (this.scanner.isRestrictedWord(name) && (options.stricted = param, options.message = messages_1.Messages.StrictParamName), Object.prototype.hasOwnProperty.call(options.paramSet, key) && (options.stricted = param, options.message = messages_1.Messages.StrictParamDupe)) : options.firstRestricted || (this.scanner.isRestrictedWord(name) ? (options.firstRestricted = param, options.message = messages_1.Messages.StrictParamName) : this.scanner.isStrictModeReservedWord(name) ? (options.firstRestricted = param, options.message = messages_1.Messages.StrictReservedWord) : Object.prototype.hasOwnProperty.call(options.paramSet, key) && (options.stricted = param, options.message = messages_1.Messages.StrictParamDupe)), typeof Object.defineProperty == "function" ? Object.defineProperty(options.paramSet, key, { value: !0, enumerable: !0, writable: !0, configurable: !0 }) : options.paramSet[key] = !0;
              }, Parser2.prototype.parseRestElement = function(params) {
                var node = this.createNode();
                this.expect("...");
                var arg = this.parsePattern(params);
                return this.match("=") && this.throwError(messages_1.Messages.DefaultRestParameter), this.match(")") || this.throwError(messages_1.Messages.ParameterAfterRestParameter), this.finalize(node, new Node.RestElement(arg));
              }, Parser2.prototype.parseFormalParameter = function(options) {
                for (var params = [], param = this.match("...") ? this.parseRestElement(params) : this.parsePatternWithDefault(params), i = 0; i < params.length; i++)
                  this.validateParam(options, params[i], params[i].value);
                options.simple = options.simple && param instanceof Node.Identifier, options.params.push(param);
              }, Parser2.prototype.parseFormalParameters = function(firstRestricted) {
                var options;
                if (options = {
                  simple: !0,
                  params: [],
                  firstRestricted
                }, this.expect("("), !this.match(")"))
                  for (options.paramSet = {}; this.lookahead.type !== 2 && (this.parseFormalParameter(options), !(this.match(")") || (this.expect(","), this.match(")")))); )
                    ;
                return this.expect(")"), {
                  simple: options.simple,
                  params: options.params,
                  stricted: options.stricted,
                  firstRestricted: options.firstRestricted,
                  message: options.message
                };
              }, Parser2.prototype.matchAsyncFunction = function() {
                var match = this.matchContextualKeyword("async");
                if (match) {
                  var state = this.scanner.saveState();
                  this.scanner.scanComments();
                  var next = this.scanner.lex();
                  this.scanner.restoreState(state), match = state.lineNumber === next.lineNumber && next.type === 4 && next.value === "function";
                }
                return match;
              }, Parser2.prototype.parseFunctionDeclaration = function(identifierIsOptional) {
                var node = this.createNode(), isAsync = this.matchContextualKeyword("async");
                isAsync && this.nextToken(), this.expectKeyword("function");
                var isGenerator = isAsync ? !1 : this.match("*");
                isGenerator && this.nextToken();
                var message, id = null, firstRestricted = null;
                if (!identifierIsOptional || !this.match("(")) {
                  var token = this.lookahead;
                  id = this.parseVariableIdentifier(), this.context.strict ? this.scanner.isRestrictedWord(token.value) && this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunctionName) : this.scanner.isRestrictedWord(token.value) ? (firstRestricted = token, message = messages_1.Messages.StrictFunctionName) : this.scanner.isStrictModeReservedWord(token.value) && (firstRestricted = token, message = messages_1.Messages.StrictReservedWord);
                }
                var previousAllowAwait = this.context.await, previousAllowYield = this.context.allowYield;
                this.context.await = isAsync, this.context.allowYield = !isGenerator;
                var formalParameters = this.parseFormalParameters(firstRestricted), params = formalParameters.params, stricted = formalParameters.stricted;
                firstRestricted = formalParameters.firstRestricted, formalParameters.message && (message = formalParameters.message);
                var previousStrict = this.context.strict, previousAllowStrictDirective = this.context.allowStrictDirective;
                this.context.allowStrictDirective = formalParameters.simple;
                var body = this.parseFunctionSourceElements();
                return this.context.strict && firstRestricted && this.throwUnexpectedToken(firstRestricted, message), this.context.strict && stricted && this.tolerateUnexpectedToken(stricted, message), this.context.strict = previousStrict, this.context.allowStrictDirective = previousAllowStrictDirective, this.context.await = previousAllowAwait, this.context.allowYield = previousAllowYield, isAsync ? this.finalize(node, new Node.AsyncFunctionDeclaration(id, params, body)) : this.finalize(node, new Node.FunctionDeclaration(id, params, body, isGenerator));
              }, Parser2.prototype.parseFunctionExpression = function() {
                var node = this.createNode(), isAsync = this.matchContextualKeyword("async");
                isAsync && this.nextToken(), this.expectKeyword("function");
                var isGenerator = isAsync ? !1 : this.match("*");
                isGenerator && this.nextToken();
                var message, id = null, firstRestricted, previousAllowAwait = this.context.await, previousAllowYield = this.context.allowYield;
                if (this.context.await = isAsync, this.context.allowYield = !isGenerator, !this.match("(")) {
                  var token = this.lookahead;
                  id = !this.context.strict && !isGenerator && this.matchKeyword("yield") ? this.parseIdentifierName() : this.parseVariableIdentifier(), this.context.strict ? this.scanner.isRestrictedWord(token.value) && this.tolerateUnexpectedToken(token, messages_1.Messages.StrictFunctionName) : this.scanner.isRestrictedWord(token.value) ? (firstRestricted = token, message = messages_1.Messages.StrictFunctionName) : this.scanner.isStrictModeReservedWord(token.value) && (firstRestricted = token, message = messages_1.Messages.StrictReservedWord);
                }
                var formalParameters = this.parseFormalParameters(firstRestricted), params = formalParameters.params, stricted = formalParameters.stricted;
                firstRestricted = formalParameters.firstRestricted, formalParameters.message && (message = formalParameters.message);
                var previousStrict = this.context.strict, previousAllowStrictDirective = this.context.allowStrictDirective;
                this.context.allowStrictDirective = formalParameters.simple;
                var body = this.parseFunctionSourceElements();
                return this.context.strict && firstRestricted && this.throwUnexpectedToken(firstRestricted, message), this.context.strict && stricted && this.tolerateUnexpectedToken(stricted, message), this.context.strict = previousStrict, this.context.allowStrictDirective = previousAllowStrictDirective, this.context.await = previousAllowAwait, this.context.allowYield = previousAllowYield, isAsync ? this.finalize(node, new Node.AsyncFunctionExpression(id, params, body)) : this.finalize(node, new Node.FunctionExpression(id, params, body, isGenerator));
              }, Parser2.prototype.parseDirective = function() {
                var token = this.lookahead, node = this.createNode(), expr = this.parseExpression(), directive = expr.type === syntax_1.Syntax.Literal ? this.getTokenRaw(token).slice(1, -1) : null;
                return this.consumeSemicolon(), this.finalize(node, directive ? new Node.Directive(expr, directive) : new Node.ExpressionStatement(expr));
              }, Parser2.prototype.parseDirectivePrologues = function() {
                for (var firstRestricted = null, body = []; ; ) {
                  var token = this.lookahead;
                  if (token.type !== 8)
                    break;
                  var statement = this.parseDirective();
                  body.push(statement);
                  var directive = statement.directive;
                  if (typeof directive != "string")
                    break;
                  directive === "use strict" ? (this.context.strict = !0, firstRestricted && this.tolerateUnexpectedToken(firstRestricted, messages_1.Messages.StrictOctalLiteral), this.context.allowStrictDirective || this.tolerateUnexpectedToken(token, messages_1.Messages.IllegalLanguageModeDirective)) : !firstRestricted && token.octal && (firstRestricted = token);
                }
                return body;
              }, Parser2.prototype.qualifiedPropertyName = function(token) {
                switch (token.type) {
                  case 3:
                  case 8:
                  case 1:
                  case 5:
                  case 6:
                  case 4:
                    return !0;
                  case 7:
                    return token.value === "[";
                  default:
                    break;
                }
                return !1;
              }, Parser2.prototype.parseGetterMethod = function() {
                var node = this.createNode(), isGenerator = !1, previousAllowYield = this.context.allowYield;
                this.context.allowYield = !isGenerator;
                var formalParameters = this.parseFormalParameters();
                formalParameters.params.length > 0 && this.tolerateError(messages_1.Messages.BadGetterArity);
                var method = this.parsePropertyMethod(formalParameters);
                return this.context.allowYield = previousAllowYield, this.finalize(node, new Node.FunctionExpression(null, formalParameters.params, method, isGenerator));
              }, Parser2.prototype.parseSetterMethod = function() {
                var node = this.createNode(), isGenerator = !1, previousAllowYield = this.context.allowYield;
                this.context.allowYield = !isGenerator;
                var formalParameters = this.parseFormalParameters();
                formalParameters.params.length !== 1 ? this.tolerateError(messages_1.Messages.BadSetterArity) : formalParameters.params[0] instanceof Node.RestElement && this.tolerateError(messages_1.Messages.BadSetterRestParameter);
                var method = this.parsePropertyMethod(formalParameters);
                return this.context.allowYield = previousAllowYield, this.finalize(node, new Node.FunctionExpression(null, formalParameters.params, method, isGenerator));
              }, Parser2.prototype.parseGeneratorMethod = function() {
                var node = this.createNode(), isGenerator = !0, previousAllowYield = this.context.allowYield;
                this.context.allowYield = !0;
                var params = this.parseFormalParameters();
                this.context.allowYield = !1;
                var method = this.parsePropertyMethod(params);
                return this.context.allowYield = previousAllowYield, this.finalize(node, new Node.FunctionExpression(null, params.params, method, isGenerator));
              }, Parser2.prototype.isStartOfExpression = function() {
                var start = !0, value = this.lookahead.value;
                switch (this.lookahead.type) {
                  case 7:
                    start = value === "[" || value === "(" || value === "{" || value === "+" || value === "-" || value === "!" || value === "~" || value === "++" || value === "--" || value === "/" || value === "/=";
                    break;
                  case 4:
                    start = value === "class" || value === "delete" || value === "function" || value === "let" || value === "new" || value === "super" || value === "this" || value === "typeof" || value === "void" || value === "yield";
                    break;
                  default:
                    break;
                }
                return start;
              }, Parser2.prototype.parseYieldExpression = function() {
                var node = this.createNode();
                this.expectKeyword("yield");
                var argument = null, delegate = !1;
                if (!this.hasLineTerminator) {
                  var previousAllowYield = this.context.allowYield;
                  this.context.allowYield = !1, delegate = this.match("*"), delegate ? (this.nextToken(), argument = this.parseAssignmentExpression()) : this.isStartOfExpression() && (argument = this.parseAssignmentExpression()), this.context.allowYield = previousAllowYield;
                }
                return this.finalize(node, new Node.YieldExpression(argument, delegate));
              }, Parser2.prototype.parseClassElement = function(hasConstructor) {
                var token = this.lookahead, node = this.createNode(), kind = "", key = null, value = null, computed = !1, method = !1, isStatic = !1, isAsync = !1;
                if (this.match("*"))
                  this.nextToken();
                else {
                  computed = this.match("["), key = this.parseObjectPropertyKey();
                  var id = key;
                  if (id.name === "static" && (this.qualifiedPropertyName(this.lookahead) || this.match("*")) && (token = this.lookahead, isStatic = !0, computed = this.match("["), this.match("*") ? this.nextToken() : key = this.parseObjectPropertyKey()), token.type === 3 && !this.hasLineTerminator && token.value === "async") {
                    var punctuator = this.lookahead.value;
                    punctuator !== ":" && punctuator !== "(" && punctuator !== "*" && (isAsync = !0, token = this.lookahead, key = this.parseObjectPropertyKey(), token.type === 3 && token.value === "constructor" && this.tolerateUnexpectedToken(token, messages_1.Messages.ConstructorIsAsync));
                  }
                }
                var lookaheadPropertyKey = this.qualifiedPropertyName(this.lookahead);
                return token.type === 3 ? token.value === "get" && lookaheadPropertyKey ? (kind = "get", computed = this.match("["), key = this.parseObjectPropertyKey(), this.context.allowYield = !1, value = this.parseGetterMethod()) : token.value === "set" && lookaheadPropertyKey && (kind = "set", computed = this.match("["), key = this.parseObjectPropertyKey(), value = this.parseSetterMethod()) : token.type === 7 && token.value === "*" && lookaheadPropertyKey && (kind = "init", computed = this.match("["), key = this.parseObjectPropertyKey(), value = this.parseGeneratorMethod(), method = !0), !kind && key && this.match("(") && (kind = "init", value = isAsync ? this.parsePropertyMethodAsyncFunction() : this.parsePropertyMethodFunction(), method = !0), kind || this.throwUnexpectedToken(this.lookahead), kind === "init" && (kind = "method"), computed || (isStatic && this.isPropertyKey(key, "prototype") && this.throwUnexpectedToken(token, messages_1.Messages.StaticPrototype), !isStatic && this.isPropertyKey(key, "constructor") && ((kind !== "method" || !method || value && value.generator) && this.throwUnexpectedToken(token, messages_1.Messages.ConstructorSpecialMethod), hasConstructor.value ? this.throwUnexpectedToken(token, messages_1.Messages.DuplicateConstructor) : hasConstructor.value = !0, kind = "constructor")), this.finalize(node, new Node.MethodDefinition(key, computed, value, kind, isStatic));
              }, Parser2.prototype.parseClassElementList = function() {
                var body = [], hasConstructor = { value: !1 };
                for (this.expect("{"); !this.match("}"); )
                  this.match(";") ? this.nextToken() : body.push(this.parseClassElement(hasConstructor));
                return this.expect("}"), body;
              }, Parser2.prototype.parseClassBody = function() {
                var node = this.createNode(), elementList = this.parseClassElementList();
                return this.finalize(node, new Node.ClassBody(elementList));
              }, Parser2.prototype.parseClassDeclaration = function(identifierIsOptional) {
                var node = this.createNode(), previousStrict = this.context.strict;
                this.context.strict = !0, this.expectKeyword("class");
                var id = identifierIsOptional && this.lookahead.type !== 3 ? null : this.parseVariableIdentifier(), superClass = null;
                this.matchKeyword("extends") && (this.nextToken(), superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall));
                var classBody = this.parseClassBody();
                return this.context.strict = previousStrict, this.finalize(node, new Node.ClassDeclaration(id, superClass, classBody));
              }, Parser2.prototype.parseClassExpression = function() {
                var node = this.createNode(), previousStrict = this.context.strict;
                this.context.strict = !0, this.expectKeyword("class");
                var id = this.lookahead.type === 3 ? this.parseVariableIdentifier() : null, superClass = null;
                this.matchKeyword("extends") && (this.nextToken(), superClass = this.isolateCoverGrammar(this.parseLeftHandSideExpressionAllowCall));
                var classBody = this.parseClassBody();
                return this.context.strict = previousStrict, this.finalize(node, new Node.ClassExpression(id, superClass, classBody));
              }, Parser2.prototype.parseModule = function() {
                this.context.strict = !0, this.context.isModule = !0, this.scanner.isModule = !0;
                for (var node = this.createNode(), body = this.parseDirectivePrologues(); this.lookahead.type !== 2; )
                  body.push(this.parseStatementListItem());
                return this.finalize(node, new Node.Module(body));
              }, Parser2.prototype.parseScript = function() {
                for (var node = this.createNode(), body = this.parseDirectivePrologues(); this.lookahead.type !== 2; )
                  body.push(this.parseStatementListItem());
                return this.finalize(node, new Node.Script(body));
              }, Parser2.prototype.parseModuleSpecifier = function() {
                var node = this.createNode();
                this.lookahead.type !== 8 && this.throwError(messages_1.Messages.InvalidModuleSpecifier);
                var token = this.nextToken(), raw = this.getTokenRaw(token);
                return this.finalize(node, new Node.Literal(token.value, raw));
              }, Parser2.prototype.parseImportSpecifier = function() {
                var node = this.createNode(), imported, local;
                return this.lookahead.type === 3 ? (imported = this.parseVariableIdentifier(), local = imported, this.matchContextualKeyword("as") && (this.nextToken(), local = this.parseVariableIdentifier())) : (imported = this.parseIdentifierName(), local = imported, this.matchContextualKeyword("as") ? (this.nextToken(), local = this.parseVariableIdentifier()) : this.throwUnexpectedToken(this.nextToken())), this.finalize(node, new Node.ImportSpecifier(local, imported));
              }, Parser2.prototype.parseNamedImports = function() {
                this.expect("{");
                for (var specifiers = []; !this.match("}"); )
                  specifiers.push(this.parseImportSpecifier()), this.match("}") || this.expect(",");
                return this.expect("}"), specifiers;
              }, Parser2.prototype.parseImportDefaultSpecifier = function() {
                var node = this.createNode(), local = this.parseIdentifierName();
                return this.finalize(node, new Node.ImportDefaultSpecifier(local));
              }, Parser2.prototype.parseImportNamespaceSpecifier = function() {
                var node = this.createNode();
                this.expect("*"), this.matchContextualKeyword("as") || this.throwError(messages_1.Messages.NoAsAfterImportNamespace), this.nextToken();
                var local = this.parseIdentifierName();
                return this.finalize(node, new Node.ImportNamespaceSpecifier(local));
              }, Parser2.prototype.parseImportDeclaration = function() {
                this.context.inFunctionBody && this.throwError(messages_1.Messages.IllegalImportDeclaration);
                var node = this.createNode();
                this.expectKeyword("import");
                var src, specifiers = [];
                if (this.lookahead.type === 8)
                  src = this.parseModuleSpecifier();
                else {
                  if (this.match("{") ? specifiers = specifiers.concat(this.parseNamedImports()) : this.match("*") ? specifiers.push(this.parseImportNamespaceSpecifier()) : this.isIdentifierName(this.lookahead) && !this.matchKeyword("default") ? (specifiers.push(this.parseImportDefaultSpecifier()), this.match(",") && (this.nextToken(), this.match("*") ? specifiers.push(this.parseImportNamespaceSpecifier()) : this.match("{") ? specifiers = specifiers.concat(this.parseNamedImports()) : this.throwUnexpectedToken(this.lookahead))) : this.throwUnexpectedToken(this.nextToken()), !this.matchContextualKeyword("from")) {
                    var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
                    this.throwError(message, this.lookahead.value);
                  }
                  this.nextToken(), src = this.parseModuleSpecifier();
                }
                return this.consumeSemicolon(), this.finalize(node, new Node.ImportDeclaration(specifiers, src));
              }, Parser2.prototype.parseExportSpecifier = function() {
                var node = this.createNode(), local = this.parseIdentifierName(), exported = local;
                return this.matchContextualKeyword("as") && (this.nextToken(), exported = this.parseIdentifierName()), this.finalize(node, new Node.ExportSpecifier(local, exported));
              }, Parser2.prototype.parseExportDeclaration = function() {
                this.context.inFunctionBody && this.throwError(messages_1.Messages.IllegalExportDeclaration);
                var node = this.createNode();
                this.expectKeyword("export");
                var exportDeclaration;
                if (this.matchKeyword("default"))
                  if (this.nextToken(), this.matchKeyword("function")) {
                    var declaration = this.parseFunctionDeclaration(!0);
                    exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
                  } else if (this.matchKeyword("class")) {
                    var declaration = this.parseClassDeclaration(!0);
                    exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
                  } else if (this.matchContextualKeyword("async")) {
                    var declaration = this.matchAsyncFunction() ? this.parseFunctionDeclaration(!0) : this.parseAssignmentExpression();
                    exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
                  } else {
                    this.matchContextualKeyword("from") && this.throwError(messages_1.Messages.UnexpectedToken, this.lookahead.value);
                    var declaration = this.match("{") ? this.parseObjectInitializer() : this.match("[") ? this.parseArrayInitializer() : this.parseAssignmentExpression();
                    this.consumeSemicolon(), exportDeclaration = this.finalize(node, new Node.ExportDefaultDeclaration(declaration));
                  }
                else if (this.match("*")) {
                  if (this.nextToken(), !this.matchContextualKeyword("from")) {
                    var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
                    this.throwError(message, this.lookahead.value);
                  }
                  this.nextToken();
                  var src = this.parseModuleSpecifier();
                  this.consumeSemicolon(), exportDeclaration = this.finalize(node, new Node.ExportAllDeclaration(src));
                } else if (this.lookahead.type === 4) {
                  var declaration = void 0;
                  switch (this.lookahead.value) {
                    case "let":
                    case "const":
                      declaration = this.parseLexicalDeclaration({ inFor: !1 });
                      break;
                    case "var":
                    case "class":
                    case "function":
                      declaration = this.parseStatementListItem();
                      break;
                    default:
                      this.throwUnexpectedToken(this.lookahead);
                  }
                  exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(declaration, [], null));
                } else if (this.matchAsyncFunction()) {
                  var declaration = this.parseFunctionDeclaration();
                  exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(declaration, [], null));
                } else {
                  var specifiers = [], source = null, isExportFromIdentifier = !1;
                  for (this.expect("{"); !this.match("}"); )
                    isExportFromIdentifier = isExportFromIdentifier || this.matchKeyword("default"), specifiers.push(this.parseExportSpecifier()), this.match("}") || this.expect(",");
                  if (this.expect("}"), this.matchContextualKeyword("from"))
                    this.nextToken(), source = this.parseModuleSpecifier(), this.consumeSemicolon();
                  else if (isExportFromIdentifier) {
                    var message = this.lookahead.value ? messages_1.Messages.UnexpectedToken : messages_1.Messages.MissingFromClause;
                    this.throwError(message, this.lookahead.value);
                  } else
                    this.consumeSemicolon();
                  exportDeclaration = this.finalize(node, new Node.ExportNamedDeclaration(null, specifiers, source));
                }
                return exportDeclaration;
              }, Parser2;
            })();
            exports2.Parser = Parser;
          },
          /* 9 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            function assert(condition, message) {
              if (!condition)
                throw new Error("ASSERT: " + message);
            }
            exports2.assert = assert;
          },
          /* 10 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var ErrorHandler = (function() {
              function ErrorHandler2() {
                this.errors = [], this.tolerant = !1;
              }
              return ErrorHandler2.prototype.recordError = function(error) {
                this.errors.push(error);
              }, ErrorHandler2.prototype.tolerate = function(error) {
                if (this.tolerant)
                  this.recordError(error);
                else
                  throw error;
              }, ErrorHandler2.prototype.constructError = function(msg, column) {
                var error = new Error(msg);
                try {
                  throw error;
                } catch (base) {
                  Object.create && Object.defineProperty && (error = Object.create(base), Object.defineProperty(error, "column", { value: column }));
                }
                return error;
              }, ErrorHandler2.prototype.createError = function(index, line, col, description) {
                var msg = "Line " + line + ": " + description, error = this.constructError(msg, col);
                return error.index = index, error.lineNumber = line, error.description = description, error;
              }, ErrorHandler2.prototype.throwError = function(index, line, col, description) {
                throw this.createError(index, line, col, description);
              }, ErrorHandler2.prototype.tolerateError = function(index, line, col, description) {
                var error = this.createError(index, line, col, description);
                if (this.tolerant)
                  this.recordError(error);
                else
                  throw error;
              }, ErrorHandler2;
            })();
            exports2.ErrorHandler = ErrorHandler;
          },
          /* 11 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 }), exports2.Messages = {
              BadGetterArity: "Getter must not have any formal parameters",
              BadSetterArity: "Setter must have exactly one formal parameter",
              BadSetterRestParameter: "Setter function argument must not be a rest parameter",
              ConstructorIsAsync: "Class constructor may not be an async method",
              ConstructorSpecialMethod: "Class constructor may not be an accessor",
              DeclarationMissingInitializer: "Missing initializer in %0 declaration",
              DefaultRestParameter: "Unexpected token =",
              DuplicateBinding: "Duplicate binding %0",
              DuplicateConstructor: "A class may only have one constructor",
              DuplicateProtoProperty: "Duplicate __proto__ fields are not allowed in object literals",
              ForInOfLoopInitializer: "%0 loop variable declaration may not have an initializer",
              GeneratorInLegacyContext: "Generator declarations are not allowed in legacy contexts",
              IllegalBreak: "Illegal break statement",
              IllegalContinue: "Illegal continue statement",
              IllegalExportDeclaration: "Unexpected token",
              IllegalImportDeclaration: "Unexpected token",
              IllegalLanguageModeDirective: "Illegal 'use strict' directive in function with non-simple parameter list",
              IllegalReturn: "Illegal return statement",
              InvalidEscapedReservedWord: "Keyword must not contain escaped characters",
              InvalidHexEscapeSequence: "Invalid hexadecimal escape sequence",
              InvalidLHSInAssignment: "Invalid left-hand side in assignment",
              InvalidLHSInForIn: "Invalid left-hand side in for-in",
              InvalidLHSInForLoop: "Invalid left-hand side in for-loop",
              InvalidModuleSpecifier: "Unexpected token",
              InvalidRegExp: "Invalid regular expression",
              LetInLexicalBinding: "let is disallowed as a lexically bound name",
              MissingFromClause: "Unexpected token",
              MultipleDefaultsInSwitch: "More than one default clause in switch statement",
              NewlineAfterThrow: "Illegal newline after throw",
              NoAsAfterImportNamespace: "Unexpected token",
              NoCatchOrFinally: "Missing catch or finally after try",
              ParameterAfterRestParameter: "Rest parameter must be last formal parameter",
              Redeclaration: "%0 '%1' has already been declared",
              StaticPrototype: "Classes may not have static property named prototype",
              StrictCatchVariable: "Catch variable may not be eval or arguments in strict mode",
              StrictDelete: "Delete of an unqualified identifier in strict mode.",
              StrictFunction: "In strict mode code, functions can only be declared at top level or inside a block",
              StrictFunctionName: "Function name may not be eval or arguments in strict mode",
              StrictLHSAssignment: "Assignment to eval or arguments is not allowed in strict mode",
              StrictLHSPostfix: "Postfix increment/decrement may not have eval or arguments operand in strict mode",
              StrictLHSPrefix: "Prefix increment/decrement may not have eval or arguments operand in strict mode",
              StrictModeWith: "Strict mode code may not include a with statement",
              StrictOctalLiteral: "Octal literals are not allowed in strict mode.",
              StrictParamDupe: "Strict mode function may not have duplicate parameter names",
              StrictParamName: "Parameter name eval or arguments is not allowed in strict mode",
              StrictReservedWord: "Use of future reserved word in strict mode",
              StrictVarName: "Variable name may not be eval or arguments in strict mode",
              TemplateOctalLiteral: "Octal literals are not allowed in template strings.",
              UnexpectedEOS: "Unexpected end of input",
              UnexpectedIdentifier: "Unexpected identifier",
              UnexpectedNumber: "Unexpected number",
              UnexpectedReserved: "Unexpected reserved word",
              UnexpectedString: "Unexpected string",
              UnexpectedTemplate: "Unexpected quasi %0",
              UnexpectedToken: "Unexpected token %0",
              UnexpectedTokenIllegal: "Unexpected token ILLEGAL",
              UnknownLabel: "Undefined label '%0'",
              UnterminatedRegExp: "Invalid regular expression: missing /"
            };
          },
          /* 12 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var assert_1 = __webpack_require__(9), character_1 = __webpack_require__(4), messages_1 = __webpack_require__(11);
            function hexValue(ch) {
              return "0123456789abcdef".indexOf(ch.toLowerCase());
            }
            function octalValue(ch) {
              return "01234567".indexOf(ch);
            }
            var Scanner = (function() {
              function Scanner2(code, handler) {
                this.source = code, this.errorHandler = handler, this.trackComment = !1, this.isModule = !1, this.length = code.length, this.index = 0, this.lineNumber = code.length > 0 ? 1 : 0, this.lineStart = 0, this.curlyStack = [];
              }
              return Scanner2.prototype.saveState = function() {
                return {
                  index: this.index,
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart
                };
              }, Scanner2.prototype.restoreState = function(state) {
                this.index = state.index, this.lineNumber = state.lineNumber, this.lineStart = state.lineStart;
              }, Scanner2.prototype.eof = function() {
                return this.index >= this.length;
              }, Scanner2.prototype.throwUnexpectedToken = function(message) {
                return message === void 0 && (message = messages_1.Messages.UnexpectedTokenIllegal), this.errorHandler.throwError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
              }, Scanner2.prototype.tolerateUnexpectedToken = function(message) {
                message === void 0 && (message = messages_1.Messages.UnexpectedTokenIllegal), this.errorHandler.tolerateError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
              }, Scanner2.prototype.skipSingleLineComment = function(offset) {
                var comments = [], start, loc;
                for (this.trackComment && (comments = [], start = this.index - offset, loc = {
                  start: {
                    line: this.lineNumber,
                    column: this.index - this.lineStart - offset
                  },
                  end: {}
                }); !this.eof(); ) {
                  var ch = this.source.charCodeAt(this.index);
                  if (++this.index, character_1.Character.isLineTerminator(ch)) {
                    if (this.trackComment) {
                      loc.end = {
                        line: this.lineNumber,
                        column: this.index - this.lineStart - 1
                      };
                      var entry = {
                        multiLine: !1,
                        slice: [start + offset, this.index - 1],
                        range: [start, this.index - 1],
                        loc
                      };
                      comments.push(entry);
                    }
                    return ch === 13 && this.source.charCodeAt(this.index) === 10 && ++this.index, ++this.lineNumber, this.lineStart = this.index, comments;
                  }
                }
                if (this.trackComment) {
                  loc.end = {
                    line: this.lineNumber,
                    column: this.index - this.lineStart
                  };
                  var entry = {
                    multiLine: !1,
                    slice: [start + offset, this.index],
                    range: [start, this.index],
                    loc
                  };
                  comments.push(entry);
                }
                return comments;
              }, Scanner2.prototype.skipMultiLineComment = function() {
                var comments = [], start, loc;
                for (this.trackComment && (comments = [], start = this.index - 2, loc = {
                  start: {
                    line: this.lineNumber,
                    column: this.index - this.lineStart - 2
                  },
                  end: {}
                }); !this.eof(); ) {
                  var ch = this.source.charCodeAt(this.index);
                  if (character_1.Character.isLineTerminator(ch))
                    ch === 13 && this.source.charCodeAt(this.index + 1) === 10 && ++this.index, ++this.lineNumber, ++this.index, this.lineStart = this.index;
                  else if (ch === 42) {
                    if (this.source.charCodeAt(this.index + 1) === 47) {
                      if (this.index += 2, this.trackComment) {
                        loc.end = {
                          line: this.lineNumber,
                          column: this.index - this.lineStart
                        };
                        var entry = {
                          multiLine: !0,
                          slice: [start + 2, this.index - 2],
                          range: [start, this.index],
                          loc
                        };
                        comments.push(entry);
                      }
                      return comments;
                    }
                    ++this.index;
                  } else
                    ++this.index;
                }
                if (this.trackComment) {
                  loc.end = {
                    line: this.lineNumber,
                    column: this.index - this.lineStart
                  };
                  var entry = {
                    multiLine: !0,
                    slice: [start + 2, this.index],
                    range: [start, this.index],
                    loc
                  };
                  comments.push(entry);
                }
                return this.tolerateUnexpectedToken(), comments;
              }, Scanner2.prototype.scanComments = function() {
                var comments;
                this.trackComment && (comments = []);
                for (var start = this.index === 0; !this.eof(); ) {
                  var ch = this.source.charCodeAt(this.index);
                  if (character_1.Character.isWhiteSpace(ch))
                    ++this.index;
                  else if (character_1.Character.isLineTerminator(ch))
                    ++this.index, ch === 13 && this.source.charCodeAt(this.index) === 10 && ++this.index, ++this.lineNumber, this.lineStart = this.index, start = !0;
                  else if (ch === 47)
                    if (ch = this.source.charCodeAt(this.index + 1), ch === 47) {
                      this.index += 2;
                      var comment = this.skipSingleLineComment(2);
                      this.trackComment && (comments = comments.concat(comment)), start = !0;
                    } else if (ch === 42) {
                      this.index += 2;
                      var comment = this.skipMultiLineComment();
                      this.trackComment && (comments = comments.concat(comment));
                    } else
                      break;
                  else if (start && ch === 45)
                    if (this.source.charCodeAt(this.index + 1) === 45 && this.source.charCodeAt(this.index + 2) === 62) {
                      this.index += 3;
                      var comment = this.skipSingleLineComment(3);
                      this.trackComment && (comments = comments.concat(comment));
                    } else
                      break;
                  else if (ch === 60 && !this.isModule)
                    if (this.source.slice(this.index + 1, this.index + 4) === "!--") {
                      this.index += 4;
                      var comment = this.skipSingleLineComment(4);
                      this.trackComment && (comments = comments.concat(comment));
                    } else
                      break;
                  else
                    break;
                }
                return comments;
              }, Scanner2.prototype.isFutureReservedWord = function(id) {
                switch (id) {
                  case "enum":
                  case "export":
                  case "import":
                  case "super":
                    return !0;
                  default:
                    return !1;
                }
              }, Scanner2.prototype.isStrictModeReservedWord = function(id) {
                switch (id) {
                  case "implements":
                  case "interface":
                  case "package":
                  case "private":
                  case "protected":
                  case "public":
                  case "static":
                  case "yield":
                  case "let":
                    return !0;
                  default:
                    return !1;
                }
              }, Scanner2.prototype.isRestrictedWord = function(id) {
                return id === "eval" || id === "arguments";
              }, Scanner2.prototype.isKeyword = function(id) {
                switch (id.length) {
                  case 2:
                    return id === "if" || id === "in" || id === "do";
                  case 3:
                    return id === "var" || id === "for" || id === "new" || id === "try" || id === "let";
                  case 4:
                    return id === "this" || id === "else" || id === "case" || id === "void" || id === "with" || id === "enum";
                  case 5:
                    return id === "while" || id === "break" || id === "catch" || id === "throw" || id === "const" || id === "yield" || id === "class" || id === "super";
                  case 6:
                    return id === "return" || id === "typeof" || id === "delete" || id === "switch" || id === "export" || id === "import";
                  case 7:
                    return id === "default" || id === "finally" || id === "extends";
                  case 8:
                    return id === "function" || id === "continue" || id === "debugger";
                  case 10:
                    return id === "instanceof";
                  default:
                    return !1;
                }
              }, Scanner2.prototype.codePointAt = function(i) {
                var cp2 = this.source.charCodeAt(i);
                if (cp2 >= 55296 && cp2 <= 56319) {
                  var second = this.source.charCodeAt(i + 1);
                  if (second >= 56320 && second <= 57343) {
                    var first = cp2;
                    cp2 = (first - 55296) * 1024 + second - 56320 + 65536;
                  }
                }
                return cp2;
              }, Scanner2.prototype.scanHexEscape = function(prefix) {
                for (var len = prefix === "u" ? 4 : 2, code = 0, i = 0; i < len; ++i)
                  if (!this.eof() && character_1.Character.isHexDigit(this.source.charCodeAt(this.index)))
                    code = code * 16 + hexValue(this.source[this.index++]);
                  else
                    return null;
                return String.fromCharCode(code);
              }, Scanner2.prototype.scanUnicodeCodePointEscape = function() {
                var ch = this.source[this.index], code = 0;
                for (ch === "}" && this.throwUnexpectedToken(); !this.eof() && (ch = this.source[this.index++], !!character_1.Character.isHexDigit(ch.charCodeAt(0))); )
                  code = code * 16 + hexValue(ch);
                return (code > 1114111 || ch !== "}") && this.throwUnexpectedToken(), character_1.Character.fromCodePoint(code);
              }, Scanner2.prototype.getIdentifier = function() {
                for (var start = this.index++; !this.eof(); ) {
                  var ch = this.source.charCodeAt(this.index);
                  if (ch === 92)
                    return this.index = start, this.getComplexIdentifier();
                  if (ch >= 55296 && ch < 57343)
                    return this.index = start, this.getComplexIdentifier();
                  if (character_1.Character.isIdentifierPart(ch))
                    ++this.index;
                  else
                    break;
                }
                return this.source.slice(start, this.index);
              }, Scanner2.prototype.getComplexIdentifier = function() {
                var cp2 = this.codePointAt(this.index), id = character_1.Character.fromCodePoint(cp2);
                this.index += id.length;
                var ch;
                for (cp2 === 92 && (this.source.charCodeAt(this.index) !== 117 && this.throwUnexpectedToken(), ++this.index, this.source[this.index] === "{" ? (++this.index, ch = this.scanUnicodeCodePointEscape()) : (ch = this.scanHexEscape("u"), (ch === null || ch === "\\" || !character_1.Character.isIdentifierStart(ch.charCodeAt(0))) && this.throwUnexpectedToken()), id = ch); !this.eof() && (cp2 = this.codePointAt(this.index), !!character_1.Character.isIdentifierPart(cp2)); )
                  ch = character_1.Character.fromCodePoint(cp2), id += ch, this.index += ch.length, cp2 === 92 && (id = id.substr(0, id.length - 1), this.source.charCodeAt(this.index) !== 117 && this.throwUnexpectedToken(), ++this.index, this.source[this.index] === "{" ? (++this.index, ch = this.scanUnicodeCodePointEscape()) : (ch = this.scanHexEscape("u"), (ch === null || ch === "\\" || !character_1.Character.isIdentifierPart(ch.charCodeAt(0))) && this.throwUnexpectedToken()), id += ch);
                return id;
              }, Scanner2.prototype.octalToDecimal = function(ch) {
                var octal = ch !== "0", code = octalValue(ch);
                return !this.eof() && character_1.Character.isOctalDigit(this.source.charCodeAt(this.index)) && (octal = !0, code = code * 8 + octalValue(this.source[this.index++]), "0123".indexOf(ch) >= 0 && !this.eof() && character_1.Character.isOctalDigit(this.source.charCodeAt(this.index)) && (code = code * 8 + octalValue(this.source[this.index++]))), {
                  code,
                  octal
                };
              }, Scanner2.prototype.scanIdentifier = function() {
                var type, start = this.index, id = this.source.charCodeAt(start) === 92 ? this.getComplexIdentifier() : this.getIdentifier();
                if (id.length === 1 ? type = 3 : this.isKeyword(id) ? type = 4 : id === "null" ? type = 5 : id === "true" || id === "false" ? type = 1 : type = 3, type !== 3 && start + id.length !== this.index) {
                  var restore = this.index;
                  this.index = start, this.tolerateUnexpectedToken(messages_1.Messages.InvalidEscapedReservedWord), this.index = restore;
                }
                return {
                  type,
                  value: id,
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.scanPunctuator = function() {
                var start = this.index, str = this.source[this.index];
                switch (str) {
                  case "(":
                  case "{":
                    str === "{" && this.curlyStack.push("{"), ++this.index;
                    break;
                  case ".":
                    ++this.index, this.source[this.index] === "." && this.source[this.index + 1] === "." && (this.index += 2, str = "...");
                    break;
                  case "}":
                    ++this.index, this.curlyStack.pop();
                    break;
                  case ")":
                  case ";":
                  case ",":
                  case "[":
                  case "]":
                  case ":":
                  case "?":
                  case "~":
                    ++this.index;
                    break;
                  default:
                    str = this.source.substr(this.index, 4), str === ">>>=" ? this.index += 4 : (str = str.substr(0, 3), str === "===" || str === "!==" || str === ">>>" || str === "<<=" || str === ">>=" || str === "**=" ? this.index += 3 : (str = str.substr(0, 2), str === "&&" || str === "||" || str === "==" || str === "!=" || str === "+=" || str === "-=" || str === "*=" || str === "/=" || str === "++" || str === "--" || str === "<<" || str === ">>" || str === "&=" || str === "|=" || str === "^=" || str === "%=" || str === "<=" || str === ">=" || str === "=>" || str === "**" ? this.index += 2 : (str = this.source[this.index], "<>=!+-*%&|^/".indexOf(str) >= 0 && ++this.index)));
                }
                return this.index === start && this.throwUnexpectedToken(), {
                  type: 7,
                  value: str,
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.scanHexLiteral = function(start) {
                for (var num = ""; !this.eof() && character_1.Character.isHexDigit(this.source.charCodeAt(this.index)); )
                  num += this.source[this.index++];
                return num.length === 0 && this.throwUnexpectedToken(), character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index)) && this.throwUnexpectedToken(), {
                  type: 6,
                  value: parseInt("0x" + num, 16),
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.scanBinaryLiteral = function(start) {
                for (var num = "", ch; !this.eof() && (ch = this.source[this.index], !(ch !== "0" && ch !== "1")); )
                  num += this.source[this.index++];
                return num.length === 0 && this.throwUnexpectedToken(), this.eof() || (ch = this.source.charCodeAt(this.index), (character_1.Character.isIdentifierStart(ch) || character_1.Character.isDecimalDigit(ch)) && this.throwUnexpectedToken()), {
                  type: 6,
                  value: parseInt(num, 2),
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.scanOctalLiteral = function(prefix, start) {
                var num = "", octal = !1;
                for (character_1.Character.isOctalDigit(prefix.charCodeAt(0)) ? (octal = !0, num = "0" + this.source[this.index++]) : ++this.index; !this.eof() && character_1.Character.isOctalDigit(this.source.charCodeAt(this.index)); )
                  num += this.source[this.index++];
                return !octal && num.length === 0 && this.throwUnexpectedToken(), (character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index)) || character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index))) && this.throwUnexpectedToken(), {
                  type: 6,
                  value: parseInt(num, 8),
                  octal,
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.isImplicitOctalLiteral = function() {
                for (var i = this.index + 1; i < this.length; ++i) {
                  var ch = this.source[i];
                  if (ch === "8" || ch === "9")
                    return !1;
                  if (!character_1.Character.isOctalDigit(ch.charCodeAt(0)))
                    return !0;
                }
                return !0;
              }, Scanner2.prototype.scanNumericLiteral = function() {
                var start = this.index, ch = this.source[start];
                assert_1.assert(character_1.Character.isDecimalDigit(ch.charCodeAt(0)) || ch === ".", "Numeric literal must start with a decimal digit or a decimal point");
                var num = "";
                if (ch !== ".") {
                  if (num = this.source[this.index++], ch = this.source[this.index], num === "0") {
                    if (ch === "x" || ch === "X")
                      return ++this.index, this.scanHexLiteral(start);
                    if (ch === "b" || ch === "B")
                      return ++this.index, this.scanBinaryLiteral(start);
                    if (ch === "o" || ch === "O")
                      return this.scanOctalLiteral(ch, start);
                    if (ch && character_1.Character.isOctalDigit(ch.charCodeAt(0)) && this.isImplicitOctalLiteral())
                      return this.scanOctalLiteral(ch, start);
                  }
                  for (; character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index)); )
                    num += this.source[this.index++];
                  ch = this.source[this.index];
                }
                if (ch === ".") {
                  for (num += this.source[this.index++]; character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index)); )
                    num += this.source[this.index++];
                  ch = this.source[this.index];
                }
                if (ch === "e" || ch === "E")
                  if (num += this.source[this.index++], ch = this.source[this.index], (ch === "+" || ch === "-") && (num += this.source[this.index++]), character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index)))
                    for (; character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index)); )
                      num += this.source[this.index++];
                  else
                    this.throwUnexpectedToken();
                return character_1.Character.isIdentifierStart(this.source.charCodeAt(this.index)) && this.throwUnexpectedToken(), {
                  type: 6,
                  value: parseFloat(num),
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.scanStringLiteral = function() {
                var start = this.index, quote = this.source[start];
                assert_1.assert(quote === "'" || quote === '"', "String literal must starts with a quote"), ++this.index;
                for (var octal = !1, str = ""; !this.eof(); ) {
                  var ch = this.source[this.index++];
                  if (ch === quote) {
                    quote = "";
                    break;
                  } else if (ch === "\\")
                    if (ch = this.source[this.index++], !ch || !character_1.Character.isLineTerminator(ch.charCodeAt(0)))
                      switch (ch) {
                        case "u":
                          if (this.source[this.index] === "{")
                            ++this.index, str += this.scanUnicodeCodePointEscape();
                          else {
                            var unescaped_1 = this.scanHexEscape(ch);
                            unescaped_1 === null && this.throwUnexpectedToken(), str += unescaped_1;
                          }
                          break;
                        case "x":
                          var unescaped = this.scanHexEscape(ch);
                          unescaped === null && this.throwUnexpectedToken(messages_1.Messages.InvalidHexEscapeSequence), str += unescaped;
                          break;
                        case "n":
                          str += `
`;
                          break;
                        case "r":
                          str += "\r";
                          break;
                        case "t":
                          str += "	";
                          break;
                        case "b":
                          str += "\b";
                          break;
                        case "f":
                          str += "\f";
                          break;
                        case "v":
                          str += "\v";
                          break;
                        case "8":
                        case "9":
                          str += ch, this.tolerateUnexpectedToken();
                          break;
                        default:
                          if (ch && character_1.Character.isOctalDigit(ch.charCodeAt(0))) {
                            var octToDec = this.octalToDecimal(ch);
                            octal = octToDec.octal || octal, str += String.fromCharCode(octToDec.code);
                          } else
                            str += ch;
                          break;
                      }
                    else
                      ++this.lineNumber, ch === "\r" && this.source[this.index] === `
` && ++this.index, this.lineStart = this.index;
                  else {
                    if (character_1.Character.isLineTerminator(ch.charCodeAt(0)))
                      break;
                    str += ch;
                  }
                }
                return quote !== "" && (this.index = start, this.throwUnexpectedToken()), {
                  type: 8,
                  value: str,
                  octal,
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.scanTemplate = function() {
                var cooked = "", terminated = !1, start = this.index, head = this.source[start] === "`", tail = !1, rawOffset = 2;
                for (++this.index; !this.eof(); ) {
                  var ch = this.source[this.index++];
                  if (ch === "`") {
                    rawOffset = 1, tail = !0, terminated = !0;
                    break;
                  } else if (ch === "$") {
                    if (this.source[this.index] === "{") {
                      this.curlyStack.push("${"), ++this.index, terminated = !0;
                      break;
                    }
                    cooked += ch;
                  } else if (ch === "\\")
                    if (ch = this.source[this.index++], character_1.Character.isLineTerminator(ch.charCodeAt(0)))
                      ++this.lineNumber, ch === "\r" && this.source[this.index] === `
` && ++this.index, this.lineStart = this.index;
                    else
                      switch (ch) {
                        case "n":
                          cooked += `
`;
                          break;
                        case "r":
                          cooked += "\r";
                          break;
                        case "t":
                          cooked += "	";
                          break;
                        case "u":
                          if (this.source[this.index] === "{")
                            ++this.index, cooked += this.scanUnicodeCodePointEscape();
                          else {
                            var restore = this.index, unescaped_2 = this.scanHexEscape(ch);
                            unescaped_2 !== null ? cooked += unescaped_2 : (this.index = restore, cooked += ch);
                          }
                          break;
                        case "x":
                          var unescaped = this.scanHexEscape(ch);
                          unescaped === null && this.throwUnexpectedToken(messages_1.Messages.InvalidHexEscapeSequence), cooked += unescaped;
                          break;
                        case "b":
                          cooked += "\b";
                          break;
                        case "f":
                          cooked += "\f";
                          break;
                        case "v":
                          cooked += "\v";
                          break;
                        default:
                          ch === "0" ? (character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index)) && this.throwUnexpectedToken(messages_1.Messages.TemplateOctalLiteral), cooked += "\0") : character_1.Character.isOctalDigit(ch.charCodeAt(0)) ? this.throwUnexpectedToken(messages_1.Messages.TemplateOctalLiteral) : cooked += ch;
                          break;
                      }
                  else character_1.Character.isLineTerminator(ch.charCodeAt(0)) ? (++this.lineNumber, ch === "\r" && this.source[this.index] === `
` && ++this.index, this.lineStart = this.index, cooked += `
`) : cooked += ch;
                }
                return terminated || this.throwUnexpectedToken(), head || this.curlyStack.pop(), {
                  type: 10,
                  value: this.source.slice(start + 1, this.index - rawOffset),
                  cooked,
                  head,
                  tail,
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.testRegExp = function(pattern, flags) {
                var astralSubstitute = "\uFFFF", tmp = pattern, self = this;
                flags.indexOf("u") >= 0 && (tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, function($0, $1, $2) {
                  var codePoint = parseInt($1 || $2, 16);
                  return codePoint > 1114111 && self.throwUnexpectedToken(messages_1.Messages.InvalidRegExp), codePoint <= 65535 ? String.fromCharCode(codePoint) : astralSubstitute;
                }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, astralSubstitute));
                try {
                  RegExp(tmp);
                } catch {
                  this.throwUnexpectedToken(messages_1.Messages.InvalidRegExp);
                }
                try {
                  return new RegExp(pattern, flags);
                } catch {
                  return null;
                }
              }, Scanner2.prototype.scanRegExpBody = function() {
                var ch = this.source[this.index];
                assert_1.assert(ch === "/", "Regular expression literal must start with a slash");
                for (var str = this.source[this.index++], classMarker = !1, terminated = !1; !this.eof(); )
                  if (ch = this.source[this.index++], str += ch, ch === "\\")
                    ch = this.source[this.index++], character_1.Character.isLineTerminator(ch.charCodeAt(0)) && this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp), str += ch;
                  else if (character_1.Character.isLineTerminator(ch.charCodeAt(0)))
                    this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp);
                  else if (classMarker)
                    ch === "]" && (classMarker = !1);
                  else if (ch === "/") {
                    terminated = !0;
                    break;
                  } else ch === "[" && (classMarker = !0);
                return terminated || this.throwUnexpectedToken(messages_1.Messages.UnterminatedRegExp), str.substr(1, str.length - 2);
              }, Scanner2.prototype.scanRegExpFlags = function() {
                for (var str = "", flags = ""; !this.eof(); ) {
                  var ch = this.source[this.index];
                  if (!character_1.Character.isIdentifierPart(ch.charCodeAt(0)))
                    break;
                  if (++this.index, ch === "\\" && !this.eof())
                    if (ch = this.source[this.index], ch === "u") {
                      ++this.index;
                      var restore = this.index, char = this.scanHexEscape("u");
                      if (char !== null)
                        for (flags += char, str += "\\u"; restore < this.index; ++restore)
                          str += this.source[restore];
                      else
                        this.index = restore, flags += "u", str += "\\u";
                      this.tolerateUnexpectedToken();
                    } else
                      str += "\\", this.tolerateUnexpectedToken();
                  else
                    flags += ch, str += ch;
                }
                return flags;
              }, Scanner2.prototype.scanRegExp = function() {
                var start = this.index, pattern = this.scanRegExpBody(), flags = this.scanRegExpFlags(), value = this.testRegExp(pattern, flags);
                return {
                  type: 9,
                  value: "",
                  pattern,
                  flags,
                  regex: value,
                  lineNumber: this.lineNumber,
                  lineStart: this.lineStart,
                  start,
                  end: this.index
                };
              }, Scanner2.prototype.lex = function() {
                if (this.eof())
                  return {
                    type: 2,
                    value: "",
                    lineNumber: this.lineNumber,
                    lineStart: this.lineStart,
                    start: this.index,
                    end: this.index
                  };
                var cp2 = this.source.charCodeAt(this.index);
                return character_1.Character.isIdentifierStart(cp2) ? this.scanIdentifier() : cp2 === 40 || cp2 === 41 || cp2 === 59 ? this.scanPunctuator() : cp2 === 39 || cp2 === 34 ? this.scanStringLiteral() : cp2 === 46 ? character_1.Character.isDecimalDigit(this.source.charCodeAt(this.index + 1)) ? this.scanNumericLiteral() : this.scanPunctuator() : character_1.Character.isDecimalDigit(cp2) ? this.scanNumericLiteral() : cp2 === 96 || cp2 === 125 && this.curlyStack[this.curlyStack.length - 1] === "${" ? this.scanTemplate() : cp2 >= 55296 && cp2 < 57343 && character_1.Character.isIdentifierStart(this.codePointAt(this.index)) ? this.scanIdentifier() : this.scanPunctuator();
              }, Scanner2;
            })();
            exports2.Scanner = Scanner;
          },
          /* 13 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 }), exports2.TokenName = {}, exports2.TokenName[
              1
              /* BooleanLiteral */
            ] = "Boolean", exports2.TokenName[
              2
              /* EOF */
            ] = "<end>", exports2.TokenName[
              3
              /* Identifier */
            ] = "Identifier", exports2.TokenName[
              4
              /* Keyword */
            ] = "Keyword", exports2.TokenName[
              5
              /* NullLiteral */
            ] = "Null", exports2.TokenName[
              6
              /* NumericLiteral */
            ] = "Numeric", exports2.TokenName[
              7
              /* Punctuator */
            ] = "Punctuator", exports2.TokenName[
              8
              /* StringLiteral */
            ] = "String", exports2.TokenName[
              9
              /* RegularExpression */
            ] = "RegularExpression", exports2.TokenName[
              10
              /* Template */
            ] = "Template";
          },
          /* 14 */
          /***/
          function(module2, exports2) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 }), exports2.XHTMLEntities = {
              quot: '"',
              amp: "&",
              apos: "'",
              gt: ">",
              nbsp: "\xA0",
              iexcl: "\xA1",
              cent: "\xA2",
              pound: "\xA3",
              curren: "\xA4",
              yen: "\xA5",
              brvbar: "\xA6",
              sect: "\xA7",
              uml: "\xA8",
              copy: "\xA9",
              ordf: "\xAA",
              laquo: "\xAB",
              not: "\xAC",
              shy: "\xAD",
              reg: "\xAE",
              macr: "\xAF",
              deg: "\xB0",
              plusmn: "\xB1",
              sup2: "\xB2",
              sup3: "\xB3",
              acute: "\xB4",
              micro: "\xB5",
              para: "\xB6",
              middot: "\xB7",
              cedil: "\xB8",
              sup1: "\xB9",
              ordm: "\xBA",
              raquo: "\xBB",
              frac14: "\xBC",
              frac12: "\xBD",
              frac34: "\xBE",
              iquest: "\xBF",
              Agrave: "\xC0",
              Aacute: "\xC1",
              Acirc: "\xC2",
              Atilde: "\xC3",
              Auml: "\xC4",
              Aring: "\xC5",
              AElig: "\xC6",
              Ccedil: "\xC7",
              Egrave: "\xC8",
              Eacute: "\xC9",
              Ecirc: "\xCA",
              Euml: "\xCB",
              Igrave: "\xCC",
              Iacute: "\xCD",
              Icirc: "\xCE",
              Iuml: "\xCF",
              ETH: "\xD0",
              Ntilde: "\xD1",
              Ograve: "\xD2",
              Oacute: "\xD3",
              Ocirc: "\xD4",
              Otilde: "\xD5",
              Ouml: "\xD6",
              times: "\xD7",
              Oslash: "\xD8",
              Ugrave: "\xD9",
              Uacute: "\xDA",
              Ucirc: "\xDB",
              Uuml: "\xDC",
              Yacute: "\xDD",
              THORN: "\xDE",
              szlig: "\xDF",
              agrave: "\xE0",
              aacute: "\xE1",
              acirc: "\xE2",
              atilde: "\xE3",
              auml: "\xE4",
              aring: "\xE5",
              aelig: "\xE6",
              ccedil: "\xE7",
              egrave: "\xE8",
              eacute: "\xE9",
              ecirc: "\xEA",
              euml: "\xEB",
              igrave: "\xEC",
              iacute: "\xED",
              icirc: "\xEE",
              iuml: "\xEF",
              eth: "\xF0",
              ntilde: "\xF1",
              ograve: "\xF2",
              oacute: "\xF3",
              ocirc: "\xF4",
              otilde: "\xF5",
              ouml: "\xF6",
              divide: "\xF7",
              oslash: "\xF8",
              ugrave: "\xF9",
              uacute: "\xFA",
              ucirc: "\xFB",
              uuml: "\xFC",
              yacute: "\xFD",
              thorn: "\xFE",
              yuml: "\xFF",
              OElig: "\u0152",
              oelig: "\u0153",
              Scaron: "\u0160",
              scaron: "\u0161",
              Yuml: "\u0178",
              fnof: "\u0192",
              circ: "\u02C6",
              tilde: "\u02DC",
              Alpha: "\u0391",
              Beta: "\u0392",
              Gamma: "\u0393",
              Delta: "\u0394",
              Epsilon: "\u0395",
              Zeta: "\u0396",
              Eta: "\u0397",
              Theta: "\u0398",
              Iota: "\u0399",
              Kappa: "\u039A",
              Lambda: "\u039B",
              Mu: "\u039C",
              Nu: "\u039D",
              Xi: "\u039E",
              Omicron: "\u039F",
              Pi: "\u03A0",
              Rho: "\u03A1",
              Sigma: "\u03A3",
              Tau: "\u03A4",
              Upsilon: "\u03A5",
              Phi: "\u03A6",
              Chi: "\u03A7",
              Psi: "\u03A8",
              Omega: "\u03A9",
              alpha: "\u03B1",
              beta: "\u03B2",
              gamma: "\u03B3",
              delta: "\u03B4",
              epsilon: "\u03B5",
              zeta: "\u03B6",
              eta: "\u03B7",
              theta: "\u03B8",
              iota: "\u03B9",
              kappa: "\u03BA",
              lambda: "\u03BB",
              mu: "\u03BC",
              nu: "\u03BD",
              xi: "\u03BE",
              omicron: "\u03BF",
              pi: "\u03C0",
              rho: "\u03C1",
              sigmaf: "\u03C2",
              sigma: "\u03C3",
              tau: "\u03C4",
              upsilon: "\u03C5",
              phi: "\u03C6",
              chi: "\u03C7",
              psi: "\u03C8",
              omega: "\u03C9",
              thetasym: "\u03D1",
              upsih: "\u03D2",
              piv: "\u03D6",
              ensp: "\u2002",
              emsp: "\u2003",
              thinsp: "\u2009",
              zwnj: "\u200C",
              zwj: "\u200D",
              lrm: "\u200E",
              rlm: "\u200F",
              ndash: "\u2013",
              mdash: "\u2014",
              lsquo: "\u2018",
              rsquo: "\u2019",
              sbquo: "\u201A",
              ldquo: "\u201C",
              rdquo: "\u201D",
              bdquo: "\u201E",
              dagger: "\u2020",
              Dagger: "\u2021",
              bull: "\u2022",
              hellip: "\u2026",
              permil: "\u2030",
              prime: "\u2032",
              Prime: "\u2033",
              lsaquo: "\u2039",
              rsaquo: "\u203A",
              oline: "\u203E",
              frasl: "\u2044",
              euro: "\u20AC",
              image: "\u2111",
              weierp: "\u2118",
              real: "\u211C",
              trade: "\u2122",
              alefsym: "\u2135",
              larr: "\u2190",
              uarr: "\u2191",
              rarr: "\u2192",
              darr: "\u2193",
              harr: "\u2194",
              crarr: "\u21B5",
              lArr: "\u21D0",
              uArr: "\u21D1",
              rArr: "\u21D2",
              dArr: "\u21D3",
              hArr: "\u21D4",
              forall: "\u2200",
              part: "\u2202",
              exist: "\u2203",
              empty: "\u2205",
              nabla: "\u2207",
              isin: "\u2208",
              notin: "\u2209",
              ni: "\u220B",
              prod: "\u220F",
              sum: "\u2211",
              minus: "\u2212",
              lowast: "\u2217",
              radic: "\u221A",
              prop: "\u221D",
              infin: "\u221E",
              ang: "\u2220",
              and: "\u2227",
              or: "\u2228",
              cap: "\u2229",
              cup: "\u222A",
              int: "\u222B",
              there4: "\u2234",
              sim: "\u223C",
              cong: "\u2245",
              asymp: "\u2248",
              ne: "\u2260",
              equiv: "\u2261",
              le: "\u2264",
              ge: "\u2265",
              sub: "\u2282",
              sup: "\u2283",
              nsub: "\u2284",
              sube: "\u2286",
              supe: "\u2287",
              oplus: "\u2295",
              otimes: "\u2297",
              perp: "\u22A5",
              sdot: "\u22C5",
              lceil: "\u2308",
              rceil: "\u2309",
              lfloor: "\u230A",
              rfloor: "\u230B",
              loz: "\u25CA",
              spades: "\u2660",
              clubs: "\u2663",
              hearts: "\u2665",
              diams: "\u2666",
              lang: "\u27E8",
              rang: "\u27E9"
            };
          },
          /* 15 */
          /***/
          function(module2, exports2, __webpack_require__) {
            "use strict";
            Object.defineProperty(exports2, "__esModule", { value: !0 });
            var error_handler_1 = __webpack_require__(10), scanner_1 = __webpack_require__(12), token_1 = __webpack_require__(13), Reader = (function() {
              function Reader2() {
                this.values = [], this.curly = this.paren = -1;
              }
              return Reader2.prototype.beforeFunctionExpression = function(t) {
                return [
                  "(",
                  "{",
                  "[",
                  "in",
                  "typeof",
                  "instanceof",
                  "new",
                  "return",
                  "case",
                  "delete",
                  "throw",
                  "void",
                  // assignment operators
                  "=",
                  "+=",
                  "-=",
                  "*=",
                  "**=",
                  "/=",
                  "%=",
                  "<<=",
                  ">>=",
                  ">>>=",
                  "&=",
                  "|=",
                  "^=",
                  ",",
                  // binary/unary operators
                  "+",
                  "-",
                  "*",
                  "**",
                  "/",
                  "%",
                  "++",
                  "--",
                  "<<",
                  ">>",
                  ">>>",
                  "&",
                  "|",
                  "^",
                  "!",
                  "~",
                  "&&",
                  "||",
                  "?",
                  ":",
                  "===",
                  "==",
                  ">=",
                  "<=",
                  "<",
                  ">",
                  "!=",
                  "!=="
                ].indexOf(t) >= 0;
              }, Reader2.prototype.isRegexStart = function() {
                var previous = this.values[this.values.length - 1], regex = previous !== null;
                switch (previous) {
                  case "this":
                  case "]":
                    regex = !1;
                    break;
                  case ")":
                    var keyword = this.values[this.paren - 1];
                    regex = keyword === "if" || keyword === "while" || keyword === "for" || keyword === "with";
                    break;
                  case "}":
                    if (regex = !1, this.values[this.curly - 3] === "function") {
                      var check = this.values[this.curly - 4];
                      regex = check ? !this.beforeFunctionExpression(check) : !1;
                    } else if (this.values[this.curly - 4] === "function") {
                      var check = this.values[this.curly - 5];
                      regex = check ? !this.beforeFunctionExpression(check) : !0;
                    }
                    break;
                  default:
                    break;
                }
                return regex;
              }, Reader2.prototype.push = function(token) {
                token.type === 7 || token.type === 4 ? (token.value === "{" ? this.curly = this.values.length : token.value === "(" && (this.paren = this.values.length), this.values.push(token.value)) : this.values.push(null);
              }, Reader2;
            })(), Tokenizer = (function() {
              function Tokenizer2(code, config) {
                this.errorHandler = new error_handler_1.ErrorHandler(), this.errorHandler.tolerant = config ? typeof config.tolerant == "boolean" && config.tolerant : !1, this.scanner = new scanner_1.Scanner(code, this.errorHandler), this.scanner.trackComment = config ? typeof config.comment == "boolean" && config.comment : !1, this.trackRange = config ? typeof config.range == "boolean" && config.range : !1, this.trackLoc = config ? typeof config.loc == "boolean" && config.loc : !1, this.buffer = [], this.reader = new Reader();
              }
              return Tokenizer2.prototype.errors = function() {
                return this.errorHandler.errors;
              }, Tokenizer2.prototype.getNextToken = function() {
                if (this.buffer.length === 0) {
                  var comments = this.scanner.scanComments();
                  if (this.scanner.trackComment)
                    for (var i = 0; i < comments.length; ++i) {
                      var e = comments[i], value = this.scanner.source.slice(e.slice[0], e.slice[1]), comment = {
                        type: e.multiLine ? "BlockComment" : "LineComment",
                        value
                      };
                      this.trackRange && (comment.range = e.range), this.trackLoc && (comment.loc = e.loc), this.buffer.push(comment);
                    }
                  if (!this.scanner.eof()) {
                    var loc = void 0;
                    this.trackLoc && (loc = {
                      start: {
                        line: this.scanner.lineNumber,
                        column: this.scanner.index - this.scanner.lineStart
                      },
                      end: {}
                    });
                    var startRegex = this.scanner.source[this.scanner.index] === "/" && this.reader.isRegexStart(), token = startRegex ? this.scanner.scanRegExp() : this.scanner.lex();
                    this.reader.push(token);
                    var entry = {
                      type: token_1.TokenName[token.type],
                      value: this.scanner.source.slice(token.start, token.end)
                    };
                    if (this.trackRange && (entry.range = [token.start, token.end]), this.trackLoc && (loc.end = {
                      line: this.scanner.lineNumber,
                      column: this.scanner.index - this.scanner.lineStart
                    }, entry.loc = loc), token.type === 9) {
                      var pattern = token.pattern, flags = token.flags;
                      entry.regex = { pattern, flags };
                    }
                    this.buffer.push(entry);
                  }
                }
                return this.buffer.shift();
              }, Tokenizer2;
            })();
            exports2.Tokenizer = Tokenizer;
          }
          /******/
        ])
      );
    });
  }
});

// ../node_modules/core-util-is/lib/util.js
var require_util = __commonJS({
  "../node_modules/core-util-is/lib/util.js"(exports) {
    function isArray(arg) {
      return Array.isArray ? Array.isArray(arg) : objectToString(arg) === "[object Array]";
    }
    exports.isArray = isArray;
    function isBoolean(arg) {
      return typeof arg == "boolean";
    }
    exports.isBoolean = isBoolean;
    function isNull(arg) {
      return arg === null;
    }
    exports.isNull = isNull;
    function isNullOrUndefined(arg) {
      return arg == null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;
    function isNumber(arg) {
      return typeof arg == "number";
    }
    exports.isNumber = isNumber;
    function isString(arg) {
      return typeof arg == "string";
    }
    exports.isString = isString;
    function isSymbol(arg) {
      return typeof arg == "symbol";
    }
    exports.isSymbol = isSymbol;
    function isUndefined(arg) {
      return arg === void 0;
    }
    exports.isUndefined = isUndefined;
    function isRegExp(re) {
      return objectToString(re) === "[object RegExp]";
    }
    exports.isRegExp = isRegExp;
    function isObject(arg) {
      return typeof arg == "object" && arg !== null;
    }
    exports.isObject = isObject;
    function isDate(d) {
      return objectToString(d) === "[object Date]";
    }
    exports.isDate = isDate;
    function isError(e) {
      return objectToString(e) === "[object Error]" || e instanceof Error;
    }
    exports.isError = isError;
    function isFunction(arg) {
      return typeof arg == "function";
    }
    exports.isFunction = isFunction;
    function isPrimitive(arg) {
      return arg === null || typeof arg == "boolean" || typeof arg == "number" || typeof arg == "string" || typeof arg == "symbol" || // ES6 symbol
      typeof arg > "u";
    }
    exports.isPrimitive = isPrimitive;
    exports.isBuffer = __require("buffer").Buffer.isBuffer;
    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
  }
});

// ../node_modules/array-timsort/src/index.js
var require_src = __commonJS({
  "../node_modules/array-timsort/src/index.js"(exports, module) {
    var POWERS_OF_TEN = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9], results, log10 = (x) => x < 1e5 ? x < 100 ? x < 10 ? 0 : 1 : x < 1e4 ? x < 1e3 ? 2 : 3 : 4 : x < 1e7 ? x < 1e6 ? 5 : 6 : x < 1e9 ? x < 1e8 ? 7 : 8 : 9;
    function alphabeticalCompare(a, b) {
      if (a === b)
        return 0;
      if (~~a === a && ~~b === b) {
        if (a === 0 || b === 0)
          return a < b ? -1 : 1;
        if (a < 0 || b < 0) {
          if (b >= 0)
            return -1;
          if (a >= 0)
            return 1;
          a = -a, b = -b;
        }
        let al = log10(a), bl = log10(b), t = 0;
        return al < bl ? (a *= POWERS_OF_TEN[bl - al - 1], b /= 10, t = -1) : al > bl && (b *= POWERS_OF_TEN[al - bl - 1], a /= 10, t = 1), a === b ? t : a < b ? -1 : 1;
      }
      let aStr = String(a), bStr = String(b);
      return aStr === bStr ? 0 : aStr < bStr ? -1 : 1;
    }
    function minRunLength(n) {
      let r = 0;
      for (; n >= 32; )
        r |= n & 1, n >>= 1;
      return n + r;
    }
    function makeAscendingRun(array, lo, hi, compare) {
      let runHi = lo + 1;
      if (runHi === hi)
        return 1;
      if (compare(array[runHi++], array[lo]) < 0) {
        for (; runHi < hi && compare(array[runHi], array[runHi - 1]) < 0; )
          runHi++;
        reverseRun(array, lo, runHi), reverseRun(results, lo, runHi);
      } else
        for (; runHi < hi && compare(array[runHi], array[runHi - 1]) >= 0; )
          runHi++;
      return runHi - lo;
    }
    function reverseRun(array, lo, hi) {
      for (hi--; lo < hi; ) {
        let t = array[lo];
        array[lo++] = array[hi], array[hi--] = t;
      }
    }
    function binaryInsertionSort(array, lo, hi, start, compare) {
      for (start === lo && start++; start < hi; start++) {
        let pivot = array[start], pivotIndex = results[start], left = lo, right = start;
        for (; left < right; ) {
          let mid = left + right >>> 1;
          compare(pivot, array[mid]) < 0 ? right = mid : left = mid + 1;
        }
        let n = start - left;
        switch (n) {
          case 3:
            array[left + 3] = array[left + 2], results[left + 3] = results[left + 2];
          /* falls through */
          case 2:
            array[left + 2] = array[left + 1], results[left + 2] = results[left + 1];
          /* falls through */
          case 1:
            array[left + 1] = array[left], results[left + 1] = results[left];
            break;
          default:
            for (; n > 0; )
              array[left + n] = array[left + n - 1], results[left + n] = results[left + n - 1], n--;
        }
        array[left] = pivot, results[left] = pivotIndex;
      }
    }
    function gallopLeft(value, array, start, length, hint, compare) {
      let lastOffset = 0, maxOffset = 0, offset = 1;
      if (compare(value, array[start + hint]) > 0) {
        for (maxOffset = length - hint; offset < maxOffset && compare(value, array[start + hint + offset]) > 0; )
          lastOffset = offset, offset = (offset << 1) + 1, offset <= 0 && (offset = maxOffset);
        offset > maxOffset && (offset = maxOffset), lastOffset += hint, offset += hint;
      } else {
        for (maxOffset = hint + 1; offset < maxOffset && compare(value, array[start + hint - offset]) <= 0; )
          lastOffset = offset, offset = (offset << 1) + 1, offset <= 0 && (offset = maxOffset);
        offset > maxOffset && (offset = maxOffset);
        let tmp = lastOffset;
        lastOffset = hint - offset, offset = hint - tmp;
      }
      for (lastOffset++; lastOffset < offset; ) {
        let m = lastOffset + (offset - lastOffset >>> 1);
        compare(value, array[start + m]) > 0 ? lastOffset = m + 1 : offset = m;
      }
      return offset;
    }
    function gallopRight(value, array, start, length, hint, compare) {
      let lastOffset = 0, maxOffset = 0, offset = 1;
      if (compare(value, array[start + hint]) < 0) {
        for (maxOffset = hint + 1; offset < maxOffset && compare(value, array[start + hint - offset]) < 0; )
          lastOffset = offset, offset = (offset << 1) + 1, offset <= 0 && (offset = maxOffset);
        offset > maxOffset && (offset = maxOffset);
        let tmp = lastOffset;
        lastOffset = hint - offset, offset = hint - tmp;
      } else {
        for (maxOffset = length - hint; offset < maxOffset && compare(value, array[start + hint + offset]) >= 0; )
          lastOffset = offset, offset = (offset << 1) + 1, offset <= 0 && (offset = maxOffset);
        offset > maxOffset && (offset = maxOffset), lastOffset += hint, offset += hint;
      }
      for (lastOffset++; lastOffset < offset; ) {
        let m = lastOffset + (offset - lastOffset >>> 1);
        compare(value, array[start + m]) < 0 ? offset = m : lastOffset = m + 1;
      }
      return offset;
    }
    var TimSort = class {
      constructor(array, compare) {
        this.array = array, this.compare = compare;
        let { length } = array;
        this.length = length, this.minGallop = 7, this.tmpStorageLength = length < 2 * 256 ? length >>> 1 : 256, this.tmp = new Array(this.tmpStorageLength), this.tmpIndex = new Array(this.tmpStorageLength), this.stackLength = length < 120 ? 5 : length < 1542 ? 10 : length < 119151 ? 19 : 40, this.runStart = new Array(this.stackLength), this.runLength = new Array(this.stackLength), this.stackSize = 0;
      }
      /**
       * Push a new run on TimSort's stack.
       *
       * @param {number} runStart - Start index of the run in the original array.
       * @param {number} runLength - Length of the run;
       */
      pushRun(runStart, runLength) {
        this.runStart[this.stackSize] = runStart, this.runLength[this.stackSize] = runLength, this.stackSize += 1;
      }
      /**
       * Merge runs on TimSort's stack so that the following holds for all i:
       * 1) runLength[i - 3] > runLength[i - 2] + runLength[i - 1]
       * 2) runLength[i - 2] > runLength[i - 1]
       */
      mergeRuns() {
        for (; this.stackSize > 1; ) {
          let n = this.stackSize - 2;
          if (n >= 1 && this.runLength[n - 1] <= this.runLength[n] + this.runLength[n + 1] || n >= 2 && this.runLength[n - 2] <= this.runLength[n] + this.runLength[n - 1])
            this.runLength[n - 1] < this.runLength[n + 1] && n--;
          else if (this.runLength[n] > this.runLength[n + 1])
            break;
          this.mergeAt(n);
        }
      }
      /**
       * Merge all runs on TimSort's stack until only one remains.
       */
      forceMergeRuns() {
        for (; this.stackSize > 1; ) {
          let n = this.stackSize - 2;
          n > 0 && this.runLength[n - 1] < this.runLength[n + 1] && n--, this.mergeAt(n);
        }
      }
      /**
       * Merge the runs on the stack at positions i and i+1. Must be always be called
       * with i=stackSize-2 or i=stackSize-3 (that is, we merge on top of the stack).
       *
       * @param {number} i - Index of the run to merge in TimSort's stack.
       */
      mergeAt(i) {
        let { compare } = this, { array } = this, start1 = this.runStart[i], length1 = this.runLength[i], start2 = this.runStart[i + 1], length2 = this.runLength[i + 1];
        this.runLength[i] = length1 + length2, i === this.stackSize - 3 && (this.runStart[i + 1] = this.runStart[i + 2], this.runLength[i + 1] = this.runLength[i + 2]), this.stackSize--;
        let k = gallopRight(array[start2], array, start1, length1, 0, compare);
        start1 += k, length1 -= k, length1 !== 0 && (length2 = gallopLeft(
          array[start1 + length1 - 1],
          array,
          start2,
          length2,
          length2 - 1,
          compare
        ), length2 !== 0 && (length1 <= length2 ? this.mergeLow(start1, length1, start2, length2) : this.mergeHigh(start1, length1, start2, length2)));
      }
      /**
       * Merge two adjacent runs in a stable way. The runs must be such that the
       * first element of run1 is bigger than the first element in run2 and the
       * last element of run1 is greater than all the elements in run2.
       * The method should be called when run1.length <= run2.length as it uses
       * TimSort temporary array to store run1. Use mergeHigh if run1.length >
       * run2.length.
       *
       * @param {number} start1 - First element in run1.
       * @param {number} length1 - Length of run1.
       * @param {number} start2 - First element in run2.
       * @param {number} length2 - Length of run2.
       */
      mergeLow(start1, length1, start2, length2) {
        let { compare } = this, { array } = this, { tmp } = this, { tmpIndex } = this, i = 0;
        for (i = 0; i < length1; i++)
          tmp[i] = array[start1 + i], tmpIndex[i] = results[start1 + i];
        let cursor1 = 0, cursor2 = start2, dest = start1;
        if (array[dest] = array[cursor2], results[dest] = results[cursor2], dest++, cursor2++, --length2 === 0) {
          for (i = 0; i < length1; i++)
            array[dest + i] = tmp[cursor1 + i], results[dest + i] = tmpIndex[cursor1 + i];
          return;
        }
        if (length1 === 1) {
          for (i = 0; i < length2; i++)
            array[dest + i] = array[cursor2 + i], results[dest + i] = results[cursor2 + i];
          array[dest + length2] = tmp[cursor1], results[dest + length2] = tmpIndex[cursor1];
          return;
        }
        let { minGallop } = this;
        for (; ; ) {
          let count1 = 0, count2 = 0, exit = !1;
          do
            if (compare(array[cursor2], tmp[cursor1]) < 0) {
              if (array[dest] = array[cursor2], results[dest] = results[cursor2], dest++, cursor2++, count2++, count1 = 0, --length2 === 0) {
                exit = !0;
                break;
              }
            } else if (array[dest] = tmp[cursor1], results[dest] = tmpIndex[cursor1], dest++, cursor1++, count1++, count2 = 0, --length1 === 1) {
              exit = !0;
              break;
            }
          while ((count1 | count2) < minGallop);
          if (exit)
            break;
          do {
            if (count1 = gallopRight(array[cursor2], tmp, cursor1, length1, 0, compare), count1 !== 0) {
              for (i = 0; i < count1; i++)
                array[dest + i] = tmp[cursor1 + i], results[dest + i] = tmpIndex[cursor1 + i];
              if (dest += count1, cursor1 += count1, length1 -= count1, length1 <= 1) {
                exit = !0;
                break;
              }
            }
            if (array[dest] = array[cursor2], results[dest] = results[cursor2], dest++, cursor2++, --length2 === 0) {
              exit = !0;
              break;
            }
            if (count2 = gallopLeft(tmp[cursor1], array, cursor2, length2, 0, compare), count2 !== 0) {
              for (i = 0; i < count2; i++)
                array[dest + i] = array[cursor2 + i], results[dest + i] = results[cursor2 + i];
              if (dest += count2, cursor2 += count2, length2 -= count2, length2 === 0) {
                exit = !0;
                break;
              }
            }
            if (array[dest] = tmp[cursor1], results[dest] = tmpIndex[cursor1], dest++, cursor1++, --length1 === 1) {
              exit = !0;
              break;
            }
            minGallop--;
          } while (count1 >= 7 || count2 >= 7);
          if (exit)
            break;
          minGallop < 0 && (minGallop = 0), minGallop += 2;
        }
        if (this.minGallop = minGallop, minGallop < 1 && (this.minGallop = 1), length1 === 1) {
          for (i = 0; i < length2; i++)
            array[dest + i] = array[cursor2 + i], results[dest + i] = results[cursor2 + i];
          array[dest + length2] = tmp[cursor1], results[dest + length2] = tmpIndex[cursor1];
        } else {
          if (length1 === 0)
            throw new Error("mergeLow preconditions were not respected");
          for (i = 0; i < length1; i++)
            array[dest + i] = tmp[cursor1 + i], results[dest + i] = tmpIndex[cursor1 + i];
        }
      }
      /**
       * Merge two adjacent runs in a stable way. The runs must be such that the
       * first element of run1 is bigger than the first element in run2 and the
       * last element of run1 is greater than all the elements in run2.
       * The method should be called when run1.length > run2.length as it uses
       * TimSort temporary array to store run2. Use mergeLow if run1.length <=
       * run2.length.
       *
       * @param {number} start1 - First element in run1.
       * @param {number} length1 - Length of run1.
       * @param {number} start2 - First element in run2.
       * @param {number} length2 - Length of run2.
       */
      mergeHigh(start1, length1, start2, length2) {
        let { compare } = this, { array } = this, { tmp } = this, { tmpIndex } = this, i = 0;
        for (i = 0; i < length2; i++)
          tmp[i] = array[start2 + i], tmpIndex[i] = results[start2 + i];
        let cursor1 = start1 + length1 - 1, cursor2 = length2 - 1, dest = start2 + length2 - 1, customCursor = 0, customDest = 0;
        if (array[dest] = array[cursor1], results[dest] = results[cursor1], dest--, cursor1--, --length1 === 0) {
          for (customCursor = dest - (length2 - 1), i = 0; i < length2; i++)
            array[customCursor + i] = tmp[i], results[customCursor + i] = tmpIndex[i];
          return;
        }
        if (length2 === 1) {
          for (dest -= length1, cursor1 -= length1, customDest = dest + 1, customCursor = cursor1 + 1, i = length1 - 1; i >= 0; i--)
            array[customDest + i] = array[customCursor + i], results[customDest + i] = results[customCursor + i];
          array[dest] = tmp[cursor2], results[dest] = tmpIndex[cursor2];
          return;
        }
        let { minGallop } = this;
        for (; ; ) {
          let count1 = 0, count2 = 0, exit = !1;
          do
            if (compare(tmp[cursor2], array[cursor1]) < 0) {
              if (array[dest] = array[cursor1], results[dest] = results[cursor1], dest--, cursor1--, count1++, count2 = 0, --length1 === 0) {
                exit = !0;
                break;
              }
            } else if (array[dest] = tmp[cursor2], results[dest] = tmpIndex[cursor2], dest--, cursor2--, count2++, count1 = 0, --length2 === 1) {
              exit = !0;
              break;
            }
          while ((count1 | count2) < minGallop);
          if (exit)
            break;
          do {
            if (count1 = length1 - gallopRight(
              tmp[cursor2],
              array,
              start1,
              length1,
              length1 - 1,
              compare
            ), count1 !== 0) {
              for (dest -= count1, cursor1 -= count1, length1 -= count1, customDest = dest + 1, customCursor = cursor1 + 1, i = count1 - 1; i >= 0; i--)
                array[customDest + i] = array[customCursor + i], results[customDest + i] = results[customCursor + i];
              if (length1 === 0) {
                exit = !0;
                break;
              }
            }
            if (array[dest] = tmp[cursor2], results[dest] = tmpIndex[cursor2], dest--, cursor2--, --length2 === 1) {
              exit = !0;
              break;
            }
            if (count2 = length2 - gallopLeft(
              array[cursor1],
              tmp,
              0,
              length2,
              length2 - 1,
              compare
            ), count2 !== 0) {
              for (dest -= count2, cursor2 -= count2, length2 -= count2, customDest = dest + 1, customCursor = cursor2 + 1, i = 0; i < count2; i++)
                array[customDest + i] = tmp[customCursor + i], results[customDest + i] = tmpIndex[customCursor + i];
              if (length2 <= 1) {
                exit = !0;
                break;
              }
            }
            if (array[dest] = array[cursor1], results[dest] = results[cursor1], dest--, cursor1--, --length1 === 0) {
              exit = !0;
              break;
            }
            minGallop--;
          } while (count1 >= 7 || count2 >= 7);
          if (exit)
            break;
          minGallop < 0 && (minGallop = 0), minGallop += 2;
        }
        if (this.minGallop = minGallop, minGallop < 1 && (this.minGallop = 1), length2 === 1) {
          for (dest -= length1, cursor1 -= length1, customDest = dest + 1, customCursor = cursor1 + 1, i = length1 - 1; i >= 0; i--)
            array[customDest + i] = array[customCursor + i], results[customDest + i] = results[customCursor + i];
          array[dest] = tmp[cursor2], results[dest] = tmpIndex[cursor2];
        } else {
          if (length2 === 0)
            throw new Error("mergeHigh preconditions were not respected");
          for (customCursor = dest - (length2 - 1), i = 0; i < length2; i++)
            array[customCursor + i] = tmp[i], results[customCursor + i] = tmpIndex[i];
        }
      }
    };
    function sort(array, compare, lo, hi) {
      if (!Array.isArray(array))
        throw new TypeError(
          `The "array" argument must be an array. Received ${array}`
        );
      results = [];
      let { length } = array, i = 0;
      for (; i < length; )
        results[i] = i++;
      compare ? typeof compare != "function" && (hi = lo, lo = compare, compare = alphabeticalCompare) : compare = alphabeticalCompare, lo || (lo = 0), hi || (hi = length);
      let remaining = hi - lo;
      if (remaining < 2)
        return results;
      let runLength = 0;
      if (remaining < 32)
        return runLength = makeAscendingRun(array, lo, hi, compare), binaryInsertionSort(array, lo, hi, lo + runLength, compare), results;
      let ts = new TimSort(array, compare), minRun = minRunLength(remaining);
      do {
        if (runLength = makeAscendingRun(array, lo, hi, compare), runLength < minRun) {
          let force = remaining;
          force > minRun && (force = minRun), binaryInsertionSort(array, lo, lo + force, lo + runLength, compare), runLength = force;
        }
        ts.pushRun(lo, runLength), ts.mergeRuns(), remaining -= runLength, lo += runLength;
      } while (remaining !== 0);
      return ts.forceMergeRuns(), results;
    }
    module.exports = {
      sort
    };
  }
});

// ../node_modules/comment-json/src/common.js
var require_common = __commonJS({
  "../node_modules/comment-json/src/common.js"(exports, module) {
    var {
      isObject,
      isArray,
      isString,
      isNumber,
      isFunction
    } = require_util(), PREFIX_BEFORE = "before", PREFIX_AFTER_PROP = "after-prop", PREFIX_AFTER_COLON = "after-colon", PREFIX_AFTER_VALUE = "after-value", PREFIX_AFTER = "after", PREFIX_BEFORE_ALL = "before-all", PREFIX_AFTER_ALL = "after-all", BRACKET_OPEN = "[", BRACKET_CLOSE = "]", CURLY_BRACKET_OPEN = "{", CURLY_BRACKET_CLOSE = "}", COMMA = ",", EMPTY = "", MINUS = "-", SYMBOL_PREFIXES = [
      PREFIX_BEFORE,
      PREFIX_AFTER_PROP,
      PREFIX_AFTER_COLON,
      PREFIX_AFTER_VALUE,
      PREFIX_AFTER
    ], NON_PROP_SYMBOL_KEYS = [
      PREFIX_BEFORE,
      PREFIX_BEFORE_ALL,
      PREFIX_AFTER_ALL
    ].map(Symbol.for), COLON = ":", UNDEFINED = void 0, symbol = (prefix, key) => Symbol.for(prefix + COLON + key), define2 = (target, key, value) => Object.defineProperty(target, key, {
      value,
      writable: !0,
      configurable: !0
    }), copy_comments_by_kind = (target, source, target_key, source_key, prefix, remove_source) => {
      let source_prop = symbol(prefix, source_key);
      if (!Object.hasOwn(source, source_prop))
        return;
      let target_prop = target_key === source_key ? source_prop : symbol(prefix, target_key);
      define2(target, target_prop, source[source_prop]), remove_source && delete source[source_prop];
    }, copy_comments = (target, source, target_key, source_key, remove_source) => {
      SYMBOL_PREFIXES.forEach((prefix) => {
        copy_comments_by_kind(
          target,
          source,
          target_key,
          source_key,
          prefix,
          remove_source
        );
      });
    }, swap_comments = (array, from, to) => {
      from !== to && SYMBOL_PREFIXES.forEach((prefix) => {
        let target_prop = symbol(prefix, to);
        if (!Object.hasOwn(array, target_prop)) {
          copy_comments_by_kind(array, array, to, from, prefix, !0);
          return;
        }
        let comments = array[target_prop];
        delete array[target_prop], copy_comments_by_kind(array, array, to, from, prefix, !0), define2(array, symbol(prefix, from), comments);
      });
    }, assign_non_prop_comments = (target, source) => {
      NON_PROP_SYMBOL_KEYS.forEach((key) => {
        let comments = source[key];
        comments && define2(target, key, comments);
      });
    }, assign = (target, source, keys) => (keys.forEach((key) => {
      !isString(key) && !isNumber(key) || Object.hasOwn(source, key) && (target[key] = source[key], copy_comments(target, source, key, key));
    }), target), is_raw_json = isFunction(JSON.isRawJSON) ? JSON.isRawJSON : () => !1;
    module.exports = {
      SYMBOL_PREFIXES,
      PREFIX_BEFORE,
      PREFIX_AFTER_PROP,
      PREFIX_AFTER_COLON,
      PREFIX_AFTER_VALUE,
      PREFIX_AFTER,
      PREFIX_BEFORE_ALL,
      PREFIX_AFTER_ALL,
      BRACKET_OPEN,
      BRACKET_CLOSE,
      CURLY_BRACKET_OPEN,
      CURLY_BRACKET_CLOSE,
      COLON,
      COMMA,
      MINUS,
      EMPTY,
      UNDEFINED,
      symbol,
      define: define2,
      copy_comments,
      swap_comments,
      assign_non_prop_comments,
      is_raw_json,
      assign(target, source, keys) {
        if (!isObject(target))
          throw new TypeError("Cannot convert undefined or null to object");
        if (!isObject(source))
          return target;
        if (keys === UNDEFINED)
          keys = Object.keys(source), assign_non_prop_comments(target, source);
        else if (isArray(keys))
          keys.length === 0 && assign_non_prop_comments(target, source);
        else throw new TypeError("keys must be array or undefined");
        return assign(target, source, keys);
      }
    };
  }
});

// ../node_modules/comment-json/src/array.js
var require_array = __commonJS({
  "../node_modules/comment-json/src/array.js"(exports, module) {
    var { isArray } = require_util(), { sort } = require_src(), {
      SYMBOL_PREFIXES,
      UNDEFINED,
      symbol,
      copy_comments,
      swap_comments
    } = require_common(), reverse_comments = (array) => {
      let { length } = array, i = 0, max = length / 2;
      for (; i < max; i++)
        swap_comments(array, i, length - i - 1);
    }, move_comment = (target, source, i, offset, remove) => {
      copy_comments(target, source, i + offset, i, remove);
    }, move_comments = (target, source, start, count, offset, remove) => {
      if (offset > 0) {
        let i2 = count;
        for (; i2-- > 0; )
          move_comment(target, source, start + i2, offset, remove);
        return;
      }
      let i = 0;
      for (; i < count; ) {
        let ii = i++;
        move_comment(target, source, start + ii, offset, remove);
      }
    }, remove_comments = (array, key) => {
      SYMBOL_PREFIXES.forEach((prefix) => {
        let prop = symbol(prefix, key);
        delete array[prop];
      });
    }, get_mapped = (map, key) => {
      let mapped = key;
      for (; mapped in map; )
        mapped = map[mapped];
      return mapped;
    }, CommentArray = class _CommentArray extends Array {
      // - deleteCount + items.length
      // We should avoid `splice(begin, deleteCount, ...items)`,
      // because `splice(0, undefined)` is not equivalent to `splice(0)`,
      // as well as:
      // - slice
      splice(...args) {
        let { length } = this, ret = super.splice(...args), [begin, deleteCount, ...items] = args;
        begin < 0 && (begin += length), arguments.length === 1 ? deleteCount = length - begin : deleteCount = Math.min(length - begin, deleteCount);
        let {
          length: item_length
        } = items, offset = item_length - deleteCount, start = begin + deleteCount, count = length - start;
        return move_comments(this, this, start, count, offset, !0), ret;
      }
      slice(...args) {
        let { length } = this, array = super.slice(...args);
        if (!array.length)
          return new _CommentArray();
        let [begin, before] = args;
        return before === UNDEFINED ? before = length : before < 0 && (before += length), begin < 0 ? begin += length : begin === UNDEFINED && (begin = 0), move_comments(array, this, begin, before - begin, -begin), array;
      }
      unshift(...items) {
        let { length } = this, ret = super.unshift(...items), {
          length: items_length
        } = items;
        return items_length > 0 && move_comments(this, this, 0, length, items_length, !0), ret;
      }
      shift() {
        let ret = super.shift(), { length } = this;
        return remove_comments(this, 0), move_comments(this, this, 1, length, -1, !0), ret;
      }
      reverse() {
        return super.reverse(), reverse_comments(this), this;
      }
      pop() {
        let ret = super.pop();
        return remove_comments(this, this.length), ret;
      }
      concat(...items) {
        let { length } = this, ret = super.concat(...items);
        return items.length && (move_comments(ret, this, 0, this.length, 0), items.forEach((item) => {
          let prev = length;
          length += isArray(item) ? item.length : 1, item instanceof _CommentArray && move_comments(ret, item, 0, item.length, prev);
        })), ret;
      }
      sort(...args) {
        let result = sort(
          this,
          ...args.slice(0, 1)
        ), map = /* @__PURE__ */ Object.create(null);
        return result.forEach((source_index, index) => {
          if (source_index === index)
            return;
          let real_source_index = get_mapped(map, source_index);
          real_source_index !== index && (map[index] = real_source_index, swap_comments(this, index, real_source_index));
        }), this;
      }
    };
    module.exports = {
      CommentArray
    };
  }
});

// ../node_modules/comment-json/src/parse.js
var require_parse = __commonJS({
  "../node_modules/comment-json/src/parse.js"(exports, module) {
    var esprima = require_esprima(), {
      CommentArray
    } = require_array(), {
      PREFIX_BEFORE,
      PREFIX_AFTER_PROP,
      PREFIX_AFTER_COLON,
      PREFIX_AFTER_VALUE,
      PREFIX_AFTER,
      PREFIX_BEFORE_ALL,
      PREFIX_AFTER_ALL,
      BRACKET_OPEN,
      BRACKET_CLOSE,
      CURLY_BRACKET_OPEN,
      CURLY_BRACKET_CLOSE,
      COLON,
      COMMA,
      MINUS,
      EMPTY,
      UNDEFINED,
      define: define2,
      assign_non_prop_comments
    } = require_common(), tokenize = (code) => esprima.tokenize(code, {
      comment: !0,
      loc: !0
    }), current_code, previous_hosts = [], comments_host = null, unassigned_comments = null, previous_props = [], last_prop, remove_comments = !1, inline = !1, tokens = null, last = null, current = null, index, reviver = null, clean = () => {
      current_code = UNDEFINED, previous_props.length = previous_hosts.length = 0, last = null, last_prop = UNDEFINED;
    }, free = () => {
      clean(), tokens.length = 0, unassigned_comments = comments_host = tokens = last = current = reviver = null, current_code = UNDEFINED;
    }, symbolFor = (prefix) => Symbol.for(
      last_prop !== UNDEFINED ? prefix + COLON + last_prop : prefix
    ), transform = (k, { value, context = {} }) => reviver ? reviver(k, value, context) : value, unexpected = () => {
      let error = new SyntaxError(`Unexpected token '${current.value.slice(0, 1)}', "${current_code}" is not valid JSON`);
      throw Object.assign(error, current.loc.start), free(), error;
    }, unexpected_end = () => {
      let error = new SyntaxError("Unexpected end of JSON input");
      throw Object.assign(error, last ? last.loc.end : {
        line: 1,
        column: 0
      }), free(), error;
    }, next = () => {
      let new_token = tokens[++index];
      inline = current && new_token && current.loc.end.line === new_token.loc.start.line || !1, last = current, current = new_token;
    }, type = () => (current || unexpected_end(), current.type === "Punctuator" ? current.value : current.type), is = (t) => type() === t, expect = (a) => {
      is(a) || unexpected();
    }, set_comments_host = (new_host) => {
      previous_hosts.push(comments_host), comments_host = new_host;
    }, restore_comments_host = () => {
      comments_host = previous_hosts.pop();
    }, assign_after_comments = () => {
      if (!unassigned_comments)
        return;
      let after_comments = [];
      for (let comment of unassigned_comments)
        if (comment.inline)
          after_comments.push(comment);
        else
          break;
      let { length } = after_comments;
      length && (length === unassigned_comments.length ? unassigned_comments = null : unassigned_comments.splice(0, length), define2(comments_host, symbolFor(PREFIX_AFTER), after_comments));
    }, assign_comments = (prefix) => {
      unassigned_comments && (define2(comments_host, symbolFor(prefix), unassigned_comments), unassigned_comments = null);
    }, parse_comments = (prefix) => {
      let comments = [];
      for (; current && (is("LineComment") || is("BlockComment")); ) {
        let comment = {
          ...current,
          inline
        };
        comments.push(comment), next();
      }
      if (!remove_comments && comments.length) {
        if (prefix) {
          define2(comments_host, symbolFor(prefix), comments);
          return;
        }
        unassigned_comments = comments;
      }
    }, set_prop = (prop, push) => {
      push && previous_props.push(last_prop), last_prop = prop;
    }, restore_prop = () => {
      last_prop = previous_props.pop();
    }, parse_object = () => {
      let obj = {};
      set_comments_host(obj), set_prop(UNDEFINED, !0);
      let started = !1, name;
      for (parse_comments(); !is(CURLY_BRACKET_CLOSE) && !(started && (assign_comments(PREFIX_AFTER_VALUE), expect(COMMA), next(), parse_comments(), assign_after_comments(), is(CURLY_BRACKET_CLOSE))); )
        started = !0, expect("String"), name = JSON.parse(current.value), set_prop(name), assign_comments(PREFIX_BEFORE), next(), parse_comments(PREFIX_AFTER_PROP), expect(COLON), next(), parse_comments(PREFIX_AFTER_COLON), obj[name] = transform(name, walk()), parse_comments();
      return started && assign_comments(PREFIX_AFTER), next(), last_prop = void 0, started || assign_comments(PREFIX_BEFORE), restore_comments_host(), restore_prop(), obj;
    }, parse_array = () => {
      let array = new CommentArray();
      set_comments_host(array), set_prop(UNDEFINED, !0);
      let started = !1, i = 0;
      for (parse_comments(); !is(BRACKET_CLOSE) && !(started && (assign_comments(PREFIX_AFTER_VALUE), expect(COMMA), next(), parse_comments(), assign_after_comments(), is(BRACKET_CLOSE))); )
        started = !0, set_prop(i), assign_comments(PREFIX_BEFORE), array[i] = transform(i, walk()), i++, parse_comments();
      return started && assign_comments(PREFIX_AFTER), next(), last_prop = void 0, started || assign_comments(PREFIX_BEFORE), restore_comments_host(), restore_prop(), array;
    };
    function walk() {
      let tt = type();
      if (tt === CURLY_BRACKET_OPEN)
        return next(), {
          value: parse_object()
        };
      if (tt === BRACKET_OPEN)
        return next(), {
          value: parse_array()
        };
      let negative = EMPTY;
      tt === MINUS && (next(), tt = type(), negative = MINUS);
      let v, source;
      switch (tt) {
        case "String":
        case "Boolean":
        case "Null":
        case "Numeric":
          return v = current.value, next(), source = negative + v, {
            value: JSON.parse(source),
            context: {
              source
            }
          };
        default:
          return {};
      }
    }
    var isObject = (subject) => Object(subject) === subject, parse = (code, rev, no_comments) => {
      clean(), current_code = code, tokens = tokenize(code), reviver = rev, remove_comments = no_comments, tokens.length || unexpected_end(), index = -1, next(), set_comments_host({}), parse_comments(PREFIX_BEFORE_ALL);
      let final = walk();
      parse_comments(PREFIX_AFTER_ALL), current && unexpected();
      let result = transform("", final);
      return !no_comments && result !== null && (isObject(result) || (result = new Object(result)), assign_non_prop_comments(result, comments_host)), restore_comments_host(), free(), result;
    };
    module.exports = {
      parse,
      tokenize
    };
  }
});

// ../node_modules/comment-json/src/stringify.js
var require_stringify = __commonJS({
  "../node_modules/comment-json/src/stringify.js"(exports, module) {
    var {
      isArray,
      isObject,
      isFunction,
      isNumber,
      isString
    } = require_util(), {
      PREFIX_BEFORE_ALL,
      PREFIX_BEFORE,
      PREFIX_AFTER_PROP,
      PREFIX_AFTER_COLON,
      PREFIX_AFTER_VALUE,
      PREFIX_AFTER,
      PREFIX_AFTER_ALL,
      BRACKET_OPEN,
      BRACKET_CLOSE,
      CURLY_BRACKET_OPEN,
      CURLY_BRACKET_CLOSE,
      COLON,
      COMMA,
      EMPTY,
      UNDEFINED,
      is_raw_json
    } = require_common(), ESCAPABLE = /[\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g, SPACE = " ", LF = `
`, STR_NULL = "null", BEFORE = (prop) => `${PREFIX_BEFORE}:${prop}`, AFTER_PROP = (prop) => `${PREFIX_AFTER_PROP}:${prop}`, AFTER_COLON = (prop) => `${PREFIX_AFTER_COLON}:${prop}`, AFTER_VALUE = (prop) => `${PREFIX_AFTER_VALUE}:${prop}`, AFTER = (prop) => `${PREFIX_AFTER}:${prop}`, meta = {
      "\b": "\\b",
      "	": "\\t",
      "\n": "\\n",
      "\f": "\\f",
      "\r": "\\r",
      '"': '\\"',
      "\\": "\\\\"
    }, escape = (string) => (ESCAPABLE.lastIndex = 0, ESCAPABLE.test(string) ? string.replace(ESCAPABLE, (a) => {
      let c = meta[a];
      return typeof c == "string" ? c : a;
    }) : string), quote = (string) => `"${escape(string)}"`, comment_stringify = (value, line) => line ? `//${value}` : `/*${value}*/`, process_comments = (host, symbol_tag, deeper_gap, display_block) => {
      let comments = host[Symbol.for(symbol_tag)];
      if (!comments || !comments.length)
        return EMPTY;
      let is_line_comment = !1, str = comments.reduce((prev, {
        inline,
        type,
        value
      }) => {
        let delimiter = inline ? SPACE : LF + deeper_gap;
        return is_line_comment = type === "LineComment", prev + delimiter + comment_stringify(value, is_line_comment);
      }, EMPTY);
      return display_block || is_line_comment ? str + LF + deeper_gap : str;
    }, replacer = null, indent = EMPTY, clean = () => {
      replacer = null, indent = EMPTY;
    }, join5 = (one, two, gap) => one ? two ? one + two.trim() + LF + gap : one.trimRight() + LF + gap : two ? two.trimRight() + LF + gap : EMPTY, join_content = (inside, value, gap) => {
      let comment = process_comments(value, PREFIX_BEFORE, gap + indent, !0);
      return join5(comment, inside, gap);
    }, array_stringify = (value, gap) => {
      let deeper_gap = gap + indent, { length } = value, inside = EMPTY, after_comma = EMPTY;
      for (let i = 0; i < length; i++) {
        i !== 0 && (inside += COMMA);
        let before = join5(
          after_comma,
          process_comments(value, BEFORE(i), deeper_gap),
          deeper_gap
        );
        inside += before || LF + deeper_gap, inside += stringify(i, value, deeper_gap) || STR_NULL, inside += process_comments(value, AFTER_VALUE(i), deeper_gap), after_comma = process_comments(value, AFTER(i), deeper_gap);
      }
      return inside += join5(
        after_comma,
        process_comments(value, PREFIX_AFTER, deeper_gap),
        deeper_gap
      ), BRACKET_OPEN + join_content(inside, value, gap) + BRACKET_CLOSE;
    }, object_stringify = (value, gap) => {
      if (!value)
        return "null";
      let deeper_gap = gap + indent, inside = EMPTY, after_comma = EMPTY, first = !0, keys = isArray(replacer) ? replacer : Object.keys(value), iteratee = (key) => {
        let sv = stringify(key, value, deeper_gap);
        if (sv === UNDEFINED)
          return;
        first || (inside += COMMA), first = !1;
        let before = join5(
          after_comma,
          process_comments(value, BEFORE(key), deeper_gap),
          deeper_gap
        );
        inside += before || LF + deeper_gap, inside += quote(key) + process_comments(value, AFTER_PROP(key), deeper_gap) + COLON + process_comments(value, AFTER_COLON(key), deeper_gap) + SPACE + sv + process_comments(value, AFTER_VALUE(key), deeper_gap), after_comma = process_comments(value, AFTER(key), deeper_gap);
      };
      return keys.forEach(iteratee), inside += join5(
        after_comma,
        process_comments(value, PREFIX_AFTER, deeper_gap),
        deeper_gap
      ), CURLY_BRACKET_OPEN + join_content(inside, value, gap) + CURLY_BRACKET_CLOSE;
    };
    function stringify(key, holder, gap) {
      let value = holder[key];
      switch (isObject(value) && isFunction(value.toJSON) && (value = value.toJSON(key)), isFunction(replacer) && (value = replacer.call(holder, key, value)), typeof value) {
        case "string":
          return quote(value);
        case "number":
          return Number.isFinite(value) ? String(value) : STR_NULL;
        case "boolean":
        case "null":
          return String(value);
        // If the type is 'object', we might be dealing with an object or an array or
        // null.
        case "object":
          return is_raw_json(value) ? value.rawJSON : isArray(value) ? array_stringify(value, gap) : object_stringify(value, gap);
        // undefined
        default:
      }
    }
    var get_indent = (space) => isString(space) ? space : isNumber(space) ? SPACE.repeat(space) : EMPTY, { toString } = Object.prototype, PRIMITIVE_OBJECT_TYPES = [
      "[object Number]",
      "[object String]",
      "[object Boolean]"
    ], is_primitive_object = (subject) => {
      if (typeof subject != "object")
        return !1;
      let str = toString.call(subject);
      return PRIMITIVE_OBJECT_TYPES.includes(str);
    };
    module.exports = (value, replacer_, space) => {
      let indent_ = get_indent(space);
      if (!indent_)
        return JSON.stringify(value, replacer_);
      !isFunction(replacer_) && !isArray(replacer_) && (replacer_ = null), replacer = replacer_, indent = indent_;
      let str = is_primitive_object(value) ? JSON.stringify(value) : stringify("", { "": value }, EMPTY);
      return clean(), isObject(value) ? process_comments(value, PREFIX_BEFORE_ALL, EMPTY, !0).trimLeft() + str + process_comments(value, PREFIX_AFTER_ALL, EMPTY).trimRight() : str;
    };
  }
});

// ../node_modules/comment-json/src/index.js
var require_src2 = __commonJS({
  "../node_modules/comment-json/src/index.js"(exports, module) {
    var { parse, tokenize } = require_parse(), stringify = require_stringify(), { CommentArray } = require_array(), {
      PREFIX_BEFORE,
      PREFIX_AFTER_PROP,
      PREFIX_AFTER_COLON,
      PREFIX_AFTER_VALUE,
      PREFIX_AFTER,
      PREFIX_BEFORE_ALL,
      PREFIX_AFTER_ALL,
      assign
    } = require_common();
    module.exports = {
      PREFIX_BEFORE,
      PREFIX_AFTER_PROP,
      PREFIX_AFTER_COLON,
      PREFIX_AFTER_VALUE,
      PREFIX_AFTER,
      PREFIX_BEFORE_ALL,
      PREFIX_AFTER_ALL,
      parse,
      stringify,
      tokenize,
      CommentArray,
      assign
    };
  }
});

// src/cli/helpers.ts
var import_picocolors = __toESM(require_picocolors(), 1);
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { cp, readFile as readFile2, writeFile } from "node:fs/promises";
import { join as join3, resolve as resolve2 } from "node:path";
import {
  frameworkToRenderer
} from "storybook/internal/common";
import { logger } from "storybook/internal/node-logger";
import {
  SupportedLanguage
} from "storybook/internal/types";
import { Feature } from "storybook/internal/types";
import { coerce, satisfies } from "semver";

// ../node_modules/strip-json-comments/index.js
var singleComment = Symbol("singleComment"), multiComment = Symbol("multiComment"), stripWithoutWhitespace = () => "", stripWithWhitespace = (string, start, end) => string.slice(start, end).replace(/[^ \t\r\n]/g, " "), isEscaped = (jsonString, quotePosition) => {
  let index = quotePosition - 1, backslashCount = 0;
  for (; jsonString[index] === "\\"; )
    index -= 1, backslashCount += 1;
  return !!(backslashCount % 2);
};
function stripJsonComments(jsonString, { whitespace = !0, trailingCommas = !1 } = {}) {
  if (typeof jsonString != "string")
    throw new TypeError(`Expected argument \`jsonString\` to be a \`string\`, got \`${typeof jsonString}\``);
  let strip = whitespace ? stripWithWhitespace : stripWithoutWhitespace, isInsideString = !1, isInsideComment = !1, offset = 0, buffer = "", result = "", commaIndex = -1;
  for (let index = 0; index < jsonString.length; index++) {
    let currentCharacter = jsonString[index], nextCharacter = jsonString[index + 1];
    if (!isInsideComment && currentCharacter === '"' && (isEscaped(jsonString, index) || (isInsideString = !isInsideString)), !isInsideString)
      if (!isInsideComment && currentCharacter + nextCharacter === "//")
        buffer += jsonString.slice(offset, index), offset = index, isInsideComment = singleComment, index++;
      else if (isInsideComment === singleComment && currentCharacter + nextCharacter === `\r
`) {
        index++, isInsideComment = !1, buffer += strip(jsonString, offset, index), offset = index;
        continue;
      } else if (isInsideComment === singleComment && currentCharacter === `
`)
        isInsideComment = !1, buffer += strip(jsonString, offset, index), offset = index;
      else if (!isInsideComment && currentCharacter + nextCharacter === "/*") {
        buffer += jsonString.slice(offset, index), offset = index, isInsideComment = multiComment, index++;
        continue;
      } else if (isInsideComment === multiComment && currentCharacter + nextCharacter === "*/") {
        index++, isInsideComment = !1, buffer += strip(jsonString, offset, index + 1), offset = index + 1;
        continue;
      } else trailingCommas && !isInsideComment && (commaIndex !== -1 ? currentCharacter === "}" || currentCharacter === "]" ? (buffer += jsonString.slice(offset, index), result += strip(buffer, 0, 1) + buffer.slice(1), buffer = "", offset = index, commaIndex = -1) : currentCharacter !== " " && currentCharacter !== "	" && currentCharacter !== "\r" && currentCharacter !== `
` && (buffer += jsonString.slice(offset, index), offset = index, commaIndex = -1) : currentCharacter === "," && (result += buffer + jsonString.slice(offset, index), buffer = "", offset = index, commaIndex = index));
  }
  let remaining = isInsideComment === singleComment ? strip(jsonString, offset) : jsonString.slice(offset);
  return result + buffer + remaining;
}

// src/cli/dirs.ts
import { join as join2 } from "node:path";
import { Readable as Readable2 } from "node:stream";
import { pipeline as pipeline2 } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import {
  frameworkPackages,
  rendererPackages,
  temporaryDirectory,
  versions
} from "storybook/internal/common";

// ../node_modules/get-npm-tarball-url/lib/index.mjs
function src_default(pkgName, pkgVersion, opts) {
  let registry;
  opts?.registry ? registry = opts.registry.endsWith("/") ? opts.registry : `${opts.registry}/` : registry = "https://registry.npmjs.org/";
  let scopelessName = getScopelessName(pkgName);
  return `${registry}${pkgName}/-/${scopelessName}-${removeBuildMetadataFromVersion(pkgVersion)}.tgz`;
}
function removeBuildMetadataFromVersion(version) {
  let plusPos = version.indexOf("+");
  return plusPos === -1 ? version : version.substring(0, plusPos);
}
function getScopelessName(name) {
  return name[0] !== "@" ? name : name.split("/")[1];
}

// ../node_modules/modern-tar/dist/unpacker-BKKRRs7i.js
var FLAGTYPE = {
  0: "file",
  1: "link",
  2: "symlink",
  3: "character-device",
  4: "block-device",
  5: "directory",
  6: "fifo",
  x: "pax-header",
  g: "pax-global-header",
  L: "gnu-long-name",
  K: "gnu-long-link-name"
}, ZERO_BLOCK = new Uint8Array(512), encoder = new TextEncoder(), decoder = new TextDecoder();
function readString(view, offset, size) {
  let end = view.indexOf(0, offset), sliceEnd = end === -1 || end > offset + size ? offset + size : end;
  return decoder.decode(view.subarray(offset, sliceEnd));
}
function readOctal(view, offset, size) {
  let value = 0, end = offset + size;
  for (let i = offset; i < end; i++) {
    let charCode = view[i];
    if (charCode === 0) break;
    charCode !== 32 && (value = (value << 3) + (charCode - 48));
  }
  return value;
}
function readNumeric(view, offset, size) {
  if (view[offset] & 128) {
    let result = 0;
    result = view[offset] & 127;
    for (let i = 1; i < size; i++) result = result * 256 + view[offset + i];
    if (!Number.isSafeInteger(result)) throw new Error("TAR number too large");
    return result;
  }
  return readOctal(view, offset, size);
}
var CHECKSUM_SPACE = 32;
function validateChecksum(block) {
  let stored = readOctal(block, 148, 8), sum = 0;
  for (let i = 0; i < block.length; i++) i >= 148 && i < 156 ? sum += CHECKSUM_SPACE : sum += block[i];
  return stored === sum;
}
function parseUstarHeader(block, strict) {
  if (strict && !validateChecksum(block)) throw new Error("Invalid tar header checksum.");
  let typeflag = readString(block, 156, 1), header = {
    name: readString(block, 0, 100),
    mode: readOctal(block, 100, 8),
    uid: readNumeric(block, 108, 8),
    gid: readNumeric(block, 116, 8),
    size: readNumeric(block, 124, 12),
    mtime: new Date(readNumeric(block, 136, 12) * 1e3),
    type: FLAGTYPE[typeflag] || "file",
    linkname: readString(block, 157, 100)
  }, magic = readString(block, 257, 6);
  return magic.trim() === "ustar" && (header.uname = readString(block, 265, 32), header.gname = readString(block, 297, 32)), magic === "ustar" && (header.prefix = readString(block, 345, 155)), header;
}
var PAX_MAPPING = {
  path: ["name", (v) => v],
  linkpath: ["linkname", (v) => v],
  size: ["size", (v) => parseInt(v, 10)],
  mtime: ["mtime", parseFloat],
  uid: ["uid", (v) => parseInt(v, 10)],
  gid: ["gid", (v) => parseInt(v, 10)],
  uname: ["uname", (v) => v],
  gname: ["gname", (v) => v]
};
function parsePax(buffer) {
  let decoder$1 = new TextDecoder("utf-8"), overrides = {}, pax = {}, offset = 0;
  for (; offset < buffer.length; ) {
    let spaceIndex = buffer.indexOf(32, offset);
    if (spaceIndex === -1) break;
    let length = parseInt(decoder$1.decode(buffer.subarray(offset, spaceIndex)), 10);
    if (Number.isNaN(length) || length === 0) break;
    let recordEnd = offset + length, [key, value] = decoder$1.decode(buffer.subarray(spaceIndex + 1, recordEnd - 1)).split("=", 2);
    if (key && value !== void 0) {
      pax[key] = value;
      let mapping = PAX_MAPPING[key];
      if (mapping) {
        let [targetKey, parser] = mapping, parsedValue = parser(value);
        (typeof parsedValue == "string" || !Number.isNaN(parsedValue)) && (overrides[targetKey] = parsedValue);
      }
    }
    offset = recordEnd;
  }
  return Object.keys(pax).length > 0 && (overrides.pax = pax), overrides;
}
function applyOverrides(header, overrides) {
  overrides.name !== void 0 && (header.name = overrides.name), overrides.linkname !== void 0 && (header.linkname = overrides.linkname), overrides.size !== void 0 && (header.size = overrides.size), overrides.mtime !== void 0 && (header.mtime = new Date(overrides.mtime * 1e3)), overrides.uid !== void 0 && (header.uid = overrides.uid), overrides.gid !== void 0 && (header.gid = overrides.gid), overrides.uname !== void 0 && (header.uname = overrides.uname), overrides.gname !== void 0 && (header.gname = overrides.gname), overrides.pax && (header.pax = Object.assign({}, header.pax ?? {}, overrides.pax));
}
function getMetaParser(type) {
  switch (type) {
    case "pax-global-header":
    case "pax-header":
      return parsePax;
    case "gnu-long-name":
      return (data) => ({ name: readString(data, 0, data.length) });
    case "gnu-long-link-name":
      return (data) => ({ linkname: readString(data, 0, data.length) });
    default:
      return;
  }
}
var EOF_BUFFER = new Uint8Array(512 * 2);
function transformHeader(header, options) {
  let { strip, filter, map } = options;
  if (!strip && !filter && !map) return header;
  let h = { ...header };
  if (strip && strip > 0) {
    let components = h.name.split("/").filter(Boolean);
    if (strip >= components.length) return null;
    let newName = components.slice(strip).join("/");
    if (h.name = h.type === "directory" && !newName.endsWith("/") ? `${newName}/` : newName, h.linkname?.startsWith("/")) {
      let linkComponents = h.linkname.split("/").filter(Boolean);
      h.linkname = strip >= linkComponents.length ? "/" : `/${linkComponents.slice(strip).join("/")}`;
    }
  }
  if (filter?.(h) === !1) return null;
  let result = map ? map(h) : h;
  return result && (!result.name || !result.name.trim() || result.name === "." || result.name === "/") ? null : result;
}
var STATE_HEADER = 0, STATE_BODY = 1, STATE_PADDING = 2, STATE_AWAIT_EOF = 3;
function createTarUnpacker(handler, options = {}) {
  let strict = options.strict ?? !1, chunkQueue = [], totalAvailable = 0, state = STATE_HEADER, waitingForData = !1, currentEntry = null, paxGlobals = {}, nextEntryOverrides = {};
  function consume(size, callback) {
    let remaining = Math.min(size, totalAvailable), initialRemaining = remaining;
    for (; remaining > 0 && chunkQueue.length > 0; ) {
      let chunkNode = chunkQueue[0], available = chunkNode.data.length - chunkNode.consumed, toProcess = Math.min(remaining, available);
      callback && callback(chunkNode.data.subarray(chunkNode.consumed, chunkNode.consumed + toProcess)), chunkNode.consumed += toProcess, remaining -= toProcess, chunkNode.consumed >= chunkNode.data.length && chunkQueue.shift();
    }
    return totalAvailable -= initialRemaining - remaining, initialRemaining - remaining;
  }
  function read(size) {
    let toRead = Math.min(size, totalAvailable);
    if (toRead === 0) return null;
    let chunk = chunkQueue[0];
    if (chunk && chunk.data.length - chunk.consumed >= toRead) {
      let result$1 = chunk.data.subarray(chunk.consumed, chunk.consumed + toRead);
      return chunk.consumed += toRead, totalAvailable -= toRead, chunk.consumed >= chunk.data.length && chunkQueue.shift(), result$1;
    }
    let result = new Uint8Array(toRead), offset = 0;
    return consume(toRead, (data) => {
      result.set(data, offset), offset += data.length;
    }), result;
  }
  function process2() {
    for (; ; ) switch (state) {
      case STATE_HEADER: {
        if (totalAvailable < 512) {
          waitingForData = !0;
          return;
        }
        let headerBlock = read(512);
        if (!headerBlock) {
          waitingForData = !0;
          return;
        }
        if (isZeroBlock(headerBlock)) {
          state = STATE_AWAIT_EOF;
          continue;
        }
        waitingForData = !1;
        try {
          let internalHeader = parseUstarHeader(headerBlock, strict), header = {
            ...internalHeader,
            name: internalHeader.name
          }, metaParser = getMetaParser(header.type);
          if (metaParser) {
            let paddedSize = header.size + 511 & -512;
            if (totalAvailable < paddedSize) {
              waitingForData = !0, chunkQueue.unshift({
                data: headerBlock,
                consumed: 0
              }), totalAvailable += 512;
              return;
            }
            let metaBlock = read(paddedSize);
            if (!metaBlock) {
              waitingForData = !0;
              return;
            }
            let overrides = metaParser(metaBlock.subarray(0, header.size));
            header.type === "pax-global-header" ? Object.assign(paxGlobals, overrides) : Object.assign(nextEntryOverrides, overrides);
            continue;
          }
          internalHeader.prefix && (header.name = `${internalHeader.prefix}/${header.name}`), applyOverrides(header, paxGlobals), applyOverrides(header, nextEntryOverrides), nextEntryOverrides = {}, handler.onHeader(header), header.size > 0 ? (currentEntry = {
            remaining: header.size,
            padding: -header.size & 511
          }, state = STATE_BODY) : handler.onEndEntry();
        } catch (error) {
          handler.onError(error);
          return;
        }
        continue;
      }
      case STATE_BODY: {
        if (!currentEntry) throw new Error("No current entry for body");
        let toForward = Math.min(currentEntry.remaining, totalAvailable);
        if (toForward > 0) {
          let consumed = consume(toForward, handler.onData);
          currentEntry.remaining -= consumed;
        }
        if (currentEntry.remaining === 0)
          state = currentEntry.padding > 0 ? STATE_PADDING : STATE_HEADER, state === STATE_HEADER && (handler.onEndEntry(), currentEntry = null);
        else if (totalAvailable === 0) {
          waitingForData = !0;
          return;
        }
        continue;
      }
      case STATE_PADDING:
        if (!currentEntry) throw new Error("No current entry for padding");
        if (totalAvailable < currentEntry.padding) {
          waitingForData = !0;
          return;
        }
        currentEntry.padding > 0 && consume(currentEntry.padding), handler.onEndEntry(), currentEntry = null, state = STATE_HEADER;
        continue;
      case STATE_AWAIT_EOF: {
        if (totalAvailable < 512) {
          waitingForData = !0;
          return;
        }
        let secondBlock = read(512);
        if (!secondBlock) {
          waitingForData = !0;
          return;
        }
        if (isZeroBlock(secondBlock)) return;
        if (strict) {
          handler.onError(new Error("Invalid EOF"));
          return;
        }
        chunkQueue.unshift({
          data: secondBlock,
          consumed: 0
        }), totalAvailable += 512, state = STATE_HEADER;
        continue;
      }
      default:
        throw new Error("Invalid state in tar unpacker.");
    }
  }
  return {
    write(chunk) {
      if (chunk.length !== 0 && (chunkQueue.push({
        data: chunk,
        consumed: 0
      }), totalAvailable += chunk.length, waitingForData)) {
        waitingForData = !1;
        try {
          process2();
        } catch (error) {
          handler.onError(error);
        }
      }
    },
    end() {
      try {
        if (waitingForData || process2(), strict) {
          if (currentEntry && currentEntry.remaining > 0) {
            let error = new Error("Tar archive is truncated.");
            throw handler.onError(error), error;
          }
          if (totalAvailable > 0 && read(totalAvailable)?.some((b) => b !== 0)) {
            let error = new Error("Invalid EOF.");
            throw handler.onError(error), error;
          }
          if (waitingForData) {
            let error = new Error("Tar archive is truncated.");
            throw handler.onError(error), error;
          }
        } else currentEntry && (handler.onEndEntry(), currentEntry = null);
      } catch (error) {
        handler.onError(error);
      }
    }
  };
}
function isZeroBlock(block) {
  if (block.byteOffset % 8 === 0) {
    let view = new BigUint64Array(block.buffer, block.byteOffset, block.length / 8);
    for (let i = 0; i < view.length; i++) if (view[i] !== 0n) return !1;
    return !0;
  }
  for (let i = 0; i < block.length; i++) if (block[i] !== 0) return !1;
  return !0;
}

// ../node_modules/modern-tar/dist/fs/index.js
import * as fs from "node:fs/promises";
import { cpus } from "node:os";
import * as path from "node:path";
import { PassThrough, Readable, Writable } from "node:stream";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
var unicodeCache = /* @__PURE__ */ new Map(), normalizeUnicode = (s) => {
  let result = unicodeCache.get(s);
  return result !== void 0 && unicodeCache.delete(s), result = result ?? s.normalize("NFD"), unicodeCache.set(s, result), unicodeCache.size > 1e4 && unicodeCache.delete(unicodeCache.keys().next().value), result;
};
function validateBounds(targetPath, destDir, errorMessage) {
  let target = normalizeUnicode(path.resolve(targetPath)), dest = path.resolve(destDir);
  if (target !== dest && !target.startsWith(dest + path.sep)) throw new Error(errorMessage);
}
var win32Reserved = {
  ":": "\uF03A",
  "<": "\uF03C",
  ">": "\uF03E",
  "|": "\uF07C",
  "?": "\uF03F",
  "*": "\uF02A",
  '"': "\uF022"
};
function normalizeName(name) {
  let path$1 = name.replace(/\\/g, "/");
  if (path$1.split("/").includes("..") || /^[a-zA-Z]:\.\./.test(path$1)) throw new Error(`${name} points outside extraction directory`);
  let relative = path$1;
  return /^[a-zA-Z]:/.test(relative) ? relative = relative.replace(/^[a-zA-Z]:[/\\]?/, "") : relative.startsWith("/") && (relative = relative.replace(/^\/+/, "")), process.platform === "win32" ? relative.replace(/[<>:"|?*]/g, (char) => win32Reserved[char]) : relative;
}
var normalizeHeaderName = (s) => normalizeUnicode(normalizeName(s.replace(/\/+$/, "")));
function unpackTar(directoryPath, options = {}) {
  let { streamTimeout = 5e3, ...fsOptions } = options, timeoutId = null, { handler, signal } = createFSHandler(directoryPath, fsOptions), unpacker = createTarUnpacker(handler, fsOptions), stream;
  function resetTimeout() {
    timeoutId && clearTimeout(timeoutId), streamTimeout !== 1 / 0 && streamTimeout > 0 && (timeoutId = setTimeout(() => {
      let err = new Error(`Stream timed out after ${streamTimeout}ms of inactivity.`);
      stream.destroy(err);
    }, streamTimeout));
  }
  return stream = new Writable({
    write(chunk, _, callback) {
      if (resetTimeout(), signal.aborted) return callback(signal.reason);
      try {
        unpacker.write(chunk), callback();
      } catch (writeErr) {
        callback(writeErr);
      }
    },
    async final(callback) {
      timeoutId && clearTimeout(timeoutId);
      try {
        if (signal.aborted) return callback(signal.reason);
        unpacker.end(), await handler.process(), callback();
      } catch (finalErr) {
        callback(finalErr);
      }
    }
  }), stream.on("close", () => {
    timeoutId && clearTimeout(timeoutId);
  }), resetTimeout(), stream;
}
function createFSHandler(directoryPath, options) {
  let { maxDepth = 1024, dmode, fmode, concurrency = cpus().length || 8 } = options, abortController = new AbortController(), { signal } = abortController, opQueue = [], activeOps = 0, pathPromises = /* @__PURE__ */ new Map(), activeEntryStream = null, processingEnded = !1, resolveDrain, drainPromise = new Promise((resolve3) => {
    resolveDrain = resolve3;
  }), processQueue = () => {
    for (signal.aborted && (opQueue.length = 0); activeOps < concurrency && opQueue.length > 0; ) {
      activeOps++;
      let op = opQueue.shift();
      if (!op) break;
      op();
    }
    processingEnded && activeOps === 0 && opQueue.length === 0 && resolveDrain();
  }, destDirPromise = (async () => {
    let symbolic = normalizeUnicode(path.resolve(directoryPath));
    await fs.mkdir(symbolic, { recursive: !0 });
    try {
      let real = await fs.realpath(symbolic);
      return {
        symbolic,
        real
      };
    } catch (err) {
      throw signal.aborted ? signal.reason : err;
    }
  })();
  destDirPromise.catch((err) => {
    signal.aborted || abortController.abort(err);
  });
  let ensureDirectoryExists = (dirPath) => {
    let promise = pathPromises.get(dirPath);
    return promise || (promise = (async () => {
      if (signal.aborted) throw signal.reason;
      let destDir = await destDirPromise;
      if (dirPath === destDir.symbolic) return "directory";
      if (await ensureDirectoryExists(path.dirname(dirPath)), signal.aborted) throw signal.reason;
      try {
        let stat2 = await fs.lstat(dirPath);
        if (stat2.isDirectory()) return "directory";
        if (stat2.isSymbolicLink()) {
          let realPath = await fs.realpath(dirPath);
          if (validateBounds(realPath, destDir.real, `Symlink "${dirPath}" points outside the extraction directory.`), (await fs.stat(realPath)).isDirectory()) return "directory";
        }
        throw new Error(`"${dirPath}" is not a valid directory component.`);
      } catch (err) {
        if (err.code === "ENOENT")
          return await fs.mkdir(dirPath, { mode: dmode }), "directory";
        throw err;
      }
    })(), pathPromises.set(dirPath, promise), promise);
  };
  return {
    handler: {
      onHeader(header) {
        if (signal.aborted) return;
        activeEntryStream = new PassThrough({ highWaterMark: header.size > 1048576 ? 524288 : void 0 });
        let entryStream = activeEntryStream, startOperation = () => {
          let opPromise;
          try {
            let transformed = transformHeader(header, options);
            if (!transformed) {
              entryStream.resume(), activeOps--, processQueue();
              return;
            }
            let name = normalizeHeaderName(transformed.name), target = path.join(path.resolve(directoryPath), name);
            opPromise = (pathPromises.get(target) || Promise.resolve(void 0)).then(async (priorOp) => {
              if (signal.aborted) throw signal.reason;
              if (priorOp && (priorOp === "directory" && transformed.type !== "directory" || priorOp !== "directory" && transformed.type === "directory"))
                throw new Error(`Path conflict ${transformed.type} over existing ${priorOp} at "${transformed.name}"`);
              try {
                let destDir = await destDirPromise;
                if (maxDepth !== 1 / 0 && name.split("/").length > maxDepth) throw new Error("Tar exceeds max specified depth.");
                let outPath = path.join(destDir.symbolic, name);
                validateBounds(outPath, destDir.symbolic, `Entry "${transformed.name}" points outside the extraction directory.`);
                let parentDir = path.dirname(outPath);
                switch (await ensureDirectoryExists(parentDir), transformed.type) {
                  case "directory":
                    await fs.mkdir(outPath, {
                      recursive: !0,
                      mode: dmode ?? transformed.mode
                    });
                    break;
                  case "file": {
                    let fileStream = createWriteStream(outPath, {
                      mode: fmode ?? transformed.mode,
                      highWaterMark: transformed.size > 1048576 ? 524288 : void 0
                    });
                    await pipeline(entryStream, fileStream);
                    break;
                  }
                  case "symlink": {
                    let { linkname } = transformed;
                    if (!linkname) return transformed.type;
                    let target$1 = path.resolve(parentDir, linkname);
                    validateBounds(target$1, destDir.symbolic, `Symlink "${linkname}" points outside the extraction directory.`), await fs.symlink(linkname, outPath);
                    break;
                  }
                  case "link": {
                    let { linkname } = transformed;
                    if (!linkname) return transformed.type;
                    let normalizedLink = normalizeUnicode(linkname);
                    if (path.isAbsolute(normalizedLink)) throw new Error(`Hardlink "${linkname}" points outside the extraction directory.`);
                    let linkTarget = path.join(destDir.symbolic, normalizedLink);
                    validateBounds(linkTarget, destDir.symbolic, `Hardlink "${linkname}" points outside the extraction directory.`), await ensureDirectoryExists(path.dirname(linkTarget));
                    let realTargetParent = await fs.realpath(path.dirname(linkTarget)), realLinkTarget = path.join(realTargetParent, path.basename(linkTarget));
                    if (validateBounds(realLinkTarget, destDir.real, `Hardlink "${linkname}" points outside the extraction directory.`), linkTarget === outPath) return transformed.type;
                    let targetPromise = pathPromises.get(linkTarget);
                    targetPromise && await targetPromise, await fs.link(linkTarget, outPath);
                    break;
                  }
                  default:
                    return transformed.type;
                }
                return transformed.mtime && await (transformed.type === "symlink" ? fs.lutimes : fs.utimes)(outPath, transformed.mtime, transformed.mtime).catch(() => {
                }), transformed.type;
              } finally {
                entryStream.readableEnded || entryStream.resume();
              }
            }), pathPromises.set(target, opPromise);
          } catch (err) {
            opPromise = Promise.reject(err), abortController.abort(err);
          }
          opPromise.catch((err) => abortController.abort(err)).finally(() => {
            activeOps--, processQueue();
          });
        };
        opQueue.push(startOperation), processQueue();
      },
      onData(chunk) {
        signal.aborted || activeEntryStream?.write(chunk);
      },
      onEndEntry() {
        activeEntryStream?.end(), activeEntryStream = null;
      },
      onError(error) {
        abortController.abort(error);
      },
      async process() {
        if (processingEnded = !0, processQueue(), await drainPromise, signal.aborted) throw signal.reason;
      }
    },
    signal
  };
}

// src/cli/dirs.ts
var resolveUsingBranchInstall = async (packageManager, request) => {
  let tempDirectory = await temporaryDirectory(), version = versions[request] || await packageManager.latestVersion(request), url = (src_default.default || src_default)(request, version, {
    registry: await packageManager.getRegistryURL()
  }), response = await fetch(url);
  if (!response.ok || !response.body)
    throw new Error(`Failed to download tarball from ${url}`);
  return await pipeline2(
    Readable2.fromWeb(response.body),
    createGunzip(),
    unpackTar(tempDirectory)
  ), join2(tempDirectory, "package");
};
async function getRendererDir(packageManager, renderer) {
  let [externalFramework] = Object.entries({ ...frameworkPackages, ...rendererPackages }).find(
    ([key, value]) => value === renderer
  ) ?? [];
  if (!externalFramework)
    return null;
  let packageJsonPath = join2(externalFramework, "package.json"), errors = [];
  try {
    return resolvePackageDir(externalFramework, process.cwd());
  } catch (e) {
    invariant(e instanceof Error), errors.push(e);
  }
  try {
    return await resolveUsingBranchInstall(packageManager, externalFramework);
  } catch (e) {
    invariant(e instanceof Error), errors.push(e);
  }
  throw new Error(`Cannot find ${packageJsonPath}, ${errors.map((e) => e.stack).join(`

`)}`);
}

// src/cli/helpers.ts
function readFileAsJson(jsonPath, allowComments) {
  let filePath = resolve2(jsonPath);
  if (!existsSync(filePath))
    return !1;
  let fileContent = readFileSync(filePath, "utf8"), jsonContent = allowComments ? stripJsonComments(fileContent) : fileContent;
  try {
    return JSON.parse(jsonContent);
  } catch (e) {
    throw logger.error(import_picocolors.default.red(`Invalid json in file: ${filePath}`)), e;
  }
}
var writeFileAsJson = (jsonPath, content) => {
  let filePath = resolve2(jsonPath);
  return existsSync(filePath) ? (writeFileSync(filePath, `${JSON.stringify(content, null, 2)}
`), !0) : !1;
};
async function getBabelDependencies(packageManager) {
  let dependenciesToAdd = [], babelLoaderVersion = "^8.0.0-0", babelCoreVersion = packageManager.getDependencyVersion("babel-core");
  if (babelCoreVersion) {
    let latestCompatibleBabelVersion = await packageManager.latestVersion(
      "babel-core",
      babelCoreVersion
    );
    latestCompatibleBabelVersion && satisfies(latestCompatibleBabelVersion, "^6.0.0") && (babelLoaderVersion = "^7.0.0");
  } else if (!packageManager.getDependencyVersion("@babel/core")) {
    let babelCoreInstallVersion = await packageManager.getVersion("@babel/core");
    dependenciesToAdd.push(`@babel/core@${babelCoreInstallVersion}`);
  }
  if (!packageManager.getDependencyVersion("babel-loader")) {
    let babelLoaderInstallVersion = await packageManager.getVersion(
      "babel-loader",
      babelLoaderVersion
    );
    dependenciesToAdd.push(`babel-loader@${babelLoaderInstallVersion}`);
  }
  return dependenciesToAdd;
}
function addToDevDependenciesIfNotPresent(packageJson, name, packageVersion) {
  !packageJson.dependencies?.[name] && !packageJson.devDependencies?.[name] && (packageJson.devDependencies ? packageJson.devDependencies[name] = packageVersion : packageJson.devDependencies = {
    [name]: packageVersion
  });
}
function copyTemplate(templateRoot, destination = ".") {
  let templateDir = resolve2(templateRoot, "template-csf/");
  if (!existsSync(templateDir))
    throw new Error("Couldn't find template dir");
  cpSync(templateDir, destination, { recursive: !0 });
}
async function getVersionSafe(packageManager, packageName) {
  try {
    let version = await packageManager.getInstalledVersion(packageName);
    return version || (version = packageManager.getAllDependencies()[packageName] ?? ""), coerce(version, { includePrerelease: !0 })?.toString();
  } catch {
  }
}
var cliStoriesTargetPath = async () => existsSync("./src") ? "./src/stories" : "./stories";
async function copyTemplateFiles({
  packageManager,
  templateLocation,
  language,
  destination,
  commonAssetsDir,
  features
}) {
  let languageFolderMapping = {
    [SupportedLanguage.JAVASCRIPT]: "js",
    [SupportedLanguage.TYPESCRIPT]: "ts"
  }, templatePath = async () => {
    let baseDir = await getRendererDir(packageManager, templateLocation);
    if (!baseDir)
      return null;
    let assetsDir = join3(baseDir, "template", "cli"), assetsLanguage = join3(assetsDir, languageFolderMapping[language]), assetsJS = join3(assetsDir, languageFolderMapping[SupportedLanguage.JAVASCRIPT]), assetsTS = join3(assetsDir, languageFolderMapping.typescript);
    if (existsSync(assetsLanguage))
      return assetsLanguage;
    if (existsSync(assetsTS))
      return assetsTS;
    if (existsSync(assetsJS))
      return assetsJS;
    if (existsSync(assetsDir))
      return assetsDir;
    throw new Error(`Unsupported renderer: ${templateLocation} (${baseDir})`);
  }, destinationPath = destination ?? await cliStoriesTargetPath(), filter = (file) => features.has(Feature.DOCS) || !file.endsWith(".mdx");
  commonAssetsDir && await cp(commonAssetsDir, destinationPath, { recursive: !0, filter });
  let tmpPath = await templatePath();
  if (tmpPath && await cp(tmpPath, destinationPath, { recursive: !0, filter }), commonAssetsDir && features.has(Feature.DOCS)) {
    let rendererType = frameworkToRenderer[templateLocation] || "react";
    await adjustTemplate(join3(destinationPath, "Configure.mdx"), { renderer: rendererType });
  }
}
async function adjustTemplate(templatePath, templateData) {
  let template = await readFile2(templatePath, { encoding: "utf8" });
  Object.keys(templateData).forEach((key) => {
    template = template.replaceAll(`{{${key}}}`, `${templateData[key]}`);
  }), await writeFile(templatePath, template);
}
function coerceSemver(version) {
  let coercedSemver = coerce(version);
  return invariant(coercedSemver != null, `Could not coerce ${version} into a semver.`), coercedSemver;
}
function hasStorybookDependencies(packageManager) {
  let currentPackageDeps = packageManager.getAllDependencies();
  return Object.keys(currentPackageDeps).some((dep) => dep.includes("storybook"));
}

// src/cli/angular/helpers.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join4 } from "node:path";
import { prompt } from "storybook/internal/node-logger";
import { MissingAngularJsonError } from "storybook/internal/server-errors";
var ANGULAR_JSON_PATH = "angular.json", AngularJSON = class {
  constructor() {
    if (!existsSync2(ANGULAR_JSON_PATH))
      throw new MissingAngularJsonError({ path: join4(process.cwd(), ANGULAR_JSON_PATH) });
    let jsonContent = readFileSync2(ANGULAR_JSON_PATH, "utf8");
    this.json = JSON.parse(jsonContent);
  }
  get projects() {
    return this.json.projects;
  }
  get projectsWithoutStorybook() {
    return Object.keys(this.projects).filter((projectName) => {
      let { architect } = this.projects[projectName];
      return !architect.storybook;
    });
  }
  get hasStorybookBuilder() {
    return Object.keys(this.projects).some((projectName) => {
      let { architect } = this.projects[projectName];
      return Object.keys(architect).some((key) => architect[key].builder === "@storybook/angular:start-storybook");
    });
  }
  get rootProject() {
    let rootProjectName = Object.keys(this.projects).find((projectName) => {
      let { root } = this.projects[projectName];
      return root === "" || root === ".";
    });
    return rootProjectName ? this.projects[rootProjectName] : null;
  }
  getProjectSettingsByName(projectName) {
    return this.projects[projectName];
  }
  async getProjectName() {
    return this.projectsWithoutStorybook.length > 1 ? prompt.select({
      message: "For which project do you want to generate Storybook configuration?",
      options: this.projectsWithoutStorybook.map((name) => ({
        label: name,
        value: name
      }))
    }) : this.projectsWithoutStorybook[0];
  }
  addStorybookEntries({
    angularProjectName,
    storybookFolder,
    useCompodoc,
    root
  }) {
    let { architect } = this.projects[angularProjectName], baseOptions = {
      configDir: storybookFolder,
      browserTarget: `${angularProjectName}:build`,
      compodoc: useCompodoc,
      ...useCompodoc && { compodocArgs: ["-e", "json", "-d", root || "."] }
    };
    architect.storybook || (architect.storybook = {
      builder: "@storybook/angular:start-storybook",
      options: {
        ...baseOptions,
        port: 6006
      }
    }), architect["build-storybook"] || (architect["build-storybook"] = {
      builder: "@storybook/angular:build-storybook",
      options: {
        ...baseOptions,
        outputDir: Object.keys(this.projects).length === 1 ? "storybook-static" : `dist/storybook/${angularProjectName}`
      }
    });
  }
  write() {
    writeFileSync2(ANGULAR_JSON_PATH, JSON.stringify(this.json, null, 2));
  }
};

// src/cli/projectTypes.ts
var ProjectType = /* @__PURE__ */ ((ProjectType2) => (ProjectType2.ANGULAR = "angular", ProjectType2.EMBER = "ember", ProjectType2.HTML = "html", ProjectType2.NEXTJS = "nextjs", ProjectType2.NUXT = "nuxt", ProjectType2.NX = "nx", ProjectType2.PREACT = "preact", ProjectType2.QWIK = "qwik", ProjectType2.REACT = "react", ProjectType2.REACT_NATIVE = "react_native", ProjectType2.REACT_NATIVE_AND_RNW = "react_native_and_rnw", ProjectType2.REACT_NATIVE_WEB = "react_native_web", ProjectType2.REACT_SCRIPTS = "react_scripts", ProjectType2.SERVER = "server", ProjectType2.SOLID = "solid", ProjectType2.SVELTE = "svelte", ProjectType2.SVELTEKIT = "sveltekit", ProjectType2.UNDETECTED = "undetected", ProjectType2.UNSUPPORTED = "unsupported", ProjectType2.VUE3 = "vue3", ProjectType2.WEB_COMPONENTS = "web_components", ProjectType2))(ProjectType || {});

// src/cli/eslintPlugin.ts
var import_comment_json = __toESM(require_src2(), 1);
import { readFile as readFile3, writeFile as writeFile2 } from "node:fs/promises";
import { getProjectRoot } from "storybook/internal/common";
import { readConfig, writeConfig } from "storybook/internal/csf-tools";
import { logger as logger2, prompt as prompt2 } from "storybook/internal/node-logger";

// ../node_modules/detect-indent/index.js
var INDENT_REGEX = /^(?:( )+|\t+)/, INDENT_TYPE_SPACE = "space";
function shouldIgnoreSingleSpace(ignoreSingleSpaces, indentType, value) {
  return ignoreSingleSpaces && indentType === INDENT_TYPE_SPACE && value === 1;
}
function makeIndentsMap(string, ignoreSingleSpaces) {
  let indents = /* @__PURE__ */ new Map(), previousSize = 0, previousIndentType, key;
  for (let line of string.split(/\n/g)) {
    if (!line)
      continue;
    let matches = line.match(INDENT_REGEX);
    if (matches === null)
      previousSize = 0, previousIndentType = "";
    else {
      let indent = matches[0].length, indentType = matches[1] ? INDENT_TYPE_SPACE : "tab";
      if (shouldIgnoreSingleSpace(ignoreSingleSpaces, indentType, indent))
        continue;
      indentType !== previousIndentType && (previousSize = 0), previousIndentType = indentType;
      let use = 1, weight = 0, indentDifference = indent - previousSize;
      if (previousSize = indent, indentDifference === 0)
        use = 0, weight = 1;
      else {
        let absoluteIndentDifference = Math.abs(indentDifference);
        if (shouldIgnoreSingleSpace(ignoreSingleSpaces, indentType, absoluteIndentDifference))
          continue;
        key = encodeIndentsKey(indentType, absoluteIndentDifference);
      }
      let entry = indents.get(key);
      indents.set(key, entry === void 0 ? [1, 0] : [entry[0] + use, entry[1] + weight]);
    }
  }
  return indents;
}
function encodeIndentsKey(indentType, indentAmount) {
  return (indentType === INDENT_TYPE_SPACE ? "s" : "t") + String(indentAmount);
}
function decodeIndentsKey(indentsKey) {
  let type = indentsKey[0] === "s" ? INDENT_TYPE_SPACE : "tab", amount = Number(indentsKey.slice(1));
  return { type, amount };
}
function getMostUsedKey(indents) {
  let result, maxUsed = 0, maxWeight = 0;
  for (let [key, [usedCount, weight]] of indents)
    (usedCount > maxUsed || usedCount === maxUsed && weight > maxWeight) && (maxUsed = usedCount, maxWeight = weight, result = key);
  return result;
}
function makeIndentString(type, amount) {
  return (type === INDENT_TYPE_SPACE ? " " : "	").repeat(amount);
}
function detectIndent(string) {
  if (typeof string != "string")
    throw new TypeError("Expected a string");
  let indents = makeIndentsMap(string, !0);
  indents.size === 0 && (indents = makeIndentsMap(string, !1));
  let keyOfMostUsedIndent = getMostUsedKey(indents), type, amount = 0, indent = "";
  return keyOfMostUsedIndent !== void 0 && ({ type, amount } = decodeIndentsKey(keyOfMostUsedIndent), indent = makeIndentString(type, amount)), {
    amount,
    type,
    indent
  };
}

// src/cli/eslintPlugin.ts
var import_picocolors2 = __toESM(require_picocolors(), 1), import_ts_dedent = __toESM(require_dist(), 1);
var SUPPORTED_ESLINT_EXTENSIONS = ["ts", "mts", "cts", "mjs", "js", "cjs", "json"], UNSUPPORTED_ESLINT_EXTENSIONS = ["yaml", "yml"], findEslintFile = (instanceDir) => {
  let filePrefixes = ["eslint.config", ".eslintrc"];
  for (let prefix of filePrefixes)
    for (let ext of UNSUPPORTED_ESLINT_EXTENSIONS)
      if (up(`${prefix}.${ext}`, { cwd: instanceDir, last: getProjectRoot() }))
        throw new Error(`Unsupported ESLint config extension: .${ext}`);
  for (let prefix of filePrefixes)
    for (let ext of SUPPORTED_ESLINT_EXTENSIONS) {
      let file = up(`${prefix}.${ext}`, { cwd: instanceDir, last: getProjectRoot() });
      if (file)
        return file;
    }
};
function unwrapTSExpression(expr) {
  return expr && (types.isTSAsExpression(expr) || types.isTSSatisfiesExpression(expr) ? unwrapTSExpression(expr.expression) : expr);
}
var configureFlatConfig = async (code) => {
  let ast = babelParse(code), tsEslintLocalName = "", eslintConfigExpression = null;
  return traverse(ast, {
    ImportDeclaration(path2) {
      if (path2.node.source.value === "typescript-eslint") {
        let defaultSpecifier = path2.node.specifiers.find((s) => types.isImportDefaultSpecifier(s));
        defaultSpecifier && (tsEslintLocalName = defaultSpecifier.local.name);
      }
    },
    ExportDefaultDeclaration(path2) {
      let node = path2.node;
      eslintConfigExpression = unwrapTSExpression(node.declaration);
      let storybookConfig = types.memberExpression(
        types.memberExpression(types.identifier("storybook"), types.identifier("configs")),
        types.stringLiteral("flat/recommended"),
        !0
      );
      if (types.isArrayExpression(eslintConfigExpression) && eslintConfigExpression.elements.push(types.spreadElement(storybookConfig)), types.isCallExpression(eslintConfigExpression) && types.isMemberExpression(eslintConfigExpression.callee) && tsEslintLocalName && types.isIdentifier(eslintConfigExpression.callee.object, { name: tsEslintLocalName }) && types.isIdentifier(eslintConfigExpression.callee.property, { name: "config" }) && eslintConfigExpression.arguments.push(storybookConfig), types.isIdentifier(eslintConfigExpression)) {
        let binding = path2.scope.getBinding(eslintConfigExpression.name);
        if (binding && types.isVariableDeclarator(binding.path.node)) {
          let init = unwrapTSExpression(binding.path.node.init);
          types.isArrayExpression(init) && init.elements.push(types.spreadElement(storybookConfig));
        }
      }
    },
    Program(path2) {
      if (!path2.node.body.some(
        (node) => types.isImportDeclaration(node) && node.source.value === "eslint-plugin-storybook"
      )) {
        let importDecl = types.importDeclaration(
          [types.importDefaultSpecifier(types.identifier("storybook"))],
          types.stringLiteral("eslint-plugin-storybook")
        );
        importDecl.comments = [
          {
            type: "CommentLine",
            value: " For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format"
          }
        ], path2.node.body.unshift(importDecl);
      }
    }
  }), recast.print(ast).code;
};
async function extractEslintInfo(packageManager) {
  let unsupportedExtension, allDependencies = packageManager.getAllDependencies(), { packageJson } = packageManager.primaryPackageJson, eslintConfigFile;
  try {
    eslintConfigFile = findEslintFile(packageManager.instanceDir);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unsupported ESLint"))
      unsupportedExtension = String(err);
    else
      throw err;
  }
  let isStorybookPluginInstalled = !!allDependencies["eslint-plugin-storybook"];
  return {
    hasEslint: !!(allDependencies.eslint || eslintConfigFile || packageJson.eslintConfig),
    isStorybookPluginInstalled,
    eslintConfigFile,
    unsupportedExtension,
    isFlatConfig: !!(eslintConfigFile && eslintConfigFile.match(/eslint\.config\.[^/]+/))
  };
}
var normalizeExtends = (existingExtends) => {
  if (!existingExtends)
    return [];
  if (typeof existingExtends == "string")
    return [existingExtends];
  if (Array.isArray(existingExtends))
    return existingExtends;
  throw new Error(`Invalid eslint extends ${existingExtends}`);
};
async function configureEslintPlugin({
  eslintConfigFile,
  packageManager,
  isFlatConfig
}) {
  if (eslintConfigFile)
    if (eslintConfigFile.endsWith("json")) {
      logger2.debug(`Detected JSON config at ${eslintConfigFile}`);
      let eslintFileContents = await readFile3(eslintConfigFile, { encoding: "utf8" }), eslintConfig = import_comment_json.default.parse(eslintFileContents);
      if (normalizeExtends(eslintConfig.extends).filter(Boolean).includes("plugin:storybook/recommended"))
        return;
      Array.isArray(eslintConfig.extends) || (eslintConfig.extends = eslintConfig.extends ? [eslintConfig.extends] : []), eslintConfig.extends.push("plugin:storybook/recommended");
      let spaces = detectIndent(eslintFileContents).amount || 2;
      await writeFile2(eslintConfigFile, import_comment_json.default.stringify(eslintConfig, null, spaces));
    } else if (isFlatConfig) {
      logger2.debug(`Detected flat config at ${eslintConfigFile}`);
      let code = await readFile3(eslintConfigFile, { encoding: "utf8" }), output = await configureFlatConfig(code);
      await writeFile2(eslintConfigFile, output);
    } else {
      let eslint = await readConfig(eslintConfigFile), existingExtends = normalizeExtends(eslint.getFieldValue(["extends"])).filter(Boolean);
      if (existingExtends.includes("plugin:storybook/recommended"))
        return;
      eslint.setFieldValue(["extends"], [...existingExtends, "plugin:storybook/recommended"]), await writeConfig(eslint);
    }
  else {
    logger2.debug("No ESLint config file found, configuring in package.json instead");
    let { packageJson } = packageManager.primaryPackageJson, existingExtends = normalizeExtends(packageJson.eslintConfig?.extends).filter(Boolean);
    packageManager.writePackageJson({
      ...packageJson,
      eslintConfig: {
        ...packageJson.eslintConfig,
        extends: [...existingExtends, "plugin:storybook/recommended"]
      }
    });
  }
}
var suggestESLintPlugin = async () => await prompt2.confirm({
  message: import_ts_dedent.dedent`
        We have detected that you're using ESLint. Storybook provides a plugin that gives the best experience with Storybook and helps follow best practices: ${import_picocolors2.default.yellow(
    "https://storybook.js.org/docs/9/configure/integration/eslint-plugin"
  )}

        Would you like to install it?
      `,
  initialValue: !0
});

// src/cli/AddonVitestService.ts
import fs2 from "node:fs/promises";
import * as babel from "storybook/internal/babel";
import { getProjectRoot as getProjectRoot2 } from "storybook/internal/common";
import { CLI_COLORS } from "storybook/internal/node-logger";
import { logger as logger3, prompt as prompt3 } from "storybook/internal/node-logger";
import { ErrorCollector } from "storybook/internal/telemetry";
var import_ts_dedent2 = __toESM(require_dist(), 1);
import { coerce as coerce2, minVersion, satisfies as satisfies2, validRange } from "semver";

// src/cli/AddonVitestService.constants.ts
var SUPPORTED_FRAMEWORKS = [
  "html-vite" /* HTML_VITE */,
  "nextjs-vite" /* NEXTJS_VITE */,
  "preact-vite" /* PREACT_VITE */,
  "react-native-web-vite" /* REACT_NATIVE_WEB_VITE */,
  "react-vite" /* REACT_VITE */,
  "solid" /* SOLID */,
  "svelte-vite" /* SVELTE_VITE */,
  "sveltekit" /* SVELTEKIT */,
  "vue3-vite" /* VUE3_VITE */,
  "web-components-vite" /* WEB_COMPONENTS_VITE */
];

// src/cli/AddonVitestService.ts
var AddonVitestService = class {
  constructor(packageManager) {
    this.packageManager = packageManager;
  }
  /**
   * Collect all dependencies needed for @storybook/addon-vitest
   *
   * Returns versioned package strings ready for installation:
   *
   * - Base packages: vitest, @vitest/browser, playwright
   * - Next.js specific: @storybook/nextjs-vite
   * - Coverage reporter: @vitest/coverage-v8
   */
  async collectDependencies() {
    let allDeps = this.packageManager.getAllDependencies(), dependencies = [], vitestVersionSpecifier = await this.packageManager.getInstalledVersion("vitest");
    !vitestVersionSpecifier && allDeps.vitest && (vitestVersionSpecifier = allDeps.vitest);
    let isVitest4OrNewer = !0;
    if (vitestVersionSpecifier) {
      let range = validRange(vitestVersionSpecifier), versionToCheck = range ? minVersion(range)?.version : coerce2(vitestVersionSpecifier)?.version;
      isVitest4OrNewer = versionToCheck ? satisfies2(versionToCheck, ">=4.0.0") : !0;
    }
    let basePackages = [
      "vitest",
      "playwright",
      isVitest4OrNewer ? "@vitest/browser-playwright" : "@vitest/browser"
    ];
    for (let pkg of basePackages)
      allDeps[pkg] || dependencies.push(pkg);
    let v8Version = await this.packageManager.getInstalledVersion("@vitest/coverage-v8"), istanbulVersion = await this.packageManager.getInstalledVersion(
      "@vitest/coverage-istanbul"
    );
    return !v8Version && !istanbulVersion && dependencies.push("@vitest/coverage-v8"), dependencies.map((pkg) => pkg.includes("vitest") && vitestVersionSpecifier ? `${pkg}@${vitestVersionSpecifier}` : pkg);
  }
  /**
   * Install Playwright browser binaries for @storybook/addon-vitest
   *
   * Installs Chromium with dependencies via `npx playwright install chromium --with-deps`
   *
   * @param packageManager - The package manager to use for installation
   * @param prompt - The prompt instance for displaying progress
   * @param logger - The logger instance for displaying messages
   * @param options - Installation options
   * @returns Array of error messages if installation fails
   */
  async installPlaywright(options = {}) {
    let errors = [], playwrightCommand = ["playwright", "install", "chromium", "--with-deps"], playwrightCommandString = this.packageManager.getPackageCommand(playwrightCommand), result;
    try {
      (options.yes ? !0 : await (async () => (logger3.log(import_ts_dedent2.dedent`
            Playwright browser binaries are necessary for @storybook/addon-vitest. The download can take some time. If you don't want to wait, you can skip the installation and run the following command manually later:
            ${CLI_COLORS.cta(playwrightCommandString)}
            `), prompt3.confirm({
        message: "Do you want to install Playwright with Chromium now?",
        initialValue: !0
      })))()) ? await prompt3.executeTaskWithSpinner(
        (signal) => this.packageManager.runPackageCommand({
          args: playwrightCommand,
          stdio: ["inherit", "pipe", "pipe"],
          signal
        }),
        {
          id: "playwright-installation",
          intro: 'Installing Playwright browser binaries (press "c" to abort)',
          error: `An error occurred while installing Playwright browser binaries. Please run the following command later: ${playwrightCommandString}`,
          success: "Playwright browser binaries installed successfully",
          abortable: !0
        }
      ) ? result = "aborted" : result = "installed" : (logger3.warn("Playwright installation skipped"), result = "skipped");
    } catch (e) {
      result = "failed", ErrorCollector.addError(e), e instanceof Error ? errors.push(e.stack ?? e.message) : errors.push(String(e));
    }
    return { errors, result };
  }
  /**
   * Validate full compatibility for @storybook/addon-vitest
   *
   * Checks:
   *
   * - Webpack configuration compatibility
   * - Builder compatibility (Vite or Next.js)
   * - Renderer/framework support
   * - Vitest version (>=3.0.0)
   * - MSW version (>=2.0.0 if installed)
   * - Next.js installation (if using @storybook/nextjs)
   * - Vitest config files (if configDir provided)
   */
  async validateCompatibility(options) {
    let reasons = [];
    options.builder !== "vite" /* VITE */ && reasons.push("Non-Vite builder is not supported"), SUPPORTED_FRAMEWORKS.some(
      (framework) => options.framework === framework
    ) || reasons.push(`Test feature cannot yet be used with ${options.framework}`);
    let packageVersionResult = await this.validatePackageVersions();
    if (!packageVersionResult.compatible && packageVersionResult.reasons && reasons.push(...packageVersionResult.reasons), options.projectRoot) {
      let configResult = await this.validateConfigFiles(options.projectRoot);
      !configResult.compatible && configResult.reasons && reasons.push(...configResult.reasons);
    }
    return reasons.length > 0 ? { compatible: !1, reasons } : { compatible: !0 };
  }
  /**
   * Validate package versions for addon-vitest compatibility Public method to allow early
   * validation before framework detection
   */
  async validatePackageVersions() {
    let reasons = [], vitestVersionSpecifier = await this.packageManager.getInstalledVersion("vitest"), coercedVitestVersion = vitestVersionSpecifier ? coerce2(vitestVersionSpecifier) : null;
    coercedVitestVersion && !satisfies2(coercedVitestVersion, ">=3.0.0") && reasons.push(
      `The addon requires Vitest 3.0.0 or higher. You are currently using ${vitestVersionSpecifier}.`
    );
    let mswVersionSpecifier = await this.packageManager.getInstalledVersion("msw"), coercedMswVersion = mswVersionSpecifier ? coerce2(mswVersionSpecifier) : null;
    return coercedMswVersion && !satisfies2(coercedMswVersion, ">=2.0.0") && reasons.push(
      `The addon uses Vitest behind the scenes, which supports only version 2 and above of MSW. However, we have detected version ${coercedMswVersion.version} in this project.`
    ), reasons.length > 0 ? { compatible: !1, reasons } : { compatible: !0 };
  }
  /**
   * Validate vitest config files for addon compatibility
   *
   * Public method that can be used by both postinstall and create-storybook flows
   */
  async validateConfigFiles(directory) {
    let reasons = [], projectRoot = getProjectRoot2(), vitestWorkspaceFile = any(
      ["ts", "js", "json"].flatMap((ex) => [`vitest.workspace.${ex}`, `vitest.projects.${ex}`]),
      { cwd: directory, last: projectRoot }
    );
    if (vitestWorkspaceFile?.endsWith(".json"))
      reasons.push(`Cannot auto-update JSON workspace file: ${vitestWorkspaceFile}`);
    else if (vitestWorkspaceFile) {
      let fileContents = await fs2.readFile(vitestWorkspaceFile, "utf8");
      this.isValidWorkspaceConfigFile(fileContents) || reasons.push(`Found an invalid workspace config file: ${vitestWorkspaceFile}`);
    }
    let vitestConfigFile = any(
      ["ts", "js", "tsx", "jsx", "cts", "cjs", "mts", "mjs"].map((ex) => `vitest.config.${ex}`),
      { cwd: directory, last: projectRoot }
    );
    if (vitestConfigFile?.endsWith(".cts") || vitestConfigFile?.endsWith(".cjs"))
      reasons.push(`Cannot auto-update CommonJS config file: ${vitestConfigFile}`);
    else if (vitestConfigFile) {
      let configContent = await fs2.readFile(vitestConfigFile, "utf8");
      this.isValidVitestConfig(configContent) || reasons.push(`Found an invalid Vitest config file: ${vitestConfigFile}`);
    }
    return reasons.length > 0 ? { compatible: !1, reasons } : { compatible: !0 };
  }
  // Private helper methods for Vitest config validation
  /** Validate workspace config file structure */
  isValidWorkspaceConfigFile(fileContents) {
    let isValid = !1, parsedFile = babel.babelParse(fileContents);
    return babel.traverse(parsedFile, {
      ExportDefaultDeclaration: (path2) => {
        let declaration = path2.node.declaration;
        isValid = this.isWorkspaceConfigArray(declaration) || this.isDefineWorkspaceExpression(declaration);
      }
    }), isValid;
  }
  /** Validate Vitest config file structure */
  isValidVitestConfig(configContent) {
    let parsedConfig = babel.babelParse(configContent), isValidVitestConfig = !1;
    return babel.traverse(parsedConfig, {
      ExportDefaultDeclaration: (path2) => {
        this.isDefineConfigExpression(path2.node.declaration) ? isValidVitestConfig = this.isSafeToExtendWorkspace(
          path2.node.declaration
        ) : this.isMergeConfigExpression(path2.node.declaration) && (isValidVitestConfig = path2.node.declaration.arguments.some(
          (arg) => this.isSafeToExtendWorkspace(arg)
        ));
      }
    }), isValidVitestConfig;
  }
  isWorkspaceConfigArray(node) {
    return babel.types.isArrayExpression(node) && node?.elements.every(
      (el) => babel.types.isStringLiteral(el) || babel.types.isObjectExpression(el)
    );
  }
  isDefineWorkspaceExpression(node) {
    return babel.types.isCallExpression(node) && node.callee && node.callee?.name === "defineWorkspace" && this.isWorkspaceConfigArray(node.arguments?.[0]);
  }
  isDefineConfigExpression(node) {
    return babel.types.isCallExpression(node) && node.callee?.name === "defineConfig" && babel.types.isObjectExpression(node.arguments?.[0]);
  }
  isMergeConfigExpression(path2) {
    return babel.types.isCallExpression(path2) && path2.callee?.name === "mergeConfig";
  }
  isSafeToExtendWorkspace(node) {
    return babel.types.isCallExpression(node) && node.arguments.length > 0 && babel.types.isObjectExpression(node.arguments?.[0]) && node.arguments[0]?.properties.every(
      (p) => p.key?.name !== "test" || babel.types.isObjectExpression(p.value) && p.value.properties.every(
        ({ key, value }) => key?.name !== "workspace" || babel.types.isArrayExpression(value)
      )
    );
  }
};

export {
  getRendererDir,
  readFileAsJson,
  writeFileAsJson,
  getBabelDependencies,
  addToDevDependenciesIfNotPresent,
  copyTemplate,
  getVersionSafe,
  cliStoriesTargetPath,
  copyTemplateFiles,
  adjustTemplate,
  coerceSemver,
  hasStorybookDependencies,
  ANGULAR_JSON_PATH,
  AngularJSON,
  ProjectType,
  SUPPORTED_ESLINT_EXTENSIONS,
  findEslintFile,
  configureFlatConfig,
  extractEslintInfo,
  normalizeExtends,
  configureEslintPlugin,
  suggestESLintPlugin,
  AddonVitestService
};
