"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapWith = wrapWith;
function* wrapWith(startOffset, endOffset, ...args) {
    let source = 'template';
    let features;
    let codes;
    if (typeof args[0] === 'string') {
        [source, features, ...codes] = args;
    }
    else {
        [features, ...codes] = args;
    }
    yield ['', source, startOffset, features];
    let offset = 1;
    for (const code of codes) {
        if (typeof code !== 'string') {
            offset++;
        }
        yield code;
    }
    yield ['', source, endOffset, { __combineOffset: offset }];
}
//# sourceMappingURL=wrapWith.js.map