"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindRelationsNotFoundError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when relations specified in the find options were not found in the entities.
 */
class FindRelationsNotFoundError extends TypeORMError_1.TypeORMError {
    constructor(notFoundRelations) {
        super();
        if (notFoundRelations.length === 1) {
            this.message = `Relation "${notFoundRelations[0]}" was not found; please check if it is correct and really exists in your entity.`;
        }
        else {
            this.message = `Relations ${notFoundRelations
                .map((relation) => `"${relation}"`)
                .join(", ")} were not found; please check if relations are correct and they exist in your entities.`;
        }
    }
}
exports.FindRelationsNotFoundError = FindRelationsNotFoundError;

//# sourceMappingURL=FindRelationsNotFoundError.js.map
