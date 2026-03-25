"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectRemovedAndUpdatedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when same object is scheduled for remove and updation at the same time.
 */
class SubjectRemovedAndUpdatedError extends TypeORMError_1.TypeORMError {
    constructor(subject) {
        super(`Removed entity "${subject.metadata.name}" is also scheduled for update operation. ` +
            `Make sure you are not updating and removing same object (note that update or remove may be executed by cascade operations).`);
    }
}
exports.SubjectRemovedAndUpdatedError = SubjectRemovedAndUpdatedError;

//# sourceMappingURL=SubjectRemovedAndUpdatedError.js.map
