"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageUnknownError = exports.StorageApiError = exports.isStorageError = exports.StorageError = void 0;
class StorageError extends Error {
    constructor(message) {
        super(message);
        this.__isStorageError = true;
        this.name = 'StorageError';
    }
}
exports.StorageError = StorageError;
function isStorageError(error) {
    return typeof error === 'object' && error !== null && '__isStorageError' in error;
}
exports.isStorageError = isStorageError;
class StorageApiError extends StorageError {
    constructor(message, status) {
        super(message);
        this.name = 'StorageApiError';
        this.status = status;
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
        };
    }
}
exports.StorageApiError = StorageApiError;
class StorageUnknownError extends StorageError {
    constructor(message, originalError) {
        super(message);
        this.name = 'StorageUnknownError';
        this.originalError = originalError;
    }
}
exports.StorageUnknownError = StorageUnknownError;
//# sourceMappingURL=errors.js.map