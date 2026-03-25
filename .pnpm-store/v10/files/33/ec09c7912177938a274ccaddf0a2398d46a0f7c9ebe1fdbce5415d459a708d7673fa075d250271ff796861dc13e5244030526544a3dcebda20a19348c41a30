"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = void 0;
function transformArguments(host, port, key, destinationDb, timeout, options) {
    const args = ['MIGRATE', host, port.toString()], isKeyArray = Array.isArray(key);
    if (isKeyArray) {
        args.push('');
    }
    else {
        args.push(key);
    }
    args.push(destinationDb.toString(), timeout.toString());
    if (options?.COPY) {
        args.push('COPY');
    }
    if (options?.REPLACE) {
        args.push('REPLACE');
    }
    if (options?.AUTH) {
        if (options.AUTH.username) {
            args.push('AUTH2', options.AUTH.username, options.AUTH.password);
        }
        else {
            args.push('AUTH', options.AUTH.password);
        }
    }
    if (isKeyArray) {
        args.push('KEYS', ...key);
    }
    return args;
}
exports.transformArguments = transformArguments;
