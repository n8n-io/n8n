/*
Language: Thrift
Author: Oleg Efimov <efimovov@gmail.com>
Description: Thrift message definition format
Website: https://thrift.apache.org
Category: protocols
*/

function thrift(hljs) {
  const TYPES = [
    "bool",
    "byte",
    "i16",
    "i32",
    "i64",
    "double",
    "string",
    "binary"
  ];
  const KEYWORDS = [
    "namespace",
    "const",
    "typedef",
    "struct",
    "enum",
    "service",
    "exception",
    "void",
    "oneway",
    "set",
    "list",
    "map",
    "required",
    "optional"
  ];
  return {
    name: 'Thrift',
    keywords: {
      keyword: KEYWORDS,
      type: TYPES,
      literal: 'true false'
    },
    contains: [
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'class',
        beginKeywords: 'struct enum service exception',
        end: /\{/,
        illegal: /\n/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            // hack: eating everything after the first title
            starts: {
              endsWithParent: true,
              excludeEnd: true
            } })
        ]
      },
      {
        begin: '\\b(set|list|map)\\s*<',
        keywords: { type: [
          ...TYPES,
          "set",
          "list",
          "map"
        ] },
        end: '>',
        contains: [ 'self' ]
      }
    ]
  };
}

export { thrift as default };
