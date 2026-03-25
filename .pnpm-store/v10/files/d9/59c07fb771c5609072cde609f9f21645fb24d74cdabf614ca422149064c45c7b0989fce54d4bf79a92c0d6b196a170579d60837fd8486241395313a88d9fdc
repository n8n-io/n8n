/*
Language: Cap’n Proto
Author: Oleg Efimov <efimovov@gmail.com>
Description: Cap’n Proto message definition format
Website: https://capnproto.org/capnp-tool.html
Category: protocols
*/

/** @type LanguageFn */
function capnproto(hljs) {
  const KEYWORDS = [
    "struct",
    "enum",
    "interface",
    "union",
    "group",
    "import",
    "using",
    "const",
    "annotation",
    "extends",
    "in",
    "of",
    "on",
    "as",
    "with",
    "from",
    "fixed"
  ];
  const TYPES = [
    "Void",
    "Bool",
    "Int8",
    "Int16",
    "Int32",
    "Int64",
    "UInt8",
    "UInt16",
    "UInt32",
    "UInt64",
    "Float32",
    "Float64",
    "Text",
    "Data",
    "AnyPointer",
    "AnyStruct",
    "Capability",
    "List"
  ];
  const LITERALS = [
    "true",
    "false"
  ];
  const CLASS_DEFINITION = {
    variants: [
      { match: [
        /(struct|enum|interface)/,
        /\s+/,
        hljs.IDENT_RE
      ] },
      { match: [
        /extends/,
        /\s*\(/,
        hljs.IDENT_RE,
        /\s*\)/
      ] }
    ],
    scope: {
      1: "keyword",
      3: "title.class"
    }
  };
  return {
    name: 'Cap’n Proto',
    aliases: [ 'capnp' ],
    keywords: {
      keyword: KEYWORDS,
      type: TYPES,
      literal: LITERALS
    },
    contains: [
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE,
      hljs.HASH_COMMENT_MODE,
      {
        className: 'meta',
        begin: /@0x[\w\d]{16};/,
        illegal: /\n/
      },
      {
        className: 'symbol',
        begin: /@\d+\b/
      },
      CLASS_DEFINITION
    ]
  };
}

module.exports = capnproto;
