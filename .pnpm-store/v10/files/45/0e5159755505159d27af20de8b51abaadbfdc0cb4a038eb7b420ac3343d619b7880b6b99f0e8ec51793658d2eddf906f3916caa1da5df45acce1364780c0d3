/*
Language: Scala
Category: functional
Author: Jan Berkel <jan.berkel@gmail.com>
Contributors: Erik Osheim <d_m@plastic-idolatry.com>
Website: https://www.scala-lang.org
*/

function scala(hljs) {
  const regex = hljs.regex;
  const ANNOTATION = {
    className: 'meta',
    begin: '@[A-Za-z]+'
  };

  // used in strings for escaping/interpolation/substitution
  const SUBST = {
    className: 'subst',
    variants: [
      { begin: '\\$[A-Za-z0-9_]+' },
      {
        begin: /\$\{/,
        end: /\}/
      }
    ]
  };

  const STRING = {
    className: 'string',
    variants: [
      {
        begin: '"""',
        end: '"""'
      },
      {
        begin: '"',
        end: '"',
        illegal: '\\n',
        contains: [ hljs.BACKSLASH_ESCAPE ]
      },
      {
        begin: '[a-z]+"',
        end: '"',
        illegal: '\\n',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          SUBST
        ]
      },
      {
        className: 'string',
        begin: '[a-z]+"""',
        end: '"""',
        contains: [ SUBST ],
        relevance: 10
      }
    ]

  };

  const TYPE = {
    className: 'type',
    begin: '\\b[A-Z][A-Za-z0-9_]*',
    relevance: 0
  };

  const NAME = {
    className: 'title',
    begin: /[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,
    relevance: 0
  };

  const CLASS = {
    className: 'class',
    beginKeywords: 'class object trait type',
    end: /[:={\[\n;]/,
    excludeEnd: true,
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        beginKeywords: 'extends with',
        relevance: 10
      },
      {
        begin: /\[/,
        end: /\]/,
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0,
        contains: [ TYPE ]
      },
      {
        className: 'params',
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        relevance: 0,
        contains: [ TYPE ]
      },
      NAME
    ]
  };

  const METHOD = {
    className: 'function',
    beginKeywords: 'def',
    end: regex.lookahead(/[:={\[(\n;]/),
    contains: [ NAME ]
  };

  const EXTENSION = {
    begin: [
      /^\s*/, // Is first token on the line
      'extension',
      /\s+(?=[[(])/, // followed by at least one space and `[` or `(`
    ],
    beginScope: { 2: "keyword", }
  };

  const END = {
    begin: [
      /^\s*/, // Is first token on the line
      /end/,
      /\s+/,
      /(extension\b)?/, // `extension` is the only marker that follows an `end` that cannot be captured by another rule.
    ],
    beginScope: {
      2: "keyword",
      4: "keyword",
    }
  };

  // TODO: use negative look-behind in future
  //       /(?<!\.)\binline(?=\s)/
  const INLINE_MODES = [
    { match: /\.inline\b/ },
    {
      begin: /\binline(?=\s)/,
      keywords: 'inline'
    }
  ];

  const USING_PARAM_CLAUSE = {
    begin: [
      /\(\s*/, // Opening `(` of a parameter or argument list
      /using/,
      /\s+(?!\))/, // Spaces not followed by `)`
    ],
    beginScope: { 2: "keyword", }
  };

  return {
    name: 'Scala',
    keywords: {
      literal: 'true false null',
      keyword: 'type yield lazy override def with val var sealed abstract private trait object if then forSome for while do throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit export enum given transparent'
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      STRING,
      TYPE,
      METHOD,
      CLASS,
      hljs.C_NUMBER_MODE,
      EXTENSION,
      END,
      ...INLINE_MODES,
      USING_PARAM_CLAUSE,
      ANNOTATION
    ]
  };
}

module.exports = scala;
