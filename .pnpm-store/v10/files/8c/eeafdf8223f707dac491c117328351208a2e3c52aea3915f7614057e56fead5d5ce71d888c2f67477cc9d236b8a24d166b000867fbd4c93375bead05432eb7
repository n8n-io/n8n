/*
Language: STEP Part 21
Contributors: Adam Joseph Cook <adam.joseph.cook@gmail.com>
Description: Syntax highlighter for STEP Part 21 files (ISO 10303-21).
Website: https://en.wikipedia.org/wiki/ISO_10303-21
*/

function step21(hljs) {
  const STEP21_IDENT_RE = '[A-Z_][A-Z0-9_.]*';
  const STEP21_KEYWORDS = {
    $pattern: STEP21_IDENT_RE,
    keyword: [
      "HEADER",
      "ENDSEC",
      "DATA"
    ]
  };
  const STEP21_START = {
    className: 'meta',
    begin: 'ISO-10303-21;',
    relevance: 10
  };
  const STEP21_CLOSE = {
    className: 'meta',
    begin: 'END-ISO-10303-21;',
    relevance: 10
  };

  return {
    name: 'STEP Part 21',
    aliases: [
      'p21',
      'step',
      'stp'
    ],
    case_insensitive: true, // STEP 21 is case insensitive in theory, in practice all non-comments are capitalized.
    keywords: STEP21_KEYWORDS,
    contains: [
      STEP21_START,
      STEP21_CLOSE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.COMMENT('/\\*\\*!', '\\*/'),
      hljs.C_NUMBER_MODE,
      hljs.inherit(hljs.APOS_STRING_MODE, { illegal: null }),
      hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
      {
        className: 'string',
        begin: "'",
        end: "'"
      },
      {
        className: 'symbol',
        variants: [
          {
            begin: '#',
            end: '\\d+',
            illegal: '\\W'
          }
        ]
      }
    ]
  };
}

export { step21 as default };
