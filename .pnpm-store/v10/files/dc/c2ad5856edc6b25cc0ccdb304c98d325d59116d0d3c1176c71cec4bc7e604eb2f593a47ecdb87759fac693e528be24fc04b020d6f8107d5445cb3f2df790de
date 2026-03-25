// @flow

// based on https://github.com/styled-components/styled-components/blob/fcf6f3804c57a14dd7984dfab7bc06ee2edca044/src/utils/error.js

declare var preval: Function

/**
 * Parse errors.md and turn it into a simple hash of code: message
 * @private
 */
const ERRORS = preval`
  const fs = require('fs');
  const md = fs.readFileSync(__dirname + '/errors.md', 'utf8');
  module.exports = md.split(/^#/gm).slice(1).reduce((errors, str) => {
    const [, code, message] = str.split(/^.*?(\\d+)\\s*\\n/)
    errors[code] = message
    return errors;
  }, {});
`

/**
 * super basic version of sprintf
 * @private
 */
function format(...args) {
  let a = args[0]
  const b = []
  let c

  for (c = 1; c < args.length; c += 1) {
    b.push(args[c])
  }

  b.forEach(d => {
    a = a.replace(/%[a-z]/, d)
  })

  return a
}

/**
 * Create an error file out of errors.md for development and a simple web link to the full errors
 * in production mode.
 * @private
 */
export default class PolishedError extends Error {
  constructor(code: string | number, ...args: Array<any>) {
    if (process.env.NODE_ENV === 'production') {
      super(
        `An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#${code} for more information.`,
      )
    } else {
      super(format(ERRORS[code], ...args))
    }
  }
}
