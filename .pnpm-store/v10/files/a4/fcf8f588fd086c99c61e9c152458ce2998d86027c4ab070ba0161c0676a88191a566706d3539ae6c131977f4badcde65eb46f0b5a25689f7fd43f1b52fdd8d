"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStringLiteralKey = generateStringLiteralKey;
const index_1 = require("./index");
const wrapWith_1 = require("./wrapWith");
function* generateStringLiteralKey(code, offset, info) {
    if (offset === undefined || !info) {
        yield `'${code}'`;
    }
    else {
        yield* (0, wrapWith_1.wrapWith)(offset, offset + code.length, info, `'`, [code, 'template', offset, index_1.combineLastMapping], `'`);
    }
}
//# sourceMappingURL=stringLiteralKey.js.map