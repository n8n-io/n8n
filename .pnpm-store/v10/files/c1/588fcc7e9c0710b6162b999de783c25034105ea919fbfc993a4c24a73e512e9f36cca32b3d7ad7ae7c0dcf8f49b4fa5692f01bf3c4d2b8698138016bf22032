"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitySchemaEmbeddedError = void 0;
const error_1 = require("../error");
class EntitySchemaEmbeddedError extends error_1.TypeORMError {
    static createEntitySchemaIsRequiredException(field) {
        return new EntitySchemaEmbeddedError(`EntitySchema is required for ${field} embedded field`);
    }
    static createTargetIsRequired(field) {
        return new EntitySchemaEmbeddedError(`Target field is required for ${field} embedded EntitySchema`);
    }
    constructor(message) {
        super(message);
    }
}
exports.EntitySchemaEmbeddedError = EntitySchemaEmbeddedError;

//# sourceMappingURL=EntitySchemaEmbeddedError.js.map
