/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {Events} = require('./events');
const {QueryFile} = require('./query-file');
const {ServerFormatting, PreparedStatement, ParameterizedQuery} = require('./types');
const {SpecialQuery} = require('./special-query');
const {queryResult} = require('./query-result');

const npm = {
    util: require('util'),
    utils: require('./utils'),
    formatting: require('./formatting'),
    errors: require('./errors'),
    stream: require('./stream'),
    text: require('./text')
};

const QueryResultError = npm.errors.QueryResultError,
    InternalError = npm.utils.InternalError,
    qrec = npm.errors.queryResultErrorCode;

const badMask = queryResult.one | queryResult.many; // unsupported combination bit-mask;

//////////////////////////////
// Generic query method;
function $query(ctx, query, values, qrm, config) {

    const special = qrm instanceof SpecialQuery && qrm;
    const $p = config.promise;

    if (special && special.isStream) {
        return npm.stream.call(this, ctx, query, values, config);
    }

    const opt = ctx.options,
        capSQL = opt.capSQL;

    let error, entityType,
        pgFormatting = opt.pgFormatting,
        params = pgFormatting ? values : undefined;

    if (typeof query === 'function') {
        try {
            query = npm.formatting.resolveFunc(query, values);
        } catch (e) {
            error = e;
            params = values;
            query = npm.util.inspect(query);
        }
    }

    if (!error && !query) {
        error = new TypeError(npm.text.invalidQuery);
    }

    if (!error && typeof query === 'object') {
        if (query instanceof QueryFile) {
            query.prepare();
            if (query.error) {
                error = query.error;
                query = query.file;
            } else {
                query = query[QueryFile.$query];
            }
        } else {
            if ('entity' in query) {
                entityType = query.type;
                query = query.entity; // query is a function name;
            } else {
                if (query instanceof ServerFormatting) {
                    pgFormatting = true;
                } else {
                    if ('name' in query) {
                        query = new PreparedStatement(query);
                        pgFormatting = true;
                    } else {
                        if ('text' in query) {
                            query = new ParameterizedQuery(query);
                            pgFormatting = true;
                        }
                    }
                }
                if (query instanceof ServerFormatting && !npm.utils.isNull(values)) {
                    query.values = values;
                }
            }
        }
    }

    if (!error) {
        if (!pgFormatting && !npm.utils.isText(query)) {
            const errTxt = entityType ? (entityType === 'func' ? npm.text.invalidFunction : npm.text.invalidProc) : npm.text.invalidQuery;
            error = new TypeError(errTxt);
        }
        if (query instanceof ServerFormatting) {
            const qp = query.parse();
            if (qp instanceof Error) {
                error = qp;
            } else {
                query = qp;
            }
        }
    }

    if (!error && !special) {
        if (npm.utils.isNull(qrm)) {
            qrm = queryResult.any; // default query result;
        } else {
            if (qrm !== parseInt(qrm) || (qrm & badMask) === badMask || qrm < 1 || qrm > 6) {
                error = new TypeError(npm.text.invalidMask);
            }
        }
    }

    if (!error && (!pgFormatting || entityType)) {
        try {
            // use 'pg-promise' implementation of values formatting;
            if (entityType) {
                params = undefined;
                query = npm.formatting.formatEntity(query, values, {capSQL, type: entityType});
            } else {
                query = npm.formatting.formatQuery(query, values);
            }
        } catch (e) {
            if (entityType) {
                let prefix = entityType === 'func' ? 'select * from' : 'call';
                if (capSQL) {
                    prefix = prefix.toUpperCase();
                }
                query = prefix + ' ' + query + '(...)';
            } else {
                params = values;
            }
            error = e instanceof Error ? e : new npm.utils.InternalError(e);
        }
    }

    return $p((resolve, reject) => {

        if (notifyReject()) {
            return;
        }
        error = Events.query(opt, getContext());
        if (notifyReject()) {
            return;
        }
        try {
            const start = Date.now();
            ctx.db.client.query(query, params, (err, result) => {
                let data, multiResult, lastResult = result;
                if (err) {
                    // istanbul ignore if (auto-testing connectivity issues is too problematic)
                    if (npm.utils.isConnectivityError(err)) {
                        ctx.db.client.$connectionError = err;
                    }
                    err.query = err.query || query;
                    err.params = err.params || params;
                    error = err;
                } else {
                    multiResult = Array.isArray(result);
                    if (multiResult) {
                        lastResult = result[result.length - 1];
                        for (let i = 0; i < result.length; i++) {
                            const r = result[i];
                            makeIterable(r);
                            error = Events.receive(opt, r.rows, r, getContext());
                            if (error) {
                                break;
                            }
                        }
                    } else {
                        makeIterable(result);
                        result.duration = Date.now() - start;
                        error = Events.receive(opt, result.rows, result, getContext());
                    }
                }
                if (!error) {
                    data = lastResult;
                    if (special) {
                        if (special.isMultiResult) {
                            data = multiResult ? result : [result]; // method .multiResult() is called
                        }
                        // else, method .result() is called
                    } else {
                        data = data.rows;
                        const len = data.length;
                        if (len) {
                            if (len > 1 && qrm & queryResult.one) {
                                // one row was expected, but returned multiple;
                                error = new QueryResultError(qrec.multiple, lastResult, query, params);
                            } else {
                                if (!(qrm & (queryResult.one | queryResult.many))) {
                                    // no data should have been returned;
                                    error = new QueryResultError(qrec.notEmpty, lastResult, query, params);
                                } else {
                                    if (!(qrm & queryResult.many)) {
                                        data = data[0];
                                    }
                                }
                            }
                        } else {
                            // no data returned;
                            if (qrm & queryResult.none) {
                                if (qrm & queryResult.one) {
                                    data = null;
                                } else {
                                    data = qrm & queryResult.many ? data : null;
                                }
                            } else {
                                error = new QueryResultError(qrec.noData, lastResult, query, params);
                            }
                        }
                    }
                }

                if (!notifyReject()) {
                    resolve(data);
                }
            });
        } catch (e) {
            // this can only happen as a result of an internal failure within node-postgres,
            // like during a sudden loss of communications, which is impossible to reproduce
            // automatically, so removing it from the test coverage:
            // istanbul ignore next
            error = e;
        }

        function getContext() {
            let client;
            if (ctx.db) {
                client = ctx.db.client;
            } else {
                error = new Error(npm.text.looseQuery);
            }
            return {
                client, query, params,
                dc: ctx.dc,
                ctx: ctx.ctx
            };
        }

        notifyReject();

        function notifyReject() {
            const context = getContext();
            if (error) {
                if (error instanceof InternalError) {
                    error = error.error;
                }
                Events.error(opt, error, context);
                reject(error);
                return true;
            }
        }
    });
}

// Extends Result to provide iterable for the rows;
// See: https://github.com/brianc/node-postgres/pull/2861
function makeIterable(r) {
    r[Symbol.iterator] = function () {
        return this.rows.values();
    };
}

module.exports = config => {
    return function (ctx, query, values, qrm) {
        return $query.call(this, ctx, query, values, qrm, config);
    };
};
