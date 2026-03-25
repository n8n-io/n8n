"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsingJoinTableIsNotAllowedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class UsingJoinTableIsNotAllowedError extends TypeORMError_1.TypeORMError {
    constructor(entityMetadata, relation) {
        super(`Using JoinTable on ${entityMetadata.name}#${relation.propertyName} is wrong. ` +
            `${entityMetadata.name}#${relation.propertyName} has ${relation.relationType} relation, ` +
            `however you can use JoinTable only on many-to-many relations.`);
    }
}
exports.UsingJoinTableIsNotAllowedError = UsingJoinTableIsNotAllowedError;

//# sourceMappingURL=UsingJoinTableIsNotAllowedError.js.map
