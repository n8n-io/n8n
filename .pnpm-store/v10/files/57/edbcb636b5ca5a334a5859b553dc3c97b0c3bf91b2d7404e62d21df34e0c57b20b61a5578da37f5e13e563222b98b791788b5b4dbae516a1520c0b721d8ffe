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
    formatting: require('../../formatting'),
    utils: require('../../utils')
};

/**
 * @method helpers.values
 * @description
 * Generates a string of comma-separated value groups from either one object or an array of objects,
 * to be used as part of a query:
 *
 * - from a single object: `(val_1, val_2, ...)`
 * - from an array of objects: `(val_11, val_12, ...), (val_21, val_22, ...)`
 *
 * @param {object|object[]} data
 * A source object with properties as values, or an array of such objects.
 *
 * If it is anything else, the method will throw {@link external:TypeError TypeError} = `Invalid parameter 'data' specified.`
 *
 * When `data` is an array that contains a non-object value, the method will throw {@link external:Error Error} =
 * `Invalid object at index N.`
 *
 * When `data` is an empty array, an empty string is returned.
 *
 * @param {array|helpers.Column|helpers.ColumnSet} [columns]
 * Columns for which to return values.
 *
 * It is optional when `data` is a single object, and required when `data` is an array of objects. If not specified for an array
 * of objects, the method will throw {@link external:TypeError TypeError} = `Parameter 'columns' is required when generating multi-row values.`
 *
 * When the final {@link helpers.ColumnSet ColumnSet} is empty (no columns in it), the method will throw
 * {@link external:Error Error} = `Cannot generate values without any columns.`
 *
 * @returns {string}
 * - comma-separated value groups, according to `data`
 * - an empty string, if `data` is an empty array
 *
 * @see
 *  {@link helpers.Column Column},
 *  {@link helpers.ColumnSet ColumnSet}
 *
 * @example
 *
 * const pgp = require('pg-promise')();
 *
 * const dataSingle = {val: 123, msg: 'hello'};
 * const dataMulti = [{val: 123, msg: 'hello'}, {val: 456, msg: 'world!'}];
 *
 * // Properties can be pulled automatically from a single object:
 *
 * pgp.helpers.values(dataSingle);
 * //=> (123,'hello')
 *
 * @example
 *
 * // Column details are required when using an array of objects:
 *
 * pgp.helpers.values(dataMulti, ['val', 'msg']);
 * //=> (123,'hello'),(456,'world!')
 *
 * @example
 *
 * // Column details from a reusable ColumnSet (recommended for performance):
 * const {ColumnSet, values} = pgp.helpers;
 *
 * const cs = new ColumnSet(['val', 'msg']);
 *
 * values(dataMulti, cs);
 * //=> (123,'hello'),(456,'world!')
 *
 */
function values(data, columns, capSQL) {

    if (!data || typeof data !== 'object') {
        throw new TypeError('Invalid parameter \'data\' specified.');
    }

    const isArray = Array.isArray(data);

    if (!(columns instanceof ColumnSet)) {
        if (isArray && npm.utils.isNull(columns)) {
            throw new TypeError('Parameter \'columns\' is required when generating multi-row values.');
        }
        columns = new ColumnSet(columns || data);
    }

    if (!columns.columns.length) {
        throw new Error('Cannot generate values without any columns.');
    }

    const format = npm.formatting.as.format,
        fmOptions = {capSQL};

    if (isArray) {
        return data.map((d, index) => {
            if (!d || typeof d !== 'object') {
                throw new Error(`Invalid object at index ${index}.`);
            }
            return '(' + format(columns.variables, columns.prepare(d), fmOptions) + ')';
        }).join();
    }
    return '(' + format(columns.variables, columns.prepare(data), fmOptions) + ')';
}

module.exports = {values};
