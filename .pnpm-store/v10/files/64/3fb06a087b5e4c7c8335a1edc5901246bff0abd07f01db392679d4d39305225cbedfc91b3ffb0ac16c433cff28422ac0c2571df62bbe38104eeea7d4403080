/*
Language: Nim
Description: Nim is a statically typed compiled systems programming language.
Website: https://nim-lang.org
Category: system
*/

function nim(hljs) {
  const TYPES = [
    "int",
    "int8",
    "int16",
    "int32",
    "int64",
    "uint",
    "uint8",
    "uint16",
    "uint32",
    "uint64",
    "float",
    "float32",
    "float64",
    "bool",
    "char",
    "string",
    "cstring",
    "pointer",
    "expr",
    "stmt",
    "void",
    "auto",
    "any",
    "range",
    "array",
    "openarray",
    "varargs",
    "seq",
    "set",
    "clong",
    "culong",
    "cchar",
    "cschar",
    "cshort",
    "cint",
    "csize",
    "clonglong",
    "cfloat",
    "cdouble",
    "clongdouble",
    "cuchar",
    "cushort",
    "cuint",
    "culonglong",
    "cstringarray",
    "semistatic"
  ];
  const KEYWORDS = [
    "addr",
    "and",
    "as",
    "asm",
    "bind",
    "block",
    "break",
    "case",
    "cast",
    "concept",
    "const",
    "continue",
    "converter",
    "defer",
    "discard",
    "distinct",
    "div",
    "do",
    "elif",
    "else",
    "end",
    "enum",
    "except",
    "export",
    "finally",
    "for",
    "from",
    "func",
    "generic",
    "guarded",
    "if",
    "import",
    "in",
    "include",
    "interface",
    "is",
    "isnot",
    "iterator",
    "let",
    "macro",
    "method",
    "mixin",
    "mod",
    "nil",
    "not",
    "notin",
    "object",
    "of",
    "or",
    "out",
    "proc",
    "ptr",
    "raise",
    "ref",
    "return",
    "shared",
    "shl",
    "shr",
    "static",
    "template",
    "try",
    "tuple",
    "type",
    "using",
    "var",
    "when",
    "while",
    "with",
    "without",
    "xor",
    "yield"
  ];
  const BUILT_INS = [
    "stdin",
    "stdout",
    "stderr",
    "result"
  ];
  const LITERALS = [
    "true",
    "false"
  ];
  return {
    name: 'Nim',
    keywords: {
      keyword: KEYWORDS,
      literal: LITERALS,
      type: TYPES,
      built_in: BUILT_INS
    },
    contains: [
      {
        className: 'meta', // Actually pragma
        begin: /\{\./,
        end: /\.\}/,
        relevance: 10
      },
      {
        className: 'string',
        begin: /[a-zA-Z]\w*"/,
        end: /"/,
        contains: [ { begin: /""/ } ]
      },
      {
        className: 'string',
        begin: /([a-zA-Z]\w*)?"""/,
        end: /"""/
      },
      hljs.QUOTE_STRING_MODE,
      {
        className: 'type',
        begin: /\b[A-Z]\w+\b/,
        relevance: 0
      },
      {
        className: 'number',
        relevance: 0,
        variants: [
          { begin: /\b(0[xX][0-9a-fA-F][_0-9a-fA-F]*)('?[iIuU](8|16|32|64))?/ },
          { begin: /\b(0o[0-7][_0-7]*)('?[iIuUfF](8|16|32|64))?/ },
          { begin: /\b(0(b|B)[01][_01]*)('?[iIuUfF](8|16|32|64))?/ },
          { begin: /\b(\d[_\d]*)('?[iIuUfF](8|16|32|64))?/ }
        ]
      },
      hljs.HASH_COMMENT_MODE
    ]
  };
}

module.exports = nim;
