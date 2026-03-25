/*
Language: AspectJ
Author: Hakan Ozler <ozler.hakan@gmail.com>
Website: https://www.eclipse.org/aspectj/
Description: Syntax Highlighting for the AspectJ Language which is a general-purpose aspect-oriented extension to the Java programming language.
Audit: 2020
*/

/** @type LanguageFn */
function aspectj(hljs) {
  const regex = hljs.regex;
  const KEYWORDS = [
    "false",
    "synchronized",
    "int",
    "abstract",
    "float",
    "private",
    "char",
    "boolean",
    "static",
    "null",
    "if",
    "const",
    "for",
    "true",
    "while",
    "long",
    "throw",
    "strictfp",
    "finally",
    "protected",
    "import",
    "native",
    "final",
    "return",
    "void",
    "enum",
    "else",
    "extends",
    "implements",
    "break",
    "transient",
    "new",
    "catch",
    "instanceof",
    "byte",
    "super",
    "volatile",
    "case",
    "assert",
    "short",
    "package",
    "default",
    "double",
    "public",
    "try",
    "this",
    "switch",
    "continue",
    "throws",
    "privileged",
    "aspectOf",
    "adviceexecution",
    "proceed",
    "cflowbelow",
    "cflow",
    "initialization",
    "preinitialization",
    "staticinitialization",
    "withincode",
    "target",
    "within",
    "execution",
    "getWithinTypeName",
    "handler",
    "thisJoinPoint",
    "thisJoinPointStaticPart",
    "thisEnclosingJoinPointStaticPart",
    "declare",
    "parents",
    "warning",
    "error",
    "soft",
    "precedence",
    "thisAspectInstance"
  ];
  const SHORTKEYS = [
    "get",
    "set",
    "args",
    "call"
  ];

  return {
    name: 'AspectJ',
    keywords: KEYWORDS,
    illegal: /<\/|#/,
    contains: [
      hljs.COMMENT(
        /\/\*\*/,
        /\*\//,
        {
          relevance: 0,
          contains: [
            {
              // eat up @'s in emails to prevent them to be recognized as doctags
              begin: /\w+@/,
              relevance: 0
            },
            {
              className: 'doctag',
              begin: /@[A-Za-z]+/
            }
          ]
        }
      ),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'class',
        beginKeywords: 'aspect',
        end: /[{;=]/,
        excludeEnd: true,
        illegal: /[:;"\[\]]/,
        contains: [
          { beginKeywords: 'extends implements pertypewithin perthis pertarget percflowbelow percflow issingleton' },
          hljs.UNDERSCORE_TITLE_MODE,
          {
            begin: /\([^\)]*/,
            end: /[)]+/,
            keywords: KEYWORDS.concat(SHORTKEYS),
            excludeEnd: false
          }
        ]
      },
      {
        className: 'class',
        beginKeywords: 'class interface',
        end: /[{;=]/,
        excludeEnd: true,
        relevance: 0,
        keywords: 'class interface',
        illegal: /[:"\[\]]/,
        contains: [
          { beginKeywords: 'extends implements' },
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        // AspectJ Constructs
        beginKeywords: 'pointcut after before around throwing returning',
        end: /[)]/,
        excludeEnd: false,
        illegal: /["\[\]]/,
        contains: [
          {
            begin: regex.concat(hljs.UNDERSCORE_IDENT_RE, /\s*\(/),
            returnBegin: true,
            contains: [ hljs.UNDERSCORE_TITLE_MODE ]
          }
        ]
      },
      {
        begin: /[:]/,
        returnBegin: true,
        end: /[{;]/,
        relevance: 0,
        excludeEnd: false,
        keywords: KEYWORDS,
        illegal: /["\[\]]/,
        contains: [
          {
            begin: regex.concat(hljs.UNDERSCORE_IDENT_RE, /\s*\(/),
            keywords: KEYWORDS.concat(SHORTKEYS),
            relevance: 0
          },
          hljs.QUOTE_STRING_MODE
        ]
      },
      {
        // this prevents 'new Name(...), or throw ...' from being recognized as a function definition
        beginKeywords: 'new throw',
        relevance: 0
      },
      {
        // the function class is a bit different for AspectJ compared to the Java language
        className: 'function',
        begin: /\w+ +\w+(\.\w+)?\s*\([^\)]*\)\s*((throws)[\w\s,]+)?[\{;]/,
        returnBegin: true,
        end: /[{;=]/,
        keywords: KEYWORDS,
        excludeEnd: true,
        contains: [
          {
            begin: regex.concat(hljs.UNDERSCORE_IDENT_RE, /\s*\(/),
            returnBegin: true,
            relevance: 0,
            contains: [ hljs.UNDERSCORE_TITLE_MODE ]
          },
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            relevance: 0,
            keywords: KEYWORDS,
            contains: [
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.C_NUMBER_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      hljs.C_NUMBER_MODE,
      {
        // annotation is also used in this language
        className: 'meta',
        begin: /@[A-Za-z]+/
      }
    ]
  };
}

export { aspectj as default };
