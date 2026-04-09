'use strict'

const parse = require('ret')
const { types } = require('ret')

/**
 * @param {*} node
 * @param {object} opts
 * @param {number} opts.reps - The number of repetitions encountered
 * @param {number} opts.limit - The maximum number of repetitions allowed
 * @param {number} starHeight - The current height of the star in the regex tree
 * @returns {boolean}
 */
function walk (node, opts, starHeight) {
  let i
  let ok
  let len

  if (node.type === types.REPETITION) {
    starHeight++
    opts.reps++
    if (starHeight > 1) return false
    if (opts.reps > opts.limit) return false
  }

  if (node.options) {
    for (i = 0, len = node.options.length; i < len; i++) {
      ok = walk({ stack: node.options[i] }, opts, starHeight)
      if (!ok) return false
    }
  }
  const stack = node.stack || node.value?.stack
  if (!stack) return true

  for (i = 0, len = stack.length; i < len; i++) {
    ok = walk(stack[i], opts, starHeight)
    if (!ok) return false
  }

  return true
}

/**
 * @param {string|RegExp} re - The regular expression to check, can be a string or RegExp object
 * @param {object} [options]
 * @param {number} [options.limit=25] - The maximum number of repetitions allowed
 * @returns {boolean} - Returns true if the regex is safe, false if it is unsafe or invalid
 */
function safeRegex (re, options) {
  const opts = {
    reps: 0,
    limit: options?.limit ?? 25
  }

  if (isRegExp(re)) re = re.source
  else if (typeof re !== 'string') re = String(re)

  try {
    return walk(parse(re), opts, 0)
  } catch {
    return false
  }
}

/**
 * @param {*} x
 * @returns {x is RegExp}
 */
function isRegExp (x) {
  return Object.prototype.toString.call(x) === '[object RegExp]'
}

module.exports = safeRegex
module.exports.default = safeRegex
module.exports.safeRegex = safeRegex
