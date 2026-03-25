const {PageError} = require('../errors/page');

/**
 * @method page
 * @description
 * Resolves a dynamic sequence of pages/arrays with [mixed values]{@tutorial mixed}.
 *
 * The method acquires pages (arrays of [mixed values]{@tutorial mixed}) from the `source` function, one by one,
 * and resolves each page as a {@link batch}, till no more pages left or an error/reject occurs.
 *
 * @param {Function|generator} source
 * Expected to return a [mixed value]{@tutorial mixed} that resolves with the next page of data (array of [mixed values]{@tutorial mixed}).
 * Returning or resolving with `undefined` ends the sequence, and the method resolves.
 *
 * The function inherits `this` context from the calling method.
 *
 * Parameters:
 *  - `index` = index of the page being requested
 *  - `data` = previously returned page, resolved as a {@link batch} (`undefined` when `index=0`)
 *  - `delay` = number of milliseconds since the last call (`undefined` when `index=0`)
 *
 * If the function throws an error or returns a rejected promise, the method rejects with
 * {@link errors.PageError PageError}, which will have property `source` set.
 *
 * And if the function returns or resolves with anything other than an array or `undefined`,
 * the method rejects with the same {@link errors.PageError PageError}, but with `error` set to
 * `Unexpected data returned from the source.`
 *
 * Passing in anything other than a function will reject with {@link external:TypeError TypeError} = `Parameter 'source' must be a function.`
 *
 * @param {Object} [options]
 * Optional Parameters.
 *
 * @param {Function|generator} [options.dest]
 * Optional destination function (or generator), to receive a resolved {@link batch} of data
 * for each page, process it and respond as required.
 *
 * Parameters:
 *  - `index` = page index in the sequence
 *  - `data` = page data resolved as a {@link batch}
 *  - `delay` = number of milliseconds since the last call (`undefined` when `index=0`)
 *
 * The function inherits `this` context from the calling method.
 *
 * It can optionally return a promise object, if notifications are handled asynchronously.
 * And if a promise is returned, the method will not request another page from the `source`
 * function until the promise has been resolved.
 *
 * If the function throws an error or returns a rejected promise, the sequence terminates,
 * and the method rejects with {@link errors.PageError PageError}, which will have property `dest` set.
 *
 * @param {Number} [options.limit=0]
 * Limits the maximum number of pages to be requested from the `source`. If the value is greater
 * than 0, the method will successfully resolve once the specified limit has been reached.
 *
 * When `limit` isn't specified (default), the sequence is unlimited, and it will continue
 * till one of the following occurs:
 *  - `source` returns or resolves with `undefined` or an invalid value (non-array)
 *  - either `source` or `dest` functions throw an error or return a rejected promise
 *
 * @returns {external:Promise}
 *
 * When successful, the method resolves with object `{pages, total, duration}`:
 *  - `pages` = number of pages resolved
 *  - `total` = the sum of all page sizes (total number of values resolved)
 *  - `duration` = number of milliseconds consumed by the method
 *
 * When the method fails, it rejects with {@link errors.PageError PageError}.
 *
 */
function page(source, options, config) {

    const $p = config.promise, spex = config.spex, utils = config.utils;

    if (typeof source !== 'function') {
        return $p.reject(new TypeError('Parameter \'source\' must be a function.'));
    }

    options = options || {};
    source = utils.wrap(source);

    const limit = (options.limit > 0) ? parseInt(options.limit) : 0,
        dest = utils.wrap(options.dest), self = this, start = Date.now();
    let request, srcTime, destTime, total = 0;

    return $p((resolve, reject) => {

        function loop(idx) {
            const srcNow = Date.now(),
                srcDelay = idx ? (srcNow - srcTime) : undefined;
            srcTime = srcNow;
            utils.resolve.call(self, source, [idx, request, srcDelay], value => {
                if (value === undefined) {
                    success();
                } else {
                    if (value instanceof Array) {
                        spex.batch(value)
                            .then(data => {
                                request = data;
                                total += data.length;
                                if (dest) {
                                    const destNow = Date.now(),
                                        destDelay = idx ? (destNow - destTime) : undefined;
                                    let destResult;
                                    destTime = destNow;
                                    try {
                                        destResult = dest.call(self, idx, data, destDelay);
                                    } catch (err) {
                                        fail({
                                            error: err,
                                            dest: data
                                        }, 4, dest.name);
                                        return;
                                    }
                                    if (utils.isPromise(destResult)) {
                                        destResult
                                            .then(next)
                                            .catch(error => {
                                                fail({
                                                    error: error,
                                                    dest: data
                                                }, 3, dest.name);
                                            });
                                    } else {
                                        next();
                                    }
                                } else {
                                    next();
                                }
                                return null; // this dummy return is just to prevent Bluebird warnings;
                            })
                            .catch(error => {
                                fail({
                                    error: error
                                }, 0);
                            });
                    } else {
                        fail({
                            error: new Error('Unexpected data returned from the source.'),
                            source: request
                        }, 5, source.name);
                    }
                }
            }, (reason, isRej) => {
                fail({
                    error: reason,
                    source: request
                }, isRej ? 1 : 2, source.name);
            });

            function next() {
                if (limit === ++idx) {
                    success();
                } else {
                    loop(idx);
                }
                return null; // this dummy return is just to prevent Bluebird warnings;
            }

            function success() {
                resolve({
                    pages: idx,
                    total: total,
                    duration: Date.now() - start
                });
            }

            function fail(reason, code, cbName) {
                reason.index = idx;
                reject(new PageError(reason, code, cbName, Date.now() - start));
            }
        }

        loop(0);
    });
}

module.exports = function (config) {
    return function (source, options) {
        return page.call(this, source, options, config);
    };
};
