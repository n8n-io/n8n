'use strict'

module.exports = function getLimit (limits, name, defaultLimit) {
  if (
    !limits ||
    limits[name] === undefined ||
    limits[name] === null
  ) { return defaultLimit }

  if (
    typeof limits[name] !== 'number' ||
    isNaN(limits[name])
  ) { throw new TypeError('Limit ' + name + ' is not a valid number') }

  return limits[name]
}
