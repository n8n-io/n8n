"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationId = void 0;
const globals_1 = require("../../globals");
/**
 * Special decorator used to extract relation id into separate entity property.
 *
 * @experimental
 */
function RelationId(relation, alias, queryBuilderFactory) {
    return function (object, propertyName) {
        (0, globals_1.getMetadataArgsStorage)().relationIds.push({
            target: object.constructor,
            propertyName: propertyName,
            relation: relation,
            alias: alias,
            queryBuilderFactory: queryBuilderFactory,
        });
    };
}
exports.RelationId = RelationId;

//# sourceMappingURL=RelationId.js.map
