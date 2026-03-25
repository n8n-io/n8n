/*
Language: Nix
Author: Domen Kožar <domen@dev.si>
Description: Nix functional language
Website: http://nixos.org/nix
Category: system
*/

/** @type LanguageFn */
function nix(hljs) {
  const regex = hljs.regex;
  const KEYWORDS = {
    keyword: [
      "assert",
      "else",
      "if",
      "in",
      "inherit",
      "let",
      "or",
      "rec",
      "then",
      "with",
    ],
    literal: [
      "true",
      "false",
      "null",
    ],
    built_in: [
      // toplevel builtins
      "abort",
      "baseNameOf",
      "builtins",
      "derivation",
      "derivationStrict",
      "dirOf",
      "fetchGit",
      "fetchMercurial",
      "fetchTarball",
      "fetchTree",
      "fromTOML",
      "import",
      "isNull",
      "map",
      "placeholder",
      "removeAttrs",
      "scopedImport",
      "throw",
      "toString",
    ],
  };

  const BUILTINS = {
    scope: 'built_in',
    match: regex.either(...[
      "abort",
      "add",
      "addDrvOutputDependencies",
      "addErrorContext",
      "all",
      "any",
      "appendContext",
      "attrNames",
      "attrValues",
      "baseNameOf",
      "bitAnd",
      "bitOr",
      "bitXor",
      "break",
      "builtins",
      "catAttrs",
      "ceil",
      "compareVersions",
      "concatLists",
      "concatMap",
      "concatStringsSep",
      "convertHash",
      "currentSystem",
      "currentTime",
      "deepSeq",
      "derivation",
      "derivationStrict",
      "dirOf",
      "div",
      "elem",
      "elemAt",
      "false",
      "fetchGit",
      "fetchMercurial",
      "fetchTarball",
      "fetchTree",
      "fetchurl",
      "filter",
      "filterSource",
      "findFile",
      "flakeRefToString",
      "floor",
      "foldl'",
      "fromJSON",
      "fromTOML",
      "functionArgs",
      "genList",
      "genericClosure",
      "getAttr",
      "getContext",
      "getEnv",
      "getFlake",
      "groupBy",
      "hasAttr",
      "hasContext",
      "hashFile",
      "hashString",
      "head",
      "import",
      "intersectAttrs",
      "isAttrs",
      "isBool",
      "isFloat",
      "isFunction",
      "isInt",
      "isList",
      "isNull",
      "isPath",
      "isString",
      "langVersion",
      "length",
      "lessThan",
      "listToAttrs",
      "map",
      "mapAttrs",
      "match",
      "mul",
      "nixPath",
      "nixVersion",
      "null",
      "parseDrvName",
      "parseFlakeRef",
      "partition",
      "path",
      "pathExists",
      "placeholder",
      "readDir",
      "readFile",
      "readFileType",
      "removeAttrs",
      "replaceStrings",
      "scopedImport",
      "seq",
      "sort",
      "split",
      "splitVersion",
      "storeDir",
      "storePath",
      "stringLength",
      "sub",
      "substring",
      "tail",
      "throw",
      "toFile",
      "toJSON",
      "toPath",
      "toString",
      "toXML",
      "trace",
      "traceVerbose",
      "true",
      "tryEval",
      "typeOf",
      "unsafeDiscardOutputDependency",
      "unsafeDiscardStringContext",
      "unsafeGetAttrPos",
      "warn",
      "zipAttrsWith",
    ].map(b => `builtins\\.${b}`)),
    relevance: 10,
  };

  const IDENTIFIER_REGEX = '[A-Za-z_][A-Za-z0-9_\'-]*';

  const LOOKUP_PATH = {
    scope: 'symbol',
    match: new RegExp(`<${IDENTIFIER_REGEX}(/${IDENTIFIER_REGEX})*>`),
  };

  const PATH_PIECE = "[A-Za-z0-9_\\+\\.-]+";
  const PATH = {
    scope: 'symbol',
    match: new RegExp(`(\\.\\.|\\.|~)?/(${PATH_PIECE})?(/${PATH_PIECE})*(?=[\\s;])`),
  };

  const OPERATOR_WITHOUT_MINUS_REGEX = regex.either(...[
    '==',
    '=',
    '\\+\\+',
    '\\+',
    '<=',
    '<\\|',
    '<',
    '>=',
    '>',
    '->',
    '//',
    '/',
    '!=',
    '!',
    '\\|\\|',
    '\\|>',
    '\\?',
    '\\*',
    '&&',
  ]);

  const OPERATOR = {
    scope: 'operator',
    match: regex.concat(OPERATOR_WITHOUT_MINUS_REGEX, /(?!-)/),
    relevance: 0,
  };

  // '-' is being handled by itself to ensure we are able to tell the difference
  // between a dash in an identifier and a minus operator
  const NUMBER = {
    scope: 'number',
    match: new RegExp(`${hljs.NUMBER_RE}(?!-)`),
    relevance: 0,
  };
  const MINUS_OPERATOR = {
    variants: [
      {
        scope: 'operator',
        beforeMatch: /\s/,
        // The (?!>) is used to ensure this doesn't collide with the '->' operator
        begin: /-(?!>)/,
      },
      {
        begin: [
          new RegExp(`${hljs.NUMBER_RE}`),
          /-/,
          /(?!>)/,
        ],
        beginScope: {
          1: 'number',
          2: 'operator'
        },
      },
      {
        begin: [
          OPERATOR_WITHOUT_MINUS_REGEX,
          /-/,
          /(?!>)/,
        ],
        beginScope: {
          1: 'operator',
          2: 'operator'
        },
      },
    ],
    relevance: 0,
  };

  const ATTRS = {
    beforeMatch: /(^|\{|;)\s*/,
    begin: new RegExp(`${IDENTIFIER_REGEX}(\\.${IDENTIFIER_REGEX})*\\s*=(?!=)`),
    returnBegin: true,
    relevance: 0,
    contains: [
      {
        scope: 'attr',
        match: new RegExp(`${IDENTIFIER_REGEX}(\\.${IDENTIFIER_REGEX})*(?=\\s*=)`),
        relevance: 0.2,
      }
    ],
  };

  const NORMAL_ESCAPED_DOLLAR = {
    scope: 'char.escape',
    match: /\\\$/,
  };
  const INDENTED_ESCAPED_DOLLAR = {
    scope: 'char.escape',
    match: /''\$/,
  };
  const ANTIQUOTE = {
    scope: 'subst',
    begin: /\$\{/,
    end: /\}/,
    keywords: KEYWORDS,
  };
  const ESCAPED_DOUBLEQUOTE = {
    scope: 'char.escape',
    match: /'''/,
  };
  const ESCAPED_LITERAL = {
    scope: 'char.escape',
    match: /\\(?!\$)./,
  };
  const STRING = {
    scope: 'string',
    variants: [
      {
        begin: "''",
        end: "''",
        contains: [
          INDENTED_ESCAPED_DOLLAR,
          ANTIQUOTE,
          ESCAPED_DOUBLEQUOTE,
          ESCAPED_LITERAL,
        ],
      },
      {
        begin: '"',
        end: '"',
        contains: [
          NORMAL_ESCAPED_DOLLAR,
          ANTIQUOTE,
          ESCAPED_LITERAL,
        ],
      },
    ],
  };

  const FUNCTION_PARAMS = {
    scope: 'params',
    match: new RegExp(`${IDENTIFIER_REGEX}\\s*:(?=\\s)`),
  };

  const EXPRESSIONS = [
    NUMBER,
    hljs.HASH_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.COMMENT(
      /\/\*\*(?!\/)/,
      /\*\//,
      {
        subLanguage: 'markdown',
        relevance: 0
      }
    ),
    BUILTINS,
    STRING,
    LOOKUP_PATH,
    PATH,
    FUNCTION_PARAMS,
    ATTRS,
    MINUS_OPERATOR,
    OPERATOR,
  ];

  ANTIQUOTE.contains = EXPRESSIONS;

  const REPL = [
    {
      scope: 'meta.prompt',
      match: /^nix-repl>(?=\s)/,
      relevance: 10,
    },
    {
      scope: 'meta',
      beforeMatch: /\s+/,
      begin: /:([a-z]+|\?)/,
    },
  ];

  return {
    name: 'Nix',
    aliases: [ "nixos" ],
    keywords: KEYWORDS,
    contains: EXPRESSIONS.concat(REPL),
  };
}

module.exports = nix;
