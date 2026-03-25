"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimaryGeneratedColumn = void 0;
const globals_1 = require("../../globals");
const ObjectUtils_1 = require("../../util/ObjectUtils");
/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 * This column creates an integer PRIMARY COLUMN with generated set to true.
 */
function PrimaryGeneratedColumn(strategyOrOptions, maybeOptions) {
    // normalize parameters
    const options = {};
    let strategy;
    if (strategyOrOptions) {
        if (typeof strategyOrOptions === "string")
            strategy = strategyOrOptions;
        if (ObjectUtils_1.ObjectUtils.isObject(strategyOrOptions)) {
            strategy = "increment";
            Object.assign(options, strategyOrOptions);
        }
    }
    else {
        strategy = "increment";
    }
    if (ObjectUtils_1.ObjectUtils.isObject(maybeOptions))
        Object.assign(options, maybeOptions);
    return function (object, propertyName) {
        // if column type is not explicitly set then determine it based on generation strategy
        if (!options.type) {
            if (strategy === "increment" || strategy === "identity") {
                options.type = Number;
            }
            else if (strategy === "uuid") {
                options.type = "uuid";
            }
            else if (strategy === "rowid") {
                options.type = "int";
            }
        }
        // explicitly set a primary and generated to column options
        options.primary = true;
        // register column metadata args
        (0, globals_1.getMetadataArgsStorage)().columns.push({
            target: object.constructor,
            propertyName: propertyName,
            mode: "regular",
            options: options,
        });
        // register generated metadata args
        (0, globals_1.getMetadataArgsStorage)().generations.push({
            target: object.constructor,
            propertyName: propertyName,
            strategy: strategy,
        });
    };
}
exports.PrimaryGeneratedColumn = PrimaryGeneratedColumn;

//# sourceMappingURL=PrimaryGeneratedColumn.js.map
