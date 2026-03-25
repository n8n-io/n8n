/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {Column} = require('./column');
const {ColumnSet} = require('./column-set');
const {TableName, _TN} = require('./table-name');
const method = require('./methods');

/**
 * @namespace helpers
 * @description
 * Namespace for query-formatting generators, available as {@link module:pg-promise~helpers pgp.helpers}, after initializing the library.
 *
 * It unifies the approach to generating multi-row `INSERT` / `UPDATE` queries with the single-row ones.
 *
 * See also: $[Performance Boost].
 *
 * @property {function} TableName
 * {@link helpers.TableName TableName} class constructor.
 *
 * @property {function} _TN
 * {@link helpers._TN _TN} Table-Name conversion function.
 *
 * @property {function} ColumnSet
 * {@link helpers.ColumnSet ColumnSet} class constructor.
 *
 * @property {function} Column
 * {@link helpers.Column Column} class constructor.
 *
 * @property {function} insert
 * {@link helpers.insert insert} static method.
 *
 * @property {function} update
 * {@link helpers.update update} static method.
 *
 * @property {function} values
 * {@link helpers.values values} static method.
 *
 * @property {function} sets
 * {@link helpers.sets sets} static method.
 *
 * @property {function} concat
 * {@link helpers.concat concat} static method.
 */
module.exports = config => {
    const capSQL = () => config.options && config.options.capSQL;
    const res = {
        insert(data, columns, table) {
            return method.insert(data, columns, table, capSQL());
        },
        update(data, columns, table, options) {
            return method.update(data, columns, table, options, capSQL());
        },
        concat(queries) {
            return method.concat(queries, capSQL());
        },
        values(data, columns) {
            return method.values(data, columns, capSQL());
        },
        sets(data, columns) {
            return method.sets(data, columns, capSQL());
        },
        TableName,
        _TN,
        ColumnSet,
        Column
    };
    return res;
};
