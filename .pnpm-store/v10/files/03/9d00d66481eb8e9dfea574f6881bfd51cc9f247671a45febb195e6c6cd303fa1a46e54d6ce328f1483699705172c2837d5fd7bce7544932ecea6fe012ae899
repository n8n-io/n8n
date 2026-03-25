"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OneToMany = void 0;
const globals_1 = require("../../globals");
/**
 * A one-to-many relation allows creating the type of relation where Entity1 can have multiple instances of Entity2,
 * but Entity2 has only one Entity1. Entity2 is the owner of the relationship, and stores the id of Entity1 on its
 * side of the relation.
 */
function OneToMany(typeFunctionOrTarget, inverseSide, options) {
    return function (object, propertyName) {
        if (!options)
            options = {};
        // Now try to determine if it is a lazy relation.
        let isLazy = options && options.lazy === true;
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
            isLazy: isLazy,
            relationType: "one-to-many",
            type: typeFunctionOrTarget,
            inverseSideProperty: inverseSide,
            options: options,
        });
    };
}
exports.OneToMany = OneToMany;

//# sourceMappingURL=OneToMany.js.map
