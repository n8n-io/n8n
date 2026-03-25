"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewEntity = void 0;
const globals_1 = require("../../globals");
const ObjectUtils_1 = require("../../util/ObjectUtils");
/**
 * This decorator is used to mark classes that will be an entity view.
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
function ViewEntity(nameOrOptions, maybeOptions) {
    const options = (ObjectUtils_1.ObjectUtils.isObject(nameOrOptions)
        ? nameOrOptions
        : maybeOptions) || {};
    const name = typeof nameOrOptions === "string" ? nameOrOptions : options.name;
    return function (target) {
        (0, globals_1.getMetadataArgsStorage)().tables.push({
            target: target,
            name: name,
            expression: options.expression,
            dependsOn: options.dependsOn
                ? new Set(options.dependsOn)
                : undefined,
            type: "view",
            database: options.database ? options.database : undefined,
            schema: options.schema ? options.schema : undefined,
            synchronize: options.synchronize === false ? false : true,
            materialized: !!options.materialized,
        });
    };
}
exports.ViewEntity = ViewEntity;

//# sourceMappingURL=ViewEntity.js.map
