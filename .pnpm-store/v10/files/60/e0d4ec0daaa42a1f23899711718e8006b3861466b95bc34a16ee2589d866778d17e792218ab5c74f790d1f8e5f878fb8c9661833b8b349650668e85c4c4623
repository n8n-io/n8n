/*
Language: AppleScript
Authors: Nathan Grigg <nathan@nathanamy.org>, Dr. Drang <drdrang@gmail.com>
Category: scripting
Website: https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/introduction/ASLR_intro.html
Audit: 2020
*/

/** @type LanguageFn */
function applescript(hljs) {
  const regex = hljs.regex;
  const STRING = hljs.inherit(
    hljs.QUOTE_STRING_MODE, { illegal: null });
  const PARAMS = {
    className: 'params',
    begin: /\(/,
    end: /\)/,
    contains: [
      'self',
      hljs.C_NUMBER_MODE,
      STRING
    ]
  };
  const COMMENT_MODE_1 = hljs.COMMENT(/--/, /$/);
  const COMMENT_MODE_2 = hljs.COMMENT(
    /\(\*/,
    /\*\)/,
    { contains: [
      'self', // allow nesting
      COMMENT_MODE_1
    ] }
  );
  const COMMENTS = [
    COMMENT_MODE_1,
    COMMENT_MODE_2,
    hljs.HASH_COMMENT_MODE
  ];

  const KEYWORD_PATTERNS = [
    /apart from/,
    /aside from/,
    /instead of/,
    /out of/,
    /greater than/,
    /isn't|(doesn't|does not) (equal|come before|come after|contain)/,
    /(greater|less) than( or equal)?/,
    /(starts?|ends|begins?) with/,
    /contained by/,
    /comes (before|after)/,
    /a (ref|reference)/,
    /POSIX (file|path)/,
    /(date|time) string/,
    /quoted form/
  ];

  const BUILT_IN_PATTERNS = [
    /clipboard info/,
    /the clipboard/,
    /info for/,
    /list (disks|folder)/,
    /mount volume/,
    /path to/,
    /(close|open for) access/,
    /(get|set) eof/,
    /current date/,
    /do shell script/,
    /get volume settings/,
    /random number/,
    /set volume/,
    /system attribute/,
    /system info/,
    /time to GMT/,
    /(load|run|store) script/,
    /scripting components/,
    /ASCII (character|number)/,
    /localized string/,
    /choose (application|color|file|file name|folder|from list|remote application|URL)/,
    /display (alert|dialog)/
  ];

  return {
    name: 'AppleScript',
    aliases: [ 'osascript' ],
    keywords: {
      keyword:
        'about above after against and around as at back before beginning '
        + 'behind below beneath beside between but by considering '
        + 'contain contains continue copy div does eighth else end equal '
        + 'equals error every exit fifth first for fourth from front '
        + 'get given global if ignoring in into is it its last local me '
        + 'middle mod my ninth not of on onto or over prop property put ref '
        + 'reference repeat returning script second set seventh since '
        + 'sixth some tell tenth that the|0 then third through thru '
        + 'timeout times to transaction try until where while whose with '
        + 'without',
      literal:
        'AppleScript false linefeed return pi quote result space tab true',
      built_in:
        'alias application boolean class constant date file integer list '
        + 'number real record string text '
        + 'activate beep count delay launch log offset read round '
        + 'run say summarize write '
        + 'character characters contents day frontmost id item length '
        + 'month name|0 paragraph paragraphs rest reverse running time version '
        + 'weekday word words year'
    },
    contains: [
      STRING,
      hljs.C_NUMBER_MODE,
      {
        className: 'built_in',
        begin: regex.concat(
          /\b/,
          regex.either(...BUILT_IN_PATTERNS),
          /\b/
        )
      },
      {
        className: 'built_in',
        begin: /^\s*return\b/
      },
      {
        className: 'literal',
        begin:
          /\b(text item delimiters|current application|missing value)\b/
      },
      {
        className: 'keyword',
        begin: regex.concat(
          /\b/,
          regex.either(...KEYWORD_PATTERNS),
          /\b/
        )
      },
      {
        beginKeywords: 'on',
        illegal: /[${=;\n]/,
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          PARAMS
        ]
      },
      ...COMMENTS
    ],
    illegal: /\/\/|->|=>|\[\[/
  };
}

module.exports = applescript;
