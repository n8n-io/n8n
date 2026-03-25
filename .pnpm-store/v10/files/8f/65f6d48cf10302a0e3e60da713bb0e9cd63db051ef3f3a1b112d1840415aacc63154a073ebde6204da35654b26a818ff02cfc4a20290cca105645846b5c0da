/**
 * rejection-stream.js: TODO: add file header handler.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

const { Writable } = require('readable-stream');

/**
 * TODO: add class description.
 * @type {RejectionStream}
 * @extends {Writable}
 */
module.exports = class RejectionStream extends Writable {
  /**
   * Constructor function for the RejectionStream responsible for wrapping a
   * TransportStream; only allowing writes of `info` objects with
   * `info.rejection` set to true.
   * @param {!TransportStream} transport - Stream to filter to rejections
   */
  constructor(transport) {
    super({ objectMode: true });

    if (!transport) {
      throw new Error('RejectionStream requires a TransportStream instance.');
    }

    this.handleRejections = true;
    this.transport = transport;
  }

  /**
   * Writes the info object to our transport instance if (and only if) the
   * `rejection` property is set on the info.
   * @param {mixed} info - TODO: add param description.
   * @param {mixed} enc - TODO: add param description.
   * @param {mixed} callback - TODO: add param description.
   * @returns {mixed} - TODO: add return description.
   * @private
   */
  _write(info, enc, callback) {
    if (info.rejection) {
      return this.transport.log(info, callback);
    }

    callback();
    return true;
  }
};
