/**
 * ZipStream
 *
 * @ignore
 * @license [MIT]{@link https://github.com/archiverjs/node-zip-stream/blob/master/LICENSE}
 * @copyright (c) 2014 Chris Talkington, contributors.
 */
var inherits = require('util').inherits;

var ZipArchiveOutputStream = require('compress-commons').ZipArchiveOutputStream;
var ZipArchiveEntry = require('compress-commons').ZipArchiveEntry;

var util = require('archiver-utils');

/**
 * @constructor
 * @extends external:ZipArchiveOutputStream
 * @param {Object} [options]
 * @param {String} [options.comment] Sets the zip archive comment.
 * @param {Boolean} [options.forceLocalTime=false] Forces the archive to contain local file times instead of UTC.
 * @param {Boolean} [options.forceZip64=false] Forces the archive to contain ZIP64 headers.
 * @param {Boolean} [options.store=false] Sets the compression method to STORE.
 * @param {Object} [options.zlib] Passed to [zlib]{@link https://nodejs.org/api/zlib.html#zlib_class_options}
 * to control compression.
 */
var ZipStream = module.exports = function(options) {
  if (!(this instanceof ZipStream)) {
    return new ZipStream(options);
  }

  options = this.options = options || {};
  options.zlib = options.zlib || {};

  ZipArchiveOutputStream.call(this, options);

  if (typeof options.level === 'number' && options.level >= 0) {
    options.zlib.level = options.level;
    delete options.level;
  }

  if (!options.forceZip64 && typeof options.zlib.level === 'number' && options.zlib.level === 0) {
    options.store = true;
  }

  options.namePrependSlash = options.namePrependSlash || false;

  if (options.comment && options.comment.length > 0) {
    this.setComment(options.comment);
  }
};

inherits(ZipStream, ZipArchiveOutputStream);

/**
 * Normalizes entry data with fallbacks for key properties.
 *
 * @private
 * @param  {Object} data
 * @return {Object}
 */
ZipStream.prototype._normalizeFileData = function(data) {
  data = util.defaults(data, {
    type: 'file',
    name: null,
    namePrependSlash: this.options.namePrependSlash,
    linkname: null,
    date: null,
    mode: null,
    store: this.options.store,
    comment: ''
  });

  var isDir = data.type === 'directory';
  var isSymlink = data.type === 'symlink';

  if (data.name) {
    data.name = util.sanitizePath(data.name);

    if (!isSymlink && data.name.slice(-1) === '/') {
      isDir = true;
      data.type = 'directory';
    } else if (isDir) {
      data.name += '/';
    }
  }

  if (isDir || isSymlink) {
    data.store = true;
  }

  data.date = util.dateify(data.date);

  return data;
};

/**
 * Appends an entry given an input source (text string, buffer, or stream).
 *
 * @param  {(Buffer|Stream|String)} source The input source.
 * @param  {Object} data
 * @param  {String} data.name Sets the entry name including internal path.
 * @param  {String} [data.comment] Sets the entry comment.
 * @param  {(String|Date)} [data.date=NOW()] Sets the entry date.
 * @param  {Number} [data.mode=D:0755/F:0644] Sets the entry permissions.
 * @param  {Boolean} [data.store=options.store] Sets the compression method to STORE.
 * @param  {String} [data.type=file] Sets the entry type. Defaults to `directory`
 * if name ends with trailing slash.
 * @param  {Function} callback
 * @return this
 */
ZipStream.prototype.entry = function(source, data, callback) {
  if (typeof callback !== 'function') {
    callback = this._emitErrorCallback.bind(this);
  }

  data = this._normalizeFileData(data);

  if (data.type !== 'file' && data.type !== 'directory' && data.type !== 'symlink') {
    callback(new Error(data.type + ' entries not currently supported'));
    return;
  }

  if (typeof data.name !== 'string' || data.name.length === 0) {
    callback(new Error('entry name must be a non-empty string value'));
    return;
  }

  if (data.type === 'symlink' && typeof data.linkname !== 'string') {
    callback(new Error('entry linkname must be a non-empty string value when type equals symlink'));
    return;
  }

  var entry = new ZipArchiveEntry(data.name);
  entry.setTime(data.date, this.options.forceLocalTime);

  if (data.namePrependSlash) {
    entry.setName(data.name, true);
  }

  if (data.store) {
    entry.setMethod(0);
  }

  if (data.comment.length > 0) {
    entry.setComment(data.comment);
  }

  if (data.type === 'symlink' && typeof data.mode !== 'number') {
    data.mode = 40960; // 0120000
  }

  if (typeof data.mode === 'number') {
    if (data.type === 'symlink') {
      data.mode |= 40960;
    }

    entry.setUnixMode(data.mode);
  }

  if (data.type === 'symlink' && typeof data.linkname === 'string') {
    source = Buffer.from(data.linkname);
  }

  return ZipArchiveOutputStream.prototype.entry.call(this, entry, source, callback);
};

/**
 * Finalizes the instance and prevents further appending to the archive
 * structure (queue will continue til drained).
 *
 * @return void
 */
ZipStream.prototype.finalize = function() {
  this.finish();
};

/**
 * Returns the current number of bytes written to this stream.
 * @function ZipStream#getBytesWritten
 * @returns {Number}
 */

/**
 * Compress Commons ZipArchiveOutputStream
 * @external ZipArchiveOutputStream
 * @see {@link https://github.com/archiverjs/node-compress-commons}
 */
