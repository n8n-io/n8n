/*
Language: Lisp
Description: Generic lisp syntax
Author: Vasily Polovnyov <vast@whiteants.net>
Category: lisp
*/

function lisp(hljs) {
  const LISP_IDENT_RE = '[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*';
  const MEC_RE = '\\|[^]*?\\|';
  const LISP_SIMPLE_NUMBER_RE = '(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?';
  const LITERAL = {
    className: 'literal',
    begin: '\\b(t{1}|nil)\\b'
  };
  const NUMBER = {
    className: 'number',
    variants: [
      {
        begin: LISP_SIMPLE_NUMBER_RE,
        relevance: 0
      },
      { begin: '#(b|B)[0-1]+(/[0-1]+)?' },
      { begin: '#(o|O)[0-7]+(/[0-7]+)?' },
      { begin: '#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?' },
      {
        begin: '#(c|C)\\(' + LISP_SIMPLE_NUMBER_RE + ' +' + LISP_SIMPLE_NUMBER_RE,
        end: '\\)'
      }
    ]
  };
  const STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null });
  const COMMENT = hljs.COMMENT(
    ';', '$',
    { relevance: 0 }
  );
  const VARIABLE = {
    begin: '\\*',
    end: '\\*'
  };
  const KEYWORD = {
    className: 'symbol',
    begin: '[:&]' + LISP_IDENT_RE
  };
  const IDENT = {
    begin: LISP_IDENT_RE,
    relevance: 0
  };
  const MEC = { begin: MEC_RE };
  const QUOTED_LIST = {
    begin: '\\(',
    end: '\\)',
    contains: [
      'self',
      LITERAL,
      STRING,
      NUMBER,
      IDENT
    ]
  };
  const QUOTED = {
    contains: [
      NUMBER,
      STRING,
      VARIABLE,
      KEYWORD,
      QUOTED_LIST,
      IDENT
    ],
    variants: [
      {
        begin: '[\'`]\\(',
        end: '\\)'
      },
      {
        begin: '\\(quote ',
        end: '\\)',
        keywords: { name: 'quote' }
      },
      { begin: '\'' + MEC_RE }
    ]
  };
  const QUOTED_ATOM = { variants: [
    { begin: '\'' + LISP_IDENT_RE },
    { begin: '#\'' + LISP_IDENT_RE + '(::' + LISP_IDENT_RE + ')*' }
  ] };
  const LIST = {
    begin: '\\(\\s*',
    end: '\\)'
  };
  const BODY = {
    endsWithParent: true,
    relevance: 0
  };
  LIST.contains = [
    {
      className: 'name',
      variants: [
        {
          begin: LISP_IDENT_RE,
          relevance: 0,
        },
        { begin: MEC_RE }
      ]
    },
    BODY
  ];
  BODY.contains = [
    QUOTED,
    QUOTED_ATOM,
    LIST,
    LITERAL,
    NUMBER,
    STRING,
    COMMENT,
    VARIABLE,
    KEYWORD,
    MEC,
    IDENT
  ];

  return {
    name: 'Lisp',
    illegal: /\S/,
    contains: [
      NUMBER,
      hljs.SHEBANG(),
      LITERAL,
      STRING,
      COMMENT,
      QUOTED,
      QUOTED_ATOM,
      LIST,
      IDENT
    ]
  };
}

module.exports = lisp;
