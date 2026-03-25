"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingJoinTableError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class MissingJoinTableError extends TypeORMError_1.TypeORMError {
    constructor(entityMetadata, relation) {
        super();
        if (relation.inverseRelation) {
            this.message =
                `JoinTable is missing on both sides of ${entityMetadata.name}#${relation.propertyName} and ` +
                    `${relation.inverseEntityMetadata.name}#${relation.inverseRelation.propertyName} many-to-many relationship. ` +
                    `You need to put decorator decorator on one of the sides.`;
        }
        else {
            this.message =
                `JoinTable is missing on ${entityMetadata.name}#${relation.propertyName} many-to-many relationship. ` +
                    `You need to put JoinTable decorator on it.`;
        }
    }
}
exports.MissingJoinTableError = MissingJoinTableError;

//# sourceMappingURL=MissingJoinTableError.js.map
