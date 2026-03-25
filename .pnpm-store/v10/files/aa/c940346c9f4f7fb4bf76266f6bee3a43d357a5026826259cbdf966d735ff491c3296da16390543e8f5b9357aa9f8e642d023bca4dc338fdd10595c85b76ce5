"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateObjectProperties = void 0;
const errors_1 = require("../errors");
function ValidateObjectProperties(item, validProperties) {
    const itemKeys = Object.keys(item);
    // Check for any keys in `item` that are not in `validProperties`
    const invalidKeys = itemKeys.filter((key) => !validProperties.includes(key));
    if (invalidKeys.length > 0) {
        throw new errors_1.PineconeArgumentError(`Object contained invalid properties: ${invalidKeys.join(', ')}. Valid properties include ${validProperties.join(', ')}.`);
    }
}
exports.ValidateObjectProperties = ValidateObjectProperties;
//# sourceMappingURL=validateObjectProperties.js.map