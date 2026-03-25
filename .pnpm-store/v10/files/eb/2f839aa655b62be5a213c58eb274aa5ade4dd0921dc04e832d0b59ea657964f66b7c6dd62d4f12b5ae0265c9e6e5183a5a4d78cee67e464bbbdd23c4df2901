/*
Language: C/AL
Author: Kenneth Fuglsang Christensen <kfuglsang@gmail.com>
Description: Provides highlighting of Microsoft Dynamics NAV C/AL code files
Website: https://docs.microsoft.com/en-us/dynamics-nav/programming-in-c-al
Category: enterprise
*/

/** @type LanguageFn */
function cal(hljs) {
  const regex = hljs.regex;
  const KEYWORDS = [
    "div",
    "mod",
    "in",
    "and",
    "or",
    "not",
    "xor",
    "asserterror",
    "begin",
    "case",
    "do",
    "downto",
    "else",
    "end",
    "exit",
    "for",
    "local",
    "if",
    "of",
    "repeat",
    "then",
    "to",
    "until",
    "while",
    "with",
    "var"
  ];
  const LITERALS = 'false true';
  const COMMENT_MODES = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.COMMENT(
      /\{/,
      /\}/,
      { relevance: 0 }
    ),
    hljs.COMMENT(
      /\(\*/,
      /\*\)/,
      { relevance: 10 }
    )
  ];
  const STRING = {
    className: 'string',
    begin: /'/,
    end: /'/,
    contains: [ { begin: /''/ } ]
  };
  const CHAR_STRING = {
    className: 'string',
    begin: /(#\d+)+/
  };
  const DATE = {
    className: 'number',
    begin: '\\b\\d+(\\.\\d+)?(DT|D|T)',
    relevance: 0
  };
  const DBL_QUOTED_VARIABLE = {
    className: 'string', // not a string technically but makes sense to be highlighted in the same style
    begin: '"',
    end: '"'
  };

  const PROCEDURE = {
    match: [
      /procedure/,
      /\s+/,
      /[a-zA-Z_][\w@]*/,
      /\s*/
    ],
    scope: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS,
        contains: [
          STRING,
          CHAR_STRING,
          hljs.NUMBER_MODE
        ]
      },
      ...COMMENT_MODES
    ]
  };

  const OBJECT_TYPES = [
    "Table",
    "Form",
    "Report",
    "Dataport",
    "Codeunit",
    "XMLport",
    "MenuSuite",
    "Page",
    "Query"
  ];
  const OBJECT = {
    match: [
      /OBJECT/,
      /\s+/,
      regex.either(...OBJECT_TYPES),
      /\s+/,
      /\d+/,
      /\s+(?=[^\s])/,
      /.*/,
      /$/
    ],
    relevance: 3,
    scope: {
      1: "keyword",
      3: "type",
      5: "number",
      7: "title"
    }
  };

  const PROPERTY = {
    match: /[\w]+(?=\=)/,
    scope: "attribute",
    relevance: 0
  };

  return {
    name: 'C/AL',
    case_insensitive: true,
    keywords: {
      keyword: KEYWORDS,
      literal: LITERALS
    },
    illegal: /\/\*/,
    contains: [
      PROPERTY,
      STRING,
      CHAR_STRING,
      DATE,
      DBL_QUOTED_VARIABLE,
      hljs.NUMBER_MODE,
      OBJECT,
      PROCEDURE
    ]
  };
}

module.exports = cal;
