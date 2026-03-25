import { Migration } from "../migration/Migration";
import { TypeORMError } from "./TypeORMError";
/**
 * Thrown when the per-migration transaction mode is overriden but the global transaction mode is set to "all".
 */
export declare class ForbiddenTransactionModeOverrideError extends TypeORMError {
    constructor(migrationsOverridingTransactionMode: Migration[]);
}
