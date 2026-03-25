/*
Language: AutoHotkey
Author: Seongwon Lee <dlimpid@gmail.com>
Description: AutoHotkey language definition
Category: scripting
*/

/** @type LanguageFn */
function autohotkey(hljs) {
  const BACKTICK_ESCAPE = { begin: '`[\\s\\S]' };

  return {
    name: 'AutoHotkey',
    case_insensitive: true,
    aliases: [ 'ahk' ],
    keywords: {
      keyword: 'Break Continue Critical Exit ExitApp Gosub Goto New OnExit Pause return SetBatchLines SetTimer Suspend Thread Throw Until ahk_id ahk_class ahk_pid ahk_exe ahk_group',
      literal: 'true false NOT AND OR',
      built_in: 'ComSpec Clipboard ClipboardAll ErrorLevel'
    },
    contains: [
      BACKTICK_ESCAPE,
      hljs.inherit(hljs.QUOTE_STRING_MODE, { contains: [ BACKTICK_ESCAPE ] }),
      hljs.COMMENT(';', '$', { relevance: 0 }),
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'number',
        begin: hljs.NUMBER_RE,
        relevance: 0
      },
      {
        // subst would be the most accurate however fails the point of
        // highlighting. variable is comparably the most accurate that actually
        // has some effect
        className: 'variable',
        begin: '%[a-zA-Z0-9#_$@]+%'
      },
      {
        className: 'built_in',
        begin: '^\\s*\\w+\\s*(,|%)'
        // I don't really know if this is totally relevant
      },
      {
        // symbol would be most accurate however is highlighted just like
        // built_in and that makes up a lot of AutoHotkey code meaning that it
        // would fail to highlight anything
        className: 'title',
        variants: [
          { begin: '^[^\\n";]+::(?!=)' },
          {
            begin: '^[^\\n";]+:(?!=)',
            // zero relevance as it catches a lot of things
            // followed by a single ':' in many languages
            relevance: 0
          }
        ]
      },
      {
        className: 'meta',
        begin: '^\\s*#\\w+',
        end: '$',
        relevance: 0
      },
      {
        className: 'built_in',
        begin: 'A_[a-zA-Z0-9]+'
      },
      {
        // consecutive commas, not for highlighting but just for relevance
        begin: ',\\s*,' }
    ]
  };
}

export { autohotkey as default };
