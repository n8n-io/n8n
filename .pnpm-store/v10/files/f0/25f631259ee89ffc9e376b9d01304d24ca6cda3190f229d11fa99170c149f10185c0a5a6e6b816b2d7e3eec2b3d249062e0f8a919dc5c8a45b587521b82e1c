"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, value, options) {
    const args = [
        'SET',
        key,
        typeof value === 'number' ? value.toString() : value
    ];
    if (options?.EX !== undefined) {
        args.push('EX', options.EX.toString());
    }
    else if (options?.PX !== undefined) {
        args.push('PX', options.PX.toString());
    }
    else if (options?.EXAT !== undefined) {
        args.push('EXAT', options.EXAT.toString());
    }
    else if (options?.PXAT !== undefined) {
        args.push('PXAT', options.PXAT.toString());
    }
    else if (options?.KEEPTTL) {
        args.push('KEEPTTL');
    }
    if (options?.NX) {
        args.push('NX');
    }
    else if (options?.XX) {
        args.push('XX');
    }
    if (options?.GET) {
        args.push('GET');
    }
    return args;
}
exports.transformArguments = transformArguments;
