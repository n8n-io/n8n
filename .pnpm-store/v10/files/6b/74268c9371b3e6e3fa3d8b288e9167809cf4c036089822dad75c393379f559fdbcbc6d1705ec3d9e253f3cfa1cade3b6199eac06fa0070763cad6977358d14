// https://docs.oracle.com/javase/specs/jls/se15/html/jls-3.html#jls-3.10
var decimalDigits = '[0-9](_*[0-9])*';
var frac = `\\.(${decimalDigits})`;
var hexDigits = '[0-9a-fA-F](_*[0-9a-fA-F])*';
var NUMERIC = {
  className: 'number',
  variants: [
    // DecimalFloatingPointLiteral
    // including ExponentPart
    { begin: `(\\b(${decimalDigits})((${frac})|\\.)?|(${frac}))` +
      `[eE][+-]?(${decimalDigits})[fFdD]?\\b` },
    // excluding ExponentPart
    { begin: `\\b(${decimalDigits})((${frac})[fFdD]?\\b|\\.([fFdD]\\b)?)` },
    { begin: `(${frac})[fFdD]?\\b` },
    { begin: `\\b(${decimalDigits})[fFdD]\\b` },

    // HexadecimalFloatingPointLiteral
    { begin: `\\b0[xX]((${hexDigits})\\.?|(${hexDigits})?\\.(${hexDigits}))` +
      `[pP][+-]?(${decimalDigits})[fFdD]?\\b` },

    // DecimalIntegerLiteral
    { begin: '\\b(0|[1-9](_*[0-9])*)[lL]?\\b' },

    // HexIntegerLiteral
    { begin: `\\b0[xX](${hexDigits})[lL]?\\b` },

    // OctalIntegerLiteral
    { begin: '\\b0(_*[0-7])*[lL]?\\b' },

    // BinaryIntegerLiteral
    { begin: '\\b0[bB][01](_*[01])*[lL]?\\b' },
  ],
  relevance: 0
};

/*
 Language: Kotlin
 Description: Kotlin is an OSS statically typed programming language that targets the JVM, Android, JavaScript and Native.
 Author: Sergey Mashkov <cy6erGn0m@gmail.com>
 Website: https://kotlinlang.org
 Category: common
 */


function kotlin(hljs) {
  const KEYWORDS = {
    keyword:
      'abstract as val var vararg get set class object open private protected public noinline '
      + 'crossinline dynamic final enum if else do while for when throw try catch finally '
      + 'import package is in fun override companion reified inline lateinit init '
      + 'interface annotation data sealed internal infix operator out by constructor super '
      + 'tailrec where const inner suspend typealias external expect actual',
    built_in:
      'Byte Short Char Int Long Boolean Float Double Void Unit Nothing',
    literal:
      'true false null'
  };
  const KEYWORDS_WITH_LABEL = {
    className: 'keyword',
    begin: /\b(break|continue|return|this)\b/,
    starts: { contains: [
      {
        className: 'symbol',
        begin: /@\w+/
      }
    ] }
  };
  const LABEL = {
    className: 'symbol',
    begin: hljs.UNDERSCORE_IDENT_RE + '@'
  };

  // for string templates
  const SUBST = {
    className: 'subst',
    begin: /\$\{/,
    end: /\}/,
    contains: [ hljs.C_NUMBER_MODE ]
  };
  const VARIABLE = {
    className: 'variable',
    begin: '\\$' + hljs.UNDERSCORE_IDENT_RE
  };
  const STRING = {
    className: 'string',
    variants: [
      {
        begin: '"""',
        end: '"""(?=[^"])',
        contains: [
          VARIABLE,
          SUBST
        ]
      },
      // Can't use built-in modes easily, as we want to use STRING in the meta
      // context as 'meta-string' and there's no syntax to remove explicitly set
      // classNames in built-in modes.
      {
        begin: '\'',
        end: '\'',
        illegal: /\n/,
        contains: [ hljs.BACKSLASH_ESCAPE ]
      },
      {
        begin: '"',
        end: '"',
        illegal: /\n/,
        contains: [
          hljs.BACKSLASH_ESCAPE,
          VARIABLE,
          SUBST
        ]
      }
    ]
  };
  SUBST.contains.push(STRING);

  const ANNOTATION_USE_SITE = {
    className: 'meta',
    begin: '@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*' + hljs.UNDERSCORE_IDENT_RE + ')?'
  };
  const ANNOTATION = {
    className: 'meta',
    begin: '@' + hljs.UNDERSCORE_IDENT_RE,
    contains: [
      {
        begin: /\(/,
        end: /\)/,
        contains: [
          hljs.inherit(STRING, { className: 'string' }),
          "self"
        ]
      }
    ]
  };

  // https://kotlinlang.org/docs/reference/whatsnew11.html#underscores-in-numeric-literals
  // According to the doc above, the number mode of kotlin is the same as java 8,
  // so the code below is copied from java.js
  const KOTLIN_NUMBER_MODE = NUMERIC;
  const KOTLIN_NESTED_COMMENT = hljs.COMMENT(
    '/\\*', '\\*/',
    { contains: [ hljs.C_BLOCK_COMMENT_MODE ] }
  );
  const KOTLIN_PAREN_TYPE = { variants: [
    {
      className: 'type',
      begin: hljs.UNDERSCORE_IDENT_RE
    },
    {
      begin: /\(/,
      end: /\)/,
      contains: [] // defined later
    }
  ] };
  const KOTLIN_PAREN_TYPE2 = KOTLIN_PAREN_TYPE;
  KOTLIN_PAREN_TYPE2.variants[1].contains = [ KOTLIN_PAREN_TYPE ];
  KOTLIN_PAREN_TYPE.variants[1].contains = [ KOTLIN_PAREN_TYPE2 ];

  return {
    name: 'Kotlin',
    aliases: [
      'kt',
      'kts'
    ],
    keywords: KEYWORDS,
    contains: [
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          relevance: 0,
          contains: [
            {
              className: 'doctag',
              begin: '@[A-Za-z]+'
            }
          ]
        }
      ),
      hljs.C_LINE_COMMENT_MODE,
      KOTLIN_NESTED_COMMENT,
      KEYWORDS_WITH_LABEL,
      LABEL,
      ANNOTATION_USE_SITE,
      ANNOTATION,
      {
        className: 'function',
        beginKeywords: 'fun',
        end: '[(]|$',
        returnBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS,
        relevance: 5,
        contains: [
          {
            begin: hljs.UNDERSCORE_IDENT_RE + '\\s*\\(',
            returnBegin: true,
            relevance: 0,
            contains: [ hljs.UNDERSCORE_TITLE_MODE ]
          },
          {
            className: 'type',
            begin: /</,
            end: />/,
            keywords: 'reified',
            relevance: 0
          },
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            endsParent: true,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [
              {
                begin: /:/,
                end: /[=,\/]/,
                endsWithParent: true,
                contains: [
                  KOTLIN_PAREN_TYPE,
                  hljs.C_LINE_COMMENT_MODE,
                  KOTLIN_NESTED_COMMENT
                ],
                relevance: 0
              },
              hljs.C_LINE_COMMENT_MODE,
              KOTLIN_NESTED_COMMENT,
              ANNOTATION_USE_SITE,
              ANNOTATION,
              STRING,
              hljs.C_NUMBER_MODE
            ]
          },
          KOTLIN_NESTED_COMMENT
        ]
      },
      {
        begin: [
          /class|interface|trait/,
          /\s+/,
          hljs.UNDERSCORE_IDENT_RE
        ],
        beginScope: {
          3: "title.class"
        },
        keywords: 'class interface trait',
        end: /[:\{(]|$/,
        excludeEnd: true,
        illegal: 'extends implements',
        contains: [
          { beginKeywords: 'public protected internal private constructor' },
          hljs.UNDERSCORE_TITLE_MODE,
          {
            className: 'type',
            begin: /</,
            end: />/,
            excludeBegin: true,
            excludeEnd: true,
            relevance: 0
          },
          {
            className: 'type',
            begin: /[,:]\s*/,
            end: /[<\(,){\s]|$/,
            excludeBegin: true,
            returnEnd: true
          },
          ANNOTATION_USE_SITE,
          ANNOTATION
        ]
      },
      STRING,
      {
        className: 'meta',
        begin: "^#!/usr/bin/env",
        end: '$',
        illegal: '\n'
      },
      KOTLIN_NUMBER_MODE
    ]
  };
}

module.exports = kotlin;
