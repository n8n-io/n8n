/*
Language: Scilab
Author: Sylvestre Ledru <sylvestre.ledru@scilab-enterprises.com>
Origin: matlab.js
Description: Scilab is a port from Matlab
Website: https://www.scilab.org
Category: scientific
*/

function scilab(hljs) {
  const COMMON_CONTAINS = [
    hljs.C_NUMBER_MODE,
    {
      className: 'string',
      begin: '\'|\"',
      end: '\'|\"',
      contains: [
        hljs.BACKSLASH_ESCAPE,
        { begin: '\'\'' }
      ]
    }
  ];

  return {
    name: 'Scilab',
    aliases: [ 'sci' ],
    keywords: {
      $pattern: /%?\w+/,
      keyword: 'abort break case clear catch continue do elseif else endfunction end for function '
        + 'global if pause return resume select try then while',
      literal:
        '%f %F %t %T %pi %eps %inf %nan %e %i %z %s',
      built_in: // Scilab has more than 2000 functions. Just list the most commons
       'abs and acos asin atan ceil cd chdir clearglobal cosh cos cumprod deff disp error '
       + 'exec execstr exists exp eye gettext floor fprintf fread fsolve imag isdef isempty '
       + 'isinfisnan isvector lasterror length load linspace list listfiles log10 log2 log '
       + 'max min msprintf mclose mopen ones or pathconvert poly printf prod pwd rand real '
       + 'round sinh sin size gsort sprintf sqrt strcat strcmps tring sum system tanh tan '
       + 'type typename warning zeros matrix'
    },
    illegal: '("|#|/\\*|\\s+/\\w+)',
    contains: [
      {
        className: 'function',
        beginKeywords: 'function',
        end: '$',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          {
            className: 'params',
            begin: '\\(',
            end: '\\)'
          }
        ]
      },
      // seems to be a guard against [ident]' or [ident].
      // perhaps to prevent attributes from flagging as keywords?
      {
        begin: '[a-zA-Z_][a-zA-Z_0-9]*[\\.\']+',
        relevance: 0
      },
      {
        begin: '\\[',
        end: '\\][\\.\']*',
        relevance: 0,
        contains: COMMON_CONTAINS
      },
      hljs.COMMENT('//', '$')
    ].concat(COMMON_CONTAINS)
  };
}

module.exports = scilab;
