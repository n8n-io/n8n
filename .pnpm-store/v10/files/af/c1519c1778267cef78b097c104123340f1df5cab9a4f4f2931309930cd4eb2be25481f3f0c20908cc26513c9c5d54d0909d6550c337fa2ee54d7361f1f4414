"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingJoinColumnError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class MissingJoinColumnError extends TypeORMError_1.TypeORMError {
    constructor(entityMetadata, relation) {
        super();
        if (relation.inverseRelation) {
            this.message =
                `JoinColumn is missing on both sides of ${entityMetadata.name}#${relation.propertyName} and ` +
                    `${relation.inverseEntityMetadata.name}#${relation.inverseRelation.propertyName} one-to-one relationship. ` +
                    `You need to put JoinColumn decorator on one of the sides.`;
        }
        else {
            this.message =
                `JoinColumn is missing on ${entityMetadata.name}#${relation.propertyName} one-to-one relationship. ` +
                    `You need to put JoinColumn decorator on it.`;
        }
    }
}
exports.MissingJoinColumnError = MissingJoinColumnError;

//# sourceMappingURL=MissingJoinColumnError.js.map
