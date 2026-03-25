/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {QueryFileError} = require('./query-file-error');

const npm = {
    os: require('os'),
    utils: require('../utils')
};

/**
 * @class errors.ParameterizedQueryError
 * @augments external:Error
 * @description
 * {@link errors.ParameterizedQueryError ParameterizedQueryError} class, available from the {@link errors} namespace.
 *
 * This type represents all errors that can be reported by class {@link ParameterizedQuery}, whether it is used
 * explicitly or implicitly (via a simple `{text, values}` object).
 *
 * @property {string} name
 * Standard {@link external:Error Error} property - error type name = `ParameterizedQueryError`.
 *
 * @property {string} message
 * Standard {@link external:Error Error} property - the error message.
 *
 * @property {string} stack
 * Standard {@link external:Error Error} property - the stack trace.
 *
 * @property {errors.QueryFileError} error
 * Internal {@link errors.QueryFileError} object.
 *
 * It is set only when the source {@link ParameterizedQuery} used a {@link QueryFile} which threw the error.
 *
 * @property {object} result
 * Resulting Parameterized Query object.
 *
 * @see ParameterizedQuery
 */
class ParameterizedQueryError extends Error {
    constructor(error, pq) {
        const isQueryFileError = error instanceof QueryFileError;
        const message = isQueryFileError ? 'Failed to initialize \'text\' from a QueryFile.' : error;
        super(message);
        this.name = this.constructor.name;
        if (isQueryFileError) {
            this.error = error;
        }
        this.result = pq;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * @method errors.ParameterizedQueryError#toString
 * @description
 * Creates a well-formatted multi-line string that represents the error.
 *
 * It is called automatically when writing the object into the console.
 *
 * @param {number} [level=0]
 * Nested output level, to provide visual offset.
 *
 * @returns {string}
 */
ParameterizedQueryError.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    const gap0 = npm.utils.messageGap(level),
        gap1 = npm.utils.messageGap(level + 1),
        gap2 = npm.utils.messageGap(level + 2),
        lines = [
            'ParameterizedQueryError {',
            gap1 + 'message: "' + this.message + '"',
            gap1 + 'result: {',
            gap2 + 'text: ' + npm.utils.toJson(this.result.text),
            gap2 + 'values: ' + npm.utils.toJson(this.result.values),
            gap1 + '}'
        ];
    if (this.error) {
        lines.push(gap1 + 'error: ' + this.error.toString(level + 1));
    }
    lines.push(gap0 + '}');
    return lines.join(npm.os.EOL);
};

npm.utils.addInspection(ParameterizedQueryError, function () {
    return this.toString();
});

module.exports = {ParameterizedQueryError};
