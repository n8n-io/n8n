'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
const PROMISE_SYMBOL = Symbol('promiseCallback');

function promiseCallback() {
    let resolve, reject;
    function callback(err, ...args) {
        if (err) return reject(err);
        resolve(args.length > 1 ? args : args[0]);
    }

    callback[PROMISE_SYMBOL] = new Promise((res, rej) => {
        resolve = res, reject = rej;
    });

    return callback;
}

exports.promiseCallback = promiseCallback;
exports.PROMISE_SYMBOL = PROMISE_SYMBOL;