var arrayFindIndex = require('array-find-index')
var parse = require('spdx-expression-parse')

var ranges = require('spdx-ranges')

var notALicenseIdentifier = ' is not a simple license identifier'

var rangeComparison = function (comparison) {
  return function (first, second) {
    var firstAST = parse(first)
    if (!firstAST.hasOwnProperty('license')) {
      throw new Error('"' + first + '"' + notALicenseIdentifier)
    }
    var secondAST = parse(second)
    if (!secondAST.hasOwnProperty('license')) {
      throw new Error('"' + second + '"' + notALicenseIdentifier)
    }
    return ranges.some(function (range) {
      var firstLicense = firstAST.license
      var indexOfFirst = arrayFindIndex(range, function (element) {
        return (
          element === firstLicense ||
          (
            Array.isArray(element) &&
            element.indexOf(firstLicense) !== -1
          )
        )
      })
      if (indexOfFirst < 0) {
        return false
      }
      var secondLicense = secondAST.license
      var indexOfSecond = arrayFindIndex(range, function (element) {
        return (
          element === secondLicense ||
          (
            Array.isArray(element) &&
            element.indexOf(secondLicense) !== -1
          )
        )
      })
      if (indexOfSecond < 0) {
        return false
      }
      return comparison(indexOfFirst, indexOfSecond)
    })
  }
}

exports.gt = rangeComparison(function (first, second) {
  return first > second
})

exports.lt = rangeComparison(function (first, second) {
  return first < second
})

exports.eq = rangeComparison(function (first, second) {
  return first === second
})
