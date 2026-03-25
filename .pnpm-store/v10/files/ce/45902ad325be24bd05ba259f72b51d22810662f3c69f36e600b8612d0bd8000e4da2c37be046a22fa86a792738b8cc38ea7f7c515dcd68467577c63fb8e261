"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unique = void 0;
const globals_1 = require("../globals");
const ObjectUtils_1 = require("../util/ObjectUtils");
/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
function Unique(nameOrFieldsOrOptions, maybeFieldsOrOptions, maybeOptions) {
    const name = typeof nameOrFieldsOrOptions === "string"
        ? nameOrFieldsOrOptions
        : undefined;
    const fields = typeof nameOrFieldsOrOptions === "string"
        ? maybeFieldsOrOptions
        : nameOrFieldsOrOptions;
    let options = ObjectUtils_1.ObjectUtils.isObject(nameOrFieldsOrOptions) &&
        !Array.isArray(nameOrFieldsOrOptions)
        ? nameOrFieldsOrOptions
        : maybeOptions;
    if (!options)
        options =
            ObjectUtils_1.ObjectUtils.isObject(nameOrFieldsOrOptions) &&
                !Array.isArray(maybeFieldsOrOptions)
                ? maybeFieldsOrOptions
                : maybeOptions;
    return function (clsOrObject, propertyName) {
        let columns = fields;
        if (propertyName !== undefined) {
            switch (typeof propertyName) {
                case "string":
                    columns = [propertyName];
                    break;
                case "symbol":
                    columns = [propertyName.toString()];
                    break;
            }
        }
        const args = {
            target: propertyName
                ? clsOrObject.constructor
                : clsOrObject,
            name: name,
            columns,
            deferrable: options ? options.deferrable : undefined,
        };
        (0, globals_1.getMetadataArgsStorage)().uniques.push(args);
    };
}
exports.Unique = Unique;

//# sourceMappingURL=Unique.js.map
