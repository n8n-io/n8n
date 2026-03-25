"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircularRelationsError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when circular relations detected with nullable set to false.
 */
class CircularRelationsError extends TypeORMError_1.TypeORMError {
    constructor(path) {
        super(`Circular relations detected: ${path}. To resolve this issue you need to ` +
            `set nullable: true somewhere in this dependency structure.`);
    }
}
exports.CircularRelationsError = CircularRelationsError;

//# sourceMappingURL=CircularRelationsError.js.map
