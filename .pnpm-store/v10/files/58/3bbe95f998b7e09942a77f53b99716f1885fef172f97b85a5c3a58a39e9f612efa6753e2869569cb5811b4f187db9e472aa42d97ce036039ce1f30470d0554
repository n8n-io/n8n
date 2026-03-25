"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generated = void 0;
const globals_1 = require("../globals");
/**
 * Marks a column to generate a value on entity insertion.
 * There are three types of generation strategy - increment, uuid and rowid (cockroachdb only).
 * Increment uses a number which increases by one on each insertion.
 * Uuid generates a special UUID token.
 * Rowid supports only in CockroachDB and uses `unique_rowid()` function
 *
 * Note, some databases do not support non-primary generation columns.
 */
function Generated(strategy = "increment") {
    return function (object, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().generations.push({
            target: object.constructor,
            propertyName: propertyName,
            strategy: strategy,
        });
    };
}
exports.Generated = Generated;

//# sourceMappingURL=Generated.js.map
