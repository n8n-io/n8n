/*
Language: Microsoft X++
Description: X++ is a language used in Microsoft Dynamics 365, Dynamics AX, and Axapta.
Author: Dmitri Roudakov <dmitri@roudakov.ru>
Website: https://dynamics.microsoft.com/en-us/ax-overview/
Category: enterprise
*/

/** @type LanguageFn */
function axapta(hljs) {
  const IDENT_RE = hljs.UNDERSCORE_IDENT_RE;
  const BUILT_IN_KEYWORDS = [
    'anytype',
    'boolean',
    'byte',
    'char',
    'container',
    'date',
    'double',
    'enum',
    'guid',
    'int',
    'int64',
    'long',
    'real',
    'short',
    'str',
    'utcdatetime',
    'var'
  ];

  const LITERAL_KEYWORDS = [
    'default',
    'false',
    'null',
    'true'
  ];

  const NORMAL_KEYWORDS = [
    'abstract',
    'as',
    'asc',
    'avg',
    'break',
    'breakpoint',
    'by',
    'byref',
    'case',
    'catch',
    'changecompany',
    'class',
    'client',
    'client',
    'common',
    'const',
    'continue',
    'count',
    'crosscompany',
    'delegate',
    'delete_from',
    'desc',
    'display',
    'div',
    'do',
    'edit',
    'else',
    'eventhandler',
    'exists',
    'extends',
    'final',
    'finally',
    'firstfast',
    'firstonly',
    'firstonly1',
    'firstonly10',
    'firstonly100',
    'firstonly1000',
    'flush',
    'for',
    'forceliterals',
    'forcenestedloop',
    'forceplaceholders',
    'forceselectorder',
    'forupdate',
    'from',
    'generateonly',
    'group',
    'hint',
    'if',
    'implements',
    'in',
    'index',
    'insert_recordset',
    'interface',
    'internal',
    'is',
    'join',
    'like',
    'maxof',
    'minof',
    'mod',
    'namespace',
    'new',
    'next',
    'nofetch',
    'notexists',
    'optimisticlock',
    'order',
    'outer',
    'pessimisticlock',
    'print',
    'private',
    'protected',
    'public',
    'readonly',
    'repeatableread',
    'retry',
    'return',
    'reverse',
    'select',
    'server',
    'setting',
    'static',
    'sum',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'ttsabort',
    'ttsbegin',
    'ttscommit',
    'unchecked',
    'update_recordset',
    'using',
    'validtimestate',
    'void',
    'where',
    'while'
  ];

  const KEYWORDS = {
    keyword: NORMAL_KEYWORDS,
    built_in: BUILT_IN_KEYWORDS,
    literal: LITERAL_KEYWORDS
  };

  const CLASS_DEFINITION = {
    variants: [
      { match: [
        /(class|interface)\s+/,
        IDENT_RE,
        /\s+(extends|implements)\s+/,
        IDENT_RE
      ] },
      { match: [
        /class\s+/,
        IDENT_RE
      ] }
    ],
    scope: {
      2: "title.class",
      4: "title.class.inherited"
    },
    keywords: KEYWORDS
  };

  return {
    name: 'X++',
    aliases: [ 'x++' ],
    keywords: KEYWORDS,
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'meta',
        begin: '#',
        end: '$'
      },
      CLASS_DEFINITION
    ]
  };
}

export { axapta as default };
