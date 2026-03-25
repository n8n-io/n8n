import {
  mapValues
} from "./chunk-AIOS4NGK.js";
import {
  isPlainObject
} from "./chunk-GFLS4VP3.js";
import {
  __commonJS,
  __toESM
} from "./chunk-A242L54C.js";

// ../node_modules/jsdoc-type-pratt-parser/dist/index.js
var require_dist = __commonJS({
  "../node_modules/jsdoc-type-pratt-parser/dist/index.js"(exports, module) {
    (function(global, factory) {
      typeof exports == "object" && typeof module < "u" ? factory(exports) : typeof define == "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis < "u" ? globalThis : global || self, factory(global.jtpp = {}));
    })(exports, (function(exports2) {
      "use strict";
      function tokenToString(token) {
        return token.text !== void 0 && token.text !== "" ? `'${token.type}' with value '${token.text}'` : `'${token.type}'`;
      }
      class NoParsletFoundError extends Error {
        constructor(token) {
          super(`No parslet found for token: ${tokenToString(token)}`), this.token = token, Object.setPrototypeOf(this, NoParsletFoundError.prototype);
        }
        getToken() {
          return this.token;
        }
      }
      class EarlyEndOfParseError extends Error {
        constructor(token) {
          super(`The parsing ended early. The next token was: ${tokenToString(token)}`), this.token = token, Object.setPrototypeOf(this, EarlyEndOfParseError.prototype);
        }
        getToken() {
          return this.token;
        }
      }
      class UnexpectedTypeError extends Error {
        constructor(result, message) {
          let error = `Unexpected type: '${result.type}'.`;
          message !== void 0 && (error += ` Message: ${message}`), super(error), Object.setPrototypeOf(this, UnexpectedTypeError.prototype);
        }
      }
      function makePunctuationRule(type) {
        return (text) => text.startsWith(type) ? { type, text: type } : null;
      }
      function getQuoted(text) {
        let position = 0, char, mark = text[0], escaped = !1;
        if (mark !== "'" && mark !== '"')
          return null;
        for (; position < text.length; ) {
          if (position++, char = text[position], !escaped && char === mark) {
            position++;
            break;
          }
          escaped = !escaped && char === "\\";
        }
        if (char !== mark)
          throw new Error("Unterminated String");
        return text.slice(0, position);
      }
      let identifierStartRegex = new RegExp("[$_\\p{ID_Start}]|\\\\u\\p{Hex_Digit}{4}|\\\\u\\{0*(?:\\p{Hex_Digit}{1,5}|10\\p{Hex_Digit}{4})\\}", "u"), identifierContinueRegex = new RegExp("[$\\-\\p{ID_Continue}\\u200C\\u200D]|\\\\u\\p{Hex_Digit}{4}|\\\\u\\{0*(?:\\p{Hex_Digit}{1,5}|10\\p{Hex_Digit}{4})\\}", "u");
      function getIdentifier(text) {
        let char = text[0];
        if (!identifierStartRegex.test(char))
          return null;
        let position = 1;
        do {
          if (char = text[position], !identifierContinueRegex.test(char))
            break;
          position++;
        } while (position < text.length);
        return text.slice(0, position);
      }
      let numberRegex = /^(NaN|-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?|Infinity))/;
      function getNumber(text) {
        var _a, _b;
        return (_b = (_a = numberRegex.exec(text)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : null;
      }
      let identifierRule = (text) => {
        let value = getIdentifier(text);
        return value == null ? null : {
          type: "Identifier",
          text: value
        };
      };
      function makeKeyWordRule(type) {
        return (text) => {
          if (!text.startsWith(type))
            return null;
          let prepends = text[type.length];
          return prepends !== void 0 && identifierContinueRegex.test(prepends) ? null : {
            type,
            text: type
          };
        };
      }
      let stringValueRule = (text) => {
        let value = getQuoted(text);
        return value == null ? null : {
          type: "StringValue",
          text: value
        };
      }, eofRule = (text) => text.length > 0 ? null : {
        type: "EOF",
        text: ""
      }, numberRule = (text) => {
        let value = getNumber(text);
        return value === null ? null : {
          type: "Number",
          text: value
        };
      }, rules = [
        eofRule,
        makePunctuationRule("=>"),
        makePunctuationRule("("),
        makePunctuationRule(")"),
        makePunctuationRule("{"),
        makePunctuationRule("}"),
        makePunctuationRule("["),
        makePunctuationRule("]"),
        makePunctuationRule("|"),
        makePunctuationRule("&"),
        makePunctuationRule("<"),
        makePunctuationRule(">"),
        makePunctuationRule(","),
        makePunctuationRule(";"),
        makePunctuationRule("*"),
        makePunctuationRule("?"),
        makePunctuationRule("!"),
        makePunctuationRule("="),
        makePunctuationRule(":"),
        makePunctuationRule("..."),
        makePunctuationRule("."),
        makePunctuationRule("#"),
        makePunctuationRule("~"),
        makePunctuationRule("/"),
        makePunctuationRule("@"),
        makeKeyWordRule("undefined"),
        makeKeyWordRule("null"),
        makeKeyWordRule("function"),
        makeKeyWordRule("this"),
        makeKeyWordRule("new"),
        makeKeyWordRule("module"),
        makeKeyWordRule("event"),
        makeKeyWordRule("extends"),
        makeKeyWordRule("external"),
        makeKeyWordRule("infer"),
        makeKeyWordRule("typeof"),
        makeKeyWordRule("keyof"),
        makeKeyWordRule("readonly"),
        makeKeyWordRule("import"),
        makeKeyWordRule("is"),
        makeKeyWordRule("in"),
        makeKeyWordRule("asserts"),
        numberRule,
        identifierRule,
        stringValueRule
      ], breakingWhitespaceRegex = /^\s*\n\s*/;
      class Lexer {
        static create(text) {
          let current = this.read(text);
          text = current.text;
          let next = this.read(text);
          return text = next.text, new Lexer(text, void 0, current.token, next.token);
        }
        constructor(text, previous, current, next) {
          this.text = "", this.text = text, this.previous = previous, this.current = current, this.next = next;
        }
        static read(text, startOfLine = !1) {
          startOfLine = startOfLine || breakingWhitespaceRegex.test(text), text = text.trim();
          for (let rule of rules) {
            let partial = rule(text);
            if (partial !== null) {
              let token = Object.assign(Object.assign({}, partial), { startOfLine });
              return text = text.slice(token.text.length), { text, token };
            }
          }
          throw new Error("Unexpected Token " + text);
        }
        advance() {
          let next = Lexer.read(this.text);
          return new Lexer(next.text, this.current, this.next, next.token);
        }
      }
      function assertRootResult(result) {
        if (result === void 0)
          throw new Error("Unexpected undefined");
        if (result.type === "JsdocTypeKeyValue" || result.type === "JsdocTypeParameterList" || result.type === "JsdocTypeProperty" || result.type === "JsdocTypeReadonlyProperty" || result.type === "JsdocTypeObjectField" || result.type === "JsdocTypeJsdocObjectField" || result.type === "JsdocTypeIndexSignature" || result.type === "JsdocTypeMappedType" || result.type === "JsdocTypeTypeParameter")
          throw new UnexpectedTypeError(result);
        return result;
      }
      function assertPlainKeyValueOrRootResult(result) {
        return result.type === "JsdocTypeKeyValue" ? assertPlainKeyValueResult(result) : assertRootResult(result);
      }
      function assertPlainKeyValueOrNameResult(result) {
        return result.type === "JsdocTypeName" ? result : assertPlainKeyValueResult(result);
      }
      function assertPlainKeyValueResult(result) {
        if (result.type !== "JsdocTypeKeyValue")
          throw new UnexpectedTypeError(result);
        return result;
      }
      function assertNumberOrVariadicNameResult(result) {
        var _a;
        if (result.type === "JsdocTypeVariadic") {
          if (((_a = result.element) === null || _a === void 0 ? void 0 : _a.type) === "JsdocTypeName")
            return result;
          throw new UnexpectedTypeError(result);
        }
        if (result.type !== "JsdocTypeNumber" && result.type !== "JsdocTypeName")
          throw new UnexpectedTypeError(result);
        return result;
      }
      function assertArrayOrTupleResult(result) {
        if (result.type === "JsdocTypeTuple" || result.type === "JsdocTypeGeneric" && result.meta.brackets === "square")
          return result;
        throw new UnexpectedTypeError(result);
      }
      function isSquaredProperty(result) {
        return result.type === "JsdocTypeIndexSignature" || result.type === "JsdocTypeMappedType";
      }
      var Precedence;
      (function(Precedence2) {
        Precedence2[Precedence2.ALL = 0] = "ALL", Precedence2[Precedence2.PARAMETER_LIST = 1] = "PARAMETER_LIST", Precedence2[Precedence2.OBJECT = 2] = "OBJECT", Precedence2[Precedence2.KEY_VALUE = 3] = "KEY_VALUE", Precedence2[Precedence2.INDEX_BRACKETS = 4] = "INDEX_BRACKETS", Precedence2[Precedence2.UNION = 5] = "UNION", Precedence2[Precedence2.INTERSECTION = 6] = "INTERSECTION", Precedence2[Precedence2.PREFIX = 7] = "PREFIX", Precedence2[Precedence2.INFIX = 8] = "INFIX", Precedence2[Precedence2.TUPLE = 9] = "TUPLE", Precedence2[Precedence2.SYMBOL = 10] = "SYMBOL", Precedence2[Precedence2.OPTIONAL = 11] = "OPTIONAL", Precedence2[Precedence2.NULLABLE = 12] = "NULLABLE", Precedence2[Precedence2.KEY_OF_TYPE_OF = 13] = "KEY_OF_TYPE_OF", Precedence2[Precedence2.FUNCTION = 14] = "FUNCTION", Precedence2[Precedence2.ARROW = 15] = "ARROW", Precedence2[Precedence2.ARRAY_BRACKETS = 16] = "ARRAY_BRACKETS", Precedence2[Precedence2.GENERIC = 17] = "GENERIC", Precedence2[Precedence2.NAME_PATH = 18] = "NAME_PATH", Precedence2[Precedence2.PARENTHESIS = 19] = "PARENTHESIS", Precedence2[Precedence2.SPECIAL_TYPES = 20] = "SPECIAL_TYPES";
      })(Precedence || (Precedence = {}));
      class Parser {
        constructor(grammar, textOrLexer, baseParser) {
          this.grammar = grammar, typeof textOrLexer == "string" ? this._lexer = Lexer.create(textOrLexer) : this._lexer = textOrLexer, this.baseParser = baseParser;
        }
        get lexer() {
          return this._lexer;
        }
        /**
         * Parses a given string and throws an error if the parse ended before the end of the string.
         */
        parse() {
          let result = this.parseType(Precedence.ALL);
          if (this.lexer.current.type !== "EOF")
            throw new EarlyEndOfParseError(this.lexer.current);
          return result;
        }
        /**
         * Parses with the current lexer and asserts that the result is a {@link RootResult}.
         */
        parseType(precedence) {
          return assertRootResult(this.parseIntermediateType(precedence));
        }
        /**
         * The main parsing function. First it tries to parse the current state in the prefix step, and then it continues
         * to parse the state in the infix step.
         */
        parseIntermediateType(precedence) {
          let result = this.tryParslets(null, precedence);
          if (result === null)
            throw new NoParsletFoundError(this.lexer.current);
          return this.parseInfixIntermediateType(result, precedence);
        }
        /**
         * In the infix parsing step the parser continues to parse the current state with all parslets until none returns
         * a result.
         */
        parseInfixIntermediateType(left, precedence) {
          let result = this.tryParslets(left, precedence);
          for (; result !== null; )
            left = result, result = this.tryParslets(left, precedence);
          return left;
        }
        /**
         * Tries to parse the current state with all parslets in the grammar and returns the first non null result.
         */
        tryParslets(left, precedence) {
          for (let parslet of this.grammar) {
            let result = parslet(this, precedence, left);
            if (result !== null)
              return result;
          }
          return null;
        }
        /**
         * If the given type equals the current type of the {@link Lexer} advance the lexer. Return true if the lexer was
         * advanced.
         */
        consume(types) {
          return Array.isArray(types) || (types = [types]), types.includes(this.lexer.current.type) ? (this._lexer = this.lexer.advance(), !0) : !1;
        }
        acceptLexerState(parser) {
          this._lexer = parser.lexer;
        }
      }
      function isQuestionMarkUnknownType(next) {
        return next === "}" || next === "EOF" || next === "|" || next === "," || next === ")" || next === ">";
      }
      let nullableParslet = (parser, precedence, left) => {
        let type = parser.lexer.current.type, next = parser.lexer.next.type;
        return left == null && type === "?" && !isQuestionMarkUnknownType(next) || left != null && type === "?" ? (parser.consume("?"), left == null ? {
          type: "JsdocTypeNullable",
          element: parser.parseType(Precedence.NULLABLE),
          meta: {
            position: "prefix"
          }
        } : {
          type: "JsdocTypeNullable",
          element: assertRootResult(left),
          meta: {
            position: "suffix"
          }
        }) : null;
      };
      function composeParslet(options) {
        let parslet = (parser, curPrecedence, left) => {
          let type = parser.lexer.current.type, next = parser.lexer.next.type;
          if (left === null) {
            if ("parsePrefix" in options && options.accept(type, next))
              return options.parsePrefix(parser);
          } else if ("parseInfix" in options && options.precedence > curPrecedence && options.accept(type, next))
            return options.parseInfix(parser, left);
          return null;
        };
        return Object.defineProperty(parslet, "name", {
          value: options.name
        }), parslet;
      }
      let optionalParslet = composeParslet({
        name: "optionalParslet",
        accept: (type) => type === "=",
        precedence: Precedence.OPTIONAL,
        parsePrefix: (parser) => (parser.consume("="), {
          type: "JsdocTypeOptional",
          element: parser.parseType(Precedence.OPTIONAL),
          meta: {
            position: "prefix"
          }
        }),
        parseInfix: (parser, left) => (parser.consume("="), {
          type: "JsdocTypeOptional",
          element: assertRootResult(left),
          meta: {
            position: "suffix"
          }
        })
      }), numberParslet = composeParslet({
        name: "numberParslet",
        accept: (type) => type === "Number",
        parsePrefix: (parser) => {
          let value = parseFloat(parser.lexer.current.text);
          return parser.consume("Number"), {
            type: "JsdocTypeNumber",
            value
          };
        }
      }), parenthesisParslet = composeParslet({
        name: "parenthesisParslet",
        accept: (type) => type === "(",
        parsePrefix: (parser) => {
          if (parser.consume("("), parser.consume(")"))
            return {
              type: "JsdocTypeParameterList",
              elements: []
            };
          let result = parser.parseIntermediateType(Precedence.ALL);
          if (!parser.consume(")"))
            throw new Error("Unterminated parenthesis");
          return result.type === "JsdocTypeParameterList" ? result : result.type === "JsdocTypeKeyValue" ? {
            type: "JsdocTypeParameterList",
            elements: [result]
          } : {
            type: "JsdocTypeParenthesis",
            element: assertRootResult(result)
          };
        }
      }), specialTypesParslet = composeParslet({
        name: "specialTypesParslet",
        accept: (type, next) => type === "?" && isQuestionMarkUnknownType(next) || type === "null" || type === "undefined" || type === "*",
        parsePrefix: (parser) => {
          if (parser.consume("null"))
            return {
              type: "JsdocTypeNull"
            };
          if (parser.consume("undefined"))
            return {
              type: "JsdocTypeUndefined"
            };
          if (parser.consume("*"))
            return {
              type: "JsdocTypeAny"
            };
          if (parser.consume("?"))
            return {
              type: "JsdocTypeUnknown"
            };
          throw new Error("Unacceptable token: " + parser.lexer.current.text);
        }
      }), notNullableParslet = composeParslet({
        name: "notNullableParslet",
        accept: (type) => type === "!",
        precedence: Precedence.NULLABLE,
        parsePrefix: (parser) => (parser.consume("!"), {
          type: "JsdocTypeNotNullable",
          element: parser.parseType(Precedence.NULLABLE),
          meta: {
            position: "prefix"
          }
        }),
        parseInfix: (parser, left) => (parser.consume("!"), {
          type: "JsdocTypeNotNullable",
          element: assertRootResult(left),
          meta: {
            position: "suffix"
          }
        })
      });
      function createParameterListParslet({ allowTrailingComma }) {
        return composeParslet({
          name: "parameterListParslet",
          accept: (type) => type === ",",
          precedence: Precedence.PARAMETER_LIST,
          parseInfix: (parser, left) => {
            let elements = [
              assertPlainKeyValueOrRootResult(left)
            ];
            parser.consume(",");
            do
              try {
                let next = parser.parseIntermediateType(Precedence.PARAMETER_LIST);
                elements.push(assertPlainKeyValueOrRootResult(next));
              } catch (e) {
                if (e instanceof NoParsletFoundError)
                  break;
                throw e;
              }
            while (parser.consume(","));
            if (elements.length > 0 && elements.slice(0, -1).some((e) => e.type === "JsdocTypeVariadic"))
              throw new Error("Only the last parameter may be a rest parameter");
            return {
              type: "JsdocTypeParameterList",
              elements
            };
          }
        });
      }
      let genericParslet = composeParslet({
        name: "genericParslet",
        accept: (type, next) => type === "<" || type === "." && next === "<",
        precedence: Precedence.GENERIC,
        parseInfix: (parser, left) => {
          let dot = parser.consume(".");
          parser.consume("<");
          let objects = [], infer = !1;
          if (parser.consume("infer")) {
            infer = !0;
            let left2 = parser.parseIntermediateType(Precedence.SYMBOL);
            if (left2.type !== "JsdocTypeName")
              throw new UnexpectedTypeError(left2, "A typescript asserts always has to have a name on the left side.");
            objects.push(left2);
          } else
            do
              objects.push(parser.parseType(Precedence.PARAMETER_LIST));
            while (parser.consume(","));
          if (!parser.consume(">"))
            throw new Error("Unterminated generic parameter list");
          return Object.assign(Object.assign({ type: "JsdocTypeGeneric", left: assertRootResult(left), elements: objects }, infer ? { infer: !0 } : {}), { meta: {
            brackets: "angle",
            dot
          } });
        }
      }), unionParslet = composeParslet({
        name: "unionParslet",
        accept: (type) => type === "|",
        precedence: Precedence.UNION,
        parseInfix: (parser, left) => {
          parser.consume("|");
          let elements = [];
          do
            elements.push(parser.parseType(Precedence.UNION));
          while (parser.consume("|"));
          return {
            type: "JsdocTypeUnion",
            elements: [assertRootResult(left), ...elements]
          };
        }
      }), baseGrammar = [
        nullableParslet,
        optionalParslet,
        numberParslet,
        parenthesisParslet,
        specialTypesParslet,
        notNullableParslet,
        createParameterListParslet({
          allowTrailingComma: !0
        }),
        genericParslet,
        unionParslet,
        optionalParslet
      ];
      function createNamePathParslet({ allowSquareBracketsOnAnyType, allowJsdocNamePaths, pathGrammar: pathGrammar2 }) {
        return function(parser, precedence, left) {
          if (left == null || precedence >= Precedence.NAME_PATH)
            return null;
          let type = parser.lexer.current.type, next = parser.lexer.next.type;
          if (!(type === "." && next !== "<" || type === "[" && (allowSquareBracketsOnAnyType || left.type === "JsdocTypeName") || allowJsdocNamePaths && (type === "~" || type === "#")))
            return null;
          let pathType, brackets = !1;
          parser.consume(".") ? pathType = "property" : parser.consume("[") ? (pathType = "property-brackets", brackets = !0) : parser.consume("~") ? pathType = "inner" : (parser.consume("#"), pathType = "instance");
          let pathParser = pathGrammar2 !== null ? new Parser(pathGrammar2, parser.lexer, parser) : parser, parsed = pathParser.parseIntermediateType(Precedence.NAME_PATH);
          parser.acceptLexerState(pathParser);
          let right;
          switch (parsed.type) {
            case "JsdocTypeName":
              right = {
                type: "JsdocTypeProperty",
                value: parsed.value,
                meta: {
                  quote: void 0
                }
              };
              break;
            case "JsdocTypeNumber":
              right = {
                type: "JsdocTypeProperty",
                value: parsed.value.toString(10),
                meta: {
                  quote: void 0
                }
              };
              break;
            case "JsdocTypeStringValue":
              right = {
                type: "JsdocTypeProperty",
                value: parsed.value,
                meta: {
                  quote: parsed.meta.quote
                }
              };
              break;
            case "JsdocTypeSpecialNamePath":
              if (parsed.specialType === "event")
                right = parsed;
              else
                throw new UnexpectedTypeError(parsed, "Type 'JsdocTypeSpecialNamePath' is only allowed with specialType 'event'");
              break;
            default:
              throw new UnexpectedTypeError(parsed, "Expecting 'JsdocTypeName', 'JsdocTypeNumber', 'JsdocStringValue' or 'JsdocTypeSpecialNamePath'");
          }
          if (brackets && !parser.consume("]")) {
            let token = parser.lexer.current;
            throw new Error(`Unterminated square brackets. Next token is '${token.type}' with text '${token.text}'`);
          }
          return {
            type: "JsdocTypeNamePath",
            left: assertRootResult(left),
            right,
            pathType
          };
        };
      }
      function createNameParslet({ allowedAdditionalTokens }) {
        return composeParslet({
          name: "nameParslet",
          accept: (type) => type === "Identifier" || type === "this" || type === "new" || allowedAdditionalTokens.includes(type),
          parsePrefix: (parser) => {
            let { type, text } = parser.lexer.current;
            return parser.consume(type), {
              type: "JsdocTypeName",
              value: text
            };
          }
        });
      }
      let stringValueParslet = composeParslet({
        name: "stringValueParslet",
        accept: (type) => type === "StringValue",
        parsePrefix: (parser) => {
          let text = parser.lexer.current.text;
          return parser.consume("StringValue"), {
            type: "JsdocTypeStringValue",
            value: text.slice(1, -1),
            meta: {
              quote: text[0] === "'" ? "single" : "double"
            }
          };
        }
      });
      function createSpecialNamePathParslet({ pathGrammar: pathGrammar2, allowedTypes }) {
        return composeParslet({
          name: "specialNamePathParslet",
          accept: (type) => allowedTypes.includes(type),
          parsePrefix: (parser) => {
            let type = parser.lexer.current.type;
            if (parser.consume(type), !parser.consume(":"))
              return {
                type: "JsdocTypeName",
                value: type
              };
            let result, token = parser.lexer.current;
            if (parser.consume("StringValue"))
              result = {
                type: "JsdocTypeSpecialNamePath",
                value: token.text.slice(1, -1),
                specialType: type,
                meta: {
                  quote: token.text[0] === "'" ? "single" : "double"
                }
              };
            else {
              let value = "", allowed = ["Identifier", "@", "/"];
              for (; allowed.some((type2) => parser.consume(type2)); )
                value += token.text, token = parser.lexer.current;
              result = {
                type: "JsdocTypeSpecialNamePath",
                value,
                specialType: type,
                meta: {
                  quote: void 0
                }
              };
            }
            let moduleParser = new Parser(pathGrammar2, parser.lexer, parser), moduleResult = moduleParser.parseInfixIntermediateType(result, Precedence.ALL);
            return parser.acceptLexerState(moduleParser), assertRootResult(moduleResult);
          }
        });
      }
      let basePathGrammar = [
        createNameParslet({
          allowedAdditionalTokens: ["external", "module"]
        }),
        stringValueParslet,
        numberParslet,
        createNamePathParslet({
          allowSquareBracketsOnAnyType: !1,
          allowJsdocNamePaths: !0,
          pathGrammar: null
        })
      ], pathGrammar = [
        ...basePathGrammar,
        createSpecialNamePathParslet({
          allowedTypes: ["event"],
          pathGrammar: basePathGrammar
        })
      ];
      function getParameters(value) {
        let parameters;
        if (value.type === "JsdocTypeParameterList")
          parameters = value.elements;
        else if (value.type === "JsdocTypeParenthesis")
          parameters = [value.element];
        else
          throw new UnexpectedTypeError(value);
        return parameters.map((p) => assertPlainKeyValueOrRootResult(p));
      }
      function getUnnamedParameters(value) {
        let parameters = getParameters(value);
        if (parameters.some((p) => p.type === "JsdocTypeKeyValue"))
          throw new Error("No parameter should be named");
        return parameters;
      }
      function createFunctionParslet({ allowNamedParameters, allowNoReturnType, allowWithoutParenthesis, allowNewAsFunctionKeyword }) {
        return composeParslet({
          name: "functionParslet",
          accept: (type, next) => type === "function" || allowNewAsFunctionKeyword && type === "new" && next === "(",
          parsePrefix: (parser) => {
            let newKeyword = parser.consume("new");
            parser.consume("function");
            let hasParenthesis = parser.lexer.current.type === "(";
            if (!hasParenthesis) {
              if (!allowWithoutParenthesis)
                throw new Error("function is missing parameter list");
              return {
                type: "JsdocTypeName",
                value: "function"
              };
            }
            let result = {
              type: "JsdocTypeFunction",
              parameters: [],
              arrow: !1,
              constructor: newKeyword,
              parenthesis: hasParenthesis
            }, value = parser.parseIntermediateType(Precedence.FUNCTION);
            if (allowNamedParameters === void 0)
              result.parameters = getUnnamedParameters(value);
            else {
              if (newKeyword && value.type === "JsdocTypeFunction" && value.arrow)
                return result = value, result.constructor = !0, result;
              result.parameters = getParameters(value);
              for (let p of result.parameters)
                if (p.type === "JsdocTypeKeyValue" && !allowNamedParameters.includes(p.key))
                  throw new Error(`only allowed named parameters are ${allowNamedParameters.join(", ")} but got ${p.type}`);
            }
            if (parser.consume(":"))
              result.returnType = parser.parseType(Precedence.PREFIX);
            else if (!allowNoReturnType)
              throw new Error("function is missing return type");
            return result;
          }
        });
      }
      function createVariadicParslet({ allowPostfix, allowEnclosingBrackets }) {
        return composeParslet({
          name: "variadicParslet",
          accept: (type) => type === "...",
          precedence: Precedence.PREFIX,
          parsePrefix: (parser) => {
            parser.consume("...");
            let brackets = allowEnclosingBrackets && parser.consume("[");
            try {
              let element = parser.parseType(Precedence.PREFIX);
              if (brackets && !parser.consume("]"))
                throw new Error("Unterminated variadic type. Missing ']'");
              return {
                type: "JsdocTypeVariadic",
                element: assertRootResult(element),
                meta: {
                  position: "prefix",
                  squareBrackets: brackets
                }
              };
            } catch (e) {
              if (e instanceof NoParsletFoundError) {
                if (brackets)
                  throw new Error("Empty square brackets for variadic are not allowed.");
                return {
                  type: "JsdocTypeVariadic",
                  meta: {
                    position: void 0,
                    squareBrackets: !1
                  }
                };
              } else
                throw e;
            }
          },
          parseInfix: allowPostfix ? (parser, left) => (parser.consume("..."), {
            type: "JsdocTypeVariadic",
            element: assertRootResult(left),
            meta: {
              position: "suffix",
              squareBrackets: !1
            }
          }) : void 0
        });
      }
      let symbolParslet = composeParslet({
        name: "symbolParslet",
        accept: (type) => type === "(",
        precedence: Precedence.SYMBOL,
        parseInfix: (parser, left) => {
          if (left.type !== "JsdocTypeName")
            throw new Error("Symbol expects a name on the left side. (Reacting on '(')");
          parser.consume("(");
          let result = {
            type: "JsdocTypeSymbol",
            value: left.value
          };
          if (!parser.consume(")")) {
            let next = parser.parseIntermediateType(Precedence.SYMBOL);
            if (result.element = assertNumberOrVariadicNameResult(next), !parser.consume(")"))
              throw new Error("Symbol does not end after value");
          }
          return result;
        }
      }), arrayBracketsParslet = composeParslet({
        name: "arrayBracketsParslet",
        precedence: Precedence.ARRAY_BRACKETS,
        accept: (type, next) => type === "[" && next === "]",
        parseInfix: (parser, left) => (parser.consume("["), parser.consume("]"), {
          type: "JsdocTypeGeneric",
          left: {
            type: "JsdocTypeName",
            value: "Array"
          },
          elements: [
            assertRootResult(left)
          ],
          meta: {
            brackets: "square",
            dot: !1
          }
        })
      });
      function createObjectParslet({ objectFieldGrammar: objectFieldGrammar2, allowKeyTypes }) {
        return composeParslet({
          name: "objectParslet",
          accept: (type) => type === "{",
          parsePrefix: (parser) => {
            parser.consume("{");
            let result = {
              type: "JsdocTypeObject",
              meta: {
                separator: "comma"
              },
              elements: []
            };
            if (!parser.consume("}")) {
              let separator, fieldParser = new Parser(objectFieldGrammar2, parser.lexer, parser);
              for (; ; ) {
                fieldParser.acceptLexerState(parser);
                let field = fieldParser.parseIntermediateType(Precedence.OBJECT);
                parser.acceptLexerState(fieldParser), field === void 0 && allowKeyTypes && (field = parser.parseIntermediateType(Precedence.OBJECT));
                let optional = !1;
                if (field.type === "JsdocTypeNullable" && (optional = !0, field = field.element), field.type === "JsdocTypeNumber" || field.type === "JsdocTypeName" || field.type === "JsdocTypeStringValue") {
                  let quote2;
                  field.type === "JsdocTypeStringValue" && (quote2 = field.meta.quote), result.elements.push({
                    type: "JsdocTypeObjectField",
                    key: field.value.toString(),
                    right: void 0,
                    optional,
                    readonly: !1,
                    meta: {
                      quote: quote2
                    }
                  });
                } else if (field.type === "JsdocTypeObjectField" || field.type === "JsdocTypeJsdocObjectField")
                  result.elements.push(field);
                else
                  throw new UnexpectedTypeError(field);
                if (parser.lexer.current.startOfLine)
                  separator = "linebreak", parser.consume(",") || parser.consume(";");
                else if (parser.consume(","))
                  separator = "comma";
                else if (parser.consume(";"))
                  separator = "semicolon";
                else
                  break;
                if (parser.lexer.current.type === "}")
                  break;
              }
              if (result.meta.separator = separator ?? "comma", separator === "linebreak" && (result.meta.propertyIndent = "  "), !parser.consume("}"))
                throw new Error("Unterminated record type. Missing '}'");
            }
            return result;
          }
        });
      }
      function createObjectFieldParslet({ allowSquaredProperties, allowKeyTypes, allowReadonly, allowOptional }) {
        return composeParslet({
          name: "objectFieldParslet",
          precedence: Precedence.KEY_VALUE,
          accept: (type) => type === ":",
          parseInfix: (parser, left) => {
            var _a;
            let optional = !1, readonlyProperty = !1;
            allowOptional && left.type === "JsdocTypeNullable" && (optional = !0, left = left.element), allowReadonly && left.type === "JsdocTypeReadonlyProperty" && (readonlyProperty = !0, left = left.element);
            let parentParser = (_a = parser.baseParser) !== null && _a !== void 0 ? _a : parser;
            if (parentParser.acceptLexerState(parser), left.type === "JsdocTypeNumber" || left.type === "JsdocTypeName" || left.type === "JsdocTypeStringValue" || isSquaredProperty(left)) {
              if (isSquaredProperty(left) && !allowSquaredProperties)
                throw new UnexpectedTypeError(left);
              parentParser.consume(":");
              let quote2;
              left.type === "JsdocTypeStringValue" && (quote2 = left.meta.quote);
              let right = parentParser.parseType(Precedence.KEY_VALUE);
              return parser.acceptLexerState(parentParser), {
                type: "JsdocTypeObjectField",
                key: isSquaredProperty(left) ? left : left.value.toString(),
                right,
                optional,
                readonly: readonlyProperty,
                meta: {
                  quote: quote2
                }
              };
            } else {
              if (!allowKeyTypes)
                throw new UnexpectedTypeError(left);
              parentParser.consume(":");
              let right = parentParser.parseType(Precedence.KEY_VALUE);
              return parser.acceptLexerState(parentParser), {
                type: "JsdocTypeJsdocObjectField",
                left: assertRootResult(left),
                right
              };
            }
          }
        });
      }
      function createKeyValueParslet({ allowOptional, allowVariadic }) {
        return composeParslet({
          name: "keyValueParslet",
          precedence: Precedence.KEY_VALUE,
          accept: (type) => type === ":",
          parseInfix: (parser, left) => {
            let optional = !1, variadic = !1;
            if (allowOptional && left.type === "JsdocTypeNullable" && (optional = !0, left = left.element), allowVariadic && left.type === "JsdocTypeVariadic" && left.element !== void 0 && (variadic = !0, left = left.element), left.type !== "JsdocTypeName")
              throw new UnexpectedTypeError(left);
            parser.consume(":");
            let right = parser.parseType(Precedence.KEY_VALUE);
            return {
              type: "JsdocTypeKeyValue",
              key: left.value,
              right,
              optional,
              variadic
            };
          }
        });
      }
      let jsdocBaseGrammar = [
        ...baseGrammar,
        createFunctionParslet({
          allowWithoutParenthesis: !0,
          allowNamedParameters: ["this", "new"],
          allowNoReturnType: !0,
          allowNewAsFunctionKeyword: !1
        }),
        stringValueParslet,
        createSpecialNamePathParslet({
          allowedTypes: ["module", "external", "event"],
          pathGrammar
        }),
        createVariadicParslet({
          allowEnclosingBrackets: !0,
          allowPostfix: !0
        }),
        createNameParslet({
          allowedAdditionalTokens: ["keyof"]
        }),
        symbolParslet,
        arrayBracketsParslet,
        createNamePathParslet({
          allowSquareBracketsOnAnyType: !1,
          allowJsdocNamePaths: !0,
          pathGrammar
        })
      ], jsdocGrammar = [
        ...jsdocBaseGrammar,
        createObjectParslet({
          // jsdoc syntax allows full types as keys, so we need to pull in the full grammar here
          // we leave out the object type deliberately
          objectFieldGrammar: [
            createNameParslet({
              allowedAdditionalTokens: ["typeof", "module", "in"]
            }),
            createObjectFieldParslet({
              allowSquaredProperties: !1,
              allowKeyTypes: !0,
              allowOptional: !1,
              allowReadonly: !1
            }),
            ...jsdocBaseGrammar
          ],
          allowKeyTypes: !0
        }),
        createKeyValueParslet({
          allowOptional: !0,
          allowVariadic: !0
        })
      ], typeOfParslet = composeParslet({
        name: "typeOfParslet",
        accept: (type) => type === "typeof",
        parsePrefix: (parser) => (parser.consume("typeof"), {
          type: "JsdocTypeTypeof",
          element: parser.parseType(Precedence.KEY_OF_TYPE_OF)
        })
      }), objectFieldGrammar$1 = [
        createNameParslet({
          allowedAdditionalTokens: ["typeof", "module", "keyof", "event", "external", "in"]
        }),
        nullableParslet,
        optionalParslet,
        stringValueParslet,
        numberParslet,
        createObjectFieldParslet({
          allowSquaredProperties: !1,
          allowKeyTypes: !1,
          allowOptional: !1,
          allowReadonly: !1
        })
      ], closureGrammar = [
        ...baseGrammar,
        createObjectParslet({
          allowKeyTypes: !1,
          objectFieldGrammar: objectFieldGrammar$1
        }),
        createNameParslet({
          allowedAdditionalTokens: ["event", "external", "in"]
        }),
        typeOfParslet,
        createFunctionParslet({
          allowWithoutParenthesis: !1,
          allowNamedParameters: ["this", "new"],
          allowNoReturnType: !0,
          allowNewAsFunctionKeyword: !1
        }),
        createVariadicParslet({
          allowEnclosingBrackets: !1,
          allowPostfix: !1
        }),
        // additional name parslet is needed for some special cases
        createNameParslet({
          allowedAdditionalTokens: ["keyof"]
        }),
        createSpecialNamePathParslet({
          allowedTypes: ["module"],
          pathGrammar
        }),
        createNamePathParslet({
          allowSquareBracketsOnAnyType: !1,
          allowJsdocNamePaths: !0,
          pathGrammar
        }),
        createKeyValueParslet({
          allowOptional: !1,
          allowVariadic: !1
        }),
        symbolParslet
      ], assertsParslet = composeParslet({
        name: "assertsParslet",
        accept: (type) => type === "asserts",
        parsePrefix: (parser) => {
          parser.consume("asserts");
          let left = parser.parseIntermediateType(Precedence.SYMBOL);
          if (left.type !== "JsdocTypeName")
            throw new UnexpectedTypeError(left, "A typescript asserts always has to have a name on the left side.");
          return parser.consume("is") ? {
            type: "JsdocTypeAsserts",
            left,
            right: assertRootResult(parser.parseIntermediateType(Precedence.INFIX))
          } : {
            type: "JsdocTypeAssertsPlain",
            element: left
          };
        }
      });
      function createTupleParslet({ allowQuestionMark }) {
        return composeParslet({
          name: "tupleParslet",
          accept: (type) => type === "[",
          parsePrefix: (parser) => {
            parser.consume("[");
            let result = {
              type: "JsdocTypeTuple",
              elements: []
            };
            if (parser.consume("]"))
              return result;
            let typeList = parser.parseIntermediateType(Precedence.ALL);
            if (typeList.type === "JsdocTypeParameterList" ? typeList.elements[0].type === "JsdocTypeKeyValue" ? result.elements = typeList.elements.map(assertPlainKeyValueResult) : result.elements = typeList.elements.map(assertRootResult) : typeList.type === "JsdocTypeKeyValue" ? result.elements = [assertPlainKeyValueResult(typeList)] : result.elements = [assertRootResult(typeList)], !parser.consume("]"))
              throw new Error("Unterminated '['");
            if (result.elements.some((e) => e.type === "JsdocTypeUnknown"))
              throw new Error("Question mark in tuple not allowed");
            return result;
          }
        });
      }
      let keyOfParslet = composeParslet({
        name: "keyOfParslet",
        accept: (type) => type === "keyof",
        parsePrefix: (parser) => (parser.consume("keyof"), {
          type: "JsdocTypeKeyof",
          element: assertRootResult(parser.parseType(Precedence.KEY_OF_TYPE_OF))
        })
      }), importParslet = composeParslet({
        name: "importParslet",
        accept: (type) => type === "import",
        parsePrefix: (parser) => {
          if (parser.consume("import"), !parser.consume("("))
            throw new Error("Missing parenthesis after import keyword");
          let path = parser.parseType(Precedence.PREFIX);
          if (path.type !== "JsdocTypeStringValue")
            throw new Error("Only string values are allowed as paths for imports");
          if (!parser.consume(")"))
            throw new Error("Missing closing parenthesis after import keyword");
          return {
            type: "JsdocTypeImport",
            element: path
          };
        }
      }), readonlyPropertyParslet = composeParslet({
        name: "readonlyPropertyParslet",
        accept: (type) => type === "readonly",
        parsePrefix: (parser) => (parser.consume("readonly"), {
          type: "JsdocTypeReadonlyProperty",
          element: parser.parseIntermediateType(Precedence.KEY_VALUE)
        })
      }), arrowFunctionParslet = composeParslet({
        name: "arrowFunctionParslet",
        precedence: Precedence.ARROW,
        accept: (type) => type === "=>",
        parseInfix: (parser, left) => (parser.consume("=>"), {
          type: "JsdocTypeFunction",
          parameters: getParameters(left).map(assertPlainKeyValueOrNameResult),
          arrow: !0,
          constructor: !1,
          parenthesis: !0,
          returnType: parser.parseType(Precedence.OBJECT)
        })
      }), genericArrowFunctionParslet = composeParslet({
        name: "genericArrowFunctionParslet",
        accept: (type) => type === "<",
        parsePrefix: (parser) => {
          let typeParameters = [];
          parser.consume("<");
          do {
            let defaultValue, name = parser.parseIntermediateType(Precedence.SYMBOL);
            if (name.type === "JsdocTypeOptional" && (name = name.element, defaultValue = parser.parseType(Precedence.SYMBOL)), name.type !== "JsdocTypeName")
              throw new UnexpectedTypeError(name);
            let constraint;
            parser.consume("extends") && (constraint = parser.parseType(Precedence.SYMBOL), constraint.type === "JsdocTypeOptional" && (constraint = constraint.element, defaultValue = parser.parseType(Precedence.SYMBOL)));
            let typeParameter = {
              type: "JsdocTypeTypeParameter",
              name
            };
            if (constraint !== void 0 && (typeParameter.constraint = constraint), defaultValue !== void 0 && (typeParameter.defaultValue = defaultValue), typeParameters.push(typeParameter), parser.consume(">"))
              break;
          } while (parser.consume(","));
          let functionBase = parser.parseIntermediateType(Precedence.SYMBOL);
          return functionBase.typeParameters = typeParameters, functionBase;
        }
      }), intersectionParslet = composeParslet({
        name: "intersectionParslet",
        accept: (type) => type === "&",
        precedence: Precedence.INTERSECTION,
        parseInfix: (parser, left) => {
          parser.consume("&");
          let elements = [];
          do
            elements.push(parser.parseType(Precedence.INTERSECTION));
          while (parser.consume("&"));
          return {
            type: "JsdocTypeIntersection",
            elements: [assertRootResult(left), ...elements]
          };
        }
      }), predicateParslet = composeParslet({
        name: "predicateParslet",
        precedence: Precedence.INFIX,
        accept: (type) => type === "is",
        parseInfix: (parser, left) => {
          if (left.type !== "JsdocTypeName")
            throw new UnexpectedTypeError(left, "A typescript predicate always has to have a name on the left side.");
          return parser.consume("is"), {
            type: "JsdocTypePredicate",
            left,
            right: assertRootResult(parser.parseIntermediateType(Precedence.INFIX))
          };
        }
      }), objectSquaredPropertyParslet = composeParslet({
        name: "objectSquareBracketPropertyParslet",
        accept: (type) => type === "[",
        parsePrefix: (parser) => {
          if (parser.baseParser === void 0)
            throw new Error("Only allowed inside object grammar");
          parser.consume("[");
          let key = parser.lexer.current.text;
          parser.consume("Identifier");
          let result;
          if (parser.consume(":")) {
            let parentParser = parser.baseParser;
            parentParser.acceptLexerState(parser), result = {
              type: "JsdocTypeIndexSignature",
              key,
              right: parentParser.parseType(Precedence.INDEX_BRACKETS)
            }, parser.acceptLexerState(parentParser);
          } else if (parser.consume("in")) {
            let parentParser = parser.baseParser;
            parentParser.acceptLexerState(parser), result = {
              type: "JsdocTypeMappedType",
              key,
              right: parentParser.parseType(Precedence.ARRAY_BRACKETS)
            }, parser.acceptLexerState(parentParser);
          } else
            throw new Error("Missing ':' or 'in' inside square bracketed property.");
          if (!parser.consume("]"))
            throw new Error("Unterminated square brackets");
          return result;
        }
      }), readonlyArrayParslet = composeParslet({
        name: "readonlyArrayParslet",
        accept: (type) => type === "readonly",
        parsePrefix: (parser) => (parser.consume("readonly"), {
          type: "JsdocTypeReadonlyArray",
          element: assertArrayOrTupleResult(parser.parseIntermediateType(Precedence.ALL))
        })
      }), conditionalParslet = composeParslet({
        name: "conditionalParslet",
        precedence: Precedence.INFIX,
        accept: (type) => type === "extends",
        parseInfix: (parser, left) => {
          parser.consume("extends");
          let extendsType = parser.parseType(Precedence.KEY_OF_TYPE_OF).element, trueType = parser.parseType(Precedence.INFIX);
          return parser.consume(":"), {
            type: "JsdocTypeConditional",
            checksType: assertRootResult(left),
            extendsType,
            trueType,
            falseType: parser.parseType(Precedence.INFIX)
          };
        }
      }), objectFieldGrammar = [
        readonlyPropertyParslet,
        createNameParslet({
          allowedAdditionalTokens: ["typeof", "module", "keyof", "event", "external", "in"]
        }),
        nullableParslet,
        optionalParslet,
        stringValueParslet,
        numberParslet,
        createObjectFieldParslet({
          allowSquaredProperties: !0,
          allowKeyTypes: !1,
          allowOptional: !0,
          allowReadonly: !0
        }),
        objectSquaredPropertyParslet
      ], typescriptGrammar = [
        ...baseGrammar,
        createObjectParslet({
          allowKeyTypes: !1,
          objectFieldGrammar
        }),
        readonlyArrayParslet,
        typeOfParslet,
        keyOfParslet,
        importParslet,
        stringValueParslet,
        createFunctionParslet({
          allowWithoutParenthesis: !0,
          allowNoReturnType: !1,
          allowNamedParameters: ["this", "new", "args"],
          allowNewAsFunctionKeyword: !0
        }),
        createTupleParslet({
          allowQuestionMark: !1
        }),
        createVariadicParslet({
          allowEnclosingBrackets: !1,
          allowPostfix: !1
        }),
        assertsParslet,
        conditionalParslet,
        createNameParslet({
          allowedAdditionalTokens: ["event", "external", "in"]
        }),
        createSpecialNamePathParslet({
          allowedTypes: ["module"],
          pathGrammar
        }),
        arrayBracketsParslet,
        arrowFunctionParslet,
        genericArrowFunctionParslet,
        createNamePathParslet({
          allowSquareBracketsOnAnyType: !0,
          allowJsdocNamePaths: !1,
          pathGrammar
        }),
        intersectionParslet,
        predicateParslet,
        createKeyValueParslet({
          allowVariadic: !0,
          allowOptional: !0
        })
      ];
      function parse3(expression, mode) {
        switch (mode) {
          case "closure":
            return new Parser(closureGrammar, expression).parse();
          case "jsdoc":
            return new Parser(jsdocGrammar, expression).parse();
          case "typescript":
            return new Parser(typescriptGrammar, expression).parse();
        }
      }
      function tryParse(expression, modes = ["typescript", "closure", "jsdoc"]) {
        let error;
        for (let mode of modes)
          try {
            return parse3(expression, mode);
          } catch (e) {
            error = e;
          }
        throw error;
      }
      function transform(rules2, parseResult) {
        let rule = rules2[parseResult.type];
        if (rule === void 0)
          throw new Error(`In this set of transform rules exists no rule for type ${parseResult.type}.`);
        return rule(parseResult, (aParseResult) => transform(rules2, aParseResult));
      }
      function notAvailableTransform(parseResult) {
        throw new Error("This transform is not available. Are you trying the correct parsing mode?");
      }
      function extractSpecialParams(source) {
        let result = {
          params: []
        };
        for (let param of source.parameters)
          param.type === "JsdocTypeKeyValue" ? param.key === "this" ? result.this = param.right : param.key === "new" ? result.new = param.right : result.params.push(param) : result.params.push(param);
        return result;
      }
      function applyPosition(position, target, value) {
        return position === "prefix" ? value + target : target + value;
      }
      function quote(value, quote2) {
        switch (quote2) {
          case "double":
            return `"${value}"`;
          case "single":
            return `'${value}'`;
          case void 0:
            return value;
        }
      }
      function stringifyRules2() {
        return {
          JsdocTypeParenthesis: (result, transform2) => `(${result.element !== void 0 ? transform2(result.element) : ""})`,
          JsdocTypeKeyof: (result, transform2) => `keyof ${transform2(result.element)}`,
          JsdocTypeFunction: (result, transform2) => {
            var _a;
            if (result.arrow) {
              if (result.returnType === void 0)
                throw new Error("Arrow function needs a return type.");
              let stringified = `${result.typeParameters !== void 0 ? `<${(_a = result.typeParameters.map(transform2).join(", ")) !== null && _a !== void 0 ? _a : ""}>` : ""}(${result.parameters.map(transform2).join(", ")}) => ${transform2(result.returnType)}`;
              return result.constructor && (stringified = "new " + stringified), stringified;
            } else {
              let stringified = result.constructor ? "new" : "function";
              return result.parenthesis && (stringified += `(${result.parameters.map(transform2).join(", ")})`, result.returnType !== void 0 && (stringified += `: ${transform2(result.returnType)}`)), stringified;
            }
          },
          JsdocTypeName: (result) => result.value,
          JsdocTypeTuple: (result, transform2) => `[${result.elements.map(transform2).join(", ")}]`,
          JsdocTypeVariadic: (result, transform2) => result.meta.position === void 0 ? "..." : applyPosition(result.meta.position, transform2(result.element), "..."),
          JsdocTypeNamePath: (result, transform2) => {
            let left = transform2(result.left), right = transform2(result.right);
            switch (result.pathType) {
              case "inner":
                return `${left}~${right}`;
              case "instance":
                return `${left}#${right}`;
              case "property":
                return `${left}.${right}`;
              case "property-brackets":
                return `${left}[${right}]`;
            }
          },
          JsdocTypeStringValue: (result) => quote(result.value, result.meta.quote),
          JsdocTypeAny: () => "*",
          JsdocTypeGeneric: (result, transform2) => {
            if (result.meta.brackets === "square") {
              let element = result.elements[0], transformed = transform2(element);
              return element.type === "JsdocTypeUnion" || element.type === "JsdocTypeIntersection" ? `(${transformed})[]` : `${transformed}[]`;
            } else
              return `${transform2(result.left)}${result.meta.dot ? "." : ""}<${result.infer === !0 ? "infer " : ""}${result.elements.map(transform2).join(", ")}>`;
          },
          JsdocTypeImport: (result, transform2) => `import(${transform2(result.element)})`,
          JsdocTypeObjectField: (result, transform2) => {
            let text = "";
            return result.readonly && (text += "readonly "), typeof result.key == "string" ? text += quote(result.key, result.meta.quote) : text += transform2(result.key), result.optional && (text += "?"), result.right === void 0 ? text : text + `: ${transform2(result.right)}`;
          },
          JsdocTypeJsdocObjectField: (result, transform2) => `${transform2(result.left)}: ${transform2(result.right)}`,
          JsdocTypeKeyValue: (result, transform2) => {
            let text = result.key;
            return result.optional && (text += "?"), result.variadic && (text = "..." + text), result.right === void 0 ? text : text + `: ${transform2(result.right)}`;
          },
          JsdocTypeSpecialNamePath: (result) => `${result.specialType}:${quote(result.value, result.meta.quote)}`,
          JsdocTypeNotNullable: (result, transform2) => applyPosition(result.meta.position, transform2(result.element), "!"),
          JsdocTypeNull: () => "null",
          JsdocTypeNullable: (result, transform2) => applyPosition(result.meta.position, transform2(result.element), "?"),
          JsdocTypeNumber: (result) => result.value.toString(),
          JsdocTypeObject: (result, transform2) => {
            var _a, _b;
            return `{${(result.meta.separator === "linebreak" && result.elements.length > 1 ? `
` + ((_a = result.meta.propertyIndent) !== null && _a !== void 0 ? _a : "") : "") + result.elements.map(transform2).join(result.meta.separator === "comma" ? ", " : result.meta.separator === "linebreak" ? `
` + ((_b = result.meta.propertyIndent) !== null && _b !== void 0 ? _b : "") : "; ") + (result.meta.separator === "linebreak" && result.elements.length > 1 ? `
` : "")}}`;
          },
          JsdocTypeOptional: (result, transform2) => applyPosition(result.meta.position, transform2(result.element), "="),
          JsdocTypeSymbol: (result, transform2) => `${result.value}(${result.element !== void 0 ? transform2(result.element) : ""})`,
          JsdocTypeTypeof: (result, transform2) => `typeof ${transform2(result.element)}`,
          JsdocTypeUndefined: () => "undefined",
          JsdocTypeUnion: (result, transform2) => result.elements.map(transform2).join(" | "),
          JsdocTypeUnknown: () => "?",
          JsdocTypeIntersection: (result, transform2) => result.elements.map(transform2).join(" & "),
          JsdocTypeProperty: (result) => quote(result.value, result.meta.quote),
          JsdocTypePredicate: (result, transform2) => `${transform2(result.left)} is ${transform2(result.right)}`,
          JsdocTypeIndexSignature: (result, transform2) => `[${result.key}: ${transform2(result.right)}]`,
          JsdocTypeMappedType: (result, transform2) => `[${result.key} in ${transform2(result.right)}]`,
          JsdocTypeAsserts: (result, transform2) => `asserts ${transform2(result.left)} is ${transform2(result.right)}`,
          JsdocTypeReadonlyArray: (result, transform2) => `readonly ${transform2(result.element)}`,
          JsdocTypeAssertsPlain: (result, transform2) => `asserts ${transform2(result.element)}`,
          JsdocTypeConditional: (result, transform2) => `${transform2(result.checksType)} extends ${transform2(result.extendsType)} ? ${transform2(result.trueType)} : ${transform2(result.falseType)}`,
          JsdocTypeTypeParameter: (result, transform2) => `${transform2(result.name)}${result.constraint !== void 0 ? ` extends ${transform2(result.constraint)}` : ""}${result.defaultValue !== void 0 ? ` = ${transform2(result.defaultValue)}` : ""}`
        };
      }
      let storedStringifyRules = stringifyRules2();
      function stringify2(result) {
        return transform(storedStringifyRules, result);
      }
      let reservedWords = [
        "null",
        "true",
        "false",
        "break",
        "case",
        "catch",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "else",
        "export",
        "extends",
        "finally",
        "for",
        "function",
        "if",
        "import",
        "in",
        "instanceof",
        "new",
        "return",
        "super",
        "switch",
        "this",
        "throw",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        "yield"
      ];
      function makeName(value) {
        let result = {
          type: "NameExpression",
          name: value
        };
        return reservedWords.includes(value) && (result.reservedWord = !0), result;
      }
      let catharsisTransformRules = {
        JsdocTypeOptional: (result, transform2) => {
          let transformed = transform2(result.element);
          return transformed.optional = !0, transformed;
        },
        JsdocTypeNullable: (result, transform2) => {
          let transformed = transform2(result.element);
          return transformed.nullable = !0, transformed;
        },
        JsdocTypeNotNullable: (result, transform2) => {
          let transformed = transform2(result.element);
          return transformed.nullable = !1, transformed;
        },
        JsdocTypeVariadic: (result, transform2) => {
          if (result.element === void 0)
            throw new Error("dots without value are not allowed in catharsis mode");
          let transformed = transform2(result.element);
          return transformed.repeatable = !0, transformed;
        },
        JsdocTypeAny: () => ({
          type: "AllLiteral"
        }),
        JsdocTypeNull: () => ({
          type: "NullLiteral"
        }),
        JsdocTypeStringValue: (result) => makeName(quote(result.value, result.meta.quote)),
        JsdocTypeUndefined: () => ({
          type: "UndefinedLiteral"
        }),
        JsdocTypeUnknown: () => ({
          type: "UnknownLiteral"
        }),
        JsdocTypeFunction: (result, transform2) => {
          let params = extractSpecialParams(result), transformed = {
            type: "FunctionType",
            params: params.params.map(transform2)
          };
          return params.this !== void 0 && (transformed.this = transform2(params.this)), params.new !== void 0 && (transformed.new = transform2(params.new)), result.returnType !== void 0 && (transformed.result = transform2(result.returnType)), transformed;
        },
        JsdocTypeGeneric: (result, transform2) => ({
          type: "TypeApplication",
          applications: result.elements.map((o) => transform2(o)),
          expression: transform2(result.left)
        }),
        JsdocTypeSpecialNamePath: (result) => makeName(result.specialType + ":" + quote(result.value, result.meta.quote)),
        JsdocTypeName: (result) => result.value !== "function" ? makeName(result.value) : {
          type: "FunctionType",
          params: []
        },
        JsdocTypeNumber: (result) => makeName(result.value.toString()),
        JsdocTypeObject: (result, transform2) => {
          let transformed = {
            type: "RecordType",
            fields: []
          };
          for (let field of result.elements)
            field.type !== "JsdocTypeObjectField" && field.type !== "JsdocTypeJsdocObjectField" ? transformed.fields.push({
              type: "FieldType",
              key: transform2(field),
              value: void 0
            }) : transformed.fields.push(transform2(field));
          return transformed;
        },
        JsdocTypeObjectField: (result, transform2) => {
          if (typeof result.key != "string")
            throw new Error("Index signatures and mapped types are not supported");
          return {
            type: "FieldType",
            key: makeName(quote(result.key, result.meta.quote)),
            value: result.right === void 0 ? void 0 : transform2(result.right)
          };
        },
        JsdocTypeJsdocObjectField: (result, transform2) => ({
          type: "FieldType",
          key: transform2(result.left),
          value: transform2(result.right)
        }),
        JsdocTypeUnion: (result, transform2) => ({
          type: "TypeUnion",
          elements: result.elements.map((e) => transform2(e))
        }),
        JsdocTypeKeyValue: (result, transform2) => ({
          type: "FieldType",
          key: makeName(result.key),
          value: result.right === void 0 ? void 0 : transform2(result.right)
        }),
        JsdocTypeNamePath: (result, transform2) => {
          let leftResult = transform2(result.left), rightValue;
          result.right.type === "JsdocTypeSpecialNamePath" ? rightValue = transform2(result.right).name : rightValue = quote(result.right.value, result.right.meta.quote);
          let joiner = result.pathType === "inner" ? "~" : result.pathType === "instance" ? "#" : ".";
          return makeName(`${leftResult.name}${joiner}${rightValue}`);
        },
        JsdocTypeSymbol: (result) => {
          let value = "", element = result.element, trailingDots = !1;
          return element?.type === "JsdocTypeVariadic" && (element.meta.position === "prefix" ? value = "..." : trailingDots = !0, element = element.element), element?.type === "JsdocTypeName" ? value += element.value : element?.type === "JsdocTypeNumber" && (value += element.value.toString()), trailingDots && (value += "..."), makeName(`${result.value}(${value})`);
        },
        JsdocTypeParenthesis: (result, transform2) => transform2(assertRootResult(result.element)),
        JsdocTypeMappedType: notAvailableTransform,
        JsdocTypeIndexSignature: notAvailableTransform,
        JsdocTypeImport: notAvailableTransform,
        JsdocTypeKeyof: notAvailableTransform,
        JsdocTypeTuple: notAvailableTransform,
        JsdocTypeTypeof: notAvailableTransform,
        JsdocTypeIntersection: notAvailableTransform,
        JsdocTypeProperty: notAvailableTransform,
        JsdocTypePredicate: notAvailableTransform,
        JsdocTypeAsserts: notAvailableTransform,
        JsdocTypeReadonlyArray: notAvailableTransform,
        JsdocTypeAssertsPlain: notAvailableTransform,
        JsdocTypeConditional: notAvailableTransform,
        JsdocTypeTypeParameter: notAvailableTransform
      };
      function catharsisTransform(result) {
        return transform(catharsisTransformRules, result);
      }
      function getQuoteStyle(quote2) {
        switch (quote2) {
          case void 0:
            return "none";
          case "single":
            return "single";
          case "double":
            return "double";
        }
      }
      function getMemberType(type) {
        switch (type) {
          case "inner":
            return "INNER_MEMBER";
          case "instance":
            return "INSTANCE_MEMBER";
          case "property":
            return "MEMBER";
          case "property-brackets":
            return "MEMBER";
        }
      }
      function nestResults(type, results) {
        return results.length === 2 ? {
          type,
          left: results[0],
          right: results[1]
        } : {
          type,
          left: results[0],
          right: nestResults(type, results.slice(1))
        };
      }
      let jtpRules = {
        JsdocTypeOptional: (result, transform2) => ({
          type: "OPTIONAL",
          value: transform2(result.element),
          meta: {
            syntax: result.meta.position === "prefix" ? "PREFIX_EQUAL_SIGN" : "SUFFIX_EQUALS_SIGN"
          }
        }),
        JsdocTypeNullable: (result, transform2) => ({
          type: "NULLABLE",
          value: transform2(result.element),
          meta: {
            syntax: result.meta.position === "prefix" ? "PREFIX_QUESTION_MARK" : "SUFFIX_QUESTION_MARK"
          }
        }),
        JsdocTypeNotNullable: (result, transform2) => ({
          type: "NOT_NULLABLE",
          value: transform2(result.element),
          meta: {
            syntax: result.meta.position === "prefix" ? "PREFIX_BANG" : "SUFFIX_BANG"
          }
        }),
        JsdocTypeVariadic: (result, transform2) => {
          let transformed = {
            type: "VARIADIC",
            meta: {
              syntax: result.meta.position === "prefix" ? "PREFIX_DOTS" : result.meta.position === "suffix" ? "SUFFIX_DOTS" : "ONLY_DOTS"
            }
          };
          return result.element !== void 0 && (transformed.value = transform2(result.element)), transformed;
        },
        JsdocTypeName: (result) => ({
          type: "NAME",
          name: result.value
        }),
        JsdocTypeTypeof: (result, transform2) => ({
          type: "TYPE_QUERY",
          name: transform2(result.element)
        }),
        JsdocTypeTuple: (result, transform2) => ({
          type: "TUPLE",
          entries: result.elements.map(transform2)
        }),
        JsdocTypeKeyof: (result, transform2) => ({
          type: "KEY_QUERY",
          value: transform2(result.element)
        }),
        JsdocTypeImport: (result) => ({
          type: "IMPORT",
          path: {
            type: "STRING_VALUE",
            quoteStyle: getQuoteStyle(result.element.meta.quote),
            string: result.element.value
          }
        }),
        JsdocTypeUndefined: () => ({
          type: "NAME",
          name: "undefined"
        }),
        JsdocTypeAny: () => ({
          type: "ANY"
        }),
        JsdocTypeFunction: (result, transform2) => {
          let specialParams = extractSpecialParams(result), transformed = {
            type: result.arrow ? "ARROW" : "FUNCTION",
            params: specialParams.params.map((param) => {
              if (param.type === "JsdocTypeKeyValue") {
                if (param.right === void 0)
                  throw new Error("Function parameter without ':' is not expected to be 'KEY_VALUE'");
                return {
                  type: "NAMED_PARAMETER",
                  name: param.key,
                  typeName: transform2(param.right)
                };
              } else
                return transform2(param);
            }),
            new: null,
            returns: null
          };
          return specialParams.this !== void 0 ? transformed.this = transform2(specialParams.this) : result.arrow || (transformed.this = null), specialParams.new !== void 0 && (transformed.new = transform2(specialParams.new)), result.returnType !== void 0 && (transformed.returns = transform2(result.returnType)), transformed;
        },
        JsdocTypeGeneric: (result, transform2) => {
          let transformed = {
            type: "GENERIC",
            subject: transform2(result.left),
            objects: result.elements.map(transform2),
            meta: {
              syntax: result.meta.brackets === "square" ? "SQUARE_BRACKET" : result.meta.dot ? "ANGLE_BRACKET_WITH_DOT" : "ANGLE_BRACKET"
            }
          };
          return result.meta.brackets === "square" && result.elements[0].type === "JsdocTypeFunction" && !result.elements[0].parenthesis && (transformed.objects[0] = {
            type: "NAME",
            name: "function"
          }), transformed;
        },
        JsdocTypeObjectField: (result, transform2) => {
          if (typeof result.key != "string")
            throw new Error("Index signatures and mapped types are not supported");
          if (result.right === void 0)
            return {
              type: "RECORD_ENTRY",
              key: result.key,
              quoteStyle: getQuoteStyle(result.meta.quote),
              value: null,
              readonly: !1
            };
          let right = transform2(result.right);
          return result.optional && (right = {
            type: "OPTIONAL",
            value: right,
            meta: {
              syntax: "SUFFIX_KEY_QUESTION_MARK"
            }
          }), {
            type: "RECORD_ENTRY",
            key: result.key.toString(),
            quoteStyle: getQuoteStyle(result.meta.quote),
            value: right,
            readonly: !1
          };
        },
        JsdocTypeJsdocObjectField: () => {
          throw new Error("Keys may not be typed in jsdoctypeparser.");
        },
        JsdocTypeKeyValue: (result, transform2) => {
          if (result.right === void 0)
            return {
              type: "RECORD_ENTRY",
              key: result.key,
              quoteStyle: "none",
              value: null,
              readonly: !1
            };
          let right = transform2(result.right);
          return result.optional && (right = {
            type: "OPTIONAL",
            value: right,
            meta: {
              syntax: "SUFFIX_KEY_QUESTION_MARK"
            }
          }), {
            type: "RECORD_ENTRY",
            key: result.key,
            quoteStyle: "none",
            value: right,
            readonly: !1
          };
        },
        JsdocTypeObject: (result, transform2) => {
          let entries = [];
          for (let field of result.elements)
            (field.type === "JsdocTypeObjectField" || field.type === "JsdocTypeJsdocObjectField") && entries.push(transform2(field));
          return {
            type: "RECORD",
            entries
          };
        },
        JsdocTypeSpecialNamePath: (result) => {
          if (result.specialType !== "module")
            throw new Error(`jsdoctypeparser does not support type ${result.specialType} at this point.`);
          return {
            type: "MODULE",
            value: {
              type: "FILE_PATH",
              quoteStyle: getQuoteStyle(result.meta.quote),
              path: result.value
            }
          };
        },
        JsdocTypeNamePath: (result, transform2) => {
          let hasEventPrefix = !1, name, quoteStyle;
          result.right.type === "JsdocTypeSpecialNamePath" && result.right.specialType === "event" ? (hasEventPrefix = !0, name = result.right.value, quoteStyle = getQuoteStyle(result.right.meta.quote)) : (name = result.right.value, quoteStyle = getQuoteStyle(result.right.meta.quote));
          let transformed = {
            type: getMemberType(result.pathType),
            owner: transform2(result.left),
            name,
            quoteStyle,
            hasEventPrefix
          };
          if (transformed.owner.type === "MODULE") {
            let tModule = transformed.owner;
            return transformed.owner = transformed.owner.value, tModule.value = transformed, tModule;
          } else
            return transformed;
        },
        JsdocTypeUnion: (result, transform2) => nestResults("UNION", result.elements.map(transform2)),
        JsdocTypeParenthesis: (result, transform2) => ({
          type: "PARENTHESIS",
          value: transform2(assertRootResult(result.element))
        }),
        JsdocTypeNull: () => ({
          type: "NAME",
          name: "null"
        }),
        JsdocTypeUnknown: () => ({
          type: "UNKNOWN"
        }),
        JsdocTypeStringValue: (result) => ({
          type: "STRING_VALUE",
          quoteStyle: getQuoteStyle(result.meta.quote),
          string: result.value
        }),
        JsdocTypeIntersection: (result, transform2) => nestResults("INTERSECTION", result.elements.map(transform2)),
        JsdocTypeNumber: (result) => ({
          type: "NUMBER_VALUE",
          number: result.value.toString()
        }),
        JsdocTypeSymbol: notAvailableTransform,
        JsdocTypeProperty: notAvailableTransform,
        JsdocTypePredicate: notAvailableTransform,
        JsdocTypeMappedType: notAvailableTransform,
        JsdocTypeIndexSignature: notAvailableTransform,
        JsdocTypeAsserts: notAvailableTransform,
        JsdocTypeReadonlyArray: notAvailableTransform,
        JsdocTypeAssertsPlain: notAvailableTransform,
        JsdocTypeConditional: notAvailableTransform,
        JsdocTypeTypeParameter: notAvailableTransform
      };
      function jtpTransform(result) {
        return transform(jtpRules, result);
      }
      function identityTransformRules() {
        return {
          JsdocTypeIntersection: (result, transform2) => ({
            type: "JsdocTypeIntersection",
            elements: result.elements.map(transform2)
          }),
          JsdocTypeGeneric: (result, transform2) => ({
            type: "JsdocTypeGeneric",
            left: transform2(result.left),
            elements: result.elements.map(transform2),
            meta: {
              dot: result.meta.dot,
              brackets: result.meta.brackets
            }
          }),
          JsdocTypeNullable: (result) => result,
          JsdocTypeUnion: (result, transform2) => ({
            type: "JsdocTypeUnion",
            elements: result.elements.map(transform2)
          }),
          JsdocTypeUnknown: (result) => result,
          JsdocTypeUndefined: (result) => result,
          JsdocTypeTypeof: (result, transform2) => ({
            type: "JsdocTypeTypeof",
            element: transform2(result.element)
          }),
          JsdocTypeSymbol: (result, transform2) => {
            let transformed = {
              type: "JsdocTypeSymbol",
              value: result.value
            };
            return result.element !== void 0 && (transformed.element = transform2(result.element)), transformed;
          },
          JsdocTypeOptional: (result, transform2) => ({
            type: "JsdocTypeOptional",
            element: transform2(result.element),
            meta: {
              position: result.meta.position
            }
          }),
          JsdocTypeObject: (result, transform2) => ({
            type: "JsdocTypeObject",
            meta: {
              separator: "comma"
            },
            elements: result.elements.map(transform2)
          }),
          JsdocTypeNumber: (result) => result,
          JsdocTypeNull: (result) => result,
          JsdocTypeNotNullable: (result, transform2) => ({
            type: "JsdocTypeNotNullable",
            element: transform2(result.element),
            meta: {
              position: result.meta.position
            }
          }),
          JsdocTypeSpecialNamePath: (result) => result,
          JsdocTypeObjectField: (result, transform2) => ({
            type: "JsdocTypeObjectField",
            key: result.key,
            right: result.right === void 0 ? void 0 : transform2(result.right),
            optional: result.optional,
            readonly: result.readonly,
            meta: result.meta
          }),
          JsdocTypeJsdocObjectField: (result, transform2) => ({
            type: "JsdocTypeJsdocObjectField",
            left: transform2(result.left),
            right: transform2(result.right)
          }),
          JsdocTypeKeyValue: (result, transform2) => ({
            type: "JsdocTypeKeyValue",
            key: result.key,
            right: result.right === void 0 ? void 0 : transform2(result.right),
            optional: result.optional,
            variadic: result.variadic
          }),
          JsdocTypeImport: (result, transform2) => ({
            type: "JsdocTypeImport",
            element: transform2(result.element)
          }),
          JsdocTypeAny: (result) => result,
          JsdocTypeStringValue: (result) => result,
          JsdocTypeNamePath: (result) => result,
          JsdocTypeVariadic: (result, transform2) => {
            let transformed = {
              type: "JsdocTypeVariadic",
              meta: {
                position: result.meta.position,
                squareBrackets: result.meta.squareBrackets
              }
            };
            return result.element !== void 0 && (transformed.element = transform2(result.element)), transformed;
          },
          JsdocTypeTuple: (result, transform2) => ({
            type: "JsdocTypeTuple",
            elements: result.elements.map(transform2)
          }),
          JsdocTypeName: (result) => result,
          JsdocTypeFunction: (result, transform2) => {
            let transformed = {
              type: "JsdocTypeFunction",
              arrow: result.arrow,
              parameters: result.parameters.map(transform2),
              constructor: result.constructor,
              parenthesis: result.parenthesis
            };
            return result.returnType !== void 0 && (transformed.returnType = transform2(result.returnType)), transformed;
          },
          JsdocTypeKeyof: (result, transform2) => ({
            type: "JsdocTypeKeyof",
            element: transform2(result.element)
          }),
          JsdocTypeParenthesis: (result, transform2) => ({
            type: "JsdocTypeParenthesis",
            element: transform2(result.element)
          }),
          JsdocTypeProperty: (result) => result,
          JsdocTypePredicate: (result, transform2) => ({
            type: "JsdocTypePredicate",
            left: transform2(result.left),
            right: transform2(result.right)
          }),
          JsdocTypeIndexSignature: (result, transform2) => ({
            type: "JsdocTypeIndexSignature",
            key: result.key,
            right: transform2(result.right)
          }),
          JsdocTypeMappedType: (result, transform2) => ({
            type: "JsdocTypeMappedType",
            key: result.key,
            right: transform2(result.right)
          }),
          JsdocTypeAsserts: (result, transform2) => ({
            type: "JsdocTypeAsserts",
            left: transform2(result.left),
            right: transform2(result.right)
          }),
          JsdocTypeReadonlyArray: (result, transform2) => ({
            type: "JsdocTypeReadonlyArray",
            element: transform2(result.element)
          }),
          JsdocTypeAssertsPlain: (result, transform2) => ({
            type: "JsdocTypeAssertsPlain",
            element: transform2(result.element)
          }),
          JsdocTypeConditional: (result, transform2) => ({
            type: "JsdocTypeConditional",
            checksType: transform2(result.checksType),
            extendsType: transform2(result.extendsType),
            trueType: transform2(result.trueType),
            falseType: transform2(result.falseType)
          }),
          JsdocTypeTypeParameter: (result, transform2) => ({
            type: "JsdocTypeTypeParameter",
            name: transform2(result.name),
            constraint: result.constraint !== void 0 ? transform2(result.constraint) : void 0,
            defaultValue: result.defaultValue !== void 0 ? transform2(result.defaultValue) : void 0
          })
        };
      }
      let visitorKeys = {
        JsdocTypeAny: [],
        JsdocTypeFunction: ["parameters", "returnType"],
        JsdocTypeGeneric: ["left", "elements"],
        JsdocTypeImport: [],
        JsdocTypeIndexSignature: ["right"],
        JsdocTypeIntersection: ["elements"],
        JsdocTypeKeyof: ["element"],
        JsdocTypeKeyValue: ["right"],
        JsdocTypeMappedType: ["right"],
        JsdocTypeName: [],
        JsdocTypeNamePath: ["left", "right"],
        JsdocTypeNotNullable: ["element"],
        JsdocTypeNull: [],
        JsdocTypeNullable: ["element"],
        JsdocTypeNumber: [],
        JsdocTypeObject: ["elements"],
        JsdocTypeObjectField: ["right"],
        JsdocTypeJsdocObjectField: ["left", "right"],
        JsdocTypeOptional: ["element"],
        JsdocTypeParenthesis: ["element"],
        JsdocTypeSpecialNamePath: [],
        JsdocTypeStringValue: [],
        JsdocTypeSymbol: ["element"],
        JsdocTypeTuple: ["elements"],
        JsdocTypeTypeof: ["element"],
        JsdocTypeUndefined: [],
        JsdocTypeUnion: ["elements"],
        JsdocTypeUnknown: [],
        JsdocTypeVariadic: ["element"],
        JsdocTypeProperty: [],
        JsdocTypePredicate: ["left", "right"],
        JsdocTypeAsserts: ["left", "right"],
        JsdocTypeReadonlyArray: ["element"],
        JsdocTypeAssertsPlain: ["element"],
        JsdocTypeConditional: ["checksType", "extendsType", "trueType", "falseType"],
        JsdocTypeTypeParameter: ["name", "constraint", "defaultValue"]
      };
      function _traverse(node, parentNode, property, onEnter, onLeave) {
        onEnter?.(node, parentNode, property);
        let keysToVisit = visitorKeys[node.type];
        for (let key of keysToVisit) {
          let value = node[key];
          if (value !== void 0)
            if (Array.isArray(value))
              for (let element of value)
                _traverse(element, node, key, onEnter, onLeave);
            else
              _traverse(value, node, key, onEnter, onLeave);
        }
        onLeave?.(node, parentNode, property);
      }
      function traverse(node, onEnter, onLeave) {
        _traverse(node, void 0, void 0, onEnter, onLeave);
      }
      exports2.catharsisTransform = catharsisTransform, exports2.identityTransformRules = identityTransformRules, exports2.jtpTransform = jtpTransform, exports2.parse = parse3, exports2.stringify = stringify2, exports2.stringifyRules = stringifyRules2, exports2.transform = transform, exports2.traverse = traverse, exports2.tryParse = tryParse, exports2.visitorKeys = visitorKeys;
    }));
  }
});

// src/docs-tools/argTypes/convert/flow/convert.ts
import { UnknownArgTypesError } from "storybook/internal/preview-errors";
var isLiteral = (type) => type.name === "literal", toEnumOption = (element) => element.value.replace(/['|"]/g, ""), convertSig = (type) => {
  switch (type.type) {
    case "function":
      return { name: "function" };
    case "object":
      let values = {};
      return type.signature.properties.forEach((prop) => {
        values[prop.key] = convert(prop.value);
      }), {
        name: "object",
        value: values
      };
    default:
      throw new UnknownArgTypesError({ type, language: "Flow" });
  }
}, convert = (type) => {
  let { name, raw } = type, base = {};
  switch (typeof raw < "u" && (base.raw = raw), type.name) {
    case "literal":
      return { ...base, name: "other", value: type.value };
    case "string":
    case "number":
    case "symbol":
    case "boolean":
      return { ...base, name };
    case "Array":
      return { ...base, name: "array", value: type.elements.map(convert) };
    case "signature":
      return { ...base, ...convertSig(type) };
    case "union":
      return type.elements?.every(isLiteral) ? { ...base, name: "enum", value: type.elements?.map(toEnumOption) } : { ...base, name, value: type.elements?.map(convert) };
    case "intersection":
      return { ...base, name, value: type.elements?.map(convert) };
    default:
      return { ...base, name: "other", value: name };
  }
};

// src/docs-tools/argTypes/convert/utils.ts
var QUOTE_REGEX = /^['"]|['"]$/g, trimQuotes = (str2) => str2.replace(QUOTE_REGEX, ""), includesQuotes = (str2) => QUOTE_REGEX.test(str2), parseLiteral = (str2) => {
  let trimmedValue = trimQuotes(str2);
  return includesQuotes(str2) || Number.isNaN(Number(trimmedValue)) ? trimmedValue : Number(trimmedValue);
};

// src/docs-tools/argTypes/convert/proptypes/convert.ts
var SIGNATURE_REGEXP = /^\(.*\) => /, convert2 = (type) => {
  let { name, raw, computed, value } = type, base = {};
  switch (typeof raw < "u" && (base.raw = raw), name) {
    case "enum": {
      let values2 = computed ? value : value.map((v) => parseLiteral(v.value));
      return { ...base, name, value: values2 };
    }
    case "string":
    case "number":
    case "symbol":
      return { ...base, name };
    case "func":
      return { ...base, name: "function" };
    case "bool":
    case "boolean":
      return { ...base, name: "boolean" };
    case "arrayOf":
    case "array":
      return { ...base, name: "array", value: value && convert2(value) };
    case "object":
      return { ...base, name };
    case "objectOf":
      return { ...base, name, value: convert2(value) };
    case "shape":
    case "exact":
      let values = mapValues(value, (field) => convert2(field));
      return { ...base, name: "object", value: values };
    case "union":
      return { ...base, name: "union", value: value.map((v) => convert2(v)) };
    case "instanceOf":
    case "element":
    case "elementType":
    default: {
      if (name?.indexOf("|") > 0)
        try {
          let literalValues = name.split("|").map((v) => JSON.parse(v));
          return { ...base, name: "enum", value: literalValues };
        } catch {
        }
      let otherVal = value ? `${name}(${value})` : name, otherName = SIGNATURE_REGEXP.test(name) ? "function" : "other";
      return { ...base, name: otherName, value: otherVal };
    }
  }
};

// src/docs-tools/argTypes/convert/typescript/convert.ts
import { UnknownArgTypesError as UnknownArgTypesError2 } from "storybook/internal/preview-errors";
var convertSig2 = (type) => {
  switch (type.type) {
    case "function":
      return { name: "function" };
    case "object":
      let values = {};
      return type.signature.properties.forEach((prop) => {
        values[prop.key] = convert3(prop.value);
      }), {
        name: "object",
        value: values
      };
    default:
      throw new UnknownArgTypesError2({ type, language: "Typescript" });
  }
}, convert3 = (type) => {
  let { name, raw } = type, base = {};
  switch (typeof raw < "u" && (base.raw = raw), type.name) {
    case "string":
    case "number":
    case "symbol":
    case "boolean":
      return { ...base, name };
    case "Array":
      return { ...base, name: "array", value: type.elements.map(convert3) };
    case "signature":
      return { ...base, ...convertSig2(type) };
    case "union":
      let result;
      return type.elements?.every((element) => element.name === "literal") ? result = {
        ...base,
        name: "enum",
        // @ts-expect-error fix types
        value: type.elements?.map((v) => parseLiteral(v.value))
      } : result = { ...base, name, value: type.elements?.map(convert3) }, result;
    case "intersection":
      return { ...base, name, value: type.elements?.map(convert3) };
    default:
      return { ...base, name: "other", value: name };
  }
};

// src/docs-tools/argTypes/convert/index.ts
var convert4 = (docgenInfo) => {
  let { type, tsType, flowType } = docgenInfo;
  try {
    if (type != null)
      return convert2(type);
    if (tsType != null)
      return convert3(tsType);
    if (flowType != null)
      return convert(flowType);
  } catch (err) {
    console.error(err);
  }
  return null;
};

// src/docs-tools/argTypes/docgen/types.ts
var TypeSystem = /* @__PURE__ */ ((TypeSystem2) => (TypeSystem2.JAVASCRIPT = "JavaScript", TypeSystem2.FLOW = "Flow", TypeSystem2.TYPESCRIPT = "TypeScript", TypeSystem2.UNKNOWN = "Unknown", TypeSystem2))(TypeSystem || {});

// src/docs-tools/argTypes/docgen/utils/defaultValue.ts
var BLACKLIST = ["null", "undefined"];
function isDefaultValueBlacklisted(value) {
  return BLACKLIST.some((x) => x === value);
}

// src/docs-tools/argTypes/docgen/utils/string.ts
var str = (obj) => {
  if (!obj)
    return "";
  if (typeof obj == "string")
    return obj;
  throw new Error(`Description: expected string, got: ${JSON.stringify(obj)}`);
};

// src/docs-tools/argTypes/docgen/utils/docgenInfo.ts
function hasDocgen(component) {
  return !!component.__docgenInfo;
}
function isValidDocgenSection(docgenSection) {
  return docgenSection != null && Object.keys(docgenSection).length > 0;
}
function getDocgenSection(component, section) {
  return hasDocgen(component) ? component.__docgenInfo[section] : null;
}
function getDocgenDescription(component) {
  return hasDocgen(component) ? str(component.__docgenInfo.description) : "";
}

// ../node_modules/comment-parser/es6/primitives.js
var Markers;
(function(Markers2) {
  Markers2.start = "/**", Markers2.nostart = "/***", Markers2.delim = "*", Markers2.end = "*/";
})(Markers = Markers || (Markers = {}));

// ../node_modules/comment-parser/es6/util.js
function isSpace(source) {
  return /^\s+$/.test(source);
}
function splitCR(source) {
  let matches = source.match(/\r+$/);
  return matches == null ? ["", source] : [source.slice(-matches[0].length), source.slice(0, -matches[0].length)];
}
function splitSpace(source) {
  let matches = source.match(/^\s+/);
  return matches == null ? ["", source] : [source.slice(0, matches[0].length), source.slice(matches[0].length)];
}
function splitLines(source) {
  return source.split(/\n/);
}
function seedSpec(spec = {}) {
  return Object.assign({ tag: "", name: "", type: "", optional: !1, description: "", problems: [], source: [] }, spec);
}
function seedTokens(tokens = {}) {
  return Object.assign({ start: "", delimiter: "", postDelimiter: "", tag: "", postTag: "", name: "", postName: "", type: "", postType: "", description: "", end: "", lineEnd: "" }, tokens);
}

// ../node_modules/comment-parser/es6/parser/block-parser.js
var reTag = /^@\S+/;
function getParser({ fence = "```" } = {}) {
  let fencer = getFencer(fence), toggleFence = (source, isFenced) => fencer(source) ? !isFenced : isFenced;
  return function(source) {
    let sections = [[]], isFenced = !1;
    for (let line of source)
      reTag.test(line.tokens.description) && !isFenced ? sections.push([line]) : sections[sections.length - 1].push(line), isFenced = toggleFence(line.tokens.description, isFenced);
    return sections;
  };
}
function getFencer(fence) {
  return typeof fence == "string" ? (source) => source.split(fence).length % 2 === 0 : fence;
}

// ../node_modules/comment-parser/es6/parser/source-parser.js
function getParser2({ startLine = 0, markers = Markers } = {}) {
  let block = null, num = startLine;
  return function(source) {
    let rest = source, tokens = seedTokens();
    if ([tokens.lineEnd, rest] = splitCR(rest), [tokens.start, rest] = splitSpace(rest), block === null && rest.startsWith(markers.start) && !rest.startsWith(markers.nostart) && (block = [], tokens.delimiter = rest.slice(0, markers.start.length), rest = rest.slice(markers.start.length), [tokens.postDelimiter, rest] = splitSpace(rest)), block === null)
      return num++, null;
    let isClosed = rest.trimRight().endsWith(markers.end);
    if (tokens.delimiter === "" && rest.startsWith(markers.delim) && !rest.startsWith(markers.end) && (tokens.delimiter = markers.delim, rest = rest.slice(markers.delim.length), [tokens.postDelimiter, rest] = splitSpace(rest)), isClosed) {
      let trimmed = rest.trimRight();
      tokens.end = rest.slice(trimmed.length - markers.end.length), rest = trimmed.slice(0, -markers.end.length);
    }
    if (tokens.description = rest, block.push({ number: num, source, tokens }), num++, isClosed) {
      let result = block.slice();
      return block = null, result;
    }
    return null;
  };
}

// ../node_modules/comment-parser/es6/parser/spec-parser.js
function getParser3({ tokenizers }) {
  return function(source) {
    var _a;
    let spec = seedSpec({ source });
    for (let tokenize of tokenizers)
      if (spec = tokenize(spec), !((_a = spec.problems[spec.problems.length - 1]) === null || _a === void 0) && _a.critical)
        break;
    return spec;
  };
}

// ../node_modules/comment-parser/es6/parser/tokenizers/tag.js
function tagTokenizer() {
  return (spec) => {
    let { tokens } = spec.source[0], match = tokens.description.match(/\s*(@(\S+))(\s*)/);
    return match === null ? (spec.problems.push({
      code: "spec:tag:prefix",
      message: 'tag should start with "@" symbol',
      line: spec.source[0].number,
      critical: !0
    }), spec) : (tokens.tag = match[1], tokens.postTag = match[3], tokens.description = tokens.description.slice(match[0].length), spec.tag = match[2], spec);
  };
}

// ../node_modules/comment-parser/es6/parser/tokenizers/type.js
function typeTokenizer(spacing = "compact") {
  let join2 = getJoiner(spacing);
  return (spec) => {
    let curlies = 0, lines = [];
    for (let [i, { tokens }] of spec.source.entries()) {
      let type = "";
      if (i === 0 && tokens.description[0] !== "{")
        return spec;
      for (let ch of tokens.description)
        if (ch === "{" && curlies++, ch === "}" && curlies--, type += ch, curlies === 0)
          break;
      if (lines.push([tokens, type]), curlies === 0)
        break;
    }
    if (curlies !== 0)
      return spec.problems.push({
        code: "spec:type:unpaired-curlies",
        message: "unpaired curlies",
        line: spec.source[0].number,
        critical: !0
      }), spec;
    let parts = [], offset = lines[0][0].postDelimiter.length;
    for (let [i, [tokens, type]] of lines.entries())
      tokens.type = type, i > 0 && (tokens.type = tokens.postDelimiter.slice(offset) + type, tokens.postDelimiter = tokens.postDelimiter.slice(0, offset)), [tokens.postType, tokens.description] = splitSpace(tokens.description.slice(type.length)), parts.push(tokens.type);
    return parts[0] = parts[0].slice(1), parts[parts.length - 1] = parts[parts.length - 1].slice(0, -1), spec.type = join2(parts), spec;
  };
}
var trim = (x) => x.trim();
function getJoiner(spacing) {
  return spacing === "compact" ? (t) => t.map(trim).join("") : spacing === "preserve" ? (t) => t.join(`
`) : spacing;
}

// ../node_modules/comment-parser/es6/parser/tokenizers/name.js
var isQuoted = (s) => s && s.startsWith('"') && s.endsWith('"');
function nameTokenizer() {
  let typeEnd = (num, { tokens }, i) => tokens.type === "" ? num : i;
  return (spec) => {
    let { tokens } = spec.source[spec.source.reduce(typeEnd, 0)], source = tokens.description.trimLeft(), quotedGroups = source.split('"');
    if (quotedGroups.length > 1 && quotedGroups[0] === "" && quotedGroups.length % 2 === 1)
      return spec.name = quotedGroups[1], tokens.name = `"${quotedGroups[1]}"`, [tokens.postName, tokens.description] = splitSpace(source.slice(tokens.name.length)), spec;
    let brackets = 0, name = "", optional = !1, defaultValue;
    for (let ch of source) {
      if (brackets === 0 && isSpace(ch))
        break;
      ch === "[" && brackets++, ch === "]" && brackets--, name += ch;
    }
    if (brackets !== 0)
      return spec.problems.push({
        code: "spec:name:unpaired-brackets",
        message: "unpaired brackets",
        line: spec.source[0].number,
        critical: !0
      }), spec;
    let nameToken = name;
    if (name[0] === "[" && name[name.length - 1] === "]") {
      optional = !0, name = name.slice(1, -1);
      let parts = name.split("=");
      if (name = parts[0].trim(), parts[1] !== void 0 && (defaultValue = parts.slice(1).join("=").trim()), name === "")
        return spec.problems.push({
          code: "spec:name:empty-name",
          message: "empty name",
          line: spec.source[0].number,
          critical: !0
        }), spec;
      if (defaultValue === "")
        return spec.problems.push({
          code: "spec:name:empty-default",
          message: "empty default value",
          line: spec.source[0].number,
          critical: !0
        }), spec;
      if (!isQuoted(defaultValue) && /=(?!>)/.test(defaultValue))
        return spec.problems.push({
          code: "spec:name:invalid-default",
          message: "invalid default value syntax",
          line: spec.source[0].number,
          critical: !0
        }), spec;
    }
    return spec.optional = optional, spec.name = name, tokens.name = nameToken, defaultValue !== void 0 && (spec.default = defaultValue), [tokens.postName, tokens.description] = splitSpace(source.slice(tokens.name.length)), spec;
  };
}

// ../node_modules/comment-parser/es6/parser/tokenizers/description.js
function descriptionTokenizer(spacing = "compact", markers = Markers) {
  let join2 = getJoiner2(spacing);
  return (spec) => (spec.description = join2(spec.source, markers), spec);
}
function getJoiner2(spacing) {
  return spacing === "compact" ? compactJoiner : spacing === "preserve" ? preserveJoiner : spacing;
}
function compactJoiner(lines, markers = Markers) {
  return lines.map(({ tokens: { description } }) => description.trim()).filter((description) => description !== "").join(" ");
}
var lineNo = (num, { tokens }, i) => tokens.type === "" ? num : i, getDescription = ({ tokens }) => (tokens.delimiter === "" ? tokens.start : tokens.postDelimiter.slice(1)) + tokens.description;
function preserveJoiner(lines, markers = Markers) {
  if (lines.length === 0)
    return "";
  lines[0].tokens.description === "" && lines[0].tokens.delimiter === markers.start && (lines = lines.slice(1));
  let lastLine = lines[lines.length - 1];
  return lastLine !== void 0 && lastLine.tokens.description === "" && lastLine.tokens.end.endsWith(markers.end) && (lines = lines.slice(0, -1)), lines = lines.slice(lines.reduce(lineNo, 0)), lines.map(getDescription).join(`
`);
}

// ../node_modules/comment-parser/es6/parser/index.js
function getParser4({ startLine = 0, fence = "```", spacing = "compact", markers = Markers, tokenizers = [
  tagTokenizer(),
  typeTokenizer(spacing),
  nameTokenizer(),
  descriptionTokenizer(spacing)
] } = {}) {
  if (startLine < 0 || startLine % 1 > 0)
    throw new Error("Invalid startLine");
  let parseSource = getParser2({ startLine, markers }), parseBlock = getParser({ fence }), parseSpec = getParser3({ tokenizers }), joinDescription = getJoiner2(spacing);
  return function(source) {
    let blocks = [];
    for (let line of splitLines(source)) {
      let lines = parseSource(line);
      if (lines === null)
        continue;
      let sections = parseBlock(lines), specs = sections.slice(1).map(parseSpec);
      blocks.push({
        description: joinDescription(sections[0], markers),
        tags: specs,
        source: lines,
        problems: specs.reduce((acc, spec) => acc.concat(spec.problems), [])
      });
    }
    return blocks;
  };
}

// ../node_modules/comment-parser/es6/stringifier/index.js
function join(tokens) {
  return tokens.start + tokens.delimiter + tokens.postDelimiter + tokens.tag + tokens.postTag + tokens.type + tokens.postType + tokens.name + tokens.postName + tokens.description + tokens.end + tokens.lineEnd;
}
function getStringifier() {
  return (block) => block.source.map(({ tokens }) => join(tokens)).join(`
`);
}

// ../node_modules/comment-parser/es6/stringifier/inspect.js
var zeroWidth = {
  line: 0,
  start: 0,
  delimiter: 0,
  postDelimiter: 0,
  tag: 0,
  postTag: 0,
  name: 0,
  postName: 0,
  type: 0,
  postType: 0,
  description: 0,
  end: 0,
  lineEnd: 0
};
var fields = Object.keys(zeroWidth);

// ../node_modules/comment-parser/es6/index.js
function parse(source, options = {}) {
  return getParser4(options)(source);
}
var stringify = getStringifier();

// src/docs-tools/argTypes/jsdocParser.ts
var import_jsdoc_type_pratt_parser = __toESM(require_dist(), 1);
function containsJsDoc(value) {
  return value != null && value.includes("@");
}
function parse2(content) {
  let normalisedContent = `/**
` + (content ?? "").split(`
`).map((line) => ` * ${line}`).join(`
`) + `
*/`, ast = parse(normalisedContent, {
    spacing: "preserve"
  });
  if (!ast || ast.length === 0)
    throw new Error("Cannot parse JSDoc tags.");
  return ast[0];
}
var DEFAULT_OPTIONS = {
  tags: ["param", "arg", "argument", "returns", "ignore", "deprecated"]
}, parseJsDoc = (value, options = DEFAULT_OPTIONS) => {
  if (!containsJsDoc(value))
    return {
      includesJsDoc: !1,
      ignore: !1
    };
  let jsDocAst = parse2(value), extractedTags = extractJsDocTags(jsDocAst, options.tags);
  return extractedTags.ignore ? {
    includesJsDoc: !0,
    ignore: !0
  } : {
    includesJsDoc: !0,
    ignore: !1,
    // Always use the parsed description to ensure JSDoc is removed from the description.
    description: jsDocAst.description.trim(),
    extractedTags
  };
};
function extractJsDocTags(ast, tags) {
  let extractedTags = {
    params: null,
    deprecated: null,
    returns: null,
    ignore: !1
  };
  for (let tagSpec of ast.tags)
    if (!(tags !== void 0 && !tags.includes(tagSpec.tag)))
      if (tagSpec.tag === "ignore") {
        extractedTags.ignore = !0;
        break;
      } else
        switch (tagSpec.tag) {
          // arg & argument are aliases for param.
          case "param":
          case "arg":
          case "argument": {
            let paramTag = extractParam(tagSpec);
            paramTag != null && (extractedTags.params == null && (extractedTags.params = []), extractedTags.params.push(paramTag));
            break;
          }
          case "deprecated": {
            let deprecatedTag = extractDeprecated(tagSpec);
            deprecatedTag != null && (extractedTags.deprecated = deprecatedTag);
            break;
          }
          case "returns": {
            let returnsTag = extractReturns(tagSpec);
            returnsTag != null && (extractedTags.returns = returnsTag);
            break;
          }
          default:
            break;
        }
  return extractedTags;
}
function normaliseParamName(name) {
  return name.replace(/[\.-]$/, "");
}
function extractParam(tag) {
  if (!tag.name || tag.name === "-")
    return null;
  let type = extractType(tag.type);
  return {
    name: tag.name,
    type,
    description: normaliseDescription(tag.description),
    getPrettyName: () => normaliseParamName(tag.name),
    getTypeName: () => type ? extractTypeName(type) : null
  };
}
function extractDeprecated(tag) {
  return tag.name ? joinNameAndDescription(tag.name, tag.description) : null;
}
function joinNameAndDescription(name, desc) {
  let joined = name === "" ? desc : `${name} ${desc}`;
  return normaliseDescription(joined);
}
function normaliseDescription(text) {
  let normalised = text.replace(/^- /g, "").trim();
  return normalised === "" ? null : normalised;
}
function extractReturns(tag) {
  let type = extractType(tag.type);
  return type ? {
    type,
    description: joinNameAndDescription(tag.name, tag.description),
    getTypeName: () => extractTypeName(type)
  } : null;
}
var jsdocStringifyRules = (0, import_jsdoc_type_pratt_parser.stringifyRules)(), originalJsdocStringifyObject = jsdocStringifyRules.JsdocTypeObject;
jsdocStringifyRules.JsdocTypeAny = () => "any";
jsdocStringifyRules.JsdocTypeObject = (result, transform) => `(${originalJsdocStringifyObject(result, transform)})`;
jsdocStringifyRules.JsdocTypeOptional = (result, transform) => transform(result.element);
jsdocStringifyRules.JsdocTypeNullable = (result, transform) => transform(result.element);
jsdocStringifyRules.JsdocTypeNotNullable = (result, transform) => transform(result.element);
jsdocStringifyRules.JsdocTypeUnion = (result, transform) => result.elements.map(transform).join("|");
function extractType(typeString) {
  try {
    return (0, import_jsdoc_type_pratt_parser.parse)(typeString, "typescript");
  } catch {
    return null;
  }
}
function extractTypeName(type) {
  return (0, import_jsdoc_type_pratt_parser.transform)(jsdocStringifyRules, type);
}

// src/docs-tools/argTypes/utils.ts
var MAX_TYPE_SUMMARY_LENGTH = 90, MAX_DEFAULT_VALUE_SUMMARY_LENGTH = 50;
function isTooLongForTypeSummary(value) {
  return value.length > 90;
}
function isTooLongForDefaultValueSummary(value) {
  return value.length > 50;
}
function createSummaryValue(summary, detail) {
  return summary === detail ? { summary } : { summary, detail };
}
var normalizeNewlines = (string) => string.replace(/\\r\\n/g, "\\n");

// src/docs-tools/argTypes/docgen/flow/createDefaultValue.ts
function createDefaultValue(defaultValue, type) {
  if (defaultValue != null) {
    let { value } = defaultValue;
    if (!isDefaultValueBlacklisted(value))
      return isTooLongForDefaultValueSummary(value) ? createSummaryValue(type?.name, value) : createSummaryValue(value);
  }
  return null;
}

// src/docs-tools/argTypes/docgen/flow/createType.ts
function generateUnionElement({ name, value, elements, raw }) {
  return value ?? (elements != null ? elements.map(generateUnionElement).join(" | ") : raw ?? name);
}
function generateUnion({ name, raw, elements }) {
  return elements != null ? createSummaryValue(elements.map(generateUnionElement).join(" | ")) : raw != null ? createSummaryValue(raw.replace(/^\|\s*/, "")) : createSummaryValue(name);
}
function generateFuncSignature({ type, raw }) {
  return raw != null ? createSummaryValue(raw) : createSummaryValue(type);
}
function generateObjectSignature({ type, raw }) {
  return raw != null ? isTooLongForTypeSummary(raw) ? createSummaryValue(type, raw) : createSummaryValue(raw) : createSummaryValue(type);
}
function generateSignature(flowType) {
  let { type } = flowType;
  return type === "object" ? generateObjectSignature(flowType) : generateFuncSignature(flowType);
}
function generateDefault({ name, raw }) {
  return raw != null ? isTooLongForTypeSummary(raw) ? createSummaryValue(name, raw) : createSummaryValue(raw) : createSummaryValue(name);
}
function createType(type) {
  if (type == null)
    return null;
  switch (type.name) {
    case "union" /* UNION */:
      return generateUnion(type);
    case "signature" /* SIGNATURE */:
      return generateSignature(type);
    default:
      return generateDefault(type);
  }
}

// src/docs-tools/argTypes/docgen/flow/createPropDef.ts
var createFlowPropDef = (propName, docgenInfo) => {
  let { flowType, description, required, defaultValue } = docgenInfo;
  return {
    name: propName,
    type: createType(flowType),
    required,
    description,
    defaultValue: createDefaultValue(defaultValue ?? null, flowType ?? null)
  };
};

// src/docs-tools/argTypes/docgen/typeScript/createDefaultValue.ts
function createDefaultValue2({ defaultValue }) {
  if (defaultValue != null) {
    let { value } = defaultValue;
    if (!isDefaultValueBlacklisted(value))
      return createSummaryValue(value);
  }
  return null;
}

// src/docs-tools/argTypes/docgen/typeScript/createType.ts
function createType2({ tsType, required }) {
  if (tsType == null)
    return null;
  let typeName = tsType.name;
  return required || (typeName = typeName.replace(" | undefined", "")), createSummaryValue(
    ["Array", "Record", "signature"].includes(tsType.name) ? tsType.raw : typeName
  );
}

// src/docs-tools/argTypes/docgen/typeScript/createPropDef.ts
var createTsPropDef = (propName, docgenInfo) => {
  let { description, required } = docgenInfo;
  return {
    name: propName,
    type: createType2(docgenInfo),
    required,
    description,
    defaultValue: createDefaultValue2(docgenInfo)
  };
};

// src/docs-tools/argTypes/docgen/createPropDef.ts
function createType3(type) {
  return type != null ? createSummaryValue(type.name) : null;
}
function isReactDocgenTypescript(defaultValue) {
  let { computed, func } = defaultValue;
  return typeof computed > "u" && typeof func > "u";
}
function isStringValued(type) {
  return type ? type.name === "string" ? !0 : type.name === "enum" ? Array.isArray(type.value) && type.value.every(
    ({ value: tv }) => typeof tv == "string" && tv[0] === '"' && tv[tv.length - 1] === '"'
  ) : !1 : !1;
}
function createDefaultValue3(defaultValue, type) {
  if (defaultValue != null) {
    let { value } = defaultValue;
    if (!isDefaultValueBlacklisted(value))
      return isReactDocgenTypescript(defaultValue) && isStringValued(type) ? createSummaryValue(JSON.stringify(value)) : createSummaryValue(value);
  }
  return null;
}
function createBasicPropDef(name, type, docgenInfo) {
  let { description, required, defaultValue } = docgenInfo;
  return {
    name,
    type: createType3(type),
    required,
    description,
    defaultValue: createDefaultValue3(defaultValue, type)
  };
}
function applyJsDocResult(propDef, jsDocParsingResult) {
  if (jsDocParsingResult?.includesJsDoc) {
    let { description, extractedTags } = jsDocParsingResult;
    description != null && (propDef.description = jsDocParsingResult.description);
    let value = {
      ...extractedTags,
      params: extractedTags?.params?.map(
        (x) => ({
          name: x.getPrettyName(),
          description: x.description
        })
      )
    };
    Object.values(value).filter(Boolean).length > 0 && (propDef.jsDocTags = value);
  }
  return propDef;
}
var javaScriptFactory = (propName, docgenInfo, jsDocParsingResult) => {
  let propDef = createBasicPropDef(propName, docgenInfo.type, docgenInfo);
  return propDef.sbType = convert4(docgenInfo), applyJsDocResult(propDef, jsDocParsingResult);
}, tsFactory = (propName, docgenInfo, jsDocParsingResult) => {
  let propDef = createTsPropDef(propName, docgenInfo);
  return propDef.sbType = convert4(docgenInfo), applyJsDocResult(propDef, jsDocParsingResult);
}, flowFactory = (propName, docgenInfo, jsDocParsingResult) => {
  let propDef = createFlowPropDef(propName, docgenInfo);
  return propDef.sbType = convert4(docgenInfo), applyJsDocResult(propDef, jsDocParsingResult);
}, unknownFactory = (propName, docgenInfo, jsDocParsingResult) => {
  let propDef = createBasicPropDef(propName, { name: "unknown" }, docgenInfo);
  return applyJsDocResult(propDef, jsDocParsingResult);
}, getPropDefFactory = (typeSystem) => {
  switch (typeSystem) {
    case "JavaScript" /* JAVASCRIPT */:
      return javaScriptFactory;
    case "TypeScript" /* TYPESCRIPT */:
      return tsFactory;
    case "Flow" /* FLOW */:
      return flowFactory;
    default:
      return unknownFactory;
  }
};

// src/docs-tools/argTypes/docgen/extractDocgenProps.ts
var getTypeSystem = (docgenInfo) => docgenInfo.type != null ? "JavaScript" /* JAVASCRIPT */ : docgenInfo.flowType != null ? "Flow" /* FLOW */ : docgenInfo.tsType != null ? "TypeScript" /* TYPESCRIPT */ : "Unknown" /* UNKNOWN */, extractComponentSectionArray = (docgenSection) => {
  let typeSystem = getTypeSystem(docgenSection[0]), createPropDef = getPropDefFactory(typeSystem);
  return docgenSection.map((item) => {
    let sanitizedItem = item;
    return item.type?.elements && (sanitizedItem = {
      ...item,
      type: {
        ...item.type,
        value: item.type.elements
      }
    }), extractProp(sanitizedItem.name, sanitizedItem, typeSystem, createPropDef);
  });
}, extractComponentSectionObject = (docgenSection) => {
  let docgenPropsKeys = Object.keys(docgenSection), typeSystem = getTypeSystem(docgenSection[docgenPropsKeys[0]]), createPropDef = getPropDefFactory(typeSystem);
  return docgenPropsKeys.map((propName) => {
    let docgenInfo = docgenSection[propName];
    return docgenInfo != null ? extractProp(propName, docgenInfo, typeSystem, createPropDef) : null;
  }).filter(Boolean);
}, extractComponentProps = (component, section) => {
  let docgenSection = getDocgenSection(component, section);
  return isValidDocgenSection(docgenSection) ? Array.isArray(docgenSection) ? extractComponentSectionArray(docgenSection) : extractComponentSectionObject(docgenSection) : [];
};
function extractProp(propName, docgenInfo, typeSystem, createPropDef) {
  let jsDocParsingResult = parseJsDoc(docgenInfo.description);
  return jsDocParsingResult.includesJsDoc && jsDocParsingResult.ignore ? null : {
    propDef: createPropDef(propName, docgenInfo, jsDocParsingResult),
    jsDocTags: jsDocParsingResult.extractedTags,
    docgenInfo,
    typeSystem
  };
}
function extractComponentDescription(component) {
  return component != null ? getDocgenDescription(component) : "";
}

// src/preview-api/modules/store/parameters.ts
var combineParameters = (...parameterSets) => {
  let mergeKeys = {}, definedParametersSets = parameterSets.filter(Boolean), combined = definedParametersSets.reduce((acc, parameters) => (Object.entries(parameters).forEach(([key, value]) => {
    let existing = acc[key];
    Array.isArray(value) || typeof existing > "u" ? acc[key] = value : isPlainObject(value) && isPlainObject(existing) ? mergeKeys[key] = !0 : typeof value < "u" && (acc[key] = value);
  }), acc), {});
  return Object.keys(mergeKeys).forEach((key) => {
    let mergeValues = definedParametersSets.filter(Boolean).map((p) => p[key]).filter((value) => typeof value < "u");
    mergeValues.every((value) => isPlainObject(value)) ? combined[key] = combineParameters(...mergeValues) : combined[key] = mergeValues[mergeValues.length - 1];
  }), combined;
};

// src/docs-tools/argTypes/enhanceArgTypes.ts
var enhanceArgTypes = (context) => {
  let {
    component,
    argTypes: userArgTypes,
    parameters: { docs = {} }
  } = context, { extractArgTypes } = docs;
  if (!extractArgTypes || !component)
    return userArgTypes;
  let extractedArgTypes = extractArgTypes(component);
  return extractedArgTypes ? combineParameters(extractedArgTypes, userArgTypes) : userArgTypes;
};

// src/docs-tools/shared.ts
var ADDON_ID = "storybook/docs", PANEL_ID = `${ADDON_ID}/panel`, PARAM_KEY = "docs", SNIPPET_RENDERED = `${ADDON_ID}/snippet-rendered`, SourceType = /* @__PURE__ */ ((SourceType2) => (SourceType2.AUTO = "auto", SourceType2.CODE = "code", SourceType2.DYNAMIC = "dynamic", SourceType2))(SourceType || {});

export {
  combineParameters,
  convert4 as convert,
  TypeSystem,
  isDefaultValueBlacklisted,
  str,
  hasDocgen,
  isValidDocgenSection,
  getDocgenSection,
  getDocgenDescription,
  parseJsDoc,
  MAX_TYPE_SUMMARY_LENGTH,
  MAX_DEFAULT_VALUE_SUMMARY_LENGTH,
  isTooLongForTypeSummary,
  isTooLongForDefaultValueSummary,
  createSummaryValue,
  normalizeNewlines,
  extractComponentSectionArray,
  extractComponentSectionObject,
  extractComponentProps,
  extractComponentDescription,
  enhanceArgTypes,
  ADDON_ID,
  PANEL_ID,
  PARAM_KEY,
  SNIPPET_RENDERED,
  SourceType
};
