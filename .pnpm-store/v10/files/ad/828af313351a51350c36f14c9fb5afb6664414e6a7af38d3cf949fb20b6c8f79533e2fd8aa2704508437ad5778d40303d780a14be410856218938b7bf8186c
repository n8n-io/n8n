/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {assert} = require('../../assert');
const {TableName} = require('../table-name');
const {ColumnSet} = require('../column-set');

const npm = {
    formatting: require('../../formatting'),
    utils: require('../../utils')
};

/**
 * @method helpers.update
 * @description
 * Generates a simplified `UPDATE` query for either one object or an array of objects.
 *
 * The resulting query needs a `WHERE` clause to be appended to it, to specify the update logic.
 * This is to allow for update conditions of any complexity that are easy to add.
 *
 * @param {object|object[]} data
 * An update object with properties for update values, or an array of such objects.
 *
 * When `data` is not a non-null object and not an array, it will throw {@link external:TypeError TypeError} = `Invalid parameter 'data' specified.`
 *
 * When `data` is an empty array, it will throw {@link external:TypeError TypeError} = `Cannot generate an UPDATE from an empty array.`
 *
 * When `data` is an array that contains a non-object value, the method will throw {@link external:Error Error} =
 * `Invalid update object at index N.`
 *
 * @param {array|helpers.Column|helpers.ColumnSet} [columns]
 * Set of columns to be updated.
 *
 * It is optional when `data` is a single object, and required when `data` is an array of objects. If not specified for an array
 * of objects, the method will throw {@link external:TypeError TypeError} = `Parameter 'columns' is required when updating multiple records.`
 *
 * When `columns` is not a {@link helpers.ColumnSet ColumnSet} object, a temporary {@link helpers.ColumnSet ColumnSet}
 * is created - from the value of `columns` (if it was specified), or from the value of `data` (if it is not an array).
 *
 * When the final {@link helpers.ColumnSet ColumnSet} is empty (no columns in it), the method will throw
 * {@link external:Error Error} = `Cannot generate an UPDATE without any columns.`, unless option `emptyUpdate` was specified.
 *
 * @param {helpers.TableName|Table|string} [table]
 * Table to be updated.
 *
 * It is normally a required parameter. But when `columns` is passed in as a {@link helpers.ColumnSet ColumnSet} object
 * with `table` set in it, that will be used when this parameter isn't specified. When neither is available, the method
 * will throw {@link external:Error Error} = `Table name is unknown.`
 *
 * @param {{}} [options]
 * An object with formatting options for multi-row `UPDATE` queries.
 *
 * @param {string} [options.tableAlias=t]
 * Name of the SQL variable that represents the destination table.
 *
 * @param {string} [options.valueAlias=v]
 * Name of the SQL variable that represents the values.
 *
 * @param {*} [options.emptyUpdate]
 * This is a convenience option, to avoid throwing an error when generating a conditional update results in no columns.
 *
 * When present, regardless of the value, this option overrides the method's behavior when applying `skip` logic results in no columns,
 * i.e. when every column is being skipped.
 *
 * By default, in that situation the method throws {@link external:Error Error} = `Cannot generate an UPDATE without any columns.`
 * But when this option is present, the method will instead return whatever value the option was passed.
 *
 * @returns {*}
 * An `UPDATE` query string that needs a `WHERE` condition appended.
 *
 * If it results in an empty update, and option `emptyUpdate` was passed in, then the method returns the value
 * to which the option was set.
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
 * const {update} = pgp.helpers;
 *
 * const dataSingle = {id: 1, val: 123, msg: 'hello'};
 * const dataMulti = [{id: 1, val: 123, msg: 'hello'}, {id: 2, val: 456, msg: 'world!'}];
 *
 * // Although column details can be taken from the data object, it is not
 * // a likely scenario for an update, unless updating the whole table:
 *
 * update(dataSingle, null, 'my-table');
 * //=> UPDATE "my-table" SET "id"=1,"val"=123,"msg"='hello'
 *
 * @example
 *
 * // A typical single-object update:
 *
 * // Dynamic conditions must be escaped/formatted properly:
 * const condition = pgp.as.format(' WHERE id = ${id}', dataSingle);
 *
 * update(dataSingle, ['val', 'msg'], 'my-table') + condition;
 * //=> UPDATE "my-table" SET "val"=123,"msg"='hello' WHERE id = 1
 *
 * @example
 *
 * // Column details are required for a multi-row `UPDATE`;
 * // Adding '?' in front of a column name means it is only for a WHERE condition:
 *
 * update(dataMulti, ['?id', 'val', 'msg'], 'my-table') + ' WHERE v.id = t.id';
 * //=> UPDATE "my-table" AS t SET "val"=v."val","msg"=v."msg" FROM (VALUES(1,123,'hello'),(2,456,'world!'))
 * //   AS v("id","val","msg") WHERE v.id = t.id
 *
 * @example
 *
 * // Column details from a reusable ColumnSet (recommended for performance):
 * const {ColumnSet, update} = pgp.helpers;
 *
 * const cs = new ColumnSet(['?id', 'val', 'msg'], {table: 'my-table'});
 *
 * update(dataMulti, cs) + ' WHERE v.id = t.id';
 * //=> UPDATE "my-table" AS t SET "val"=v."val","msg"=v."msg" FROM (VALUES(1,123,'hello'),(2,456,'world!'))
 * //   AS v("id","val","msg") WHERE v.id = t.id
 *
 * @example
 *
 * // Using parameter `options` to change the default alias names:
 *
 * update(dataMulti, cs, null, {tableAlias: 'X', valueAlias: 'Y'}) + ' WHERE Y.id = X.id';
 * //=> UPDATE "my-table" AS X SET "val"=Y."val","msg"=Y."msg" FROM (VALUES(1,123,'hello'),(2,456,'world!'))
 * //   AS Y("id","val","msg") WHERE Y.id = X.id
 *
 * @example
 *
 * // Handling an empty update
 * const {ColumnSet, update} = pgp.helpers;
 *
 * const cs = new ColumnSet(['?id', '?name'], {table: 'tt'}); // no actual update-able columns
 * const result = update(dataMulti, cs, null, {emptyUpdate: 123});
 * if(result === 123) {
 *    // We know the update is empty, i.e. no columns that can be updated;
 *    // And it didn't throw because we specified `emptyUpdate` option.
 * }
 */
function update(data, columns, table, options, capSQL) {

    if (!data || typeof data !== 'object') {
        throw new TypeError('Invalid parameter \'data\' specified.');
    }

    const isArray = Array.isArray(data);

    if (isArray && !data.length) {
        throw new TypeError('Cannot generate an UPDATE from an empty array.');
    }

    if (columns instanceof ColumnSet) {
        if (npm.utils.isNull(table)) {
            table = columns.table;
        }
    } else {
        if (isArray && npm.utils.isNull(columns)) {
            throw new TypeError('Parameter \'columns\' is required when updating multiple records.');
        }
        columns = new ColumnSet(columns || data);
    }

    options = assert(options, ['tableAlias', 'valueAlias', 'emptyUpdate']);

    const format = npm.formatting.as.format,
        useEmptyUpdate = 'emptyUpdate' in options,
        fmOptions = {capSQL};

    if (isArray) {
        const tableAlias = npm.formatting.as.alias(npm.utils.isNull(options.tableAlias) ? 't' : options.tableAlias);
        const valueAlias = npm.formatting.as.alias(npm.utils.isNull(options.valueAlias) ? 'v' : options.valueAlias);

        const q = capSQL ? sql.multi.capCase : sql.multi.lowCase;

        const actualColumns = columns.columns.filter(c => !c.cnd);

        if (checkColumns(actualColumns)) {
            return options.emptyUpdate;
        }

        checkTable();

        const targetCols = actualColumns.map(c => c.escapedName + '=' + valueAlias + '.' + c.escapedName).join();

        const values = data.map((d, index) => {
            if (!d || typeof d !== 'object') {
                throw new Error(`Invalid update object at index ${index}.`);
            }
            return '(' + format(columns.variables, columns.prepare(d), fmOptions) + ')';
        }).join();

        return format(q, [table.name, tableAlias, targetCols, values, valueAlias, columns.names], fmOptions);
    }

    const updates = columns.assign({source: data});

    if (checkColumns(updates)) {
        return options.emptyUpdate;
    }

    checkTable();

    const query = capSQL ? sql.single.capCase : sql.single.lowCase;

    return format(query, table.name) + format(updates, columns.prepare(data), fmOptions);

    function checkTable() {
        if (table && !(table instanceof TableName)) {
            table = new TableName(table);
        }
        if (!table) {
            throw new Error('Table name is unknown.');
        }
    }

    function checkColumns(cols) {
        if (!cols.length) {
            if (useEmptyUpdate) {
                return true;
            }
            throw new Error('Cannot generate an UPDATE without any columns.');
        }
    }
}

const sql = {
    single: {
        lowCase: 'update $1^ set ',
        capCase: 'UPDATE $1^ SET '
    },
    multi: {
        lowCase: 'update $1^ as $2^ set $3^ from (values$4^) as $5^($6^)',
        capCase: 'UPDATE $1^ AS $2^ SET $3^ FROM (VALUES$4^) AS $5^($6^)'
    }
};

module.exports = {update};
