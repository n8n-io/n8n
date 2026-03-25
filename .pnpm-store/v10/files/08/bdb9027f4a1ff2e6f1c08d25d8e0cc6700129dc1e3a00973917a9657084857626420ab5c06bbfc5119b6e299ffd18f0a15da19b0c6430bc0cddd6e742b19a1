"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectIdColumn = void 0;
const globals_1 = require("../../globals");
/**
 * Special type of column that is available only for MongoDB database.
 * Marks your entity's column to be an object id.
 */
function ObjectIdColumn(options) {
    return function (object, propertyName) {
        // if column options are not given then create a new empty options
        if (!options)
            options = {};
        options.primary = true;
        if (!options.name)
            options.name = "_id";
        // create and register a new column metadata
        (0, globals_1.getMetadataArgsStorage)().columns.push({
            target: object.constructor,
            propertyName: propertyName,
            mode: "objectId",
            options: options,
        });
    };
}
exports.ObjectIdColumn = ObjectIdColumn;

//# sourceMappingURL=ObjectIdColumn.js.map
