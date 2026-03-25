"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectWithoutIdentifierError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when operation is going to be executed on a subject without identifier.
 * This error should never be thrown, however it still presents to prevent user from updation or removing the whole table.
 * If this error occurs still, it most probably is an ORM internal problem which must be reported and fixed.
 */
class SubjectWithoutIdentifierError extends TypeORMError_1.TypeORMError {
    constructor(subject) {
        super(`Internal error. Subject ${subject.metadata.targetName} must have an identifier to perform operation.`);
    }
}
exports.SubjectWithoutIdentifierError = SubjectWithoutIdentifierError;

//# sourceMappingURL=SubjectWithoutIdentifierError.js.map
