/*
Language: VBScript
Description: VBScript ("Microsoft Visual Basic Scripting Edition") is an Active Scripting language developed by Microsoft that is modeled on Visual Basic.
Author: Nikita Ledyaev <lenikita@yandex.ru>
Contributors: Michal Gabrukiewicz <mgabru@gmail.com>
Website: https://en.wikipedia.org/wiki/VBScript
Category: scripting
*/

/** @type LanguageFn */
function vbscript(hljs) {
  const regex = hljs.regex;
  const BUILT_IN_FUNCTIONS = [
    "lcase",
    "month",
    "vartype",
    "instrrev",
    "ubound",
    "setlocale",
    "getobject",
    "rgb",
    "getref",
    "string",
    "weekdayname",
    "rnd",
    "dateadd",
    "monthname",
    "now",
    "day",
    "minute",
    "isarray",
    "cbool",
    "round",
    "formatcurrency",
    "conversions",
    "csng",
    "timevalue",
    "second",
    "year",
    "space",
    "abs",
    "clng",
    "timeserial",
    "fixs",
    "len",
    "asc",
    "isempty",
    "maths",
    "dateserial",
    "atn",
    "timer",
    "isobject",
    "filter",
    "weekday",
    "datevalue",
    "ccur",
    "isdate",
    "instr",
    "datediff",
    "formatdatetime",
    "replace",
    "isnull",
    "right",
    "sgn",
    "array",
    "snumeric",
    "log",
    "cdbl",
    "hex",
    "chr",
    "lbound",
    "msgbox",
    "ucase",
    "getlocale",
    "cos",
    "cdate",
    "cbyte",
    "rtrim",
    "join",
    "hour",
    "oct",
    "typename",
    "trim",
    "strcomp",
    "int",
    "createobject",
    "loadpicture",
    "tan",
    "formatnumber",
    "mid",
    "split",
    "cint",
    "sin",
    "datepart",
    "ltrim",
    "sqr",
    "time",
    "derived",
    "eval",
    "date",
    "formatpercent",
    "exp",
    "inputbox",
    "left",
    "ascw",
    "chrw",
    "regexp",
    "cstr",
    "err"
  ];
  const BUILT_IN_OBJECTS = [
    "server",
    "response",
    "request",
    // take no arguments so can be called without ()
    "scriptengine",
    "scriptenginebuildversion",
    "scriptengineminorversion",
    "scriptenginemajorversion"
  ];

  const BUILT_IN_CALL = {
    begin: regex.concat(regex.either(...BUILT_IN_FUNCTIONS), "\\s*\\("),
    // relevance 0 because this is acting as a beginKeywords really
    relevance: 0,
    keywords: { built_in: BUILT_IN_FUNCTIONS }
  };

  const LITERALS = [
    "true",
    "false",
    "null",
    "nothing",
    "empty"
  ];

  const KEYWORDS = [
    "call",
    "class",
    "const",
    "dim",
    "do",
    "loop",
    "erase",
    "execute",
    "executeglobal",
    "exit",
    "for",
    "each",
    "next",
    "function",
    "if",
    "then",
    "else",
    "on",
    "error",
    "option",
    "explicit",
    "new",
    "private",
    "property",
    "let",
    "get",
    "public",
    "randomize",
    "redim",
    "rem",
    "select",
    "case",
    "set",
    "stop",
    "sub",
    "while",
    "wend",
    "with",
    "end",
    "to",
    "elseif",
    "is",
    "or",
    "xor",
    "and",
    "not",
    "class_initialize",
    "class_terminate",
    "default",
    "preserve",
    "in",
    "me",
    "byval",
    "byref",
    "step",
    "resume",
    "goto"
  ];

  return {
    name: 'VBScript',
    aliases: [ 'vbs' ],
    case_insensitive: true,
    keywords: {
      keyword: KEYWORDS,
      built_in: BUILT_IN_OBJECTS,
      literal: LITERALS
    },
    illegal: '//',
    contains: [
      BUILT_IN_CALL,
      hljs.inherit(hljs.QUOTE_STRING_MODE, { contains: [ { begin: '""' } ] }),
      hljs.COMMENT(
        /'/,
        /$/,
        { relevance: 0 }
      ),
      hljs.C_NUMBER_MODE
    ]
  };
}

module.exports = vbscript;
