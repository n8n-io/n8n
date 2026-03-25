var mergeIntoShorthands = require('./merge-into-shorthands');
var overrideProperties = require('./override-properties');
var populateComponents = require('./populate-components');

var restoreWithComponents = require('../restore-with-components');

var wrapForOptimizing = require('../../wrap-for-optimizing').all;
var removeUnused = require('../../remove-unused');
var restoreFromOptimizing = require('../../restore-from-optimizing');

var OptimizationLevel = require('../../../options/optimization-level').OptimizationLevel;

function optimizeProperties(properties, withOverriding, withMerging, context) {
  var levelOptions = context.options.level[OptimizationLevel.Two];
  var _properties = wrapForOptimizing(properties, false, levelOptions.skipProperties);
  var _property;
  var i, l;

  populateComponents(_properties, context.validator, context.warnings);

  for (i = 0, l = _properties.length; i < l; i++) {
    _property = _properties[i];
    if (_property.block) {
      optimizeProperties(_property.value[0][1], withOverriding, withMerging, context);
    }
  }

  if (withMerging && levelOptions.mergeIntoShorthands) {
    mergeIntoShorthands(_properties, context.validator);
  }

  if (withOverriding && levelOptions.overrideProperties) {
    overrideProperties(_properties, withMerging, context.options.compatibility, context.validator);
  }

  restoreFromOptimizing(_properties, restoreWithComponents);
  removeUnused(_properties);
}

module.exports = optimizeProperties;
