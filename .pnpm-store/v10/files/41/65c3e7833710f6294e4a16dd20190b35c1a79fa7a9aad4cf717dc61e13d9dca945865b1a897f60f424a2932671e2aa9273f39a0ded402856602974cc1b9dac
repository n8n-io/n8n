/*
Language: Delphi
Website: https://www.embarcadero.com/products/delphi
Category: system
*/

/** @type LanguageFn */
function delphi(hljs) {
  const KEYWORDS = [
    "exports",
    "register",
    "file",
    "shl",
    "array",
    "record",
    "property",
    "for",
    "mod",
    "while",
    "set",
    "ally",
    "label",
    "uses",
    "raise",
    "not",
    "stored",
    "class",
    "safecall",
    "var",
    "interface",
    "or",
    "private",
    "static",
    "exit",
    "index",
    "inherited",
    "to",
    "else",
    "stdcall",
    "override",
    "shr",
    "asm",
    "far",
    "resourcestring",
    "finalization",
    "packed",
    "virtual",
    "out",
    "and",
    "protected",
    "library",
    "do",
    "xorwrite",
    "goto",
    "near",
    "function",
    "end",
    "div",
    "overload",
    "object",
    "unit",
    "begin",
    "string",
    "on",
    "inline",
    "repeat",
    "until",
    "destructor",
    "write",
    "message",
    "program",
    "with",
    "read",
    "initialization",
    "except",
    "default",
    "nil",
    "if",
    "case",
    "cdecl",
    "in",
    "downto",
    "threadvar",
    "of",
    "try",
    "pascal",
    "const",
    "external",
    "constructor",
    "type",
    "public",
    "then",
    "implementation",
    "finally",
    "published",
    "procedure",
    "absolute",
    "reintroduce",
    "operator",
    "as",
    "is",
    "abstract",
    "alias",
    "assembler",
    "bitpacked",
    "break",
    "continue",
    "cppdecl",
    "cvar",
    "enumerator",
    "experimental",
    "platform",
    "deprecated",
    "unimplemented",
    "dynamic",
    "export",
    "far16",
    "forward",
    "generic",
    "helper",
    "implements",
    "interrupt",
    "iochecks",
    "local",
    "name",
    "nodefault",
    "noreturn",
    "nostackframe",
    "oldfpccall",
    "otherwise",
    "saveregisters",
    "softfloat",
    "specialize",
    "strict",
    "unaligned",
    "varargs"
  ];
  const COMMENT_MODES = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.COMMENT(/\{/, /\}/, { relevance: 0 }),
    hljs.COMMENT(/\(\*/, /\*\)/, { relevance: 10 })
  ];
  const DIRECTIVE = {
    className: 'meta',
    variants: [
      {
        begin: /\{\$/,
        end: /\}/
      },
      {
        begin: /\(\*\$/,
        end: /\*\)/
      }
    ]
  };
  const STRING = {
    className: 'string',
    begin: /'/,
    end: /'/,
    contains: [ { begin: /''/ } ]
  };
  const NUMBER = {
    className: 'number',
    relevance: 0,
    // Source: https://www.freepascal.org/docs-html/ref/refse6.html
    variants: [
      {
        // Regular numbers, e.g., 123, 123.456.
        match: /\b\d[\d_]*(\.\d[\d_]*)?/ },
      {
        // Hexadecimal notation, e.g., $7F.
        match: /\$[\dA-Fa-f_]+/ },
      {
        // Hexadecimal literal with no digits
        match: /\$/,
        relevance: 0 },
      {
        // Octal notation, e.g., &42.
        match: /&[0-7][0-7_]*/ },
      {
        // Binary notation, e.g., %1010.
        match: /%[01_]+/ },
      {
        // Binary literal with no digits
        match: /%/,
        relevance: 0 }
    ]
  };
  const CHAR_STRING = {
    className: 'string',
    variants: [
      { match: /#\d[\d_]*/ },
      { match: /#\$[\dA-Fa-f][\dA-Fa-f_]*/ },
      { match: /#&[0-7][0-7_]*/ },
      { match: /#%[01][01_]*/ }
    ]
  };
  const CLASS = {
    begin: hljs.IDENT_RE + '\\s*=\\s*class\\s*\\(',
    returnBegin: true,
    contains: [ hljs.TITLE_MODE ]
  };
  const FUNCTION = {
    className: 'function',
    beginKeywords: 'function constructor destructor procedure',
    end: /[:;]/,
    keywords: 'function constructor|10 destructor|10 procedure|10',
    contains: [
      hljs.TITLE_MODE,
      {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS,
        contains: [
          STRING,
          CHAR_STRING,
          DIRECTIVE
        ].concat(COMMENT_MODES)
      },
      DIRECTIVE
    ].concat(COMMENT_MODES)
  };
  return {
    name: 'Delphi',
    aliases: [
      'dpr',
      'dfm',
      'pas',
      'pascal'
    ],
    case_insensitive: true,
    keywords: KEYWORDS,
    illegal: /"|\$[G-Zg-z]|\/\*|<\/|\|/,
    contains: [
      STRING,
      CHAR_STRING,
      NUMBER,
      CLASS,
      FUNCTION,
      DIRECTIVE
    ].concat(COMMENT_MODES)
  };
}

module.exports = delphi;
