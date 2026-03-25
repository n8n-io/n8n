"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteDateColumn = void 0;
const globals_1 = require("../../globals");
/**
 * This column will store a delete date of the soft-deleted object.
 * This date is being updated each time you soft-delete the object.
 */
function DeleteDateColumn(options) {
    return function (object, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().columns.push({
            target: object.constructor,
            propertyName: propertyName,
            mode: "deleteDate",
            options: options || {},
        });
    };
}
exports.DeleteDateColumn = DeleteDateColumn;

//# sourceMappingURL=DeleteDateColumn.js.map
