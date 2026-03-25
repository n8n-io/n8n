"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CannotReflectMethodParameterTypeError = void 0;
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when ORM cannot get method parameter's type.
 * Basically, when reflect-metadata is not available or tsconfig is not properly setup.
 */
class CannotReflectMethodParameterTypeError extends TypeORMError_1.TypeORMError {
    constructor(target, methodName) {
        super(`Cannot get reflected type for a "${methodName}" method's parameter of "${target.name}" class. ` +
            `Make sure you have turned on an "emitDecoratorMetadata": true option in tsconfig.json. ` +
            `Also make sure you have imported "reflect-metadata" on top of the main entry file in your application.`);
    }
}
exports.CannotReflectMethodParameterTypeError = CannotReflectMethodParameterTypeError;

//# sourceMappingURL=CannotReflectMethodParameterTypeError.js.map
