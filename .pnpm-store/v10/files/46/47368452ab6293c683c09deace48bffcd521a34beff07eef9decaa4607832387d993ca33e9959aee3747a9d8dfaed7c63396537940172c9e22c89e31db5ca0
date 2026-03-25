"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeUuid = exports.uuidAlreadyReportedError = void 0;
const classPrototypeUuidSymbol = Symbol.for('TypeUuid.classPrototypeUuid');
exports.uuidAlreadyReportedError = 'f26b0640-a49b-49d1-9ead-1a516d5920c7';
// Avoid a dependency on node-core-library to access just this one API:
class TypeUuid {
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
//# sourceMappingURL=TypeUuidLite.js.map