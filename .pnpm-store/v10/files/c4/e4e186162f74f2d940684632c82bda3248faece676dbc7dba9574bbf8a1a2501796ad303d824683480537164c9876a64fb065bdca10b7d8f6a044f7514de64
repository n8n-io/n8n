"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CannotAttachTreeChildrenEntityError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when user saves tree children entity but its parent is not saved yet.
 */
class CannotAttachTreeChildrenEntityError extends TypeORMError_1.TypeORMError {
    constructor(entityName) {
        super(`Cannot attach entity "${entityName}" to its parent. Please make sure parent ` +
            `is saved in the database before saving children nodes.`);
    }
}
exports.CannotAttachTreeChildrenEntityError = CannotAttachTreeChildrenEntityError;

//# sourceMappingURL=CannotAttachTreeChildrenEntityError.js.map
