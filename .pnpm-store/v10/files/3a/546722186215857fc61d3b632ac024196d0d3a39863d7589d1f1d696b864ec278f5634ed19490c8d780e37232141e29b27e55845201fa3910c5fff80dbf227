"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObjectProperty = getObjectProperty;
exports.generateObjectProperty = generateObjectProperty;
const shared_1 = require("@vue/shared");
const utils_1 = require("../utils");
const camelized_1 = require("../utils/camelized");
const stringLiteralKey_1 = require("../utils/stringLiteralKey");
function getObjectProperty(code) {
    if (utils_1.identifierRegex.test(code)) {
        return code;
    }
    else {
        return `'${code}'`;
    }
}
function* generateObjectProperty(code, source, offset, features, hasQuotes = false, shouldCamelize = false) {
    const start = offset;
    const end = offset + code.length;
    if (hasQuotes) {
        code = code.slice(1, -1);
        offset++;
    }
    if (shouldCamelize) {
        if (utils_1.identifierRegex.test((0, shared_1.camelize)(code))) {
            yield* (0, camelized_1.generateCamelized)(code, source, offset, features);
        }
        else {
            yield* (0, utils_1.wrapWith)(start, end, source, features, `'`, ...(0, camelized_1.generateCamelized)(code, source, offset, features), `'`);
        }
    }
    else {
        if (utils_1.identifierRegex.test(code)) {
            yield [code, source, offset, features];
        }
        else {
            yield* (0, stringLiteralKey_1.generateStringLiteralKey)(code, source, offset, features);
        }
    }
}
//# sourceMappingURL=objectProperty.js.map