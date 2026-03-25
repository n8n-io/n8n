"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingDriverError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when consumer specifies driver type that does not exist or supported.
 */
class MissingDriverError extends TypeORMError_1.TypeORMError {
    constructor(driverType, availableDrivers = []) {
        super(`Wrong driver: "${driverType}" given. Supported drivers are: ` +
            `${availableDrivers.map((d) => `"${d}"`).join(", ")}.`);
    }
}
exports.MissingDriverError = MissingDriverError;

//# sourceMappingURL=MissingDriverError.js.map
