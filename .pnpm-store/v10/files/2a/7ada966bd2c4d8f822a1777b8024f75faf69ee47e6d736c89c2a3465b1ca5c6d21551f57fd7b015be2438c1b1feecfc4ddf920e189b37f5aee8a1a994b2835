"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Column = void 0;
const globals_1 = require("../../globals");
const ColumnTypeUndefinedError_1 = require("../../error/ColumnTypeUndefinedError");
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 */
function Column(typeOrOptions, options) {
    return function (object, propertyName) {
        // normalize parameters
        let type;
        if (typeof typeOrOptions === "string" ||
            typeof typeOrOptions === "function") {
            type = typeOrOptions;
        }
        else if (typeOrOptions) {
            options = typeOrOptions;
            type = typeOrOptions.type;
        }
        if (!options)
            options = {};
        // if type is not given explicitly then try to guess it
        const reflectMetadataType = Reflect && Reflect.getMetadata
            ? Reflect.getMetadata("design:type", object, propertyName)
            : undefined;
        if (!type && reflectMetadataType)
            // if type is not given explicitly then try to guess it
            type = reflectMetadataType;
        // check if there is no type in column options then set type from first function argument, or guessed one
        if (!options.type && type)
            options.type = type;
        // specify HSTORE type if column is HSTORE
        if (options.type === "hstore" && !options.hstoreType)
            options.hstoreType =
                reflectMetadataType === Object ? "object" : "string";
        if (typeof typeOrOptions === "function") {
            // register an embedded
            (0, globals_1.getMetadataArgsStorage)().embeddeds.push({
                target: object.constructor,
                propertyName: propertyName,
                isArray: reflectMetadataType === Array || options.array === true,
                prefix: options.prefix !== undefined ? options.prefix : undefined,
                type: typeOrOptions,
            });
        }
        else {
            // register a regular column
            // if we still don't have a type then we need to give error to user that type is required
            if (!options.type)
                throw new ColumnTypeUndefinedError_1.ColumnTypeUndefinedError(object, propertyName);
            // create unique
            if (options.unique === true)
                (0, globals_1.getMetadataArgsStorage)().uniques.push({
                    target: object.constructor,
                    columns: [propertyName],
                });
            (0, globals_1.getMetadataArgsStorage)().columns.push({
                target: object.constructor,
                propertyName: propertyName,
                mode: "regular",
                options: options,
            });
            if (options.generated) {
                (0, globals_1.getMetadataArgsStorage)().generations.push({
                    target: object.constructor,
                    propertyName: propertyName,
                    strategy: typeof options.generated === "string"
                        ? options.generated
                        : "increment",
                });
            }
        }
    };
}
exports.Column = Column;

//# sourceMappingURL=Column.js.map
