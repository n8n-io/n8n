/*
Language: Lua
Description: Lua is a powerful, efficient, lightweight, embeddable scripting language.
Author: Andrew Fedorov <dmmdrs@mail.ru>
Category: common, scripting
Website: https://www.lua.org
*/

function lua(hljs) {
  const OPENING_LONG_BRACKET = '\\[=*\\[';
  const CLOSING_LONG_BRACKET = '\\]=*\\]';
  const LONG_BRACKETS = {
    begin: OPENING_LONG_BRACKET,
    end: CLOSING_LONG_BRACKET,
    contains: [ 'self' ]
  };
  const COMMENTS = [
    hljs.COMMENT('--(?!' + OPENING_LONG_BRACKET + ')', '$'),
    hljs.COMMENT(
      '--' + OPENING_LONG_BRACKET,
      CLOSING_LONG_BRACKET,
      {
        contains: [ LONG_BRACKETS ],
        relevance: 10
      }
    )
  ];
  return {
    name: 'Lua',
    keywords: {
      $pattern: hljs.UNDERSCORE_IDENT_RE,
      literal: "true false nil",
      keyword: "and break do else elseif end for goto if in local not or repeat return then until while",
      built_in:
        // Metatags and globals:
        '_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len '
        + '__gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert '
        // Standard methods and properties:
        + 'collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring '
        + 'module next pairs pcall print rawequal rawget rawset require select setfenv '
        + 'setmetatable tonumber tostring type unpack xpcall arg self '
        // Library methods and properties (one line per library):
        + 'coroutine resume yield status wrap create running debug getupvalue '
        + 'debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv '
        + 'io lines write close flush open output type read stderr stdin input stdout popen tmpfile '
        + 'math log max acos huge ldexp pi cos tanh pow deg tan cosh sinh random randomseed frexp ceil floor rad abs sqrt modf asin min mod fmod log10 atan2 exp sin atan '
        + 'os exit setlocale date getenv difftime remove time clock tmpname rename execute package preload loadlib loaded loaders cpath config path seeall '
        + 'string sub upper len gfind rep find match char dump gmatch reverse byte format gsub lower '
        + 'table setn insert getn foreachi maxn foreach concat sort remove'
    },
    contains: COMMENTS.concat([
      {
        className: 'function',
        beginKeywords: 'function',
        end: '\\)',
        contains: [
          hljs.inherit(hljs.TITLE_MODE, { begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*' }),
          {
            className: 'params',
            begin: '\\(',
            endsWithParent: true,
            contains: COMMENTS
          }
        ].concat(COMMENTS)
      },
      hljs.C_NUMBER_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: OPENING_LONG_BRACKET,
        end: CLOSING_LONG_BRACKET,
        contains: [ LONG_BRACKETS ],
        relevance: 5
      }
    ])
  };
}

export { lua as default };
