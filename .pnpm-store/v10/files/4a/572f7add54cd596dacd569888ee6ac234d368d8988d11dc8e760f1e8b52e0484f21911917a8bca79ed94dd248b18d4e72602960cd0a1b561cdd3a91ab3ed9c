"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityMetadataNotFoundError = void 0;
const TypeORMError_1 = require("./TypeORMError");
const ObjectUtils_1 = require("../util/ObjectUtils");
const InstanceChecker_1 = require("../util/InstanceChecker");
class EntityMetadataNotFoundError extends TypeORMError_1.TypeORMError {
    constructor(target) {
        super();
        this.message = `No metadata for "${this.stringifyTarget(target)}" was found.`;
    }
    stringifyTarget(target) {
        if (InstanceChecker_1.InstanceChecker.isEntitySchema(target)) {
            return target.options.name;
        }
        else if (typeof target === "function") {
            return target.name;
        }
        else if (ObjectUtils_1.ObjectUtils.isObject(target) && "name" in target) {
            return target.name;
        }
        else {
            return target;
        }
    }
}
exports.EntityMetadataNotFoundError = EntityMetadataNotFoundError;

//# sourceMappingURL=EntityMetadataNotFoundError.js.map
