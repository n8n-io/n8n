"use strict";
/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
// feature test for Symbol support
var supportsSymbol = typeof Symbol === "function";
var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : fail("Symbol.toPrimitive not found.");
var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : fail("Symbol.iterator not found.");
// Load global or shim versions of Map, Set, and WeakMap
var functionPrototype = Object.getPrototypeOf(Function);
var _Map = typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : fail("A valid Map constructor could not be found.");
var _Set = typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : fail("A valid Set constructor could not be found.");
var _WeakMap = typeof WeakMap === "function" ? WeakMap : fail("A valid WeakMap constructor could not be found.");
var registrySymbol = supportsSymbol ? Symbol.for("@reflect-metadata:registry") : undefined;
var metadataRegistry = GetOrCreateMetadataRegistry();
var metadataProvider = CreateMetadataProvider(metadataRegistry);
/**
 * Applies a set of decorators to a property of a target object.
 * @param decorators An array of decorators.
 * @param target The target object.
 * @param propertyKey (Optional) The property key to decorate.
 * @param attributes (Optional) The property descriptor for the target key.
 * @remarks Decorators are applied in reverse order.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     Example = Reflect.decorate(decoratorsArray, Example);
 *
 *     // property (on constructor)
 *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
 *
 *     // property (on prototype)
 *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
 *
 *     // method (on constructor)
 *     Object.defineProperty(Example, "staticMethod",
 *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
 *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
 *
 *     // method (on prototype)
 *     Object.defineProperty(Example.prototype, "method",
 *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
 *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
 *
 */
function decorate(decorators, target, propertyKey, attributes) {
    if (!IsUndefined(propertyKey)) {
        if (!IsArray(decorators))
            throw new TypeError();
        if (!IsObject(target))
            throw new TypeError();
        if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
            throw new TypeError();
        if (IsNull(attributes))
            attributes = undefined;
        propertyKey = ToPropertyKey(propertyKey);
        return DecorateProperty(decorators, target, propertyKey, attributes);
    }
    else {
        if (!IsArray(decorators))
            throw new TypeError();
        if (!IsConstructor(target))
            throw new TypeError();
        return DecorateConstructor(decorators, target);
    }
}
exports.decorate = decorate;
// 4.1.2 Reflect.metadata(metadataKey, metadataValue)
// https://rbuckton.github.io/reflect-metadata/#reflect.metadata
/**
 * A default metadata decorator factory that can be used on a class, class member, or parameter.
 * @param metadataKey The key for the metadata entry.
 * @param metadataValue The value for the metadata entry.
 * @returns A decorator function.
 * @remarks
 * If `metadataKey` is already defined for the target and target key, the
 * metadataValue for that key will be overwritten.
 * @example
 *
 *     // constructor
 *     @Reflect.metadata(key, value)
 *     class Example {
 *     }
 *
 *     // property (on constructor, TypeScript only)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         static staticProperty;
 *     }
 *
 *     // property (on prototype, TypeScript only)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         property;
 *     }
 *
 *     // method (on constructor)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         static staticMethod() { }
 *     }
 *
 *     // method (on prototype)
 *     class Example {
 *         @Reflect.metadata(key, value)
 *         method() { }
 *     }
 *
 */
function metadata(metadataKey, metadataValue) {
    if (typeof Reflect !== "undefined" && typeof Reflect.metadata === "function" && Reflect.metadata !== metadata) {
        return Reflect.metadata(metadataKey, metadataValue);
    }
    function decorator(target, propertyKey) {
        if (!IsObject(target))
            throw new TypeError();
        if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
            throw new TypeError();
        OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
    }
    return decorator;
}
exports.metadata = metadata;
/**
 * Define a unique metadata entry on the target.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param metadataValue A value that contains attached metadata.
 * @param target The target object on which to define metadata.
 * @param propertyKey (Optional) The property key for the target.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     Reflect.defineMetadata("custom:annotation", options, Example);
 *
 *     // property (on constructor)
 *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
 *
 *     // property (on prototype)
 *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
 *
 *     // method (on constructor)
 *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
 *
 *     // method (on prototype)
 *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
 *
 *     // decorator factory as metadata-producing annotation.
 *     function MyAnnotation(options): Decorator {
 *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
 *     }
 *
 */
function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
}
exports.defineMetadata = defineMetadata;
/**
 * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.hasMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
 *
 */
function hasMetadata(metadataKey, target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    return OrdinaryHasMetadata(metadataKey, target, propertyKey);
}
exports.hasMetadata = hasMetadata;
/**
 * Gets a value indicating whether the target object has the provided metadata key defined.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
 *
 */
function hasOwnMetadata(metadataKey, target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
}
exports.hasOwnMetadata = hasOwnMetadata;
/**
 * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
 *
 */
function getMetadata(metadataKey, target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    return OrdinaryGetMetadata(metadataKey, target, propertyKey);
}
exports.getMetadata = getMetadata;
/**
 * Gets the metadata value for the provided metadata key on the target object.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getOwnMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
 *
 */
function getOwnMetadata(metadataKey, target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
}
exports.getOwnMetadata = getOwnMetadata;
/**
 * Gets the metadata keys defined on the target object or its prototype chain.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns An array of unique metadata keys.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getMetadataKeys(Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getMetadataKeys(Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getMetadataKeys(Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getMetadataKeys(Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getMetadataKeys(Example.prototype, "method");
 *
 */
function getMetadataKeys(target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    return OrdinaryMetadataKeys(target, propertyKey);
}
exports.getMetadataKeys = getMetadataKeys;
/**
 * Gets the unique metadata keys defined on the target object.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns An array of unique metadata keys.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.getOwnMetadataKeys(Example);
 *
 *     // property (on constructor)
 *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
 *
 */
function getOwnMetadataKeys(target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    return OrdinaryOwnMetadataKeys(target, propertyKey);
}
exports.getOwnMetadataKeys = getOwnMetadataKeys;
/**
 * Deletes the metadata entry from the target object with the provided key.
 * @param metadataKey A key used to store and retrieve metadata.
 * @param target The target object on which the metadata is defined.
 * @param propertyKey (Optional) The property key for the target.
 * @returns `true` if the metadata entry was found and deleted; otherwise, false.
 * @example
 *
 *     class Example {
 *         // property declarations are not part of ES6, though they are valid in TypeScript:
 *         // static staticProperty;
 *         // property;
 *
 *         constructor(p) { }
 *         static staticMethod(p) { }
 *         method(p) { }
 *     }
 *
 *     // constructor
 *     result = Reflect.deleteMetadata("custom:annotation", Example);
 *
 *     // property (on constructor)
 *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
 *
 *     // property (on prototype)
 *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
 *
 *     // method (on constructor)
 *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
 *
 *     // method (on prototype)
 *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
 *
 */
function deleteMetadata(metadataKey, target, propertyKey) {
    if (!IsObject(target))
        throw new TypeError();
    if (!IsUndefined(propertyKey))
        propertyKey = ToPropertyKey(propertyKey);
    var provider = GetMetadataProvider(target, propertyKey, /*Create*/ false);
    if (IsUndefined(provider))
        return false;
    return provider.OrdinaryDeleteMetadata(metadataKey, target, propertyKey);
}
exports.deleteMetadata = deleteMetadata;
function DecorateConstructor(decorators, target) {
    for (var i = decorators.length - 1; i >= 0; --i) {
        var decorator = decorators[i];
        var decorated = decorator(target);
        if (!IsUndefined(decorated) && !IsNull(decorated)) {
            if (!IsConstructor(decorated))
                throw new TypeError();
            target = decorated;
        }
    }
    return target;
}
function DecorateProperty(decorators, target, propertyKey, descriptor) {
    for (var i = decorators.length - 1; i >= 0; --i) {
        var decorator = decorators[i];
        var decorated = decorator(target, propertyKey, descriptor);
        if (!IsUndefined(decorated) && !IsNull(decorated)) {
            if (!IsObject(decorated))
                throw new TypeError();
            descriptor = decorated;
        }
    }
    return descriptor;
}
// 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
function OrdinaryHasMetadata(MetadataKey, O, P) {
    var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
    if (hasOwn)
        return true;
    var parent = OrdinaryGetPrototypeOf(O);
    if (!IsNull(parent))
        return OrdinaryHasMetadata(MetadataKey, parent, P);
    return false;
}
// 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
    var provider = GetMetadataProvider(O, P, /*Create*/ false);
    if (IsUndefined(provider))
        return false;
    return ToBoolean(provider.OrdinaryHasOwnMetadata(MetadataKey, O, P));
}
// 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
function OrdinaryGetMetadata(MetadataKey, O, P) {
    var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
    if (hasOwn)
        return OrdinaryGetOwnMetadata(MetadataKey, O, P);
    var parent = OrdinaryGetPrototypeOf(O);
    if (!IsNull(parent))
        return OrdinaryGetMetadata(MetadataKey, parent, P);
    return undefined;
}
// 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
    var provider = GetMetadataProvider(O, P, /*Create*/ false);
    if (IsUndefined(provider))
        return;
    return provider.OrdinaryGetOwnMetadata(MetadataKey, O, P);
}
// 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
    var provider = GetMetadataProvider(O, P, /*Create*/ true);
    provider.OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P);
}
// 3.1.6.1 OrdinaryMetadataKeys(O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
function OrdinaryMetadataKeys(O, P) {
    var ownKeys = OrdinaryOwnMetadataKeys(O, P);
    var parent = OrdinaryGetPrototypeOf(O);
    if (parent === null)
        return ownKeys;
    var parentKeys = OrdinaryMetadataKeys(parent, P);
    if (parentKeys.length <= 0)
        return ownKeys;
    if (ownKeys.length <= 0)
        return parentKeys;
    var set = new _Set();
    var keys = [];
    for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
        var key = ownKeys_1[_i];
        var hasKey = set.has(key);
        if (!hasKey) {
            set.add(key);
            keys.push(key);
        }
    }
    for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
        var key = parentKeys_1[_a];
        var hasKey = set.has(key);
        if (!hasKey) {
            set.add(key);
            keys.push(key);
        }
    }
    return keys;
}
// 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
// https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
function OrdinaryOwnMetadataKeys(O, P) {
    var provider = GetMetadataProvider(O, P, /*create*/ false);
    if (!provider) {
        return [];
    }
    return provider.OrdinaryOwnMetadataKeys(O, P);
}
// 6 ECMAScript Data Types and Values
// https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
function Type(x) {
    if (x === null)
        return 1 /* Null */;
    switch (typeof x) {
        case "undefined": return 0 /* Undefined */;
        case "boolean": return 2 /* Boolean */;
        case "string": return 3 /* String */;
        case "symbol": return 4 /* Symbol */;
        case "number": return 5 /* Number */;
        case "object": return x === null ? 1 /* Null */ : 6 /* Object */;
        default: return 6 /* Object */;
    }
}
// 6.1.1 The Undefined Type
// https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
function IsUndefined(x) {
    return x === undefined;
}
// 6.1.2 The Null Type
// https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
function IsNull(x) {
    return x === null;
}
// 6.1.5 The Symbol Type
// https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
function IsSymbol(x) {
    return typeof x === "symbol";
}
// 6.1.7 The Object Type
// https://tc39.github.io/ecma262/#sec-object-type
function IsObject(x) {
    return typeof x === "object" ? x !== null : typeof x === "function";
}
// 7.1 Type Conversion
// https://tc39.github.io/ecma262/#sec-type-conversion
// 7.1.1 ToPrimitive(input [, PreferredType])
// https://tc39.github.io/ecma262/#sec-toprimitive
function ToPrimitive(input, PreferredType) {
    switch (Type(input)) {
        case 0 /* Undefined */: return input;
        case 1 /* Null */: return input;
        case 2 /* Boolean */: return input;
        case 3 /* String */: return input;
        case 4 /* Symbol */: return input;
        case 5 /* Number */: return input;
    }
    var hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
    var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
    if (exoticToPrim !== undefined) {
        var result = exoticToPrim.call(input, hint);
        if (IsObject(result))
            throw new TypeError();
        return result;
    }
    return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
}
// 7.1.1.1 OrdinaryToPrimitive(O, hint)
// https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
function OrdinaryToPrimitive(O, hint) {
    if (hint === "string") {
        var toString_1 = O.toString;
        if (IsCallable(toString_1)) {
            var result = toString_1.call(O);
            if (!IsObject(result))
                return result;
        }
        var valueOf = O.valueOf;
        if (IsCallable(valueOf)) {
            var result = valueOf.call(O);
            if (!IsObject(result))
                return result;
        }
    }
    else {
        var valueOf = O.valueOf;
        if (IsCallable(valueOf)) {
            var result = valueOf.call(O);
            if (!IsObject(result))
                return result;
        }
        var toString_2 = O.toString;
        if (IsCallable(toString_2)) {
            var result = toString_2.call(O);
            if (!IsObject(result))
                return result;
        }
    }
    throw new TypeError();
}
// 7.1.2 ToBoolean(argument)
// https://tc39.github.io/ecma262/2016/#sec-toboolean
function ToBoolean(argument) {
    return !!argument;
}
// 7.1.12 ToString(argument)
// https://tc39.github.io/ecma262/#sec-tostring
function ToString(argument) {
    return "" + argument;
}
// 7.1.14 ToPropertyKey(argument)
// https://tc39.github.io/ecma262/#sec-topropertykey
function ToPropertyKey(argument) {
    var key = ToPrimitive(argument, 3 /* String */);
    if (IsSymbol(key))
        return key;
    return ToString(key);
}
// 7.2 Testing and Comparison Operations
// https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations
// 7.2.2 IsArray(argument)
// https://tc39.github.io/ecma262/#sec-isarray
function IsArray(argument) {
    return Array.isArray
        ? Array.isArray(argument)
        : argument instanceof Object
            ? argument instanceof Array
            : Object.prototype.toString.call(argument) === "[object Array]";
}
// 7.2.3 IsCallable(argument)
// https://tc39.github.io/ecma262/#sec-iscallable
function IsCallable(argument) {
    // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
    return typeof argument === "function";
}
// 7.2.4 IsConstructor(argument)
// https://tc39.github.io/ecma262/#sec-isconstructor
function IsConstructor(argument) {
    // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
    return typeof argument === "function";
}
// 7.2.7 IsPropertyKey(argument)
// https://tc39.github.io/ecma262/#sec-ispropertykey
function IsPropertyKey(argument) {
    switch (Type(argument)) {
        case 3 /* String */: return true;
        case 4 /* Symbol */: return true;
        default: return false;
    }
}
// 7.3 Operations on Objects
// https://tc39.github.io/ecma262/#sec-operations-on-objects
// 7.3.9 GetMethod(V, P)
// https://tc39.github.io/ecma262/#sec-getmethod
function GetMethod(V, P) {
    var func = V[P];
    if (func === undefined || func === null)
        return undefined;
    if (!IsCallable(func))
        throw new TypeError();
    return func;
}
// 7.4 Operations on Iterator Objects
// https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
function GetIterator(obj) {
    var method = GetMethod(obj, iteratorSymbol);
    if (!IsCallable(method))
        throw new TypeError(); // from Call
    var iterator = method.call(obj);
    if (!IsObject(iterator))
        throw new TypeError();
    return iterator;
}
// 7.4.4 IteratorValue(iterResult)
// https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
function IteratorValue(iterResult) {
    return iterResult.value;
}
// 7.4.5 IteratorStep(iterator)
// https://tc39.github.io/ecma262/#sec-iteratorstep
function IteratorStep(iterator) {
    var result = iterator.next();
    return result.done ? false : result;
}
// 7.4.6 IteratorClose(iterator, completion)
// https://tc39.github.io/ecma262/#sec-iteratorclose
function IteratorClose(iterator) {
    var f = iterator["return"];
    if (f)
        f.call(iterator);
}
// 9.1 Ordinary Object Internal Methods and Internal Slots
// https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
// 9.1.1.1 OrdinaryGetPrototypeOf(O)
// https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
function OrdinaryGetPrototypeOf(O) {
    var proto = Object.getPrototypeOf(O);
    if (typeof O !== "function" || O === functionPrototype)
        return proto;
    // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
    // Try to determine the superclass constructor. Compatible implementations
    // must either set __proto__ on a subclass constructor to the superclass constructor,
    // or ensure each class has a valid `constructor` property on its prototype that
    // points back to the constructor.
    // If this is not the same as Function.[[Prototype]], then this is definately inherited.
    // This is the case when in ES6 or when using __proto__ in a compatible browser.
    if (proto !== functionPrototype)
        return proto;
    // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
    var prototype = O.prototype;
    var prototypeProto = prototype && Object.getPrototypeOf(prototype);
    if (prototypeProto == null || prototypeProto === Object.prototype)
        return proto;
    // If the constructor was not a function, then we cannot determine the heritage.
    var constructor = prototypeProto.constructor;
    if (typeof constructor !== "function")
        return proto;
    // If we have some kind of self-reference, then we cannot determine the heritage.
    if (constructor === O)
        return proto;
    // we have a pretty good guess at the heritage.
    return constructor;
}
function fail(e) {
    throw e;
}
// Global metadata registry
// - Allows `import "reflect-metadata"` and `import "reflect-metadata/no-conflict"` to interoperate.
// - Uses isolated metadata if `Reflect` is frozen before the registry can be installed.
/**
 * Creates a registry used to allow multiple `reflect-metadata` providers.
 */
function CreateMetadataRegistry() {
    var fallback;
    if (!IsUndefined(registrySymbol) &&
        typeof Reflect !== "undefined" &&
        !(registrySymbol in Reflect) &&
        typeof Reflect.defineMetadata === "function") {
        // interoperate with older version of `reflect-metadata` that did not support a registry.
        fallback = CreateFallbackProvider(Reflect);
    }
    var first;
    var second;
    var rest;
    var targetProviderMap = new _WeakMap();
    var registry = {
        registerProvider: registerProvider,
        getProvider: getProvider,
        setProvider: setProvider,
    };
    return registry;
    function registerProvider(provider) {
        if (!Object.isExtensible(registry)) {
            throw new Error("Cannot add provider to a frozen registry.");
        }
        switch (true) {
            case fallback === provider: break;
            case IsUndefined(first):
                first = provider;
                break;
            case first === provider: break;
            case IsUndefined(second):
                second = provider;
                break;
            case second === provider: break;
            default:
                if (rest === undefined)
                    rest = new _Set();
                rest.add(provider);
                break;
        }
    }
    function getProviderNoCache(O, P) {
        if (!IsUndefined(first)) {
            if (first.isProviderFor(O, P))
                return first;
            if (!IsUndefined(second)) {
                if (second.isProviderFor(O, P))
                    return first;
                if (!IsUndefined(rest)) {
                    var iterator = GetIterator(rest);
                    while (true) {
                        var next = IteratorStep(iterator);
                        if (!next) {
                            return undefined;
                        }
                        var provider = IteratorValue(next);
                        if (provider.isProviderFor(O, P)) {
                            IteratorClose(iterator);
                            return provider;
                        }
                    }
                }
            }
        }
        if (!IsUndefined(fallback) && fallback.isProviderFor(O, P)) {
            return fallback;
        }
        return undefined;
    }
    function getProvider(O, P) {
        var providerMap = targetProviderMap.get(O);
        var provider;
        if (!IsUndefined(providerMap)) {
            provider = providerMap.get(P);
        }
        if (!IsUndefined(provider)) {
            return provider;
        }
        provider = getProviderNoCache(O, P);
        if (!IsUndefined(provider)) {
            if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O, providerMap);
            }
            providerMap.set(P, provider);
        }
        return provider;
    }
    function hasProvider(provider) {
        if (IsUndefined(provider))
            throw new TypeError();
        return fallback === provider || first === provider || second === provider || !IsUndefined(rest) && rest.has(provider);
    }
    function setProvider(O, P, provider) {
        if (!hasProvider(provider)) {
            throw new Error("Metadata provider not registered.");
        }
        var existingProvider = getProvider(O, P);
        if (existingProvider !== provider) {
            if (!IsUndefined(existingProvider)) {
                return false;
            }
            var providerMap = targetProviderMap.get(O);
            if (IsUndefined(providerMap)) {
                providerMap = new _Map();
                targetProviderMap.set(O, providerMap);
            }
            providerMap.set(P, provider);
        }
        return true;
    }
}
/**
 * Gets or creates the shared registry of metadata providers.
 */
function GetOrCreateMetadataRegistry() {
    var metadataRegistry;
    if (!IsUndefined(registrySymbol) && IsObject(Reflect) && Object.isExtensible(Reflect)) {
        metadataRegistry = Reflect[registrySymbol];
    }
    if (IsUndefined(metadataRegistry)) {
        metadataRegistry = CreateMetadataRegistry();
    }
    if (!IsUndefined(registrySymbol) && IsObject(Reflect) && Object.isExtensible(Reflect)) {
        Object.defineProperty(Reflect, registrySymbol, {
            enumerable: false,
            configurable: false,
            writable: false,
            value: metadataRegistry
        });
    }
    return metadataRegistry;
}
function CreateMetadataProvider(registry) {
    // [[Metadata]] internal slot
    // https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
    var metadata = new _WeakMap();
    var provider = {
        isProviderFor: function (O, P) {
            var targetMetadata = metadata.get(O);
            if (IsUndefined(targetMetadata))
                return false;
            return targetMetadata.has(P);
        },
        OrdinaryDefineOwnMetadata: OrdinaryDefineOwnMetadata,
        OrdinaryHasOwnMetadata: OrdinaryHasOwnMetadata,
        OrdinaryGetOwnMetadata: OrdinaryGetOwnMetadata,
        OrdinaryOwnMetadataKeys: OrdinaryOwnMetadataKeys,
        OrdinaryDeleteMetadata: OrdinaryDeleteMetadata,
    };
    metadataRegistry.registerProvider(provider);
    return provider;
    function GetOrCreateMetadataMap(O, P, Create) {
        var targetMetadata = metadata.get(O);
        var createdTargetMetadata = false;
        if (IsUndefined(targetMetadata)) {
            if (!Create)
                return undefined;
            targetMetadata = new _Map();
            metadata.set(O, targetMetadata);
            createdTargetMetadata = true;
        }
        var metadataMap = targetMetadata.get(P);
        if (IsUndefined(metadataMap)) {
            if (!Create)
                return undefined;
            metadataMap = new _Map();
            targetMetadata.set(P, metadataMap);
            if (!registry.setProvider(O, P, provider)) {
                targetMetadata.delete(P);
                if (createdTargetMetadata) {
                    metadata.delete(O);
                }
                throw new Error("Wrong provider for target.");
            }
        }
        return metadataMap;
    }
    // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
    function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
        var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return false;
        return ToBoolean(metadataMap.has(MetadataKey));
    }
    // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
    function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
        var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return undefined;
        return metadataMap.get(MetadataKey);
    }
    // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
    function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
        var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
        metadataMap.set(MetadataKey, MetadataValue);
    }
    // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
    // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
    function OrdinaryOwnMetadataKeys(O, P) {
        var keys = [];
        var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return keys;
        var keysObj = metadataMap.keys();
        var iterator = GetIterator(keysObj);
        var k = 0;
        while (true) {
            var next = IteratorStep(iterator);
            if (!next) {
                keys.length = k;
                return keys;
            }
            var nextValue = IteratorValue(next);
            try {
                keys[k] = nextValue;
            }
            catch (e) {
                try {
                    IteratorClose(iterator);
                }
                finally {
                    throw e;
                }
            }
            k++;
        }
    }
    function OrdinaryDeleteMetadata(MetadataKey, O, P) {
        var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
        if (IsUndefined(metadataMap))
            return false;
        if (!metadataMap.delete(MetadataKey))
            return false;
        if (metadataMap.size === 0) {
            var targetMetadata = metadata.get(O);
            if (!IsUndefined(targetMetadata)) {
                targetMetadata.delete(P);
                if (targetMetadata.size === 0) {
                    metadata.delete(targetMetadata);
                }
            }
        }
        return true;
    }
}
function CreateFallbackProvider(reflect) {
    var defineMetadata = reflect.defineMetadata, hasOwnMetadata = reflect.hasOwnMetadata, getOwnMetadata = reflect.getOwnMetadata, getOwnMetadataKeys = reflect.getOwnMetadataKeys, deleteMetadata = reflect.deleteMetadata;
    var metadataOwner = new _WeakMap();
    var provider = {
        isProviderFor: function (O, P) {
            var metadataPropertySet = metadataOwner.get(O);
            if (!IsUndefined(metadataPropertySet) && metadataPropertySet.has(P)) {
                return true;
            }
            if (getOwnMetadataKeys(O, P).length) {
                if (IsUndefined(metadataPropertySet)) {
                    metadataPropertySet = new _Set();
                    metadataOwner.set(O, metadataPropertySet);
                }
                metadataPropertySet.add(P);
                return true;
            }
            return false;
        },
        OrdinaryDefineOwnMetadata: defineMetadata,
        OrdinaryHasOwnMetadata: hasOwnMetadata,
        OrdinaryGetOwnMetadata: getOwnMetadata,
        OrdinaryOwnMetadataKeys: getOwnMetadataKeys,
        OrdinaryDeleteMetadata: deleteMetadata,
    };
    return provider;
}
/**
 * Gets the metadata provider for an object. If the object has no metadata provider and this is for a create operation,
 * then this module's metadata provider is assigned to the object.
 */
function GetMetadataProvider(O, P, Create) {
    var registeredProvider = metadataRegistry.getProvider(O, P);
    if (!IsUndefined(registeredProvider)) {
        return registeredProvider;
    }
    if (Create) {
        if (metadataRegistry.setProvider(O, P, metadataProvider)) {
            return metadataProvider;
        }
        throw new Error("Illegal state.");
    }
    return undefined;
}
