"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildEntity = void 0;
const globals_1 = require("../../globals");
/**
 * Special type of the table used in the single-table inherited tables.
 */
function ChildEntity(discriminatorValue) {
    return function (target) {
        // register a table metadata
        (0, globals_1.getMetadataArgsStorage)().tables.push({
            target: target,
            type: "entity-child",
        });
        // register discriminator value if it was provided
        if (typeof discriminatorValue !== "undefined") {
            (0, globals_1.getMetadataArgsStorage)().discriminatorValues.push({
                target: target,
                value: discriminatorValue,
            });
        }
    };
}
exports.ChildEntity = ChildEntity;

//# sourceMappingURL=ChildEntity.js.map
