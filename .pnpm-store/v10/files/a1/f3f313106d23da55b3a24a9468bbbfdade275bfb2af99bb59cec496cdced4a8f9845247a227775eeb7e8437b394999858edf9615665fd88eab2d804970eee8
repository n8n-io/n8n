/*
Language: Nix
Author: Domen Kožar <domen@dev.si>
Description: Nix functional language
Website: http://nixos.org/nix
*/

function nix(hljs) {
  const KEYWORDS = {
    keyword: [
      "rec",
      "with",
      "let",
      "in",
      "inherit",
      "assert",
      "if",
      "else",
      "then"
    ],
    literal: [
      "true",
      "false",
      "or",
      "and",
      "null"
    ],
    built_in: [
      "import",
      "abort",
      "baseNameOf",
      "dirOf",
      "isNull",
      "builtins",
      "map",
      "removeAttrs",
      "throw",
      "toString",
      "derivation"
    ]
  };
  const ANTIQUOTE = {
    className: 'subst',
    begin: /\$\{/,
    end: /\}/,
    keywords: KEYWORDS
  };
  const ESCAPED_DOLLAR = {
    className: 'char.escape',
    begin: /''\$/,
  };
  const ATTRS = {
    begin: /[a-zA-Z0-9-_]+(\s*=)/,
    returnBegin: true,
    relevance: 0,
    contains: [
      {
        className: 'attr',
        begin: /\S+/,
        relevance: 0.2
      }
    ]
  };
  const STRING = {
    className: 'string',
    contains: [ ESCAPED_DOLLAR, ANTIQUOTE ],
    variants: [
      {
        begin: "''",
        end: "''"
      },
      {
        begin: '"',
        end: '"'
      }
    ]
  };
  const EXPRESSIONS = [
    hljs.NUMBER_MODE,
    hljs.HASH_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    STRING,
    ATTRS
  ];
  ANTIQUOTE.contains = EXPRESSIONS;
  return {
    name: 'Nix',
    aliases: [ "nixos" ],
    keywords: KEYWORDS,
    contains: EXPRESSIONS
  };
}

module.exports = nix;
