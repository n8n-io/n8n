/*
Language: Augmented Backus-Naur Form
Author: Alex McKibben <alex@nullscope.net>
Website: https://tools.ietf.org/html/rfc5234
Category: syntax
Audit: 2020
*/

/** @type LanguageFn */
function abnf(hljs) {
  const regex = hljs.regex;
  const IDENT = /^[a-zA-Z][a-zA-Z0-9-]*/;

  const KEYWORDS = [
    "ALPHA",
    "BIT",
    "CHAR",
    "CR",
    "CRLF",
    "CTL",
    "DIGIT",
    "DQUOTE",
    "HEXDIG",
    "HTAB",
    "LF",
    "LWSP",
    "OCTET",
    "SP",
    "VCHAR",
    "WSP"
  ];

  const COMMENT = hljs.COMMENT(/;/, /$/);

  const TERMINAL_BINARY = {
    scope: "symbol",
    match: /%b[0-1]+(-[0-1]+|(\.[0-1]+)+)?/
  };

  const TERMINAL_DECIMAL = {
    scope: "symbol",
    match: /%d[0-9]+(-[0-9]+|(\.[0-9]+)+)?/
  };

  const TERMINAL_HEXADECIMAL = {
    scope: "symbol",
    match: /%x[0-9A-F]+(-[0-9A-F]+|(\.[0-9A-F]+)+)?/
  };

  const CASE_SENSITIVITY = {
    scope: "symbol",
    match: /%[si](?=".*")/
  };

  const RULE_DECLARATION = {
    scope: "attribute",
    match: regex.concat(IDENT, /(?=\s*=)/)
  };

  const ASSIGNMENT = {
    scope: "operator",
    match: /=\/?/
  };

  return {
    name: 'Augmented Backus-Naur Form',
    illegal: /[!@#$^&',?+~`|:]/,
    keywords: KEYWORDS,
    contains: [
      ASSIGNMENT,
      RULE_DECLARATION,
      COMMENT,
      TERMINAL_BINARY,
      TERMINAL_DECIMAL,
      TERMINAL_HEXADECIMAL,
      CASE_SENSITIVITY,
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE
    ]
  };
}

module.exports = abnf;
