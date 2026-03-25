"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomRepositoryCannotInheritRepositoryError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown if custom repository inherits Repository class however entity is not set in @EntityRepository decorator.
 */
class CustomRepositoryCannotInheritRepositoryError extends TypeORMError_1.TypeORMError {
    constructor(repository) {
        super(`Custom entity repository ${typeof repository === "function"
            ? repository.name
            : repository.constructor.name} ` +
            ` cannot inherit Repository class without entity being set in the @EntityRepository decorator.`);
    }
}
exports.CustomRepositoryCannotInheritRepositoryError = CustomRepositoryCannotInheritRepositoryError;

//# sourceMappingURL=CustomRepositoryCannotInheritRepositoryError.js.map
