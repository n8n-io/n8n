/*
Language: MoonScript
Author: Billy Quith <chinbillybilbo@gmail.com>
Description: MoonScript is a programming language that transcompiles to Lua.
Origin: coffeescript.js
Website: http://moonscript.org/
Category: scripting
*/

function moonscript(hljs) {
  const KEYWORDS = {
    keyword:
      // Moonscript keywords
      'if then not for in while do return else elseif break continue switch and or '
      + 'unless when class extends super local import export from using',
    literal:
      'true false nil',
    built_in:
      '_G _VERSION assert collectgarbage dofile error getfenv getmetatable ipairs load '
      + 'loadfile loadstring module next pairs pcall print rawequal rawget rawset require '
      + 'select setfenv setmetatable tonumber tostring type unpack xpcall coroutine debug '
      + 'io math os package string table'
  };
  const JS_IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  const SUBST = {
    className: 'subst',
    begin: /#\{/,
    end: /\}/,
    keywords: KEYWORDS
  };
  const EXPRESSIONS = [
    hljs.inherit(hljs.C_NUMBER_MODE,
      { starts: {
        end: '(\\s*/)?',
        relevance: 0
      } }), // a number tries to eat the following slash to prevent treating it as a regexp
    {
      className: 'string',
      variants: [
        {
          begin: /'/,
          end: /'/,
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: /"/,
          end: /"/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ]
        }
      ]
    },
    {
      className: 'built_in',
      begin: '@__' + hljs.IDENT_RE
    },
    { begin: '@' + hljs.IDENT_RE // relevance booster on par with CoffeeScript
    },
    { begin: hljs.IDENT_RE + '\\\\' + hljs.IDENT_RE // inst\method
    }
  ];
  SUBST.contains = EXPRESSIONS;

  const TITLE = hljs.inherit(hljs.TITLE_MODE, { begin: JS_IDENT_RE });
  const POSSIBLE_PARAMS_RE = '(\\(.*\\)\\s*)?\\B[-=]>';
  const PARAMS = {
    className: 'params',
    begin: '\\([^\\(]',
    returnBegin: true,
    /* We need another contained nameless mode to not have every nested
    pair of parens to be called "params" */
    contains: [
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS,
        contains: [ 'self' ].concat(EXPRESSIONS)
      }
    ]
  };

  return {
    name: 'MoonScript',
    aliases: [ 'moon' ],
    keywords: KEYWORDS,
    illegal: /\/\*/,
    contains: EXPRESSIONS.concat([
      hljs.COMMENT('--', '$'),
      {
        className: 'function', // function: -> =>
        begin: '^\\s*' + JS_IDENT_RE + '\\s*=\\s*' + POSSIBLE_PARAMS_RE,
        end: '[-=]>',
        returnBegin: true,
        contains: [
          TITLE,
          PARAMS
        ]
      },
      {
        begin: /[\(,:=]\s*/, // anonymous function start
        relevance: 0,
        contains: [
          {
            className: 'function',
            begin: POSSIBLE_PARAMS_RE,
            end: '[-=]>',
            returnBegin: true,
            contains: [ PARAMS ]
          }
        ]
      },
      {
        className: 'class',
        beginKeywords: 'class',
        end: '$',
        illegal: /[:="\[\]]/,
        contains: [
          {
            beginKeywords: 'extends',
            endsWithParent: true,
            illegal: /[:="\[\]]/,
            contains: [ TITLE ]
          },
          TITLE
        ]
      },
      {
        className: 'name', // table
        begin: JS_IDENT_RE + ':',
        end: ':',
        returnBegin: true,
        returnEnd: true,
        relevance: 0
      }
    ])
  };
}

export { moonscript as default };
