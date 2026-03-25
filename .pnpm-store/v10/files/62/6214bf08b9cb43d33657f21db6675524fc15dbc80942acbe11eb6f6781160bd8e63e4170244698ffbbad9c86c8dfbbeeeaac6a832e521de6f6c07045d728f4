"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateObjectProperty = generateObjectProperty;
const shared_1 = require("@vue/shared");
const common_1 = require("../common");
const camelized_1 = require("./camelized");
const interpolation_1 = require("./interpolation");
const stringLiteralKey_1 = require("./stringLiteralKey");
function* generateObjectProperty(options, ctx, code, offset, features, astHolder, shouldCamelize = false, shouldBeConstant = false) {
    if (code.startsWith('[') && code.endsWith(']') && astHolder) {
        if (shouldBeConstant) {
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, code.slice(1, -1), astHolder, offset + 1, features, `[__VLS_tryAsConstant(`, `)]`);
        }
        else {
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, code, astHolder, offset, features, '', '');
        }
    }
    else if (shouldCamelize) {
        if (common_1.variableNameRegex.test((0, shared_1.camelize)(code))) {
            yield* (0, camelized_1.generateCamelized)(code, offset, features);
        }
        else {
            yield* (0, common_1.wrapWith)(offset, offset + code.length, features, `"`, ...(0, camelized_1.generateCamelized)(code, offset, common_1.combineLastMapping), `"`);
        }
    }
    else {
        if (common_1.variableNameRegex.test(code)) {
            yield [code, 'template', offset, features];
        }
        else {
            yield* (0, stringLiteralKey_1.generateStringLiteralKey)(code, offset, features);
        }
    }
}
//# sourceMappingURL=objectProperty.js.map