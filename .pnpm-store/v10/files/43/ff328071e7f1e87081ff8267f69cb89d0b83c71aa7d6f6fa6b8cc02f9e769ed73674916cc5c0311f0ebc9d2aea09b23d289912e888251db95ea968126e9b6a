/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {ColorConsole} = require('./utils/color');

const npm = {
    main: require('./'),
    utils: require('./utils')
};

/////////////////////////////////
// Client notification helpers;
class Events {

    /**
     * @event connect
     * @description
     * Global notification of acquiring a new database connection from the connection pool, i.e. a virtual connection.
     *
     * However, for direct calls to method {@link Database#connect Database.connect} with parameter `{direct: true}`,
     * this event represents a physical connection.
     *
     * The library will suppress any error thrown by the handler and write it into the console.
     *
     * @param {{}} e Event Properties
     *
     * @param {external:Client} e.client
     * $[pg.Client] object that represents the connection.
     *
     * @param {*} e.dc
     * Database Context that was used when creating the database object (see {@link Database}).
     *
     * @param {number} e.useCount
     * Number of times the connection has been previously used, starting with 0, for a freshly
     * allocated physical connection.
     *
     * This parameter is always 0 for direct connections (created by calling {@link Database#connect Database.connect}
     * with parameter `{direct: true}`).
     *
     * @example
     *
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     connect(e) {
     *         const cp = e.client.connectionParameters;
     *         console.log('Connected to database:', cp.database);
     *     }
     *
     * };
     */
    static connect(ctx, client, useCount) {
        if (typeof ctx.options.connect === 'function') {
            try {
                ctx.options.connect({client, dc: ctx.dc, useCount});
            } catch (e) {
                // have to silence errors here;
                // cannot allow unhandled errors while connecting to the database,
                // as it will break the connection logic;
                Events.unexpected('connect', e);
            }
        }
    }

    /**
     * @event disconnect
     * @description
     * Global notification of releasing a database connection back to the connection pool, i.e. releasing the virtual connection.
     *
     * However, when releasing a direct connection (created by calling {@link Database#connect Database.connect} with parameter
     * `{direct: true}`), this event represents a physical disconnection.
     *
     * The library will suppress any error thrown by the handler and write it into the console.
     *
     * @param {{}} e Event Properties
     *
     * @param {external:Client} e.client - $[pg.Client] object that represents connection with the database.
     *
     * @param {*} e.dc - Database Context that was used when creating the database object (see {@link Database}).
     *
     * @example
     *
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     disconnect(e) {
     *        const cp = e.client.connectionParameters;
     *        console.log('Disconnecting from database:', cp.database);
     *     }
     *
     * };
     */
    static disconnect(ctx, client) {
        if (typeof ctx.options.disconnect === 'function') {
            try {
                ctx.options.disconnect({client, dc: ctx.dc});
            } catch (e) {
                // have to silence errors here;
                // cannot allow unhandled errors while disconnecting from the database,
                // as it will break the disconnection logic;
                Events.unexpected('disconnect', e);
            }
        }
    }

    /**
     * @event query
     * @description
     *
     * Global notification of a query that's about to execute.
     *
     * Notification happens just before the query execution. And if the handler throws an error, the query execution
     * will be rejected with that error.
     *
     * @param {EventContext} e
     * Event Context Object.
     *
     * @example
     *
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     query(e) {
     *         console.log('QUERY:', e.query);
     *     }
     * };
     */
    static query(options, context) {
        if (typeof options.query === 'function') {
            try {
                options.query(context);
            } catch (e) {
                // throwing an error during event 'query'
                // will result in a reject for the request.
                return e instanceof Error ? e : new npm.utils.InternalError(e);
            }
        }
    }

    /**
     * @event receive
     * @description
     * Global notification of any data received from the database, coming from a regular query or from a stream.
     *
     * The event is fired before the data reaches the client, and it serves two purposes:
     *  - Providing selective data logging for debugging;
     *  - Pre-processing data before it reaches the client.
     *
     * **NOTES:**
     * - If you alter the size of `data` directly or through the `result` object, it may affect `QueryResultMask`
     *   validation for regular queries, which is executed right after.
     * - Any data pre-processing needs to be fast here, to avoid performance penalties.
     * - If the event handler throws an error, the original request will be rejected with that error.
     *
     * For methods {@link Database#multi Database.multi} and {@link Database#multiResult Database.multiResult},
     * this event is called for every result that's returned. And for method {@link Database#stream Database.stream},
     * the event occurs for every record.
     *
     * @param {{}} e Event Properties
     *
     * @param {Array<Object>} e.data
     * Array of received objects/rows.
     *
     * If any of those objects are modified during notification, the client will receive the modified data.
     *
     * @param {external:Result} e.result
     * - Original $[Result] object, if the data is from a non-stream query, in which case `data = result.rows`.
     *   For single-query requests, $[Result] object is extended with property `duration` - number of milliseconds
     *   it took to send the query, execute it and get the result back.
     * - It is `undefined` when the data comes from a stream (method {@link Database#stream Database.stream}).
     *
     * @param {EventContext} e.ctx
     * Event Context Object.
     *
     * @example
     *
     * // Example below shows the fastest way to camelize all column names.
     * // NOTE: The example does not do processing for nested JSON objects.
     *
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     receive(e) {
     *         camelizeColumns(e.data);
     *     }
     * };
     *
     * function camelizeColumns(data) {
     *     const tmp = data[0];
     *     for (const prop in tmp) {
     *         const camel = pgp.utils.camelize(prop);
     *         if (!(camel in tmp)) {
     *             for (let i = 0; i < data.length; i++) {
     *                 const d = data[i];
     *                 d[camel] = d[prop];
     *                 delete d[prop];
     *             }
     *         }
     *     }
     * }
     */
    static receive(options, data, result, ctx) {
        if (typeof options.receive === 'function') {
            try {
                options.receive({data, result, ctx});
            } catch (e) {
                // throwing an error during event 'receive'
                // will result in a reject for the request.
                return e instanceof Error ? e : new npm.utils.InternalError(e);
            }
        }
    }

    /**
     * @event task
     * @description
     * Global notification of a task start / finish events, as executed via
     * {@link Database#task Database.task} or {@link Database#taskIf Database.taskIf}.
     *
     * The library will suppress any error thrown by the handler and write it into the console.
     *
     * @param {EventContext} e
     * Event Context Object.
     *
     * @example
     *
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     task(e) {
     *         if (e.ctx.finish) {
     *             // this is a task->finish event;
     *             console.log('Duration:', e.ctx.duration);
     *             if (e.ctx.success) {
     *                 // e.ctx.result = resolved data;
     *             } else {
     *                 // e.ctx.result = error/rejection reason;
     *             }
     *         } else {
     *             // this is a task->start event;
     *             console.log('Start Time:', e.ctx.start);
     *         }
     *     }
     * };
     *
     */
    static task(options, context) {
        if (typeof options.task === 'function') {
            try {
                options.task(context);
            } catch (e) {
                // silencing the error, to avoid breaking the task;
                Events.unexpected('task', e);
            }
        }
    }

    /**
     * @event transact
     * @description
     * Global notification of a transaction start / finish events, as executed via {@link Database#tx Database.tx}
     * or {@link Database#txIf Database.txIf}.
     *
     * The library will suppress any error thrown by the handler and write it into the console.
     *
     * @param {EventContext} e
     * Event Context Object.
     *
     * @example
     *
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     transact(e) {
     *         if (e.ctx.finish) {
     *             // this is a transaction->finish event;
     *             console.log('Duration:', e.ctx.duration);
     *             if (e.ctx.success) {
     *                 // e.ctx.result = resolved data;
     *             } else {
     *                 // e.ctx.result = error/rejection reason;
     *             }
     *         } else {
     *             // this is a transaction->start event;
     *             console.log('Start Time:', e.ctx.start);
     *         }
     *     }
     * };
     *
     */
    static transact(options, context) {
        if (typeof options.transact === 'function') {
            try {
                options.transact(context);
            } catch (e) {
                // silencing the error, to avoid breaking the transaction;
                Events.unexpected('transact', e);
            }
        }
    }

    /**
     * @event error
     * @description
     * Global notification of every error encountered by this library.
     *
     * The library will suppress any error thrown by the handler and write it into the console.
     *
     * @param {*} err
     * The error encountered, of the same value and type as it was reported.
     *
     * @param {EventContext} e
     * Event Context Object.
     *
     * @example
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     error(err, e) {
     *
     *         if (e.cn) {
     *             // this is a connection-related error
     *             // cn = safe connection details passed into the library:
     *             //      if password is present, it is masked by #
     *         }
     *
     *         if (e.query) {
     *             // query string is available
     *             if (e.params) {
     *                 // query parameters are available
     *             }
     *         }
     *
     *         if (e.ctx) {
     *             // occurred inside a task or transaction
     *         }
     *       }
     * };
     *
     */
    static error(options, err, context) {
        if (typeof options.error === 'function') {
            try {
                options.error(err, context);
            } catch (e) {
                // have to silence errors here;
                // throwing unhandled errors while handling an error
                // notification is simply not acceptable.
                Events.unexpected('error', e);
            }
        }
    }

    /**
     * @event extend
     * @description
     * Extends {@link Database} protocol with custom methods and properties.
     *
     * Override this event to extend the existing access layer with your own functions and
     * properties best suited for your application.
     *
     * The extension thus becomes available across all access layers:
     *
     * - Within the root/default database protocol;
     * - Inside transactions, including nested ones;
     * - Inside tasks, including nested ones.
     *
     * All pre-defined methods and properties are read-only, so you will get an error,
     * if you try overriding them.
     *
     * The library will suppress any error thrown by the handler and write it into the console.
     *
     * @param {object} obj - Protocol object to be extended.
     *
     * @param {*} dc - Database Context that was used when creating the {@link Database} object.
     *
     * @see $[pg-promise-demo]
     *
     * @example
     *
     * // In the example below we extend the protocol with function `addImage`
     * // that will insert one binary image and resolve with the new record id.
     *
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     extend(obj, dc) {
     *         // dc = database context;
     *         obj.addImage = data => {
     *             // adds a new image and resolves with its record id:
     *             return obj.one('INSERT INTO images(data) VALUES($1) RETURNING id', data, a => a.id);
     *         }
     *     }
     * };
     *
     * @example
     *
     * // It is best to extend the protocol by adding whole entity repositories to it as shown in the following example.
     * // For a comprehensive example see https://github.com/vitaly-t/pg-promise-demo
     *
     * class UsersRepository {
     *     constructor(rep, pgp) {
     *         this.rep = rep;
     *         this.pgp = pgp;
     *     }
     *
     *     add(name) {
     *         return this.rep.one('INSERT INTO users(name) VALUES($1) RETURNING id', name, a => a.id);
     *     }
     *
     *     remove(id) {
     *         return this.rep.none('DELETE FROM users WHERE id = $1', id);
     *     }
     * }
     *
     * // Overriding 'extend' event;
     * const initOptions = {
     *
     *     // pg-promise initialization options...
     *
     *     extend(obj, dc) {
     *         // dc = database context;
     *         obj.users = new UsersRepository(obj, pgp);
     *         // You can set different repositories based on `dc`
     *     }
     * };
     *
     * // Usage example:
     * db.users.add('John', true)
     *     .then(id => {
     *         // user added successfully, id = new user's id
     *     })
     *     .catch(error => {
     *         // failed to add the user;
     *     });
     *
     */
    static extend(options, obj, dc) {
        if (typeof options.extend === 'function') {
            try {
                options.extend.call(obj, obj, dc);
            } catch (e) {
                // have to silence errors here;
                // the result of throwing unhandled errors while
                // extending the protocol would be unpredictable.
                Events.unexpected('extend', e);
            }
        }
    }

    /**
     * @event unexpected
     * @param {string} event - unhandled event name.
     * @param {string|Error} e - unhandled error.
     * @private
     */
    static unexpected(event, e) {
        // If you should ever get here, your app is definitely broken, and you need to fix
        // your event handler to prevent unhandled errors during event notifications.
        //
        // Console output is suppressed when running tests, to avoid polluting test output
        // with error messages that are intentional and of no value to the test.

        /* istanbul ignore if */
        if (!npm.main.suppressErrors) {
            const stack = e instanceof Error ? e.stack : new Error().stack;
            ColorConsole.error(`Unexpected error in '${event}' event handler.\n${stack}\n`);
        }
    }
}

module.exports = {Events};

/**
 * @typedef EventContext
 * @description
 * This common type is used for the following events: {@link event:query query}, {@link event:receive receive},
 * {@link event:error error}, {@link event:task task} and {@link event:transact transact}.
 *
 * @property {string|object} cn
 *
 * Set only for event {@link event:error error}, and only when the error is connection-related.
 *
 * It is a safe copy of the connection string/object that was used when initializing `db` - the database instance.
 *
 * If the original connection contains a password, the safe copy contains it masked with symbol `#`, so the connection
 * can be logged safely, without exposing the password.
 *
 * @property {*} dc
 * Database Context that was used when creating the database object (see {@link Database}). It is set for all events.
 *
 * @property {string|object} query
 *
 * Query string/object that was passed into the query method. This property is only set during events {@link event:query query},
 * {@link event:receive receive} and {@link event:error error} (only when the error is query-related).
 *
 * @property {external:Client} client
 *
 * $[pg.Client] object that represents the connection. It is set for all events, except for event {@link event:error error}
 * when it is connection-related. Note that sometimes the value may be unset when the connection is lost.
 *
 * @property {*} params - Formatting parameters for the query.
 *
 * It is set only for events {@link event:query query}, {@link event:receive receive} and {@link event:error error}, and only
 * when it is needed for logging. This library takes an extra step in figuring out when formatting parameters are of any value
 * to the event logging:
 * - when an error occurs related to the query formatting, event {@link event:error error} is sent with the property set.
 * - when initialization parameter `pgFormat` is used, and all query formatting is done within the $[PG] library, events
 * {@link event:query query} and {@link event:receive receive} will have this property set also, since this library no longer
 * handles the query formatting.
 *
 * When this parameter is not set, it means one of the two things:
 * - there were no parameters passed into the query method;
 * - property `query` of this object already contains all the formatting values in it, so logging only the query is sufficient.
 *
 * @property {TaskContext} ctx
 * _Task/Transaction Context_ object.
 *
 * This property is always set for events {@link event:task task} and {@link event:transact transact}, while for events
 * {@link event:query query}, {@link event:receive receive} and {@link event:error error} it is only set when they occur
 * inside a task or transaction.
 */
