const KEYWORDS = [
  "as", // for exports
  "in",
  "of",
  "if",
  "for",
  "while",
  "finally",
  "var",
  "new",
  "function",
  "do",
  "return",
  "void",
  "else",
  "break",
  "catch",
  "instanceof",
  "with",
  "throw",
  "case",
  "default",
  "try",
  "switch",
  "continue",
  "typeof",
  "delete",
  "let",
  "yield",
  "const",
  "class",
  // JS handles these with a special rule
  // "get",
  // "set",
  "debugger",
  "async",
  "await",
  "static",
  "import",
  "from",
  "export",
  "extends",
  // It's reached stage 3, which is "recommended for implementation":
  "using"
];
const LITERALS = [
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity"
];

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
const TYPES = [
  // Fundamental objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // numbers and dates
  "Math",
  "Date",
  "Number",
  "BigInt",
  // text
  "String",
  "RegExp",
  // Indexed collections
  "Array",
  "Float32Array",
  "Float64Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Int32Array",
  "Uint16Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  // Keyed collections
  "Set",
  "Map",
  "WeakSet",
  "WeakMap",
  // Structured data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "Atomics",
  "DataView",
  "JSON",
  // Control abstraction objects
  "Promise",
  "Generator",
  "GeneratorFunction",
  "AsyncFunction",
  // Reflection
  "Reflect",
  "Proxy",
  // Internationalization
  "Intl",
  // WebAssembly
  "WebAssembly"
];

const ERROR_TYPES = [
  "Error",
  "EvalError",
  "InternalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError"
];

const BUILT_IN_GLOBALS = [
  "setInterval",
  "setTimeout",
  "clearInterval",
  "clearTimeout",

  "require",
  "exports",

  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape"
];

const BUILT_INS = [].concat(
  BUILT_IN_GLOBALS,
  TYPES,
  ERROR_TYPES
);

/*
Language: CoffeeScript
Author: Dmytrii Nagirniak <dnagir@gmail.com>
Contributors: Oleg Efimov <efimovov@gmail.com>, Cédric Néhémie <cedric.nehemie@gmail.com>
Description: CoffeeScript is a programming language that transcompiles to JavaScript. For info about language see http://coffeescript.org/
Category: scripting
Website: https://coffeescript.org
*/


/** @type LanguageFn */
function coffeescript(hljs) {
  const COFFEE_BUILT_INS = [
    'npm',
    'print'
  ];
  const COFFEE_LITERALS = [
    'yes',
    'no',
    'on',
    'off'
  ];
  const COFFEE_KEYWORDS = [
    'then',
    'unless',
    'until',
    'loop',
    'by',
    'when',
    'and',
    'or',
    'is',
    'isnt',
    'not'
  ];
  const NOT_VALID_KEYWORDS = [
    "var",
    "const",
    "let",
    "function",
    "static"
  ];
  const excluding = (list) =>
    (kw) => !list.includes(kw);
  const KEYWORDS$1 = {
    keyword: KEYWORDS.concat(COFFEE_KEYWORDS).filter(excluding(NOT_VALID_KEYWORDS)),
    literal: LITERALS.concat(COFFEE_LITERALS),
    built_in: BUILT_INS.concat(COFFEE_BUILT_INS)
  };
  const JS_IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  const SUBST = {
    className: 'subst',
    begin: /#\{/,
    end: /\}/,
    keywords: KEYWORDS$1
  };
  const EXPRESSIONS = [
    hljs.BINARY_NUMBER_MODE,
    hljs.inherit(hljs.C_NUMBER_MODE, { starts: {
      end: '(\\s*/)?',
      relevance: 0
    } }), // a number tries to eat the following slash to prevent treating it as a regexp
    {
      className: 'string',
      variants: [
        {
          begin: /'''/,
          end: /'''/,
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: /'/,
          end: /'/,
          contains: [ hljs.BACKSLASH_ESCAPE ]
        },
        {
          begin: /"""/,
          end: /"""/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ]
        },
        {
          begin: /"/,
          end: /"/,
          contains: [
            hljs.BACKSLASH_ESCAPE,
            SUBST
          ]
        }
      ]
    },
    {
      className: 'regexp',
      variants: [
        {
          begin: '///',
          end: '///',
          contains: [
            SUBST,
            hljs.HASH_COMMENT_MODE
          ]
        },
        {
          begin: '//[gim]{0,3}(?=\\W)',
          relevance: 0
        },
        {
          // regex can't start with space to parse x / 2 / 3 as two divisions
          // regex can't start with *, and it supports an "illegal" in the main mode
          begin: /\/(?![ *]).*?(?![\\]).\/[gim]{0,3}(?=\W)/ }
      ]
    },
    { begin: '@' + JS_IDENT_RE // relevance booster
    },
    {
      subLanguage: 'javascript',
      excludeBegin: true,
      excludeEnd: true,
      variants: [
        {
          begin: '```',
          end: '```'
        },
        {
          begin: '`',
          end: '`'
        }
      ]
    }
  ];
  SUBST.contains = EXPRESSIONS;

  const TITLE = hljs.inherit(hljs.TITLE_MODE, { begin: JS_IDENT_RE });
  const POSSIBLE_PARAMS_RE = '(\\(.*\\)\\s*)?\\B[-=]>';
  const PARAMS = {
    className: 'params',
    begin: '\\([^\\(]',
    returnBegin: true,
    /* We need another contained nameless mode to not have every nested
    pair of parens to be called "params" */
    contains: [
      {
        begin: /\(/,
        end: /\)/,
        keywords: KEYWORDS$1,
        contains: [ 'self' ].concat(EXPRESSIONS)
      }
    ]
  };

  const CLASS_DEFINITION = {
    variants: [
      { match: [
        /class\s+/,
        JS_IDENT_RE,
        /\s+extends\s+/,
        JS_IDENT_RE
      ] },
      { match: [
        /class\s+/,
        JS_IDENT_RE
      ] }
    ],
    scope: {
      2: "title.class",
      4: "title.class.inherited"
    },
    keywords: KEYWORDS$1
  };

  return {
    name: 'CoffeeScript',
    aliases: [
      'coffee',
      'cson',
      'iced'
    ],
    keywords: KEYWORDS$1,
    illegal: /\/\*/,
    contains: [
      ...EXPRESSIONS,
      hljs.COMMENT('###', '###'),
      hljs.HASH_COMMENT_MODE,
      {
        className: 'function',
        begin: '^\\s*' + JS_IDENT_RE + '\\s*=\\s*' + POSSIBLE_PARAMS_RE,
        end: '[-=]>',
        returnBegin: true,
        contains: [
          TITLE,
          PARAMS
        ]
      },
      {
        // anonymous function start
        begin: /[:\(,=]\s*/,
        relevance: 0,
        contains: [
          {
            className: 'function',
            begin: POSSIBLE_PARAMS_RE,
            end: '[-=]>',
            returnBegin: true,
            contains: [ PARAMS ]
          }
        ]
      },
      CLASS_DEFINITION,
      {
        begin: JS_IDENT_RE + ':',
        end: ':',
        returnBegin: true,
        returnEnd: true,
        relevance: 0
      }
    ]
  };
}

export { coffeescript as default };
