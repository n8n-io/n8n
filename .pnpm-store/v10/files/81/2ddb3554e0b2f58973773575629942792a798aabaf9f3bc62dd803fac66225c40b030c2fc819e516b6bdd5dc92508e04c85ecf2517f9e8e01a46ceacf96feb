"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCamelized = generateCamelized;
const shared_1 = require("@vue/shared");
const common_1 = require("../common");
function* generateCamelized(code, offset, info) {
    const parts = code.split('-');
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part !== '') {
            if (i === 0) {
                yield [
                    part,
                    'template',
                    offset,
                    info,
                ];
            }
            else {
                yield [
                    (0, shared_1.capitalize)(part),
                    'template',
                    offset,
                    common_1.combineLastMapping,
                ];
            }
        }
        offset += part.length + 1;
    }
}
//# sourceMappingURL=camelized.js.map