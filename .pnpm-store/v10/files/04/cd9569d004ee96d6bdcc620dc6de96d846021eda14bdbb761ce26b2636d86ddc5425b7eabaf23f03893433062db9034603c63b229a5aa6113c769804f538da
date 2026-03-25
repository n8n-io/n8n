/**
 * @param {string} value
 * @returns {RegExp}
 * */

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

const keywordWrapper = keyword => concat(
  /\b/,
  keyword,
  /\w$/.test(keyword) ? /\b/ : /\B/
);

// Keywords that require a leading dot.
const dotKeywords = [
  'Protocol', // contextual
  'Type' // contextual
].map(keywordWrapper);

// Keywords that may have a leading dot.
const optionalDotKeywords = [
  'init',
  'self'
].map(keywordWrapper);

// should register as keyword, not type
const keywordTypes = [
  'Any',
  'Self'
];

// Regular keywords and literals.
const keywords = [
  // strings below will be fed into the regular `keywords` engine while regex
  // will result in additional modes being created to scan for those keywords to
  // avoid conflicts with other rules
  'actor',
  'any', // contextual
  'associatedtype',
  'async',
  'await',
  /as\?/, // operator
  /as!/, // operator
  'as', // operator
  'break',
  'case',
  'catch',
  'class',
  'continue',
  'convenience', // contextual
  'default',
  'defer',
  'deinit',
  'didSet', // contextual
  'distributed',
  'do',
  'dynamic', // contextual
  'else',
  'enum',
  'extension',
  'fallthrough',
  /fileprivate\(set\)/,
  'fileprivate',
  'final', // contextual
  'for',
  'func',
  'get', // contextual
  'guard',
  'if',
  'import',
  'indirect', // contextual
  'infix', // contextual
  /init\?/,
  /init!/,
  'inout',
  /internal\(set\)/,
  'internal',
  'in',
  'is', // operator
  'isolated', // contextual
  'nonisolated', // contextual
  'lazy', // contextual
  'let',
  'mutating', // contextual
  'nonmutating', // contextual
  /open\(set\)/, // contextual
  'open', // contextual
  'operator',
  'optional', // contextual
  'override', // contextual
  'postfix', // contextual
  'precedencegroup',
  'prefix', // contextual
  /private\(set\)/,
  'private',
  'protocol',
  /public\(set\)/,
  'public',
  'repeat',
  'required', // contextual
  'rethrows',
  'return',
  'set', // contextual
  'some', // contextual
  'static',
  'struct',
  'subscript',
  'super',
  'switch',
  'throws',
  'throw',
  /try\?/, // operator
  /try!/, // operator
  'try', // operator
  'typealias',
  /unowned\(safe\)/, // contextual
  /unowned\(unsafe\)/, // contextual
  'unowned', // contextual
  'var',
  'weak', // contextual
  'where',
  'while',
  'willSet' // contextual
];

// NOTE: Contextual keywords are reserved only in specific contexts.
// Ideally, these should be matched using modes to avoid false positives.

// Literals.
const literals = [
  'false',
  'nil',
  'true'
];

// Keywords used in precedence groups.
const precedencegroupKeywords = [
  'assignment',
  'associativity',
  'higherThan',
  'left',
  'lowerThan',
  'none',
  'right'
];

// Keywords that start with a number sign (#).
// #(un)available is handled separately.
const numberSignKeywords = [
  '#colorLiteral',
  '#column',
  '#dsohandle',
  '#else',
  '#elseif',
  '#endif',
  '#error',
  '#file',
  '#fileID',
  '#fileLiteral',
  '#filePath',
  '#function',
  '#if',
  '#imageLiteral',
  '#keyPath',
  '#line',
  '#selector',
  '#sourceLocation',
  '#warn_unqualified_access',
  '#warning'
];

// Global functions in the Standard Library.
const builtIns = [
  'abs',
  'all',
  'any',
  'assert',
  'assertionFailure',
  'debugPrint',
  'dump',
  'fatalError',
  'getVaList',
  'isKnownUniquelyReferenced',
  'max',
  'min',
  'numericCast',
  'pointwiseMax',
  'pointwiseMin',
  'precondition',
  'preconditionFailure',
  'print',
  'readLine',
  'repeatElement',
  'sequence',
  'stride',
  'swap',
  'swift_unboxFromSwiftValueWithType',
  'transcode',
  'type',
  'unsafeBitCast',
  'unsafeDowncast',
  'withExtendedLifetime',
  'withUnsafeMutablePointer',
  'withUnsafePointer',
  'withVaList',
  'withoutActuallyEscaping',
  'zip'
];

// Valid first characters for operators.
const operatorHead = either(
  /[/=\-+!*%<>&|^~?]/,
  /[\u00A1-\u00A7]/,
  /[\u00A9\u00AB]/,
  /[\u00AC\u00AE]/,
  /[\u00B0\u00B1]/,
  /[\u00B6\u00BB\u00BF\u00D7\u00F7]/,
  /[\u2016-\u2017]/,
  /[\u2020-\u2027]/,
  /[\u2030-\u203E]/,
  /[\u2041-\u2053]/,
  /[\u2055-\u205E]/,
  /[\u2190-\u23FF]/,
  /[\u2500-\u2775]/,
  /[\u2794-\u2BFF]/,
  /[\u2E00-\u2E7F]/,
  /[\u3001-\u3003]/,
  /[\u3008-\u3020]/,
  /[\u3030]/
);

// Valid characters for operators.
const operatorCharacter = either(
  operatorHead,
  /[\u0300-\u036F]/,
  /[\u1DC0-\u1DFF]/,
  /[\u20D0-\u20FF]/,
  /[\uFE00-\uFE0F]/,
  /[\uFE20-\uFE2F]/
  // TODO: The following characters are also allowed, but the regex isn't supported yet.
  // /[\u{E0100}-\u{E01EF}]/u
);

// Valid operator.
const operator = concat(operatorHead, operatorCharacter, '*');

// Valid first characters for identifiers.
const identifierHead = either(
  /[a-zA-Z_]/,
  /[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/,
  /[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/,
  /[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/,
  /[\u1E00-\u1FFF]/,
  /[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/,
  /[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/,
  /[\u2C00-\u2DFF\u2E80-\u2FFF]/,
  /[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/,
  /[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/,
  /[\uFE47-\uFEFE\uFF00-\uFFFD]/ // Should be /[\uFE47-\uFFFD]/, but we have to exclude FEFF.
  // The following characters are also allowed, but the regexes aren't supported yet.
  // /[\u{10000}-\u{1FFFD}\u{20000-\u{2FFFD}\u{30000}-\u{3FFFD}\u{40000}-\u{4FFFD}]/u,
  // /[\u{50000}-\u{5FFFD}\u{60000-\u{6FFFD}\u{70000}-\u{7FFFD}\u{80000}-\u{8FFFD}]/u,
  // /[\u{90000}-\u{9FFFD}\u{A0000-\u{AFFFD}\u{B0000}-\u{BFFFD}\u{C0000}-\u{CFFFD}]/u,
  // /[\u{D0000}-\u{DFFFD}\u{E0000-\u{EFFFD}]/u
);

// Valid characters for identifiers.
const identifierCharacter = either(
  identifierHead,
  /\d/,
  /[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/
);

// Valid identifier.
const identifier = concat(identifierHead, identifierCharacter, '*');

// Valid type identifier.
const typeIdentifier = concat(/[A-Z]/, identifierCharacter, '*');

// Built-in attributes, which are highlighted as keywords.
// @available is handled separately.
const keywordAttributes = [
  'autoclosure',
  concat(/convention\(/, either('swift', 'block', 'c'), /\)/),
  'discardableResult',
  'dynamicCallable',
  'dynamicMemberLookup',
  'escaping',
  'frozen',
  'GKInspectable',
  'IBAction',
  'IBDesignable',
  'IBInspectable',
  'IBOutlet',
  'IBSegueAction',
  'inlinable',
  'main',
  'nonobjc',
  'NSApplicationMain',
  'NSCopying',
  'NSManaged',
  concat(/objc\(/, identifier, /\)/),
  'objc',
  'objcMembers',
  'propertyWrapper',
  'requires_stored_property_inits',
  'resultBuilder',
  'testable',
  'UIApplicationMain',
  'unknown',
  'usableFromInline'
];

// Contextual keywords used in @available and #(un)available.
const availabilityKeywords = [
  'iOS',
  'iOSApplicationExtension',
  'macOS',
  'macOSApplicationExtension',
  'macCatalyst',
  'macCatalystApplicationExtension',
  'watchOS',
  'watchOSApplicationExtension',
  'tvOS',
  'tvOSApplicationExtension',
  'swift'
];

/*
Language: Swift
Description: Swift is a general-purpose programming language built using a modern approach to safety, performance, and software design patterns.
Author: Steven Van Impe <steven.vanimpe@icloud.com>
Contributors: Chris Eidhof <chris@eidhof.nl>, Nate Cook <natecook@gmail.com>, Alexander Lichter <manniL@gmx.net>, Richard Gibson <gibson042@github>
Website: https://swift.org
Category: common, system
*/

/** @type LanguageFn */
function swift(hljs) {
  const WHITESPACE = {
    match: /\s+/,
    relevance: 0
  };
  // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID411
  const BLOCK_COMMENT = hljs.COMMENT(
    '/\\*',
    '\\*/',
    { contains: [ 'self' ] }
  );
  const COMMENTS = [
    hljs.C_LINE_COMMENT_MODE,
    BLOCK_COMMENT
  ];

  // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID413
  // https://docs.swift.org/swift-book/ReferenceManual/zzSummaryOfTheGrammar.html
  const DOT_KEYWORD = {
    match: [
      /\./,
      either(...dotKeywords, ...optionalDotKeywords)
    ],
    className: { 2: "keyword" }
  };
  const KEYWORD_GUARD = {
    // Consume .keyword to prevent highlighting properties and methods as keywords.
    match: concat(/\./, either(...keywords)),
    relevance: 0
  };
  const PLAIN_KEYWORDS = keywords
    .filter(kw => typeof kw === 'string')
    .concat([ "_|0" ]); // seems common, so 0 relevance
  const REGEX_KEYWORDS = keywords
    .filter(kw => typeof kw !== 'string') // find regex
    .concat(keywordTypes)
    .map(keywordWrapper);
  const KEYWORD = { variants: [
    {
      className: 'keyword',
      match: either(...REGEX_KEYWORDS, ...optionalDotKeywords)
    }
  ] };
  // find all the regular keywords
  const KEYWORDS = {
    $pattern: either(
      /\b\w+/, // regular keywords
      /#\w+/ // number keywords
    ),
    keyword: PLAIN_KEYWORDS
      .concat(numberSignKeywords),
    literal: literals
  };
  const KEYWORD_MODES = [
    DOT_KEYWORD,
    KEYWORD_GUARD,
    KEYWORD
  ];

  // https://github.com/apple/swift/tree/main/stdlib/public/core
  const BUILT_IN_GUARD = {
    // Consume .built_in to prevent highlighting properties and methods.
    match: concat(/\./, either(...builtIns)),
    relevance: 0
  };
  const BUILT_IN = {
    className: 'built_in',
    match: concat(/\b/, either(...builtIns), /(?=\()/)
  };
  const BUILT_INS = [
    BUILT_IN_GUARD,
    BUILT_IN
  ];

  // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID418
  const OPERATOR_GUARD = {
    // Prevent -> from being highlighting as an operator.
    match: /->/,
    relevance: 0
  };
  const OPERATOR = {
    className: 'operator',
    relevance: 0,
    variants: [
      { match: operator },
      {
        // dot-operator: only operators that start with a dot are allowed to use dots as
        // characters (..., ...<, .*, etc). So there rule here is: a dot followed by one or more
        // characters that may also include dots.
        match: `\\.(\\.|${operatorCharacter})+` }
    ]
  };
  const OPERATORS = [
    OPERATOR_GUARD,
    OPERATOR
  ];

  // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_numeric-literal
  // TODO: Update for leading `-` after lookbehind is supported everywhere
  const decimalDigits = '([0-9]_*)+';
  const hexDigits = '([0-9a-fA-F]_*)+';
  const NUMBER = {
    className: 'number',
    relevance: 0,
    variants: [
      // decimal floating-point-literal (subsumes decimal-literal)
      { match: `\\b(${decimalDigits})(\\.(${decimalDigits}))?` + `([eE][+-]?(${decimalDigits}))?\\b` },
      // hexadecimal floating-point-literal (subsumes hexadecimal-literal)
      { match: `\\b0x(${hexDigits})(\\.(${hexDigits}))?` + `([pP][+-]?(${decimalDigits}))?\\b` },
      // octal-literal
      { match: /\b0o([0-7]_*)+\b/ },
      // binary-literal
      { match: /\b0b([01]_*)+\b/ }
    ]
  };

  // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#grammar_string-literal
  const ESCAPED_CHARACTER = (rawDelimiter = "") => ({
    className: 'subst',
    variants: [
      { match: concat(/\\/, rawDelimiter, /[0\\tnr"']/) },
      { match: concat(/\\/, rawDelimiter, /u\{[0-9a-fA-F]{1,8}\}/) }
    ]
  });
  const ESCAPED_NEWLINE = (rawDelimiter = "") => ({
    className: 'subst',
    match: concat(/\\/, rawDelimiter, /[\t ]*(?:[\r\n]|\r\n)/)
  });
  const INTERPOLATION = (rawDelimiter = "") => ({
    className: 'subst',
    label: "interpol",
    begin: concat(/\\/, rawDelimiter, /\(/),
    end: /\)/
  });
  const MULTILINE_STRING = (rawDelimiter = "") => ({
    begin: concat(rawDelimiter, /"""/),
    end: concat(/"""/, rawDelimiter),
    contains: [
      ESCAPED_CHARACTER(rawDelimiter),
      ESCAPED_NEWLINE(rawDelimiter),
      INTERPOLATION(rawDelimiter)
    ]
  });
  const SINGLE_LINE_STRING = (rawDelimiter = "") => ({
    begin: concat(rawDelimiter, /"/),
    end: concat(/"/, rawDelimiter),
    contains: [
      ESCAPED_CHARACTER(rawDelimiter),
      INTERPOLATION(rawDelimiter)
    ]
  });
  const STRING = {
    className: 'string',
    variants: [
      MULTILINE_STRING(),
      MULTILINE_STRING("#"),
      MULTILINE_STRING("##"),
      MULTILINE_STRING("###"),
      SINGLE_LINE_STRING(),
      SINGLE_LINE_STRING("#"),
      SINGLE_LINE_STRING("##"),
      SINGLE_LINE_STRING("###")
    ]
  };

  // https://docs.swift.org/swift-book/ReferenceManual/LexicalStructure.html#ID412
  const QUOTED_IDENTIFIER = { match: concat(/`/, identifier, /`/) };
  const IMPLICIT_PARAMETER = {
    className: 'variable',
    match: /\$\d+/
  };
  const PROPERTY_WRAPPER_PROJECTION = {
    className: 'variable',
    match: `\\$${identifierCharacter}+`
  };
  const IDENTIFIERS = [
    QUOTED_IDENTIFIER,
    IMPLICIT_PARAMETER,
    PROPERTY_WRAPPER_PROJECTION
  ];

  // https://docs.swift.org/swift-book/ReferenceManual/Attributes.html
  const AVAILABLE_ATTRIBUTE = {
    match: /(@|#(un)?)available/,
    className: "keyword",
    starts: { contains: [
      {
        begin: /\(/,
        end: /\)/,
        keywords: availabilityKeywords,
        contains: [
          ...OPERATORS,
          NUMBER,
          STRING
        ]
      }
    ] }
  };
  const KEYWORD_ATTRIBUTE = {
    className: 'keyword',
    match: concat(/@/, either(...keywordAttributes))
  };
  const USER_DEFINED_ATTRIBUTE = {
    className: 'meta',
    match: concat(/@/, identifier)
  };
  const ATTRIBUTES = [
    AVAILABLE_ATTRIBUTE,
    KEYWORD_ATTRIBUTE,
    USER_DEFINED_ATTRIBUTE
  ];

  // https://docs.swift.org/swift-book/ReferenceManual/Types.html
  const TYPE = {
    match: lookahead(/\b[A-Z]/),
    relevance: 0,
    contains: [
      { // Common Apple frameworks, for relevance boost
        className: 'type',
        match: concat(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/, identifierCharacter, '+')
      },
      { // Type identifier
        className: 'type',
        match: typeIdentifier,
        relevance: 0
      },
      { // Optional type
        match: /[?!]+/,
        relevance: 0
      },
      { // Variadic parameter
        match: /\.\.\./,
        relevance: 0
      },
      { // Protocol composition
        match: concat(/\s+&\s+/, lookahead(typeIdentifier)),
        relevance: 0
      }
    ]
  };
  const GENERIC_ARGUMENTS = {
    begin: /</,
    end: />/,
    keywords: KEYWORDS,
    contains: [
      ...COMMENTS,
      ...KEYWORD_MODES,
      ...ATTRIBUTES,
      OPERATOR_GUARD,
      TYPE
    ]
  };
  TYPE.contains.push(GENERIC_ARGUMENTS);

  // https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#ID552
  // Prevents element names from being highlighted as keywords.
  const TUPLE_ELEMENT_NAME = {
    match: concat(identifier, /\s*:/),
    keywords: "_|0",
    relevance: 0
  };
  // Matches tuples as well as the parameter list of a function type.
  const TUPLE = {
    begin: /\(/,
    end: /\)/,
    relevance: 0,
    keywords: KEYWORDS,
    contains: [
      'self',
      TUPLE_ELEMENT_NAME,
      ...COMMENTS,
      ...KEYWORD_MODES,
      ...BUILT_INS,
      ...OPERATORS,
      NUMBER,
      STRING,
      ...IDENTIFIERS,
      ...ATTRIBUTES,
      TYPE
    ]
  };

  const GENERIC_PARAMETERS = {
    begin: /</,
    end: />/,
    contains: [
      ...COMMENTS,
      TYPE
    ]
  };
  const FUNCTION_PARAMETER_NAME = {
    begin: either(
      lookahead(concat(identifier, /\s*:/)),
      lookahead(concat(identifier, /\s+/, identifier, /\s*:/))
    ),
    end: /:/,
    relevance: 0,
    contains: [
      {
        className: 'keyword',
        match: /\b_\b/
      },
      {
        className: 'params',
        match: identifier
      }
    ]
  };
  const FUNCTION_PARAMETERS = {
    begin: /\(/,
    end: /\)/,
    keywords: KEYWORDS,
    contains: [
      FUNCTION_PARAMETER_NAME,
      ...COMMENTS,
      ...KEYWORD_MODES,
      ...OPERATORS,
      NUMBER,
      STRING,
      ...ATTRIBUTES,
      TYPE,
      TUPLE
    ],
    endsParent: true,
    illegal: /["']/
  };
  // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID362
  const FUNCTION = {
    match: [
      /func/,
      /\s+/,
      either(QUOTED_IDENTIFIER.match, identifier, operator)
    ],
    className: {
      1: "keyword",
      3: "title.function"
    },
    contains: [
      GENERIC_PARAMETERS,
      FUNCTION_PARAMETERS,
      WHITESPACE
    ],
    illegal: [
      /\[/,
      /%/
    ]
  };

  // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID375
  // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID379
  const INIT_SUBSCRIPT = {
    match: [
      /\b(?:subscript|init[?!]?)/,
      /\s*(?=[<(])/,
    ],
    className: { 1: "keyword" },
    contains: [
      GENERIC_PARAMETERS,
      FUNCTION_PARAMETERS,
      WHITESPACE
    ],
    illegal: /\[|%/
  };
  // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID380
  const OPERATOR_DECLARATION = {
    match: [
      /operator/,
      /\s+/,
      operator
    ],
    className: {
      1: "keyword",
      3: "title"
    }
  };

  // https://docs.swift.org/swift-book/ReferenceManual/Declarations.html#ID550
  const PRECEDENCEGROUP = {
    begin: [
      /precedencegroup/,
      /\s+/,
      typeIdentifier
    ],
    className: {
      1: "keyword",
      3: "title"
    },
    contains: [ TYPE ],
    keywords: [
      ...precedencegroupKeywords,
      ...literals
    ],
    end: /}/
  };

  // Add supported submodes to string interpolation.
  for (const variant of STRING.variants) {
    const interpolation = variant.contains.find(mode => mode.label === "interpol");
    // TODO: Interpolation can contain any expression, so there's room for improvement here.
    interpolation.keywords = KEYWORDS;
    const submodes = [
      ...KEYWORD_MODES,
      ...BUILT_INS,
      ...OPERATORS,
      NUMBER,
      STRING,
      ...IDENTIFIERS
    ];
    interpolation.contains = [
      ...submodes,
      {
        begin: /\(/,
        end: /\)/,
        contains: [
          'self',
          ...submodes
        ]
      }
    ];
  }

  return {
    name: 'Swift',
    keywords: KEYWORDS,
    contains: [
      ...COMMENTS,
      FUNCTION,
      INIT_SUBSCRIPT,
      {
        beginKeywords: 'struct protocol class extension enum actor',
        end: '\\{',
        excludeEnd: true,
        keywords: KEYWORDS,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            className: "title.class",
            begin: /[A-Za-z$_][\u00C0-\u02B80-9A-Za-z$_]*/
          }),
          ...KEYWORD_MODES
        ]
      },
      OPERATOR_DECLARATION,
      PRECEDENCEGROUP,
      {
        beginKeywords: 'import',
        end: /$/,
        contains: [ ...COMMENTS ],
        relevance: 0
      },
      ...KEYWORD_MODES,
      ...BUILT_INS,
      ...OPERATORS,
      NUMBER,
      STRING,
      ...IDENTIFIERS,
      ...ATTRIBUTES,
      TYPE,
      TUPLE
    ]
  };
}

export { swift as default };
