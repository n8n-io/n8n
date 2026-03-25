const npm = {
    read: require('./read')
};

/**
 * @namespace stream
 * @description
 * Namespace with methods that implement stream operations, and {@link stream.read read} is the only method currently supported.
 *
 * **Synchronous Stream Processing**
 *
 * ```js
 * const stream = require('spex')(Promise).stream;
 * const fs = require('fs');
 *
 * const rs = fs.createReadStream('values.txt');
 *
 * function receiver(index, data, delay) {
 *    console.log('RECEIVED:', index, data, delay);
 * }
 *
 * stream.read(rs, receiver)
 *     .then(data => {
 *         console.log('DATA:', data);
 *     })
 *     .catch(error => {
 *         console.log('ERROR:', error);
 *     });
 * ```
 *
 * **Asynchronous Stream Processing**
 *
 * ```js
 * const stream = require('spex')(Promise).stream;
 * const fs = require('fs');
 *
 * const rs = fs.createReadStream('values.txt');
 *
 * function receiver(index, data, delay) {
 *    return new Promise(resolve => {
 *        console.log('RECEIVED:', index, data, delay);
 *        resolve();
 *    });
 * }
 *
 * stream.read(rs, receiver)
 *     .then(data => {
 *         console.log('DATA:', data);
 *     })
 *     .catch(error => {
 *         console.log('ERROR:', error);
 *    });
 * ```
 *
 * @property {function} stream.read
 * Consumes and processes data from a $[Readable] stream.
 *
 */
module.exports = function (config) {
    const res = {
        read: npm.read(config)
    };
    Object.freeze(res);
    return res;
};
