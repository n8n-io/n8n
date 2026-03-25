/**
 * node-compress-commons
 *
 * Copyright (c) 2014 Chris Talkington, contributors.
 * Licensed under the MIT license.
 * https://github.com/archiverjs/node-compress-commons/blob/master/LICENSE-MIT
 */
var inherits = require('util').inherits;
var isStream = require('is-stream');
var Transform = require('readable-stream').Transform;

var ArchiveEntry = require('./archive-entry');
var util = require('../util');

var ArchiveOutputStream = module.exports = function(options) {
  if (!(this instanceof ArchiveOutputStream)) {
    return new ArchiveOutputStream(options);
  }

  Transform.call(this, options);

  this.offset = 0;
  this._archive = {
    finish: false,
    finished: false,
    processing: false
  };
};

inherits(ArchiveOutputStream, Transform);

ArchiveOutputStream.prototype._appendBuffer = function(zae, source, callback) {
  // scaffold only
};

ArchiveOutputStream.prototype._appendStream = function(zae, source, callback) {
  // scaffold only
};

ArchiveOutputStream.prototype._emitErrorCallback = function(err) {
  if (err) {
    this.emit('error', err);
  }
};

ArchiveOutputStream.prototype._finish = function(ae) {
  // scaffold only
};

ArchiveOutputStream.prototype._normalizeEntry = function(ae) {
  // scaffold only
};

ArchiveOutputStream.prototype._transform = function(chunk, encoding, callback) {
  callback(null, chunk);
};

ArchiveOutputStream.prototype.entry = function(ae, source, callback) {
  source = source || null;

  if (typeof callback !== 'function') {
    callback = this._emitErrorCallback.bind(this);
  }

  if (!(ae instanceof ArchiveEntry)) {
    callback(new Error('not a valid instance of ArchiveEntry'));
    return;
  }

  if (this._archive.finish || this._archive.finished) {
    callback(new Error('unacceptable entry after finish'));
    return;
  }

  if (this._archive.processing) {
    callback(new Error('already processing an entry'));
    return;
  }

  this._archive.processing = true;
  this._normalizeEntry(ae);
  this._entry = ae;

  source = util.normalizeInputSource(source);

  if (Buffer.isBuffer(source)) {
    this._appendBuffer(ae, source, callback);
  } else if (isStream(source)) {
    this._appendStream(ae, source, callback);
  } else {
    this._archive.processing = false;
    callback(new Error('input source must be valid Stream or Buffer instance'));
    return;
  }

  return this;
};

ArchiveOutputStream.prototype.finish = function() {
  if (this._archive.processing) {
    this._archive.finish = true;
    return;
  }

  this._finish();
};

ArchiveOutputStream.prototype.getBytesWritten = function() {
  return this.offset;
};

ArchiveOutputStream.prototype.write = function(chunk, cb) {
  if (chunk) {
    this.offset += chunk.length;
  }

  return Transform.prototype.write.call(this, chunk, cb);
};