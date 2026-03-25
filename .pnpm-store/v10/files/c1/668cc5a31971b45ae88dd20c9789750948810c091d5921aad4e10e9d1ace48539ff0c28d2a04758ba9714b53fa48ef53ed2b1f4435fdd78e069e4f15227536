"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateResult = void 0;
/**
 * Result object returned by UpdateQueryBuilder execution.
 */
class UpdateResult {
    constructor() {
        /**
         * Contains inserted entity id.
         * Has entity-like structure (not just column database name and values).
         */
        // identifier: ObjectLiteral[] = [];
        /**
         * Generated values returned by a database.
         * Has entity-like structure (not just column database name and values).
         */
        this.generatedMaps = [];
    }
    static from(queryResult) {
        const result = new this();
        result.raw = queryResult.records;
        result.affected = queryResult.affected;
        return result;
    }
}
exports.UpdateResult = UpdateResult;

//# sourceMappingURL=UpdateResult.js.map
