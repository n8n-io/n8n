"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimaryColumnCannotBeNullableError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class PrimaryColumnCannotBeNullableError extends TypeORMError_1.TypeORMError {
    constructor(object, propertyName) {
        super(`Primary column ${object.constructor.name}#${propertyName} cannot be nullable. ` +
            `Its not allowed for primary keys. Try to remove nullable option.`);
    }
}
exports.PrimaryColumnCannotBeNullableError = PrimaryColumnCannotBeNullableError;

//# sourceMappingURL=PrimaryColumnCannotBeNullableError.js.map
