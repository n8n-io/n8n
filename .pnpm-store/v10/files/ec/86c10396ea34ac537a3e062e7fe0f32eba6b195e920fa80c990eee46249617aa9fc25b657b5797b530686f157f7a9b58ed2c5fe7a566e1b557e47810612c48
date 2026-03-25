"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingPrimaryColumnError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class MissingPrimaryColumnError extends TypeORMError_1.TypeORMError {
    constructor(entityMetadata) {
        super(`Entity "${entityMetadata.name}" does not have a primary column. Primary column is required to ` +
            `have in all your entities. Use @PrimaryColumn decorator to add a primary column to your entity.`);
    }
}
exports.MissingPrimaryColumnError = MissingPrimaryColumnError;

//# sourceMappingURL=MissingPrimaryColumnError.js.map
