"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataAlreadyExistsError = void 0;
const TypeORMError_1 = require("./TypeORMError");
class MetadataAlreadyExistsError extends TypeORMError_1.TypeORMError {
    constructor(metadataType, constructor, propertyName) {
        super(metadataType +
            " metadata already exists for the class constructor " +
            JSON.stringify(constructor) +
            (propertyName
                ? " on property " + propertyName
                : ". If you previously renamed or moved entity class, make sure" +
                    " that compiled version of old entity class source wasn't left in the compiler output directory."));
    }
}
exports.MetadataAlreadyExistsError = MetadataAlreadyExistsError;

//# sourceMappingURL=MetadataAlreadyExistsError.js.map
