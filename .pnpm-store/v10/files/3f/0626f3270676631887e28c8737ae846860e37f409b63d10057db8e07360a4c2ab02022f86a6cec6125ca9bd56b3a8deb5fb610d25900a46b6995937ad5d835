/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {QueryFile} = require('../../query-file');

const npm = {
    formatting: require('../../formatting')
};

/**
 * @method helpers.concat
 * @description
 * Formats and concatenates multiple queries into a single query string.
 *
 * Before joining the queries, the method does the following:
 *  - Formats each query, if `values` are provided;
 *  - Removes all leading and trailing spaces, tabs and semi-colons;
 *  - Automatically skips all empty queries.
 *
 * @param {array<string|helpers.QueryFormat|QueryFile>} queries
 * Array of mixed-type elements:
 * - a simple query string, to be used as is
 * - a {@link helpers.QueryFormat QueryFormat}-like object = `{query, [values], [options]}`
 * - a {@link QueryFile} object
 *
 * @returns {string}
 * Concatenated string with all queries.
 *
 * @example
 *
 * const pgp = require('pg-promise')();
 *
 * const qf1 = new pgp.QueryFile('./query1.sql', {minify: true});
 * const qf2 = new pgp.QueryFile('./query2.sql', {minify: true});
 *
 * const query = pgp.helpers.concat([
 *     {query: 'INSERT INTO Users(name, age) VALUES($1, $2)', values: ['John', 23]}, // QueryFormat-like object
 *     {query: qf1, values: [1, 'Name']}, // QueryFile with formatting parameters
 *     'SELECT count(*) FROM Users', // a simple-string query,
 *     qf2 // direct QueryFile object
 * ]);
 *
 * // query = concatenated string with all the queries
 */
function concat(queries, capSQL) {
    if (!Array.isArray(queries)) {
        throw new TypeError('Parameter \'queries\' must be an array.');
    }
    const fmOptions = {capSQL};
    const all = queries.map((q, index) => {
        if (typeof q === 'string') {
            // a simple query string without parameters:
            return clean(q);
        }
        if (q && typeof q === 'object') {
            if (q instanceof QueryFile) {
                // QueryFile object:
                return clean(q[npm.formatting.as.ctf.toPostgres]());
            }
            if ('query' in q) {
                // object {query, values, options}:
                let opt = q.options && typeof q.options === 'object' ? q.options : {};
                opt = opt.capSQL === undefined ? Object.assign(opt, fmOptions) : opt;
                return clean(npm.formatting.as.format(q.query, q.values, opt));
            }
        }
        throw new Error(`Invalid query element at index ${index}.`);
    });

    return all.filter(q => q).join(';');
}

function clean(q) {
    // removes from the query all leading and trailing symbols ' ', '\t' and ';'
    return q.replace(/^[\s;]*|[\s;]*$/g, '');
}

module.exports = {concat};

/**
 * @typedef helpers.QueryFormat
 * @description
 * A simple structure of parameters to be passed into method {@link formatting.format as.format} exactly as they are,
 * used by {@link helpers.concat}.
 *
 * @property {string|value|object} query
 * A query string or a value/object that implements $[Custom Type Formatting], to be formatted according to `values`.
 *
 * @property {array|object|value} [values]
 * Query-formatting values.
 *
 * @property {object} [options]
 * Query-formatting options, as supported by method {@link formatting.format as.format}.
 *
 * @see
 * {@link formatting.format as.format}
 */
