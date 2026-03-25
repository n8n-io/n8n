/*
Language: Haskell
Author: Jeremy Hull <sourdrums@gmail.com>
Contributors: Zena Treep <zena.treep@gmail.com>
Website: https://www.haskell.org
Category: functional
*/

function haskell(hljs) {

  /* See:
     - https://www.haskell.org/onlinereport/lexemes.html
     - https://downloads.haskell.org/ghc/9.0.1/docs/html/users_guide/exts/binary_literals.html
     - https://downloads.haskell.org/ghc/9.0.1/docs/html/users_guide/exts/numeric_underscores.html
     - https://downloads.haskell.org/ghc/9.0.1/docs/html/users_guide/exts/hex_float_literals.html
  */
  const decimalDigits = '([0-9]_*)+';
  const hexDigits = '([0-9a-fA-F]_*)+';
  const binaryDigits = '([01]_*)+';
  const octalDigits = '([0-7]_*)+';
  const ascSymbol = '[!#$%&*+.\\/<=>?@\\\\^~-]';
  const uniSymbol = '(\\p{S}|\\p{P})'; // Symbol or Punctuation
  const special = '[(),;\\[\\]`|{}]';
  const symbol = `(${ascSymbol}|(?!(${special}|[_:"']))${uniSymbol})`;

  const COMMENT = { variants: [
    // Double dash forms a valid comment only if it's not part of legal lexeme.
    // See: Haskell 98 report: https://www.haskell.org/onlinereport/lexemes.html
    //
    // The commented code does the job, but we can't use negative lookbehind,
    // due to poor support by Safari browser.
    // > hljs.COMMENT(`(?<!${symbol})--+(?!${symbol})`, '$'),
    // So instead, we'll add a no-markup rule before the COMMENT rule in the rules list
    // to match the problematic infix operators that contain double dash.
    hljs.COMMENT('--+', '$'),
    hljs.COMMENT(
      /\{-/,
      /-\}/,
      { contains: [ 'self' ] }
    )
  ] };

  const PRAGMA = {
    className: 'meta',
    begin: /\{-#/,
    end: /#-\}/
  };

  const PREPROCESSOR = {
    className: 'meta',
    begin: '^#',
    end: '$'
  };

  const CONSTRUCTOR = {
    className: 'type',
    begin: '\\b[A-Z][\\w\']*', // TODO: other constructors (build-in, infix).
    relevance: 0
  };

  const LIST = {
    begin: '\\(',
    end: '\\)',
    illegal: '"',
    contains: [
      PRAGMA,
      PREPROCESSOR,
      {
        className: 'type',
        begin: '\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?'
      },
      hljs.inherit(hljs.TITLE_MODE, { begin: '[_a-z][\\w\']*' }),
      COMMENT
    ]
  };

  const RECORD = {
    begin: /\{/,
    end: /\}/,
    contains: LIST.contains
  };

  const NUMBER = {
    className: 'number',
    relevance: 0,
    variants: [
      // decimal floating-point-literal (subsumes decimal-literal)
      { match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?` + `([eE][+-]?(${decimalDigits}))?\\b` },
      // hexadecimal floating-point-literal (subsumes hexadecimal-literal)
      { match: `\\b0[xX]_*(${hexDigits})(\\.(${hexDigits}))?` + `([pP][+-]?(${decimalDigits}))?\\b` },
      // octal-literal
      { match: `\\b0[oO](${octalDigits})\\b` },
      // binary-literal
      { match: `\\b0[bB](${binaryDigits})\\b` }
    ]
  };

  return {
    name: 'Haskell',
    aliases: [ 'hs' ],
    keywords:
      'let in if then else case of where do module import hiding '
      + 'qualified type data newtype deriving class instance as default '
      + 'infix infixl infixr foreign export ccall stdcall cplusplus '
      + 'jvm dotnet safe unsafe family forall mdo proc rec',
    unicodeRegex: true,
    contains: [
      // Top-level constructions.
      {
        beginKeywords: 'module',
        end: 'where',
        keywords: 'module where',
        contains: [
          LIST,
          COMMENT
        ],
        illegal: '\\W\\.|;'
      },
      {
        begin: '\\bimport\\b',
        end: '$',
        keywords: 'import qualified as hiding',
        contains: [
          LIST,
          COMMENT
        ],
        illegal: '\\W\\.|;'
      },
      {
        className: 'class',
        begin: '^(\\s*)?(class|instance)\\b',
        end: 'where',
        keywords: 'class family instance where',
        contains: [
          CONSTRUCTOR,
          LIST,
          COMMENT
        ]
      },
      {
        className: 'class',
        begin: '\\b(data|(new)?type)\\b',
        end: '$',
        keywords: 'data family type newtype deriving',
        contains: [
          PRAGMA,
          CONSTRUCTOR,
          LIST,
          RECORD,
          COMMENT
        ]
      },
      {
        beginKeywords: 'default',
        end: '$',
        contains: [
          CONSTRUCTOR,
          LIST,
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
        begin: '\\bforeign\\b',
        end: '$',
        keywords: 'foreign import export ccall stdcall cplusplus jvm '
                  + 'dotnet safe unsafe',
        contains: [
          CONSTRUCTOR,
          hljs.QUOTE_STRING_MODE,
          COMMENT
        ]
      },
      {
        className: 'meta',
        begin: '#!\\/usr\\/bin\\/env\ runhaskell',
        end: '$'
      },
      // "Whitespaces".
      PRAGMA,
      PREPROCESSOR,

      // Literals and names.

      // Single characters.
      {
        scope: 'string',
        begin: /'(?=\\?.')/,
        end: /'/,
        contains: [
          {
            scope: 'char.escape',
            match: /\\./,
          },
        ]
      },
      hljs.QUOTE_STRING_MODE,
      NUMBER,
      CONSTRUCTOR,
      hljs.inherit(hljs.TITLE_MODE, { begin: '^[_a-z][\\w\']*' }),
      // No markup, prevents infix operators from being recognized as comments.
      { begin: `(?!-)${symbol}--+|--+(?!-)${symbol}`},
      COMMENT,
      { // No markup, relevance booster
        begin: '->|<-' }
    ]
  };
}

export { haskell as default };
