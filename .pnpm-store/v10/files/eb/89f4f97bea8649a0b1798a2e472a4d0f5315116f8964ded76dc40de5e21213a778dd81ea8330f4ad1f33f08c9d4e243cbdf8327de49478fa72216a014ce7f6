/*
Language: Oxygene
Author: Carlo Kok <ck@remobjects.com>
Description: Oxygene is built on the foundation of Object Pascal, revamped and extended to be a modern language for the twenty-first century.
Website: https://www.elementscompiler.com/elements/default.aspx
Category: build-system
*/

function oxygene(hljs) {
  const OXYGENE_KEYWORDS = {
    $pattern: /\.?\w+/,
    keyword:
      'abstract add and array as asc aspect assembly async begin break block by case class concat const copy constructor continue '
      + 'create default delegate desc distinct div do downto dynamic each else empty end ensure enum equals event except exit extension external false '
      + 'final finalize finalizer finally flags for forward from function future global group has if implementation implements implies in index inherited '
      + 'inline interface into invariants is iterator join locked locking loop matching method mod module namespace nested new nil not notify nullable of '
      + 'old on operator or order out override parallel params partial pinned private procedure property protected public queryable raise read readonly '
      + 'record reintroduce remove repeat require result reverse sealed select self sequence set shl shr skip static step soft take then to true try tuple '
      + 'type union unit unsafe until uses using var virtual raises volatile where while with write xor yield await mapped deprecated stdcall cdecl pascal '
      + 'register safecall overload library platform reference packed strict published autoreleasepool selector strong weak unretained'
  };
  const CURLY_COMMENT = hljs.COMMENT(
    /\{/,
    /\}/,
    { relevance: 0 }
  );
  const PAREN_COMMENT = hljs.COMMENT(
    '\\(\\*',
    '\\*\\)',
    { relevance: 10 }
  );
  const STRING = {
    className: 'string',
    begin: '\'',
    end: '\'',
    contains: [ { begin: '\'\'' } ]
  };
  const CHAR_STRING = {
    className: 'string',
    begin: '(#\\d+)+'
  };
  const FUNCTION = {
    beginKeywords: 'function constructor destructor procedure method',
    end: '[:;]',
    keywords: 'function constructor|10 destructor|10 procedure|10 method|10',
    contains: [
      hljs.inherit(hljs.TITLE_MODE, { scope: "title.function" }),
      {
        className: 'params',
        begin: '\\(',
        end: '\\)',
        keywords: OXYGENE_KEYWORDS,
        contains: [
          STRING,
          CHAR_STRING
        ]
      },
      CURLY_COMMENT,
      PAREN_COMMENT
    ]
  };

  const SEMICOLON = {
    scope: "punctuation",
    match: /;/,
    relevance: 0
  };

  return {
    name: 'Oxygene',
    case_insensitive: true,
    keywords: OXYGENE_KEYWORDS,
    illegal: '("|\\$[G-Zg-z]|\\/\\*|</|=>|->)',
    contains: [
      CURLY_COMMENT,
      PAREN_COMMENT,
      hljs.C_LINE_COMMENT_MODE,
      STRING,
      CHAR_STRING,
      hljs.NUMBER_MODE,
      FUNCTION,
      SEMICOLON
    ]
  };
}

module.exports = oxygene;
