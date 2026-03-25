/*
Language: AngelScript
Author: Melissa Geels <melissa@nimble.tools>
Category: scripting
Website: https://www.angelcode.com/angelscript/
*/

/** @type LanguageFn */
function angelscript(hljs) {
  const builtInTypeMode = {
    className: 'built_in',
    begin: '\\b(void|bool|int8|int16|int32|int64|int|uint8|uint16|uint32|uint64|uint|string|ref|array|double|float|auto|dictionary)'
  };

  const objectHandleMode = {
    className: 'symbol',
    begin: '[a-zA-Z0-9_]+@'
  };

  const genericMode = {
    className: 'keyword',
    begin: '<',
    end: '>',
    contains: [
      builtInTypeMode,
      objectHandleMode
    ]
  };

  builtInTypeMode.contains = [ genericMode ];
  objectHandleMode.contains = [ genericMode ];

  const KEYWORDS = [
    "for",
    "in|0",
    "break",
    "continue",
    "while",
    "do|0",
    "return",
    "if",
    "else",
    "case",
    "switch",
    "namespace",
    "is",
    "cast",
    "or",
    "and",
    "xor",
    "not",
    "get|0",
    "in",
    "inout|10",
    "out",
    "override",
    "set|0",
    "private",
    "public",
    "const",
    "default|0",
    "final",
    "shared",
    "external",
    "mixin|10",
    "enum",
    "typedef",
    "funcdef",
    "this",
    "super",
    "import",
    "from",
    "interface",
    "abstract|0",
    "try",
    "catch",
    "protected",
    "explicit",
    "property"
  ];

  return {
    name: 'AngelScript',
    aliases: [ 'asc' ],

    keywords: KEYWORDS,

    // avoid close detection with C# and JS
    illegal: '(^using\\s+[A-Za-z0-9_\\.]+;$|\\bfunction\\s*[^\\(])',

    contains: [
      { // 'strings'
        className: 'string',
        begin: '\'',
        end: '\'',
        illegal: '\\n',
        contains: [ hljs.BACKSLASH_ESCAPE ],
        relevance: 0
      },

      // """heredoc strings"""
      {
        className: 'string',
        begin: '"""',
        end: '"""'
      },

      { // "strings"
        className: 'string',
        begin: '"',
        end: '"',
        illegal: '\\n',
        contains: [ hljs.BACKSLASH_ESCAPE ],
        relevance: 0
      },

      hljs.C_LINE_COMMENT_MODE, // single-line comments
      hljs.C_BLOCK_COMMENT_MODE, // comment blocks

      { // metadata
        className: 'string',
        begin: '^\\s*\\[',
        end: '\\]'
      },

      { // interface or namespace declaration
        beginKeywords: 'interface namespace',
        end: /\{/,
        illegal: '[;.\\-]',
        contains: [
          { // interface or namespace name
            className: 'symbol',
            begin: '[a-zA-Z0-9_]+'
          }
        ]
      },

      { // class declaration
        beginKeywords: 'class',
        end: /\{/,
        illegal: '[;.\\-]',
        contains: [
          { // class name
            className: 'symbol',
            begin: '[a-zA-Z0-9_]+',
            contains: [
              {
                begin: '[:,]\\s*',
                contains: [
                  {
                    className: 'symbol',
                    begin: '[a-zA-Z0-9_]+'
                  }
                ]
              }
            ]
          }
        ]
      },

      builtInTypeMode, // built-in types
      objectHandleMode, // object handles

      { // literals
        className: 'literal',
        begin: '\\b(null|true|false)'
      },

      { // numbers
        className: 'number',
        relevance: 0,
        begin: '(-?)(\\b0[xXbBoOdD][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?f?|\\.\\d+f?)([eE][-+]?\\d+f?)?)'
      }
    ]
  };
}

export { angelscript as default };
