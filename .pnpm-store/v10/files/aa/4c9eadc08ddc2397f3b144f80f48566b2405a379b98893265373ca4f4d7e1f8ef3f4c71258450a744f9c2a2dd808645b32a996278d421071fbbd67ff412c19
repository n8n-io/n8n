"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// The below is a compiled copy of https://github.com/angular/angular/blob/92e41e9cb417223d9888a4c23b4c0e73188f87d0/packages/compiler/src/render3/view/style_parser.ts

Object.defineProperty(exports, "__esModule", { value: true });
exports.hyphenate = exports.parse = void 0;
/**
 * Parses string representation of a style and converts it into object literal.
 *
 * @param value string representation of style as used in the `style` attribute in HTML.
 *   Example: `color: red; height: auto`.
 * @returns An array of style property name and value pairs, e.g. `['color', 'red', 'height',
 * 'auto']`
 */
function parse(value) {
  // we use a string array here instead of a string map
  // because a string-map is not guaranteed to retain the
  // order of the entries whereas a string array can be
  // constructed in a [key, value, key, value] format.
  const styles = [];
  let i = 0;
  let parenDepth = 0;
  let quote = 0; /* Char.QuoteNone */
  let valueStart = 0;
  let propStart = 0;
  let currentProp = null;
  while (i < value.length) {
    const token = value.charCodeAt(i++);
    switch (token) {
      case 40 /* Char.OpenParen */:
        parenDepth++;
        break;
      case 41 /* Char.CloseParen */:
        parenDepth--;
        break;
      case 39 /* Char.QuoteSingle */:
        // valueStart needs to be there since prop values don't
        // have quotes in CSS
        if (quote === 0 /* Char.QuoteNone */) {
          quote = 39 /* Char.QuoteSingle */;
        } else if (
          quote === 39 /* Char.QuoteSingle */ &&
          value.charCodeAt(i - 1) !== 92 /* Char.BackSlash */
        ) {
          quote = 0 /* Char.QuoteNone */;
        }
        break;
      case 34 /* Char.QuoteDouble */:
        // same logic as above
        if (quote === 0 /* Char.QuoteNone */) {
          quote = 34 /* Char.QuoteDouble */;
        } else if (
          quote === 34 /* Char.QuoteDouble */ &&
          value.charCodeAt(i - 1) !== 92 /* Char.BackSlash */
        ) {
          quote = 0 /* Char.QuoteNone */;
        }
        break;
      case 58 /* Char.Colon */:
        if (
          !currentProp &&
          parenDepth === 0 &&
          quote === 0 /* Char.QuoteNone */
        ) {
          currentProp = hyphenate(value.substring(propStart, i - 1).trim());
          valueStart = i;
        }
        break;
      case 59 /* Char.Semicolon */:
        if (
          currentProp &&
          valueStart > 0 &&
          parenDepth === 0 &&
          quote === 0 /* Char.QuoteNone */
        ) {
          const styleVal = value.substring(valueStart, i - 1).trim();
          styles.push(currentProp, styleVal);
          propStart = i;
          valueStart = 0;
          currentProp = null;
        }
        break;
    }
  }
  if (currentProp && valueStart) {
    const styleVal = value.slice(valueStart).trim();
    styles.push(currentProp, styleVal);
  }
  return styles;
}
exports.parse = parse;
function hyphenate(value) {
  return value
    .replace(/[a-z][A-Z]/g, (v) => {
      return v.charAt(0) + "-" + v.charAt(1);
    })
    .toLowerCase();
}
exports.hyphenate = hyphenate;
