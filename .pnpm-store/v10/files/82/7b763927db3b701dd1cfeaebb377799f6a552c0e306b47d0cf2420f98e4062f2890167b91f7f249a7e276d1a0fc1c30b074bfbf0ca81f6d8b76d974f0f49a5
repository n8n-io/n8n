"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManyToMany = void 0;
const globals_1 = require("../../globals");
const ObjectUtils_1 = require("../../util/ObjectUtils");
/**
 * Many-to-many is a type of relationship when Entity1 can have multiple instances of Entity2, and Entity2 can have
 * multiple instances of Entity1. To achieve it, this type of relation creates a junction table, where it storage
 * entity1 and entity2 ids. This is owner side of the relationship.
 */
function ManyToMany(typeFunctionOrTarget, inverseSideOrOptions, options) {
    // normalize parameters
    let inverseSideProperty;
    if (ObjectUtils_1.ObjectUtils.isObject(inverseSideOrOptions)) {
        options = inverseSideOrOptions;
    }
    else {
        inverseSideProperty = inverseSideOrOptions;
    }
    return function (object, propertyName) {
        if (!options)
            options = {};
        // now try to determine it its lazy relation
        let isLazy = options.lazy === true;
        if (!isLazy && Reflect && Reflect.getMetadata) {
            // automatic determination
            const reflectedType = Reflect.getMetadata("design:type", object, propertyName);
            if (reflectedType &&
                typeof reflectedType.name === "string" &&
                reflectedType.name.toLowerCase() === "promise")
                isLazy = true;
        }
        (0, globals_1.getMetadataArgsStorage)().relations.push({
            target: object.constructor,
            propertyName: propertyName,
            // propertyType: reflectedType,
            relationType: "many-to-many",
            isLazy: isLazy,
            type: typeFunctionOrTarget,
            inverseSideProperty: inverseSideProperty,
            options: options,
        });
    };
}
exports.ManyToMany = ManyToMany;

//# sourceMappingURL=ManyToMany.js.map
