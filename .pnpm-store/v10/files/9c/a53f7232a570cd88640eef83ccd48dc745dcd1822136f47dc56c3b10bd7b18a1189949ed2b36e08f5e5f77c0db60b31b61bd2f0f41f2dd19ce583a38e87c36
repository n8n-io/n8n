/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {TableName} = require('../table-name');
const {ColumnSet} = require('../column-set');

const npm = {
    formatting: require('../../formatting'),
    utils: require('../../utils')
};

/**
 * @method helpers.insert
 * @description
 * Generates an `INSERT` query for either one object or an array of objects.
 *
 * @param {object|object[]} data
 * An insert object with properties for insert values, or an array of such objects.
 *
 * When `data` is not a non-null object and not an array, it will throw {@link external:TypeError TypeError} = `Invalid parameter 'data' specified.`
 *
 * When `data` is an empty array, it will throw {@link external:TypeError TypeError} = `Cannot generate an INSERT from an empty array.`
 *
 * When `data` is an array that contains a non-object value, the method will throw {@link external:Error Error} =
 * `Invalid insert object at index N.`
 *
 * @param {array|helpers.Column|helpers.ColumnSet} [columns]
 * Set of columns to be inserted.
 *
 * It is optional when `data` is a single object, and required when `data` is an array of objects. If not specified for an array
 * of objects, the method will throw {@link external:TypeError TypeError} = `Parameter 'columns' is required when inserting multiple records.`
 *
 * When `columns` is not a {@link helpers.ColumnSet ColumnSet} object, a temporary {@link helpers.ColumnSet ColumnSet}
 * is created - from the value of `columns` (if it was specified), or from the value of `data` (if it is not an array).
 *
 * When the final {@link helpers.ColumnSet ColumnSet} is empty (no columns in it), the method will throw
 * {@link external:Error Error} = `Cannot generate an INSERT without any columns.`
 *
 * @param {helpers.TableName|Table|string} [table]
 * Destination table.
 *
 * It is normally a required parameter. But when `columns` is passed in as a {@link helpers.ColumnSet ColumnSet} object
 * with `table` set in it, that will be used when this parameter isn't specified. When neither is available, the method
 * will throw {@link external:Error Error} = `Table name is unknown.`
 *
 * @returns {string}
 * An `INSERT` query string.
 *
 * @see
 *  {@link helpers.Column Column},
 *  {@link helpers.ColumnSet ColumnSet},
 *  {@link helpers.TableName TableName}
 *
 * @example
 *
 * const pgp = require('pg-promise')({
 *    capSQL: true // if you want all generated SQL capitalized
 * });
 * const {insert} = pgp.helpers;
 *
 * const dataSingle = {val: 123, msg: 'hello'};
 * const dataMulti = [{val: 123, msg: 'hello'}, {val: 456, msg: 'world!'}];
 *
 * // Column details can be taken from the data object:
 *
 * insert(dataSingle, null, 'my-table');
 * //=> INSERT INTO "my-table"("val","msg") VALUES(123,'hello')
 *
 * @example
 *
 * // Column details are required for a multi-row `INSERT`:
 * const {insert} = pgp.helpers;
 *
 * insert(dataMulti, ['val', 'msg'], 'my-table');
 * //=> INSERT INTO "my-table"("val","msg") VALUES(123,'hello'),(456,'world!')
 *
 * @example
 *
 * // Column details from a reusable ColumnSet (recommended for performance):
 * const {ColumnSet, insert} = pgp.helpers;
 *
 * const cs = new ColumnSet(['val', 'msg'], {table: 'my-table'});
 *
 * insert(dataMulti, cs);
 * //=> INSERT INTO "my-table"("val","msg") VALUES(123,'hello'),(456,'world!')
 *
 */
function insert(data, columns, table, capSQL) {

    if (!data || typeof data !== 'object') {
        throw new TypeError('Invalid parameter \'data\' specified.');
    }

    const isArray = Array.isArray(data);

    if (isArray && !data.length) {
        throw new TypeError('Cannot generate an INSERT from an empty array.');
    }

    if (columns instanceof ColumnSet) {
        if (npm.utils.isNull(table)) {
            table = columns.table;
        }
    } else {
        if (isArray && npm.utils.isNull(columns)) {
            throw new TypeError('Parameter \'columns\' is required when inserting multiple records.');
        }
        columns = new ColumnSet(columns || data);
    }

    if (!columns.columns.length) {
        throw new Error('Cannot generate an INSERT without any columns.');
    }

    if (!table) {
        throw new Error('Table name is unknown.');
    }

    if (!(table instanceof TableName)) {
        table = new TableName(table);
    }

    let query = capSQL ? sql.capCase : sql.lowCase;
    const fmOptions = {capSQL};

    const format = npm.formatting.as.format;
    query = format(query, [table.name, columns.names], fmOptions);

    if (isArray) {
        return query + data.map((d, index) => {
            if (!d || typeof d !== 'object') {
                throw new Error(`Invalid insert object at index ${index}.`);
            }
            return '(' + format(columns.variables, columns.prepare(d), fmOptions) + ')';
        }).join();
    }
    return query + '(' + format(columns.variables, columns.prepare(data), fmOptions) + ')';
}

const sql = {
    lowCase: 'insert into $1^($2^) values',
    capCase: 'INSERT INTO $1^($2^) VALUES'
};

module.exports = {insert};
