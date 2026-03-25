/* jshint browserify: true */

'use strict';

/**
 * Optional entry point for browser builds.
 *
 * To use it: `require('avsc/etc/browser/avsc-services')`.
 */

var avroTypes = require('./avsc-types'),
    services = require('../../lib/services'),
    specs = require('../../lib/specs'),
    utils = require('../../lib/utils');


/** Slightly enhanced parsing, supporting IDL declarations. */
function parse(any, opts) {
  var schemaOrProtocol = specs.read(any);
  return schemaOrProtocol.protocol ?
    services.Service.forProtocol(schemaOrProtocol, opts) :
    avroTypes.Type.forSchema(schemaOrProtocol, opts);
}


module.exports = {
  Service: services.Service,
  assembleProtocol: specs.assembleProtocol,
  discoverProtocol: services.discoverProtocol,
  parse: parse,
  readProtocol: specs.readProtocol,
  readSchema: specs.readSchema,
};

utils.copyOwnProperties(avroTypes, module.exports);
