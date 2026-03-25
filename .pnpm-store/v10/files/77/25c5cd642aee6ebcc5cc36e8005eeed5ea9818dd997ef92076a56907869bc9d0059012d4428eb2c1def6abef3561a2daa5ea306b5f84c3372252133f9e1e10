/*
Language: Caché Object Script
Author: Nikita Savchenko <zitros.lab@gmail.com>
Category: enterprise, scripting
Website: https://cedocs.intersystems.com/latest/csp/docbook/DocBook.UI.Page.cls
*/

/** @type LanguageFn */
function cos(hljs) {
  const STRINGS = {
    className: 'string',
    variants: [
      {
        begin: '"',
        end: '"',
        contains: [
          { // escaped
            begin: "\"\"",
            relevance: 0
          }
        ]
      }
    ]
  };

  const NUMBERS = {
    className: "number",
    begin: "\\b(\\d+(\\.\\d*)?|\\.\\d+)",
    relevance: 0
  };

  const COS_KEYWORDS =
    'property parameter class classmethod clientmethod extends as break '
    + 'catch close continue do d|0 else elseif for goto halt hang h|0 if job '
    + 'j|0 kill k|0 lock l|0 merge new open quit q|0 read r|0 return set s|0 '
    + 'tcommit throw trollback try tstart use view while write w|0 xecute x|0 '
    + 'zkill znspace zn ztrap zwrite zw zzdump zzwrite print zbreak zinsert '
    + 'zload zprint zremove zsave zzprint mv mvcall mvcrt mvdim mvprint zquit '
    + 'zsync ascii';

  // registered function - no need in them due to all functions are highlighted,
  // but I'll just leave this here.

  // "$bit", "$bitcount",
  // "$bitfind", "$bitlogic", "$case", "$char", "$classmethod", "$classname",
  // "$compile", "$data", "$decimal", "$double", "$extract", "$factor",
  // "$find", "$fnumber", "$get", "$increment", "$inumber", "$isobject",
  // "$isvaliddouble", "$isvalidnum", "$justify", "$length", "$list",
  // "$listbuild", "$listdata", "$listfind", "$listfromstring", "$listget",
  // "$listlength", "$listnext", "$listsame", "$listtostring", "$listvalid",
  // "$locate", "$match", "$method", "$name", "$nconvert", "$next",
  // "$normalize", "$now", "$number", "$order", "$parameter", "$piece",
  // "$prefetchoff", "$prefetchon", "$property", "$qlength", "$qsubscript",
  // "$query", "$random", "$replace", "$reverse", "$sconvert", "$select",
  // "$sortbegin", "$sortend", "$stack", "$text", "$translate", "$view",
  // "$wascii", "$wchar", "$wextract", "$wfind", "$wiswide", "$wlength",
  // "$wreverse", "$xecute", "$zabs", "$zarccos", "$zarcsin", "$zarctan",
  // "$zcos", "$zcot", "$zcsc", "$zdate", "$zdateh", "$zdatetime",
  // "$zdatetimeh", "$zexp", "$zhex", "$zln", "$zlog", "$zpower", "$zsec",
  // "$zsin", "$zsqr", "$ztan", "$ztime", "$ztimeh", "$zboolean",
  // "$zconvert", "$zcrc", "$zcyc", "$zdascii", "$zdchar", "$zf",
  // "$ziswide", "$zlascii", "$zlchar", "$zname", "$zposition", "$zqascii",
  // "$zqchar", "$zsearch", "$zseek", "$zstrip", "$zwascii", "$zwchar",
  // "$zwidth", "$zwpack", "$zwbpack", "$zwunpack", "$zwbunpack", "$zzenkaku",
  // "$change", "$mv", "$mvat", "$mvfmt", "$mvfmts", "$mviconv",
  // "$mviconvs", "$mvinmat", "$mvlover", "$mvoconv", "$mvoconvs", "$mvraise",
  // "$mvtrans", "$mvv", "$mvname", "$zbitand", "$zbitcount", "$zbitfind",
  // "$zbitget", "$zbitlen", "$zbitnot", "$zbitor", "$zbitset", "$zbitstr",
  // "$zbitxor", "$zincrement", "$znext", "$zorder", "$zprevious", "$zsort",
  // "device", "$ecode", "$estack", "$etrap", "$halt", "$horolog",
  // "$io", "$job", "$key", "$namespace", "$principal", "$quit", "$roles",
  // "$storage", "$system", "$test", "$this", "$tlevel", "$username",
  // "$x", "$y", "$za", "$zb", "$zchild", "$zeof", "$zeos", "$zerror",
  // "$zhorolog", "$zio", "$zjob", "$zmode", "$znspace", "$zparent", "$zpi",
  // "$zpos", "$zreference", "$zstorage", "$ztimestamp", "$ztimezone",
  // "$ztrap", "$zversion"

  return {
    name: 'Caché Object Script',
    case_insensitive: true,
    aliases: [ "cls" ],
    keywords: COS_KEYWORDS,
    contains: [
      NUMBERS,
      STRINGS,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: "comment",
        begin: /;/,
        end: "$",
        relevance: 0
      },
      { // Functions and user-defined functions: write $ztime(60*60*3), $$myFunc(10), $$^Val(1)
        className: "built_in",
        begin: /(?:\$\$?|\.\.)\^?[a-zA-Z]+/
      },
      { // Macro command: quit $$$OK
        className: "built_in",
        begin: /\$\$\$[a-zA-Z]+/
      },
      { // Special (global) variables: write %request.Content; Built-in classes: %Library.Integer
        className: "built_in",
        begin: /%[a-z]+(?:\.[a-z]+)*/
      },
      { // Global variable: set ^globalName = 12 write ^globalName
        className: "symbol",
        begin: /\^%?[a-zA-Z][\w]*/
      },
      { // Some control constructions: do ##class(Package.ClassName).Method(), ##super()
        className: "keyword",
        begin: /##class|##super|#define|#dim/
      },
      // sub-languages: are not fully supported by hljs by 11/15/2015
      // left for the future implementation.
      {
        begin: /&sql\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        subLanguage: "sql"
      },
      {
        begin: /&(js|jscript|javascript)</,
        end: />/,
        excludeBegin: true,
        excludeEnd: true,
        subLanguage: "javascript"
      },
      {
        // this brakes first and last tag, but this is the only way to embed a valid html
        begin: /&html<\s*</,
        end: />\s*>/,
        subLanguage: "xml"
      }
    ]
  };
}

module.exports = cos;
