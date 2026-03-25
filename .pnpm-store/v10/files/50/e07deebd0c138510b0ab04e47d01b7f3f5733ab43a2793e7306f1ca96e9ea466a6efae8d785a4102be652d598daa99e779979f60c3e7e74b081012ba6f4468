"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenTransactionModeOverrideError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when the per-migration transaction mode is overriden but the global transaction mode is set to "all".
 */
class ForbiddenTransactionModeOverrideError extends TypeORMError_1.TypeORMError {
    constructor(migrationsOverridingTransactionMode) {
        const migrationNames = migrationsOverridingTransactionMode.map((migration) => `"${migration.name}"`);
        super(`Migrations ${migrationNames.join(", ")} override the transaction mode, but the global transaction mode is "all"`);
    }
}
exports.ForbiddenTransactionModeOverrideError = ForbiddenTransactionModeOverrideError;

//# sourceMappingURL=ForbiddenTransactionModeOverrideError.js.map
