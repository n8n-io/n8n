/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {Events} = require('./events');
const {assert} = require('./assert');
const {resultQuery, multiResultQuery, streamQuery} = require('./special-query');
const {ConnectionContext} = require('./context');
const {DatabasePool} = require('./database-pool');
const {queryResult} = require('./query-result');

const npm = {
    utils: require('./utils'),
    pubUtils: require('./utils/public'),
    connect: require('./connect'),
    query: require('./query'),
    task: require('./task'),
    text: require('./text')
};

/**
 * @class Database
 * @description
 *
 * Represents the database protocol, extensible via event {@link event:extend extend}.
 * This type is not available directly, it can only be created via the library's base call.
 *
 * **IMPORTANT:**
 *
 * For any given connection, you should only create a single {@link Database} object in a separate module,
 * to be shared in your application (see the code example below). If instead you keep creating the {@link Database}
 * object dynamically, your application will suffer from loss in performance, and will be getting a warning in a
 * development environment (when `NODE_ENV` = `development`):
 *
 * `WARNING: Creating a duplicate database object for the same connection.`
 *
 * If you ever see this warning, rectify your {@link Database} object initialization, so there is only one object
 * per connection details. See the example provided below.
 *
 * See also: property `noWarnings` in {@link module:pg-promise Initialization Options}.
 *
 * Note however, that in special cases you may need to re-create the database object, if its connection pool has been
 * shut-down externally. And in this case the library won't be showing any warning.
 *
 * @param {string|object} cn
 * Database connection details, which can be:
 *
 * - a configuration object
 * - a connection string
 *
 * For details see {@link https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax Connection Syntax}.
 *
 * The value can be accessed from the database object via property {@link Database.$cn $cn}.
 *
 * @param {*} [dc]
 * Database Context.
 *
 * Any object or value to be propagated through the protocol, to allow implementations and event handling
 * that depend on the database context.
 *
 * This is mainly to facilitate the use of multiple databases which may need separate protocol extensions,
 * or different implementations within a single task / transaction callback, depending on the database context.
 *
 * This parameter also adds uniqueness to the connection context that's used in combination with the connection
 * parameters, i.e. use of unique database context will prevent getting the warning about creating a duplicate
 * Database object.
 *
 * The value can be accessed from the database object via property {@link Database#$dc $dc}.
 *
 * @returns {Database}
 *
 * @see
 *
 * {@link Database#query query},
 * {@link Database#none none},
 * {@link Database#one one},
 * {@link Database#oneOrNone oneOrNone},
 * {@link Database#many many},
 * {@link Database#manyOrNone manyOrNone},
 * {@link Database#any any},
 * {@link Database#func func},
 * {@link Database#proc proc},
 * {@link Database#result result},
 * {@link Database#multiResult multiResult},
 * {@link Database#multi multi},
 * {@link Database#map map},
 * {@link Database#each each},
 * {@link Database#stream stream},
 * {@link Database#task task},
 * {@link Database#taskIf taskIf},
 * {@link Database#tx tx},
 * {@link Database#txIf txIf},
 * {@link Database#connect connect},
 * {@link Database#$config $config},
 * {@link Database#$cn $cn},
 * {@link Database#$dc $dc},
 * {@link Database#$pool $pool},
 * {@link event:extend extend}
 *
 * @example
 * // Proper way to initialize and share the Database object
 *
 * // Loading and initializing the library:
 * const pgp = require('pg-promise')({
 *     // Initialization Options
 * });
 *
 * // Preparing the connection details:
 * const cn = 'postgres://username:password@host:port/database';
 *
 * // Creating a new database instance from the connection details:
 * const db = pgp(cn);
 *
 * // Exporting the database object for shared use:
 * module.exports = db;
 */
function Database(cn, dc, config) {

    const dbThis = this,
        $p = config.promise,
        poolConnection = typeof cn === 'string' ? {connectionString: cn} : cn,
        pool = new config.pgp.pg.Pool(poolConnection),
        endMethod = pool.end;

    let destroyed;

    pool.end = cb => {
        const res = endMethod.call(pool, cb);
        dbThis.$destroy();
        return res;
    };

    pool.on('error', onError);

    /**
     * @method Database#connect
     *
     * @description
     * Acquires a new or existing connection, depending on the current state of the connection pool, and parameter `direct`.
     *
     * This method creates a shared connection for executing a chain of queries against it. The connection must be released
     * in the end of the chain by calling `done()` on the connection object.
     *
     * Method `done` takes one optional parameter - boolean `kill` flag, to signal the connection pool that you want it to kill
     * the physical connection. This flag is ignored for direct connections, as they always close when released.
     *
     * It should not be used just for chaining queries on the same connection, methods {@link Database#task task} and
     * {@link Database#tx tx} (for transactions) are to be used for that. This method is primarily for special cases, like
     * `LISTEN` notifications.
     *
     * **NOTE:** Even though this method exposes a {@link external:Client Client} object via property `client`,
     * you cannot call `client.end()` directly, or it will print an error into the console:
     * `Abnormal client.end() call, due to invalid code or failed server connection.`
     * You should only call method `done()` to release the connection.
     *
     * @param {object} [options]
     * Connection Options.
     *
     * @param {boolean} [options.direct=false]
     * Creates a new connection directly, as a stand-alone {@link external:Client Client} object, bypassing the connection pool.
     *
     * By default, all connections are acquired from the connection pool. But if you set this option, the library will instead
     * create a new {@link external:Client Client} object directly (separately from the pool), and then call its `connect` method.
     *
     * Note that specifically for direct connections, method `done` returns a {@link external:Promise Promise}, because those connections
     * are closed physically, which may take time.
     *
     * **WARNING:**
     *
     * Do not use this option for regular query execution, because it exclusively occupies one physical channel, and it cannot scale.
     * This option is only suitable for global connection usage, such as event listeners.
     *
     * @param {function} [options.onLost]
     * Notification callback of the lost/broken connection, called with the following parameters:
     *  - `err` - the original connectivity error
     *  - `e` - error context object, which contains:
     *    - `cn` - safe connection string/config (with the password hashed);
     *    - `dc` - Database Context, as was used during {@link Database} construction;
     *    - `start` - Date/Time (`Date` type) when the connection was established;
     *    - `client` - {@link external:Client Client} object that has lost the connection.
     *
     * The notification is mostly valuable with `direct: true`, to be able to re-connect direct/permanent connections by calling
     * method {@link Database#connect connect} again.
     *
     * You do not need to call `done` on lost connections, as it happens automatically. However, if you had event listeners
     * set up on the connection's `client` object, you should remove them to avoid leaks:
     *
     * ```js
     * function onLostConnection(err, e) {
     *     e.client.removeListener('my-event', myHandler);
     * }
     * ```
     *
     * For a complete example see $[Robust Listeners].
     *
     * @returns {external:Promise}
     * A promise object that represents the connection result:
     *  - resolves with the complete {@link Database} protocol, extended with:
     *    - property `client` of type {@link external:Client Client} that represents the open connection
     *    - method `done` that must be called in the end, in order to release the connection (returns a {@link external:Promise Promise}
     *      in case of direct connections)
     *    - methods `batch`, `page` and `sequence`, same as inside a {@link Task}
     *  - rejects with a connection-related error when it fails to connect.
     *
     * @see
     * {@link Database#task Database.task},
     * {@link Database#taskIf Database.taskIf},
     * {@link Database#tx Database.tx},
     * {@link Database#txIf Database.txIf}
     *
     * @example
     *
     * let sco; // shared connection object;
     *
     * db.connect()
     *     .then(obj => {
     *         // obj.client = new connected Client object;
     *
     *         sco = obj; // save the connection object;
     *
     *         // execute all the queries you need:
     *         return sco.any('SELECT * FROM Users');
     *     })
     *     .then(data => {
     *         // success
     *     })
     *     .catch(error => {
     *         // error
     *     })
     *     .finally(() => {
     *         // release the connection, if it was successful:
     *         if (sco) {
     *             // if you pass `true` into method done, i.e. done(true),
     *             // it will make the pool kill the physical connection.
     *             sco.done();
     *         }
     *     });
     *
     */
    this.connect = function (options) {
        options = options || {};
        const ctx = createContext();
        ctx.cnOptions = options;
        const self = {
            query(query, values, qrm) {
                if (!ctx.db) {
                    return $p.reject(new Error(npm.text.queryDisconnected));
                }
                return config.$npm.query.call(this, ctx, query, values, qrm);
            },
            done(kill) {
                if (!ctx.db) {
                    throw new Error(npm.text.looseQuery);
                }
                return ctx.disconnect(kill);
            },
            batch(values, opt) {
                return config.$npm.spex.batch.call(this, values, opt);
            },
            page(source, opt) {
                return config.$npm.spex.page.call(this, source, opt);
            },
            sequence(source, opt) {
                return config.$npm.spex.sequence.call(this, source, opt);
            }
        };
        const connection = options.direct ? config.$npm.connect.direct(ctx) : config.$npm.connect.pool(ctx, dbThis);
        return connection
            .then(db => {
                ctx.connect(db);
                self.client = db.client;
                extend(ctx, self);
                return self;
            });
    };

    /**
     * @method Database#query
     *
     * @description
     * Base query method that executes a generic query, expecting the return data according to parameter `qrm`.
     *
     * It performs the following steps:
     *
     *  1. Validates and formats the query via {@link formatting.format as.format}, according to the `query` and `values` passed in;
     *  2. For a root-level query (against the {@link Database} object), it requests a new connection from the pool;
     *  3. Executes the query;
     *  4. For a root-level query (against the {@link Database} object), it releases the connection back to the pool;
     *  5. Resolves/rejects, according to the data returned from the query and the value of `qrm`.
     *
     * Direct use of this method is not suitable for chaining queries, for performance reasons. It should be done
     * through either task or transaction context, see $[Chaining Queries].
     *
     * When receiving a multi-query result, only the last result is processed, ignoring the rest.
     *
     * @param {string|function|object} query
     * Query to be executed, which can be any of the following types:
     * - A non-empty query string
     * - A function that returns a query string or another function, i.e. recursive resolution
     *   is supported, passing in `values` as `this`, and as the first parameter.
     * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
     * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
     * - {@link QueryFile} object
     *
     * @param {array|value|function} [values]
     * Query formatting parameter(s), or a function that returns it.
     *
     * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
     * - a single value - to replace all `$1` occurrences
     * - an array of values - to replace all `$1`, `$2`, ... variables
     * - an object - to apply $[Named Parameters] formatting
     *
     * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
     * and `values` is not `null` or `undefined`, it is automatically set within such object,
     * as an override for its internal `values`.
     *
     * @param {queryResult} [qrm=queryResult.any]
     * {@link queryResult Query Result Mask}
     *
     * @returns {external:Promise}
     * A promise object that represents the query result according to `qrm`.
     */
    this.query = function (query, values, qrm) {
        const self = this, ctx = createContext();
        return config.$npm.connect.pool(ctx, dbThis)
            .then(db => {
                ctx.connect(db);
                return config.$npm.query.call(self, ctx, query, values, qrm);
            })
            .then(data => {
                ctx.disconnect();
                return data;
            })
            .catch(error => {
                ctx.disconnect();
                return $p.reject(error);
            });
    };

    /**
     * @member {object} Database#$config
     * @readonly
     * @description
     * This is a hidden property, to help integrating type {@link Database} directly with third-party libraries.
     *
     * Properties available in the object:
     * - `pgp` - instance of the entire library after initialization
     * - `options` - the library's {@link module:pg-promise Initialization Options} object
     * - `promiseLib` - instance of the promise library that's used
     * - `promise` - generic promise interface that uses `promiseLib` via 4 basic methods:
     *   - `promise((resolve, reject) => {})` - to create a new promise
     *   - `promise.resolve(value)` - to resolve with a value
     *   - `promise.reject(reason)` - to reject with a reason
     *   - `promise.all(iterable)` - to resolve an iterable list of promises
     * - `version` - this library's version
     * - `$npm` _(hidden property)_ - internal module cache
     *
     * @example
     *
     * // Using the promise protocol as configured by pg-promise:
     *
     * const $p = db.$config.promise;
     *
     * const resolvedPromise = $p.resolve('some data');
     * const rejectedPromise = $p.reject('some reason');
     *
     * const newPromise = $p((resolve, reject) => {
     *     // call either resolve(data) or reject(reason) here
     * });
     */
    npm.utils.addReadProp(this, '$config', config, true);

    /**
     * @member {string|object} Database#$cn
     * @readonly
     * @description
     * Database connection, as was passed in during the object's construction.
     *
     * This is a hidden property, to help integrating type {@link Database} directly with third-party libraries.
     *
     * @see Database
     */
    npm.utils.addReadProp(this, '$cn', cn, true);

    /**
     * @member {*} Database#$dc
     * @readonly
     * @description
     * Database Context, as was passed in during the object's construction.
     *
     * This is a hidden property, to help integrating type {@link Database} directly with third-party libraries.
     *
     * @see Database
     */
    npm.utils.addReadProp(this, '$dc', dc, true);

    /**
     * @member {external:pg-pool} Database#$pool
     * @readonly
     * @description
     * A $[pg-pool] object associated with the database object, as each {@link Database} creates its own $[pg-pool] instance.
     *
     * This is a hidden property, primarily for integrating type {@link Database} with third-party libraries that support
     * $[pg-pool] directly. Note however, that if you pass the pool object into a library that calls `pool.end()`, you will no longer be able
     * to use this {@link Database} object, and each query method will be rejecting with {@link external:Error Error} =
     * `Connection pool of the database object has been destroyed.`
     *
     * You can also use this object to shut down the pool, by calling `$pool.end()`.
     *
     * For more details see $[Library de-initialization].
     *
     * @see
     * {@link Database}
     * {@link module:pg-promise~end pgp.end}
     *
     * @example
     *
     * // Shutting down the connection pool of this database object,
     * // after all queries have finished in a run-though process:
     *
     * .then(() => {}) // processing the data
     * .catch() => {}) // handling the error
     * .finally(db.$pool.end); // shutting down the pool
     *
     */
    npm.utils.addReadProp(this, '$pool', pool, true);

    /**
     * @member {function} Database.$destroy
     * @readonly
     * @private
     * @description
     * Permanently shuts down the database object.
     */
    npm.utils.addReadProp(this, '$destroy', () => {
        if (!destroyed) {
            if (!pool.ending) {
                endMethod.call(pool);
            }
            DatabasePool.unregister(dbThis);
            pool.removeListener('error', onError);
            destroyed = true;
        }
    }, true);

    DatabasePool.register(this);

    extend(createContext(), this); // extending root protocol;

    function createContext() {
        return new ConnectionContext({cn, dc, options: config.options});
    }

    // Optional value-transformation helper:
    function transform(value, cb, thisArg) {
        return typeof cb === 'function' ? value.then(data => cb.call(thisArg, data)) : value;
    }

    ////////////////////////////////////////////////////
    // Injects additional methods into an access object,
    // extending the protocol's base method 'query'.
    function extend(ctx, obj) {

        /**
         * @method Database#none
         * @description
         * Executes a query that expects no data to be returned. If the query returns any data,
         * the method rejects.
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @returns {external:Promise<null>}
         * A promise object that represents the query result:
         * - When no records are returned, it resolves with `null`.
         * - When any data is returned, it rejects with {@link errors.QueryResultError QueryResultError}:
         *   - `.message` = `No return data was expected.`
         *   - `.code` = {@link errors.queryResultErrorCode.notEmpty queryResultErrorCode.notEmpty}
         */
        obj.none = function (query, values) {
            return obj.query.call(this, query, values, queryResult.none);
        };

        /**
         * @method Database#one
         * @description
         * Executes a query that expects exactly 1 row to be returned. When 0 or more than 1 rows are returned,
         * the method rejects.
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @param {function} [cb]
         * Value-transformation callback, to allow in-line value change.
         * When specified, the returned value replaces the original one.
         *
         * The function takes only one parameter - value resolved from the query.
         *
         * @param {*} [thisArg]
         * Value to use as `this` when executing the transformation callback.
         *
         * @returns {external:Promise}
         * A promise object that represents the query result:
         * - When 1 row is returned, it resolves with that row as a single object.
         * - When no rows are returned, it rejects with {@link errors.QueryResultError QueryResultError}:
         *   - `.message` = `No data returned from the query.`
         *   - `.code` = {@link errors.queryResultErrorCode.noData queryResultErrorCode.noData}
         * - When multiple rows are returned, it rejects with {@link errors.QueryResultError QueryResultError}:
         *   - `.message` = `Multiple rows were not expected.`
         *   - `.code` = {@link errors.queryResultErrorCode.multiple queryResultErrorCode.multiple}
         * - Resolves with the new value, if transformation callback `cb` was specified.
         *
         * @see
         * {@link Database#oneOrNone oneOrNone}
         *
         * @example
         *
         * // a query with in-line value transformation:
         * db.one('INSERT INTO Events VALUES($1) RETURNING id', [123], event => event.id)
         *     .then(data => {
         *         // data = a new event id, rather than an object with it
         *     });
         *
         * @example
         *
         * // a query with in-line value transformation + conversion:
         * db.one('SELECT count(*) FROM Users', [], c => +c.count)
         *     .then(count => {
         *         // count = a proper integer value, rather than an object with a string
         *     });
         *
         */
        obj.one = function (query, values, cb, thisArg) {
            const v = obj.query.call(this, query, values, queryResult.one);
            return transform(v, cb, thisArg);
        };

        /**
         * @method Database#many
         * @description
         * Executes a query that expects one or more rows to be returned. When the query returns no rows, the method rejects.
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @returns {external:Promise}
         * A promise object that represents the query result:
         * - When 1 or more rows are returned, it resolves with the array of rows.
         * - When no rows are returned, it rejects with {@link errors.QueryResultError QueryResultError}:
         *   - `.message` = `No data returned from the query.`
         *   - `.code` = {@link errors.queryResultErrorCode.noData queryResultErrorCode.noData}
         */
        obj.many = function (query, values) {
            return obj.query.call(this, query, values, queryResult.many);
        };

        /**
         * @method Database#oneOrNone
         * @description
         * Executes a query that expects 0 or 1 rows to be returned. It resolves with the row-object when 1 row is returned,
         * or with `null` when nothing is returned. When the query returns more than 1 row, the method rejects.
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @param {function} [cb]
         * Value-transformation callback, to allow in-line value change.
         * When specified, the returned value replaces the original one.
         *
         * The function takes only one parameter - value resolved from the query.
         *
         * @param {*} [thisArg]
         * Value to use as `this` when executing the transformation callback.
         *
         * @returns {external:Promise}
         * A promise object that represents the query result:
         * - When no rows are returned, it resolves with `null`.
         * - When 1 row is returned, it resolves with that row as a single object.
         * - When multiple rows are returned, it rejects with {@link errors.QueryResultError QueryResultError}:
         *   - `.message` = `Multiple rows were not expected.`
         *   - `.code` = {@link errors.queryResultErrorCode.multiple queryResultErrorCode.multiple}
         * - Resolves with the new value, if transformation callback `cb` was specified.
         *
         * @see
         * {@link Database#one one},
         * {@link Database#none none},
         * {@link Database#manyOrNone manyOrNone}
         *
         * @example
         *
         * // a query with in-line value transformation:
         * db.oneOrNone('SELECT id FROM Events WHERE type = $1', ['entry'], e => e && e.id)
         *     .then(data => {
         *         // data = the event id or null (rather than object or null)
         *     });
         *
         */
        obj.oneOrNone = function (query, values, cb, thisArg) {
            const v = obj.query.call(this, query, values, queryResult.one | queryResult.none);
            return transform(v, cb, thisArg);
        };

        /**
         * @method Database#manyOrNone
         * @description
         * Executes a query that can return any number of rows.
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @returns {external:Promise<Array>}
         * A promise object that represents the query result:
         * - When no rows are returned, it resolves with an empty array.
         * - When 1 or more rows are returned, it resolves with the array of rows.
         *
         * @see
         * {@link Database#any any},
         * {@link Database#many many},
         * {@link Database#none none}
         *
         */
        obj.manyOrNone = function (query, values) {
            return obj.query.call(this, query, values, queryResult.many | queryResult.none);
        };

        /**
         * @method Database#any
         * @description
         * Executes a query that can return any number of rows.
         * This is simply a shorter alias for method {@link Database#manyOrNone manyOrNone}.
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @returns {external:Promise<Array>}
         * A promise object that represents the query result:
         * - When no rows are returned, it resolves with an empty array.
         * - When 1 or more rows are returned, it resolves with the array of rows.
         *
         * @see
         * {@link Database#manyOrNone manyOrNone},
         * {@link Database#map map},
         * {@link Database#each each}
         *
         */
        obj.any = function (query, values) {
            return obj.query.call(this, query, values, queryResult.any);
        };

        /**
         * @method Database#result
         * @description
         * Executes a query without any expectation for the return data, and resolves with the
         * original $[Result] object when successful.
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @param {function} [cb]
         * Value-transformation callback, to allow in-line value change.
         * When specified, the returned value replaces the original one.
         *
         * The function takes only one parameter - value resolved from the query.
         *
         * @param {*} [thisArg]
         * Value to use as `this` when executing the transformation callback.
         *
         * @returns {external:Promise}
         * A promise object that represents the query result:
         * - resolves with the original $[Result] object (by default);
         * - resolves with the new value, if transformation callback `cb` was specified.
         *
         * @example
         *
         * // use of value transformation:
         * // deleting rows and returning the number of rows deleted
         * db.result('DELETE FROM Events WHERE id = $1', [123], r => r.rowCount)
         *     .then(data => {
         *         // data = number of rows that were deleted
         *     });
         *
         * @example
         *
         * // use of value transformation:
         * // getting only column details from a table
         * db.result('SELECT * FROM Users LIMIT 0', null, r => r.fields)
         *     .then(data => {
         *         // data = array of column descriptors
         *     });
         *
         */
        obj.result = function (query, values, cb, thisArg) {
            const v = obj.query.call(this, query, values, resultQuery);
            return transform(v, cb, thisArg);
        };

        /**
         * @method Database#multiResult
         * @description
         * Executes a multi-query string, without any expectation for the return data, and resolves with an array
         * of the original $[Result] objects when successful.
         *
         * The operation is atomic, i.e. all queries are executed in a single transaction, unless there are explicit
         * `BEGIN/COMMIT` commands included in the query string to divide it into multiple transactions.
         *
         * @param {string|function|object} query
         * Multi-query string to be executed, which can be any of the following types:
         * - A non-empty string that can contain any number of queries
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @returns {external:Promise<external:Result[]>}
         *
         * @see {@link Database#multi multi}
         *
         */
        obj.multiResult = function (query, values) {
            return obj.query.call(this, query, values, multiResultQuery);
        };

        /**
         * @method Database#multi
         * @description
         * Executes a multi-query string, without any expectation for the return data, and resolves with an array
         * of arrays of rows when successful.
         *
         * The operation is atomic, i.e. all queries are executed in a single transaction, unless there are explicit
         * `BEGIN/COMMIT` commands included in the query string to divide it into multiple transactions.
         *
         * @param {string|function|object} query
         * Multi-query string to be executed, which can be any of the following types:
         * - A non-empty string that can contain any number of queries
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @returns {external:Promise<Array<Array>>}
         *
         * @see {@link Database#multiResult multiResult}
         *
         * @example
         *
         * // Get data from 2 tables in a single request:
         * const [users, products] = await db.multi('SELECT * FROM users;SELECT * FROM products');
         *
         */
        obj.multi = function (query, values) {
            return obj.query.call(this, query, values, multiResultQuery)
                .then(data => data.map(a => a.rows));
        };

        /**
         * @method Database#stream
         * @description
         * Custom data streaming, with the help of $[pg-query-stream].
         *
         * This method doesn't work with the $[Native Bindings], and if option `pgNative`
         * is set, it will reject with `Streaming doesn't work with Native Bindings.`
         *
         * @param {QueryStream} qs
         * Stream object of type $[QueryStream].
         *
         * @param {Database.streamInitCB} initCB
         * Stream initialization callback.
         *
         * It is invoked with the same `this` context as the calling method.
         *
         * @returns {external:Promise}
         * Result of the streaming operation.
         *
         * Once the streaming has finished successfully, the method resolves with
         * `{processed, duration}`:
         * - `processed` - total number of rows processed;
         * - `duration` - streaming duration, in milliseconds.
         *
         * Possible rejections messages:
         * - `Invalid or missing stream object.`
         * - `Invalid stream state.`
         * - `Invalid or missing stream initialization callback.`
         */
        obj.stream = function (qs, init) {
            return obj.query.call(this, qs, init, streamQuery);
        };

        /**
         * @method Database#func
         * @description
         * Executes a database function that returns a table, abbreviating the full syntax
         * of `query('SELECT * FROM $1:alias($2:csv)', [funcName, values], qrm)`.
         *
         * @param {string} funcName
         * Name of the function to be executed.
         * When it is not same-case, or contains extended symbols, it is double-quoted, as per the `:alias` filter,
         * which also supports `.`, to auto-split into a composite name.
         *
         * @param {array|value|function} [values]
         * Parameters for the function - one value | array of values | function returning value(s).
         *
         * @param {queryResult} [qrm=queryResult.any] - {@link queryResult Query Result Mask}.
         *
         * @returns {external:Promise}
         *
         * A promise object as returned from method {@link Database#query query}, according to parameter `qrm`.
         *
         * @see
         * {@link Database#query query},
         * {@link Database#proc proc}
         */
        obj.func = function (funcName, values, qrm) {
            return obj.query.call(this, {entity: funcName, type: 'func'}, values, qrm);
        };

        /**
         * @method Database#proc
         * @description
         * Executes a stored procedure by name, abbreviating the full syntax of
         * `oneOrNone('CALL $1:alias($2:csv)', [procName, values], cb, thisArg)`.
         *
         * **NOTE:** This method uses the new `CALL` syntax that requires PostgreSQL v11 or later.
         *
         * @param {string} procName
         * Name of the stored procedure to be executed.
         * When it is not same-case, or contains extended symbols, it is double-quoted, as per the `:alias` filter,
         * which also supports `.`, to auto-split into a composite SQL name.
         *
         * @param {array|value|function} [values]
         * Parameters for the procedure - one value | array of values | function returning value(s).
         *
         * @param {function} [cb]
         * Value-transformation callback, to allow in-line value change.
         * When specified, the returned value replaces the original one.
         *
         * The function takes only one parameter - value resolved from the query.
         *
         * @param {*} [thisArg]
         * Value to use as `this` when executing the transformation callback.
         *
         * @returns {external:Promise}
         * When the procedure takes output parameters, a single object is returned, with
         * properties for the output values. Otherwise, the method resolves with `null`.
         * And if the value-transformation callback is provided, it overrides the result.
         *
         * @see
         * {@link Database#func func}
         */
        obj.proc = function (procName, values, cb, thisArg) {
            const v = obj.query.call(this, {
                entity: procName,
                type: 'proc'
            }, values, queryResult.one | queryResult.none);
            return transform(v, cb, thisArg);
        };

        /**
         * @method Database#map
         * @description
         * Creates a new array with the results of calling a provided function on every element in the array of rows
         * resolved by method {@link Database#any any}.
         *
         * It is a convenience method, to reduce the following code:
         *
         * ```js
         * db.any(query, values)
         *     .then(data => {
         *         return data.map((row, index, data) => {
         *              // return a new element
         *         });
         *     });
         * ```
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} values
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @param {function} cb
         * Function that produces an element of the new array, taking three arguments:
         * - `row` - the current row object being processed in the array
         * - `index` - the index of the current row being processed in the array
         * - `data` - the original array of rows resolved by method {@link Database#any any}
         *
         * @param {*} [thisArg]
         * Value to use as `this` when executing the callback.
         *
         * @returns {external:Promise<Array>}
         * Resolves with the new array of values returned from the callback.
         *
         * @see
         * {@link Database#any any},
         * {@link Database#each each},
         * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map Array.map}
         *
         * @example
         *
         * db.map('SELECT id FROM Users WHERE status = $1', ['active'], row => row.id)
         *     .then(data => {
         *         // data = array of active user id-s
         *     })
         *     .catch(error => {
         *        // error
         *     });
         *
         * @example
         *
         * db.tx(t => {
         *     return t.map('SELECT id FROM Users WHERE status = $1', ['active'], row => {
         *        return t.none('UPDATE Events SET checked = $1 WHERE userId = $2', [true, row.id]);
         *     }).then(t.batch);
         * })
         *     .then(data => {
         *         // success
         *     })
         *     .catch(error => {
         *         // error
         *     });
         *
         * @example
         *
         * // Build a list of active users, each with the list of user events:
         * db.task(t => {
         *     return t.map('SELECT id FROM Users WHERE status = $1', ['active'], user => {
         *         return t.any('SELECT * FROM Events WHERE userId = $1', user.id)
         *             .then(events=> {
         *                 user.events = events;
         *                 return user;
         *             });
         *     }).then(t.batch);
         * })
         *     .then(data => {
         *         // success
         *     })
         *     .catch(error => {
         *         // error
         *     });
         *
         */
        obj.map = function (query, values, cb, thisArg) {
            return obj.any.call(this, query, values)
                .then(data => data.map(cb, thisArg));
        };

        /**
         * @method Database#each
         * @description
         * Executes a provided function once per array element, for an array of rows resolved by method {@link Database#any any}.
         *
         * It is a convenience method to reduce the following code:
         *
         * ```js
         * db.any(query, values)
         *     .then(data => {
         *         data.forEach((row, index, data) => {
         *              // process the row
         *         });
         *         return data;
         *     });
         * ```
         *
         * When receiving a multi-query result, only the last result is processed, ignoring the rest.
         *
         * @param {string|function|object} query
         * Query to be executed, which can be any of the following types:
         * - A non-empty query string
         * - A function that returns a query string or another function, i.e. recursive resolution
         *   is supported, passing in `values` as `this`, and as the first parameter.
         * - Prepared Statement `{name, text, values, ...}` or {@link PreparedStatement} object
         * - Parameterized Query `{text, values, ...}` or {@link ParameterizedQuery} object
         * - {@link QueryFile} object
         *
         * @param {array|value|function} [values]
         * Query formatting parameter(s), or a function that returns it.
         *
         * When `query` is of type `string` or a {@link QueryFile} object, the `values` can be:
         * - a single value - to replace all `$1` occurrences
         * - an array of values - to replace all `$1`, `$2`, ... variables
         * - an object - to apply $[Named Parameters] formatting
         *
         * When `query` is a Prepared Statement or a Parameterized Query (or their class types),
         * and `values` is not `null` or `undefined`, it is automatically set within such object,
         * as an override for its internal `values`.
         *
         * @param {function} cb
         * Function to execute for each row, taking three arguments:
         * - `row` - the current row object being processed in the array
         * - `index` - the index of the current row being processed in the array
         * - `data` - the array of rows resolved by method {@link Database#any any}
         *
         * @param {*} [thisArg]
         * Value to use as `this` when executing the callback.
         *
         * @returns {external:Promise<Array<Object>>}
         * Resolves with the original array of rows.
         *
         * @see
         * {@link Database#any any},
         * {@link Database#map map},
         * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach Array.forEach}
         *
         * @example
         *
         * db.each('SELECT id, code, name FROM Events', [], row => {
         *     row.code = parseInt(row.code);
         * })
         *     .then(data => {
         *         // data = array of events, with 'code' converted into integer
         *     })
         *     .catch(error => {
         *         // error
         *     });
         *
         */
        obj.each = function (query, values, cb, thisArg) {
            return obj.any.call(this, query, values)
                .then(data => {
                    data.forEach(cb, thisArg);
                    return data;
                });
        };

        /**
         * @method Database#task
         * @description
         * Executes a callback function with automatically managed connection.
         *
         * When invoked on the root {@link Database} object, the method allocates the connection from the pool,
         * executes the callback, and once finished - releases the connection back to the pool.
         * However, when invoked inside another task or transaction, the method reuses the parent connection.
         *
         * This method should be used whenever executing more than one query at once, so the allocated connection
         * is reused between all queries, and released only after the task has finished (see $[Chaining Queries]).
         *
         * The callback function is called with one parameter - database protocol (same as `this`), extended with methods
         * {@link Task#batch batch}, {@link Task#page page}, {@link Task#sequence sequence}, plus property {@link Task#ctx ctx} -
         * the task context object. See class {@link Task} for more details.
         *
         * @param {string|number|Object} [options]
         * This parameter is optional, and presumed skipped when the first parameter is a function (`cb` parameter).
         *
         * When it is of type `string` or `number`, it is assumed to be option `tag` passed in directly. Otherwise,
         * it is expected to be an object with options as listed below.
         *
         * @param {} [options.tag]
         * Traceable context for the task (see $[tags]).
         *
         * @param {function} cb
         * Task callback function, to return the result that will determine either success or failure for the operation.
         *
         * The function can be either the first of the second parameter passed into the method.
         *
         * It also can be an ES7 `async` function.
         *
         * @returns {external:Promise}
         * A promise object with the result from the callback function.
         *
         * @see
         * {@link Task},
         * {@link Database#taskIf taskIf},
         * {@link Database#tx tx},
         * $[tags],
         * $[Chaining Queries]
         *
         * @example
         *
         * db.task('my-task', t => {
         *         // t.ctx = task context object
         *
         *         return t.one('SELECT id FROM Users WHERE name = $1', 'John')
         *             .then(user => {
         *                 return t.any('SELECT * FROM Events WHERE userId = $1', user.id);
         *             });
         *     })
         *     .then(data => {
         *         // success
         *         // data = as returned from the task's callback
         *     })
         *     .catch(error => {
         *         // error
         *     });
         *
         * @example
         *
         * // using an ES7 syntax for the callback:
         * db.task('my-task', async t {
         *         // t.ctx = task context object
         *
         *         const user = await t.one('SELECT id FROM Users WHERE name = $1', 'John');
         *         return t.any('SELECT * FROM Events WHERE userId = $1', user.id);
         *     })
         *     .then(data => {
         *         // success
         *         // data = as returned from the task's callback
         *     })
         *     .catch(error => {
         *         // error
         *     });
         *
         */
        obj.task = function () {
            const args = npm.pubUtils.taskArgs(arguments);
            assert(args.options, ['tag']);
            return taskProcessor.call(this, args, false);
        };

        /**
         * @method Database#taskIf
         * @description
         * Executes a conditional task that results in an actual new {@link Database#task task}, if either condition is met or
         * when it is necessary (on the top level), or else it reuses the current connection context.
         *
         * The default condition is `not in task or transaction`, to start a task only if currently not inside another task or transaction,
         * which is the same as calling the following:
         *
         * ```js
         * db.taskIf({cnd: t => !t.ctx}, cb => {})
         * ```
         *
         * It can be useful, if you want to simplify/reduce the task + log events footprint, by creating new tasks only when necessary.
         *
         * @param {string|number|Object} [options]
         * This parameter is optional, and presumed skipped when the first parameter is a function (`cb` parameter).
         *
         * When it is of type `string` or `number`, it is assumed to be option `tag` passed in directly. Otherwise,
         * it is expected to be an object with options as listed below.
         *
         * @param {} [options.tag]
         * Traceable context for the task/transaction (see $[tags]).
         *
         * @param {boolean|function} [options.cnd]
         * Condition for creating a ({@link Database#task task}), if it is met.
         * It can be either a simple boolean, or a callback function that takes the task context as `this` and as the first parameter.
         *
         * Default condition (when it is not specified):
         *
         * ```js
         * {cnd: t => !t.ctx}
         * ```
         *
         * @param {function} cb
         * Task callback function, to return the result that will determine either success or failure for the operation.
         *
         * The function can be either the first or the second parameter passed into the method.
         *
         * It also can be an ES7 `async` function.
         *
         * @returns {external:Promise}
         * A promise object with the result from the callback function.
         *
         * @see
         * {@link Task},
         * {@link Database#task Database.task},
         * {@link Database#tx Database.tx},
         * {@link Database#txIf Database.txIf},
         * {@link TaskContext}
         *
         */
        obj.taskIf = function () {
            const args = npm.pubUtils.taskArgs(arguments);
            assert(args.options, ['tag', 'cnd']);
            try {
                let cnd = args.options.cnd;
                if ('cnd' in args.options) {
                    cnd = typeof cnd === 'function' ? cnd.call(obj, obj) : !!cnd;
                } else {
                    cnd = !obj.ctx; // create task, if it is the top level
                }
                // reusable only if condition fails, and not top-level:
                args.options.reusable = !cnd && !!obj.ctx;
            } catch (e) {
                return $p.reject(e);
            }
            return taskProcessor.call(this, args, false);
        };

        /**
         * @method Database#tx
         * @description
         * Executes a callback function as a transaction, with automatically managed connection.
         *
         * When invoked on the root {@link Database} object, the method allocates the connection from the pool,
         * executes the callback, and once finished - releases the connection back to the pool.
         * However, when invoked inside another task or transaction, the method reuses the parent connection.
         *
         * A transaction wraps a regular {@link Database#task task} into additional queries:
         * - it executes `BEGIN` just before invoking the callback function
         * - it executes `COMMIT`, if the callback didn't throw any error or return a rejected promise
         * - it executes `ROLLBACK`, if the callback did throw an error or return a rejected promise
         * - it executes corresponding `SAVEPOINT` commands when the method is called recursively.
         *
         * The callback function is called with one parameter - database protocol (same as `this`), extended with methods
         * {@link Task#batch batch}, {@link Task#page page}, {@link Task#sequence sequence}, plus property {@link Task#ctx ctx} -
         * the transaction context object. See class {@link Task} for more details.
         *
         * Note that transactions should be chosen over tasks only where necessary, because unlike regular tasks,
         * transactions are blocking operations.
         *
         * @param {string|number|Object} [options]
         * This parameter is optional, and presumed skipped when the first parameter is a function (`cb` parameter).
         *
         * When it is of type `string` or `number`, it is assumed to be option `tag` passed in directly. Otherwise,
         * it is expected to be an object with options as listed below.
         *
         * @param {} [options.tag]
         * Traceable context for the transaction (see $[tags]).
         *
         * @param {txMode.TransactionMode} [options.mode]
         * Transaction Configuration Mode - extends the transaction-opening command with additional configuration.
         *
         * @param {function} cb
         * Transaction callback function, to return the result that will determine either success or failure for the operation.
         *
         * The function can be either the first of the second parameter passed into the method.
         *
         * It also can be an ES7 `async` function.
         *
         * @returns {external:Promise}
         * A promise object with the result from the callback function.
         *
         * @see
         * {@link Task},
         * {@link Database#task Database.task},
         * {@link Database#taskIf Database.taskIf},
         * {@link TaskContext},
         * $[tags],
         * $[Chaining Queries]
         *
         * @example
         *
         * db.tx('my-transaction', t => {
         *         // t.ctx = transaction context object
         *
         *         return t.one('INSERT INTO Users(name, age) VALUES($1, $2) RETURNING id', ['Mike', 25])
         *             .then(user => {
         *                 return t.batch([
         *                     t.none('INSERT INTO Events(userId, name) VALUES($1, $2)', [user.id, 'created']),
         *                     t.none('INSERT INTO Events(userId, name) VALUES($1, $2)', [user.id, 'login'])
         *                 ]);
         *             });
         *     })
         *     .then(data => {
         *         // success
         *         // data = as returned from the transaction's callback
         *     })
         *     .catch(error => {
         *         // error
         *     });
         *
         * @example
         *
         * // using an ES7 syntax for the callback:
         * db.tx('my-transaction', async t {
         *         // t.ctx = transaction context object
         *
         *         const user = await t.one('INSERT INTO Users(name, age) VALUES($1, $2) RETURNING id', ['Mike', 25]);
         *         return t.none('INSERT INTO Events(userId, name) VALUES($1, $2)', [user.id, 'created']);
         *     })
         *     .then(data => {
         *         // success
         *         // data = as returned from the transaction's callback
         *     })
         *     .catch(error => {
         *         // error
         *     });
         *
         */
        obj.tx = function () {
            const args = npm.pubUtils.taskArgs(arguments);
            assert(args.options, ['tag', 'mode']);
            return taskProcessor.call(this, args, true);
        };

        /**
         * @method Database#txIf
         * @description
         * Executes a conditional transaction that results in an actual transaction ({@link Database#tx tx}), if the condition is met,
         * or else it executes a regular {@link Database#task task}.
         *
         * The default condition is `not in transaction`, to start a transaction only if currently not in transaction,
         * or else start a task, which is the same as calling the following:
         *
         * ```js
         * db.txIf({cnd: t => !t.ctx || !t.ctx.inTransaction}, cb => {})
         * ```
         *
         * It is useful when you want to avoid $[Nested Transactions] - savepoints.
         *
         * @param {string|number|Object} [options]
         * This parameter is optional, and presumed skipped when the first parameter is a function (`cb` parameter).
         *
         * When it is of type `string` or `number`, it is assumed to be option `tag` passed in directly. Otherwise,
         * it is expected to be an object with options as listed below.
         *
         * @param {} [options.tag]
         * Traceable context for the task/transaction (see $[tags]).
         *
         * @param {txMode.TransactionMode} [options.mode]
         * Transaction Configuration Mode - extends the transaction-opening command with additional configuration.
         *
         * @param {boolean|function} [options.cnd]
         * Condition for opening a transaction ({@link Database#tx tx}), if it is met, or a {@link Database#task task} when the condition is not met.
         * It can be either a simple boolean, or a callback function that takes the task/tx context as `this` and as the first parameter.
         *
         * Default condition (when it is not specified):
         *
         * ```js
         * {cnd: t => !t.ctx || !t.ctx.inTransaction}
         * ```
         *
         * @param {boolean|function} [options.reusable=false]
         * When `cnd` is/returns false, reuse context of the current task/transaction, if one exists.
         * It can be either a simple boolean, or a callback function that takes the task/tx context as `this`
         * and as the first parameter.
         *
         * By default, when `cnd` is/returns false, the method creates a new task. This option tells
         * the method to reuse the current task/transaction context, and not create a new task.
         *
         * This option is ignored when executing against the top level of the protocol, because on
         * that level, if no transaction is suddenly needed, a new task becomes necessary.
         *
         * @param {function} cb
         * Transaction/task callback function, to return the result that will determine either
         * success or failure for the operation.
         *
         * The function can be either the first or the second parameter passed into the method.
         *
         * It also can be an ES7 `async` function.
         *
         * @returns {external:Promise}
         * A promise object with the result from the callback function.
         *
         * @see
         * {@link Task},
         * {@link Database#task Database.task},
         * {@link Database#taskIf Database.taskIf},
         * {@link Database#tx Database.tx},
         * {@link TaskContext}
         */
        obj.txIf = function () {
            const args = npm.pubUtils.taskArgs(arguments);
            assert(args.options, ['tag', 'mode', 'cnd', 'reusable']);
            try {
                let cnd;
                if ('cnd' in args.options) {
                    cnd = args.options.cnd;
                    cnd = typeof cnd === 'function' ? cnd.call(obj, obj) : !!cnd;
                } else {
                    cnd = !obj.ctx || !obj.ctx.inTransaction;
                }
                args.options.cnd = cnd;
                const reusable = args.options.reusable;
                args.options.reusable = !cnd && obj.ctx && typeof reusable === 'function' ? reusable.call(obj, obj) : !!reusable;
            } catch (e) {
                return $p.reject(e);
            }
            return taskProcessor.call(this, args, args.options.cnd);
        };

        // Task method;
        // Resolves with result from the callback function;
        function taskProcessor(params, isTX) {

            if (typeof params.cb !== 'function') {
                return $p.reject(new TypeError('Callback function is required.'));
            }

            if (params.options.reusable) {
                return config.$npm.task.callback(obj.ctx, obj, params.cb, config);
            }

            const taskCtx = ctx.clone(); // task context object;
            if (isTX) {
                taskCtx.txLevel = taskCtx.txLevel >= 0 ? (taskCtx.txLevel + 1) : 0;
            }
            taskCtx.inTransaction = taskCtx.txLevel >= 0;
            taskCtx.level = taskCtx.level >= 0 ? (taskCtx.level + 1) : 0;
            taskCtx.cb = params.cb; // callback function;
            taskCtx.mode = params.options.mode; // transaction mode;
            if (this !== obj) {
                taskCtx.context = this; // calling context object;
            }

            const tsk = new config.$npm.task.Task(taskCtx, params.options.tag, isTX, config);
            taskCtx.taskCtx = tsk.ctx;
            extend(taskCtx, tsk);

            if (taskCtx.db) {
                // reuse existing connection;
                npm.utils.addReadProp(tsk.ctx, 'useCount', taskCtx.db.useCount);
                addServerVersion(tsk.ctx, taskCtx.db.client);
                return config.$npm.task.execute(taskCtx, tsk, isTX, config);
            }

            // connection required;
            return config.$npm.connect.pool(taskCtx, dbThis)
                .then(db => {
                    taskCtx.connect(db);
                    npm.utils.addReadProp(tsk.ctx, 'useCount', db.useCount);
                    addServerVersion(tsk.ctx, db.client);
                    return config.$npm.task.execute(taskCtx, tsk, isTX, config);
                })
                .then(data => {
                    taskCtx.disconnect();
                    return data;
                })
                .catch(error => {
                    taskCtx.disconnect();
                    return $p.reject(error);
                });
        }

        function addServerVersion(target, client) {
            // Exclude else-case from coverage, because it can only occur with Native Bindings.
            // istanbul ignore else
            if (client.serverVersion) {
                npm.utils.addReadProp(target, 'serverVersion', client.serverVersion);
            }
        }

        // extending the protocol;
        Events.extend(ctx.options, obj, ctx.dc);
    }

}

// this event only happens when the connection is lost physically,
// which cannot be tested automatically; removing from coverage:
// istanbul ignore next
function onError(err) {
    // this client was never seen by pg-promise, which
    // can happen if it failed to initialize
    if (!err.client.$ctx) {
        return;
    }
    const ctx = err.client.$ctx;
    Events.error(ctx.options, err, {
        cn: npm.utils.getSafeConnection(ctx.cn),
        dc: ctx.dc
    });
}

module.exports = config => {
    const npmLocal = config.$npm;
    npmLocal.connect = npmLocal.connect || npm.connect(config);
    npmLocal.query = npmLocal.query || npm.query(config);
    npmLocal.task = npmLocal.task || npm.task(config);
    return Database;
};

/**
 * @callback Database.streamInitCB
 * @description
 * Stream initialization callback, used by {@link Database#stream Database.stream}.
 *
 * @param {external:Stream} stream
 * Stream object to initialize streaming.
 *
 * @example
 * const QueryStream = require('pg-query-stream');
 * const JSONStream = require('JSONStream');
 *
 * // you can also use pgp.as.format(query, values, options)
 * // to format queries properly, via pg-promise;
 * const qs = new QueryStream('SELECT * FROM users');
 *
 * db.stream(qs, stream => {
 *         // initiate streaming into the console:
 *         stream.pipe(JSONStream.stringify()).pipe(process.stdout);
 *     })
 *     .then(data => {
 *         console.log('Total rows processed:', data.processed,
 *           'Duration in milliseconds:', data.duration);
 *     })
 *     .catch(error => {
 *         // error;
 *     });
 */

/**
 * @external Stream
 * @see https://nodejs.org/api/stream.html
 */

/**
 * @external pg-pool
 * @alias pg-pool
 * @see https://github.com/brianc/node-pg-pool
 */

/**
 * @external Result
 * @see https://node-postgres.com/apis/result
 */
