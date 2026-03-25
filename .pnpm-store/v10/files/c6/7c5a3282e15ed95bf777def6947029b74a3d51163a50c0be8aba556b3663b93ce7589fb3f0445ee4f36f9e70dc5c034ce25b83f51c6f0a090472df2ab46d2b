"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeUuid = void 0;
const InternalError_1 = require("./InternalError");
const classPrototypeUuidSymbol = Symbol.for('TypeUuid.classPrototypeUuid');
/**
 * Provides a version-independent implementation of the JavaScript `instanceof` operator.
 *
 * @remarks
 * The JavaScript `instanceof` operator normally only identifies objects from a particular library instance.
 * For example, suppose the NPM package `example-lib` has two published versions 1.2.0 and 1.3.0, and
 * it exports a class called `A`.  Suppose some code consumes version `1.3.0` of the library, but it receives
 * an object that was constructed using version `1.2.0`.  In this situation `a instanceof A` will return `false`,
 * even though `a` is an instance of `A`.  The reason is that there are two prototypes for `A`; one for each
 * version.
 *
 * The `TypeUuid` facility provides a way to make `a instanceof A` return true for both prototypes of `A`,
 * by instead using a universally unique identifier (UUID) to detect object instances.
 *
 * You can use `Symbol.hasInstance` to enable the system `instanceof` operator to recognize type UUID equivalence:
 * ```ts
 * const uuidWidget: string = '9c340ef0-d29f-4e2e-a09f-42bacc59024b';
 * class Widget {
 *   public static [Symbol.hasInstance](instance: object): boolean {
 *     return TypeUuid.isInstanceOf(instance, uuidWidget);
 *   }
 * }
 * ```
 * // Example usage:
 * ```ts
 * import { Widget as Widget1 } from 'v1-of-library';
 * import { Widget as Widget2 } from 'v2-of-library';
 * const widget = new Widget2();
 * console.log(widget instanceof Widget1); // prints true
 * ```
 *
 * @public
 */
class TypeUuid {
    /**
     * Registers a JavaScript class as having a type identified by the specified UUID.
     * @privateRemarks
     * We cannot use a construct signature for `targetClass` because it may be an abstract class.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static registerClass(targetClass, typeUuid) {
        if (typeof targetClass !== 'function') {
            throw new Error('The targetClass parameter must be a JavaScript class');
        }
        if (!TypeUuid._uuidRegExp.test(typeUuid)) {
            throw new Error(`The type UUID must be specified as lowercase hexadecimal with dashes: "${typeUuid}"`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const targetClassPrototype = targetClass.prototype;
        if (Object.hasOwnProperty.call(targetClassPrototype, classPrototypeUuidSymbol)) {
            const existingUuid = targetClassPrototype[classPrototypeUuidSymbol];
            throw new InternalError_1.InternalError(`Cannot register the target class ${targetClass.name || ''} typeUuid=${typeUuid}` +
                ` because it was already registered with typeUuid=${existingUuid}`);
        }
        targetClassPrototype[classPrototypeUuidSymbol] = typeUuid;
    }
    /**
     * Returns true if the `targetObject` is an instance of a JavaScript class that was previously
     * registered using the specified `typeUuid`.  Base classes are also considered.
     */
    static isInstanceOf(targetObject, typeUuid) {
        if (targetObject === undefined || targetObject === null) {
            return false;
        }
        let objectPrototype = Object.getPrototypeOf(targetObject);
        while (objectPrototype !== undefined && objectPrototype !== null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const registeredUuid = objectPrototype[classPrototypeUuidSymbol];
            if (registeredUuid === typeUuid) {
                return true;
            }
            // Walk upwards an examine base class prototypes
            objectPrototype = Object.getPrototypeOf(objectPrototype);
        }
        return false;
    }
}
exports.TypeUuid = TypeUuid;
TypeUuid._uuidRegExp = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
//# sourceMappingURL=TypeUuid.js.map