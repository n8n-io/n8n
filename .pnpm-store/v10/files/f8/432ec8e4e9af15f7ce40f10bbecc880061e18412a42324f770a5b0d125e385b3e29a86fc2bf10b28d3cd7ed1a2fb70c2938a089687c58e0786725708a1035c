"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateClassProperty = generateClassProperty;
const codeFeatures_1 = require("../codeFeatures");
const utils_1 = require("../utils");
const wrapWith_1 = require("../utils/wrapWith");
function* generateClassProperty(styleIndex, classNameWithDot, offset, propertyType) {
    yield `${utils_1.newLine} & { `;
    yield* (0, wrapWith_1.wrapWith)(offset, offset + classNameWithDot.length, 'style_' + styleIndex, codeFeatures_1.codeFeatures.navigation, `'`, [
        classNameWithDot.slice(1),
        'style_' + styleIndex,
        offset + 1,
        utils_1.combineLastMapping
    ], `'`);
    yield `: ${propertyType}`;
    yield ` }`;
}
//# sourceMappingURL=classProperty.js.map