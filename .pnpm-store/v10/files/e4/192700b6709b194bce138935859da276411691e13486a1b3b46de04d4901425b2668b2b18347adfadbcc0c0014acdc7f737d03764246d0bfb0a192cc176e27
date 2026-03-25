/* jshint node: true */

'use strict';

/**
 * Node.js entry point (see `etc/browser/` for browserify's entry points).
 *
 * It also adds Node.js specific functionality (for example a few convenience
 * functions to read Avro files from the local filesystem).
 */

var containers = require('./containers'),
    services = require('./services'),
    specs = require('./specs'),
    types = require('./types'),
    utils = require('./utils'),
    buffer = require('buffer'),
    fs = require('fs'),
    util = require('util');


var Buffer = buffer.Buffer;

/** Parse a schema and return the corresponding type or service. */
function parse(any, opts) {
  var schemaOrProtocol = specs.read(any);
  return schemaOrProtocol.protocol ?
    services.Service.forProtocol(schemaOrProtocol, opts) :
    types.Type.forSchema(schemaOrProtocol, opts);
}

/** Extract a container file's header synchronously. */
function extractFileHeader(path, opts) {
  opts = opts || {};

  var decode = opts.decode === undefined ? true : !!opts.decode;
  var size = Math.max(opts.size || 4096, 4);
  var buf = utils.newBuffer(size);
  var fd = fs.openSync(path, 'r');

  try {
    var pos = fs.readSync(fd, buf, 0, size);
    if (pos < 4 || !containers.MAGIC_BYTES.equals(buf.slice(0, 4))) {
      return null;
    }

    var tap = new utils.Tap(buf);
    var header = null;
    do {
      header = containers.HEADER_TYPE._read(tap);
    } while (!isValid());
    if (decode !== false) {
      var meta = header.meta;
      meta['avro.schema'] = JSON.parse(meta['avro.schema'].toString());
      if (meta['avro.codec'] !== undefined) {
        meta['avro.codec'] = meta['avro.codec'].toString();
      }
    }
    return header;
  } finally {
    fs.closeSync(fd);
  }

  function isValid() {
    if (tap.isValid()) {
      return true;
    }
    var len = 2 * tap.buf.length;
    var buf = utils.newBuffer(len);
    len = fs.readSync(fd, buf, 0, len);
    tap.buf = Buffer.concat([tap.buf, buf]);
    tap.pos = 0;
    return false;
  }
}

/** Readable stream of records from a local Avro file. */
function createFileDecoder(path, opts) {
  return fs.createReadStream(path)
    .pipe(new containers.streams.BlockDecoder(opts));
}

/** Writable stream of records to a local Avro file. */
function createFileEncoder(path, schema, opts) {
  var encoder = new containers.streams.BlockEncoder(schema, opts);
  encoder.pipe(fs.createWriteStream(path, {defaultEncoding: 'binary'}));
  return encoder;
}


module.exports = {
  Service: services.Service,
  Type: types.Type,
  assembleProtocol: specs.assembleProtocol,
  createFileDecoder: createFileDecoder,
  createFileEncoder: createFileEncoder,
  discoverProtocol: services.discoverProtocol,
  extractFileHeader: extractFileHeader,
  parse: parse,
  readProtocol: specs.readProtocol,
  readSchema: specs.readSchema,
  streams: containers.streams,
  types: types.builtins,
  // Deprecated exports.
  Protocol: services.Service,
  assemble: util.deprecate(
    specs.assembleProtocol,
    'use `assembleProtocol` instead'
  ),
  combine: util.deprecate(
    types.Type.forTypes,
    'use `Type.forTypes` intead'
  ),
  infer: util.deprecate(
    types.Type.forValue,
    'use `Type.forValue` instead'
  )
};
