"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, operations) {
    const args = ['BITFIELD', key];
    for (const options of operations) {
        switch (options.operation) {
            case 'GET':
                args.push('GET', options.encoding, options.offset.toString());
                break;
            case 'SET':
                args.push('SET', options.encoding, options.offset.toString(), options.value.toString());
                break;
            case 'INCRBY':
                args.push('INCRBY', options.encoding, options.offset.toString(), options.increment.toString());
                break;
            case 'OVERFLOW':
                args.push('OVERFLOW', options.behavior);
                break;
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
