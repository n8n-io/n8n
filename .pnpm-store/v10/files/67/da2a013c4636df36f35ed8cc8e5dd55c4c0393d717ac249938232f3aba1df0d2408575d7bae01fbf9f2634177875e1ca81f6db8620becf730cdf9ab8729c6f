/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {ServerFormatting} = require('./server-formatting');
const {PreparedStatementError} = require('../errors');
const {QueryFile} = require('../query-file');
const {assert} = require('../assert');

const npm = {
    EOL: require('os').EOL,
    utils: require('../utils')
};

/**
 * @class PreparedStatement
 * @description
 * Constructs a new $[Prepared Statement] object. All properties can also be set after the object's construction.
 *
 * This type extends the basic `{name, text, values}` object, i.e. when the basic object is used
 * with a query method, a new {@link PreparedStatement} object is created in its place.
 *
 * The type can be used in place of the `query` parameter, with any query method directly.
 *
 * The type is available from the library's root: `pgp.PreparedStatement`.
 *
 * @param {Object} [options]
 * Object configuration options / properties.
 *
 * @param {string} [options.name] - See property {@link PreparedStatement#name name}.
 * @param {string|QueryFile} [options.text] - See property {@link PreparedStatement#text text}.
 * @param {array} [options.values] - See property {@link PreparedStatement#values values}.
 * @param {boolean} [options.binary] - See property {@link PreparedStatement#binary binary}.
 * @param {string} [options.rowMode] - See property {@link PreparedStatement#rowMode rowMode}.
 * @param {number} [options.rows] - See property {@link PreparedStatement#rows rows}.
 * @param {ITypes} [options.types] - See property {@link PreparedStatement#types types}.
 *
 * @returns {PreparedStatement}
 *
 * @see
 * {@link errors.PreparedStatementError PreparedStatementError},
 * {@link http://www.postgresql.org/docs/9.6/static/sql-prepare.html PostgreSQL Prepared Statements}
 *
 * @example
 *
 * const {PreparedStatement: PS} = require('pg-promise');
 *
 * // Creating a complete Prepared Statement with parameters:
 * const findUser = new PS({name: 'find-user', text: 'SELECT * FROM Users WHERE id = $1', values: [123]});
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
 * const {PreparedStatement: PS} = require('pg-promise');
 *
 * // Creating a reusable Prepared Statement without values:
 * const addUser = new PS({name: 'add-user', text: 'INSERT INTO Users(name, age) VALUES($1, $2)'});
 *
 * // setting values explicitly:
 * addUser.values = ['John', 30];
 *
 * db.none(addUser)
 *     .then(() => {
 *         // user added;
 *     })
 *     .catch(error => {
 *         // error;
 *     });
 *
 * // setting values implicitly, by passing them into the query method:
 * db.none(addUser, ['Mike', 25])
 *     .then(() => {
 *         // user added;
 *     })
 *     .catch(error => {
 *         // error;
 *     });
 */
class PreparedStatement extends ServerFormatting {
    constructor(options) {
        options = assert(options, ['name', 'text', 'values', 'binary', 'rowMode', 'rows', 'types']);
        super(options);
    }

    /**
     * @name PreparedStatement#name
     * @type {string}
     * @description
     * An arbitrary name given to this particular prepared statement. It must be unique within a single session and is
     * subsequently used to execute or deallocate a previously prepared statement.
     */
    get name() {
        return this._inner.options.name;
    }

    set name(value) {
        const _i = this._inner;
        if (value !== _i.options.name) {
            _i.options.name = value;
            _i.changed = true;
        }
    }

    /**
     * @name PreparedStatement#rows
     * @type {number}
     * @description
     * Number of rows to return at a time from a Prepared Statement's portal.
     * The default is 0, which means that all rows must be returned at once.
     */
    get rows() {
        return this._inner.options.rows;
    }

    set rows(value) {
        const _i = this._inner;
        if (value !== _i.options.rows) {
            _i.options.rows = value;
            _i.changed = true;
        }
    }
}

/**
 * @method PreparedStatement#parse
 * @description
 * Parses the current object and returns a simple `{name, text, values}`, if successful,
 * or else it returns a {@link errors.PreparedStatementError PreparedStatementError} object.
 *
 * This method is primarily for internal use by the library.
 *
 * @returns {{name, text, values}|errors.PreparedStatementError}
 */
PreparedStatement.prototype.parse = function () {

    const _i = this._inner, options = _i.options;

    const qf = options.text instanceof QueryFile ? options.text : null;

    if (!_i.changed && !qf) {
        return _i.target;
    }

    const errors = [], values = _i.target.values;
    _i.target = {
        name: options.name,
        text: options.text
    };
    _i.changed = true;
    _i.currentError = undefined;

    if (!npm.utils.isText(_i.target.name)) {
        errors.push('Property \'name\' must be a non-empty text string.');
    }

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

    if (options.rows !== undefined) {
        _i.target.rows = options.rows;
    }

    if (options.types !== undefined) {
        _i.target.types = options.types;
    }

    if (errors.length) {
        return _i.currentError = new PreparedStatementError(errors[0], _i.target);
    }

    _i.changed = false;

    return _i.target;
};

/**
 * @method PreparedStatement#toString
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
PreparedStatement.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    const gap = npm.utils.messageGap(level + 1);
    const ps = this.parse();
    const lines = [
        'PreparedStatement {',
        gap + 'name: ' + npm.utils.toJson(this.name)
    ];
    if (npm.utils.isText(ps.text)) {
        lines.push(gap + 'text: "' + ps.text + '"');
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
    if (this.rows !== undefined) {
        lines.push(gap + 'rows: ' + npm.utils.toJson(this.rows));
    }
    if (this.error) {
        lines.push(gap + 'error: ' + this.error.toString(level + 1));
    }
    lines.push(npm.utils.messageGap(level) + '}');
    return lines.join(npm.EOL);
};

module.exports = {PreparedStatement};

/**
 * @name PreparedStatement#text
 * @type {string|QueryFile}
 * @description
 * A non-empty query string or a {@link QueryFile} object.
 *
 * Only the basic variables (`$1`, `$2`, etc) can be used in the query, because $[Prepared Statements]
 * are formatted on the server side.
 *
 * Changing this property for the same {@link PreparedStatement#name name} will have no effect, because queries
 * for Prepared Statements are cached by the server, with {@link PreparedStatement#name name} being the cache key.
 */

/**
 * @name PreparedStatement#values
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
 * @name PreparedStatement#binary
 * @type {boolean}
 * @default undefined
 * @description
 * Activates binary result mode. The default is the text mode.
 *
 * @see {@link http://www.postgresql.org/docs/devel/static/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY Extended Query}
 */

/**
 * @name PreparedStatement#rowMode
 * @type {string}
 * @default undefined
 * @description
 * Changes the way data arrives to the client, with only one value supported by $[pg]:
 *  - `array` will make all data rows arrive as arrays of values. By default, rows arrive as objects.
 */

/**
 * @name PreparedStatement#types
 * @type {ITypes}
 * @default undefined
 * @description
 * Custom type parsers just for this query result.
 */

/**
 * @name PreparedStatement#error
 * @type {errors.PreparedStatementError}
 * @default undefined
 * @description
 * When in an error state, it is set to a {@link errors.PreparedStatementError PreparedStatementError} object. Otherwise, it is `undefined`.
 *
 * This property is primarily for internal use by the library.
 */
