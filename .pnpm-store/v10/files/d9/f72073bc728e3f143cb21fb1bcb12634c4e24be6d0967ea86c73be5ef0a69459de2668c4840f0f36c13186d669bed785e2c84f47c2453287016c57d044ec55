"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinTable = void 0;
const globals_1 = require("../../globals");
/**
 * JoinTable decorator is used in many-to-many relationship to specify owner side of relationship.
 * Its also used to set a custom junction table's name, column names and referenced columns.
 */
function JoinTable(options) {
    return function (object, propertyName) {
        options =
            options ||
                {};
        (0, globals_1.getMetadataArgsStorage)().joinTables.push({
            target: object.constructor,
            propertyName: propertyName,
            name: options.name,
            joinColumns: (options && options.joinColumn
                ? [options.joinColumn]
                : options
                    .joinColumns),
            inverseJoinColumns: (options &&
                options.inverseJoinColumn
                ? [options.inverseJoinColumn]
                : options
                    .inverseJoinColumns),
            schema: options && options.schema ? options.schema : undefined,
            database: options && options.database ? options.database : undefined,
            synchronize: !(options && options.synchronize === false),
        });
    };
}
exports.JoinTable = JoinTable;

//# sourceMappingURL=JoinTable.js.map
