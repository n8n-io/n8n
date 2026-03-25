/*
 Language: GAMS
 Author: Stefan Bechert <stefan.bechert@gmx.net>
 Contributors: Oleg Efimov <efimovov@gmail.com>, Mikko Kouhia <mikko.kouhia@iki.fi>
 Description: The General Algebraic Modeling System language
 Website: https://www.gams.com
 Category: scientific
 */

/** @type LanguageFn */
function gams(hljs) {
  const regex = hljs.regex;
  const KEYWORDS = {
    keyword:
      'abort acronym acronyms alias all and assign binary card diag display '
      + 'else eq file files for free ge gt if integer le loop lt maximizing '
      + 'minimizing model models ne negative no not option options or ord '
      + 'positive prod put putpage puttl repeat sameas semicont semiint smax '
      + 'smin solve sos1 sos2 sum system table then until using while xor yes',
    literal:
      'eps inf na',
    built_in:
      'abs arccos arcsin arctan arctan2 Beta betaReg binomial ceil centropy '
      + 'cos cosh cvPower div div0 eDist entropy errorf execSeed exp fact '
      + 'floor frac gamma gammaReg log logBeta logGamma log10 log2 mapVal max '
      + 'min mod ncpCM ncpF ncpVUpow ncpVUsin normal pi poly power '
      + 'randBinomial randLinear randTriangle round rPower sigmoid sign '
      + 'signPower sin sinh slexp sllog10 slrec sqexp sqlog10 sqr sqrec sqrt '
      + 'tan tanh trunc uniform uniformInt vcPower bool_and bool_eqv bool_imp '
      + 'bool_not bool_or bool_xor ifThen rel_eq rel_ge rel_gt rel_le rel_lt '
      + 'rel_ne gday gdow ghour gleap gmillisec gminute gmonth gsecond gyear '
      + 'jdate jnow jstart jtime errorLevel execError gamsRelease gamsVersion '
      + 'handleCollect handleDelete handleStatus handleSubmit heapFree '
      + 'heapLimit heapSize jobHandle jobKill jobStatus jobTerminate '
      + 'licenseLevel licenseStatus maxExecError sleep timeClose timeComp '
      + 'timeElapsed timeExec timeStart'
  };
  const PARAMS = {
    className: 'params',
    begin: /\(/,
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true
  };
  const SYMBOLS = {
    className: 'symbol',
    variants: [
      { begin: /=[lgenxc]=/ },
      { begin: /\$/ }
    ]
  };
  const QSTR = { // One-line quoted comment string
    className: 'comment',
    variants: [
      {
        begin: '\'',
        end: '\''
      },
      {
        begin: '"',
        end: '"'
      }
    ],
    illegal: '\\n',
    contains: [ hljs.BACKSLASH_ESCAPE ]
  };
  const ASSIGNMENT = {
    begin: '/',
    end: '/',
    keywords: KEYWORDS,
    contains: [
      QSTR,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,
      hljs.C_NUMBER_MODE
    ]
  };
  const COMMENT_WORD = /[a-z0-9&#*=?@\\><:,()$[\]_.{}!+%^-]+/;
  const DESCTEXT = { // Parameter/set/variable description text
    begin: /[a-z][a-z0-9_]*(\([a-z0-9_, ]*\))?[ \t]+/,
    excludeBegin: true,
    end: '$',
    endsWithParent: true,
    contains: [
      QSTR,
      ASSIGNMENT,
      {
        className: 'comment',
        // one comment word, then possibly more
        begin: regex.concat(
          COMMENT_WORD,
          // [ ] because \s would be too broad (matching newlines)
          regex.anyNumberOfTimes(regex.concat(/[ ]+/, COMMENT_WORD))
        ),
        relevance: 0
      }
    ]
  };

  return {
    name: 'GAMS',
    aliases: [ 'gms' ],
    case_insensitive: true,
    keywords: KEYWORDS,
    contains: [
      hljs.COMMENT(/^\$ontext/, /^\$offtext/),
      {
        className: 'meta',
        begin: '^\\$[a-z0-9]+',
        end: '$',
        returnBegin: true,
        contains: [
          {
            className: 'keyword',
            begin: '^\\$[a-z0-9]+'
          }
        ]
      },
      hljs.COMMENT('^\\*', '$'),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,
      // Declarations
      {
        beginKeywords:
          'set sets parameter parameters variable variables '
          + 'scalar scalars equation equations',
        end: ';',
        contains: [
          hljs.COMMENT('^\\*', '$'),
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          ASSIGNMENT,
          DESCTEXT
        ]
      },
      { // table environment
        beginKeywords: 'table',
        end: ';',
        returnBegin: true,
        contains: [
          { // table header row
            beginKeywords: 'table',
            end: '$',
            contains: [ DESCTEXT ]
          },
          hljs.COMMENT('^\\*', '$'),
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          hljs.C_NUMBER_MODE
          // Table does not contain DESCTEXT or ASSIGNMENT
        ]
      },
      // Function definitions
      {
        className: 'function',
        begin: /^[a-z][a-z0-9_,\-+' ()$]+\.{2}/,
        returnBegin: true,
        contains: [
          { // Function title
            className: 'title',
            begin: /^[a-z0-9_]+/
          },
          PARAMS,
          SYMBOLS
        ]
      },
      hljs.C_NUMBER_MODE,
      SYMBOLS
    ]
  };
}

export { gams as default };
