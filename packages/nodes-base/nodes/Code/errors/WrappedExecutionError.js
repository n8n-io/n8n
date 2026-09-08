import { UserError } from 'n8n-workflow';
/**
 * Properties that control error identity and reporting. The payload comes
 * from JSON, so these must not overwrite the values this class sets.
 */
const PROTECTED_PROPERTIES = new Set(['name', 'message', 'level', 'shouldReport', 'stack']);
/**
 * Errors received from the task runner are not instances of Error.
 * This class wraps them in an Error instance and makes all their
 * properties available.
 */
export class WrappedExecutionError extends UserError {
    constructor(error) {
        const message = typeof error.message === 'string' ? error.message : 'Unknown error';
        super(message, {
            cause: error,
        });
        this.name = 'WrappedExecutionError';
        this.copyErrorProperties(error);
    }
    copyErrorProperties(error) {
        for (const key of Object.getOwnPropertyNames(error)) {
            if (PROTECTED_PROPERTIES.has(key))
                continue;
            this[key] = error[key];
        }
    }
}
export function isWrappableError(error) {
    return typeof error === 'object' && error !== null;
}
//# sourceMappingURL=WrappedExecutionError.js.map