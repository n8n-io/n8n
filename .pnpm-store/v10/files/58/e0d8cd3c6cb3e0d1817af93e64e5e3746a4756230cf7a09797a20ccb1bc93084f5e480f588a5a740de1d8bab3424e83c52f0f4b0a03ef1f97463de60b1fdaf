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
    utils: require('./utils'),
    text: require('./text')
};

////////////////////////////////////////////
// Streams query data into any destination,
// with the help of pg-query-stream library.
function $stream(ctx, qs, initCB, config) {

    const $p = config.promise;

    // istanbul ignore next:
    // we do not provide code coverage for the Native Bindings specifics
    if (ctx.options.pgNative) {
        return $p.reject(new Error(npm.text.nativeStreaming));
    }
    // Stream class was renamed again, see the following issue:
    // https://github.com/brianc/node-postgres/issues/2412
    if (!qs || !qs.constructor || qs.constructor.name !== 'QueryStream') {
        // invalid or missing stream object;
        return $p.reject(new TypeError(npm.text.invalidStream));
    }
    if (qs._reading || qs._closed) {
        // stream object is in the wrong state;
        return $p.reject(new Error(npm.text.invalidStreamState));
    }
    if (typeof initCB !== 'function') {
        // parameter `initCB` must be passed as the initialization callback;
        return $p.reject(new TypeError(npm.text.invalidStreamCB));
    }

    let error = Events.query(ctx.options, getContext());

    if (error) {
        error = getError(error);
        Events.error(ctx.options, error, getContext());
        return $p.reject(error);
    }

    const stream = ctx.db.client.query(qs);

    stream.on('data', onData);
    stream.on('error', onError);
    stream.on('end', onEnd);

    try {
        initCB.call(this, stream); // the stream must be initialized during the call;
    } catch (e) {
        release();
        error = getError(e);
        Events.error(ctx.options, error, getContext());
        return $p.reject(error);
    }

    const start = Date.now();
    let resolve, reject, nRows = 0;

    function onData(data) {
        nRows++;
        error = Events.receive(ctx.options, [data], undefined, getContext());
        if (error) {
            onError(error);
        }
    }

    function onError(e) {
        release();
        stream.destroy();
        e = getError(e);
        Events.error(ctx.options, e, getContext());
        reject(e);
    }

    function onEnd() {
        release();
        resolve({
            processed: nRows, // total number of rows processed;
            duration: Date.now() - start // duration, in milliseconds;
        });
    }

    function release() {
        stream.removeListener('data', onData);
        stream.removeListener('error', onError);
        stream.removeListener('end', onEnd);
    }

    function getError(e) {
        return e instanceof npm.utils.InternalError ? e.error : e;
    }

    function getContext() {
        let client;
        if (ctx.db) {
            client = ctx.db.client;
        } else {
            error = new Error(npm.text.looseQuery);
        }
        return {
            client,
            dc: ctx.dc,
            query: qs.cursor.text,
            params: qs.cursor.values,
            ctx: ctx.ctx
        };
    }

    return $p((res, rej) => {
        resolve = res;
        reject = rej;
    });

}

module.exports = $stream;
