"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CannotCreateEntityIdMapError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when user tries to create entity id map from the mixed id value,
 * but id value is a single value when entity requires multiple values.
 */
class CannotCreateEntityIdMapError extends TypeORMError_1.TypeORMError {
    constructor(metadata, id) {
        super();
        const objectExample = metadata.primaryColumns.reduce((object, column, index) => {
            column.setEntityValue(object, index + 1);
            return object;
        }, {});
        this.message = `Cannot use given entity id "${id}" because "${metadata.targetName}" contains multiple primary columns, you must provide object in following form: ${JSON.stringify(objectExample)} as an id.`;
    }
}
exports.CannotCreateEntityIdMapError = CannotCreateEntityIdMapError;

//# sourceMappingURL=CannotCreateEntityIdMapError.js.map
