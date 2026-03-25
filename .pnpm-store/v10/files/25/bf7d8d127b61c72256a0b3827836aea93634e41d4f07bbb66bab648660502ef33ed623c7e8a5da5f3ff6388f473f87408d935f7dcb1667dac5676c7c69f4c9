"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTypeNotSupportedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class DataTypeNotSupportedError extends TypeORMError_1.TypeORMError {
    constructor(column, dataType, database) {
        super();
        const type = typeof dataType === "string" ? dataType : dataType.name;
        this.message = `Data type "${type}" in "${column.entityMetadata.targetName}.${column.propertyName}" is not supported by "${database}" database.`;
    }
}
exports.DataTypeNotSupportedError = DataTypeNotSupportedError;

//# sourceMappingURL=DataTypeNotSupportedError.js.map
