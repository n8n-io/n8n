"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManyToOne = void 0;
const globals_1 = require("../../globals");
const ObjectUtils_1 = require("../../util/ObjectUtils");
/**
 * A many-to-one relation allows creating the type of relation where Entity1 can have a single instance of Entity2, but
 * Entity2 can have multiple instances of Entity1. Entity1 is the owner of the relationship, and stores the id of
 * Entity2 on its side of the relation.
 */
function ManyToOne(typeFunctionOrTarget, inverseSideOrOptions, options) {
    // Normalize parameters.
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
            relationType: "many-to-one",
            isLazy: isLazy,
            type: typeFunctionOrTarget,
            inverseSideProperty: inverseSideProperty,
            options: options,
        });
    };
}
exports.ManyToOne = ManyToOne;

//# sourceMappingURL=ManyToOne.js.map
