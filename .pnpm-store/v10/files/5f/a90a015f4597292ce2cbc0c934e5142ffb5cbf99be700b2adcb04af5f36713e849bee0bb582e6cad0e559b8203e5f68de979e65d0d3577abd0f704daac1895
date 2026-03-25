/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {Events} = require('./events');
const {ColorConsole} = require('./utils/color');

const npm = {
    utils: require('./utils'),
    text: require('./text'),
    formatting: require('./formatting')
};

function poolConnect(ctx, db, config) {
    return config.promise((resolve, reject) => {
        const p = db.$pool;
        if (p.ending) {
            db.$destroy();
            const err = new Error(npm.text.poolDestroyed);
            Events.error(ctx.options, err, {
                dc: ctx.dc
            });
            reject(err);
            return;
        }
        p.connect((err, client) => {
            if (err) {
                Events.error(ctx.options, err, {
                    cn: npm.utils.getSafeConnection(ctx.cn),
                    dc: ctx.dc
                });
                reject(err);
            } else {
                if ('$useCount' in client) {
                    // Make sure useCount drops to 1, if it ever reaches maximum integer number;
                    // We do not drop it to zero, to avoid rerun of initialization queries that
                    // usually check for useCount === 0;
                    // istanbul ignore if
                    if (client.$useCount >= Number.MAX_SAFE_INTEGER) {
                        client.$useCount = 1; // resetting; cannot auto-test this
                    } else {
                        client.$useCount = ++client.$useCount;
                    }
                } else {
                    Object.defineProperty(client, '$useCount', {
                        value: 0,
                        configurable: false,
                        enumerable: false,
                        writable: true
                    });
                    setSchema(client, ctx);
                }
                setCtx(client, ctx);
                const end = lockClientEnd(client);
                client.on('error', onError);
                resolve({
                    client,
                    useCount: client.$useCount,
                    release(kill) {
                        client.end = end;
                        client.release(kill || client.$connectionError);
                        Events.disconnect(ctx, client);
                        client.removeListener('error', onError);
                    }
                });
                Events.connect(ctx, client, client.$useCount);
            }
        });
    });
}

function directConnect(ctx, config) {
    return config.promise((resolve, reject) => {
        const client = new config.pgp.pg.Client(ctx.cn);
        client.connect(err => {
            if (err) {
                Events.error(ctx.options, err, {
                    cn: npm.utils.getSafeConnection(ctx.cn),
                    dc: ctx.dc
                });
                reject(err);
            } else {
                setSchema(client, ctx);
                setCtx(client, ctx);
                const end = lockClientEnd(client);
                client.on('error', onError);
                resolve({
                    client,
                    useCount: 0,
                    release() {
                        client.end = end;
                        const p = config.promise((res, rej) => client.end().then(res).catch(rej));
                        Events.disconnect(ctx, client);
                        client.removeListener('error', onError);
                        return p;
                    }
                });
                Events.connect(ctx, client, 0);
            }
        });
    });
}

// this event only happens when the connection is lost physically,
// which cannot be tested automatically; removing from coverage:
// istanbul ignore next
function onError(err) {
    const ctx = this.$ctx;
    const cn = npm.utils.getSafeConnection(ctx.cn);
    Events.error(ctx.options, err, {cn, dc: ctx.dc});
    if (ctx.cnOptions && typeof ctx.cnOptions.onLost === 'function' && !ctx.notified) {
        try {
            ctx.cnOptions.onLost.call(this, err, {
                cn,
                dc: ctx.dc,
                start: ctx.start,
                client: this
            });
        } catch (e) {
            ColorConsole.error(e && e.stack || e);
        }
        ctx.notified = true;
    }
}

function lockClientEnd(client) {
    const end = client.end;
    client.end = doNotCall => {
        // This call can happen only in the following two cases:
        // 1. the client made the call directly, against the library's documentation (invalid code)
        // 2. connection with the server broke, and the pool is terminating all clients forcefully.
        ColorConsole.error(`${npm.text.clientEnd}\n${npm.utils.getLocalStack(1, 3)}\n`);
        if (!doNotCall) {
            end.call(client);
        }
    };
    return end;
}

function setCtx(client, ctx) {
    Object.defineProperty(client, '$ctx', {
        value: ctx,
        writable: true
    });
}

function setSchema(client, ctx) {
    let s = ctx.options.schema;
    if (!s) {
        return;
    }
    if (typeof s === 'function') {
        s = s.call(ctx.dc, ctx.dc);
    }
    if (Array.isArray(s)) {
        s = s.filter(a => a && typeof a === 'string');
    }
    if (typeof s === 'string' || (Array.isArray(s) && s.length)) {
        client.query(npm.formatting.as.format('SET search_path TO $1:name', [s]), err => {
            // istanbul ignore if;
            if (err) {
                // This is unlikely to ever happen, unless the connection is created faulty,
                // and fails on the very first query, which is impossible to test automatically.
                throw err;
            }
        });
    }
}

module.exports = config => ({
    pool: (ctx, db) => poolConnect(ctx, db, config),
    direct: ctx => directConnect(ctx, config)
});
