"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, items) {
    const args = ['TOPK.INCRBY', key];
    if (Array.isArray(items)) {
        for (const item of items) {
            pushIncrByItem(args, item);
        }
    }
    else {
        pushIncrByItem(args, items);
    }
    return args;
}
exports.transformArguments = transformArguments;
function pushIncrByItem(args, { item, incrementBy }) {
    args.push(item, incrementBy.toString());
}
