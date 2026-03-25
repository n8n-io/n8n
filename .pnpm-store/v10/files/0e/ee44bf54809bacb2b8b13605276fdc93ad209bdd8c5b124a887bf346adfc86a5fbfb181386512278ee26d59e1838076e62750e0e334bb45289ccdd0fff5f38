"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryRunnerProviderAlreadyReleasedError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when consumer tries to use query runner from query runner provider after it was released.
 */
class QueryRunnerProviderAlreadyReleasedError extends TypeORMError_1.TypeORMError {
    constructor() {
        super(`Database connection provided by a query runner was already ` +
            `released, cannot continue to use its querying methods anymore.`);
    }
}
exports.QueryRunnerProviderAlreadyReleasedError = QueryRunnerProviderAlreadyReleasedError;

//# sourceMappingURL=QueryRunnerProviderAlreadyReleasedError.js.map
