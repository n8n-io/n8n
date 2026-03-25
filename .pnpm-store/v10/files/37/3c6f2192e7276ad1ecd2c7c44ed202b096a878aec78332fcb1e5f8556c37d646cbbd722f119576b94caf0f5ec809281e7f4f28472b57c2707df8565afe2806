"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityNotFoundError = void 0;
const TypeORMError_1 = require("./TypeORMError");
const ObjectUtils_1 = require("../util/ObjectUtils");
const InstanceChecker_1 = require("../util/InstanceChecker");
/**
 * Thrown when no result could be found in methods which are not allowed to return undefined or an empty set.
 */
class EntityNotFoundError extends TypeORMError_1.TypeORMError {
    constructor(entityClass, criteria) {
        super();
        this.entityClass = entityClass;
        this.criteria = criteria;
        this.message =
            `Could not find any entity of type "${this.stringifyTarget(entityClass)}" ` + `matching: ${this.stringifyCriteria(criteria)}`;
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
    stringifyCriteria(criteria) {
        try {
            return JSON.stringify(criteria, null, 4);
        }
        catch (e) { }
        return "" + criteria;
    }
}
exports.EntityNotFoundError = EntityNotFoundError;

//# sourceMappingURL=EntityNotFoundError.js.map
