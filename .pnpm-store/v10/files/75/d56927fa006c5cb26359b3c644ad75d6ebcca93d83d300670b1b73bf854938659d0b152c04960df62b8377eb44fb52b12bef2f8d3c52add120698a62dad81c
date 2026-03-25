"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityPropertyNotFoundError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when specified entity property was not found.
 */
class EntityPropertyNotFoundError extends TypeORMError_1.TypeORMError {
    constructor(propertyPath, metadata) {
        super(propertyPath);
        Object.setPrototypeOf(this, EntityPropertyNotFoundError.prototype);
        this.message = `Property "${propertyPath}" was not found in "${metadata.targetName}". Make sure your query is correct.`;
    }
}
exports.EntityPropertyNotFoundError = EntityPropertyNotFoundError;

//# sourceMappingURL=EntityPropertyNotFoundError.js.map
