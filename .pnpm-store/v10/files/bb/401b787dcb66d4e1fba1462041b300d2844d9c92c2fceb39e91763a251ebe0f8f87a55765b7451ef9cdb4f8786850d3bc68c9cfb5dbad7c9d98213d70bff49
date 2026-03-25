"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWithEsprimaNext = void 0;
const esprima_next_1 = require("esprima-next");
const util_1 = require("recast/lib/util");
function parseWithEsprimaNext(source, options) {
    try {
        const ast = (0, esprima_next_1.parse)(source, {
            loc: true,
            locations: true,
            comment: true,
            range: (0, util_1.getOption)(options, 'range', false),
            tolerant: (0, util_1.getOption)(options, 'tolerant', true),
            tokens: true,
            jsx: (0, util_1.getOption)(options, 'jsx', false),
            sourceType: (0, util_1.getOption)(options, 'sourceType', 'module'),
        });
        return ast;
    }
    catch (error) {
        if (error instanceof Error)
            throw new SyntaxError(error.message);
        throw error;
    }
}
exports.parseWithEsprimaNext = parseWithEsprimaNext;
//# sourceMappingURL=Parser.js.map