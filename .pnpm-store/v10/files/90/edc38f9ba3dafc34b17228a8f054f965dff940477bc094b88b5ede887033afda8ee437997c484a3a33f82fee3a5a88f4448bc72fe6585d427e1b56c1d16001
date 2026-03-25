/*
Language: Wren
Description: Think Smalltalk in a Lua-sized package with a dash of Erlang and wrapped up in a familiar, modern syntax.
Category: scripting
Author: @joshgoebel
Maintainer: @joshgoebel
Website: https://wren.io/
*/

/** @type LanguageFn */
function wren(hljs) {
  const regex = hljs.regex;
  const IDENT_RE = /[a-zA-Z]\w*/;
  const KEYWORDS = [
    "as",
    "break",
    "class",
    "construct",
    "continue",
    "else",
    "for",
    "foreign",
    "if",
    "import",
    "in",
    "is",
    "return",
    "static",
    "var",
    "while"
  ];
  const LITERALS = [
    "true",
    "false",
    "null"
  ];
  const LANGUAGE_VARS = [
    "this",
    "super"
  ];
  const CORE_CLASSES = [
    "Bool",
    "Class",
    "Fiber",
    "Fn",
    "List",
    "Map",
    "Null",
    "Num",
    "Object",
    "Range",
    "Sequence",
    "String",
    "System"
  ];
  const OPERATORS = [
    "-",
    "~",
    /\*/,
    "%",
    /\.\.\./,
    /\.\./,
    /\+/,
    "<<",
    ">>",
    ">=",
    "<=",
    "<",
    ">",
    /\^/,
    /!=/,
    /!/,
    /\bis\b/,
    "==",
    "&&",
    "&",
    /\|\|/,
    /\|/,
    /\?:/,
    "="
  ];
  const FUNCTION = {
    relevance: 0,
    match: regex.concat(/\b(?!(if|while|for|else|super)\b)/, IDENT_RE, /(?=\s*[({])/),
    className: "title.function"
  };
  const FUNCTION_DEFINITION = {
    match: regex.concat(
      regex.either(
        regex.concat(/\b(?!(if|while|for|else|super)\b)/, IDENT_RE),
        regex.either(...OPERATORS)
      ),
      /(?=\s*\([^)]+\)\s*\{)/),
    className: "title.function",
    starts: { contains: [
      {
        begin: /\(/,
        end: /\)/,
        contains: [
          {
            relevance: 0,
            scope: "params",
            match: IDENT_RE
          }
        ]
      }
    ] }
  };
  const CLASS_DEFINITION = {
    variants: [
      { match: [
        /class\s+/,
        IDENT_RE,
        /\s+is\s+/,
        IDENT_RE
      ] },
      { match: [
        /class\s+/,
        IDENT_RE
      ] }
    ],
    scope: {
      2: "title.class",
      4: "title.class.inherited"
    },
    keywords: KEYWORDS
  };

  const OPERATOR = {
    relevance: 0,
    match: regex.either(...OPERATORS),
    className: "operator"
  };

  const TRIPLE_STRING = {
    className: "string",
    begin: /"""/,
    end: /"""/
  };

  const PROPERTY = {
    className: "property",
    begin: regex.concat(/\./, regex.lookahead(IDENT_RE)),
    end: IDENT_RE,
    excludeBegin: true,
    relevance: 0
  };

  const FIELD = {
    relevance: 0,
    match: regex.concat(/\b_/, IDENT_RE),
    scope: "variable"
  };

  // CamelCase
  const CLASS_REFERENCE = {
    relevance: 0,
    match: /\b[A-Z]+[a-z]+([A-Z]+[a-z]+)*/,
    scope: "title.class",
    keywords: { _: CORE_CLASSES }
  };

  // TODO: add custom number modes
  const NUMBER = hljs.C_NUMBER_MODE;

  const SETTER = {
    match: [
      IDENT_RE,
      /\s*/,
      /=/,
      /\s*/,
      /\(/,
      IDENT_RE,
      /\)\s*\{/
    ],
    scope: {
      1: "title.function",
      3: "operator",
      6: "params"
    }
  };

  const COMMENT_DOCS = hljs.COMMENT(
    /\/\*\*/,
    /\*\//,
    { contains: [
      {
        match: /@[a-z]+/,
        scope: "doctag"
      },
      "self"
    ] }
  );
  const SUBST = {
    scope: "subst",
    begin: /%\(/,
    end: /\)/,
    contains: [
      NUMBER,
      CLASS_REFERENCE,
      FUNCTION,
      FIELD,
      OPERATOR
    ]
  };
  const STRING = {
    scope: "string",
    begin: /"/,
    end: /"/,
    contains: [
      SUBST,
      {
        scope: "char.escape",
        variants: [
          { match: /\\\\|\\["0%abefnrtv]/ },
          { match: /\\x[0-9A-F]{2}/ },
          { match: /\\u[0-9A-F]{4}/ },
          { match: /\\U[0-9A-F]{8}/ }
        ]
      }
    ]
  };
  SUBST.contains.push(STRING);

  const ALL_KWS = [
    ...KEYWORDS,
    ...LANGUAGE_VARS,
    ...LITERALS
  ];
  const VARIABLE = {
    relevance: 0,
    match: regex.concat(
      "\\b(?!",
      ALL_KWS.join("|"),
      "\\b)",
      /[a-zA-Z_]\w*(?:[?!]|\b)/
    ),
    className: "variable"
  };

  // TODO: reconsider this in the future
  const ATTRIBUTE = {
    // scope: "meta",
    scope: "comment",
    variants: [
      {
        begin: [
          /#!?/,
          /[A-Za-z_]+(?=\()/
        ],
        beginScope: {
          // 2: "attr"
        },
        keywords: { literal: LITERALS },
        contains: [
          // NUMBER,
          // VARIABLE
        ],
        end: /\)/
      },
      {
        begin: [
          /#!?/,
          /[A-Za-z_]+/
        ],
        beginScope: {
          // 2: "attr"
        },
        end: /$/
      }
    ]
  };

  return {
    name: "Wren",
    keywords: {
      keyword: KEYWORDS,
      "variable.language": LANGUAGE_VARS,
      literal: LITERALS
    },
    contains: [
      ATTRIBUTE,
      NUMBER,
      STRING,
      TRIPLE_STRING,
      COMMENT_DOCS,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      CLASS_REFERENCE,
      CLASS_DEFINITION,
      SETTER,
      FUNCTION_DEFINITION,
      FUNCTION,
      OPERATOR,
      FIELD,
      PROPERTY,
      VARIABLE
    ]
  };
}

export { wren as default };
