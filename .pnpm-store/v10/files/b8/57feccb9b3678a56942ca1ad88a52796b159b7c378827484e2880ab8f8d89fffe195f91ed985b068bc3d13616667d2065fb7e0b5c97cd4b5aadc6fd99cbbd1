'use strict';

var Validator = module.exports.Validator = require('./validator');

module.exports.ValidatorResult = require('./helpers').ValidatorResult;
module.exports.ValidatorResultError = require('./helpers').ValidatorResultError;
module.exports.ValidationError = require('./helpers').ValidationError;
module.exports.SchemaError = require('./helpers').SchemaError;
module.exports.SchemaScanResult = require('./scan').SchemaScanResult;
module.exports.scan = require('./scan').scan;

module.exports.validate = function (instance, schema, options) {
  var v = new Validator();
  return v.validate(instance, schema, options);
};
