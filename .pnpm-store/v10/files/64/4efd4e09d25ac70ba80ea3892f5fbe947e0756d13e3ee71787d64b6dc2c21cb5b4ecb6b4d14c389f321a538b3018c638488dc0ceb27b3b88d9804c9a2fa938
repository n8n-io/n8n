import {
  eat,
  finishToken,
  getTokenFromCode,
  IdentifierRole,
  JSXRole,
  match,
  next,
  skipSpace,
  Token,
} from "../../tokenizer/index";
import {TokenType as tt} from "../../tokenizer/types";
import {input, isTypeScriptEnabled, state} from "../../traverser/base";
import {parseExpression, parseMaybeAssign} from "../../traverser/expression";
import {expect, unexpected} from "../../traverser/util";
import {charCodes} from "../../util/charcodes";
import {IS_IDENTIFIER_CHAR, IS_IDENTIFIER_START} from "../../util/identifier";
import {tsTryParseJSXTypeArgument} from "../typescript";

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
    if (state.pos >= input.length) {
      unexpected("Unterminated JSX contents");
      return;
    }

    const ch = input.charCodeAt(state.pos);
    if (ch === charCodes.lessThan || ch === charCodes.leftCurlyBrace) {
      if (state.pos === state.start) {
        if (ch === charCodes.lessThan) {
          state.pos++;
          finishToken(tt.jsxTagStart);
          return;
        }
        getTokenFromCode(ch);
        return;
      }
      if (sawNewline && !sawNonWhitespace) {
        finishToken(tt.jsxEmptyText);
      } else {
        finishToken(tt.jsxText);
      }
      return;
    }

    // This is part of JSX text.
    if (ch === charCodes.lineFeed) {
      sawNewline = true;
    } else if (ch !== charCodes.space && ch !== charCodes.carriageReturn && ch !== charCodes.tab) {
      sawNonWhitespace = true;
    }
    state.pos++;
  }
}

function jsxReadString(quote) {
  state.pos++;
  for (;;) {
    if (state.pos >= input.length) {
      unexpected("Unterminated string constant");
      return;
    }

    const ch = input.charCodeAt(state.pos);
    if (ch === quote) {
      state.pos++;
      break;
    }
    state.pos++;
  }
  finishToken(tt.string);
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
    if (state.pos > input.length) {
      unexpected("Unexpectedly reached the end of input.");
      return;
    }
    ch = input.charCodeAt(++state.pos);
  } while (IS_IDENTIFIER_CHAR[ch] || ch === charCodes.dash);
  finishToken(tt.jsxName);
}

// Parse next token as JSX identifier
function jsxParseIdentifier() {
  nextJSXTagToken();
}

// Parse namespaced identifier.
function jsxParseNamespacedName(identifierRole) {
  jsxParseIdentifier();
  if (!eat(tt.colon)) {
    // Plain identifier, so this is an access.
    state.tokens[state.tokens.length - 1].identifierRole = identifierRole;
    return;
  }
  // Process the second half of the namespaced name.
  jsxParseIdentifier();
}

// Parses element name in any form - namespaced, member
// or single identifier.
function jsxParseElementName() {
  const firstTokenIndex = state.tokens.length;
  jsxParseNamespacedName(IdentifierRole.Access);
  let hadDot = false;
  while (match(tt.dot)) {
    hadDot = true;
    nextJSXTagToken();
    jsxParseIdentifier();
  }
  // For tags like <div> with a lowercase letter and no dots, the name is
  // actually *not* an identifier access, since it's referring to a built-in
  // tag name. Remove the identifier role in this case so that it's not
  // accidentally transformed by the imports transform when preserving JSX.
  if (!hadDot) {
    const firstToken = state.tokens[firstTokenIndex];
    const firstChar = input.charCodeAt(firstToken.start);
    if (firstChar >= charCodes.lowercaseA && firstChar <= charCodes.lowercaseZ) {
      firstToken.identifierRole = null;
    }
  }
}

// Parses any type of JSX attribute value.
function jsxParseAttributeValue() {
  switch (state.type) {
    case tt.braceL:
      next();
      parseExpression();
      nextJSXTagToken();
      return;

    case tt.jsxTagStart:
      jsxParseElement();
      nextJSXTagToken();
      return;

    case tt.string:
      nextJSXTagToken();
      return;

    default:
      unexpected("JSX value should be either an expression or a quoted JSX text");
  }
}

// Parse JSX spread child, after already processing the {
// Does not parse the closing }
function jsxParseSpreadChild() {
  expect(tt.ellipsis);
  parseExpression();
}

// Parses JSX opening tag starting after "<".
// Returns true if the tag was self-closing.
// Does not parse the last token.
function jsxParseOpeningElement(initialTokenIndex) {
  if (match(tt.jsxTagEnd)) {
    // This is an open-fragment.
    return false;
  }
  jsxParseElementName();
  if (isTypeScriptEnabled) {
    tsTryParseJSXTypeArgument();
  }
  let hasSeenPropSpread = false;
  while (!match(tt.slash) && !match(tt.jsxTagEnd) && !state.error) {
    if (eat(tt.braceL)) {
      hasSeenPropSpread = true;
      expect(tt.ellipsis);
      parseMaybeAssign();
      // }
      nextJSXTagToken();
      continue;
    }
    if (
      hasSeenPropSpread &&
      state.end - state.start === 3 &&
      input.charCodeAt(state.start) === charCodes.lowercaseK &&
      input.charCodeAt(state.start + 1) === charCodes.lowercaseE &&
      input.charCodeAt(state.start + 2) === charCodes.lowercaseY
    ) {
      state.tokens[initialTokenIndex].jsxRole = JSXRole.KeyAfterPropSpread;
    }
    jsxParseNamespacedName(IdentifierRole.ObjectKey);
    if (match(tt.eq)) {
      nextJSXTagToken();
      jsxParseAttributeValue();
    }
  }
  const isSelfClosing = match(tt.slash);
  if (isSelfClosing) {
    // /
    nextJSXTagToken();
  }
  return isSelfClosing;
}

// Parses JSX closing tag starting after "</".
// Does not parse the last token.
function jsxParseClosingElement() {
  if (match(tt.jsxTagEnd)) {
    // Fragment syntax, so we immediately have a tag end.
    return;
  }
  jsxParseElementName();
}

// Parses entire JSX element, including its opening tag
// (starting after "<"), attributes, contents and closing tag.
// Does not parse the last token.
function jsxParseElementAt() {
  const initialTokenIndex = state.tokens.length - 1;
  state.tokens[initialTokenIndex].jsxRole = JSXRole.NoChildren;
  let numExplicitChildren = 0;
  const isSelfClosing = jsxParseOpeningElement(initialTokenIndex);
  if (!isSelfClosing) {
    nextJSXExprToken();
    while (true) {
      switch (state.type) {
        case tt.jsxTagStart:
          nextJSXTagToken();
          if (match(tt.slash)) {
            nextJSXTagToken();
            jsxParseClosingElement();
            // Key after prop spread takes precedence over number of children,
            // since it means we switch to createElement, which doesn't care
            // about number of children.
            if (state.tokens[initialTokenIndex].jsxRole !== JSXRole.KeyAfterPropSpread) {
              if (numExplicitChildren === 1) {
                state.tokens[initialTokenIndex].jsxRole = JSXRole.OneChild;
              } else if (numExplicitChildren > 1) {
                state.tokens[initialTokenIndex].jsxRole = JSXRole.StaticChildren;
              }
            }
            return;
          }
          numExplicitChildren++;
          jsxParseElementAt();
          nextJSXExprToken();
          break;

        case tt.jsxText:
          numExplicitChildren++;
          nextJSXExprToken();
          break;

        case tt.jsxEmptyText:
          nextJSXExprToken();
          break;

        case tt.braceL:
          next();
          if (match(tt.ellipsis)) {
            jsxParseSpreadChild();
            nextJSXExprToken();
            // Spread children are a mechanism to explicitly mark children as
            // static, so count it as 2 children to satisfy the "more than one
            // child" condition.
            numExplicitChildren += 2;
          } else {
            // If we see {}, this is an empty pseudo-expression that doesn't
            // count as a child.
            if (!match(tt.braceR)) {
              numExplicitChildren++;
              parseExpression();
            }
            nextJSXExprToken();
          }

          break;

        // istanbul ignore next - should never happen
        default:
          unexpected();
          return;
      }
    }
  }
}

// Parses entire JSX element from current position.
// Does not parse the last token.
export function jsxParseElement() {
  nextJSXTagToken();
  jsxParseElementAt();
}

// ==================================
// Overrides
// ==================================

export function nextJSXTagToken() {
  state.tokens.push(new Token());
  skipSpace();
  state.start = state.pos;
  const code = input.charCodeAt(state.pos);

  if (IS_IDENTIFIER_START[code]) {
    jsxReadWord();
  } else if (code === charCodes.quotationMark || code === charCodes.apostrophe) {
    jsxReadString(code);
  } else {
    // The following tokens are just one character each.
    ++state.pos;
    switch (code) {
      case charCodes.greaterThan:
        finishToken(tt.jsxTagEnd);
        break;
      case charCodes.lessThan:
        finishToken(tt.jsxTagStart);
        break;
      case charCodes.slash:
        finishToken(tt.slash);
        break;
      case charCodes.equalsTo:
        finishToken(tt.eq);
        break;
      case charCodes.leftCurlyBrace:
        finishToken(tt.braceL);
        break;
      case charCodes.dot:
        finishToken(tt.dot);
        break;
      case charCodes.colon:
        finishToken(tt.colon);
        break;
      default:
        unexpected();
    }
  }
}

function nextJSXExprToken() {
  state.tokens.push(new Token());
  state.start = state.pos;
  jsxReadToken();
}
