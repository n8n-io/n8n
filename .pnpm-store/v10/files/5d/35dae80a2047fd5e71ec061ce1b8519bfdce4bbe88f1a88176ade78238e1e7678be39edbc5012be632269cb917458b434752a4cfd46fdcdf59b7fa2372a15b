const EventEmitter = require('events').EventEmitter;
const Util = require('../../util');
const Errors = require('../../errors');

/**
 * Creates a stream-like object that can be used to read the contents of an
 * array of chunks with the ability to prefetch chunks as we go. Every time the
 * contents of a new chunk become available, a 'data' event is fired. When there
 * are no more chunks to read, a 'close' event is fired to indicate that the
 * read operation is complete. If no chunks are specified in the options, the
 * stream asynchronously fires a 'close' event after it is returned.
 *
 * @param {Object} [options] An options object with the following properties:
 *   {Object[]} chunks       - The chunks to read.
 *   {Number}   prefetchSize - The number of chunks to prefetch every time a new
 *     chunk is read.
 *
 * @constructor
 */
function ResultStream(options) {
  // options should be an object
  Errors.assertInternal(Util.isObject(options));

  const chunks = options.chunks;
  const prefetchSize = options.prefetchSize;

  // chunks should be an array
  Errors.assertInternal(Util.isArray(chunks));

  // prefetch size should be non-negative
  Errors.assertInternal(Util.isNumber(prefetchSize) && (prefetchSize >= 0));

  // Current chunk being streamed. Start with the first chunk.
  let currChunk = 0;

  const self = this;

  /**
   * Called when a chunk fires a 'loadcomplete' event.
   *
   * @param {Error} err
   * @param {Chunk} chunk
   */
  const onLoadComplete = function (err, chunk) {
    // unsubscribe from the 'loadcomplete' event
    chunk.removeListener('loadcomplete', onLoadComplete);

    // if the chunk load succeeded
    if (!err) {
      // Move on to the next chunk
      currChunk++;

      // emit an event to signal that new data is available
      self.emit('data', chunk);
    } else {
      // close the stream with an error; also, include a callback when emitting
      // the event in case someone wants to fix the problem and ask us to
      // continue from where we got interrupted
      close(self, err, doLoad);
    }
  };

  /**
   * Identifies the next chunk to load and issues requests to fetch both its
   * contents plus the contents of the next few chunks. If there are no more
   * chunks to load, a 'close' event is fired on the stream to notify
   * subscribers that all the chunks have been successfully read.
   */
  const doLoad = function () {
    // All chunks were loaded, we're done
    if (currChunk >= chunks.length) {
      self.asyncClose();
    } else {
      // Subscribe to the loadcomplete event on the current chunk being streamed to ensure the
      // rows are returned in the correct order and not in the order chunk data are received
      chunks[currChunk].on('loadcomplete', onLoadComplete);

      // Fire off requests to load all the chunks in the buffer that aren't already loading
      let chunk, index;
      for (index = currChunk; index < chunks.length && index <= (currChunk + prefetchSize); index++) {
        chunk = chunks[index];
        if (!chunk.isLoading()) {
          chunk.load();
        }
      }
    }
  };

  /**
   * Reads the next chunk of data in the result stream.
   */
  this.read = function () {
    // TODO: if there are no more chunks to read, should we raise an error?
    // TODO: what if we're already in the middle of a read?

    // read the next chunk
    doLoad();
  };
}

Util.inherits(ResultStream, EventEmitter);

/**
 * Asynchronously closes this stream.
 *
 * @returns {ResultStream}
 */
ResultStream.prototype.asyncClose = function () {
  // schedule an operation to close the stream in
  // the next tick of the event loop
  const self = this;
  process.nextTick(function () {
    close(self);
  });

  return this;
};

/**
 * Closes a given result stream.
 *
 * @param {ResultStream} stream The stream to close.
 * @param {Error} [err] The error, if any, to fire with the close event.
 * @param {Function} [callback] The callback, if any, to fire with the close
 *   event. This is in case someone wants to fix the problem and ask the stream
 *   to resume from the point of interruption.
 */
function close(stream, err, callback) {
  stream.emit('close', err, callback);
}

module.exports = ResultStream;