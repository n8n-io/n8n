"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeChildren = void 0;
const globals_1 = require("../../globals");
/**
 * Marks a entity property as a children of the tree.
 * "Tree children" will contain all children (bind) of this entity.
 */
function TreeChildren(options) {
    return function (object, propertyName) {
        if (!options)
            options = {};
        // now try to determine it its lazy relation
        const reflectedType = Reflect && Reflect.getMetadata
            ? Reflect.getMetadata("design:type", object, propertyName)
            : undefined;
        const isLazy = (reflectedType &&
            typeof reflectedType.name === "string" &&
            reflectedType.name.toLowerCase() === "promise") ||
            false;
        // add one-to-many relation for this
        (0, globals_1.getMetadataArgsStorage)().relations.push({
            isTreeChildren: true,
            target: object.constructor,
            propertyName: propertyName,
            isLazy: isLazy,
            relationType: "one-to-many",
            type: () => object.constructor,
            options: options,
        });
    };
}
exports.TreeChildren = TreeChildren;

//# sourceMappingURL=TreeChildren.js.map
