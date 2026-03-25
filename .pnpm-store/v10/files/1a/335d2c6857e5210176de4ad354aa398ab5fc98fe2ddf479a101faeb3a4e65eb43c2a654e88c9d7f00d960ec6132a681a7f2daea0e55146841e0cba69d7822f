'use strict'
const assignWith = require('lodash/assignWith')
const mapValues = require('lodash/mapValues')
const over = require('lodash/over')

function combineVisitorObjects(...objects) {
    const accumForAllVisitors = assignWith({}, ...objects, (objValue, sourceValue) => (objValue || []).concat(sourceValue))
    return mapValues(accumForAllVisitors, over)
}

module.exports = {
    combineVisitorObjects
}