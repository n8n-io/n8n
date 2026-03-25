/*
Language: Lasso
Author: Eric Knibbe <eric@lassosoft.com>
Description: Lasso is a language and server platform for database-driven web applications. This definition handles Lasso 9 syntax and LassoScript for Lasso 8.6 and earlier.
Website: http://www.lassosoft.com/What-Is-Lasso
*/

function lasso(hljs) {
  const LASSO_IDENT_RE = '[a-zA-Z_][\\w.]*';
  const LASSO_ANGLE_RE = '<\\?(lasso(script)?|=)';
  const LASSO_CLOSE_RE = '\\]|\\?>';
  const LASSO_KEYWORDS = {
    $pattern: LASSO_IDENT_RE + '|&[lg]t;',
    literal:
      'true false none minimal full all void and or not '
      + 'bw nbw ew new cn ncn lt lte gt gte eq neq rx nrx ft',
    built_in:
      'array date decimal duration integer map pair string tag xml null '
      + 'boolean bytes keyword list locale queue set stack staticarray '
      + 'local var variable global data self inherited currentcapture givenblock',
    keyword:
      'cache database_names database_schemanames database_tablenames '
      + 'define_tag define_type email_batch encode_set html_comment handle '
      + 'handle_error header if inline iterate ljax_target link '
      + 'link_currentaction link_currentgroup link_currentrecord link_detail '
      + 'link_firstgroup link_firstrecord link_lastgroup link_lastrecord '
      + 'link_nextgroup link_nextrecord link_prevgroup link_prevrecord log '
      + 'loop namespace_using output_none portal private protect records '
      + 'referer referrer repeating resultset rows search_args '
      + 'search_arguments select sort_args sort_arguments thread_atomic '
      + 'value_list while abort case else fail_if fail_ifnot fail if_empty '
      + 'if_false if_null if_true loop_abort loop_continue loop_count params '
      + 'params_up return return_value run_children soap_definetag '
      + 'soap_lastrequest soap_lastresponse tag_name ascending average by '
      + 'define descending do equals frozen group handle_failure import in '
      + 'into join let match max min on order parent protected provide public '
      + 'require returnhome skip split_thread sum take thread to trait type '
      + 'where with yield yieldhome'
  };
  const HTML_COMMENT = hljs.COMMENT(
    '<!--',
    '-->',
    { relevance: 0 }
  );
  const LASSO_NOPROCESS = {
    className: 'meta',
    begin: '\\[noprocess\\]',
    starts: {
      end: '\\[/noprocess\\]',
      returnEnd: true,
      contains: [ HTML_COMMENT ]
    }
  };
  const LASSO_START = {
    className: 'meta',
    begin: '\\[/noprocess|' + LASSO_ANGLE_RE
  };
  const LASSO_DATAMEMBER = {
    className: 'symbol',
    begin: '\'' + LASSO_IDENT_RE + '\''
  };
  const LASSO_CODE = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.inherit(hljs.C_NUMBER_MODE, { begin: hljs.C_NUMBER_RE + '|(-?infinity|NaN)\\b' }),
    hljs.inherit(hljs.APOS_STRING_MODE, { illegal: null }),
    hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
    {
      className: 'string',
      begin: '`',
      end: '`'
    },
    { // variables
      variants: [
        { begin: '[#$]' + LASSO_IDENT_RE },
        {
          begin: '#',
          end: '\\d+',
          illegal: '\\W'
        }
      ] },
    {
      className: 'type',
      begin: '::\\s*',
      end: LASSO_IDENT_RE,
      illegal: '\\W'
    },
    {
      className: 'params',
      variants: [
        {
          begin: '-(?!infinity)' + LASSO_IDENT_RE,
          relevance: 0
        },
        { begin: '(\\.\\.\\.)' }
      ]
    },
    {
      begin: /(->|\.)\s*/,
      relevance: 0,
      contains: [ LASSO_DATAMEMBER ]
    },
    {
      className: 'class',
      beginKeywords: 'define',
      returnEnd: true,
      end: '\\(|=>',
      contains: [ hljs.inherit(hljs.TITLE_MODE, { begin: LASSO_IDENT_RE + '(=(?!>))?|[-+*/%](?!>)' }) ]
    }
  ];
  return {
    name: 'Lasso',
    aliases: [
      'ls',
      'lassoscript'
    ],
    case_insensitive: true,
    keywords: LASSO_KEYWORDS,
    contains: [
      {
        className: 'meta',
        begin: LASSO_CLOSE_RE,
        relevance: 0,
        starts: { // markup
          end: '\\[|' + LASSO_ANGLE_RE,
          returnEnd: true,
          relevance: 0,
          contains: [ HTML_COMMENT ]
        }
      },
      LASSO_NOPROCESS,
      LASSO_START,
      {
        className: 'meta',
        begin: '\\[no_square_brackets',
        starts: {
          end: '\\[/no_square_brackets\\]', // not implemented in the language
          keywords: LASSO_KEYWORDS,
          contains: [
            {
              className: 'meta',
              begin: LASSO_CLOSE_RE,
              relevance: 0,
              starts: {
                end: '\\[noprocess\\]|' + LASSO_ANGLE_RE,
                returnEnd: true,
                contains: [ HTML_COMMENT ]
              }
            },
            LASSO_NOPROCESS,
            LASSO_START
          ].concat(LASSO_CODE)
        }
      },
      {
        className: 'meta',
        begin: '\\[',
        relevance: 0
      },
      {
        className: 'meta',
        begin: '^#!',
        end: 'lasso9$',
        relevance: 10
      }
    ].concat(LASSO_CODE)
  };
}

module.exports = lasso;
