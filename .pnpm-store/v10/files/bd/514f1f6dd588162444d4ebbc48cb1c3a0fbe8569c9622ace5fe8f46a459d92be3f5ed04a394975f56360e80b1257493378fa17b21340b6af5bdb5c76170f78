/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {Events} = require('./events');

const npm = {
    spex: require('spex'),
    utils: require('./utils'),
    mode: require('./tx-mode'),
    query: require('./query'),
    text: require('./text')
};

/**
 * @interface Task
 * @description
 * Extends {@link Database} for an automatic connection session, with methods for executing multiple database queries.
 *
 * The type isn't available directly, it can only be created via methods {@link Database#task Database.task}, {@link Database#tx Database.tx},
 * or their derivations.
 *
 * When executing more than one request at a time, one should allocate and release the connection only once,
 * while executing all the required queries within the same connection session. More importantly, a transaction
 * can only work within a single connection.
 *
 * This is an interface for tasks/transactions to implement a connection session, during which you can
 * execute multiple queries against the same connection that's released automatically when the task/transaction is finished.
 *
 * Each task/transaction manages the connection automatically. When executed on the root {@link Database} object, the connection
 * is allocated from the pool, and once the method's callback has finished, the connection is released back to the pool.
 * However, when invoked inside another task or transaction, the method reuses the parent connection.
 *
 * @see
 * {@link Task#ctx ctx},
 * {@link Task#batch batch},
 * {@link Task#sequence sequence},
 * {@link Task#page page}
 *
 * @example
 * db.task(t => {
 *       // t = task protocol context;
 *       // t.ctx = Task Context;
 *       return t.one('select * from users where id=$1', 123)
 *           .then(user => {
 *               return t.any('select * from events where login=$1', user.name);
 *           });
 *   })
 * .then(events => {
 *       // success;
 *   })
 * .catch(error => {
 *       // error;
 *   });
 *
 */
function Task(ctx, tag, isTX, config) {

    const $p = config.promise;

    /**
     * @member {TaskContext} Task#ctx
     * @readonly
     * @description
     * Task/Transaction Context object - contains individual properties for each task/transaction.
     *
     * @see event {@link event:query query}
     *
     * @example
     *
     * db.task(t => {
     *     return t.ctx; // task context object
     * })
     *     .then(ctx => {
     *         console.log('Task Duration:', ctx.duration);
     *     });
     *
     * @example
     *
     * db.tx(t => {
     *     return t.ctx; // transaction context object
     * })
     *     .then(ctx => {
     *         console.log('Transaction Duration:', ctx.duration);
     *     });
     */
    this.ctx = ctx.ctx = {}; // task context object;

    npm.utils.addReadProp(this.ctx, 'isTX', isTX);

    if ('context' in ctx) {
        npm.utils.addReadProp(this.ctx, 'context', ctx.context);
    }

    npm.utils.addReadProp(this.ctx, 'connected', !ctx.db);
    npm.utils.addReadProp(this.ctx, 'tag', tag);
    npm.utils.addReadProp(this.ctx, 'dc', ctx.dc);
    npm.utils.addReadProp(this.ctx, 'level', ctx.level);
    npm.utils.addReadProp(this.ctx, 'inTransaction', ctx.inTransaction);

    if (isTX) {
        npm.utils.addReadProp(this.ctx, 'txLevel', ctx.txLevel);
    }

    npm.utils.addReadProp(this.ctx, 'parent', ctx.parentCtx);

    // generic query method;
    this.query = function (query, values, qrm) {
        if (!ctx.db) {
            return $p.reject(new Error(npm.text.looseQuery));
        }
        return config.$npm.query.call(this, ctx, query, values, qrm);
    };

    /**
     * @deprecated
     * Consider using <b>async/await</b> syntax instead, or if you must have
     * pre-generated promises, then $[Promise.allSettled].
     *
     * @method Task#batch
     * @description
     * Settles a predefined array of mixed values by redirecting to method $[spex.batch].
     *
     * For complete method documentation see $[spex.batch].
     *
     * @param {array} values
     * @param {Object} [options]
     * Optional Parameters.
     * @param {function} [options.cb]
     *
     * @returns {external:Promise}
     */
    this.batch = function (values, options) {
        return config.$npm.spex.batch.call(this, values, options);
    };

    /**
     * @method Task#page
     * @description
     * Resolves a dynamic sequence of arrays/pages with mixed values, by redirecting to method $[spex.page].
     *
     * For complete method documentation see $[spex.page].
     *
     * @param {function} source
     * @param {Object} [options]
     * Optional Parameters.
     * @param {function} [options.dest]
     * @param {number} [options.limit=0]
     *
     * @returns {external:Promise}
     */
    this.page = function (source, options) {
        return config.$npm.spex.page.call(this, source, options);
    };

    /**
     * @method Task#sequence
     * @description
     * Resolves a dynamic sequence of mixed values by redirecting to method $[spex.sequence].
     *
     * For complete method documentation see $[spex.sequence].
     *
     * @param {function} source
     * @param {Object} [options]
     * Optional Parameters.
     * @param {function} [options.dest]
     * @param {number} [options.limit=0]
     * @param {boolean} [options.track=false]
     *
     * @returns {external:Promise}
     */
    this.sequence = function (source, options) {
        return config.$npm.spex.sequence.call(this, source, options);
    };

}

/**
 * @private
 * @method Task.callback
 * Callback invocation helper.
 *
 * @param ctx
 * @param obj
 * @param cb
 * @param config
 * @returns {Promise.<TResult>}
 */
const callback = (ctx, obj, cb, config) => {

    const $p = config.promise;
    let result;

    try {
        if (cb.constructor.name === 'GeneratorFunction') {
            // v9.0 dropped all support for ES6 generator functions;
            // Clients should use the new ES7 async/await syntax.
            throw new TypeError('ES6 generator functions are no longer supported!');
        }
        result = cb.call(obj, obj); // invoking the callback function;
    } catch (err) {
        Events.error(ctx.options, err, {
            client: ctx.db && ctx.db.client, // the error can be due to loss of connectivity
            dc: ctx.dc,
            ctx: ctx.ctx
        });
        return $p.reject(err); // reject with the error;
    }
    if (result && typeof result.then === 'function') {
        return result; // result is a valid promise object;
    }
    return $p.resolve(result);
};

/**
 * @private
 * @method Task.execute
 * Executes a task.
 *
 * @param ctx
 * @param obj
 * @param isTX
 * @param config
 * @returns {Promise.<TResult>}
 */
const execute = (ctx, obj, isTX, config) => {

    const $p = config.promise;

    // updates the task context and notifies the client;
    function update(start, success, result) {
        const c = ctx.ctx;
        if (start) {
            npm.utils.addReadProp(c, 'start', new Date());
        } else {
            c.finish = new Date();
            c.success = success;
            c.result = result;
            c.duration = c.finish - c.start;
        }
        (isTX ? Events.transact : Events.task)(ctx.options, {
            client: ctx.db && ctx.db.client, // loss of connectivity is possible at this point
            dc: ctx.dc,
            ctx: c
        });
    }

    let cbData, cbReason, success,
        spName; // Save-Point Name;

    const capSQL = ctx.options.capSQL; // capitalize sql;

    update(true);

    if (isTX) {
        // executing a transaction;
        spName = `sp_${ctx.txLevel}_${ctx.nextTxCount}`;
        return begin()
            .then(() => callback(ctx, obj, ctx.cb, config)
                .then(data => {
                    cbData = data; // save callback data;
                    success = true;
                    return commit();
                }, err => {
                    cbReason = err; // save callback failure reason;
                    return rollback();
                })
                .then(() => {
                    if (success) {
                        update(false, true, cbData);
                        return cbData;
                    }
                    update(false, false, cbReason);
                    return $p.reject(cbReason);
                },
                err => {
                    // either COMMIT or ROLLBACK has failed, which is impossible
                    // to replicate in a test environment, so skipping from the test;
                    // istanbul ignore next:
                    update(false, false, err);
                    // istanbul ignore next:
                    return $p.reject(err);
                }),
            err => {
                // BEGIN has failed, which is impossible to replicate in a test
                // environment, so skipping the whole block from the test;
                // istanbul ignore next:
                update(false, false, err);
                // istanbul ignore next:
                return $p.reject(err);
            });
    }

    function begin() {
        if (!ctx.txLevel && ctx.mode instanceof npm.mode.TransactionMode) {
            return exec(ctx.mode.begin(capSQL), 'savepoint');
        }
        return exec('begin', 'savepoint');
    }

    function commit() {
        return exec('commit', 'release savepoint');
    }

    function rollback() {
        return exec('rollback', 'rollback to savepoint');
    }

    function exec(top, nested) {
        if (ctx.txLevel) {
            return obj.none((capSQL ? nested.toUpperCase() : nested) + ' ' + spName);
        }
        return obj.none(capSQL ? top.toUpperCase() : top);
    }

    // executing a task;
    return callback(ctx, obj, ctx.cb, config)
        .then(data => {
            update(false, true, data);
            return data;
        })
        .catch(error => {
            update(false, false, error);
            return $p.reject(error);
        });
};

module.exports = config => {
    const npmLocal = config.$npm;

    // istanbul ignore next:
    // we keep 'npm.query' initialization here, even though it is always
    // pre-initialized by the 'database' module, for integrity purpose.
    npmLocal.query = npmLocal.query || npm.query(config);
    npmLocal.spex = npmLocal.spex || npm.spex(config.promiseLib);

    return {
        Task, execute, callback
    };
};

/**
 * @typedef TaskContext
 * @description
 * Task/Transaction Context used via property {@link Task#ctx ctx} inside tasks (methods {@link Database#task Database.task} and {@link Database#taskIf Database.taskIf})
 * and transactions (methods {@link Database#tx Database.tx} and {@link Database#txIf Database.txIf}).
 *
 * Properties `context`, `connected`, `parent`, `level`, `dc`, `isTX`, `tag`, `start`, `useCount` and `serverVersion` are set just before the operation has started,
 * while properties `finish`, `duration`, `success` and `result` are set immediately after the operation has finished.
 *
 * @property {*} context
 * If the operation was invoked with a calling context - `task.call(context,...)` or `tx.call(context,...)`,
 * this property is set with the context that was passed in. Otherwise, the property doesn't exist.
 *
 * @property {*} dc
 * _Database Context_ that was passed into the {@link Database} object during construction.
 *
 * @property {boolean} isTX
 * Indicates whether this operation is a transaction (as opposed to a regular task).
 *
 * @property {number} duration
 * Number of milliseconds consumed by the operation.
 *
 * Set after the operation has finished, it is simply a shortcut for `finish - start`.
 *
 * @property {number} level
 * Task nesting level, starting from 0, counting both regular tasks and transactions.
 *
 * @property {number} txLevel
 * Transaction nesting level, starting from 0. Transactions on level 0 use `BEGIN/COMMIT/ROLLBACK`,
 * while transactions on nested levels use the corresponding `SAVEPOINT` commands.
 *
 * This property exists only within the context of a transaction (`isTX = true`).
 *
 * @property {boolean} inTransaction
 * Available in both tasks and transactions, it simplifies checking when there is a transaction
 * going on either on this level or above.
 *
 * For example, when you want to check for a containing transaction while inside a task, and
 * only start a transaction when there is none yet.
 *
 * @property {TaskContext} parent
 * Parent task/transaction context, or `null` when it is top-level.
 *
 * @property {boolean} connected
 * Indicates when the task/transaction acquired the connection on its own (`connected = true`), and will release it once
 * the operation has finished. When the value is `false`, the operation is reusing an existing connection.
 *
 * @property {*} tag
 * Tag value as it was passed into the task. See methods {@link Database#task task} and {@link Database#tx tx}.
 *
 * @property {Date} start
 * Date/Time of when this operation started the execution.
 *
 * @property {number} useCount
 * Number of times the connection has been previously used, starting with 0 for a freshly
 * allocated physical connection.
 *
 * @property {string} serverVersion
 * Version of the PostgreSQL server to which we are connected.
 * Not available with $[Native Bindings].
 *
 * @property {Date} finish
 * Once the operation has finished, this property is set to the Data/Time of when it happened.
 *
 * @property {boolean} success
 * Once the operation has finished, this property indicates whether it was successful.
 *
 * @property {*} result
 * Once the operation has finished, this property contains the result, depending on property `success`:
 * - data resolved by the operation, if `success = true`
 * - error / rejection reason, if `success = false`
 *
 */
