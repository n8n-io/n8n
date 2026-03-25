/*
 Language: G-code (ISO 6983)
 Contributors: Adam Joseph Cook <adam.joseph.cook@gmail.com>
 Description: G-code syntax highlighter for Fanuc and other common CNC machine tool controls.
 Website: https://www.sis.se/api/document/preview/911952/
 */

function gcode(hljs) {
  const GCODE_IDENT_RE = '[A-Z_][A-Z0-9_.]*';
  const GCODE_CLOSE_RE = '%';
  const GCODE_KEYWORDS = {
    $pattern: GCODE_IDENT_RE,
    keyword: 'IF DO WHILE ENDWHILE CALL ENDIF SUB ENDSUB GOTO REPEAT ENDREPEAT '
      + 'EQ LT GT NE GE LE OR XOR'
  };
  const GCODE_START = {
    className: 'meta',
    begin: '([O])([0-9]+)'
  };
  const NUMBER = hljs.inherit(hljs.C_NUMBER_MODE, { begin: '([-+]?((\\.\\d+)|(\\d+)(\\.\\d*)?))|' + hljs.C_NUMBER_RE });
  const GCODE_CODE = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.COMMENT(/\(/, /\)/),
    NUMBER,
    hljs.inherit(hljs.APOS_STRING_MODE, { illegal: null }),
    hljs.inherit(hljs.QUOTE_STRING_MODE, { illegal: null }),
    {
      className: 'name',
      begin: '([G])([0-9]+\\.?[0-9]?)'
    },
    {
      className: 'name',
      begin: '([M])([0-9]+\\.?[0-9]?)'
    },
    {
      className: 'attr',
      begin: '(VC|VS|#)',
      end: '(\\d+)'
    },
    {
      className: 'attr',
      begin: '(VZOFX|VZOFY|VZOFZ)'
    },
    {
      className: 'built_in',
      begin: '(ATAN|ABS|ACOS|ASIN|SIN|COS|EXP|FIX|FUP|ROUND|LN|TAN)(\\[)',
      contains: [ NUMBER ],
      end: '\\]'
    },
    {
      className: 'symbol',
      variants: [
        {
          begin: 'N',
          end: '\\d+',
          illegal: '\\W'
        }
      ]
    }
  ];

  return {
    name: 'G-code (ISO 6983)',
    aliases: [ 'nc' ],
    // Some implementations (CNC controls) of G-code are interoperable with uppercase and lowercase letters seamlessly.
    // However, most prefer all uppercase and uppercase is customary.
    case_insensitive: true,
    keywords: GCODE_KEYWORDS,
    contains: [
      {
        className: 'meta',
        begin: GCODE_CLOSE_RE
      },
      GCODE_START
    ].concat(GCODE_CODE)
  };
}

module.exports = gcode;
