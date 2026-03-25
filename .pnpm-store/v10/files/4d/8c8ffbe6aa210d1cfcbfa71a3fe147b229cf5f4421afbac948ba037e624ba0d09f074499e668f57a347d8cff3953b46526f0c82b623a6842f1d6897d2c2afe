/*
Language: Diff
Description: Unified and context diff
Author: Vasily Polovnyov <vast@whiteants.net>
Website: https://www.gnu.org/software/diffutils/
Category: common
*/

/** @type LanguageFn */
function diff(hljs) {
  const regex = hljs.regex;
  return {
    name: 'Diff',
    aliases: [ 'patch' ],
    contains: [
      {
        className: 'meta',
        relevance: 10,
        match: regex.either(
          /^@@ +-\d+,\d+ +\+\d+,\d+ +@@/,
          /^\*\*\* +\d+,\d+ +\*\*\*\*$/,
          /^--- +\d+,\d+ +----$/
        )
      },
      {
        className: 'comment',
        variants: [
          {
            begin: regex.either(
              /Index: /,
              /^index/,
              /={3,}/,
              /^-{3}/,
              /^\*{3} /,
              /^\+{3}/,
              /^diff --git/
            ),
            end: /$/
          },
          { match: /^\*{15}$/ }
        ]
      },
      {
        className: 'addition',
        begin: /^\+/,
        end: /$/
      },
      {
        className: 'deletion',
        begin: /^-/,
        end: /$/
      },
      {
        className: 'addition',
        begin: /^!/,
        end: /$/
      }
    ]
  };
}

module.exports = diff;
