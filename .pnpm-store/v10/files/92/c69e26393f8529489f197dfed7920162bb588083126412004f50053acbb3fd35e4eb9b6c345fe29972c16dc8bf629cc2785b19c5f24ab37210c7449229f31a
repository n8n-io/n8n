"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryFailedError = void 0;
const ObjectUtils_1 = require("../util/ObjectUtils");
const TypeORMError_1 = require("./TypeORMError");
/**
 * Thrown when query execution has failed.
 */
class QueryFailedError extends TypeORMError_1.TypeORMError {
    constructor(query, parameters, driverError) {
        super(driverError
            .toString()
            .replace(/^error: /, "")
            .replace(/^Error: /, "")
            .replace(/^Request/, ""));
        this.query = query;
        this.parameters = parameters;
        this.driverError = driverError;
        if (driverError) {
            const { name: _, // eslint-disable-line
            ...otherProperties } = driverError;
            ObjectUtils_1.ObjectUtils.assign(this, {
                ...otherProperties,
            });
        }
    }
}
exports.QueryFailedError = QueryFailedError;

//# sourceMappingURL=QueryFailedError.js.map
