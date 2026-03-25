"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateObjectProperty = generateObjectProperty;
const shared_1 = require("@vue/shared");
const utils_1 = require("../utils");
const camelized_1 = require("../utils/camelized");
const stringLiteralKey_1 = require("../utils/stringLiteralKey");
const wrapWith_1 = require("../utils/wrapWith");
const interpolation_1 = require("./interpolation");
function* generateObjectProperty(options, ctx, code, offset, features, astHolder, shouldCamelize = false, shouldBeConstant = false) {
    if (code.startsWith('[') && code.endsWith(']') && astHolder) {
        if (shouldBeConstant) {
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', features, code.slice(1, -1), offset + 1, astHolder, `[__VLS_tryAsConstant(`, `)]`);
        }
        else {
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', features, code, offset, astHolder);
        }
    }
    else if (shouldCamelize) {
        if (utils_1.identifierRegex.test((0, shared_1.camelize)(code))) {
            yield* (0, camelized_1.generateCamelized)(code, 'template', offset, features);
        }
        else {
            yield* (0, wrapWith_1.wrapWith)(offset, offset + code.length, features, `'`, ...(0, camelized_1.generateCamelized)(code, 'template', offset, utils_1.combineLastMapping), `'`);
        }
    }
    else {
        if (utils_1.identifierRegex.test(code)) {
            yield [code, 'template', offset, features];
        }
        else {
            yield* (0, stringLiteralKey_1.generateStringLiteralKey)(code, offset, features);
        }
    }
}
//# sourceMappingURL=objectProperty.js.map