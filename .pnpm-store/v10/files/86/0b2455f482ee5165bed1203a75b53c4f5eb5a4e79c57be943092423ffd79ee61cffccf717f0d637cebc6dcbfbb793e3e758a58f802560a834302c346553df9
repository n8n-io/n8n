/*
Language: NestedText
Description: NestedText is a file format for holding data that is to be entered, edited, or viewed by people.
Website: https://nestedtext.org/
Category: config
*/

/** @type LanguageFn */
function nestedtext(hljs) {
  const NESTED = {
    match: [
      /^\s*(?=\S)/, // have to look forward here to avoid polynomial backtracking
      /[^:]+/,
      /:\s*/,
      /$/
    ],
    className: {
      2: "attribute",
      3: "punctuation"
    }
  };
  const DICTIONARY_ITEM = {
    match: [
      /^\s*(?=\S)/, // have to look forward here to avoid polynomial backtracking
      /[^:]*[^: ]/,
      /[ ]*:/,
      /[ ]/,
      /.*$/
    ],
    className: {
      2: "attribute",
      3: "punctuation",
      5: "string"
    }
  };
  const STRING = {
    match: [
      /^\s*/,
      />/,
      /[ ]/,
      /.*$/
    ],
    className: {
      2: "punctuation",
      4: "string"
    }
  };
  const LIST_ITEM = {
    variants: [
      { match: [
        /^\s*/,
        /-/,
        /[ ]/,
        /.*$/
      ] },
      { match: [
        /^\s*/,
        /-$/
      ] }
    ],
    className: {
      2: "bullet",
      4: "string"
    }
  };

  return {
    name: 'Nested Text',
    aliases: [ 'nt' ],
    contains: [
      hljs.inherit(hljs.HASH_COMMENT_MODE, {
        begin: /^\s*(?=#)/,
        excludeBegin: true
      }),
      LIST_ITEM,
      STRING,
      NESTED,
      DICTIONARY_ITEM
    ]
  };
}

module.exports = nestedtext;
