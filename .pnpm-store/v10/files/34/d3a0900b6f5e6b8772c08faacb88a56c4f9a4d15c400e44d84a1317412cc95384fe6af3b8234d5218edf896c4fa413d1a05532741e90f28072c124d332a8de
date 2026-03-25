/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const npm = {
    os: require('os'),
    utils: require('../utils'),
    minify: require('pg-minify')
};

/**
 * @class errors.QueryFileError
 * @augments external:Error
 * @description
 * {@link errors.QueryFileError QueryFileError} class, available from the {@link errors} namespace.
 *
 * This type represents all errors related to {@link QueryFile}.
 *
 * @property {string} name
 * Standard {@link external:Error Error} property - error type name = `QueryFileError`.
 *
 * @property {string} message
 * Standard {@link external:Error Error} property - the error message.
 *
 * @property {string} stack
 * Standard {@link external:Error Error} property - the stack trace.
 *
 * @property {string} file
 * File path/name that was passed into the {@link QueryFile} constructor.
 *
 * @property {object} options
 * Set of options that was used by the {@link QueryFile} object.
 *
 * @property {SQLParsingError} error
 * Internal $[SQLParsingError] object.
 *
 * It is set only when the error was thrown by $[pg-minify] while parsing the SQL file.
 *
 * @see QueryFile
 *
 */
class QueryFileError extends Error {
    constructor(error, qf) {
        const isSqlError = error instanceof npm.minify.SQLParsingError;
        const message = isSqlError ? 'Failed to parse the SQL.' : error.message;
        super(message);
        this.name = this.constructor.name;
        if (isSqlError) {
            this.error = error;
        }
        this.file = qf.file;
        this.options = qf.options;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * @method errors.QueryFileError#toString
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
QueryFileError.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    const gap0 = npm.utils.messageGap(level),
        gap1 = npm.utils.messageGap(level + 1),
        lines = [
            'QueryFileError {',
            gap1 + 'message: "' + this.message + '"',
            gap1 + 'options: ' + npm.utils.toJson(this.options),
            gap1 + 'file: "' + this.file + '"'
        ];
    if (this.error) {
        lines.push(gap1 + 'error: ' + this.error.toString(level + 1));
    }
    lines.push(gap0 + '}');
    return lines.join(npm.os.EOL);
};

npm.utils.addInspection(QueryFileError, function () {
    return this.toString();
});

module.exports = {QueryFileError};
