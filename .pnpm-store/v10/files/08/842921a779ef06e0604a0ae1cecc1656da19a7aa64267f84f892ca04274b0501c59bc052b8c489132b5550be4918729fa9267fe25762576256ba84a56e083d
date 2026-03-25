const npm = {
    u: require('util'),
    os: require('os'),
    utils: require('../utils/static')
};

/**
 * @class errors.BatchError
 * @augments external:Error
 * @description
 * This type represents all errors rejected by method {@link batch}, except for {@link external:TypeError TypeError}
 * when the method receives invalid input parameters.
 *
 * @property {string} name
 * Standard {@link external:Error Error} property - error type name = `BatchError`.
 *
 * @property {string} message
 * Standard {@link external:Error Error} property - the error message.
 *
 * It represents the message of the first error encountered in the batch, and is a safe
 * version of using `first.message`.
 *
 * @property {string} stack
 * Standard {@link external:Error Error} property - the stack trace.
 *
 * @property {array} data
 * Array of objects `{success, result, [origin]}`:
 * - `success` = true/false, indicates whether the corresponding value in the input array was resolved.
 * - `result` = resolved data, if `success`=`true`, or else the rejection reason.
 * - `origin` - set only when failed as a result of an unsuccessful call into the notification callback
 *    (parameter `cb` of method {@link batch})
 *
 * The array has the same size as the input one that was passed into method {@link batch}, providing direct mapping.
 *
 * @property {} stat
 * Resolution Statistics.
 *
 * @property {number} stat.total
 * Total number of elements in the batch.
 *
 * @property {number} stat.succeeded
 * Number of resolved values in the batch.
 *
 * @property {number} stat.failed
 * Number of rejected values in the batch.
 *
 * @property {number} stat.duration
 * Time in milliseconds it took to settle all values.
 *
 * @property {} first
 * The very first error within the batch, with support for nested batch results, it is also the same error
 * as $[promise.all] would provide.
 *
 * @see {@link batch}
 *
 */
class BatchError extends Error {

    constructor(result, errors, duration) {

        function getErrors() {
            const err = new Array(errors.length);
            for (let i = 0; i < errors.length; i++) {
                err[i] = result[errors[i]].result;
                if (err[i] instanceof BatchError) {
                    err[i] = err[i].getErrors();
                }
            }
            npm.utils.extend(err, '$isErrorList', true);
            return err;
        }

        const e = getErrors();

        let first = e[0];

        while (first && first.$isErrorList) {
            first = first[0];
        }

        let message;

        if (first instanceof Error) {
            message = first.message;
        } else {
            if (typeof first !== 'string') {
                first = npm.u.inspect(first);
            }
            message = first;
        }

        super(message);
        this.name = this.constructor.name;

        this.data = result;

        // we do not show it within the inspect, because when the error
        // happens for a nested result, the output becomes a mess.
        this.first = first;

        this.stat = {
            total: result.length,
            succeeded: result.length - e.length,
            failed: e.length,
            duration: duration
        };

        this.getErrors = getErrors;

        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * @method errors.BatchError.getErrors
     * @description
     * Returns the complete list of errors only.
     *
     * It supports nested batch results, presented as a sub-array.
     *
     * @returns {array}
     */
}

/**
 * @method errors.BatchError.toString
 * @description
 * Creates a well-formatted multi-line string that represents the error.
 *
 * It is called automatically when writing the object into the console.
 *
 * The output is an abbreviated version of the error, because the complete error
 * is often too much for displaying or even logging, as a batch can be of any size.
 * Therefore, only errors are rendered from the `data` property, alongside their indexes,
 * and only up to the first 5, to avoid polluting the screen or the log file.
 *
 * @param {number} [level=0]
 * Nested output level, to provide visual offset.
 *
 * @returns {string}
 */
BatchError.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    const gap0 = npm.utils.messageGap(level),
        gap1 = npm.utils.messageGap(level + 1),
        gap2 = npm.utils.messageGap(level + 2),
        lines = [
            'BatchError {',
            gap1 + 'stat: { total: ' + this.stat.total + ', succeeded: ' + this.stat.succeeded +
            ', failed: ' + this.stat.failed + ', duration: ' + this.stat.duration + ' }',
            gap1 + 'errors: ['
        ];

    // In order to avoid polluting the error log or the console, 
    // we limit the log output to the top 5 errors:
    const maxErrors = 5;
    let counter = 0;
    this.data.forEach((d, index) => {
        if (!d.success && counter < maxErrors) {
            lines.push(gap2 + index + ': ' + npm.utils.formatError(d.result, level + 2));
            counter++;
        }
    });
    lines.push(gap1 + ']');
    lines.push(gap0 + '}');
    return lines.join(npm.os.EOL);
};

npm.utils.addInspection(BatchError, function () {
    return this.toString();
});

module.exports = {BatchError};

