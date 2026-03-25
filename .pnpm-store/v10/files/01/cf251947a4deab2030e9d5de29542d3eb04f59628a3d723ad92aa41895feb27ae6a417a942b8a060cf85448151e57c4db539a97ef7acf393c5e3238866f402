/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {ServerFormatting} = require('./server-formatting');
const {ParameterizedQueryError} = require('../errors');
const {QueryFile} = require('../query-file');
const {assert} = require('../assert');

const npm = {
    EOL: require('os').EOL,
    utils: require('../utils')
};

/**
 * @class ParameterizedQuery
 * @description
 * Constructs a new {@link ParameterizedQuery} object. All properties can also be set after the object's construction.
 *
 * This type extends the basic `{text, values}` object, i.e. when the basic object is used with a query method,
 * a new {@link ParameterizedQuery} object is created in its place.
 *
 * The type can be used in place of the `query` parameter, with any query method directly.
 *
 * The type is available from the library's root: `pgp.ParameterizedQuery`.
 *
 * @param {string|QueryFile|Object} [options]
 * Object configuration options / properties.
 *
 * @param {string|QueryFile} [options.text] - See property {@link ParameterizedQuery#text text}.
 * @param {array} [options.values] - See property {@link ParameterizedQuery#values values}.
 * @param {boolean} [options.binary] - See property {@link ParameterizedQuery#binary binary}.
 * @param {string} [options.rowMode] - See property {@link ParameterizedQuery#rowMode rowMode}.
 * @param {ITypes} [options.types] - See property {@link ParameterizedQuery#types types}.
 *
 * @returns {ParameterizedQuery}
 *
 * @see
 * {@link errors.ParameterizedQueryError ParameterizedQueryError}
 *
 * @example
 *
 * const {ParameterizedQuery: PQ} = require('pg-promise');
 *
 * // Creating a complete Parameterized Query with parameters:
 * const findUser = new PQ({text: 'SELECT * FROM Users WHERE id = $1', values: [123]});
 *
 * db.one(findUser)
 *     .then(user => {
 *         // user found;
 *     })
 *     .catch(error => {
 *         // error;
 *     });
 *
 * @example
 *
 * const {ParameterizedQuery: PQ} = require('pg-promise');
 *
 * // Creating a reusable Parameterized Query without values:
 * const addUser = new PQ('INSERT INTO Users(name, age) VALUES($1, $2)');
 *
 * // setting values explicitly:
 * addUser.values = ['John', 30];
 *
 * db.none(addUser)
 *     .then(() => {
 *         // user added;
 *     })
 *     .catch(error=> {
 *         // error;
 *     });
 *
 * // setting values implicitly, by passing them into the query method:
 * db.none(addUser, ['Mike', 25])
 *     .then(() => {
 *         // user added;
 *     })
 *     .catch(error=> {
 *         // error;
 *     });
 */
class ParameterizedQuery extends ServerFormatting {
    constructor(options) {
        if (typeof options === 'string' || options instanceof QueryFile) {
            options = {
                text: options
            };
        } else {
            options = assert(options, ['text', 'values', 'binary', 'rowMode', 'types']);
        }
        super(options);
    }
}

/**
 * @method ParameterizedQuery#parse
 * @description
 * Parses the current object and returns a simple `{text, values}`, if successful,
 * or else it returns a {@link errors.ParameterizedQueryError ParameterizedQueryError} object.
 *
 * This method is primarily for internal use by the library.
 *
 * @returns {{text, values}|errors.ParameterizedQueryError}
 */
ParameterizedQuery.prototype.parse = function () {

    const _i = this._inner, options = _i.options;
    const qf = options.text instanceof QueryFile ? options.text : null;

    if (!_i.changed && !qf) {
        return _i.target;
    }

    const errors = [], values = _i.target.values;
    _i.target = {
        text: options.text
    };
    _i.changed = true;
    _i.currentError = undefined;

    if (qf) {
        qf.prepare();
        if (qf.error) {
            errors.push(qf.error);
        } else {
            _i.target.text = qf[QueryFile.$query];
        }
    }

    if (!npm.utils.isText(_i.target.text)) {
        errors.push('Property \'text\' must be a non-empty text string.');
    }

    if (!npm.utils.isNull(values)) {
        _i.target.values = values;
    }

    if (options.binary !== undefined) {
        _i.target.binary = !!options.binary;
    }

    if (options.rowMode !== undefined) {
        _i.target.rowMode = options.rowMode;
    }

    if (options.types !== undefined) {
        _i.target.types = options.types;
    }

    if (errors.length) {
        return _i.currentError = new ParameterizedQueryError(errors[0], _i.target);
    }

    _i.changed = false;

    return _i.target;
};

/**
 * @method ParameterizedQuery#toString
 * @description
 * Creates a well-formatted multi-line string that represents the object's current state.
 *
 * It is called automatically when writing the object into the console.
 *
 * @param {number} [level=0]
 * Nested output level, to provide visual offset.
 *
 * @returns {string}
 */
ParameterizedQuery.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    const gap = npm.utils.messageGap(level + 1);
    const pq = this.parse();
    const lines = [
        'ParameterizedQuery {'
    ];
    if (npm.utils.isText(pq.text)) {
        lines.push(gap + 'text: "' + pq.text + '"');
    }
    if (this.values !== undefined) {
        lines.push(gap + 'values: ' + npm.utils.toJson(this.values));
    }
    if (this.binary !== undefined) {
        lines.push(gap + 'binary: ' + npm.utils.toJson(this.binary));
    }
    if (this.rowMode !== undefined) {
        lines.push(gap + 'rowMode: ' + npm.utils.toJson(this.rowMode));
    }
    if (this.error !== undefined) {
        lines.push(gap + 'error: ' + this.error.toString(level + 1));
    }
    lines.push(npm.utils.messageGap(level) + '}');
    return lines.join(npm.EOL);
};

module.exports = {ParameterizedQuery};

/**
 * @name ParameterizedQuery#text
 * @type {string|QueryFile}
 * @description
 * A non-empty query string or a {@link QueryFile} object.
 *
 * Only the basic variables (`$1`, `$2`, etc) can be used in the query, because _Parameterized Queries_
 * are formatted on the server side.
 */

/**
 * @name ParameterizedQuery#values
 * @type {array}
 * @description
 * Query formatting parameters, depending on the type:
 *
 * - `null` / `undefined` means the query has no formatting parameters
 * - `Array` - it is an array of formatting parameters
 * - None of the above, means it is a single formatting value, which
 *   is then automatically wrapped into an array
 */

/**
 * @name ParameterizedQuery#binary
 * @type {boolean}
 * @default undefined
 * @description
 * Activates binary result mode. The default is the text mode.
 *
 * @see {@link http://www.postgresql.org/docs/devel/static/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY Extended Query}
 */

/**
 * @name ParameterizedQuery#rowMode
 * @type {string}
 * @default undefined
 * @description
 * Changes the way data arrives to the client, with only one value supported by $[pg]:
 *  - `array` will make all data rows arrive as arrays of values. By default, rows arrive as objects.
 */

/**
 * @name ParameterizedQuery#types
 * @type {ITypes}
 * @default undefined
 * @description
 * Custom type parsers just for this query result.
 */

/**
 * @name ParameterizedQuery#error
 * @type {errors.ParameterizedQueryError}
 * @default undefined
 * @readonly
 * @description
 * When in an error state, it is set to a {@link errors.ParameterizedQueryError ParameterizedQueryError} object. Otherwise, it is `undefined`.
 *
 * This property is primarily for internal use by the library.
 */
