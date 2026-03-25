var compare = require('spdx-compare')
var parse = require('spdx-expression-parse')
var ranges = require('spdx-ranges')

var rangesAreCompatible = function (first, second) {
  return (
    first.license === second.license ||
    ranges.some(function (range) {
      return (
        licenseInRange(first.license, range) &&
        licenseInRange(second.license, range)
      )
    })
  )
}

function licenseInRange (license, range) {
  return (
    range.indexOf(license) !== -1 ||
    range.some(function (element) {
      return (
        Array.isArray(element) &&
        element.indexOf(license) !== -1
      )
    })
  )
}

var identifierInRange = function (identifier, range) {
  return (
    identifier.license === range.license ||
    compare.gt(identifier.license, range.license) ||
    compare.eq(identifier.license, range.license)
  )
}

var licensesAreCompatible = function (first, second) {
  if (first.exception !== second.exception) {
    return false
  } else if (second.hasOwnProperty('license')) {
    if (second.hasOwnProperty('plus')) {
      if (first.hasOwnProperty('plus')) {
        // first+, second+
        return rangesAreCompatible(first, second)
      } else {
        // first, second+
        return identifierInRange(first, second)
      }
    } else {
      if (first.hasOwnProperty('plus')) {
        // first+, second
        return identifierInRange(second, first)
      } else {
        // first, second
        return first.license === second.license
      }
    }
  }
}

var recurseLeftAndRight = function (first, second) {
  var firstConjunction = first.conjunction
  var secondConjunction = second.conjunction

  if (firstConjunction === 'and' && secondConjunction === 'and') {
    return (
      (recurse(first.left, second.left) && recurse(first.right, second.right)) ||
      (recurse(first.left, second.right) && recurse(first.right, second.left))
    )
  } else if (firstConjunction === 'and') {
    return (
      recurse(first.left, second) &&
      recurse(first.right, second)
    )
  } else if (firstConjunction === 'or') {
    return (
      recurse(first.left, second) ||
      recurse(first.right, second)
    )
  }
}

var recurse = function (first, second) {
  if (first.hasOwnProperty('conjunction')) {
    return recurseLeftAndRight(first, second)
  } else if (second.hasOwnProperty('conjunction')) {
    return recurseLeftAndRight(second, first)
  } else {
    return licensesAreCompatible(first, second)
  }
}

function normalizeGPLIdentifiers (argument) {
  var license = argument.license
  if (license) {
    if (endsWith(license, '-or-later')) {
      argument.license = license.replace('-or-later', '')
      argument.plus = true
    } else if (endsWith(license, '-only')) {
      argument.license = license.replace('-or-later', '')
      delete argument.plus
    }
  } else {
    argument.left = normalizeGPLIdentifiers(argument.left)
    argument.right = normalizeGPLIdentifiers(argument.right)
  }
  return argument
}

function endsWith (string, substring) {
  return string.indexOf(substring) === string.length - 1
}

module.exports = function (first, second) {
  return recurse(
    normalizeGPLIdentifiers(parse(first)),
    normalizeGPLIdentifiers(parse(second))
  )
}
