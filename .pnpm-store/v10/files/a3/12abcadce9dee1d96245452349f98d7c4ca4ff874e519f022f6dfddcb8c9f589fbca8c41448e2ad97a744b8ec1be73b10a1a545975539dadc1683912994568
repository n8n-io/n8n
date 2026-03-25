"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeORMError = void 0;
class TypeORMError extends Error {
    get name() {
        return this.constructor.name;
    }
    constructor(message, options = {}) {
        super(message, options);
        // restore prototype chain because the base `Error` type
        // will break the prototype chain a little
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, new.target.prototype);
        }
        else {
            ;
            this.__proto__ = new.target.prototype;
        }
    }
}
exports.TypeORMError = TypeORMError;

//# sourceMappingURL=TypeORMError.js.map
