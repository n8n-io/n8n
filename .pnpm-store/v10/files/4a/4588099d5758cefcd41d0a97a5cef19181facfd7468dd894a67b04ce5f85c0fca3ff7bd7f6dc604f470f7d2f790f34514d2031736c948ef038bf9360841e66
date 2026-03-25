/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {ColumnSet} = require('../column-set');

const npm = {
    format: require('../../formatting').as.format,
    utils: require('../../utils')
};

/**
 * @method helpers.sets
 * @description
 * Generates a string of comma-separated value-set statements from a single object: `col1=val1, col2=val2, ...`,
 * to be used as part of a query.
 *
 * Since it is to be used as part of `UPDATE` queries, {@link helpers.Column Column} properties `cnd` and `skip` apply.
 *
 * @param {object} data
 * A simple, non-null and non-array source object.
 *
 * If it is anything else, the method will throw {@link external:TypeError TypeError} = `Invalid parameter 'data' specified.`
 *
 * @param {array|helpers.Column|helpers.ColumnSet} [columns]
 * Columns for which to set values.
 *
 * When not specified, properties of the `data` object are used.
 *
 * When no effective columns are found, an empty string is returned.
 *
 * @returns {string}
 * - comma-separated value-set statements for the `data` object
 * - an empty string, if no effective columns found
 *
 * @see
 *  {@link helpers.Column Column},
 *  {@link helpers.ColumnSet ColumnSet}
 *
 * @example
 *
 * const pgp = require('pg-promise')();
 *
 * const data = {id: 1, val: 123, msg: 'hello'};
 *
 * // Properties can be pulled automatically from the object:
 *
 * pgp.helpers.sets(data);
 * //=> "id"=1,"val"=123,"msg"='hello'
 *
 * @example
 *
 * // Column details from a reusable ColumnSet (recommended for performance);
 * // NOTE: Conditional columns (start with '?') are skipped:
 * const {ColumnSet, sets} = pgp.helpers;
 *
 * const cs = new ColumnSet(['?id','val', 'msg']);
 *
 * sets(data, cs);
 * //=> "val"=123,"msg"='hello'
 *
 */
function sets(data, columns, capSQL) {

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new TypeError('Invalid parameter \'data\' specified.');
    }

    if (!(columns instanceof ColumnSet)) {
        columns = new ColumnSet(columns || data);
    }

    return npm.format(columns.assign({source: data}), columns.prepare(data), {capSQL});
}

module.exports = {sets};
