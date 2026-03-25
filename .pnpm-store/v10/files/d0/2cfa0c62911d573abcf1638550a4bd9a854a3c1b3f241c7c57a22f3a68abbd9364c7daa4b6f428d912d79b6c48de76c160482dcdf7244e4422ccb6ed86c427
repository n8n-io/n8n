"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsingJoinColumnIsNotAllowedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class UsingJoinColumnIsNotAllowedError extends TypeORMError_1.TypeORMError {
    constructor(entityMetadata, relation) {
        super(`Using JoinColumn on ${entityMetadata.name}#${relation.propertyName} is wrong. ` +
            `You can use JoinColumn only on one-to-one and many-to-one relations.`);
    }
}
exports.UsingJoinColumnIsNotAllowedError = UsingJoinColumnIsNotAllowedError;

//# sourceMappingURL=UsingJoinColumnIsNotAllowedError.js.map
