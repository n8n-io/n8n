"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertResult = void 0;
/**
 * Result object returned by InsertQueryBuilder execution.
 */
class InsertResult {
    constructor() {
        /**
         * Contains inserted entity id.
         * Has entity-like structure (not just column database name and values).
         */
        this.identifiers = [];
        /**
         * Generated values returned by a database.
         * Has entity-like structure (not just column database name and values).
         */
        this.generatedMaps = [];
    }
    static from(queryResult) {
        const result = new this();
        result.raw = queryResult.raw;
        return result;
    }
}
exports.InsertResult = InsertResult;

//# sourceMappingURL=InsertResult.js.map
