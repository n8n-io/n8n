/*
Language: FIX
Author: Brent Bradbury <brent@brentium.com>
*/

/** @type LanguageFn */
function fix(hljs) {
  return {
    name: 'FIX',
    contains: [
      {
        begin: /[^\u2401\u0001]+/,
        end: /[\u2401\u0001]/,
        excludeEnd: true,
        returnBegin: true,
        returnEnd: false,
        contains: [
          {
            begin: /([^\u2401\u0001=]+)/,
            end: /=([^\u2401\u0001=]+)/,
            returnEnd: true,
            returnBegin: false,
            className: 'attr'
          },
          {
            begin: /=/,
            end: /([\u2401\u0001])/,
            excludeEnd: true,
            excludeBegin: true,
            className: 'string'
          }
        ]
      }
    ],
    case_insensitive: true
  };
}

module.exports = fix;
