/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {InnerState} = require('../inner-state');
const {assert} = require('../assert');
const {TableName} = require('./table-name');
const {Column} = require('./column');

const npm = {
    os: require('os'),
    utils: require('../utils'),
    formatting: require('../formatting')
};

/**
 * @class helpers.ColumnSet
 * @description
 * Performance-optimized, read-only structure with query-formatting columns.
 *
 * In order to avail from performance optimization provided by this class, it should be created
 * only once, statically, and then reused.
 *
 * @param {object|helpers.Column|array} columns
 * Columns information object, depending on the type:
 *
 * - When it is a simple object, its properties are enumerated to represent both column names and property names
 *   within the source objects. See also option `inherit` that's applicable in this case.
 *
 * - When it is a single {@link helpers.Column Column} object, property {@link helpers.ColumnSet#columns columns} is initialized with
 *   just a single column. It is not a unique situation when only a single column is required for an update operation.
 *
 * - When it is an array, each element is assumed to represent details for a column. If the element is already of type {@link helpers.Column Column},
 *   it is used directly; otherwise the element is passed into {@link helpers.Column Column} constructor for initialization.
 *   On any duplicate column name (case-sensitive) it will throw {@link external:Error Error} = `Duplicate column name "name".`
 *
 * - When it is none of the above, it will throw {@link external:TypeError TypeError} = `Invalid parameter 'columns' specified.`
 *
 * @param {object} [options]
 *
 * @param {helpers.TableName|Table|string} [options.table]
 * Table details.
 *
 * When it is a non-null value, and not a {@link helpers.TableName TableName} object, a new {@link helpers.TableName TableName} is constructed from the value.
 *
 * It can be used as the default for methods {@link helpers.insert insert} and {@link helpers.update update} when their parameter
 * `table` is omitted, and for logging purposes.
 *
 * @param {boolean} [options.inherit = false]
 * Use inherited properties in addition to the object's own properties.
 *
 * By default, only the object's own properties are enumerated for column names.
 *
 * @returns {helpers.ColumnSet}
 *
 * @see
 *
 * {@link helpers.ColumnSet#columns columns},
 * {@link helpers.ColumnSet#names names},
 * {@link helpers.ColumnSet#table table},
 * {@link helpers.ColumnSet#variables variables} |
 * {@link helpers.ColumnSet#assign assign},
 * {@link helpers.ColumnSet#assignColumns assignColumns},
 * {@link helpers.ColumnSet#extend extend},
 * {@link helpers.ColumnSet#merge merge},
 * {@link helpers.ColumnSet#prepare prepare}
 *
 * @example
 *
 * // A complex insert/update object scenario for table 'purchases' in schema 'fiscal'.
 * // For a good performance, you should declare such objects once and then reuse them.
 * //
 * // Column Requirements:
 * //
 * // 1. Property 'id' is only to be used for a WHERE condition in updates
 * // 2. Property 'list' needs to be formatted as a csv
 * // 3. Property 'code' is to be used as raw text, and to be defaulted to 0 when the
 * //    property is missing in the source object
 * // 4. Property 'log' is a JSON object with 'log-entry' for the column name
 * // 5. Property 'data' requires SQL type casting '::int[]'
 * // 6. Property 'amount' needs to be set to 100, if it is 0
 * // 7. Property 'total' must be skipped during updates, if 'amount' was 0, plus its
 * //    column name is 'total-val'
 * const {ColumnSet} = pgp.helpers;
 *
 * const cs = new ColumnSet([
 *     '?id', // ColumnConfig equivalent: {name: 'id', cnd: true}
 *     'list:csv', // ColumnConfig equivalent: {name: 'list', mod: ':csv'}
 *     {
 *         name: 'code',
 *         mod: '^', // format as raw text
 *         def: 0 // default to 0 when the property doesn't exist
 *     },
 *     {
 *         name: 'log-entry',
 *         prop: 'log',
 *         mod: ':json' // format as JSON
 *     },
 *     {
 *         name: 'data',
 *         cast: 'int[]' // use SQL type casting '::int[]'
 *     },
 *     {
 *         name: 'amount',
 *         init(col) {
 *             // set to 100, if the value is 0:
 *             return col.value === 0 ? 100 : col.value;
 *         }
 *     },
 *     {
 *         name: 'total-val',
 *         prop: 'total',
 *         skip(col) {
 *             // skip from updates, if 'amount' is 0:
 *             return col.source.amount === 0;
 *         }
 *     }
 * ], {table: {table: 'purchases', schema: 'fiscal'}});
 *
 * // Alternatively, you could take the table declaration out:
 * // const table = new pgp.helpers.TableName('purchases', 'fiscal');
 *
 * console.log(cs); // console output for the object:
 * //=>
 * // ColumnSet {
 * //    table: "fiscal"."purchases"
 * //    columns: [
 * //        Column {
 * //            name: "id"
 * //            cnd: true
 * //        }
 * //        Column {
 * //            name: "list"
 * //            mod: ":csv"
 * //        }
 * //        Column {
 * //            name: "code"
 * //            mod: "^"
 * //            def: 0
 * //        }
 * //        Column {
 * //            name: "log-entry"
 * //            prop: "log"
 * //            mod: ":json"
 * //        }
 * //        Column {
 * //            name: "data"
 * //            cast: "int[]"
 * //        }
 * //        Column {
 * //            name: "amount"
 * //            init: [Function]
 * //        }
 * //        Column {
 * //            name: "total-val"
 * //            prop: "total"
 * //            skip: [Function]
 * //        }
 * //    ]
 * // }
 */
class ColumnSet extends InnerState {

    constructor(columns, opt) {
        super();

        if (!columns || typeof columns !== 'object') {
            throw new TypeError('Invalid parameter \'columns\' specified.');
        }

        opt = assert(opt, ['table', 'inherit']);

        if (!npm.utils.isNull(opt.table)) {
            this.table = (opt.table instanceof TableName) ? opt.table : new TableName(opt.table);
        }

        /**
         * @name helpers.ColumnSet#table
         * @type {helpers.TableName}
         * @readonly
         * @description
         * Destination table. It can be specified for two purposes:
         *
         * - **primary:** to be used as the default table when it is omitted during a call into methods {@link helpers.insert insert} and {@link helpers.update update}
         * - **secondary:** to be automatically written into the console (for logging purposes).
         */


        /**
         * @name helpers.ColumnSet#columns
         * @type helpers.Column[]
         * @readonly
         * @description
         * Array of {@link helpers.Column Column} objects.
         */
        if (Array.isArray(columns)) {
            const colNames = {};
            this.columns = columns.map(c => {
                const col = (c instanceof Column) ? c : new Column(c);
                if (col.name in colNames) {
                    throw new Error(`Duplicate column name "${col.name}".`);
                }
                colNames[col.name] = true;
                return col;
            });
        } else {
            if (columns instanceof Column) {
                this.columns = [columns];
            } else {
                this.columns = [];
                for (const name in columns) {
                    if (opt.inherit || Object.prototype.hasOwnProperty.call(columns, name)) {
                        this.columns.push(new Column(name));
                    }
                }
            }
        }

        Object.freeze(this.columns);
        Object.freeze(this);

        this.extendState({
            names: undefined,
            variables: undefined,
            updates: undefined,
            isSimple: true
        });

        for (let i = 0; i < this.columns.length; i++) {
            const c = this.columns[i];
            // ColumnSet is simple when the source objects require no preparation,
            // and should be used directly:
            if (c.prop || c.init || 'def' in c) {
                this._inner.isSimple = false;
                break;
            }
        }
    }

    /**
     * @name helpers.ColumnSet#names
     * @type string
     * @readonly
     * @description
     * Returns a string - comma-separated list of all column names, properly escaped.
     *
     * @example
     * const cs = new ColumnSet(['id^', {name: 'cells', cast: 'int[]'}, 'doc:json']);
     * console.log(cs.names);
     * //=> "id","cells","doc"
     */
    get names() {
        const _i = this._inner;
        if (!_i.names) {
            _i.names = this.columns.map(c => c.escapedName).join();
        }
        return _i.names;
    }

    /**
     * @name helpers.ColumnSet#variables
     * @type string
     * @readonly
     * @description
     * Returns a string - formatting template for all column values.
     *
     * @see {@link helpers.ColumnSet#assign assign}
     *
     * @example
     * const cs = new ColumnSet(['id^', {name: 'cells', cast: 'int[]'}, 'doc:json']);
     * console.log(cs.variables);
     * //=> ${id^},${cells}::int[],${doc:json}
     */
    get variables() {
        const _i = this._inner;
        if (!_i.variables) {
            _i.variables = this.columns.map(c => c.variable + c.castText).join();
        }
        return _i.variables;
    }

}

/**
 * @method helpers.ColumnSet#assign
 * @description
 * Returns a formatting template of SET assignments, either generic or for a single object.
 *
 * The method is optimized to cache the output string when there are no columns that can be skipped dynamically.
 *
 * This method is primarily for internal use, that's why it does not validate the input.
 *
 * @param {object} [options]
 * Assignment/formatting options.
 *
 * @param {object} [options.source]
 * Source - a single object that contains values for columns.
 *
 * The object is only necessary to correctly apply the logic of skipping columns dynamically, based on the source data
 * and the rules defined in the {@link helpers.ColumnSet ColumnSet}. If, however, you do not care about that, then you do not need to specify any object.
 *
 * Note that even if you do not specify the object, the columns marked as conditional (`cnd: true`) will always be skipped.
 *
 * @param {string} [options.prefix]
 * In cases where needed, an alias prefix to be added before each column.
 *
 * @returns {string}
 * Comma-separated list of variable-to-column assignments.
 *
 * @see {@link helpers.ColumnSet#variables variables}
 *
 * @example
 *
 * const cs = new pgp.helpers.ColumnSet([
 *     '?first', // = {name: 'first', cnd: true}
 *     'second:json',
 *     {name: 'third', mod: ':raw', cast: 'text'}
 * ]);
 *
 * cs.assign();
 * //=> "second"=${second:json},"third"=${third:raw}::text
 *
 * cs.assign({prefix: 'a b c'});
 * //=> "a b c"."second"=${second:json},"a b c"."third"=${third:raw}::text
 */
ColumnSet.prototype.assign = function (options) {
    const _i = this._inner;
    const hasPrefix = options && options.prefix && typeof options.prefix === 'string';
    if (_i.updates && !hasPrefix) {
        return _i.updates;
    }
    let dynamic = hasPrefix;
    const hasSource = options && options.source && typeof options.source === 'object';
    let list = this.columns.filter(c => {
        if (c.cnd) {
            return false;
        }
        if (c.skip) {
            dynamic = true;
            if (hasSource) {
                const a = colDesc(c, options.source);
                if (c.skip.call(options.source, a)) {
                    return false;
                }
            }
        }
        return true;
    });

    const prefix = hasPrefix ? npm.formatting.as.alias(options.prefix) + '.' : '';
    list = list.map(c => prefix + c.escapedName + '=' + c.variable + c.castText).join();

    if (!dynamic) {
        _i.updates = list;
    }
    return list;
};

/**
 * @method helpers.ColumnSet#assignColumns
 * @description
 * Generates assignments for all columns in the set, with support for aliases and column-skipping logic.
 * Aliases are set by using method {@link formatting.alias as.alias}.
 *
 * @param {{}} [options]
 * Optional Parameters.
 *
 * @param {string} [options.from]
 * Alias for the source columns.
 *
 * @param {string} [options.to]
 * Alias for the destination columns.
 *
 * @param {string | Array<string> | function} [options.skip]
 * Name(s) of the column(s) to be skipped (case-sensitive). It can be either a single string or an array of strings.
 *
 * It can also be a function - iterator, to be called for every column, passing in {@link helpers.Column Column} as
 * `this` context, and plus as a single parameter. The function would return a truthy value for every column that needs to be skipped.
 *
 * @returns {string}
 * A string of comma-separated column assignments.
 *
 * @example
 *
 * const cs = new ColumnSet(['id', 'city', 'street']);
 *
 * cs.assignColumns({from: 'EXCLUDED', skip: 'id'})
 * //=> "city"=EXCLUDED."city","street"=EXCLUDED."street"
 *
 * @example
 *
 * const cs = new ColumnSet(['?id', 'city', 'street']);
 *
 * cs.assignColumns({from: 'source', to: 'target', skip: c => c.cnd})
 * //=> target."city"=source."city",target."street"=source."street"
 *
 */
ColumnSet.prototype.assignColumns = function (options) {
    options = assert(options, ['from', 'to', 'skip']);
    const skip = (typeof options.skip === 'string' && [options.skip]) || ((Array.isArray(options.skip) || typeof options.skip === 'function') && options.skip);
    const from = (typeof options.from === 'string' && options.from && (npm.formatting.as.alias(options.from) + '.')) || '';
    const to = (typeof options.to === 'string' && options.to && (npm.formatting.as.alias(options.to) + '.')) || '';
    const iterator = typeof skip === 'function' ? c => !skip.call(c, c) : c => skip.indexOf(c.name) === -1;
    const cols = skip ? this.columns.filter(iterator) : this.columns;
    return cols.map(c => to + c.escapedName + '=' + from + c.escapedName).join();
};

/**
 * @method helpers.ColumnSet#extend
 * @description
 * Creates a new {@link helpers.ColumnSet ColumnSet}, by joining the two sets of columns.
 *
 * If the two sets contain a column with the same `name` (case-sensitive), an error is thrown.
 *
 * @param {helpers.Column|helpers.ColumnSet|array} columns
 * Columns to be appended, of the same type as parameter `columns` during {@link helpers.ColumnSet ColumnSet} construction, except:
 * - it can also be of type {@link helpers.ColumnSet ColumnSet}
 * - it cannot be a simple object (properties enumeration is not supported here)
 *
 * @returns {helpers.ColumnSet}
 * New {@link helpers.ColumnSet ColumnSet} object with the extended/concatenated list of columns.
 *
 * @see
 * {@link helpers.Column Column},
 * {@link helpers.ColumnSet#merge merge}
 *
 * @example
 *
 * const pgp = require('pg-promise')();
 *
 * const cs = new pgp.helpers.ColumnSet(['one', 'two'], {table: 'my-table'});
 * console.log(cs);
 * //=>
 * // ColumnSet {
 * //    table: "my-table"
 * //    columns: [
 * //        Column {
 * //            name: "one"
 * //        }
 * //        Column {
 * //            name: "two"
 * //        }
 * //    ]
 * // }
 * const csExtended = cs.extend(['three']);
 * console.log(csExtended);
 * //=>
 * // ColumnSet {
 * //    table: "my-table"
 * //    columns: [
 * //        Column {
 * //            name: "one"
 * //        }
 * //        Column {
 * //            name: "two"
 * //        }
 * //        Column {
 * //            name: "three"
 * //        }
 * //    ]
 * // }
 */
ColumnSet.prototype.extend = function (columns) {
    let cs = columns;
    if (!(cs instanceof ColumnSet)) {
        cs = new ColumnSet(columns);
    }
    // Any duplicate column will throw Error = 'Duplicate column name "name".',
    return new ColumnSet(this.columns.concat(cs.columns), {table: this.table});
};

/**
 * @method helpers.ColumnSet#merge
 * @description
 * Creates a new {@link helpers.ColumnSet ColumnSet}, by joining the two sets of columns.
 *
 * Items in `columns` with the same `name` (case-sensitive) override the original columns.
 *
 * @param {helpers.Column|helpers.ColumnSet|array} columns
 * Columns to be appended, of the same type as parameter `columns` during {@link helpers.ColumnSet ColumnSet} construction, except:
 * - it can also be of type {@link helpers.ColumnSet ColumnSet}
 * - it cannot be a simple object (properties enumeration is not supported here)
 *
 * @see
 * {@link helpers.Column Column},
 * {@link helpers.ColumnSet#extend extend}
 *
 * @returns {helpers.ColumnSet}
 * New {@link helpers.ColumnSet ColumnSet} object with the merged list of columns.
 *
 * @example
 *
 * const pgp = require('pg-promise')();
 * const {ColumnSet} = pgp.helpers;
 *
 * const cs = new ColumnSet(['?one', 'two:json'], {table: 'my-table'});
 * console.log(cs);
 * //=>
 * // ColumnSet {
 * //    table: "my-table"
 * //    columns: [
 * //        Column {
 * //            name: "one"
 * //            cnd: true
 * //        }
 * //        Column {
 * //            name: "two"
 * //            mod: ":json"
 * //        }
 * //    ]
 * // }
 * const csMerged = cs.merge(['two', 'three^']);
 * console.log(csMerged);
 * //=>
 * // ColumnSet {
 * //    table: "my-table"
 * //    columns: [
 * //        Column {
 * //            name: "one"
 * //            cnd: true
 * //        }
 * //        Column {
 * //            name: "two"
 * //        }
 * //        Column {
 * //            name: "three"
 * //            mod: "^"
 * //        }
 * //    ]
 * // }
 *
 */
ColumnSet.prototype.merge = function (columns) {
    let cs = columns;
    if (!(cs instanceof ColumnSet)) {
        cs = new ColumnSet(columns);
    }
    const colNames = {}, cols = [];
    this.columns.forEach((c, idx) => {
        cols.push(c);
        colNames[c.name] = idx;
    });
    cs.columns.forEach(c => {
        if (c.name in colNames) {
            cols[colNames[c.name]] = c;
        } else {
            cols.push(c);
        }
    });
    return new ColumnSet(cols, {table: this.table});
};

/**
 * @method helpers.ColumnSet#prepare
 * @description
 * Prepares a source object to be formatted, by cloning it and applying the rules as set by the
 * columns configuration.
 *
 * This method is primarily for internal use, that's why it does not validate the input parameters.
 *
 * @param {object} source
 * The source object to be prepared, if required.
 *
 * It must be a non-`null` object, which the method does not validate, as it is
 * intended primarily for internal use by the library.
 *
 * @returns {object}
 * When the object needs to be prepared, the method returns a clone of the source object,
 * with all properties and values set according to the columns configuration.
 *
 * When the object does not need to be prepared, the original object is returned.
 */
ColumnSet.prototype.prepare = function (source) {
    if (this._inner.isSimple) {
        return source; // a simple ColumnSet requires no object preparation;
    }
    const target = {};
    this.columns.forEach(c => {
        const a = colDesc(c, source);
        if (c.init) {
            target[a.name] = c.init.call(source, a);
        } else {
            if (a.exists || 'def' in c) {
                target[a.name] = a.value;
            }
        }
    });
    return target;
};

function colDesc(column, source) {
    const a = {
        source,
        name: column.prop || column.name
    };
    a.exists = a.name in source;
    if (a.exists) {
        a.value = source[a.name];
    } else {
        a.value = 'def' in column ? column.def : undefined;
    }
    return a;
}

/**
 * @method helpers.ColumnSet#toString
 * @description
 * Creates a well-formatted multi-line string that represents the object.
 *
 * It is called automatically when writing the object into the console.
 *
 * @param {number} [level=0]
 * Nested output level, to provide visual offset.
 *
 * @returns {string}
 */
ColumnSet.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    const gap0 = npm.utils.messageGap(level),
        gap1 = npm.utils.messageGap(level + 1),
        lines = [
            'ColumnSet {'
        ];
    if (this.table) {
        lines.push(gap1 + 'table: ' + this.table);
    }
    if (this.columns.length) {
        lines.push(gap1 + 'columns: [');
        this.columns.forEach(c => {
            lines.push(c.toString(2));
        });
        lines.push(gap1 + ']');
    } else {
        lines.push(gap1 + 'columns: []');
    }
    lines.push(gap0 + '}');
    return lines.join(npm.os.EOL);
};

npm.utils.addInspection(ColumnSet, function () {
    return this.toString();
});

module.exports = {ColumnSet};
