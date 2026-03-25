/**
 * @param {string} value
 * @returns {RegExp}
 * */
function escape(value) {
  return new RegExp(value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm');
}

/**
 * @param {RegExp | string } re
 * @returns {string}
 */
function source(re) {
  if (!re) return null;
  if (typeof re === "string") return re;

  return re.source;
}

/**
 * @param {RegExp | string } re
 * @returns {string}
 */
function lookahead(re) {
  return concat('(?=', re, ')');
}

/**
 * @param {...(RegExp | string) } args
 * @returns {string}
 */
function concat(...args) {
  const joined = args.map((x) => source(x)).join("");
  return joined;
}

/**
 * @param { Array<string | RegExp | Object> } args
 * @returns {object}
 */
function stripOptionsFromArgs(args) {
  const opts = args[args.length - 1];

  if (typeof opts === 'object' && opts.constructor === Object) {
    args.splice(args.length - 1, 1);
    return opts;
  } else {
    return {};
  }
}

/** @typedef { {capture?: boolean} } RegexEitherOptions */

/**
 * Any of the passed expresssions may match
 *
 * Creates a huge this | this | that | that match
 * @param {(RegExp | string)[] | [...(RegExp | string)[], RegexEitherOptions]} args
 * @returns {string}
 */
function either(...args) {
  /** @type { object & {capture?: boolean} }  */
  const opts = stripOptionsFromArgs(args);
  const joined = '('
    + (opts.capture ? "" : "?:")
    + args.map((x) => source(x)).join("|") + ")";
  return joined;
}

/*
Language: F#
Author: Jonas Follesø <jonas@follesoe.no>
Contributors: Troy Kershaw <hello@troykershaw.com>, Henrik Feldt <henrik@haf.se>, Melvyn Laïly <melvyn.laily@gmail.com>
Website: https://docs.microsoft.com/en-us/dotnet/fsharp/
Category: functional
*/

/** @type LanguageFn */
function fsharp(hljs) {
  const KEYWORDS = [
    "abstract",
    "and",
    "as",
    "assert",
    "base",
    "begin",
    "class",
    "default",
    "delegate",
    "do",
    "done",
    "downcast",
    "downto",
    "elif",
    "else",
    "end",
    "exception",
    "extern",
    // "false", // literal
    "finally",
    "fixed",
    "for",
    "fun",
    "function",
    "global",
    "if",
    "in",
    "inherit",
    "inline",
    "interface",
    "internal",
    "lazy",
    "let",
    "match",
    "member",
    "module",
    "mutable",
    "namespace",
    "new",
    // "not", // built_in
    // "null", // literal
    "of",
    "open",
    "or",
    "override",
    "private",
    "public",
    "rec",
    "return",
    "static",
    "struct",
    "then",
    "to",
    // "true", // literal
    "try",
    "type",
    "upcast",
    "use",
    "val",
    "void",
    "when",
    "while",
    "with",
    "yield"
  ];

  const BANG_KEYWORD_MODE = {
    // monad builder keywords (matches before non-bang keywords)
    scope: 'keyword',
    match: /\b(yield|return|let|do|match|use)!/
  };

  const PREPROCESSOR_KEYWORDS = [
    "if",
    "else",
    "endif",
    "line",
    "nowarn",
    "light",
    "r",
    "i",
    "I",
    "load",
    "time",
    "help",
    "quit"
  ];

  const LITERALS = [
    "true",
    "false",
    "null",
    "Some",
    "None",
    "Ok",
    "Error",
    "infinity",
    "infinityf",
    "nan",
    "nanf"
  ];

  const SPECIAL_IDENTIFIERS = [
    "__LINE__",
    "__SOURCE_DIRECTORY__",
    "__SOURCE_FILE__"
  ];

  // Since it's possible to re-bind/shadow names (e.g. let char = 'c'),
  // these builtin types should only be matched when a type name is expected.
  const KNOWN_TYPES = [
    // basic types
    "bool",
    "byte",
    "sbyte",
    "int8",
    "int16",
    "int32",
    "uint8",
    "uint16",
    "uint32",
    "int",
    "uint",
    "int64",
    "uint64",
    "nativeint",
    "unativeint",
    "decimal",
    "float",
    "double",
    "float32",
    "single",
    "char",
    "string",
    "unit",
    "bigint",
    // other native types or lowercase aliases
    "option",
    "voption",
    "list",
    "array",
    "seq",
    "byref",
    "exn",
    "inref",
    "nativeptr",
    "obj",
    "outref",
    "voidptr",
    // other important FSharp types
    "Result"
  ];

  const BUILTINS = [
    // Somewhat arbitrary list of builtin functions and values.
    // Most of them are declared in Microsoft.FSharp.Core
    // I tried to stay relevant by adding only the most idiomatic
    // and most used symbols that are not already declared as types.
    "not",
    "ref",
    "raise",
    "reraise",
    "dict",
    "readOnlyDict",
    "set",
    "get",
    "enum",
    "sizeof",
    "typeof",
    "typedefof",
    "nameof",
    "nullArg",
    "invalidArg",
    "invalidOp",
    "id",
    "fst",
    "snd",
    "ignore",
    "lock",
    "using",
    "box",
    "unbox",
    "tryUnbox",
    "printf",
    "printfn",
    "sprintf",
    "eprintf",
    "eprintfn",
    "fprintf",
    "fprintfn",
    "failwith",
    "failwithf"
  ];

  const ALL_KEYWORDS = {
    keyword: KEYWORDS,
    literal: LITERALS,
    built_in: BUILTINS,
    'variable.constant': SPECIAL_IDENTIFIERS
  };

  // (* potentially multi-line Meta Language style comment *)
  const ML_COMMENT =
    hljs.COMMENT(/\(\*(?!\))/, /\*\)/, {
      contains: ["self"]
    });
  // Either a multi-line (* Meta Language style comment *) or a single line // C style comment.
  const COMMENT = {
    variants: [
      ML_COMMENT,
      hljs.C_LINE_COMMENT_MODE,
    ]
  };

  // Most identifiers can contain apostrophes
  const IDENTIFIER_RE = /[a-zA-Z_](\w|')*/;

  const QUOTED_IDENTIFIER = {
    scope: 'variable',
    begin: /``/,
    end: /``/
  };

  // 'a or ^a where a can be a ``quoted identifier``
  const BEGIN_GENERIC_TYPE_SYMBOL_RE = /\B('|\^)/;
  const GENERIC_TYPE_SYMBOL = {
    scope: 'symbol',
    variants: [
      // the type name is a quoted identifier:
      { match: concat(BEGIN_GENERIC_TYPE_SYMBOL_RE, /``.*?``/) },
      // the type name is a normal identifier (we don't use IDENTIFIER_RE because there cannot be another apostrophe here):
      { match: concat(BEGIN_GENERIC_TYPE_SYMBOL_RE, hljs.UNDERSCORE_IDENT_RE) }
    ],
    relevance: 0
  };

  const makeOperatorMode = function({ includeEqual }) {
    // List or symbolic operator characters from the FSharp Spec 4.1, minus the dot, and with `?` added, used for nullable operators.
    let allOperatorChars;
    if (includeEqual)
      allOperatorChars = "!%&*+-/<=>@^|~?";
    else
      allOperatorChars = "!%&*+-/<>@^|~?";
    const OPERATOR_CHARS = Array.from(allOperatorChars);
    const OPERATOR_CHAR_RE = concat('[', ...OPERATOR_CHARS.map(escape), ']');
    // The lone dot operator is special. It cannot be redefined, and we don't want to highlight it. It can be used as part of a multi-chars operator though.
    const OPERATOR_CHAR_OR_DOT_RE = either(OPERATOR_CHAR_RE, /\./);
    // When a dot is present, it must be followed by another operator char:
    const OPERATOR_FIRST_CHAR_OF_MULTIPLE_RE = concat(OPERATOR_CHAR_OR_DOT_RE, lookahead(OPERATOR_CHAR_OR_DOT_RE));
    const SYMBOLIC_OPERATOR_RE = either(
      concat(OPERATOR_FIRST_CHAR_OF_MULTIPLE_RE, OPERATOR_CHAR_OR_DOT_RE, '*'), // Matches at least 2 chars operators
      concat(OPERATOR_CHAR_RE, '+'), // Matches at least one char operators
    );
    return {
      scope: 'operator',
      match: either(
        // symbolic operators:
        SYMBOLIC_OPERATOR_RE,
        // other symbolic keywords:
        // Type casting and conversion operators:
        /:\?>/,
        /:\?/,
        /:>/,
        /:=/, // Reference cell assignment
        /::?/, // : or ::
        /\$/), // A single $ can be used as an operator
      relevance: 0
    };
  };

  const OPERATOR = makeOperatorMode({ includeEqual: true });
  // This variant is used when matching '=' should end a parent mode:
  const OPERATOR_WITHOUT_EQUAL = makeOperatorMode({ includeEqual: false });

  const makeTypeAnnotationMode = function(prefix, prefixScope) {
    return {
      begin: concat( // a type annotation is a
        prefix,            // should be a colon or the 'of' keyword
        lookahead(   // that has to be followed by
          concat(
            /\s*/,         // optional space
            either(  // then either of:
              /\w/,        // word
              /'/,         // generic type name
              /\^/,        // generic type name
              /#/,         // flexible type name
              /``/,        // quoted type name
              /\(/,        // parens type expression
              /{\|/,       // anonymous type annotation
      )))),
      beginScope: prefixScope,
      // BUG: because ending with \n is necessary for some cases, multi-line type annotations are not properly supported.
      // Examples where \n is required at the end:
      // - abstract member definitions in classes: abstract Property : int * string
      // - return type annotations: let f f' = f' () : returnTypeAnnotation
      // - record fields definitions: { A : int \n B : string }
      end: lookahead(
        either(
          /\n/,
          /=/)),
      relevance: 0,
      // we need the known types, and we need the type constraint keywords and literals. e.g.: when 'a : null
      keywords: hljs.inherit(ALL_KEYWORDS, { type: KNOWN_TYPES }),
      contains: [
        COMMENT,
        GENERIC_TYPE_SYMBOL,
        hljs.inherit(QUOTED_IDENTIFIER, { scope: null }), // match to avoid strange patterns inside that may break the parsing
        OPERATOR_WITHOUT_EQUAL
      ]
    };
  };

  const TYPE_ANNOTATION = makeTypeAnnotationMode(/:/, 'operator');
  const DISCRIMINATED_UNION_TYPE_ANNOTATION = makeTypeAnnotationMode(/\bof\b/, 'keyword');

  // type MyType<'a> = ...
  const TYPE_DECLARATION = {
    begin: [
      /(^|\s+)/, // prevents matching the following: `match s.stype with`
      /type/,
      /\s+/,
      IDENTIFIER_RE
    ],
    beginScope: {
      2: 'keyword',
      4: 'title.class'
    },
    end: lookahead(/\(|=|$/),
    keywords: ALL_KEYWORDS, // match keywords in type constraints. e.g.: when 'a : null
    contains: [
      COMMENT,
      hljs.inherit(QUOTED_IDENTIFIER, { scope: null }), // match to avoid strange patterns inside that may break the parsing
      GENERIC_TYPE_SYMBOL,
      {
        // For visual consistency, highlight type brackets as operators.
        scope: 'operator',
        match: /<|>/
      },
      TYPE_ANNOTATION // generic types can have constraints, which are type annotations. e.g. type MyType<'T when 'T : delegate<obj * string>> =
    ]
  };

  const COMPUTATION_EXPRESSION = {
    // computation expressions:
    scope: 'computation-expression',
    // BUG: might conflict with record deconstruction. e.g. let f { Name = name } = name // will highlight f
    match: /\b[_a-z]\w*(?=\s*\{)/
  };

  const PREPROCESSOR = {
    // preprocessor directives and fsi commands:
    begin: [
      /^\s*/,
      concat(/#/, either(...PREPROCESSOR_KEYWORDS)),
      /\b/
    ],
    beginScope: { 2: 'meta' },
    end: lookahead(/\s|$/)
  };

  // TODO: this definition is missing support for type suffixes and octal notation.
  // BUG: range operator without any space is wrongly interpreted as a single number (e.g. 1..10 )
  const NUMBER = {
    variants: [
      hljs.BINARY_NUMBER_MODE,
      hljs.C_NUMBER_MODE
    ]
  };

  // All the following string definitions are potentially multi-line.
  // BUG: these definitions are missing support for byte strings (suffixed with B)

  // "..."
  const QUOTED_STRING = {
    scope: 'string',
    begin: /"/,
    end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE
    ]
  };
  // @"..."
  const VERBATIM_STRING = {
    scope: 'string',
    begin: /@"/,
    end: /"/,
    contains: [
      {
        match: /""/ // escaped "
      },
      hljs.BACKSLASH_ESCAPE
    ]
  };
  // """..."""
  const TRIPLE_QUOTED_STRING = {
    scope: 'string',
    begin: /"""/,
    end: /"""/,
    relevance: 2
  };
  const SUBST = {
    scope: 'subst',
    begin: /\{/,
    end: /\}/,
    keywords: ALL_KEYWORDS
  };
  // $"...{1+1}..."
  const INTERPOLATED_STRING = {
    scope: 'string',
    begin: /\$"/,
    end: /"/,
    contains: [
      {
        match: /\{\{/ // escaped {
      },
      {
        match: /\}\}/ // escaped }
      },
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  // $@"...{1+1}..."
  const INTERPOLATED_VERBATIM_STRING = {
    scope: 'string',
    begin: /(\$@|@\$)"/,
    end: /"/,
    contains: [
      {
        match: /\{\{/ // escaped {
      },
      {
        match: /\}\}/ // escaped }
      },
      {
        match: /""/
      },
      hljs.BACKSLASH_ESCAPE,
      SUBST
    ]
  };
  // $"""...{1+1}..."""
  const INTERPOLATED_TRIPLE_QUOTED_STRING = {
    scope: 'string',
    begin: /\$"""/,
    end: /"""/,
    contains: [
      {
        match: /\{\{/ // escaped {
      },
      {
        match: /\}\}/ // escaped }
      },
      SUBST
    ],
    relevance: 2
  };
  // '.'
  const CHAR_LITERAL = {
    scope: 'string',
    match: concat(
      /'/,
      either(
        /[^\\']/, // either a single non escaped char...
        /\\(?:.|\d{3}|x[a-fA-F\d]{2}|u[a-fA-F\d]{4}|U[a-fA-F\d]{8})/ // ...or an escape sequence
      ),
      /'/
    )
  };
  // F# allows a lot of things inside string placeholders.
  // Things that don't currently seem allowed by the compiler: types definition, attributes usage.
  // (Strictly speaking, some of the followings are only allowed inside triple quoted interpolated strings...)
  SUBST.contains = [
    INTERPOLATED_VERBATIM_STRING,
    INTERPOLATED_STRING,
    VERBATIM_STRING,
    QUOTED_STRING,
    CHAR_LITERAL,
    BANG_KEYWORD_MODE,
    COMMENT,
    QUOTED_IDENTIFIER,
    TYPE_ANNOTATION,
    COMPUTATION_EXPRESSION,
    PREPROCESSOR,
    NUMBER,
    GENERIC_TYPE_SYMBOL,
    OPERATOR
  ];
  const STRING = {
    variants: [
      INTERPOLATED_TRIPLE_QUOTED_STRING,
      INTERPOLATED_VERBATIM_STRING,
      INTERPOLATED_STRING,
      TRIPLE_QUOTED_STRING,
      VERBATIM_STRING,
      QUOTED_STRING,
      CHAR_LITERAL
    ]
  };

  return {
    name: 'F#',
    aliases: [
      'fs',
      'f#'
    ],
    keywords: ALL_KEYWORDS,
    illegal: /\/\*/,
    classNameAliases: {
      'computation-expression': 'keyword'
    },
    contains: [
      BANG_KEYWORD_MODE,
      STRING,
      COMMENT,
      QUOTED_IDENTIFIER,
      TYPE_DECLARATION,
      {
        // e.g. [<Attributes("")>] or [<``module``: MyCustomAttributeThatWorksOnModules>]
        // or [<Sealed; NoEquality; NoComparison; CompiledName("FSharpAsync`1")>]
        scope: 'meta',
        begin: /\[</,
        end: />\]/,
        relevance: 2,
        contains: [
          QUOTED_IDENTIFIER,
          // can contain any constant value
          TRIPLE_QUOTED_STRING,
          VERBATIM_STRING,
          QUOTED_STRING,
          CHAR_LITERAL,
          NUMBER
        ]
      },
      DISCRIMINATED_UNION_TYPE_ANNOTATION,
      TYPE_ANNOTATION,
      COMPUTATION_EXPRESSION,
      PREPROCESSOR,
      NUMBER,
      GENERIC_TYPE_SYMBOL,
      OPERATOR
    ]
  };
}

export { fsharp as default };
