/*
Language: Elm
Author: Janis Voigtlaender <janis.voigtlaender@gmail.com>
Website: https://elm-lang.org
Category: functional
*/

/** @type LanguageFn */
function elm(hljs) {
  const COMMENT = { variants: [
    hljs.COMMENT('--', '$'),
    hljs.COMMENT(
      /\{-/,
      /-\}/,
      { contains: [ 'self' ] }
    )
  ] };

  const CONSTRUCTOR = {
    className: 'type',
    begin: '\\b[A-Z][\\w\']*', // TODO: other constructors (built-in, infix).
    relevance: 0
  };

  const LIST = {
    begin: '\\(',
    end: '\\)',
    illegal: '"',
    contains: [
      {
        className: 'type',
        begin: '\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?'
      },
      COMMENT
    ]
  };

  const RECORD = {
    begin: /\{/,
    end: /\}/,
    contains: LIST.contains
  };

  const CHARACTER = {
    className: 'string',
    begin: '\'\\\\?.',
    end: '\'',
    illegal: '.'
  };

  const KEYWORDS = [
    "let",
    "in",
    "if",
    "then",
    "else",
    "case",
    "of",
    "where",
    "module",
    "import",
    "exposing",
    "type",
    "alias",
    "as",
    "infix",
    "infixl",
    "infixr",
    "port",
    "effect",
    "command",
    "subscription"
  ];

  return {
    name: 'Elm',
    keywords: KEYWORDS,
    contains: [

      // Top-level constructions.

      {
        beginKeywords: 'port effect module',
        end: 'exposing',
        keywords: 'port effect module where command subscription exposing',
        contains: [
          LIST,
          COMMENT
        ],
        illegal: '\\W\\.|;'
      },
      {
        begin: 'import',
        end: '$',
        keywords: 'import as exposing',
        contains: [
          LIST,
          COMMENT
        ],
        illegal: '\\W\\.|;'
      },
      {
        begin: 'type',
        end: '$',
        keywords: 'type alias',
        contains: [
          CONSTRUCTOR,
          LIST,
          RECORD,
          COMMENT
        ]
      },
      {
        beginKeywords: 'infix infixl infixr',
        end: '$',
        contains: [
          hljs.C_NUMBER_MODE,
          COMMENT
        ]
      },
      {
        begin: 'port',
        end: '$',
        keywords: 'port',
        contains: [ COMMENT ]
      },

      // Literals and names.
      CHARACTER,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      CONSTRUCTOR,
      hljs.inherit(hljs.TITLE_MODE, { begin: '^[_a-z][\\w\']*' }),
      COMMENT,

      { // No markup, relevance booster
        begin: '->|<-' }
    ],
    illegal: /;/
  };
}

export { elm as default };
