"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectSerializer = void 0;
__exportStar(require("./errorResponse"), exports);
__exportStar(require("./fullItem"), exports);
__exportStar(require("./fullItemAllOf"), exports);
__exportStar(require("./fullItemAllOfFields"), exports);
__exportStar(require("./fullItemAllOfSection"), exports);
__exportStar(require("./fullItemAllOfSections"), exports);
__exportStar(require("./generatorRecipe"), exports);
__exportStar(require("./item"), exports);
__exportStar(require("./itemUrls"), exports);
__exportStar(require("./itemVault"), exports);
__exportStar(require("./itemFile"), exports);
__exportStar(require("./vault"), exports);
const errorResponse_1 = require("./errorResponse");
const fullItem_1 = require("./fullItem");
const fullItemAllOf_1 = require("./fullItemAllOf");
const fullItemAllOfFields_1 = require("./fullItemAllOfFields");
const fullItemAllOfSection_1 = require("./fullItemAllOfSection");
const fullItemAllOfSections_1 = require("./fullItemAllOfSections");
const generatorRecipe_1 = require("./generatorRecipe");
const item_1 = require("./item");
const itemUrls_1 = require("./itemUrls");
const itemVault_1 = require("./itemVault");
const vault_1 = require("./vault");
let primitives = [
    "string",
    "boolean",
    "double",
    "integer",
    "long",
    "float",
    "number",
    "any"
];
let enumsMap = {
    "FullItem.CategoryEnum": fullItem_1.FullItem.CategoryEnum,
    "FullItemAllOfFields.TypeEnum": fullItemAllOfFields_1.FullItemAllOfFields.TypeEnum,
    "FullItemAllOfFields.PurposeEnum": fullItemAllOfFields_1.FullItemAllOfFields.PurposeEnum,
    "GeneratorRecipe.CharacterSetsEnum": generatorRecipe_1.GeneratorRecipe.CharacterSetsEnum,
    "Item.CategoryEnum": item_1.Item.CategoryEnum,
    "Vault.TypeEnum": vault_1.Vault.TypeEnum,
};
let typeMap = {
    "ErrorResponse": errorResponse_1.ErrorResponse,
    "FullItem": fullItem_1.FullItem,
    "FullItemAllOf": fullItemAllOf_1.FullItemAllOf,
    "FullItemAllOfFields": fullItemAllOfFields_1.FullItemAllOfFields,
    "FullItemAllOfSection": fullItemAllOfSection_1.FullItemAllOfSection,
    "FullItemAllOfSections": fullItemAllOfSections_1.FullItemAllOfSections,
    "GeneratorRecipe": generatorRecipe_1.GeneratorRecipe,
    "Item": item_1.Item,
    "ItemUrls": itemUrls_1.ItemUrls,
    "ItemVault": itemVault_1.ItemVault,
    "Vault": vault_1.Vault,
};
class ObjectSerializer {
    static findCorrectType(data, expectedType) {
        if (data == undefined) {
            return expectedType;
        }
        else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
            return expectedType;
        }
        else if (expectedType === "Date") {
            return expectedType;
        }
        else {
            if (enumsMap[expectedType]) {
                return expectedType;
            }
            if (!typeMap[expectedType]) {
                return expectedType; // w/e we don't know the type
            }
            // Check the discriminator
            let discriminatorProperty = typeMap[expectedType].discriminator;
            if (discriminatorProperty == null) {
                return expectedType; // the type does not have a discriminator. use it.
            }
            else {
                if (data[discriminatorProperty]) {
                    var discriminatorType = data[discriminatorProperty];
                    if (typeMap[discriminatorType]) {
                        return discriminatorType; // use the type given in the discriminator
                    }
                    else {
                        return expectedType; // discriminator did not map to a type
                    }
                }
                else {
                    return expectedType; // discriminator was not present (or an empty string)
                }
            }
        }
    }
    static serialize(data, type) {
        if (data == undefined) {
            return data;
        }
        else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        }
        else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData = [];
            for (let index in data) {
                let date = data[index];
                transformedData.push(ObjectSerializer.serialize(date, subType));
            }
            return transformedData;
        }
        else if (type === "Date") {
            return data.toISOString();
        }
        else {
            if (enumsMap[type]) {
                return data;
            }
            if (!typeMap[type]) { // in case we dont know the type
                return data;
            }
            // Get the actual type of this object
            type = this.findCorrectType(data, type);
            // get the map for the correct type.
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            let instance = {};
            for (let index in attributeTypes) {
                let attributeType = attributeTypes[index];
                instance[attributeType.baseName] = ObjectSerializer.serialize(data[attributeType.name], attributeType.type);
            }
            return instance;
        }
    }
    static deserialize(data, type) {
        // polymorphism may change the actual type.
        type = ObjectSerializer.findCorrectType(data, type);
        if (data == undefined) {
            return data;
        }
        else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        }
        else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData = [];
            for (let index in data) {
                let date = data[index];
                transformedData.push(ObjectSerializer.deserialize(date, subType));
            }
            return transformedData;
        }
        else if (type === "Date") {
            return new Date(data);
        }
        else {
            if (enumsMap[type]) { // is Enum
                return data;
            }
            if (!typeMap[type]) { // dont know the type
                return data;
            }
            let instance = new typeMap[type]();
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            for (let index in attributeTypes) {
                let attributeType = attributeTypes[index];
                instance[attributeType.name] = ObjectSerializer.deserialize(data[attributeType.baseName], attributeType.type);
            }
            return instance;
        }
    }
}
exports.ObjectSerializer = ObjectSerializer;
//# sourceMappingURL=models.js.map