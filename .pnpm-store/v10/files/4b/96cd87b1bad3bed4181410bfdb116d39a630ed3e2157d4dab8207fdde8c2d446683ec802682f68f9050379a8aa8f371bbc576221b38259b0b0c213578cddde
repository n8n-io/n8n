"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualColumn = void 0;
const error_1 = require("../../error");
const globals_1 = require("../../globals");
/**
 * VirtualColumn decorator is used to mark a specific class property as a Virtual column.
 */
function VirtualColumn(typeOrOptions, options) {
    return function (object, propertyName) {
        // normalize parameters
        let type;
        if (typeof typeOrOptions === "string") {
            type = typeOrOptions;
        }
        else {
            options = typeOrOptions;
            type = options.type;
        }
        if (!options?.query) {
            throw new Error("Column options must be defined for calculated columns.");
        }
        // if type is not given explicitly then try to guess it
        const reflectMetadataType = Reflect && Reflect.getMetadata
            ? Reflect.getMetadata("design:type", object, propertyName)
            : undefined;
        if (!type && reflectMetadataType)
            // if type is not given explicitly then try to guess it
            type = reflectMetadataType;
        // check if there is no type in column options then set type from first function argument, or guessed one
        if (type)
            options.type = type;
        // specify HSTORE type if column is HSTORE
        if (options.type === "hstore" && !options.hstoreType)
            options.hstoreType =
                reflectMetadataType === Object ? "object" : "string";
        // if we still don't have a type then we need to give error to user that type is required
        if (!options.type)
            throw new error_1.ColumnTypeUndefinedError(object, propertyName);
        (0, globals_1.getMetadataArgsStorage)().columns.push({
            target: object.constructor,
            propertyName: propertyName,
            mode: "virtual-property",
            options: options || {},
        });
    };
}
exports.VirtualColumn = VirtualColumn;

//# sourceMappingURL=VirtualColumn.js.map
