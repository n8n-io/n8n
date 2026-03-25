"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePropertyAccess = generatePropertyAccess;
const common_1 = require("../common");
const interpolation_1 = require("./interpolation");
const stringLiteralKey_1 = require("./stringLiteralKey");
function* generatePropertyAccess(options, ctx, code, offset, features, astHolder) {
    if (!options.compilerOptions.noPropertyAccessFromIndexSignature && common_1.variableNameRegex.test(code)) {
        yield `.`;
        yield offset !== undefined && features
            ? [code, 'template', offset, features]
            : code;
    }
    else if (code.startsWith('[') && code.endsWith(']')) {
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, code, astHolder, offset, features, '', '');
    }
    else {
        yield `[`;
        yield* (0, stringLiteralKey_1.generateStringLiteralKey)(code, offset, features);
        yield `]`;
    }
}
//# sourceMappingURL=propertyAccess.js.map