"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = void 0;
function transformArguments(options) {
    const args = ['FAILOVER'];
    if (options?.TO) {
        args.push('TO', options.TO.host, options.TO.port.toString());
        if (options.TO.FORCE) {
            args.push('FORCE');
        }
    }
    if (options?.ABORT) {
        args.push('ABORT');
    }
    if (options?.TIMEOUT) {
        args.push('TIMEOUT', options.TIMEOUT.toString());
    }
    return args;
}
exports.transformArguments = transformArguments;
