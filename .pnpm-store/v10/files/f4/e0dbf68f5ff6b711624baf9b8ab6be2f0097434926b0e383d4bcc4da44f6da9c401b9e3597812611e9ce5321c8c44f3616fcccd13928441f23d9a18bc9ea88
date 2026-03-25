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
Language: Java
Author: Vsevolod Solovyov <vsevolod.solovyov@gmail.com>
Category: common, enterprise
Website: https://www.java.com/
*/


/**
 * Allows recursive regex expressions to a given depth
 *
 * ie: recurRegex("(abc~~~)", /~~~/g, 2) becomes:
 * (abc(abc(abc)))
 *
 * @param {string} re
 * @param {RegExp} substitution (should be a g mode regex)
 * @param {number} depth
 * @returns {string}``
 */
function recurRegex(re, substitution, depth) {
  if (depth === -1) return "";

  return re.replace(substitution, _ => {
    return recurRegex(re, substitution, depth - 1);
  });
}

/** @type LanguageFn */
function java(hljs) {
  const regex = hljs.regex;
  const JAVA_IDENT_RE = '[\u00C0-\u02B8a-zA-Z_$][\u00C0-\u02B8a-zA-Z_$0-9]*';
  const GENERIC_IDENT_RE = JAVA_IDENT_RE
    + recurRegex('(?:<' + JAVA_IDENT_RE + '~~~(?:\\s*,\\s*' + JAVA_IDENT_RE + '~~~)*>)?', /~~~/g, 2);
  const MAIN_KEYWORDS = [
    'synchronized',
    'abstract',
    'private',
    'var',
    'static',
    'if',
    'const ',
    'for',
    'while',
    'strictfp',
    'finally',
    'protected',
    'import',
    'native',
    'final',
    'void',
    'enum',
    'else',
    'break',
    'transient',
    'catch',
    'instanceof',
    'volatile',
    'case',
    'assert',
    'package',
    'default',
    'public',
    'try',
    'switch',
    'continue',
    'throws',
    'protected',
    'public',
    'private',
    'module',
    'requires',
    'exports',
    'do',
    'sealed',
    'yield',
    'permits',
    'goto',
    'when'
  ];

  const BUILT_INS = [
    'super',
    'this'
  ];

  const LITERALS = [
    'false',
    'true',
    'null'
  ];

  const TYPES = [
    'char',
    'boolean',
    'long',
    'float',
    'int',
    'byte',
    'short',
    'double'
  ];

  const KEYWORDS = {
    keyword: MAIN_KEYWORDS,
    literal: LITERALS,
    type: TYPES,
    built_in: BUILT_INS
  };

  const ANNOTATION = {
    className: 'meta',
    begin: '@' + JAVA_IDENT_RE,
    contains: [
      {
        begin: /\(/,
        end: /\)/,
        contains: [ "self" ] // allow nested () inside our annotation
      }
    ]
  };
  const PARAMS = {
    className: 'params',
    begin: /\(/,
    end: /\)/,
    keywords: KEYWORDS,
    relevance: 0,
    contains: [ hljs.C_BLOCK_COMMENT_MODE ],
    endsParent: true
  };

  return {
    name: 'Java',
    aliases: [ 'jsp' ],
    keywords: KEYWORDS,
    illegal: /<\/|#/,
    contains: [
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          relevance: 0,
          contains: [
            {
              // eat up @'s in emails to prevent them to be recognized as doctags
              begin: /\w+@/,
              relevance: 0
            },
            {
              className: 'doctag',
              begin: '@[A-Za-z]+'
            }
          ]
        }
      ),
      // relevance boost
      {
        begin: /import java\.[a-z]+\./,
        keywords: "import",
        relevance: 2
      },
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        begin: /"""/,
        end: /"""/,
        className: "string",
        contains: [ hljs.BACKSLASH_ESCAPE ]
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        match: [
          /\b(?:class|interface|enum|extends|implements|new)/,
          /\s+/,
          JAVA_IDENT_RE
        ],
        className: {
          1: "keyword",
          3: "title.class"
        }
      },
      {
        // Exceptions for hyphenated keywords
        match: /non-sealed/,
        scope: "keyword"
      },
      {
        begin: [
          regex.concat(/(?!else)/, JAVA_IDENT_RE),
          /\s+/,
          JAVA_IDENT_RE,
          /\s+/,
          /=(?!=)/
        ],
        className: {
          1: "type",
          3: "variable",
          5: "operator"
        }
      },
      {
        begin: [
          /record/,
          /\s+/,
          JAVA_IDENT_RE
        ],
        className: {
          1: "keyword",
          3: "title.class"
        },
        contains: [
          PARAMS,
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      {
        // Expression keywords prevent 'keyword Name(...)' from being
        // recognized as a function definition
        beginKeywords: 'new throw return else',
        relevance: 0
      },
      {
        begin: [
          '(?:' + GENERIC_IDENT_RE + '\\s+)',
          hljs.UNDERSCORE_IDENT_RE,
          /\s*(?=\()/
        ],
        className: { 2: "title.function" },
        keywords: KEYWORDS,
        contains: [
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [
              ANNOTATION,
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              NUMERIC,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      NUMERIC,
      ANNOTATION
    ]
  };
}

module.exports = java;
