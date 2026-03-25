'use strict';

var errcode = require('err-code');
var retry = require('retry');

var hasOwn = Object.prototype.hasOwnProperty;

function isRetryError(err) {
    return err && err.code === 'EPROMISERETRY' && hasOwn.call(err, 'retried');
}

function promiseRetry(fn, options) {
    var temp;
    var operation;

    if (typeof fn === 'object' && typeof options === 'function') {
        // Swap options and fn when using alternate signature (options, fn)
        temp = options;
        options = fn;
        fn = temp;
    }

    operation = retry.operation(options);

    return new Promise(function (resolve, reject) {
        operation.attempt(function (number) {
            Promise.resolve()
            .then(function () {
                return fn(function (err) {
                    if (isRetryError(err)) {
                        err = err.retried;
                    }

                    throw errcode(new Error('Retrying'), 'EPROMISERETRY', { retried: err });
                }, number);
            })
            .then(resolve, function (err) {
                if (isRetryError(err)) {
                    err = err.retried;

                    if (operation.retry(err || new Error())) {
                        return;
                    }
                }

                reject(err);
            });
        });
    });
}

module.exports = promiseRetry;
