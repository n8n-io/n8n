/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {assert} = require('../assert');

const npm = {
    utils: require('../utils'),
    format: require('../formatting').as // formatting namespace
};

/**
 * @class helpers.TableName
 * @description
 * Represents a full table name that can be injected into queries directly.
 *
 * This is a read-only type that can be used wherever parameter `table` is supported.
 *
 * It supports $[Custom Type Formatting], which means you can use the type directly as a formatting
 * parameter, without specifying any escaping.
 *
 * Filter `:alias` is an alternative approach to splitting an SQL name into multiple ones.
 *
 * @param {string|Table} table
 * Table name details, depending on the type:
 *
 * - table name, if `table` is a string
 * - {@link Table} object
 *
 * @property {string} name
 * Formatted/escaped full table name, combining `schema` + `table`.
 *
 * @property {string} table
 * Table name.
 *
 * @property {string} schema
 * Database schema name.
 *
 * It is `undefined` when no valid schema was specified.
 *
 * @returns {helpers.TableName}
 *
 * @see
 * {@link helpers._TN _TN},
 * {@link helpers.TableName#toPostgres toPostgres}
 *
 * @example
 *
 * const table = new pgp.helpers.TableName({table: 'my-table', schema: 'my-schema'});
 * console.log(table);
 * //=> "my-schema"."my-table"
 *
 * // Formatting the type directly:
 * pgp.as.format('SELECT * FROM $1', table);
 * //=> SELECT * FROM "my-schema"."my-table"
 *
 */
class TableName {

    constructor(table) {
        if (typeof table === 'string') {
            this.table = table;
        } else {
            const config = assert(table, ['table', 'schema']);
            this.table = config.table;
            if (npm.utils.isText(config.schema)) {
                this.schema = config.schema;
            }
        }
        if (!npm.utils.isText(this.table)) {
            throw new TypeError('Table name must be a non-empty text string.');
        }
        this.name = npm.format.name(this.table);
        if (this.schema) {
            this.name = npm.format.name(this.schema) + '.' + this.name;
        }
        Object.freeze(this);
    }
}

/**
 * @method helpers.TableName#toPostgres
 * @description
 * $[Custom Type Formatting], based on $[Symbolic CTF], i.e. the actual method is available only via {@link external:Symbol Symbol}:
 *
 * ```js
 * const {toPostgres} = pgp.as.ctf; // Custom Type Formatting symbols namespace
 * const fullName = tn[toPostgres]; // tn = an object of type TableName
 * ```
 *
 * This is a raw formatting type (`rawType = true`), i.e. when used as a query-formatting parameter, type `TableName`
 * injects full table name as raw text.
 *
 * @param {helpers.TableName} [self]
 * Optional self-reference, for ES6 arrow functions.
 *
 * @returns {string}
 * Escaped full table name that includes optional schema name, if specified.
 */
TableName.prototype[npm.format.ctf.toPostgres] = function (self) {
    self = this instanceof TableName && this || self;
    return self.name;
};

TableName.prototype[npm.format.ctf.rawType] = true; // use as pre-formatted

/**
 * @method helpers.TableName#toString
 * @description
 * Creates a well-formatted string that represents the object.
 *
 * It is called automatically when writing the object into the console.
 *
 * @returns {string}
 */
TableName.prototype.toString = function () {
    return this.name;
};

npm.utils.addInspection(TableName, function () {
    return this.toString();
});

/**
 * @interface Table
 * @description
 * Structure for any table name/path.
 *
 * Function {@link helpers._TN _TN} can help you construct it from a string.
 *
 * @property {string} [schema] - schema name, if specified
 * @property {string} table - table name
 *
 * @see {@link helpers.TableName TableName}, {@link helpers._TN _TN}
 */

/**
 * @external TemplateStringsArray
 * @see https://microsoft.github.io/PowerBI-JavaScript/interfaces/_node_modules_typedoc_node_modules_typescript_lib_lib_es5_d_.templatestringsarray.html
 */

/**
 * @function helpers._TN
 * @description
 * Table-Name helper function, to convert any `"schema.table"` string
 * into `{schema, table}` object. It also works as a template-tag function.
 *
 * @param {string|TemplateStringsArray} path
 * Table-name path, as a simple string or a template string (with parameters).
 *
 * @example
 * const {ColumnSet, _TN} = pgp.helpers;
 *
 * // Using as a regular function:
 * const cs1 = new ColumnSet(['id', 'name'], {table: _TN('schema.table')});
 *
 * // Using as a template-tag function:
 * const schema = 'schema';
 * const cs2 = new ColumnSet(['id', 'name'], {table: _TN`${schema}.table`});
 *
 * @returns {Table}
 *
 * @see {@link helpers.TableName TableName}, {@link external:TemplateStringsArray TemplateStringsArray}
 */
function _TN(path, ...args) {
    if (Array.isArray(path)) {
        path = path.reduce((a, c, i) => a + c + (args[i] ?? ''), '');
    } // else 'path' is a string
    const [schema, table] = path.split('.');
    if (table === undefined) {
        return {table: schema};
    }
    return schema ? {schema, table} : {table};
}

module.exports = {TableName, _TN};
