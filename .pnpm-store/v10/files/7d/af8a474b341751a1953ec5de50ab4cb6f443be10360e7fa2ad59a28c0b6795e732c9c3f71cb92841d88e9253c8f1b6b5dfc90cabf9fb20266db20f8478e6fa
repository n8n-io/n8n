/*
Language: Dart
Requires: markdown.js
Author: Maxim Dikun <dikmax@gmail.com>
Description: Dart a modern, object-oriented language developed by Google. For more information see https://www.dartlang.org/
Website: https://dart.dev
Category: scripting
*/

/** @type LanguageFn */
function dart(hljs) {
  const SUBST = {
    className: 'subst',
    variants: [ { begin: '\\$[A-Za-z0-9_]+' } ]
  };

  const BRACED_SUBST = {
    className: 'subst',
    variants: [
      {
        begin: /\$\{/,
        end: /\}/
      }
    ],
    keywords: 'true false null this is new super'
  };

  const STRING = {
    className: 'string',
    variants: [
      {
        begin: 'r\'\'\'',
        end: '\'\'\''
      },
      {
        begin: 'r"""',
        end: '"""'
      },
      {
        begin: 'r\'',
        end: '\'',
        illegal: '\\n'
      },
      {
        begin: 'r"',
        end: '"',
        illegal: '\\n'
      },
      {
        begin: '\'\'\'',
        end: '\'\'\'',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST,
          BRACED_SUBST
        ]
      },
      {
        begin: '"""',
        end: '"""',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST,
          BRACED_SUBST
        ]
      },
      {
        begin: '\'',
        end: '\'',
        illegal: '\\n',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST,
          BRACED_SUBST
        ]
      },
      {
        begin: '"',
        end: '"',
        illegal: '\\n',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST,
          BRACED_SUBST
        ]
      }
    ]
  };
  BRACED_SUBST.contains = [
    hljs.C_NUMBER_MODE,
    STRING
  ];

  const BUILT_IN_TYPES = [
    // dart:core
    'Comparable',
    'DateTime',
    'Duration',
    'Function',
    'Iterable',
    'Iterator',
    'List',
    'Map',
    'Match',
    'Object',
    'Pattern',
    'RegExp',
    'Set',
    'Stopwatch',
    'String',
    'StringBuffer',
    'StringSink',
    'Symbol',
    'Type',
    'Uri',
    'bool',
    'double',
    'int',
    'num',
    // dart:html
    'Element',
    'ElementList'
  ];
  const NULLABLE_BUILT_IN_TYPES = BUILT_IN_TYPES.map((e) => `${e}?`);

  const BASIC_KEYWORDS = [
    "abstract",
    "as",
    "assert",
    "async",
    "await",
    "base",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "covariant",
    "default",
    "deferred",
    "do",
    "dynamic",
    "else",
    "enum",
    "export",
    "extends",
    "extension",
    "external",
    "factory",
    "false",
    "final",
    "finally",
    "for",
    "Function",
    "get",
    "hide",
    "if",
    "implements",
    "import",
    "in",
    "interface",
    "is",
    "late",
    "library",
    "mixin",
    "new",
    "null",
    "on",
    "operator",
    "part",
    "required",
    "rethrow",
    "return",
    "sealed",
    "set",
    "show",
    "static",
    "super",
    "switch",
    "sync",
    "this",
    "throw",
    "true",
    "try",
    "typedef",
    "var",
    "void",
    "when",
    "while",
    "with",
    "yield"
  ];

  const KEYWORDS = {
    keyword: BASIC_KEYWORDS,
    built_in:
      BUILT_IN_TYPES
        .concat(NULLABLE_BUILT_IN_TYPES)
        .concat([
          // dart:core
          'Never',
          'Null',
          'dynamic',
          'print',
          // dart:html
          'document',
          'querySelector',
          'querySelectorAll',
          'window'
        ]),
    $pattern: /[A-Za-z][A-Za-z0-9_]*\??/
  };

  return {
    name: 'Dart',
    keywords: KEYWORDS,
    contains: [
      STRING,
      hljs.COMMENT(
        /\/\*\*(?!\/)/,
        /\*\//,
        {
          subLanguage: 'markdown',
          relevance: 0
        }
      ),
      hljs.COMMENT(
        /\/{3,} ?/,
        /$/, { contains: [
          {
            subLanguage: 'markdown',
            begin: '.',
            end: '$',
            relevance: 0
          }
        ] }
      ),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'class',
        beginKeywords: 'class interface',
        end: /\{/,
        excludeEnd: true,
        contains: [
          { beginKeywords: 'extends implements' },
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      hljs.C_NUMBER_MODE,
      {
        className: 'meta',
        begin: '@[A-Za-z]+'
      },
      { begin: '=>' // No markup, just a relevance booster
      }
    ]
  };
}

module.exports = dart;
