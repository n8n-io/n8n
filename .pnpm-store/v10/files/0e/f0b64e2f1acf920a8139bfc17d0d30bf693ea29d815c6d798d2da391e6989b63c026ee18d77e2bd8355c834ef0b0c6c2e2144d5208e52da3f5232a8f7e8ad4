"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsingJoinTableOnlyOnOneSideAllowedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class UsingJoinTableOnlyOnOneSideAllowedError extends TypeORMError_1.TypeORMError {
    constructor(entityMetadata, relation) {
        super(`Using JoinTable is allowed only on one side of the many-to-many relationship. ` +
            `Both ${entityMetadata.name}#${relation.propertyName} and ${relation.inverseEntityMetadata.name}#${relation.inverseRelation.propertyName} ` +
            `has JoinTable decorators. Choose one of them and left JoinColumn decorator only on it.`);
    }
}
exports.UsingJoinTableOnlyOnOneSideAllowedError = UsingJoinTableOnlyOnOneSideAllowedError;

//# sourceMappingURL=UsingJoinTableOnlyOnOneSideAllowedError.js.map
