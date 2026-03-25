/*
Language: Tagger Script
Author: Philipp Wolfer <ph.wolfer@gmail.com>
Description: Syntax Highlighting for the Tagger Script as used by MusicBrainz Picard.
Website: https://picard.musicbrainz.org
 */
function taggerscript(hljs) {
  const NOOP = {
    className: 'comment',
    begin: /\$noop\(/,
    end: /\)/,
    contains: [
      { begin: /\\[()]/ },
      {
        begin: /\(/,
        end: /\)/,
        contains: [
          { begin: /\\[()]/ },
          'self'
        ]
      }
    ],
    relevance: 10
  };

  const FUNCTION = {
    className: 'keyword',
    begin: /\$[_a-zA-Z0-9]+(?=\()/
  };

  const VARIABLE = {
    className: 'variable',
    begin: /%[_a-zA-Z0-9:]+%/
  };

  const ESCAPE_SEQUENCE_UNICODE = {
    className: 'symbol',
    begin: /\\u[a-fA-F0-9]{4}/
  };

  const ESCAPE_SEQUENCE = {
    className: 'symbol',
    begin: /\\[\\nt$%,()]/
  };

  return {
    name: 'Tagger Script',
    contains: [
      NOOP,
      FUNCTION,
      VARIABLE,
      ESCAPE_SEQUENCE,
      ESCAPE_SEQUENCE_UNICODE
    ]
  };
}

export { taggerscript as default };
