/*
 Language: G-code (ISO 6983)
 Contributors: Adam Joseph Cook <adam.joseph.cook@gmail.com>
 Description: G-code syntax highlighter for Fanuc and other common CNC machine tool controls.
 Website: https://www.sis.se/api/document/preview/911952/
 Category: hardware
 */

function gcode(hljs) {
  const regex = hljs.regex;
  const GCODE_KEYWORDS = {
    $pattern: /[A-Z]+|%/,
    keyword: [
      // conditions
      'THEN',
      'ELSE',
      'ENDIF',
      'IF',

      // controls
      'GOTO',
      'DO',
      'WHILE',
      'WH',
      'END',
      'CALL',

      // scoping
      'SUB',
      'ENDSUB',

      // comparisons
      'EQ',
      'NE',
      'LT',
      'GT',
      'LE',
      'GE',
      'AND',
      'OR',
      'XOR',

      // start/end of program
      '%'
    ],
    built_in: [
      'ATAN',
      'ABS',
      'ACOS',
      'ASIN',
      'COS',
      'EXP',
      'FIX',
      'FUP',
      'ROUND',
      'LN',
      'SIN',
      'SQRT',
      'TAN',
      'EXISTS'
    ]
  };


  // TODO: post v12 lets use look-behind, until then \b and a callback filter will be used
  // const LETTER_BOUNDARY_RE = /(?<![A-Z])/;
  const LETTER_BOUNDARY_RE = /\b/;

  function LETTER_BOUNDARY_CALLBACK(matchdata, response) {
    if (matchdata.index === 0) {
      return;
    }

    const charBeforeMatch = matchdata.input[matchdata.index - 1];
    if (charBeforeMatch >= '0' && charBeforeMatch <= '9') {
      return;
    }

    if (charBeforeMatch === '_') {
      return;
    }

    response.ignoreMatch();
  }

  const NUMBER_RE = /[+-]?((\.\d+)|(\d+)(\.\d*)?)/;

  const GENERAL_MISC_FUNCTION_RE = /[GM]\s*\d+(\.\d+)?/;
  const TOOLS_RE = /T\s*\d+/;
  const SUBROUTINE_RE = /O\s*\d+/;
  const SUBROUTINE_NAMED_RE = /O<.+>/;
  const AXES_RE = /[ABCUVWXYZ]\s*/;
  const PARAMETERS_RE = /[FHIJKPQRS]\s*/;

  const GCODE_CODE = [
    // comments
    hljs.COMMENT(/\(/, /\)/),
    hljs.COMMENT(/;/, /$/),
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    hljs.C_NUMBER_MODE,

    // gcodes
    {
      scope: 'title.function',
      variants: [
        // G General functions: G0, G5.1, G5.2, …
        // M Misc functions: M0, M55.6, M199, …
        { match: regex.concat(LETTER_BOUNDARY_RE, GENERAL_MISC_FUNCTION_RE) },
        {
          begin: GENERAL_MISC_FUNCTION_RE,
          'on:begin': LETTER_BOUNDARY_CALLBACK
        },
        // T Tools
        { match: regex.concat(LETTER_BOUNDARY_RE, TOOLS_RE), },
        {
          begin: TOOLS_RE,
          'on:begin': LETTER_BOUNDARY_CALLBACK
        }
      ]
    },

    {
      scope: 'symbol',
      variants: [
        // O Subroutine ID: O100, O110, …
        { match: regex.concat(LETTER_BOUNDARY_RE, SUBROUTINE_RE) },
        {
          begin: SUBROUTINE_RE,
          'on:begin': LETTER_BOUNDARY_CALLBACK
        },
        // O Subroutine name: O<some>, …
        { match: regex.concat(LETTER_BOUNDARY_RE, SUBROUTINE_NAMED_RE) },
        {
          begin: SUBROUTINE_NAMED_RE,
          'on:begin': LETTER_BOUNDARY_CALLBACK
        },
        // Checksum at end of line: *71, *199, …
        { match: /\*\s*\d+\s*$/ }
      ]
    },

    {
      scope: 'operator', // N Line number: N1, N2, N1020, …
      match: /^N\s*\d+/
    },

    {
      scope: 'variable',
      match: /-?#\s*\d+/
    },

    {
      scope: 'property', // Physical axes,
      variants: [
        { match: regex.concat(LETTER_BOUNDARY_RE, AXES_RE, NUMBER_RE) },
        {
          begin: regex.concat(AXES_RE, NUMBER_RE),
          'on:begin': LETTER_BOUNDARY_CALLBACK
        },
      ]
    },

    {
      scope: 'params', // Different types of parameters
      variants: [
        { match: regex.concat(LETTER_BOUNDARY_RE, PARAMETERS_RE, NUMBER_RE) },
        {
          begin: regex.concat(PARAMETERS_RE, NUMBER_RE),
          'on:begin': LETTER_BOUNDARY_CALLBACK
        },
      ]
    },
  ];

  return {
    name: 'G-code (ISO 6983)',
    aliases: [ 'nc' ],
    // Some implementations (CNC controls) of G-code are interoperable with uppercase and lowercase letters seamlessly.
    // However, most prefer all uppercase and uppercase is customary.
    case_insensitive: true,
    // TODO: post v12 with the use of look-behind this can be enabled
    disableAutodetect: true,
    keywords: GCODE_KEYWORDS,
    contains: GCODE_CODE
  };
}

export { gcode as default };
