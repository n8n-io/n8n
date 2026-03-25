"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryNotTreeError = void 0;
const TypeORMError_1 = require("./TypeORMError");
const ObjectUtils_1 = require("../util/ObjectUtils");
const InstanceChecker_1 = require("../util/InstanceChecker");
/**
 * Thrown when repository for the given class is not found.
 */
class RepositoryNotTreeError extends TypeORMError_1.TypeORMError {
    constructor(entityClass) {
        super();
        let targetName;
        if (InstanceChecker_1.InstanceChecker.isEntitySchema(entityClass)) {
            targetName = entityClass.options.name;
        }
        else if (typeof entityClass === "function") {
            targetName = entityClass.name;
        }
        else if (ObjectUtils_1.ObjectUtils.isObject(entityClass) &&
            "name" in entityClass) {
            targetName = entityClass.name;
        }
        else {
            targetName = entityClass;
        }
        this.message = `Repository of the "${targetName}" class is not a TreeRepository. Try to apply @Tree decorator on your entity.`;
    }
}
exports.RepositoryNotTreeError = RepositoryNotTreeError;

//# sourceMappingURL=RepositoryNotTreeError.js.map
