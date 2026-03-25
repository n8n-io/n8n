"use strict";Object.defineProperty(exports, "__esModule", {value: true});









var _index = require('../../tokenizer/index');
var _types = require('../../tokenizer/types');
var _base = require('../../traverser/base');
var _expression = require('../../traverser/expression');
var _util = require('../../traverser/util');
var _charcodes = require('../../util/charcodes');
var _identifier = require('../../util/identifier');
var _typescript = require('../typescript');

/**
 * Read token with JSX contents.
 *
 * In addition to detecting jsxTagStart and also regular tokens that might be
 * part of an expression, this code detects the start and end of text ranges
 * within JSX children. In order to properly count the number of children, we
 * distinguish jsxText from jsxEmptyText, which is a text range that simplifies
 * to the empty string after JSX whitespace trimming.
 *
 * It turns out that a JSX text range will simplify to the empty string if and
 * only if both of these conditions hold:
 * - The range consists entirely of whitespace characters (only counting space,
 *   tab, \r, and \n).
 * - The range has at least one newline.
 * This can be proven by analyzing any implementation of whitespace trimming,
 * e.g. formatJSXTextLiteral in Sucrase or cleanJSXElementLiteralChild in Babel.
 */
function jsxReadToken() {
  let sawNewline = false;
  let sawNonWhitespace = false;
  while (true) {
    if (_base.state.pos >= _base.input.length) {
      _util.unexpected.call(void 0, "Unterminated JSX contents");
      return;
    }

    const ch = _base.input.charCodeAt(_base.state.pos);
    if (ch === _charcodes.charCodes.lessThan || ch === _charcodes.charCodes.leftCurlyBrace) {
      if (_base.state.pos === _base.state.start) {
        if (ch === _charcodes.charCodes.lessThan) {
          _base.state.pos++;
          _index.finishToken.call(void 0, _types.TokenType.jsxTagStart);
          return;
        }
        _index.getTokenFromCode.call(void 0, ch);
        return;
      }
      if (sawNewline && !sawNonWhitespace) {
        _index.finishToken.call(void 0, _types.TokenType.jsxEmptyText);
      } else {
        _index.finishToken.call(void 0, _types.TokenType.jsxText);
      }
      return;
    }

    // This is part of JSX text.
    if (ch === _charcodes.charCodes.lineFeed) {
      sawNewline = true;
    } else if (ch !== _charcodes.charCodes.space && ch !== _charcodes.charCodes.carriageReturn && ch !== _charcodes.charCodes.tab) {
      sawNonWhitespace = true;
    }
    _base.state.pos++;
  }
}

function jsxReadString(quote) {
  _base.state.pos++;
  for (;;) {
    if (_base.state.pos >= _base.input.length) {
      _util.unexpected.call(void 0, "Unterminated string constant");
      return;
    }

    const ch = _base.input.charCodeAt(_base.state.pos);
    if (ch === quote) {
      _base.state.pos++;
      break;
    }
    _base.state.pos++;
  }
  _index.finishToken.call(void 0, _types.TokenType.string);
}

// Read a JSX identifier (valid tag or attribute name).
//
// Optimized version since JSX identifiers can't contain
// escape characters and so can be read as single slice.
// Also assumes that first character was already checked
// by isIdentifierStart in readToken.

function jsxReadWord() {
  let ch;
  do {
    if (_base.state.pos > _base.input.length) {
      _util.unexpected.call(void 0, "Unexpectedly reached the end of input.");
      return;
    }
    ch = _base.input.charCodeAt(++_base.state.pos);
  } while (_identifier.IS_IDENTIFIER_CHAR[ch] || ch === _charcodes.charCodes.dash);
  _index.finishToken.call(void 0, _types.TokenType.jsxName);
}

// Parse next token as JSX identifier
function jsxParseIdentifier() {
  nextJSXTagToken();
}

// Parse namespaced identifier.
function jsxParseNamespacedName(identifierRole) {
  jsxParseIdentifier();
  if (!_index.eat.call(void 0, _types.TokenType.colon)) {
    // Plain identifier, so this is an access.
    _base.state.tokens[_base.state.tokens.length - 1].identifierRole = identifierRole;
    return;
  }
  // Process the second half of the namespaced name.
  jsxParseIdentifier();
}

// Parses element name in any form - namespaced, member
// or single identifier.
function jsxParseElementName() {
  const firstTokenIndex = _base.state.tokens.length;
  jsxParseNamespacedName(_index.IdentifierRole.Access);
  let hadDot = false;
  while (_index.match.call(void 0, _types.TokenType.dot)) {
    hadDot = true;
    nextJSXTagToken();
    jsxParseIdentifier();
  }
  // For tags like <div> with a lowercase letter and no dots, the name is
  // actually *not* an identifier access, since it's referring to a built-in
  // tag name. Remove the identifier role in this case so that it's not
  // accidentally transformed by the imports transform when preserving JSX.
  if (!hadDot) {
    const firstToken = _base.state.tokens[firstTokenIndex];
    const firstChar = _base.input.charCodeAt(firstToken.start);
    if (firstChar >= _charcodes.charCodes.lowercaseA && firstChar <= _charcodes.charCodes.lowercaseZ) {
      firstToken.identifierRole = null;
    }
  }
}

// Parses any type of JSX attribute value.
function jsxParseAttributeValue() {
  switch (_base.state.type) {
    case _types.TokenType.braceL:
      _index.next.call(void 0, );
      _expression.parseExpression.call(void 0, );
      nextJSXTagToken();
      return;

    case _types.TokenType.jsxTagStart:
      jsxParseElement();
      nextJSXTagToken();
      return;

    case _types.TokenType.string:
      nextJSXTagToken();
      return;

    default:
      _util.unexpected.call(void 0, "JSX value should be either an expression or a quoted JSX text");
  }
}

// Parse JSX spread child, after already processing the {
// Does not parse the closing }
function jsxParseSpreadChild() {
  _util.expect.call(void 0, _types.TokenType.ellipsis);
  _expression.parseExpression.call(void 0, );
}

// Parses JSX opening tag starting after "<".
// Returns true if the tag was self-closing.
// Does not parse the last token.
function jsxParseOpeningElement(initialTokenIndex) {
  if (_index.match.call(void 0, _types.TokenType.jsxTagEnd)) {
    // This is an open-fragment.
    return false;
  }
  jsxParseElementName();
  if (_base.isTypeScriptEnabled) {
    _typescript.tsTryParseJSXTypeArgument.call(void 0, );
  }
  let hasSeenPropSpread = false;
  while (!_index.match.call(void 0, _types.TokenType.slash) && !_index.match.call(void 0, _types.TokenType.jsxTagEnd) && !_base.state.error) {
    if (_index.eat.call(void 0, _types.TokenType.braceL)) {
      hasSeenPropSpread = true;
      _util.expect.call(void 0, _types.TokenType.ellipsis);
      _expression.parseMaybeAssign.call(void 0, );
      // }
      nextJSXTagToken();
      continue;
    }
    if (
      hasSeenPropSpread &&
      _base.state.end - _base.state.start === 3 &&
      _base.input.charCodeAt(_base.state.start) === _charcodes.charCodes.lowercaseK &&
      _base.input.charCodeAt(_base.state.start + 1) === _charcodes.charCodes.lowercaseE &&
      _base.input.charCodeAt(_base.state.start + 2) === _charcodes.charCodes.lowercaseY
    ) {
      _base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.KeyAfterPropSpread;
    }
    jsxParseNamespacedName(_index.IdentifierRole.ObjectKey);
    if (_index.match.call(void 0, _types.TokenType.eq)) {
      nextJSXTagToken();
      jsxParseAttributeValue();
    }
  }
  const isSelfClosing = _index.match.call(void 0, _types.TokenType.slash);
  if (isSelfClosing) {
    // /
    nextJSXTagToken();
  }
  return isSelfClosing;
}

// Parses JSX closing tag starting after "</".
// Does not parse the last token.
function jsxParseClosingElement() {
  if (_index.match.call(void 0, _types.TokenType.jsxTagEnd)) {
    // Fragment syntax, so we immediately have a tag end.
    return;
  }
  jsxParseElementName();
}

// Parses entire JSX element, including its opening tag
// (starting after "<"), attributes, contents and closing tag.
// Does not parse the last token.
function jsxParseElementAt() {
  const initialTokenIndex = _base.state.tokens.length - 1;
  _base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.NoChildren;
  let numExplicitChildren = 0;
  const isSelfClosing = jsxParseOpeningElement(initialTokenIndex);
  if (!isSelfClosing) {
    nextJSXExprToken();
    while (true) {
      switch (_base.state.type) {
        case _types.TokenType.jsxTagStart:
          nextJSXTagToken();
          if (_index.match.call(void 0, _types.TokenType.slash)) {
            nextJSXTagToken();
            jsxParseClosingElement();
            // Key after prop spread takes precedence over number of children,
            // since it means we switch to createElement, which doesn't care
            // about number of children.
            if (_base.state.tokens[initialTokenIndex].jsxRole !== _index.JSXRole.KeyAfterPropSpread) {
              if (numExplicitChildren === 1) {
                _base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.OneChild;
              } else if (numExplicitChildren > 1) {
                _base.state.tokens[initialTokenIndex].jsxRole = _index.JSXRole.StaticChildren;
              }
            }
            return;
          }
          numExplicitChildren++;
          jsxParseElementAt();
          nextJSXExprToken();
          break;

        case _types.TokenType.jsxText:
          numExplicitChildren++;
          nextJSXExprToken();
          break;

        case _types.TokenType.jsxEmptyText:
          nextJSXExprToken();
          break;

        case _types.TokenType.braceL:
          _index.next.call(void 0, );
          if (_index.match.call(void 0, _types.TokenType.ellipsis)) {
            jsxParseSpreadChild();
            nextJSXExprToken();
            // Spread children are a mechanism to explicitly mark children as
            // static, so count it as 2 children to satisfy the "more than one
            // child" condition.
            numExplicitChildren += 2;
          } else {
            // If we see {}, this is an empty pseudo-expression that doesn't
            // count as a child.
            if (!_index.match.call(void 0, _types.TokenType.braceR)) {
              numExplicitChildren++;
              _expression.parseExpression.call(void 0, );
            }
            nextJSXExprToken();
          }

          break;

        // istanbul ignore next - should never happen
        default:
          _util.unexpected.call(void 0, );
          return;
      }
    }
  }
}

// Parses entire JSX element from current position.
// Does not parse the last token.
 function jsxParseElement() {
  nextJSXTagToken();
  jsxParseElementAt();
} exports.jsxParseElement = jsxParseElement;

// ==================================
// Overrides
// ==================================

 function nextJSXTagToken() {
  _base.state.tokens.push(new (0, _index.Token)());
  _index.skipSpace.call(void 0, );
  _base.state.start = _base.state.pos;
  const code = _base.input.charCodeAt(_base.state.pos);

  if (_identifier.IS_IDENTIFIER_START[code]) {
    jsxReadWord();
  } else if (code === _charcodes.charCodes.quotationMark || code === _charcodes.charCodes.apostrophe) {
    jsxReadString(code);
  } else {
    // The following tokens are just one character each.
    ++_base.state.pos;
    switch (code) {
      case _charcodes.charCodes.greaterThan:
        _index.finishToken.call(void 0, _types.TokenType.jsxTagEnd);
        break;
      case _charcodes.charCodes.lessThan:
        _index.finishToken.call(void 0, _types.TokenType.jsxTagStart);
        break;
      case _charcodes.charCodes.slash:
        _index.finishToken.call(void 0, _types.TokenType.slash);
        break;
      case _charcodes.charCodes.equalsTo:
        _index.finishToken.call(void 0, _types.TokenType.eq);
        break;
      case _charcodes.charCodes.leftCurlyBrace:
        _index.finishToken.call(void 0, _types.TokenType.braceL);
        break;
      case _charcodes.charCodes.dot:
        _index.finishToken.call(void 0, _types.TokenType.dot);
        break;
      case _charcodes.charCodes.colon:
        _index.finishToken.call(void 0, _types.TokenType.colon);
        break;
      default:
        _util.unexpected.call(void 0, );
    }
  }
} exports.nextJSXTagToken = nextJSXTagToken;

function nextJSXExprToken() {
  _base.state.tokens.push(new (0, _index.Token)());
  _base.state.start = _base.state.pos;
  jsxReadToken();
}
