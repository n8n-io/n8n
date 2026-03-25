"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingStrategyNotFoundError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when consumer tries to use naming strategy that does not exist.
 */
class NamingStrategyNotFoundError extends TypeORMError_1.TypeORMError {
    constructor(strategyName, connectionName) {
        super();
        const name = typeof strategyName === "function"
            ? strategyName.name
            : strategyName;
        this.message =
            `Naming strategy "${name}" was not found. Looks like this naming strategy does not ` +
                `exist or it was not registered in current "${connectionName}" connection?`;
    }
}
exports.NamingStrategyNotFoundError = NamingStrategyNotFoundError;

//# sourceMappingURL=NamingStrategyNotFoundError.js.map
