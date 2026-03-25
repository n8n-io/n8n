"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomRepositoryDoesNotHaveEntityError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown if custom repositories that extend AbstractRepository classes does not have managed entity.
 */
class CustomRepositoryDoesNotHaveEntityError extends TypeORMError_1.TypeORMError {
    constructor(repository) {
        super(`Custom repository ${typeof repository === "function"
            ? repository.name
            : repository.constructor.name} does not have managed entity. ` +
            `Did you forget to specify entity for it @EntityRepository(MyEntity)? `);
    }
}
exports.CustomRepositoryDoesNotHaveEntityError = CustomRepositoryDoesNotHaveEntityError;

//# sourceMappingURL=CustomRepositoryDoesNotHaveEntityError.js.map
