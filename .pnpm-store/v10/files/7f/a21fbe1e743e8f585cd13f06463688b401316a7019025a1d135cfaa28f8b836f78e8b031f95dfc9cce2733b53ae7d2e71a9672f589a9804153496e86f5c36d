/*
Language: .properties
Contributors: Valentin Aitken <valentin@nalisbg.com>, Egor Rogov <e.rogov@postgrespro.ru>
Website: https://en.wikipedia.org/wiki/.properties
Category: config
*/

/** @type LanguageFn */
function properties(hljs) {
  // whitespaces: space, tab, formfeed
  const WS0 = '[ \\t\\f]*';
  const WS1 = '[ \\t\\f]+';
  // delimiter
  const EQUAL_DELIM = WS0 + '[:=]' + WS0;
  const WS_DELIM = WS1;
  const DELIM = '(' + EQUAL_DELIM + '|' + WS_DELIM + ')';
  const KEY = '([^\\\\:= \\t\\f\\n]|\\\\.)+';

  const DELIM_AND_VALUE = {
    // skip DELIM
    end: DELIM,
    relevance: 0,
    starts: {
      // value: everything until end of line (again, taking into account backslashes)
      className: 'string',
      end: /$/,
      relevance: 0,
      contains: [
        { begin: '\\\\\\\\' },
        { begin: '\\\\\\n' }
      ]
    }
  };

  return {
    name: '.properties',
    disableAutodetect: true,
    case_insensitive: true,
    illegal: /\S/,
    contains: [
      hljs.COMMENT('^\\s*[!#]', '$'),
      // key: everything until whitespace or = or : (taking into account backslashes)
      // case of a key-value pair
      {
        returnBegin: true,
        variants: [
          { begin: KEY + EQUAL_DELIM },
          { begin: KEY + WS_DELIM }
        ],
        contains: [
          {
            className: 'attr',
            begin: KEY,
            endsParent: true
          }
        ],
        starts: DELIM_AND_VALUE
      },
      // case of an empty key
      {
        className: 'attr',
        begin: KEY + WS0 + '$'
      }
    ]
  };
}

module.exports = properties;
