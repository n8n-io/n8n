"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(dst, src, min, max, options) {
    const args = [
        'ZRANGESTORE',
        dst,
        src,
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(min),
        (0, generic_transformers_1.transformStringNumberInfinityArgument)(max)
    ];
    switch (options?.BY) {
        case 'SCORE':
            args.push('BYSCORE');
            break;
        case 'LEX':
            args.push('BYLEX');
            break;
    }
    if (options?.REV) {
        args.push('REV');
    }
    if (options?.LIMIT) {
        args.push('LIMIT', options.LIMIT.offset.toString(), options.LIMIT.count.toString());
    }
    if (options?.WITHSCORES) {
        args.push('WITHSCORES');
    }
    return args;
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    if (typeof reply !== 'number') {
        throw new TypeError(`Upgrade to Redis 6.2.5 and up (https://github.com/redis/redis/pull/9089)`);
    }
    return reply;
}
exports.transformReply = transformReply;
