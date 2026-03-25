/*
Language: ActionScript
Author: Alexander Myadzel <myadzel@gmail.com>
Category: scripting
Audit: 2020
*/

/** @type LanguageFn */
function actionscript(hljs) {
  const regex = hljs.regex;
  const IDENT_RE = /[a-zA-Z_$][a-zA-Z0-9_$]*/;
  const PKG_NAME_RE = regex.concat(
    IDENT_RE,
    regex.concat("(\\.", IDENT_RE, ")*")
  );
  const IDENT_FUNC_RETURN_TYPE_RE = /([*]|[a-zA-Z_$][a-zA-Z0-9_$]*)/;

  const AS3_REST_ARG_MODE = {
    className: 'rest_arg',
    begin: /[.]{3}/,
    end: IDENT_RE,
    relevance: 10
  };

  const KEYWORDS = [
    "as",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "delete",
    "do",
    "dynamic",
    "each",
    "else",
    "extends",
    "final",
    "finally",
    "for",
    "function",
    "get",
    "if",
    "implements",
    "import",
    "in",
    "include",
    "instanceof",
    "interface",
    "internal",
    "is",
    "namespace",
    "native",
    "new",
    "override",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "set",
    "static",
    "super",
    "switch",
    "this",
    "throw",
    "try",
    "typeof",
    "use",
    "var",
    "void",
    "while",
    "with"
  ];
  const LITERALS = [
    "true",
    "false",
    "null",
    "undefined"
  ];

  return {
    name: 'ActionScript',
    aliases: [ 'as' ],
    keywords: {
      keyword: KEYWORDS,
      literal: LITERALS
    },
    contains: [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      {
        match: [
          /\bpackage/,
          /\s+/,
          PKG_NAME_RE
        ],
        className: {
          1: "keyword",
          3: "title.class"
        }
      },
      {
        match: [
          /\b(?:class|interface|extends|implements)/,
          /\s+/,
          IDENT_RE
        ],
        className: {
          1: "keyword",
          3: "title.class"
        }
      },
      {
        className: 'meta',
        beginKeywords: 'import include',
        end: /;/,
        keywords: { keyword: 'import include' }
      },
      {
        beginKeywords: 'function',
        end: /[{;]/,
        excludeEnd: true,
        illegal: /\S/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, { className: "title.function" }),
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            contains: [
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              AS3_REST_ARG_MODE
            ]
          },
          { begin: regex.concat(/:\s*/, IDENT_FUNC_RETURN_TYPE_RE) }
        ]
      },
      hljs.METHOD_GUARD
    ],
    illegal: /#/
  };
}

module.exports = actionscript;
