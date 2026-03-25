/**
 * @method stream.read
 * @description
 * Consumes and processes data from a $[Readable] stream.
 *
 * It reads the entire stream, using either **paused mode** (default), or in chunks (see `options.readChunks`)
 * with support for both synchronous and asynchronous data processing.
 *
 * **NOTE:** Once the method has finished, the onus is on the caller to release the stream
 * according to its protocol.
 *
 * @param {Object} stream
 * $[Readable] stream object.
 *
 * Passing in anything else will throw `Readable stream is required.`
 *
 * @param {Function|generator} receiver
 * Data processing callback (or generator).
 *
 * Passing in anything else will throw `Invalid stream receiver.`
 *
 * Parameters:
 *  - `index` = index of the call made to the function
 *  - `data` = array of all data reads from the stream's buffer
 *  - `delay` = number of milliseconds since the last call (`undefined` when `index=0`)
 *
 * The function is called with the same `this` context as the calling method.
 *
 * It can optionally return a promise object, if data processing is asynchronous.
 * And if a promise is returned, the method will not read data from the stream again,
 * until the promise has been resolved.
 *
 * If the function throws an error or returns a rejected promise, the method rejects
 * with the same error / rejection reason.
 *
 * @param {Object} [options]
 * Optional Parameters.
 *
 * @param {Boolean} [options.closable=false]
 * Instructs the method to resolve on event `close` supported by the stream, as opposed to event
 * `end` that's used by default.
 *
 * @param {Boolean} [options.readChunks=false]
 * By default, the method handles event `readable` of the stream to consume data in a simplified form,
 * item by item. If you enable this option, the method will instead handle event `data` of the stream,
 * to consume chunks of data.
 *
 * @param {Number} [options.readSize]
 * When the value is greater than 0, it sets the read size from the stream's buffer
 * when the next data is available. By default, the method uses as few reads as possible
 * to get all the data currently available in the buffer.
 *
 * NOTE: This option is ignored when option `readChunks` is enabled.
 *
 * @returns {external:Promise}
 *
 * When finished successfully, resolves with object `{calls, reads, length, duration}`:
 *  - `calls` = number of calls made into the `receiver`
 *  - `reads` = number of successful reads from the stream
 *  - `length` = total length for all the data reads from the stream
 *  - `duration` = number of milliseconds consumed by the method
 *
 * When it fails, the method rejects with the error/reject specified,
 * which can happen as a result of:
 *  - event `error` emitted by the stream
 *  - receiver throws an error or returns a rejected promise
 */
function read(stream, receiver, options, config) {

    const $p = config.promise, utils = config.utils;

    if (!utils.isReadableStream(stream)) {
        return $p.reject(new TypeError('Readable stream is required.'));
    }

    if (typeof receiver !== 'function') {
        return $p.reject(new TypeError('Invalid stream receiver.'));
    }

    receiver = utils.wrap(receiver);

    options = options || {};

    const readSize = (options.readSize > 0) ? parseInt(options.readSize) : null,
        self = this, start = Date.now(), receiveEvent = options.readChunks ? 'data' : 'readable';
    let cbTime, ready, waiting, stop, reads = 0, length = 0, index = 0;

    return $p((resolve, reject) => {

        function onReceive(data) {
            ready = true;
            process(data);
        }

        function onEnd() {
            if (!options.closable) {
                success();
            }
        }

        function onClose() {
            success();
        }

        function onError(error) {
            fail(error);
        }

        stream.on(receiveEvent, onReceive);
        stream.on('end', onEnd);
        stream.on('close', onClose);
        stream.on('error', onError);

        function process(data) {
            if (!ready || stop || waiting) {
                return;
            }
            ready = false;
            let cache;
            if (options.readChunks) {
                cache = data;
                // istanbul ignore else;
                // we cannot test the else condition, as it requires a special broken stream interface.
                if (!Array.isArray(cache)) {
                    cache = [cache];
                }
                length += cache.length;
                reads++;
            } else {
                cache = [];
                waiting = true;
                let page;
                do {
                    page = stream.read(readSize);
                    if (page) {
                        cache.push(page);
                        // istanbul ignore next: requires a unique stream that
                        // creates objects without property `length` defined.
                        length += page.length || 0;
                        reads++;
                    }
                } while (page);

                if (!cache.length) {
                    waiting = false;
                    return;
                }
            }

            const cbNow = Date.now(),
                cbDelay = index ? (cbNow - cbTime) : undefined;
            let result;
            cbTime = cbNow;
            try {
                result = receiver.call(self, index++, cache, cbDelay);
            } catch (e) {
                fail(e);
                return;
            }

            if (utils.isPromise(result)) {
                result
                    .then(() => {
                        waiting = false;
                        process();
                        return null; // this dummy return is just to prevent Bluebird warnings;
                    })
                    .catch(error => {
                        fail(error);
                    });
            } else {
                waiting = false;
                process();
            }
        }

        function success() {
            cleanup();
            resolve({
                calls: index,
                reads: reads,
                length: length,
                duration: Date.now() - start
            });
        }

        function fail(error) {
            stop = true;
            cleanup();
            reject(error);
        }

        function cleanup() {
            stream.removeListener(receiveEvent, onReceive);
            stream.removeListener('close', onClose);
            stream.removeListener('error', onError);
            stream.removeListener('end', onEnd);
        }
    });
}

module.exports = function (config) {
    return function (stream, receiver, options) {
        return read.call(this, stream, receiver, options, config);
    };
};
