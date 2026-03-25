/*
Language: TP
Author: Jay Strybis <jay.strybis@gmail.com>
Description: FANUC TP programming language (TPP).
Category: hardware
*/

function tp(hljs) {
  const TPID = {
    className: 'number',
    begin: '[1-9][0-9]*', /* no leading zeros */
    relevance: 0
  };
  const TPLABEL = {
    className: 'symbol',
    begin: ':[^\\]]+'
  };
  const TPDATA = {
    className: 'built_in',
    begin: '(AR|P|PAYLOAD|PR|R|SR|RSR|LBL|VR|UALM|MESSAGE|UTOOL|UFRAME|TIMER|'
    + 'TIMER_OVERFLOW|JOINT_MAX_SPEED|RESUME_PROG|DIAG_REC)\\[',
    end: '\\]',
    contains: [
      'self',
      TPID,
      TPLABEL
    ]
  };
  const TPIO = {
    className: 'built_in',
    begin: '(AI|AO|DI|DO|F|RI|RO|UI|UO|GI|GO|SI|SO)\\[',
    end: '\\]',
    contains: [
      'self',
      TPID,
      hljs.QUOTE_STRING_MODE, /* for pos section at bottom */
      TPLABEL
    ]
  };

  const KEYWORDS = [
    "ABORT",
    "ACC",
    "ADJUST",
    "AND",
    "AP_LD",
    "BREAK",
    "CALL",
    "CNT",
    "COL",
    "CONDITION",
    "CONFIG",
    "DA",
    "DB",
    "DIV",
    "DETECT",
    "ELSE",
    "END",
    "ENDFOR",
    "ERR_NUM",
    "ERROR_PROG",
    "FINE",
    "FOR",
    "GP",
    "GUARD",
    "INC",
    "IF",
    "JMP",
    "LINEAR_MAX_SPEED",
    "LOCK",
    "MOD",
    "MONITOR",
    "OFFSET",
    "Offset",
    "OR",
    "OVERRIDE",
    "PAUSE",
    "PREG",
    "PTH",
    "RT_LD",
    "RUN",
    "SELECT",
    "SKIP",
    "Skip",
    "TA",
    "TB",
    "TO",
    "TOOL_OFFSET",
    "Tool_Offset",
    "UF",
    "UT",
    "UFRAME_NUM",
    "UTOOL_NUM",
    "UNLOCK",
    "WAIT",
    "X",
    "Y",
    "Z",
    "W",
    "P",
    "R",
    "STRLEN",
    "SUBSTR",
    "FINDSTR",
    "VOFFSET",
    "PROG",
    "ATTR",
    "MN",
    "POS"
  ];
  const LITERALS = [
    "ON",
    "OFF",
    "max_speed",
    "LPOS",
    "JPOS",
    "ENABLE",
    "DISABLE",
    "START",
    "STOP",
    "RESET"
  ];

  return {
    name: 'TP',
    keywords: {
      keyword: KEYWORDS,
      literal: LITERALS
    },
    contains: [
      TPDATA,
      TPIO,
      {
        className: 'keyword',
        begin: '/(PROG|ATTR|MN|POS|END)\\b'
      },
      {
        /* this is for cases like ,CALL */
        className: 'keyword',
        begin: '(CALL|RUN|POINT_LOGIC|LBL)\\b'
      },
      {
        /* this is for cases like CNT100 where the default lexemes do not
         * separate the keyword and the number */
        className: 'keyword',
        begin: '\\b(ACC|CNT|Skip|Offset|PSPD|RT_LD|AP_LD|Tool_Offset)'
      },
      {
        /* to catch numbers that do not have a word boundary on the left */
        className: 'number',
        begin: '\\d+(sec|msec|mm/sec|cm/min|inch/min|deg/sec|mm|in|cm)?\\b',
        relevance: 0
      },
      hljs.COMMENT('//', '[;$]'),
      hljs.COMMENT('!', '[;$]'),
      hljs.COMMENT('--eg:', '$'),
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'',
        end: '\''
      },
      hljs.C_NUMBER_MODE,
      {
        className: 'variable',
        begin: '\\$[A-Za-z0-9_]+'
      }
    ]
  };
}

export { tp as default };
